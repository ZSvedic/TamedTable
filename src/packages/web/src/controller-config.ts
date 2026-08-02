// #ModelConfig
// Settings/config: the resolved provider/key/model, the settings-panel open
// state and expanded provider card, and the persistence + engine-rebuild that
// a config change triggers. The config object itself lives on the host (the
// React panel reads it directly); this owns the transitions.
import {
  resolveConfig,
  keyFor,
  defaultModel,
  defaultCellModel,
  type Provider,
  type ResolvedConfig,
} from '@tamedtable/model-config';
import { writeStoredConfig } from '@tamedtable/model-config/storage';
import { userFacingMessage } from './controller-messages.ts';
import { pageSizeFor } from './controller.ts';
import type { ControllerHost } from './controller-context.ts';

/** The `ResolvedConfig` field each provider's key lives in. */
const KEY_FIELD = {
  gemini: 'geminiKey',
  openai: 'openaiKey',
  anthropic: 'anthropicKey',
  openrouter: 'openrouterKey',
} as const satisfies Record<Provider, keyof ResolvedConfig>;

/** The provider whose key this partial saves, or null. A provider pick alone
 *  is not a save the "✓ Saved" badge should claim — the card's own radio shows
 *  the choice — and neither is clearing a key: a badge beside an empty field
 *  says a key landed when none did. */
function savedKeyProvider(partial: Partial<ResolvedConfig>): Provider | null {
  const providers = Object.keys(KEY_FIELD) as Provider[];
  return providers.find((p) => {
    const value = partial[KEY_FIELD[p]];
    return typeof value === 'string' && value.trim() !== '';
  }) ?? null;
}

export class ConfigManager {
  private readonly host: ControllerHost;
  constructor(host: ControllerHost) {
    this.host = host;
  }

  /** Refill every key draft from the saved config — the panel opens showing
   *  what is stored, not what a previous visit left half-typed. */
  private resetKeyDrafts(): void {
    for (const p of Object.keys(KEY_FIELD) as Provider[]) {
      this.host.keyDrafts[p] = (this.host.config[KEY_FIELD[p]] as string | null) ?? '';
    }
  }

  /** The user typed in a key field. Moves the draft only — half a key is not
   *  a key, and saving each keystroke rebuilds the engine (replaying the whole
   *  flow) for a value that is not finished. */
  setKeyDraft(provider: Provider, value: string): void {
    this.host.keyDrafts[provider] = value;
    this.host.notify();
  }

  /** The user finished with a key field — it lost focus, they pressed Enter,
   *  or they closed the panel. Saves the draft, unless it matches what is
   *  already stored: leaving a field untouched is not a save. */
  async commitKeyDraft(provider: Provider): Promise<void> {
    const draft = (this.host.keyDrafts[provider] ?? '').trim();
    const stored = ((this.host.config[KEY_FIELD[provider]] as string | null) ?? '').trim();
    if (draft === stored) return;
    await this.setConfig({ [KEY_FIELD[provider]]: draft === '' ? null : draft });
  }

  /** Returns the API key for the currently-selected provider, or null. */
  activeApiKey(): string | null {
    return keyFor(this.host.config);
  }

  /** Whether the Settings "Test" button has anything to test: a key for the
   *  selected provider. An empty field disables the button. */
  canTestKey(): boolean {
    return Boolean(this.activeApiKey()?.trim());
  }

  /** #ProviderSelect — prove the selected provider's key works, now, instead
   *  of leaving the user to find out from a failed transformation. One tiny
   *  call through the app's own engine (same SDK, same routing, same headers)
   *  with retries off, so a dead key answers in about a second. */
  async testKey(): Promise<void> {
    const provider = this.host.config.provider;
    if (!this.canTestKey()) {
      this.host.keyTest = {
        provider,
        state: 'error',
        message: 'Enter an API key first.',
      };
      this.host.notify();
      return;
    }
    this.host.keyTest = { provider, state: 'running', message: 'Testing…' };
    this.host.notify();
    const started = Date.now();
    try {
      const { model } = await this.host.engine.testConnection();
      const seconds = ((Date.now() - started) / 1000).toFixed(1);
      this.host.keyTest = { provider, state: 'ok', message: `${model} answered in ${seconds}s` };
    } catch (e) {
      this.host.keyTest = { provider, state: 'error', message: userFacingMessage(e, provider) };
    }
    this.host.notify();
  }

  openSettings(): void {
    this.host.settingsOpen = true;
    // The Saved badge only ever states a save made this visit.
    this.host.savedProvider = null;
    // Same for the key-test result: a green tick from an earlier visit would
    // vouch for a key that may since have been edited or run out of credit.
    this.host.keyTest = null;
    this.resetKeyDrafts();
    this.host.notify();
  }

