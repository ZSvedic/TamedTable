// TamedTable — design-base mirror of the CURRENT component inventory.
// Code is canonical: every primitive here matches src/packages/ui-kit (and the
// feature packages chat-panel, table-view, toolbar, model-config) in API shape
// and rendered look. Every color / size / radius reads a TT_* token from
// tokens.jsx (the generated mirror of tokens.json) — no hardcoded values.
// Components take the active theme object as a `t` prop (TT_LIGHT | TT_DARK)
// so static artboards can pull the variant they need.

const { useState, useEffect, useRef } = React;

// ── Shared keyframes (pulse, cell flash, rec ring, spinner, grip reveal) ──
if (typeof document !== 'undefined' && !document.getElementById('tt-kf')) {
  const s = document.createElement('style');
  s.id = 'tt-kf';
  s.textContent = [
    '@keyframes tt-pulse-kf { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }',
    '.tt-pulse { animation: tt-pulse-kf 1.2s ease-in-out infinite; }',
    // LLM-generated cells flash cellHi → settle on cellHi2 (recently updated).
    '@keyframes tt-flash-kf { from { background: var(--tt-hi); } to { background: var(--tt-hi2); } }',
    '.tt-flash { animation: tt-flash-kf 0.9s ease-out forwards; }',
    '@keyframes tt-spin-kf { to { transform: rotate(360deg); } }',
    '.tt-spin { animation: tt-spin-kf 0.7s linear infinite; }',
    // Pulsing record ring — built from the rec token via color-mix.
    '@keyframes tt-rec-kf { 0% { box-shadow: 0 0 0 0 var(--tt-rec-55); }',
    '  70% { box-shadow: 0 0 0 7px var(--tt-rec-0); }',
    '  100% { box-shadow: 0 0 0 0 var(--tt-rec-0); } }',
    '.tt-rec-ring { animation: tt-rec-kf 1.1s ease-out infinite; }',
    '.tt-th .tt-grip { opacity: 0; transition: opacity 0.15s; }',
    '.tt-th:hover .tt-grip, .tt-th.tt-grip-on .tt-grip { opacity: 1; }',
    '@keyframes tt-sheet-kf { from { opacity: 0; transform: translateY(6px); }',
    '  to { opacity: 1; transform: translateY(0); } }',
    '.tt-sheet { animation: tt-sheet-kf 0.14s ease-out; }',
  ].join('\n');
  document.head.appendChild(s);
}

// ── Sample dataset ────────────────────────────────────────────────────────
// 20 rows × 6 cols of deliberately messy contact data, so "filter by score"
// and "add a Country column from each phone number" read as natural asks.
const SAMPLE_COLS = ['ID', 'Name', 'Email', 'Phone', 'Signup', 'Score'];
const COL_WIDTHS = [56, 150, 205, 150, 100, 64];
const SAMPLE_ROWS = [
  ['1024', 'Maren Whitfield',  'maren.whitfield@hey.com', '(415) 555-0142',   '2025-11-14', '8.4'],
  ['1025', 'Anders Köhl',      'anders@kohl.studio',      '415.555.0188',     '2025-11-13', '9.1'],
  ['1026', 'Yuki Tanaka',      'yuki.tanaka@gmail.com',   '+1 415 555 0199',  '2025-11-12', '7.9'],
  ['1027', 'Priya Raghavan',   'praghavan@outlook.com',   '4155550133',       '2025-11-11', '8.8'],
  ['1028', 'Tomás Herrera',    'tomas.h@correo.mx',       '+52 55 5550 0117', '2025-11-10', '6.2'],
  ['1029', 'Lena Fischer',     'lena@fischer.de',         '',                 '2025-11-09', '9.4'],
  ['1030', 'Samuel Osei',      's.osei@accra.dev',        '628 555 0151',     '2025-11-08', '7.1'],
  ['1031', 'Chloé Martin',     'chloe.martin@paris.fr',   '+33 1 55 50 12 34','2025-11-07', '8.0'],
  ['1032', 'Diego Ramos',      'diego@ramos.studio',      '(415) 555-0124',   '2025-11-06', '5.8'],
  ['1033', 'Hana Yoon',        'hana.yoon@naver.com',     '415.555.0107',     '2025-11-05', '9.0'],
  ['1034', 'Olu Adebayo',      'olu@adebayo.ng',          '415 555 0176',     '2025-11-04', '7.6'],
  ['1035', 'Greta Lindqvist',  'greta@lindqvist.se',      '+46 8 555 0143',   '2025-11-03', '8.3'],
  ['1036', 'Mateusz Kowalski', 'mateusz@kowalski.pl',     '628 555 0129',     '2025-11-02', '8.1'],
  ['1037', 'Aisha Khan',       'aisha.khan@proton.me',    '(628) 555-0185',   '2025-11-01', '6.9'],
  ['1038', 'Bruno Costa',      'bruno@costa.br',          '+55 11 5550 0110', '2025-10-31', '7.4'],
  ['1039', 'Ingrid Hansen',    'ingrid.h@oslo.no',        '415-555-0163',     '2025-10-30', '8.7'],
  ['1040', 'Ravi Patel',       'ravi.patel@zoho.com',     '4155550172',       '2025-10-29', '9.2'],
  ['1041', 'Sofia Russo',      'sofia@russo.it',          '+39 02 555 0148',  '2025-10-28', '6.5'],
  ['1042', 'Emeka Obi',        'emeka.obi@lagos.io',      '628.555.0136',     '2025-10-27', '7.8'],
  ['1043', 'Nadia Petrova',    'nadia@petrova.bg',        '+359 2 555 0121',  '2025-10-26', '8.9'],
];
// Country derived from each phone's country code — the AI-cell worked example.
const COUNTRY_BY_PHONE = {
  '+52': 'Mexico', '+33': 'France', '+46': 'Sweden', '+55': 'Brazil',
  '+39': 'Italy', '+359': 'Bulgaria',
};
function countryOf(phone) {
  if (!phone) return null;
  const m = String(phone).match(/^\+(\d{1,3})/);
  if (!m) return 'United States';
  const code = '+' + m[1];
  if (code === '+1') return 'United States';
  return COUNTRY_BY_PHONE[code] || COUNTRY_BY_PHONE[code.slice(0, 3)] || 'United States';
}

// ── Icon — 16×16 inline SVG, currentColor stroke (mirrors ui-kit/Icon.tsx) ──
const ICON_PATHS = {
  folder: 'M2 4.5A1.5 1.5 0 0 1 3.5 3h2.6a1 1 0 0 1 .7.3l1 1H12.5A1.5 1.5 0 0 1 14 5.8v5.7A1.5 1.5 0 0 1 12.5 13h-9A1.5 1.5 0 0 1 2 11.5z',
  save: 'M3 3h7l3 3v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z M5 3v3h5V3 M5 13v-4h6v4',
  undo: 'M5 5 2.5 7.5 5 10 M2.5 7.5h7.5a3.5 3.5 0 1 1 0 7H7',
  redo: 'm11 5 2.5 2.5L11 10 M13.5 7.5H6a3.5 3.5 0 1 0 0 7h3',
  cog: 'M8 5.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z M8 2v1.5 M8 12.5V14 M2 8h1.5 M12.5 8H14 M3.5 3.5l1.1 1.1 M11.4 11.4l1.1 1.1 M3.5 12.5l1.1-1.1 M11.4 4.6l1.1-1.1',
  send: 'm2.5 8 11-5-3 12-3-5-5-2Z',
  stop: 'M5 5h6v6H5z',
  chevron: 'm4 6 4 4 4-4',
  x: 'm4 4 8 8 M12 4l-8 8',
  err: 'M8 2 14 13H2L8 2Z M8 7v3 M8 12v.01',
  ok: 'm3 8 3.5 3.5L13 5',
  upload: 'M8 10V3 M5 6l3-3 3 3 M2.5 11.5v1A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5v-1',
  grip: 'M6 4v8 M10 4v8',
  eye: 'M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  eyeOff: 'M6.2 6.2A2 2 0 0 0 9.8 9.8 M3 3l10 10 M5.2 5.3C2.9 6.6 1.5 8 1.5 8S4 12.5 8 12.5c1 0 1.9-.2 2.7-.6 M10.8 10.7C13 9.4 14.5 8 14.5 8S12 3.5 8 3.5',
  sun: 'M8 5.4a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2Z M8 1.4v1.8 M8 12.8v1.8 M1.4 8h1.8 M12.8 8h1.8 M3.4 3.4l1.3 1.3 M11.3 11.3l1.3 1.3 M3.4 12.6l1.3-1.3 M11.3 4.7l1.3-1.3',
  moon: 'M13.2 9.4A5.5 5.5 0 0 1 6.6 2.8 5.5 5.5 0 1 0 13.2 9.4Z',
  mic: 'M8 2.5a2 2 0 0 1 2 2v3.5a2 2 0 0 1-4 0V4.5a2 2 0 0 1 2-2Z M4.5 8a3.5 3.5 0 0 0 7 0 M8 11.5V14 M6 14h4',
  copy: 'M6 6h7v7H6Z M10 6V3.5A.5.5 0 0 0 9.5 3h-6a.5.5 0 0 0-.5.5v6a.5.5 0 0 0 .5.5H6',
};
const ICON_NAMES = Object.keys(ICON_PATHS);
const ICON_FILLED = new Set(['stop']);

