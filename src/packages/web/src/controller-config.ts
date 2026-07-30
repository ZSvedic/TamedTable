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

export class ConfigManager {
  private readonly host: ControllerHost;
  constructor(host: ControllerHost) {
    this.host = host;
  }

  /** Returns the API key for the currently-selected provider, or null. */
  activeApiKey(): string | null {
    return keyFor(this.host.config);
  }

  openSettings(): void {
    this.host.settingsOpen = true;
    // The Saved badge only ever states a save made this visit.
    this.host.savedProvider = null;
    this.host.notify();
  }

  closeSettings(): void {
    this.host.settingsOpen = false;
    this.host.notify();
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
    // Closing the voice gate (a provider without voice, or its key removed)
    // tears down any live mic or hands-free session along with the controls.
    this.host.voice.enforceGate();
    // The page follows the provider: its concurrency wave shrinks with a
    // pinned cell batch size (openrouter: 25) and is 100 otherwise.
    // currentPage() clamps on read, so no page bookkeeping is needed here.
    this.host.pageSize = pageSizeFor(next.provider, this.host.opts);
    writeStoredConfig(next);
    // Confirm the save on the card it touched: the provider set explicitly,
    // or the one whose key field the partial carries.
    const savedFor: Provider | null =
      partial.provider ??
      (partial.geminiKey !== undefined ? 'gemini'
        : partial.openaiKey !== undefined ? 'openai'
        : partial.anthropicKey !== undefined ? 'anthropic'
        : partial.openrouterKey !== undefined ? 'openrouter'
        : null);
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
