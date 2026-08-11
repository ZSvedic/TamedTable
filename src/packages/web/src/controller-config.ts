// #ModelConfig
// Settings/config: the resolved provider/key/model, the settings-panel state,
// the connect flow behind the model chooser, and the persistence +
// engine-rebuild that a config change triggers. The config object itself lives
// on the host (the React panel reads it directly); this owns the transitions.
import {
  resolveConfig,
  connectedProviders,
  defaultModel,
  defaultCellModel,
  detectProvider,
  keyFor,
  KEY_FIELD,
  SUPPORTED_PREFIXES,
  type Provider,
  type ResolvedConfig,
} from '@tamedtable/model-config';
import { writeStoredConfig, writeStoredProbes } from '@tamedtable/model-config/storage';
import { verifyKey, measureModel } from '@tamedtable/model-config/probe';
import { pageSizeFor } from './controller.ts';
import { userFacingMessage } from './controller-messages.ts';
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

  /** Every provider with a key — the chooser's card list. */
  connected(): Provider[] {
    return connectedProviders(this.host.config);
  }

  // ── The connect flow ──────────────────────────────────────────────────────

  /** The user typed in the key input. Typing clears the error — they are
   *  already fixing it. */
  setKeyInput(value: string): void {
    this.host.keyInput = value;
    if (this.host.keyError !== '') this.host.keyError = '';
    this.host.notify();
  }

  /**
   * #ProviderSelect — connect the pasted key. Detect the provider from its
   * prefix, prove the key works against that provider, and only then store
   * anything: a key that does not work never becomes a setting the user has to
   * hunt down and undo. The card appears as soon as the check passes; the two
   * measurements fill it in afterwards, so a provider that takes twelve seconds
   * to answer never holds the panel up.
   */
  async addKey(): Promise<void> {
    const key = this.host.keyInput.trim();
    if (key === '' || this.host.keyBusy) return;

    const provider = detectProvider(key);
    if (!provider) {
      this.host.keyError = `Key not recognised. Supported prefixes: ${SUPPORTED_PREFIXES.join(', ')}.`;
      this.host.notify();
      return;
    }

    this.host.keyBusy = true;
    this.host.keyError = '';
    this.host.notify();
    try {
      await this.connect(provider, key);
    } catch (e) {
      this.host.keyError = (e as Error).message;
    } finally {
      this.host.keyBusy = false;
      this.host.notify();
    }
  }

  /**
   * #PuterGateway — the "No API key?" button. Puter's credential is a session
   * token, and the only way to mint one is its sign-in popup, so this loads
   * Puter's SDK, opens it, and then connects the resulting token through the
   * very same path a pasted one takes.
   *
   * The SDK is fetched **on click, never on load**. TamedTable's pages pull in
   * no third-party scripts, and a user who does not use Puter should keep it
   * that way — see the FAQ's key-safety answer.
   */
  async signInPuter(): Promise<void> {
    if (this.host.keyBusy) return;
    this.host.keyBusy = true;
    this.host.keyError = '';
    this.host.notify();
    try {
      const token = await this.host.opts.puterSignIn!();
      if (token === null) return;            // The user closed the popup.
      await this.connect('puter', token);
    } catch (e) {
      this.host.keyError = (e as Error).message;
    } finally {
      this.host.keyBusy = false;
      this.host.notify();
    }
  }

  /** Check a credential and, if the provider accepts it, store it and select
   *  that provider. Shared by the pasted-key path and the Puter sign-in. */
  private async connect(provider: Provider, key: string): Promise<void> {
    const { tier } = await verifyKey(provider, key, { fetch: this.host.opts.fetch });
    this.host.probes = { ...this.host.probes, [provider]: { tier } };
    this.host.keyInput = '';
    // A credential for an already-connected provider replaces it in place: the
    // card has no key field, so the alternative is deleting it to fix a key.
    await this.setConfig({
      provider,
      [KEY_FIELD[provider]]: key,
      model: defaultModel(provider),
      cellModel: defaultCellModel(provider),
    });
    void this.measure(provider, key);
  }

  /** Re-run a connected provider's measurements — the card's ⟳ button. A
   *  number taken while the provider was having a bad minute is one click from
   *  being replaced. */
  async refreshProvider(provider: Provider): Promise<void> {
    const key = (this.host.config[KEY_FIELD[provider]] as string | null) ?? '';
    if (key === '' || this.host.measuring[provider]) return;
    // Drop the old readings first, so both rows go back to "measuring…".
    this.host.probes = {
      ...this.host.probes,
      [provider]: { tier: this.host.probes[provider]?.tier ?? null },
    };
    await this.measure(provider, key);
  }

  /** Fill in the card's two speed lines. Each row lands on its own, and a
   *  measurement that fails leaves that row blank rather than the card broken —
   *  a working key with an unknown price is still a working key. */
  async measure(provider: Provider, key: string): Promise<void> {
    this.host.measuring = { ...this.host.measuring, [provider]: true };
    this.host.notify();
    for (const role of ['primary', 'secondary'] as const) {
      const modelId = role === 'primary' ? defaultModel(provider) : defaultCellModel(provider);
      let measure = null;
      try {
        measure = await measureModel(provider, key, modelId, { fetch: this.host.opts.fetch });
      } catch {
        // Leave the row blank — see above.
      }
      const probe = this.host.probes[provider];
      if (!probe) return; // Removed while measuring.
      this.host.probes = { ...this.host.probes, [provider]: { ...probe, [role]: measure } };
      this.host.notify();
    }
    this.host.measuring = { ...this.host.measuring, [provider]: false };
    writeStoredProbes(this.host.probes);
    this.host.notify();
  }

  /** Make a connected provider the default. The user connects a provider, not
   *  individual models, so this always pins that provider's two fixed
   *  defaults — even if a stale model from an older build is still stored. */
  async selectProvider(provider: Provider): Promise<void> {
    await this.setConfig({
      provider,
      model: defaultModel(provider),
      cellModel: defaultCellModel(provider),
    });
  }

  /** Remove a provider and its key. When it was the default, the default falls
   *  back to the last remaining connected provider — or, with none left, to the
   *  gemini fallback resolveConfig uses everywhere else. */
  async removeProvider(provider: Provider): Promise<void> {
    const cleared: Partial<ResolvedConfig> = { [KEY_FIELD[provider]]: null };
    if (this.host.config.provider === provider) {
      const left = connectedProviders(resolveConfig({}, { ...this.host.config, ...cleared }));
      const next = left[left.length - 1] ?? 'gemini';
      cleared.provider = next;
      cleared.model = defaultModel(next);
      cleared.cellModel = defaultCellModel(next);
    }
    const { [provider]: _dropped, ...rest } = this.host.probes;
    this.host.probes = rest;
    writeStoredProbes(this.host.probes);
    await this.setConfig(cleared);
  }

  // ── Panel lifecycle ───────────────────────────────────────────────────────

  openSettings(): void {
    this.host.settingsOpen = true;
    // The panel opens on a clean add row: an error from an earlier visit is
    // about a key the user has since moved on from.
    this.host.keyInput = '';
    this.host.keyError = '';
    this.host.notify();
  }

  closeSettings(): void {
    this.host.settingsOpen = false;
    this.host.notify();
  }

  /** Merge partial config, persist to storage, and rebuild the engine if the
   *  models or the selected provider's key changed and a file is loaded. */
  async setConfig(partial: Partial<ResolvedConfig>): Promise<void> {
    const next = resolveConfig({}, { ...this.host.config, ...partial });
    // The engine hands its key to the model clients when it is built, so a key
    // edit has to rebuild exactly like a model switch — otherwise the key the
    // user just connected sits unused until the page reloads and every request
    // keeps failing with "Invalid API key" under a card that looks connected.
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
    void this.setConfig({
      anthropicKey: null, geminiKey: null, openaiKey: null,
      groqKey: null, openrouterKey: null, puterToken: null,
    });
  }

  /** @deprecated Use setConfig({ model }) instead. */
  async setModel(model: string): Promise<void> {
    const next = model.trim();
    if (next === '' || next === this.host.config.model) return;
    await this.setConfig({ model: next });
  }
}