function Icon({ name, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16"
      fill={ICON_FILLED.has(name) ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ flex: '0 0 auto', display: 'block' }} aria-hidden="true">
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

// ── Button — variants ghost (default) | chrome | primary | danger ─────────
// Primary is Ink (Aubergine): the Pale Sky accent is never a button fill.
function Button({ t, children, variant = 'ghost', disabled, onClick, title, forceHover, style }) {
  const [hover, setHover] = useState(false);
  const hov = !disabled && (hover || forceHover);
  const base = {
    height: 28, padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: TT_S.px6,
    border: '1px solid transparent', borderRadius: TT_S.radiusSm, background: 'transparent',
    color: t.ink2, fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.sm, fontWeight: 500, lineHeight: 1,
    whiteSpace: 'nowrap', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1,
    transition: 'background .12s, color .12s, border-color .12s',
  };
  const variants = {
    ghost: {},
    chrome: { color: t.ink, borderColor: t.line },
    primary: { background: t.ink, color: t.inkOnInk, borderColor: t.ink, fontWeight: 600 },
    danger: { color: t.err, borderColor: t.line },
  };
  const hoverFill =
    hov && (variant === 'ghost' || variant === 'chrome') ? { background: t.surface3 }
    : hov && variant === 'primary' ? { background: t.ink2, borderColor: t.ink2 }
    : hov && variant === 'danger' ? { background: t.errSoft }
    : {};
  return (
    <button type="button" title={title} disabled={disabled} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ ...base, ...variants[variant], ...hoverFill, ...style }}>
      {children}
    </button>
  );
}

// ── SplitButton — primary half + caret menu; closes on pick/outside/Esc ──
function MenuItemButton({ t, label, onClick, disabled }) {
  const [hover, setHover] = useState(false);
  return (
    <button type="button" role="menuitem" disabled={disabled} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        textAlign: 'left', border: 0, background: !disabled && hover ? t.surface3 : 'transparent',
        borderRadius: TT_S.radiusSm, padding: '6px 10px', cursor: disabled ? 'default' : 'pointer',
        color: t.ink, fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.sm, whiteSpace: 'nowrap',
        opacity: disabled ? 0.4 : 1,
      }}>
      {label}
    </button>
  );
}

