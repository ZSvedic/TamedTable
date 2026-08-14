// #UiKit demo logic: mounts every component over plain React state. Each
// interaction appends to the #out event log; #out is non-empty on load (the
// demo smoke test's ready signal) and the wrapper carries data-uk-mode.
import { useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { typography } from './index.ts';
import {
  Button,
  Icon,
  ICON_NAMES,
  MenuButton,
  Toasts,
  ThemeProvider,
  useTheme,
  useThemeControls,
  type ToastItem,
} from './components.tsx';

function Demo(): ReactNode {
  const t = useTheme();
  const { mode, toggle } = useThemeControls();
  const [log, setLog] = useState<string[]>(['ready']);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [toastSeq, setToastSeq] = useState(0);

  const report = (event: string): void => setLog((l) => [...l, event]);

  const addToast = (kind: ToastItem['kind'], action?: string): void => {
    setToasts((list) => [
      ...list,
      { id: toastSeq, kind, message: `Sample ${kind} toast #${toastSeq}`, ...(action ? { action } : {}) },
    ]);
    setToastSeq((n) => n + 1);
  };

  const section = { margin: '1rem 0' };
  const heading = { font: `600 14px/1.4 ${typography.ui}`, color: t.ink, margin: '0 0 .5rem' };

  return (
    <div data-uk-mode={mode} style={{ color: t.ink, fontFamily: typography.ui }}>
      <h1 style={{ font: `600 18px/1.4 ${typography.ui}`, margin: 0 }}>
        ui-kit: tokens &amp; primitives
      </h1>

      <div style={section}>
        <p style={heading}>Buttons</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['ghost', 'chrome', 'primary', 'danger'] as const).map((variant) => (
            <Button key={variant} variant={variant} onClick={() => report(`${variant} clicked`)}>
              {variant}
            </Button>
          ))}
          <Button variant="chrome" disabled>
            disabled
          </Button>
        </div>
      </div>

      <div style={section}>
        <p style={heading}>Theme</p>
        <Button variant="chrome" onClick={toggle} title="Toggle light/dark">
          <Icon name={mode === 'dark' ? 'sun' : 'moon'} /> {mode} → toggle
        </Button>
      </div>

      <div style={section}>
        <p style={heading}>Icons</p>
        <div data-icon-count={ICON_NAMES.length} style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {ICON_NAMES.map((name) => (
            <span
              key={name}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11 }}
            >
              <Icon name={name} /> {name}
            </span>
          ))}
        </div>
      </div>

      <div style={section}>
        <p style={heading}>Menu button</p>
        <MenuButton
          sections={[
            {
              items: [
                {
                  label: 'Recent',
                  icon: 'clock',
                  submenu: [
                    { label: 'alpha.csv', tag: 'local', onClick: () => report('alpha.csv clicked') },
                    { label: 'beta.jsonl', tag: 'URL', onClick: () => report('beta.jsonl clicked') },
                  ],
                },
              ],
            },
            {
              header: 'Data',
              items: [
                { label: 'Save as flow', onClick: () => report('Save as flow clicked') },
                { label: 'Save as data', onClick: () => report('Save as data clicked') },
                { label: 'Disabled item', onClick: () => report('never'), disabled: true },
              ],
            },
          ]}
        >
          <Icon name="save" /> Save
        </MenuButton>
      </div>

      <div style={section}>
        <p style={heading}>Toasts</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="chrome" onClick={() => addToast('info')}>
            Add info toast
          </Button>
          <Button variant="danger" onClick={() => addToast('error')}>
            Add error toast
          </Button>
          <Button variant="chrome" onClick={() => addToast('error', 'Copy report')}>
            Add action toast
          </Button>
        </div>
      </div>

      <div style={section}>
        <p style={heading}>Event log</p>
        <pre
          id="out"
          style={{
            font: `12px/1.5 ${typography.mono}`,
            background: t.surface2,
            border: `1px solid ${t.line}`,
            padding: '.5rem',
            borderRadius: 6,
          }}
        >
          {log.join('\n')}
        </pre>
      </div>

      <Toasts
        toasts={toasts}
        onDismiss={(id) => setToasts((l) => l.filter((x) => x.id !== id))}
        onAction={(id) => report(`toast action ${id}`)}
      />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <Demo />
  </ThemeProvider>,
);