  /** Closing commits whatever is still in the key fields, so a key typed but
   *  never blurred is not lost to the Close button. */
  async closeSettings(): Promise<void> {
    this.host.settingsOpen = false;
    this.host.notify();
    for (const p of Object.keys(KEY_FIELD) as Provider[]) await this.commitKeyDraft(p);
  }

  /** Toggle an accordion provider card. Expanding a card also selects that
   *  provider; collapsing the already-open card does not change the provider. */
  async clickProviderCard(provider: Provider): Promise<void> {
    if (this.host.expandedProvider === provider) {
      // Toggle: collapse without changing provider
      this.host.expandedProvider = null;
    } else {
      this.host.expandedProvider = provider;
      // The user picks a provider, not individual models — so selecting a card
      // always pins that provider's fixed primary + secondary defaults, even if
      // a stale model from an older build is still stored.
      await this.setConfig({
        provider,
        model: defaultModel(provider),
        cellModel: defaultCellModel(provider),
      });
    }
    this.host.notify();
  }

  /** Merge partial config, persist to storage, and rebuild the engine if the
   *  models or the selected provider's key changed and a file is loaded. */
  async setConfig(partial: Partial<ResolvedConfig>): Promise<void> {
    const next = resolveConfig({}, { ...this.host.config, ...partial });
    // The engine hands its key to the model clients when it is built, so a key
    // edit has to rebuild exactly like a model switch — otherwise the key the
    // user just typed sits unused until the page reloads and every request
    // keeps failing with "Invalid API key" under a "✓ Saved" badge.
    const engineChanged =
      next.model !== this.host.config.model ||
      next.cellModel !== this.host.config.cellModel ||
      keyFor(next) !== keyFor(this.host.config);
    // A rebuild while a request or flow is committing would orphan the old
    // engine: the chat reply claims the executed step, the rebuilt engine's
    // table never had it. Refuse the switch until the run settles (or is
    // stopped) instead of letting thread and table permanently disagree.
    if (engineChanged && this.host.streaming) {
      this.host.pushToast(
        'error',
        'A request is running — stop it or let it finish before switching the provider, model, or key.',
      );
      return;
    }
    this.host.config = next;
    // The key test vouches for one key on one provider — the moment either
    // moves, the old verdict is about something else.
    if (engineChanged || next.provider !== this.host.keyTest?.provider) this.host.keyTest = null;
    // Closing the voice gate (a provider without voice, or its key removed)
    // tears down any live mic or hands-free session along with the controls.
    this.host.voice.enforceGate();
    // The page follows the provider: its concurrency wave shrinks with a
    // pinned cell batch size (openrouter: 25) and is 100 otherwise.
    // currentPage() clamps on read, so no page bookkeeping is needed here.
    this.host.pageSize = pageSizeFor(next.provider, this.host.opts);
    writeStoredConfig(next);
    // Confirm the save on the card whose key it carried. A provider pick is
    // not confirmed — see savedKeyProvider.
    const savedFor = savedKeyProvider(partial);
    if (this.host.settingsOpen && savedFor) {
      this.host.savedProvider = savedFor;
      this.host.savedSeq++;
    }

    if (engineChanged && this.host.engine.hasRunner() && this.host.loaded) {
      const spec = structuredClone(this.host.engine.currentSpec());
      try {
        await this.host.engine.rebuildForConfigChange(spec);
      } catch (e) {
        this.host.pushToast(
          'error',
          `Could not switch model: ${userFacingMessage(e, this.host.config.provider)}`,
        );
      }
    } else if (engineChanged) {
      // No engine built yet, or none with a file in it — the next
      // ensureHeadless() picks up the new models and key.
      this.host.engine.reset();
    }

    this.host.notify();
  }

  /** @deprecated Use setConfig({ anthropicKey: key }) instead. */
  setApiKey(key: string): void {
    const trimmed = key.trim();
    void this.setConfig({ anthropicKey: trimmed === '' ? null : trimmed });
  }

  /** Clear every provider key — "no API key is set" regardless of provider.
   *  @deprecated Use setConfig with explicit null keys instead. */
  clearApiKey(): void {
    void this.setConfig({ anthropicKey: null, geminiKey: null, openaiKey: null, openrouterKey: null });
  }

  /** @deprecated Use setConfig({ model }) instead. */
  async setModel(model: string): Promise<void> {
    const next = model.trim();
    if (next === '' || next === this.host.config.model) return;
    await this.setConfig({ model: next });
  }
}
