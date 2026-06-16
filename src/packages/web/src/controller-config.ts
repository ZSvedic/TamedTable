// #ModelConfig
// Settings/config: the resolved provider/key/model, the settings-panel open
// state and expanded provider card, and the persistence + engine-rebuild that
// a config change triggers. The config object itself lives on the host (the
// React panel reads it directly); this owns the transitions.
import { resolveConfig, type Provider, type ResolvedConfig } from '@tamedtable/model-config';
import { writeStoredConfig } from '@tamedtable/model-config/storage';
import { userFacingMessage } from './controller-messages.ts';
import type { ControllerHost } from './controller-context.ts';

export class ConfigManager {
  private readonly host: ControllerHost;
  constructor(host: ControllerHost) {
    this.host = host;
  }

  /** Returns the API key for the currently-selected provider, or null. */
  activeApiKey(): string | null {
    const { provider, anthropicKey, geminiKey, openaiKey } = this.host.config;
    if (provider === 'gemini') return geminiKey;
    if (provider === 'openai') return openaiKey;
    return anthropicKey;
  }

  openSettings(): void {
    this.host.settingsOpen = true;
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
      // Selecting a card selects the provider and resets the model to that
      // provider's default only if the current model doesn't match the provider.
      await this.setConfig({ provider });
    }
    this.host.notify();
  }

  /** Merge partial config, persist to storage, and rebuild the engine if the
   *  model changed and a file is loaded. */
  async setConfig(partial: Partial<ResolvedConfig>): Promise<void> {
    const next = resolveConfig({}, { ...this.host.config, ...partial });
    const modelChanged =
      next.model !== this.host.config.model || next.cellModel !== this.host.config.cellModel;
    this.host.config = next;
    writeStoredConfig(next);
    this.host.savedLabel = null;

    if (modelChanged && this.host.engine.hasRunner() && this.host.loaded) {
      const spec = structuredClone(this.host.engine.currentSpec());
      try {
        await this.host.engine.rebuildForModelChange(spec);
      } catch (e) {
        this.host.pushToast(
          'error',
          `Could not switch model: ${userFacingMessage(e, this.host.config.provider)}`,
        );
      }
    } else if (modelChanged) {
      // No engine built yet — the next ensureHeadless() picks up the model.
      this.host.engine.reset();
    }

    this.host.notify();
  }

  /** @deprecated Use setConfig({ anthropicKey: key }) instead. */
  setApiKey(key: string): void {
    const trimmed = key.trim();
    void this.setConfig({ anthropicKey: trimmed === '' ? null : trimmed });
  }

  /** @deprecated Use setConfig({ anthropicKey: null }) instead. */
  clearApiKey(): void {
    void this.setConfig({ anthropicKey: null });
  }

  /** @deprecated Use setConfig({ model }) instead. */
  async setModel(model: string): Promise<void> {
    const next = model.trim();
    if (next === '' || next === this.host.config.model) return;
    await this.setConfig({ model: next });
  }
}
