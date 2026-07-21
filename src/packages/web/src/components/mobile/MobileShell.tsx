// #MobileShell
// The phone layout: app bar (file + pager) over the frozen-header table over a
// persistent five-action dock, with the Type / Speak / History sheets rising in
// the dock's place. The app bar and the bottom region are fixed to the screen;
// the table flows in the document, so the page itself scrolls it — a natural
// swipe hides the phone browser's bars and the browser scrollbar shows the
// true position in the table (index.css keeps the page ≥1px scrollable so even
// the empty page can be swiped). It drives the same WebController the desktop
// tree does — the menu drawer and the shared Settings / Open-URL / Tours
// overlays carry every action that doesn't fit the dock. A running tour reuses
// the real Driver.js engine: the mobile table, the Menu button, and the
// composer carry the ids the tour targets, and a chat step opens the Type
// sheet so the spotlight lands on the visible composer.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { space, typography, type Theme } from '@tamedtable/ui-kit';
import { Icon } from '@tamedtable/ui-kit/components';
import { useTheme, useThemeControls } from '@tamedtable/ui-kit/components';
import { Lockup } from '@tamedtable/toolbar/components';
import type { WebController } from '../../controller.ts';
import { useController } from '../../hooks/useController.ts';
import { useKeyboardInset } from '../../hooks/useKeyboardInset.ts';
import { useTableZoom } from '../../hooks/useTableZoom.ts';
import { Dock, type DockAction } from './Dock.tsx';
import { MobileTable } from './MobileTable.tsx';
import { MenuDrawer } from './MenuDrawer.tsx';
import { KeyboardSheet, VoiceSheet, HistorySheet } from './sheets.tsx';
import { ToursLink } from '../ToursLink.tsx';
import { APPBAR_H, APPBAR_OFFSET, DOCK_OFFSET } from './layout.ts';

type InputMode = 'none' | 'keyboard' | 'voice' | 'history';

// #LazyExec — the slim banner under the app bar: the evaluated-rows readout,
// the retry action, and a compact Run all button (behavior.md § progress
// indicators). Hidden while nothing is pending or failed.
function LazyBanner({ t, controller }: { t: Theme; controller: WebController }): ReactNode {
  const readout = controller.evaluatedReadout();
  if (!readout) return null;
  const pending = readout.total - readout.done - readout.failed;
  const linkBtn: CSSProperties = {
    border: 'none',
    background: 'transparent',
    padding: 0,
    cursor: 'pointer',
    fontFamily: typography.ui,
    fontSize: typography.size.xs,
    textDecoration: 'underline',
  };
  return (
    <div
      data-mob-lazybanner=""
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: space.px8,
        padding: `${space.px4}px ${space.px10}px`,
        borderBottom: `1px solid ${t.line}`,
        background: t.surface2,
        fontFamily: typography.ui,
        fontSize: typography.size.xs,
        color: t.ink3,
      }}
    >
      <span style={{ whiteSpace: 'nowrap' }}>
        <b style={{ color: t.ink2 }}>{readout.done.toLocaleString()} of {readout.total.toLocaleString()}</b> evaluated
      </span>
      {readout.failed > 0 && (
        <button type="button" data-mob-retry="" onClick={() => void controller.retryFailedRows()} style={{ ...linkBtn, color: t.err }}>
          Retry {readout.failed}
        </button>
      )}
      <span style={{ flex: 1 }} />
      {pending > 0 && (
        <button
          type="button"
          data-mob-runall=""
          onClick={() => void controller.runOnAllRows()}
          style={{
            border: 'none',
            borderRadius: space.radiusSm,
            padding: '3px 9px',
            background: t.ink,
            color: t.surface,
            cursor: 'pointer',
            fontFamily: typography.ui,
            fontSize: typography.size.xs,
            fontWeight: 600,
          }}
        >
          Run all
        </button>
      )}
    </div>
  );
}

