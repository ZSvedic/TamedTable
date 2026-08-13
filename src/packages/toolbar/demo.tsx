// #Toolbar demo logic — mounts the real Toolbar + OpenUrlDialog over plain
// React state. Every button appends to the #out event log; the theme toggle
// flips the wrapper (data-tb-mode); the dialog's submit logs the URL and
// closes. #out is non-empty on load (the demo smoke test's ready signal).
import { useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { typography } from '@tamedtable/ui-kit';
import { ThemeProvider, useTheme, useThemeControls } from '@tamedtable/ui-kit/components';
import type { RecommendedSample, ToolbarSample } from './index.ts';
import { Toolbar, OpenUrlDialog, OpenSampleDialog } from './components.tsx';

const RECOMMENDED: RecommendedSample[] = [
  { title: 'Clean up', name: 'customers-input.csv', url: 'https://example.com/customers-input.csv' },
];

const SAMPLES: ToolbarSample[] = [
  { name: 'customers-input.csv', url: 'https://example.com/customers-input.csv' },
  { name: 'customers.jsonl', url: 'https://example.com/customers.jsonl' },
];

function Demo(): ReactNode {
  const t = useTheme();
  const { mode, toggle } = useThemeControls();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sampleOpen, setSampleOpen] = useState(false);
  const [canUndo, setCanUndo] = useState(true);
  const [log, setLog] = useState<string[]>(['ready']);

  const report = (event: string): void => setLog((l) => [...l, event]);

  return (
    <div data-tb-mode={mode} style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: t.bg }}>
      <Toolbar
        openButtonId="demo-open-btn"
        loaded
        busy={false}
        fileName="customers.csv"
        rowCount={95}
        colCount={4}
        canUndo={canUndo}
        canRedo={false}
        onOpenSample={() => {
          report('open sample dialog');
          setSampleOpen(true);
        }}
        onOpenUrl={() => {
          report('open dialog');
          setDialogOpen(true);
        }}
        onOpenLocal={() => report('open local')}
        onOpenFlow={() => report('open flow')}
        recentMenu={[
          { label: 'people.csv', tag: 'local', onClick: () => report('recent people.csv') },
          { label: 'cities.jsonl', tag: 'URL', onClick: () => report('recent cities.jsonl') },
        ]}
        saveDataMenu={[
          { label: 'Save CSV…', onClick: () => report('save as csv') },
          { label: 'Save JSONL…', onClick: () => report('save as jsonl') },
          { label: 'Save Parquet…', onClick: () => report('save as parquet') },
        ]}
        saveFlowMenu={[
          { label: 'Save recipe as .flow…', onClick: () => report('save as flow') },
          { label: 'Save recipe as Python…', onClick: () => report('save as python') },
        ]}
        onUndo={() => {
          report('undo');
          setCanUndo(false);
        }}
        onRedo={() => report('redo')}
        onToggleTheme={() => {
          report('toggle theme');
          toggle();
        }}
        onOpenSettings={() => report('open settings')}
        onOpenTutorial={() => report('open tutorial')}
      />

      <pre
        id="out"
        style={{
          flex: 1,
          overflow: 'auto',
          margin: 12,
          padding: '.5rem .75rem',
          font: `11px/1.5 ${typography.mono}`,
          background: t.surface2,
          color: t.ink2,
          border: `1px solid ${t.line}`,
          borderRadius: 6,
        }}
      >
        {log.join('\n')}
      </pre>

      <OpenSampleDialog
        open={sampleOpen}
        recommended={RECOMMENDED}
        samples={SAMPLES}
        onPick={(url) => report(`open sample ${url}`)}
        onClose={() => setSampleOpen(false)}
      />

      <OpenUrlDialog
        open={dialogOpen}
        onSubmit={async (url) => {
          report(`open url ${url}`);
        }}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <Demo />
  </ThemeProvider>,
);
