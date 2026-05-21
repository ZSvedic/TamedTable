import { useState, type ReactNode } from 'react';
import { theme } from '../theme.ts';
import type { WebController } from '../controller.ts';
import { useController } from '../useController.ts';
import { Button } from './Button.tsx';

export function SettingsPanel({ controller }: { controller: WebController }): ReactNode {
  useController(controller);
  const [key, setKey] = useState(controller.getSettings().apiKey ?? '');
  if (!controller.settingsOpen) return null;

  const save = (): void => {
    controller.setApiKey(key);
    controller.closeSettings();
  };

  return (
    <div
      onClick={() => controller.closeSettings()}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '440px',
          maxWidth: '90vw',
          background: theme.color.surface,
          border: `1px solid ${theme.color.border}`,
          borderRadius: theme.radius.lg,
          padding: theme.space.xl,
          boxShadow: `0 12px 40px ${theme.color.shadow}`,
          display: 'flex',
          flexDirection: 'column',
          gap: theme.space.md,
        }}
      >
        <h2 style={{ margin: 0, fontSize: theme.font.size.xl, color: theme.color.text }}>Settings</h2>
        <label style={{ fontSize: theme.font.size.md, color: theme.color.textDim }}>
          Anthropic API key
        </label>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="sk-ant-…"
          style={{
            fontFamily: theme.font.mono,
            fontSize: theme.font.size.md,
            padding: theme.space.sm,
            borderRadius: theme.radius.sm,
            border: `1px solid ${theme.color.border}`,
            background: theme.color.bg,
            color: theme.color.text,
          }}
        />
        <p style={{ margin: 0, fontSize: theme.font.size.sm, color: theme.color.textDim }}>
          Held only in this browser tab. Natural-language requests call Anthropic
          directly from the browser, so a key is required to send them.
        </p>
        <div style={{ display: 'flex', gap: theme.space.sm, justifyContent: 'flex-end' }}>
          <Button onClick={() => controller.closeSettings()}>Close</Button>
          <Button variant="primary" onClick={save}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