function SplitButton({ t, children, onClick, menu = [], disabled, title, caretTitle, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [hover, setHover] = useState(false);
  const rootRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);
  const tinted = !disabled && (hover || open);
  const baseHalf = {
    height: 28, display: 'inline-flex', alignItems: 'center', gap: TT_S.px6,
    background: 'transparent', color: t.ink2, border: 0, fontFamily: TT_TYPE.ui,
    fontSize: TT_TYPE.sm, fontWeight: 500, lineHeight: 1, whiteSpace: 'nowrap',
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1,
  };
  return (
    <div ref={rootRef} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ position: 'relative', display: 'inline-flex' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', borderRadius: TT_S.radiusSm,
        background: tinted ? t.surface3 : 'transparent', transition: 'background .12s',
      }}>
        <button type="button" title={title} disabled={disabled} onClick={onClick}
          style={{ ...baseHalf, padding: '0 4px 0 10px', borderTopLeftRadius: TT_S.radiusSm, borderBottomLeftRadius: TT_S.radiusSm }}>
          {children}
        </button>
        <button type="button" title={caretTitle} aria-haspopup="menu" aria-expanded={open}
          disabled={disabled} onClick={() => setOpen((v) => !v)}
          style={{ ...baseHalf, padding: '0 6px 0 2px', color: t.ink3, borderTopRightRadius: TT_S.radiusSm, borderBottomRightRadius: TT_S.radiusSm }}>
          <Icon name="chevron" size={12} />
        </button>
      </div>
      {open && !disabled && (
        <div role="menu" style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4, minWidth: '100%',
          background: t.surface, border: `1px solid ${t.line2}`, borderRadius: TT_S.radius,
          boxShadow: t.shadow, padding: TT_S.px4, display: 'flex', flexDirection: 'column',
          gap: 2, zIndex: 50,
        }}>
          {menu.map((item) => (
            <MenuItemButton key={item.label} t={t} label={item.label} disabled={item.disabled}
              onClick={() => { setOpen(false); if (!item.disabled && item.onClick) item.onClick(); }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Toasts — bottom-right stack, kinds info | error, each dismissible ────
// `fixed` pins to the viewport (prototype); default absolute fits artboards.
function Toasts({ t, toasts, onDismiss, fixed = false }) {
  if (!toasts || toasts.length === 0) return null;
  return (
    <div style={{
      position: fixed ? 'fixed' : 'absolute', right: TT_S.px16, bottom: TT_S.px16,
      display: 'flex', flexDirection: 'column', gap: TT_S.px8, zIndex: 200, maxWidth: 380,
    }}>
      {toasts.map((toast) => {
        const isError = toast.kind === 'error';
        return (
          <div key={toast.id} className="tt-sheet" style={{
            display: 'flex', alignItems: 'flex-start', gap: TT_S.px10, minWidth: 280,
            padding: '10px 12px', borderRadius: TT_S.radius, background: t.surface, color: t.ink,
            border: `1px solid ${isError ? t.err : t.line2}`,
            borderLeft: `3px solid ${isError ? t.err : t.ok}`, boxShadow: t.shadowLg,
            fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.sm, lineHeight: 1.5,
          }}>
            <span style={{ flex: '0 0 auto', marginTop: 1, color: isError ? t.err : t.ok }}>
              <Icon name={isError ? 'err' : 'ok'} />
            </span>
            <div style={{ flex: 1 }}>{toast.message}</div>
            <button type="button" onClick={() => onDismiss && onDismiss(toast.id)} title="Dismiss"
              style={{ background: 'transparent', border: 0, padding: TT_S.px2, cursor: 'pointer', color: t.ink3, display: 'flex' }}>
              <Icon name="x" size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── MicButton — press-and-hold; idle → recording (rec fill + ring) → sending ──
function MicButton({ t, status = 'idle', onStart, onStop, onCancel }) {
  const recording = status === 'recording';
  const sending = status === 'sending';
  const title = recording ? 'Release to send · Esc to cancel'
    : sending ? 'Transcribing…' : 'Hold to record a voice request';
  return (
    <button type="button" className={recording ? 'tt-rec-ring' : undefined}
      onPointerDown={(e) => { if (!sending && onStart) { e.preventDefault(); onStart(); } }}
      onPointerUp={() => { if (recording && onStop) onStop(); }}
      onPointerCancel={() => onCancel && onCancel()}
      disabled={sending} title={title} aria-label={title}
      style={{
        height: 30, width: 30, flex: '0 0 auto', borderRadius: TT_S.radiusSm,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${recording ? t.rec : t.line2}`,
        background: recording ? t.rec : 'transparent',
        color: recording ? t.onRec : sending ? t.ink3 : t.ink2,
        cursor: sending ? 'default' : 'pointer', touchAction: 'none',
        '--tt-rec-55': `color-mix(in srgb, ${t.rec} 55%, transparent)`,
        '--tt-rec-0': `color-mix(in srgb, ${t.rec} 0%, transparent)`,
      }}>
      {sending ? (
        <span className="tt-spin" style={{
          width: 14, height: 14, borderRadius: '50%',
          border: `2px solid ${t.line2}`, borderTopColor: t.ink2, display: 'block',
        }} />
      ) : <Icon name="mic" />}
    </button>
  );
}

// ── Pagination — prev/next chevrons around a 1 2 3 … N window ────────────
function buildPageList(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [1];
  if (current > 3) pages.push('…');
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
  if (current < total - 2) pages.push('…');
  pages.push(total);
  return pages;
}

function Pagination({ t, page, pageCount, onPageChange }) {
  const pages = buildPageList(page, pageCount);
  const cell = {
    height: 24, minWidth: 24, padding: `0 ${TT_S.px6}px`, display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center', borderRadius: TT_S.radiusSm,
    border: '1px solid transparent', background: 'transparent', fontFamily: TT_TYPE.ui,
    fontSize: TT_TYPE.sm, fontVariantNumeric: 'tabular-nums',
  };
  const nav = (dir) => {
    const disabled = dir === 'prev' ? page <= 1 : page >= pageCount;
    return (
      <button key={dir} type="button" title={dir === 'prev' ? 'Previous page' : 'Next page'} disabled={disabled}
        onClick={() => onPageChange && onPageChange(dir === 'prev' ? page - 1 : page + 1)}
        style={{ ...cell, color: disabled ? t.ink4 : t.ink2, cursor: disabled ? 'default' : 'pointer' }}>
        <span style={{ display: 'inline-flex', transform: dir === 'prev' ? 'rotate(90deg)' : 'rotate(-90deg)' }}>
          <Icon name="chevron" size={12} />
        </span>
      </button>
    );
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {nav('prev')}
      {pages.map((p, i) => p === '…' ? (
        <span key={`e${i}`} style={{ ...cell, color: t.ink3 }}>…</span>
      ) : (
        <button key={p} type="button" onClick={() => onPageChange && onPageChange(p)}
          aria-current={p === page ? 'page' : undefined}
          style={{
            ...cell, cursor: 'pointer', color: p === page ? t.ink : t.ink2,
            fontWeight: p === page ? 600 : 500,
            borderColor: p === page ? t.line2 : 'transparent',
            background: p === page ? t.surface : 'transparent',
          }}>
          {p}
        </button>
      ))}
      {nav('next')}
    </div>
  );
}

// ── TableView — Silver grid, rowH 28 / headerH 32, selection, inline edit,
//    drag-reorder grips, streaming banner, pagination + status footers.
//    cellFlag(absRow, colIdx) → 'flash' | 'flash2' | 'pending' | undefined.
function TableView({
  t, cols = SAMPLE_COLS, rows = SAMPLE_ROWS, colWidths,
  page = 1, pageCount = 1, pageStart = 0, totalRows,
  selection = null, editing = null, editDraft = '', dragCol = null,
  streaming = false, status = 'idle', cellFlag,
  onPageChange, onSelectCell, onEditCell, onCommitEdit, onEditDraft, onCancelEdit, onReorderColumns,
}) {
  const total = totalRows == null ? rows.length : totalRows;
  const firstRow = total === 0 ? 0 : pageStart + 1;
  const lastRow = pageStart + rows.length;
  const STATUS_LABEL = { idle: 'Idle', running: 'Running', saved: 'Saved' };
  const [localDrag, setLocalDrag] = useState(null);
  const dragging = dragCol != null ? dragCol : localDrag;

  const headerCell = {
    position: 'sticky', top: 0, zIndex: 1, background: t.surface2, color: t.ink2,
    textAlign: 'left', padding: `0 ${TT_S.px10}px`, height: TT_S.headerH,
    borderBottom: `1px solid ${t.line2}`, borderRight: `1px solid ${t.line}`,
    userSelect: 'none', fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.sm, fontWeight: 600,
    whiteSpace: 'nowrap',
  };
  const bodyCell = {
    padding: `0 ${TT_S.px10}px`, height: TT_S.rowH, boxSizing: 'border-box',
    borderBottom: `1px solid ${t.line}`, borderRight: `1px solid ${t.line}`, color: t.ink,
    maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  };

  const dropOn = (target) => {
    if (!dragging || dragging === target) { setLocalDrag(null); return; }
    const order = cols.slice();
    order.splice(order.indexOf(target), 0, ...order.splice(order.indexOf(dragging), 1));
    setLocalDrag(null);
    if (onReorderColumns) onReorderColumns(order);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: t.surface }}>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {streaming && (
          <div style={{
            position: 'sticky', top: 0, zIndex: 2, display: 'flex', alignItems: 'center',
            gap: TT_S.px8, padding: `${TT_S.px6}px ${TT_S.px12}px`, background: t.accentSoft,
            color: t.ink, fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.sm, borderBottom: `1px solid ${t.line}`,
          }}>
            <span className="tt-pulse" style={{ width: 6, height: 6, borderRadius: 3, background: t.accent }} />
            Streaming results…
          </div>
        )}
        <table style={{ borderCollapse: 'collapse', fontFamily: TT_TYPE.mono, fontSize: TT_TYPE.sm, fontVariantNumeric: 'tabular-nums' }}>
          <thead>
            <tr>
              <th style={{ ...headerCell, textAlign: 'right', color: t.ink4, fontFamily: TT_TYPE.mono, fontWeight: 400 }}>#</th>
              {cols.map((col, ci) => (
                <th key={col} className={`tt-th${dragging === col ? ' tt-grip-on' : ''}`} draggable
                  onDragStart={() => setLocalDrag(col)} onDragOver={(e) => e.preventDefault()}
                  onDrop={() => dropOn(col)} title="Drag to reorder"
                  style={{
                    ...headerCell, cursor: 'grab',
                    minWidth: colWidths ? colWidths[ci] : undefined,
                    background: dragging === col ? t.accentSoft : t.surface2,
                  }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: TT_S.px6 }}>
                    <span className="tt-grip" style={{ color: t.ink4 }}><Icon name="grip" size={12} /></span>
                    {col}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => {
              const absRow = pageStart + ri;
              return (
                <tr key={absRow}>
                  <td style={{ ...bodyCell, color: t.ink4, textAlign: 'right', background: t.surface2 }}>{absRow + 1}</td>
                  {cols.map((col, ci) => {
                    const flag = cellFlag ? cellFlag(absRow, ci) : undefined;
                    const isEditing = editing && editing.row === absRow && editing.col === col;
                    const isSelected = selection && selection.row === absRow && selection.column === col;
                    const flashCls = flag === 'flash' || flag === 'flash2' ? 'tt-flash' : undefined;
                    return (
                      <td key={col} className={flashCls}
                        title="Click to select · double-click to edit"
                        onClick={() => onSelectCell && onSelectCell(absRow, col)}
                        onDoubleClick={() => onEditCell && onEditCell(absRow, col)}
                        style={{
                          ...bodyCell,
                          padding: isEditing ? 0 : bodyCell.padding,
                          background: isSelected && !isEditing ? t.accentSoft
                            : flag === 'flash' ? t.cellHi
                            : flag === 'flash2' ? t.cellHi2 : undefined,
                          '--tt-hi': t.cellHi, '--tt-hi2': t.cellHi2,
                          boxShadow: isEditing ? `inset 0 0 0 2px ${t.accent}` : undefined,
                        }}>
                        {isEditing ? (
                          <input autoFocus={!!onEditDraft} value={editDraft} readOnly={!onEditDraft}
                            onChange={(e) => onEditDraft && onEditDraft(e.target.value)}
                            onBlur={() => onCommitEdit && onCommitEdit()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.preventDefault(); onCommitEdit && onCommitEdit(); }
                              else if (e.key === 'Escape') { onCancelEdit && onCancelEdit(); }
                            }}
                            style={{
                              width: '100%', boxSizing: 'border-box', fontFamily: TT_TYPE.mono,
                              fontSize: TT_TYPE.sm, background: t.surface, color: t.ink, border: 'none',
                              outline: 'none', padding: `0 ${TT_S.px10}px`, height: TT_S.rowH,
                            }} />
                        ) : flag === 'pending' ? (
                          <span className="tt-pulse" style={{ color: t.ink4 }}>…</span>
                        ) : (
                          row[ci] == null || row[ci] === '' ? <span style={{ color: t.ink4 }}>{row[ci] === '' ? '' : 'null'}</span> : String(row[ci])
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div style={{ padding: TT_S.px16, color: t.ink3, fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.sm }}>
            This table has 0 rows.
          </div>
        )}
      </div>

      {/* pagination bar */}
      <div style={{
        flex: '0 0 auto', height: TT_S.topbarH, display: 'flex', alignItems: 'center',
        gap: TT_S.px12, padding: `0 ${TT_S.px10}px 0 ${TT_S.px14}px`,
        borderTop: `1px solid ${t.line}`, background: t.surface2,
      }}>
        <span style={{ fontFamily: TT_TYPE.mono, fontSize: TT_TYPE.xs, color: t.ink3, whiteSpace: 'nowrap' }}>
          <span style={{ color: t.ink2 }}>{firstRow}–{lastRow}</span> of {total} rows
        </span>
        <span style={{ flex: 1 }} />
        <Pagination t={t} page={page} pageCount={pageCount} onPageChange={onPageChange} />
      </div>

      {/* status footer */}
      <div style={{
        flex: '0 0 auto', height: 24, display: 'flex', alignItems: 'center', gap: TT_S.px10,
        padding: `0 ${TT_S.px12}px`, borderTop: `1px solid ${t.line}`, background: t.surface2,
        fontFamily: TT_TYPE.mono, fontSize: TT_TYPE.xs, color: t.ink3, whiteSpace: 'nowrap',
      }}>
        <span style={{ color: selection ? t.ink2 : t.ink4 }}>
          {selection ? `R${selection.row + 1} · ${selection.column}` : 'no selection'}
        </span>
        <span style={{ color: t.ink4 }}>·</span>
        <span>UTF-8</span>
        <span style={{ flex: 1 }} />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: TT_S.px6 }}>
          <span className={status === 'running' ? 'tt-pulse' : undefined} style={{
            width: 6, height: 6, borderRadius: 3,
            background: status === 'running' ? t.accent : status === 'saved' ? t.ok : t.ink4,
          }} />
          {STATUS_LABEL[status]}
        </span>
      </div>
    </div>
  );
}

// ── Toolbar — lockup, file readout, open/save/undo/redo, theme, settings ──
function Toolbar({
  t, loaded = true, busy = false, fileName = 'customers.csv', rowCount = 20, colCount = 6,
  canUndo = true, canRedo = false, splitOpen = false,
  onOpenUrl, onOpenLocal, onSaveData, onSaveFlow, onUndo, onRedo,
  onToggleTheme, onOpenSettings, onOpenTutorial,
}) {
  const dark = t.name === 'dark';
  const divider = <span style={{ width: 1, height: 16, background: t.line, margin: `0 ${TT_S.px6}px` }} />;
  return (
    <header style={{
      height: TT_S.topbarH, flex: '0 0 auto', display: 'flex', alignItems: 'center',
      gap: TT_S.px10, padding: `0 ${TT_S.px12}px`, background: t.surface,
      borderBottom: `1px solid ${t.line}`,
    }}>
      <Lockup size={TT_TYPE.md} color={t.ink} dark={dark} />
      {loaded && (
        <span style={{
          fontFamily: TT_TYPE.mono, fontSize: TT_TYPE.sm, color: t.ink3, marginLeft: TT_S.px6,
          paddingLeft: TT_S.px10, borderLeft: `1px solid ${t.line}`, whiteSpace: 'nowrap',
        }}>
          {fileName && <React.Fragment>{fileName} <span style={{ color: t.ink4 }}>·</span> </React.Fragment>}
          {rowCount} rows × {colCount} cols
        </span>
      )}
      <div style={{ flex: 1 }} />
      <SplitButton t={t} onClick={onOpenUrl} disabled={busy} defaultOpen={splitOpen}
        title="Open a CSV or JSONL file from a URL" caretTitle="More open options"
        menu={[{ label: 'Open local…', onClick: onOpenLocal }]}>
        <Icon name="folder" />
        Open URL…
      </SplitButton>
      <Button t={t} onClick={onSaveData} disabled={!loaded || busy} title="Save the current rows (:save)">
        <Icon name="save" />
        Save data
      </Button>
      <Button t={t} onClick={onSaveFlow} disabled={!loaded || busy} title="Save the flow as a replayable .flow file (:save-flow)">
        Save flow
      </Button>
      {divider}
      <Button t={t} onClick={onUndo} disabled={!canUndo || busy} title="Undo (:undo)">
        <Icon name="undo" />
        Undo
      </Button>
      <Button t={t} onClick={onRedo} disabled={!canRedo || busy} title="Redo (:redo)">
        <Icon name="redo" />
        Redo
      </Button>
      {divider}
      <Button t={t} onClick={onToggleTheme} title={dark ? 'Switch to light theme' : 'Switch to dark theme'}>
        <Icon name={dark ? 'sun' : 'moon'} />
      </Button>
      <Button t={t} onClick={onOpenSettings} title="API key and settings">
        <Icon name="cog" />
        Settings
      </Button>
      <Button t={t} onClick={onOpenTutorial} title="Interactive tutorials — no API key required">
        Tutorial
      </Button>
    </header>
  );
}

// ── OpenUrlDialog — URL field + bundled sample quick-picks ───────────────
const SAMPLE_FILES = [
  { name: 'customers.csv', url: 'https://zsvedic.github.io/TamedTable/samples/customers.csv' },
  { name: 'orders.jsonl', url: 'https://zsvedic.github.io/TamedTable/samples/orders.jsonl' },
  { name: 'cities.csv', url: 'https://zsvedic.github.io/TamedTable/samples/cities.csv' },
];
function sampleKind(name) { return name.split('.').pop(); }

function SampleRow({ t, sample, onPick }) {
  const [hover, setHover] = useState(false);
  return (
    <button type="button" onClick={onPick} title={`Use ${sample.name}`}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        textAlign: 'left', background: hover ? t.surface3 : 'transparent', border: 0,
        borderRadius: TT_S.radiusSm, padding: '6px 8px', cursor: 'pointer', color: t.ink,
        fontFamily: TT_TYPE.mono, fontSize: TT_TYPE.sm, display: 'flex', alignItems: 'center', gap: TT_S.px8,
      }}>
      <span style={{
        fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.xs, color: t.ink3,
        textTransform: 'uppercase', letterSpacing: 0.5, minWidth: 36,
      }}>{sampleKind(sample.name)}</span>
      <span>{sample.name}</span>
    </button>
  );
}

function OpenUrlDialog({
  t, inline = false, url = '', error = null, loading = false, samples = SAMPLE_FILES,
  onUrlChange, onSubmit, onClose, onPick,
}) {
  const label = { fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.sm, fontWeight: 600, color: t.ink, marginBottom: TT_S.px4 };
  const hint = { fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.xs, lineHeight: 1.55, color: t.ink3, marginBottom: TT_S.px8 };
  return (
    <div onClick={onClose} style={{
      position: inline ? 'absolute' : 'fixed', inset: 0, background: t.overlay,
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 520, maxWidth: '92%', maxHeight: '88%', background: t.surface,
        border: `1px solid ${t.line2}`, borderRadius: TT_S.radiusLg, boxShadow: t.shadowLg,
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          flex: '0 0 auto', display: 'flex', alignItems: 'center',
          padding: `${TT_S.px12}px ${TT_S.px16}px`, borderBottom: `1px solid ${t.line}`,
        }}>
          <span style={{ fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.md, fontWeight: 600, color: t.ink, whiteSpace: 'nowrap' }}>Open from URL</span>
          <span style={{ flex: 1 }} />
          <button type="button" onClick={onClose} title="Close" style={{
            background: 'transparent', border: 0, padding: TT_S.px4, cursor: 'pointer', color: t.ink3, display: 'flex',
          }}><Icon name="x" /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: TT_S.px16, display: 'flex', flexDirection: 'column', gap: TT_S.px16 }}>
          <div>
            <div style={label}>URL</div>
            <div style={hint}>Paste a link to a .csv or .jsonl file. The remote server must allow cross-origin requests.</div>
            <input type="url" value={url} placeholder="https://example.com/data.csv" spellCheck={false}
              autoComplete="off" disabled={loading} readOnly={!onUrlChange}
              onChange={(e) => onUrlChange && onUrlChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && onSubmit) { e.preventDefault(); onSubmit(url); } }}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '8px 10px',
                border: `1px solid ${t.line2}`, borderRadius: TT_S.radius, background: t.surface2,
                fontFamily: TT_TYPE.mono, fontSize: TT_TYPE.sm, color: t.ink, outline: 'none',
              }} />
          </div>
          <div>
            <div style={label}>Or pick a sample file</div>
            <div style={hint}>Shipped with TamedTable. Picking one fills the URL field — press Load to fetch.</div>
            <div role="listbox" style={{
              display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 240, overflowY: 'auto',
              border: `1px solid ${t.line2}`, borderRadius: TT_S.radius, background: t.surface2, padding: TT_S.px4,
            }}>
              {samples.map((s) => <SampleRow key={s.name} t={t} sample={s} onPick={() => onPick && onPick(s.url)} />)}
            </div>
          </div>
          {error && (
            <div role="alert" style={{
              padding: '8px 10px', border: `1px solid ${t.err}`, background: t.errSoft,
              borderRadius: TT_S.radius, color: t.err, fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.sm,
              lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', gap: TT_S.px8,
            }}>
              <Icon name="err" />
              <span style={{ flex: 1 }}>{error}</span>
            </div>
          )}
        </div>
        <div style={{
          flex: '0 0 auto', display: 'flex', justifyContent: 'flex-end', gap: TT_S.px8,
          padding: TT_S.px14, borderTop: `1px solid ${t.line}`,
        }}>
          <Button t={t} variant="chrome" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button t={t} variant="primary" onClick={() => onSubmit && onSubmit(url)} disabled={loading || !url.trim()}>
            {loading ? 'Loading…' : 'Load'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Chat — request list, request-detail strip, input row w/ mic + send/stop ──
function debugDetailText(debug) {
  return [
    '── request ──────────────────────────',
    debug.userRequest,
    `${debug.modelCalls.map((m) => `${m.model} ×${m.calls}`).join(', ')} · ${(debug.inputTokens + debug.outputTokens).toLocaleString('en-US')} tokens · ${(debug.elapsedMs / 1000).toFixed(1)}s`,
    '',
    '── response ─────────────────────────',
    ...debug.turns.flatMap((turn, i) => [`turn ${i + 1}: ${turn.outcome}`, JSON.stringify(turn.ops, null, 2)]),
    ...(debug.cellSamples && debug.cellSamples.length > 0 ? [
      '',
      '── cell samples (up to 3 per column) ──',
      ...debug.cellSamples.flatMap((s) => s.samples.map((p) => `${s.column}: ${JSON.stringify(p.in)} → ${JSON.stringify(p.out)}`)),
    ] : []),
  ].join('\n');
}

function UserBubble({ t, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{
        maxWidth: '88%', background: t.accentSoft, color: t.ink, border: `1px solid ${t.line}`,
        borderRadius: TT_S.radius, padding: '6px 10px', fontFamily: TT_TYPE.ui,
        fontSize: TT_TYPE.base, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>{children}</div>
    </div>
  );
}

function AssistantMessage({ t, message, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);
  const isError = message.text.startsWith('Error:');
  const body = isError ? message.text.replace(/^Error:\s*/, '') : message.text;
  const copyDetail = () => {
    if (!message.debug || !navigator.clipboard) return;
    navigator.clipboard.writeText(debugDetailText(message.debug)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: TT_S.px8,
        color: isError ? t.err : t.ink2, fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.base, lineHeight: 1.5,
      }}>
        {isError ? (
          <span style={{ flex: '0 0 auto', marginTop: 2, color: t.err }}><Icon name="err" /></span>
        ) : (
          <span style={{ flex: '0 0 auto', marginTop: 6, width: 6, height: 6, borderRadius: 3, background: t.ok }} />
        )}
        <div style={{ flex: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{body}</div>
      </div>
      {message.debug && (
        <React.Fragment>
          <div style={{
            marginTop: TT_S.px4, marginLeft: TT_S.px14, alignSelf: 'flex-start',
            display: 'inline-flex', alignItems: 'center', gap: TT_S.px8,
          }}>
            <button type="button" onClick={() => setOpen((o) => !o)} style={{
              background: 'transparent', border: 0, padding: 0, cursor: 'pointer', color: t.ink3,
              fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.xs, display: 'inline-flex', alignItems: 'center', gap: TT_S.px4,
              whiteSpace: 'nowrap',
            }}>
              <span style={{ display: 'inline-flex', transition: 'transform .15s', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                <Icon name="chevron" size={12} />
              </span>
              request detail
            </button>
            <button type="button" onClick={copyDetail} title={copied ? 'Copied' : 'Copy request detail'}
              style={{
                background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
                color: copied ? t.ok : t.ink3, display: 'inline-flex', alignItems: 'center',
              }}>
              <Icon name="copy" size={12} />
            </button>
          </div>
          {open && (
            <pre style={{
              margin: `${TT_S.px6}px 0 0 ${TT_S.px14}px`, padding: '8px 10px', background: t.surface3,
              color: t.ink3, fontFamily: TT_TYPE.mono, fontSize: TT_TYPE.xs, lineHeight: 1.55,
              borderRadius: TT_S.radiusSm, border: `1px solid ${t.line}`, whiteSpace: 'pre-wrap',
              overflow: 'auto', maxHeight: 320,
            }}>{debugDetailText(message.debug)}</pre>
          )}
        </React.Fragment>
      )}
    </div>
  );
}

function EmptyChat({ t }) {
  return (
    <p style={{ margin: 0, color: t.ink3, fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.sm, lineHeight: 1.6 }}>
      <span style={{ color: t.ink2, fontWeight: 500, fontSize: TT_TYPE.base }}>Load a table to begin.</span>
      <br />
      Open a local file, paste a URL, or pick a sample with{' '}
      <em style={{ color: t.ink2, fontStyle: 'normal' }}>Open URL or sample…</em> — then describe a change
      in plain English, e.g. “normalize phone numbers” or “drop duplicate emails”. Requests are additive;
      use Undo to revert.
    </p>
  );
}

const HELP_LINES = [
  'Double-click a cell to edit it',
  'Drag a column header to reorder',
  'Type :undo or :redo in the chat',
  'Type :save or :save-flow to export',
];

function ChatInputRow({ t, draft = '', focused = false, streaming = false, micStatus = 'idle',
  onDraft, onSend, onCancel, onMicStart, onMicStop, onMicCancel }) {
  const [focus, setFocus] = useState(focused);
  const hasDraft = draft.trim() !== '';
  const isFocused = focus || focused;
  const sendBtn = {
    height: 30, width: 30, flex: '0 0 auto', borderRadius: TT_S.radiusSm,
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  };
  return (
    <div style={{ flex: '0 0 auto', borderTop: `1px solid ${t.line}`, padding: TT_S.px10 }}>
      <div style={{
        background: t.surface, border: `1px solid ${isFocused ? t.accent : t.line2}`,
        boxShadow: isFocused ? `0 0 0 3px ${t.ring}` : 'none', borderRadius: TT_S.radius,
        padding: '8px 8px 6px 10px', display: 'flex', alignItems: 'flex-end', gap: TT_S.px8,
        transition: 'border-color .12s, box-shadow .12s',
      }}>
        <textarea value={draft} readOnly={!onDraft} rows={3} placeholder="Describe a transformation…"
          onChange={(e) => onDraft && onDraft(e.target.value)}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && onSend) { e.preventDefault(); onSend(); }
          }}
          style={{
            flex: 1, resize: 'none', border: 'none', outline: 'none', background: 'transparent',
            fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.base, lineHeight: 1.5, color: t.ink,
          }} />
        <MicButton t={t} status={micStatus} onStart={onMicStart} onStop={onMicStop} onCancel={onMicCancel} />
        {streaming ? (
          <button type="button" onClick={onCancel} title="Stop the running request"
            style={{ ...sendBtn, border: `1px solid ${t.err}`, background: 'transparent', color: t.err }}>
            <Icon name="stop" />
          </button>
        ) : (
          <button type="button" onClick={onSend} disabled={!hasDraft} title="Send (Enter)"
            style={{
              ...sendBtn, border: 'none', background: hasDraft ? t.accent : t.surface3,
              color: hasDraft ? t.inkOnAcc : t.ink3, cursor: hasDraft ? 'pointer' : 'default',
            }}>
            <Icon name="send" />
          </button>
        )}
      </div>
      <div style={{ marginTop: TT_S.px6, fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.micro, color: t.ink4, letterSpacing: 0.3 }}>
        ↵ to send · ⇧↵ for newline
      </div>
    </div>
  );
}

function ChatSidebar({
  t, width = 360, messages = [], streaming = false, requestCount = 0,
  draft = '', focused = false, micStatus = 'idle', openDetailId = null,
  onDraft, onSend, onCancel, onMicStart, onMicStop, onMicCancel, scrollRef,
}) {
  return (
    <aside style={{
      width, flex: '0 0 auto', display: 'flex', flexDirection: 'column',
      background: t.surface2, borderRight: `1px solid ${t.line}`,
    }}>
      {/* header */}
      <div style={{
        height: TT_S.headerH, flex: '0 0 auto', display: 'flex', alignItems: 'center',
        padding: `0 ${TT_S.px12}px`, borderBottom: `1px solid ${t.line}`,
        fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.xs, fontWeight: 600, letterSpacing: 0.6,
        textTransform: 'uppercase', color: t.ink3,
      }}>
        Requests
        <span style={{ flex: 1 }} />
        {requestCount > 0 && (
          <span style={{
            fontFamily: TT_TYPE.mono, fontSize: TT_TYPE.xs, fontWeight: 400,
            letterSpacing: 0, textTransform: 'none', color: t.ink3, whiteSpace: 'nowrap',
          }}>
            {requestCount} transformation{requestCount === 1 ? '' : 's'}{streaming && ' · running'}
          </span>
        )}
        <span style={{ marginLeft: TT_S.px6, fontWeight: 600, color: t.ink3, padding: '2px 4px' }}>?</span>
      </div>
      {/* messages */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto', padding: TT_S.px14,
        display: 'flex', flexDirection: 'column', gap: TT_S.px12,
      }}>
        {messages.length === 0 && <EmptyChat t={t} />}
        {messages.map((m) => m.role === 'user' ? (
          <UserBubble key={m.id} t={t}>{m.text}</UserBubble>
        ) : (
          <AssistantMessage key={m.id} t={t} message={m} defaultOpen={openDetailId === m.id} />
        ))}
        {streaming && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: TT_S.px8, color: t.ink2,
            fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.sm,
          }}>
            <span className="tt-pulse" style={{ width: 6, height: 6, borderRadius: 3, background: t.accent }} />
            Running…
          </div>
        )}
      </div>
      <ChatInputRow t={t} draft={draft} focused={focused} streaming={streaming} micStatus={micStatus}
        onDraft={onDraft} onSend={onSend} onCancel={onCancel}
        onMicStart={onMicStart} onMicStop={onMicStop} onMicCancel={onMicCancel} />
    </aside>
  );
}

// ── ModelChooser — provider accordion: masked key + primary/secondary matrix ──
const MODELS = [
  { id: 'gemini-3.5-flash', provider: 'gemini', voiceInput: true },
  { id: 'gemini-3.1-pro-preview', provider: 'gemini', voiceInput: true },
  { id: 'gpt-5.5', provider: 'openai', voiceInput: false },
  { id: 'gpt-5.4-mini', provider: 'openai', voiceInput: false },
  { id: 'claude-opus-4-8', provider: 'anthropic', voiceInput: false },
  { id: 'claude-sonnet-4-6', provider: 'anthropic', voiceInput: false },
  { id: 'claude-sonnet-4-5', provider: 'anthropic', voiceInput: false },
  { id: 'claude-haiku-4-5', provider: 'anthropic', voiceInput: false },
];
const PROVIDERS = [
  { id: 'gemini', name: 'Google', tagline: 'Gemini models', envHint: 'or set GEMINI_API_KEY in .env', keyPlaceholder: 'AIza…' },
  { id: 'openai', name: 'OpenAI', tagline: 'GPT models', envHint: 'or set OPENAI_API_KEY in .env', keyPlaceholder: 'sk-…' },
  { id: 'anthropic', name: 'Anthropic', tagline: 'Claude models', envHint: 'or set ANTHROPIC_API_KEY in .env', keyPlaceholder: 'sk-ant-…' },
];

function ModelChooser({
  t, provider = 'gemini', primaryModel = 'gemini-3.5-flash', secondaryModel = 'gemini-3.5-flash',
  keys = { gemini: '', openai: '', anthropic: '' }, expandedProvider = 'gemini', revealed: revealedProp,
  onProviderClick, onKeyChange, onSelectModel,
}) {
  const [revealed, setRevealed] = useState(revealedProp || { gemini: false, openai: false, anthropic: false });
  const radioKnob = (selected) => (
    <span aria-hidden="true" style={{
      flex: '0 0 auto', width: 14, height: 14, borderRadius: 7,
      border: `1.5px solid ${selected ? t.accent : t.line2}`,
      background: selected ? t.accent : 'transparent',
      boxShadow: selected ? `inset 0 0 0 2.5px ${t.surface}` : 'none',
    }} />
  );
  const ROLE_COL = 64;
  const roleHead = (label) => (
    <span style={{
      width: ROLE_COL, textAlign: 'center', fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.micro,
      fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase', color: t.ink3,
    }}>{label}</span>
  );
  const roleCell = (role, modelId, selected) => (
    <button type="button" aria-pressed={selected} title={`Use ${modelId} as the ${role} model`}
      onClick={() => onSelectModel && onSelectModel(role, modelId)}
      style={{ width: ROLE_COL, display: 'flex', justifyContent: 'center', background: 'transparent', border: 0, padding: 0, cursor: 'pointer' }}>
      {radioKnob(selected)}
    </button>
  );
  const voiceBadge = (hasVoice) => (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 12,
      fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.xs, fontWeight: 500,
      background: hasVoice ? t.okSoft : t.surface3, color: hasVoice ? t.ok : t.ink3, flexShrink: 0,
    }}>{hasVoice ? '🎙 Voice input' : 'No voice input'}</span>
  );
  const voiceTag = (voice) => voice ? (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 2, padding: '1px 6px', borderRadius: 10,
      fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.xs, background: t.okSoft, color: t.ok,
      flexShrink: 0, marginLeft: TT_S.px8,
    }}>🎙 voice</span>
  ) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: TT_S.px8 }}>
      <p style={{ margin: 0, fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.xs, lineHeight: 1.45, color: t.ink3 }}>
        <b style={{ color: t.ink }}>Primary</b> writes the spec patch each turn and handles voice input.{' '}
        <b style={{ color: t.ink }}>Secondary</b> fills per-row AI cells — pick a cheaper model there for
        bulk work. Both use the selected provider.
      </p>
      {PROVIDERS.map((meta) => {
        const isSelected = provider === meta.id;
        const isExpanded = expandedProvider === meta.id;
        const hasVoice = MODELS.some((m) => m.provider === meta.id && m.voiceInput);
        const providerModels = MODELS.filter((m) => m.provider === meta.id);
        return (
          <div key={meta.id} style={{
            border: `1px solid ${isExpanded ? t.accent : t.line}`, borderRadius: TT_S.radiusLg,
            overflow: 'hidden', background: t.surface,
          }}>
            <button type="button" onClick={() => onProviderClick && onProviderClick(meta.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: TT_S.px10,
                padding: '10px 12px', background: 'transparent', border: 0, cursor: 'pointer', textAlign: 'left',
              }}>
              {radioKnob(isSelected)}
              <span style={{ flex: 1 }}>
                <span style={{ fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.md, fontWeight: 600, color: t.ink, display: 'block' }}>{meta.name}</span>
                <span style={{ fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.xs, color: t.ink3 }}>{meta.tagline}</span>
              </span>
              {voiceBadge(hasVoice)}
            </button>
            {isExpanded && (
              <div style={{ padding: '8px 14px 12px', borderTop: `1px solid ${t.line}` }}>
                <div style={{ marginBottom: TT_S.px4 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: TT_S.px6,
                    border: `1px solid ${t.line2}`, borderRadius: TT_S.radius, padding: '6px 8px', background: t.surface2,
                  }}>
                    <input type={revealed[meta.id] ? 'text' : 'password'} value={keys[meta.id] || ''}
                      placeholder={meta.keyPlaceholder} readOnly={!onKeyChange}
                      onChange={(e) => onKeyChange && onKeyChange(meta.id, e.target.value)}
                      style={{
                        flex: 1, border: 'none', outline: 'none', background: 'transparent',
                        fontFamily: TT_TYPE.mono, fontSize: TT_TYPE.sm, color: t.ink,
                      }} />
                    <button type="button" title={revealed[meta.id] ? 'Hide key' : 'Show key'}
                      onClick={() => setRevealed((p) => ({ ...p, [meta.id]: !p[meta.id] }))}
                      style={{ background: 'transparent', border: 0, padding: 2, cursor: 'pointer', color: t.ink3, display: 'flex' }}>
                      <Icon name={revealed[meta.id] ? 'eyeOff' : 'eye'} />
                    </button>
                  </div>
                  <div style={{ fontFamily: TT_TYPE.mono, fontSize: TT_TYPE.xs, color: t.ink3, marginTop: TT_S.px4 }}>
                    {meta.envHint}
                  </div>
                </div>
                <div style={{ marginTop: TT_S.px8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: TT_S.px8, padding: '0 6px 4px' }}>
                    {roleHead('Primary')}
                    {roleHead('Secondary')}
                    <span style={{ flex: 1 }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {providerModels.map((m) => {
                      const isPrimary = m.id === primaryModel;
                      const isSecondary = m.id === secondaryModel;
                      return (
                        <div key={m.id} style={{
                          display: 'flex', alignItems: 'center', gap: TT_S.px8, padding: '7px 6px',
                          borderRadius: TT_S.radiusSm, background: isPrimary ? t.accentSoft : 'transparent',
                        }}>
                          {roleCell('primary', m.id, isPrimary)}
                          {roleCell('secondary', m.id, isSecondary)}
                          <span style={{ fontFamily: TT_TYPE.mono, fontSize: TT_TYPE.sm, color: t.ink, flex: 1 }}>{m.id}</span>
                          {voiceTag(m.voiceInput)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Sheet shell — right-hand overlay panel (Settings / Tutorial share it) ──
function Sheet({ t, inline = false, title, children, footer, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: inline ? 'absolute' : 'fixed', inset: 0, background: t.overlay,
      display: 'flex', justifyContent: 'flex-end', zIndex: 100,
    }}>
      <div className="tt-sheet" onClick={(e) => e.stopPropagation()} style={{
        width: 400, maxWidth: '92%', height: '100%', background: t.surface,
        borderLeft: `1px solid ${t.line2}`, boxShadow: t.shadowLg,
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          height: TT_S.topbarH, flex: '0 0 auto', display: 'flex', alignItems: 'center',
          padding: `0 ${TT_S.px14}px`, borderBottom: `1px solid ${t.line}`,
        }}>
          <span style={{ fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.md, fontWeight: 600, color: t.ink }}>{title}</span>
          <span style={{ flex: 1 }} />
          <button type="button" onClick={onClose} title="Close" style={{
            background: 'transparent', border: 0, padding: TT_S.px4, cursor: 'pointer', color: t.ink3, display: 'flex',
          }}><Icon name="x" /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: TT_S.px16 }}>{children}</div>
        {footer && (
          <div style={{
            flex: '0 0 auto', display: 'flex', justifyContent: 'flex-end', gap: TT_S.px8,
            padding: TT_S.px14, borderTop: `1px solid ${t.line}`,
          }}>{footer}</div>
        )}
      </div>
    </div>
  );
}

function SettingsSheet({ t, inline = false, onClose, ...chooserProps }) {
  return (
    <Sheet t={t} inline={inline} title="Settings" onClose={onClose}
      footer={<Button t={t} variant="chrome" onClick={onClose}>Close</Button>}>
      <ModelChooser t={t} {...chooserProps} />
    </Sheet>
  );
}

// ── TutorialSheet — scenario picker, or the active tour's step readout ────
const TUTORIAL_SCENARIOS = [
  'Filter and sort a customer table',
  'Normalize phone numbers to E.164',
  'Group and aggregate order totals',
  'Fill an AI column from existing data',
];

function TutorialSheet({
  t, inline = false, active = false, scenarios = TUTORIAL_SCENARIOS, selected = TUTORIAL_SCENARIOS[0],
  stepNum = 1, stepTotal = 5, stepText = 'Open the sample file customers.csv from the toolbar.',
  onClose, onSelect, onPlay, onNext, onPrev,
}) {
  const label = { fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.sm, fontWeight: 600, color: t.ink, marginBottom: TT_S.px4 };
  const kbd = {
    display: 'inline-block', padding: '1px 4px', borderRadius: 3,
    border: '1px solid currentColor', fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 1.4,
  };
  return (
    <Sheet t={t} inline={inline} title="Tutorial" onClose={onClose}>
      {!active ? (
        <div>
          <div style={label}>Pick a tutorial</div>
          <div role="listbox" style={{ display: 'flex', flexDirection: 'column', gap: TT_S.px4 }}>
            {scenarios.map((name) => {
              const sel = name === selected;
              return (
                <button key={name} type="button" role="option" aria-selected={sel}
                  onClick={() => onSelect && onSelect(name)}
                  style={{
                    textAlign: 'left', padding: '8px 10px',
                    border: `1px solid ${sel ? t.accent : t.line2}`, borderRadius: TT_S.radiusSm,
                    background: sel ? t.accentSoft : t.surface2, color: t.ink,
                    fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.base, fontWeight: sel ? 600 : 400, cursor: 'pointer',
                  }}>{name}</button>
              );
            })}
          </div>
          <div style={{ marginTop: TT_S.px12 }}>
            <Button t={t} variant="primary" onClick={onPlay}>Play</Button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: TT_S.px12 }}>
          <div style={{ fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.sm, color: t.ink3 }}>{selected}</div>
          <div style={{ fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.sm, fontWeight: 600, color: t.accent }}>
            Step {stepNum} of {stepTotal}
          </div>
          <div style={{
            fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.base, color: t.ink, lineHeight: 1.5,
            padding: `${TT_S.px8}px ${TT_S.px10}px`, background: t.surface2,
            borderRadius: TT_S.radiusSm, border: `1px solid ${t.line}`,
          }}>{stepText}</div>
          <div style={{
            fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.xs, color: t.ink4,
            display: 'flex', gap: TT_S.px8, flexWrap: 'wrap',
          }}>
            <span><kbd style={kbd}>←</kbd> prev</span>
            <span><kbd style={kbd}>→</kbd> / <kbd style={kbd}>Space</kbd> next</span>
            <span><kbd style={kbd}>Esc</kbd> cancel</span>
          </div>
          <div style={{ display: 'flex', gap: TT_S.px8 }}>
            <Button t={t} variant="chrome" onClick={onPrev} disabled={stepNum <= 1}>← Prev</Button>
            <Button t={t} variant="primary" onClick={onNext}>{stepNum >= stepTotal ? 'Finish' : 'Next →'}</Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

// ── Empty pane — main region before a table is loaded ─────────────────────
function EmptyPane({ t, over = false, onOpen }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: TT_S.px12, background: t.surface,
      outline: over ? `2px dashed ${t.accent}` : 'none', outlineOffset: -10,
    }}>
      <span style={{ color: t.ink4 }}><Icon name="upload" size={28} /></span>
      <div style={{ fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.md, fontWeight: 500, color: t.ink2 }}>
        Drop a CSV or JSONL file here
      </div>
      <div style={{ fontFamily: TT_TYPE.ui, fontSize: TT_TYPE.sm, color: t.ink3 }}>
        or load one from the toolbar
      </div>
      <div style={{ marginTop: TT_S.px4 }}>
        <Button t={t} variant="chrome" onClick={onOpen}>
          <Icon name="folder" />
          Open URL or sample…
        </Button>
      </div>
    </div>
  );
}

// ── Worked-example chat fixtures (shared by canvas states) ────────────────
const TURN1_DEBUG = {
  userRequest: 'normalize phone numbers to E.164',
  modelCalls: [{ model: 'gemini-3.5-flash', calls: 1 }],
  inputTokens: 2184, outputTokens: 312, elapsedMs: 3400,
  turns: [{ outcome: 'ok', ops: [{ op: 'normalize', column: 'Phone', format: 'E.164' }] }],
  cellSamples: [{
    column: 'Phone',
    samples: [
      { in: '(415) 555-0142', out: '+14155550142' },
      { in: '415.555.0188', out: '+14155550188' },
      { in: '+33 1 55 50 12 34', out: '+33155501234' },
    ],
  }],
};
const TURN2_DEBUG = {
  userRequest: 'keep rows with Score ≥ 8, add a Country column from each phone number',
  modelCalls: [{ model: 'gemini-3.5-flash', calls: 1 }, { model: 'gemini-3.5-flash', calls: 11 }],
  inputTokens: 4310, outputTokens: 925, elapsedMs: 6100,
  turns: [{
    outcome: 'ok',
    ops: [
      { op: 'filter', expr: 'Score >= 8' },
      { op: 'addColumn', name: 'Country', kind: 'llm', prompt: 'country of {Phone}' },
    ],
  }],
  cellSamples: [{
    column: 'Country',
    samples: [
      { in: '+14155550142', out: 'United States' },
      { in: '+33155501234', out: 'France' },
      { in: '+359 2 555 0121', out: 'Bulgaria' },
    ],
  }],
};

const CHAT_LOADED = [
  { id: 1, role: 'user', text: 'normalize phone numbers to E.164' },
  { id: 2, role: 'assistant', text: 'Normalized 20 phone numbers to E.164. One cell was empty and stayed null.', debug: TURN1_DEBUG },
];
const CHAT_RUNNING = [
  ...CHAT_LOADED,
  { id: 3, role: 'user', text: 'keep rows with Score ≥ 8, add a Country column from each phone number' },
];
const CHAT_DONE = [
  ...CHAT_RUNNING,
  { id: 4, role: 'assistant', text: 'Kept 11 of 20 rows (Score ≥ 8) and added Country — 11 cells filled by gemini-3.5-flash.', debug: TURN2_DEBUG },
];
const CHAT_ERROR = [
  { id: 1, role: 'user', text: 'load https://internal.example.com/q4.csv' },
  { id: 2, role: 'assistant', text: 'Error: Could not fetch the URL — the server did not allow cross-origin requests.' },
];

// E.164-normalized phone column + the filtered, AI-augmented table.
const PHONES_E164 = ['+14155550142', '+14155550188', '+14155550199', '+14155550133',
  '+525555500117', null, '+16285550151', '+33155501234', '+14155550124', '+14155550107',
  '+14155550176', '+4685550143', '+16285550129', '+16285550185', '+551155500110',
  '+14155550163', '+14155550172', '+390255550148', '+16285550136', '+359255550121'];

const ROWS_NORMALIZED = SAMPLE_ROWS.map((r, i) => {
  const c = r.slice();
  c[3] = PHONES_E164[i] == null ? '' : PHONES_E164[i];
  return c;
});
// Score ≥ 8 rows with the Country column appended (the running/finished state).
const ROWS_FILTERED_AI = ROWS_NORMALIZED
  .filter((r) => parseFloat(r[5]) >= 8)
  .map((r) => [...r, countryOf(r[3])]);
const COLS_WITH_COUNTRY = [...SAMPLE_COLS, 'Country'];

// ── AppScreen — the three-region shell composed for the canvas states ─────
// state: 'empty' | 'loaded' | 'running' | 'error' | 'saved'
function AppScreen({ theme = 'light', state = 'loaded', showSettings = false, showTutorial = false, showOpenDialog = false, w = 1180, h = 740 }) {
  const t = theme === 'dark' ? TT_DARK : TT_LIGHT;
  const loaded = state !== 'empty' && state !== 'error';
  const running = state === 'running';
  // Per-state table props.
  let tableProps = null;
  if (state === 'loaded' || state === 'saved') {
    tableProps = {
      cols: SAMPLE_COLS, rows: ROWS_NORMALIZED, colWidths: COL_WIDTHS,
      page: 1, pageCount: 1, totalRows: 20,
      selection: { row: 3, column: 'Phone' },
      status: state === 'saved' ? 'saved' : 'idle',
    };
  } else if (running) {
    const PENDING_FROM = 7; // AI cells below this row are still pending
    tableProps = {
      cols: COLS_WITH_COUNTRY, rows: ROWS_FILTERED_AI.map((r, i) => i >= PENDING_FROM ? [...r.slice(0, 6), null] : r),
      colWidths: [...COL_WIDTHS, 110],
      page: 1, pageCount: 1, totalRows: ROWS_FILTERED_AI.length,
      streaming: true, status: 'running',
      cellFlag: (row, col) => {
        if (col !== 6) return undefined;
        if (row >= PENDING_FROM) return 'pending';
        if (row === PENDING_FROM - 1) return 'flash';
        return 'flash2';
      },
    };
  }
  const messages = state === 'empty' ? [] : state === 'error' ? CHAT_ERROR
    : running ? CHAT_RUNNING : CHAT_DONE.slice(0, state === 'loaded' ? 2 : 4);
  const toasts = state === 'error'
    ? [{ id: 1, kind: 'error', message: 'Could not fetch https://internal.example.com/q4.csv — the server did not allow cross-origin requests.' }]
    : state === 'saved'
      ? [{ id: 1, kind: 'info', message: 'Saved customers.csv (20 rows × 6 cols).' }]
      : [];
  return (
    <div style={{
      width: w, height: h, display: 'flex', flexDirection: 'column',
      background: t.bg, color: t.ink, fontFamily: TT_TYPE.ui,
      position: 'relative', overflow: 'hidden',
    }}>
      <Toolbar t={t} loaded={loaded} busy={running}
        fileName={loaded ? 'customers.csv' : null}
        rowCount={running ? ROWS_FILTERED_AI.length : 20} colCount={running ? 7 : 6}
        canUndo={loaded} canRedo={false} />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <ChatSidebar t={t} messages={messages} streaming={running}
          requestCount={state === 'loaded' || state === 'saved' ? 1 : running ? 1 : 0}
          draft="" micStatus="idle" />
        {tableProps ? <TableView t={t} {...tableProps} /> : <EmptyPane t={t} />}
      </div>
      {showSettings && (
        <SettingsSheet t={t} inline expandedProvider="gemini" provider="gemini"
          primaryModel="gemini-3.5-flash" secondaryModel="gemini-3.5-flash"
          keys={{ gemini: 'AIzaSyD8eXampleKey', openai: '', anthropic: '' }} />
      )}
      {showTutorial && <TutorialSheet t={t} inline />}
      {showOpenDialog && <OpenUrlDialog t={t} inline url="" />}
      <Toasts t={t} toasts={toasts} />
    </div>
  );
}

Object.assign(window, {
  // data
  SAMPLE_COLS, SAMPLE_ROWS, COL_WIDTHS, COLS_WITH_COUNTRY, ROWS_NORMALIZED, ROWS_FILTERED_AI,
  PHONES_E164, SAMPLE_FILES, MODELS, PROVIDERS, TUTORIAL_SCENARIOS, HELP_LINES,
  CHAT_LOADED, CHAT_RUNNING, CHAT_DONE, CHAT_ERROR, TURN1_DEBUG, TURN2_DEBUG,
  countryOf, buildPageList, debugDetailText, sampleKind,
  // primitives (ui-kit mirror)
  Icon, ICON_NAMES, Button, SplitButton, Toasts, MicButton,
  // feature surfaces
  Pagination, TableView, Toolbar, OpenUrlDialog, ChatSidebar, ChatInputRow,
  UserBubble, AssistantMessage, EmptyChat, ModelChooser, Sheet, SettingsSheet,
  TutorialSheet, EmptyPane, AppScreen,
});
