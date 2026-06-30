// #MobileShell
// The phone layout: app bar (file + pager) over the frozen-header table over a
// persistent five-action dock, with the Type / Speak / History sheets rising in
// the dock's place. It drives the same WebController the desktop tree does — the
// menu drawer and the shared Settings / Open-URL / Tours overlays carry every
// action that doesn't fit the dock. A running tour reuses the real Driver.js
// engine: the mobile table, the Menu button, and the composer carry the ids the
// tour targets, and a chat step opens the Type sheet so the spotlight lands on
// the visible composer.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { space, typography, type Theme } from '@tamedtable/ui-kit';
import { Icon } from '@tamedtable/ui-kit/components';
import { useTheme, useThemeControls } from '@tamedtable/ui-kit/components';
import { Lockup } from '@tamedtable/toolbar/components';
import type { WebController } from '../../controller.ts';
import { useController } from '../../hooks/useController.ts';
import { Dock, type DockAction } from './Dock.tsx';
import { MobileTable } from './MobileTable.tsx';
import { MenuDrawer } from './MenuDrawer.tsx';
import { KeyboardSheet, VoiceSheet, HistorySheet } from './sheets.tsx';

type InputMode = 'none' | 'keyboard' | 'voice' | 'history';

function AppBar({
  t,
  fileName,
  page,
  pageCount,
  onPrev,
  onNext,
}: {
  t: Theme;
  fileName: string;
  page: number;
  pageCount: number;
  onPrev: () => void;
  onNext: () => void;
}): ReactNode {
  const navBtn = (dir: 'prev' | 'next', on: (() => void) | null): ReactNode => (
    <button
      type="button"
      onClick={() => on?.()}
      disabled={!on}
      title={dir === 'prev' ? 'Previous page' : 'Next page'}
      style={{
        width: 34,
        height: 34,
        borderRadius: 9,
        border: 0,
        background: 'transparent',
        cursor: on ? 'pointer' : 'default',
        color: on ? t.ink2 : t.ink4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={dir === 'prev' ? 'chevLeft' : 'chevRight'} size={20} />
    </button>
  );
  return (
    <div
      id="tutorial-mobile-top"
      data-mob-appbar=""
      style={{
        height: 46,
        flex: '0 0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: space.px8,
        padding: '0 10px',
        borderBottom: `1px solid ${t.line}`,
        background: t.surface,
      }}
    >
      {navBtn('prev', page > 1 ? onPrev : null)}
      <div style={{ flex: 1, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden' }}>
        <span style={{ fontFamily: typography.ui, fontSize: typography.size.base, fontWeight: 600, color: t.ink }}>
          {fileName}
        </span>
        <span style={{ fontFamily: typography.mono, fontSize: typography.size.xs, color: t.ink3, marginLeft: 6 }}>
          · {page} of {pageCount}
        </span>
      </div>
      {navBtn('next', page < pageCount ? onNext : null)}
    </div>
  );
}

function EmptyState({
  t,
  dark,
  onOpenSample,
  onOpenLocal,
  onOpenUrl,
}: {
  t: Theme;
  dark: boolean;
  onOpenSample: () => void;
  onOpenLocal: () => void;
  onOpenUrl: () => void;
}): ReactNode {
  const opt = (icon: 'sparkle' | 'folder' | 'link', label: string, on: () => void, id?: string): ReactNode => (
    <button
      key={label}
      type="button"
      id={id}
      data-mob-open={label}
      onClick={on}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: space.px10,
        border: `1px solid ${t.line2}`,
        borderRadius: 12,
        padding: '13px 14px',
        background: t.surface,
        color: t.ink,
        cursor: 'pointer',
        fontFamily: typography.ui,
        fontSize: typography.size.base,
        textAlign: 'left',
      }}
    >
      <span style={{ color: t.ink3, display: 'flex' }}>
        <Icon name={icon} size={18} />
      </span>
      {label}
    </button>
  );
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.px16,
        padding: '26px 22px',
        background: t.surface,
      }}
    >
      <Lockup size={28} color={t.ink} dark={dark} />
      <div style={{ fontFamily: typography.ui, fontSize: typography.size.lg, fontWeight: 600, color: t.ink2, textAlign: 'center' }}>
        What table can I tame?
      </div>
      <div style={{ width: '100%', maxWidth: 300, display: 'flex', flexDirection: 'column', gap: space.px8 }}>
        {/* The tour's load step spotlights this Open sample… button. */}
        {opt('sparkle', 'Open sample…', onOpenSample, 'tutorial-open-btn')}
        {opt('folder', 'Open local…', onOpenLocal)}
        {opt('link', 'Open URL…', onOpenUrl)}
      </div>
    </div>
  );
}