// #LazyExec — the phone's column menu, a bottom sheet like every other phone
// dialog: Sort ascending/descending, a contains-match filter row, and Delete
// column (a spec step). Sort/filter on an AI column go through the same
// dependency gate the desktop menu uses.
function ColumnMenuSheet({
  t,
  controller,
  col,
  onClose,
}: {
  t: Theme;
  controller: WebController;
  col: string;
  onClose: () => void;
}): ReactNode {
  const [filterDraft, setFilterDraft] = useState(controller.viewFilters()[col] ?? '');
  const sort = controller.viewSort();
  const item: CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '11px 14px',
    border: 'none',
    borderBottom: `1px solid ${t.line}`,
    background: 'transparent',
    color: t.ink,
    textAlign: 'left',
    fontFamily: typography.ui,
    fontSize: typography.size.base,
    cursor: 'pointer',
  };
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 40,
        background: t.overlay,
        display: 'flex',
        alignItems: 'flex-end',
      }}
    >
      <div
        data-mob-colmenu={col}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          background: t.surface,
          borderTop: `1px solid ${t.line2}`,
          borderRadius: `${space.radius}px ${space.radius}px 0 0`,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div style={{ padding: '12px 14px', fontFamily: typography.ui, fontSize: typography.size.sm, fontWeight: 600, color: t.ink2 }}>
          {col}
        </div>
        <button type="button" data-mob-menu-item="sort-asc" style={item}
          onClick={() => { void controller.setViewSort(col, sort?.column === col && sort.dir === 'asc' ? null : 'asc'); onClose(); }}>
          {sort?.column === col && sort.dir === 'asc' ? '✓ ' : ''}Sort ascending
        </button>
        <button type="button" data-mob-menu-item="sort-desc" style={item}
          onClick={() => { void controller.setViewSort(col, sort?.column === col && sort.dir === 'desc' ? null : 'desc'); onClose(); }}>
          {sort?.column === col && sort.dir === 'desc' ? '✓ ' : ''}Sort descending
        </button>
        <div style={{ display: 'flex', gap: space.px8, padding: '11px 14px', borderBottom: `1px solid ${t.line}` }}>
          <input
            data-mob-filter-input=""
            value={filterDraft}
            placeholder={`${col} contains…`}
            onChange={(e) => setFilterDraft(e.target.value)}
            style={{
              flex: 1,
              padding: '6px 8px',
              border: `1px solid ${t.line2}`,
              borderRadius: space.radiusSm,
              background: t.surface,
              color: t.ink,
              fontFamily: typography.ui,
              fontSize: typography.size.sm,
              outline: 'none',
            }}
          />
          <button
            type="button"
            data-mob-menu-item="filter"
            onClick={() => { void controller.setViewFilter(col, filterDraft); onClose(); }}
            style={{ ...item, width: 'auto', borderBottom: 'none', padding: '6px 10px', color: t.ink2 }}
          >
            Filter
          </button>
        </div>
        {/* Only when a filter is set — clear it in one tap. */}
        {controller.viewFilters()[col] && (
          <button type="button" data-mob-menu-item="remove-filter" style={item}
            onClick={() => { void controller.setViewFilter(col, ''); onClose(); }}>
            Remove filter
          </button>
        )}
        <button type="button" data-mob-menu-item="delete" style={{ ...item, color: t.err, borderBottom: 'none' }}
          onClick={() => { void controller.deleteColumn(col); onClose(); }}>
          Delete column
        </button>
      </div>
    </div>
  );
}

/** The app bar's shell: pinned to the top of the screen, clearing the notch. */
function fixedBarStyle(borderColor: string, background: string): CSSProperties {
  return {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    height: APPBAR_OFFSET,
    paddingTop: 'env(safe-area-inset-top)',
    display: 'flex',
    alignItems: 'center',
    borderBottom: `1px solid ${borderColor}`,
    background,
  };
}