export function MobileShell({ controller }: { controller: WebController }): ReactNode {
  useController(controller);
  const t = useTheme();
  const dark = t.name === 'dark';
  const { toggle } = useThemeControls();

  const [inputMode, setInputMode] = useState<InputMode>('none');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [now, setNow] = useState(0);

  const loaded = controller.isLoaded();
  const busy = controller.streaming;
  const spec = controller.displaySpec();
  const columns = spec.columns.map((c) => c.id);
  const rows = controller.pageRows();
  const page = controller.currentPage();
  const pageCount = controller.pageCount();
  const pageStart = (page - 1) * controller.pageSize;
  const fileName = spec.table ? spec.table.split('/').pop() ?? spec.table : 'table';

  const voiceStatus = controller.voiceStatus;
  const tourActive = controller.isTutorialActive();
  const stepEl = tourActive ? controller.currentStepElementId() : null;
  const prefill = controller.tutorialPrefill;

  // History relative-time ticker — only while the sheet is open.
  useEffect(() => {
    if (inputMode !== 'history') return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, [inputMode]);

  // The voice sheet closes itself once the turn lands (status back to idle).
  const wasVoice = useRef(false);
  useEffect(() => {
    if (inputMode === 'voice' && voiceStatus !== 'idle') wasVoice.current = true;
    if (inputMode === 'voice' && voiceStatus === 'idle' && wasVoice.current) {
      wasVoice.current = false;
      setInputMode('none');
    }
  }, [inputMode, voiceStatus]);

  // Tour wiring: a chat step opens the Type sheet (so the composer the tour
  // spotlights is on screen) and reflects the prefilled query; any other step
  // returns to the dock so the Menu / table spotlights are unobstructed. When
  // the tour ends, close the sheet it opened so the dock comes back.
  const tourOpenedSheet = useRef(false);
  useEffect(() => {
    if (!tourActive) {
      if (tourOpenedSheet.current) {
        tourOpenedSheet.current = false;
        setInputMode('none');
      }
      return;
    }
    if (stepEl === 'tutorial-chat-input') {
      tourOpenedSheet.current = true;
      setInputMode('keyboard');
      if (prefill != null) setDraft(prefill);
    } else {
      setInputMode('none');
    }
  }, [tourActive, stepEl, prefill]);

  const sendChat = (): void => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    setInputMode('none');
    void controller.sendChat(text);
  };

  const startVoice = (): void => {
    setInputMode('voice');
    void controller.startVoice();
  };

  const dockActions: DockAction[] = [
    {
      key: 'menu',
      icon: 'menu',
      label: 'Menu',
      disabled: false,
      onClick: () => setDrawerOpen(true),
    },
    {
      key: 'undo',
      icon: 'undo',
      label: 'Undo',
      disabled: !loaded || busy || !controller.canUndo(),
      onClick: () => void controller.undo(),
    },
    {
      key: 'history',
      icon: 'clock',
      label: 'History',
      disabled: !loaded || busy,
      onClick: () => setInputMode('history'),
    },
    {
      key: 'type',
      icon: 'keyboard',
      label: 'Type',
      disabled: !loaded || busy,
      onClick: () => setInputMode('keyboard'),
    },
    {
      key: 'speak',
      icon: 'mic',
      label: 'Speak',
      disabled: !loaded || busy || !controller.voiceAvailable(),
      onClick: startVoice,
    },
  ];

  const timeline = controller.historyTimeline();

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        background: t.surface,
        // Clear the iOS status bar / notch (mainly when added to the home screen).
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      {loaded ? (
        <>
          <AppBar
            t={t}
            fileName={fileName}
            page={page}
            pageCount={pageCount}
            onPrev={() => controller.goToPage(page - 1)}
            onNext={() => controller.goToPage(page + 1)}
          />
          <MobileTable
            id="tutorial-table-view"
            t={t}
            columns={columns}
            rows={rows}
            pageStart={pageStart}
            selection={controller.selection}
            onSelect={(row, column) => controller.selectCell(row, column)}
            streaming={busy}
          />
        </>
      ) : (
        <>
          <div
            style={{
              height: 46,
              flex: '0 0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: `1px solid ${t.line}`,
              background: t.surface,
            }}
          >
            <span style={{ fontFamily: typography.ui, fontSize: typography.size.base, fontWeight: 600, color: t.ink3 }}>
              No file open
            </span>
          </div>
          <EmptyState
            t={t}
            dark={dark}
            onOpenSample={() => controller.openSampleDialog()}
            onOpenLocal={() => void controller.openCsv()}
            onOpenUrl={() => controller.openUrlDialog()}
          />
        </>
      )}

      {/* bottom region: the dock, or one of the input sheets in its place */}
      {inputMode === 'keyboard' ? (
        <KeyboardSheet
          t={t}
          draft={draft}
          onDraft={setDraft}
          onSend={sendChat}
          onClose={() => setInputMode('none')}
          inputId="tutorial-chat-input"
        />
      ) : inputMode === 'voice' ? (
        <VoiceSheet t={t} status={voiceStatus} onSend={() => void controller.stopVoice()} onCancel={() => controller.cancelVoice()} />
      ) : inputMode === 'history' ? (
        <HistorySheet
          t={t}
          steps={timeline.steps}
          cursor={timeline.cursor}
          now={now}
          onClose={() => setInputMode('none')}
          onJump={(i) => void controller.jumpToHistory(i)}
          onUndo={() => void controller.undo()}
          onRedo={() => void controller.redo()}
        />
      ) : (
        <Dock t={t} actions={dockActions} />
      )}

      {drawerOpen && (
        <MenuDrawer t={t} dark={dark} controller={controller} onClose={() => setDrawerOpen(false)} onToggleTheme={toggle} />
      )}
    </div>
  );
}