function AppBar({
  t,
  fileName,
  page,
  pageCount,
  onPrev,
  onNext,
  pendingDot,
}: {
  t: Theme;
  fileName: string;
  page: number;
  pageCount: number;
  onPrev: () => void;
  onNext: () => void;
  /** #LazyExec — pages with pending rows exist: the pager carries a dot. */
  pendingDot?: boolean;
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
        ...fixedBarStyle(t.line, t.surface),
        gap: space.px8,
        padding: '0 10px',
        paddingTop: 'env(safe-area-inset-top)',
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
        {pendingDot && (
          <span
            data-mob-pending-dot=""
            title="Some pages have rows the AI steps have not reached yet"
            style={{
              display: 'inline-block',
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: t.accent,
              marginLeft: 4,
              verticalAlign: 'super',
            }}
          />
        )}
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
  onOpenTours,
}: {
  t: Theme;
  dark: boolean;
  onOpenSample: () => void;
  onOpenLocal: () => void;
  onOpenUrl: () => void;
  onOpenTours: () => void;
}): ReactNode {
  const opt = (icon: 'sparkle' | 'upload' | 'link', label: string, on: () => void, id?: string): ReactNode => (
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
        {opt('upload', 'Open local…', onOpenLocal)}
        {opt('link', 'Open URL…', onOpenUrl)}
      </div>
      <ToursLink t={t} onOpen={onOpenTours} />
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
  // #LazyExec — the column whose menu (bottom sheet) is open, or null.
  const [menuCol, setMenuCol] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [now, setNow] = useState(0);
  const kbInset = useKeyboardInset();

  const loaded = controller.isLoaded();
  const busy = controller.streaming;
  const spec = controller.displaySpec();
  const columns = spec.columns.map((c) => c.id);
  const rows = controller.pageRows();
  const page = controller.currentPage();
  const pageCount = controller.pageCount();
  const pageStart = (page - 1) * controller.pageSize;
  const fileName = spec.table ? spec.table.split('/').pop() ?? spec.table : 'table';
  const tableZoom = useTableZoom(spec.table ?? '');

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
      // The voice tour's `speak` step spotlights this button (same id the
      // desktop mic button carries), so the highlight resolves in both layouts.
      id: 'tutorial-speak',
      disabled: !loaded || busy || !controller.voiceAvailable(),
      onClick: startVoice,
    },
  ];

  const timeline = controller.historyTimeline();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: t.surface,
        // Fill the large viewport plus the 1px of scroll room (see index.css),
        // so short content still leaves a swipe's worth of page to scroll.
        minHeight: 'calc(100lvh + 1px)',
        // The app bar and the dock are fixed; the flowing content clears them.
        paddingTop: APPBAR_OFFSET,
        paddingBottom: DOCK_OFFSET,
      }}
    >
      {loaded ? (
        <>
          <AppBar
            t={t}
            fileName={fileName}
            page={page}
            pageCount={pageCount}
            onPrev={() => void controller.goToPage(page - 1)}
            onNext={() => void controller.goToPage(page + 1)}
            pendingDot={controller.pendingPages().length > 0}
          />
          <LazyBanner t={t} controller={controller} />
          <MobileTable
            id="tutorial-table-view"
            t={t}
            zoom={tableZoom}
            columns={columns}
            rows={rows}
            pageStart={pageStart}
            selection={controller.selection}
            onSelect={(row, column) => controller.selectCell(row, column)}
            streaming={busy}
            progress={controller.runProgress}
            onStop={() => controller.cancelRequest()}
            rowNumbers={controller.pageRowNumbers()}
            rowStatus={controller.pageRowStatus()}
            sort={controller.viewSort()}
            filters={controller.viewFilters()}
            onHeaderTap={(col) => setMenuCol(col)}
          />
          {menuCol !== null && (
            <ColumnMenuSheet t={t} controller={controller} col={menuCol} onClose={() => setMenuCol(null)} />
          )}
        </>
      ) : (
        <>
          <div style={{ ...fixedBarStyle(t.line, t.surface), justifyContent: 'center' }}>
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
            onOpenTours={() => controller.openTutorial()}
          />
        </>
      )}

      {/* bottom region: the dock, or one of the input sheets in its place —
          pinned to the bottom of the screen while the page scrolls the table.
          The OS keyboard slides over the page without moving fixed elements,
          so the region rises by the keyboard's height (0 while it's down). */}
      <div data-mob-bottom="" style={{ position: 'fixed', bottom: kbInset, left: 0, right: 0, zIndex: 20 }}>
        {inputMode === 'keyboard' ? (
          <KeyboardSheet
            t={t}
            draft={draft}
            onDraft={setDraft}
            onSend={sendChat}
            onClose={() => setInputMode('none')}
            lifted={kbInset > 0}
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
      </div>

      {drawerOpen && (
        <MenuDrawer t={t} dark={dark} controller={controller} onClose={() => setDrawerOpen(false)} onToggleTheme={toggle} />
      )}
    </div>
  );
}
