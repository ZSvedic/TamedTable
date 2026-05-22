// TamedTable — shared UI primitives + the App composition.
// Renders the full two-pane working screen; takes a `state` prop
// ('empty' | 'loaded' | 'running' | 'error' | 'saving') and a `theme`
// ('light' | 'dark') so artboards can pull the variant they need.

const { useState, useMemo, useRef, useEffect } = React;

// ── Sample dataset ───────────────────────────────────────────────────────
// 20 rows × 6 cols. Deliberately "in-progress" data with formatting
// inconsistencies so a "normalize phone numbers" request is intuitive.
const SAMPLE_ROWS = [
  ['1024', 'Maren Whitfield',     'maren.whitfield@hey.com',        '(415) 555-0142',  '2025-11-14', '8.4'],
  ['1025', 'Anders Köhl',         'anders@kohl.studio',             '415.555.0188',    '2025-11-13', '9.1'],
  ['1026', 'Priya Raghavan',      'priya.r@northstar.io',           '+1 415 555 0199', '2025-11-13', '7.2'],
  ['1027', 'Theo Marchetti',      'theo@marchetti.co',              '4155550133',      '2025-11-12', null ],
  ['1028', 'June Park',           'june.park@plinth.app',           '(628) 555-0117',  '2025-11-12', '6.8'],
  ['1029', 'Devon Aliyev',        'devon@aliyev.dev',               null,              '2025-11-11', '8.0'],
  ['1030', 'Saoirse Donnelly',    'saoirse.d@craftworks.io',        '628-555-0151',    '2025-11-11', '7.5'],
  ['1031', 'Hugo Bertrand',       'hugo@bertrand.fr',               '+33 1 55 50 12 34','2025-11-10','9.3'],
  ['1032', 'Ines Vasquez',        'ines.v@parallax.studio',         '(415) 555-0124',  '2025-11-09', '5.4'],
  ['1033', 'Kazimir Volkov',      'kaz@volkov.systems',             '415 555 0107',    '2025-11-09', '8.7'],
  ['1034', 'Mira Ostrowski',      'm.ostrowski@figment.app',        '4155550118',      '2025-11-08', '7.0'],
  ['1035', 'Lior Avraham',        'lior@avraham.tools',             '(415) 555-0162',  '2025-11-07', '6.1'],
  ['1036', 'Cosima Renzi',        'cosima@renzi.dev',               '628.555.0144',    '2025-11-07', '8.2'],
  ['1037', 'Jules Okafor',        'jules.okafor@daybreak.io',       '(415) 555-0173',  '2025-11-06', null ],
  ['1038', 'Esa Lindqvist',       'esa@lindqvist.fi',               '+358 40 555 0111','2025-11-06', '9.0'],
  ['1039', 'Beatriz Salgado',     'beatriz.s@coriander.app',        '415-555-0136',    '2025-11-05', '7.8'],
  ['1040', 'Tomi Adesanya',       'tomi@adesanya.ng',               '(628) 555-0190',  '2025-11-04', '6.3'],
  ['1041', 'Hannah Voss',         'hannah@voss.studio',             '4155550182',      '2025-11-04', '8.9'],
  ['1042', 'Rin Tanaka',          'rin.tanaka@kintsugi.app',        '+81 3 5555 0119', '2025-11-03', '7.6'],
  ['1043', 'Mateusz Kowalski',    'mateusz@kowalski.pl',            '628 555 0129',    '2025-11-02', '8.1'],
];
const SAMPLE_COLS = ['ID', 'Name', 'Email', 'Phone', 'Signup', 'Score'];
const COL_WIDTHS  = [64, 178, 232, 162, 138, 110];

// Normalized phone column — used to show the "running" state's live update.
const NORMALIZED_PHONES = [
  '+14155550142','+14155550188','+14155550199','+14155550133','+16285550117',
  null,'+16285550151','+33155501234','+14155550124','+14155550107',
  '+14155550118','+14155550162','+16285550144','+14155550173','+358405550111',
  '+14155550136','+16285550190','+14155550182','+81355550119','+16285550129',
];

// ── Icons (tiny inline SVG, all 1.5 stroke) ──────────────────────────────
const Icon = ({ d, size = 14, fill = 'none' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill={fill} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto' }}>
    <path d={d} />
  </svg>
);
const I = {
  folder:  <Icon d="M2 4.5A1.5 1.5 0 0 1 3.5 3h2.6a1 1 0 0 1 .7.3l1 1H12.5A1.5 1.5 0 0 1 14 5.8v5.7A1.5 1.5 0 0 1 12.5 13h-9A1.5 1.5 0 0 1 2 11.5z" />,
  save:    <Icon d="M3 3h7l3 3v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z M5 3v3h5V3 M5 13v-4h6v4" />,
  undo:    <Icon d="M5 5 2.5 7.5 5 10 M2.5 7.5h7.5a3.5 3.5 0 1 1 0 7H7" />,
  redo:    <Icon d="m11 5 2.5 2.5L11 10 M13.5 7.5H6a3.5 3.5 0 1 0 0 7h3" />,
  cog:     <Icon d="M8 5.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z M8 2v1.5 M8 12.5V14 M2 8h1.5 M12.5 8H14 M3.5 3.5l1.1 1.1 M11.4 11.4l1.1 1.1 M3.5 12.5l1.1-1.1 M11.4 4.6l1.1-1.1" />,
  send:    <Icon d="m2.5 8 11-5-3 12-3-5-5-2Z" />,
  stop:    <Icon d="M5 5h6v6H5z" fill="currentColor" />,
  chev:    <Icon d="m4 6 4 4 4-4" />,
  chevR:   <Icon d="m6 4 4 4-4 4" />,
  chevL:   <Icon d="m10 4-4 4 4 4" />,
  x:       <Icon d="m4 4 8 8 M12 4l-8 8" />,
  err:     <Icon d="M8 2 14 13H2L8 2Z M8 7v3 M8 12v.01" />,
  ok:      <Icon d="m3 8 3.5 3.5L13 5" />,
  upload:  <Icon d="M8 10V3 M5 6l3-3 3 3 M2.5 11.5v1A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5v-1" />,
  grip:    <Icon d="M6 4v8 M10 4v8" />,
  eye:     <Icon d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />,
  drag:    <Icon d="M5 2.5h.01 M5 6h.01 M5 9.5h.01 M5 13h.01 M11 2.5h.01 M11 6h.01 M11 9.5h.01 M11 13h.01" />,
};

// ── Tiny styled button ──────────────────────────────────────────────────
function Btn({ t, children, kind = 'ghost', disabled, onClick, title, style }) {
  const base = {
    height: 26, padding: '0 9px', display: 'inline-flex', alignItems: 'center', gap: 6,
    border: '1px solid transparent', borderRadius: 5, background: 'transparent',
    color: t.ink2, font: `500 ${TT_TYPE.sm}px/1 ${TT_TYPE.ui}`, letterSpacing: 0.1,
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1, transition: 'background .12s, color .12s, border-color .12s',
  };
  const variants = {
    ghost:   { },
    chrome:  { color: t.ink, },
    // Primary = Ink (Aubergine) — accent is reserved for the mark + focus only.
    primary: { background: t.ink, color: t.inkOnInk, borderColor: t.ink, fontWeight: 600 },
    danger:  { color: t.err, borderColor: t.line },
  };
  return (
    <button onClick={onClick} title={title} disabled={disabled} style={{ ...base, ...variants[kind], ...style }}
      onMouseEnter={(e) => { if (!disabled && kind === 'ghost') e.currentTarget.style.background = t.surface3; if (!disabled && kind === 'chrome') e.currentTarget.style.background = t.surface3; }}
      onMouseLeave={(e) => { if (kind === 'ghost' || kind === 'chrome') e.currentTarget.style.background = 'transparent'; }}>
      {children}
    </button>
  );
}

// ── Top bar ─────────────────────────────────────────────────────────────
function TopBar({ t, state, onOpenSettings }) {
  const canUndo = state !== 'empty';
  const canRedo = state === 'loaded' || state === 'saving';
  const dark = t.name === 'dark';
  return (
    <div style={{
      height: TT_S.topbarH, flex: `0 0 ${TT_S.topbarH}px`, display: 'flex', alignItems: 'center',
      padding: '0 12px', borderBottom: `1px solid ${t.line}`, background: t.surface, gap: 10,
    }}>
      <Lockup size={TT_TYPE.md} color={t.ink} dark={dark} />
      {state !== 'empty' && (
        <span style={{
          font: `400 ${TT_TYPE.sm}px/1 ${TT_TYPE.mono}`, color: t.ink3,
          marginLeft: 6, paddingLeft: 10, borderLeft: `1px solid ${t.line}`,
        }}>
          signups_nov.csv <span style={{ color: t.ink4 }}>·</span> 20 rows × 6 cols
        </span>
      )}
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Btn t={t}>{I.folder} Open</Btn>
        <Btn t={t} disabled={state === 'empty'}>{I.save} Save</Btn>
        <span style={{ width: 1, height: 16, background: t.line, margin: '0 6px' }} />
        <Btn t={t} disabled={!canUndo} title="Undo (⌘Z)">{I.undo} <span style={{ font: `500 ${TT_TYPE.xs}px/1 ${TT_TYPE.ui}` }}>Undo</span></Btn>
        <Btn t={t} disabled={!canRedo} title="Redo (⌘⇧Z)">{I.redo} <span style={{ font: `500 ${TT_TYPE.xs}px/1 ${TT_TYPE.ui}` }}>Redo</span></Btn>
        <span style={{ width: 1, height: 16, background: t.line, margin: '0 6px' }} />
        <Btn t={t} onClick={onOpenSettings}>{I.cog} Settings</Btn>
      </div>
    </div>
  );
}

// ── Chat bits ───────────────────────────────────────────────────────────
function ChatBubbleUser({ t, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
      <div style={{
        maxWidth: '88%', background: t.accentSoft, color: t.ink, borderRadius: 8,
        padding: '6px 10px', font: `400 ${TT_TYPE.base}px/1.5 ${TT_TYPE.ui}`,
        border: `1px solid ${t.line}`,
      }}>{children}</div>
    </div>
  );
}

function ChatResult({ t, children, detail, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 8, color: t.ink2,
        font: `400 ${TT_TYPE.base}px/1.5 ${TT_TYPE.ui}`,
      }}>
        <span style={{
          flex: '0 0 auto', marginTop: 5, width: 6, height: 6, borderRadius: 3, background: t.ok,
        }} />
        <div style={{ flex: 1 }}>{children}</div>
      </div>
      <button onClick={() => setOpen((o) => !o)} style={{
        marginTop: 4, marginLeft: 14, background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
        color: t.ink3, font: `400 ${TT_TYPE.xs}px/1.4 ${TT_TYPE.ui}`,
        display: 'inline-flex', alignItems: 'center', gap: 4,
      }}>
        <span style={{ display: 'inline-flex', transition: 'transform .15s', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>{I.chev}</span>
        details
      </button>
      {open && (
        <pre style={{
          margin: '6px 0 0 14px', padding: '8px 10px', background: t.surface3,
          color: t.ink3, font: `400 ${TT_TYPE.xs}px/1.55 ${TT_TYPE.mono}`,
          borderRadius: 5, border: `1px solid ${t.line}`, whiteSpace: 'pre-wrap', overflow: 'hidden',
        }}>{detail}</pre>
      )}
    </div>
  );
}

function ChatProgress({ t }) {
  // Streaming sample changes — quiet, mono, slightly faded.
  const lines = [
    'row 1 · Phone · (415) 555-0142  →  +14155550142',
    'row 2 · Phone · 415.555.0188    →  +14155550188',
    'row 3 · Phone · +1 415 555 0199 →  +14155550199',
    'row 4 · Phone · 4155550133      →  +14155550133',
    'row 5 · Phone · (628) 555-0117  →  +16285550117',
  ];
  return (
    <div style={{
      marginBottom: 14, borderLeft: `2px solid ${t.accent}`, paddingLeft: 10,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        font: `500 ${TT_TYPE.sm}px/1.4 ${TT_TYPE.ui}`, color: t.ink, marginBottom: 6,
      }}>
        <span className="tt-pulse" style={{
          width: 6, height: 6, borderRadius: 3, background: t.accent,
        }} />
        Normalizing phone numbers…
        <span style={{ flex: 1 }} />
        <span style={{ font: `400 ${TT_TYPE.xs}px/1 ${TT_TYPE.mono}`, color: t.ink3 }}>14 / 20</span>
      </div>
      <div style={{ display: 'grid', gap: 2 }}>
        {lines.map((l, i) => (
          <div key={i} style={{
            font: `400 ${TT_TYPE.xs}px/1.5 ${TT_TYPE.mono}`,
            color: i === lines.length - 1 ? t.ink2 : t.ink3,
            opacity: 0.45 + (i / lines.length) * 0.55,
          }}>{l}</div>
        ))}
      </div>
    </div>
  );
}

function ChatInput({ t, running, disabled, placeholder, value }) {
  return (
    <div style={{
      borderTop: `1px solid ${t.line}`, padding: 10, background: t.surface2,
    }}>
      <div style={{
        background: t.surface, border: `1px solid ${t.line2}`, borderRadius: 7,
        padding: '8px 8px 6px 10px', display: 'flex', alignItems: 'flex-end', gap: 8,
        boxShadow: disabled ? 'none' : `0 0 0 0 transparent`,
        opacity: disabled ? 0.7 : 1,
      }}>
        <div style={{
          flex: 1, minHeight: 38, font: `400 ${TT_TYPE.base}px/1.5 ${TT_TYPE.ui}`,
          color: value ? t.ink : t.ink3, paddingTop: 2, whiteSpace: 'pre-wrap',
        }}>
          {value || placeholder || 'normalize phone numbers · drop duplicate emails · sort by date, newest first'}
        </div>
        {running ? (
          <button style={{
            height: 30, width: 30, borderRadius: 6, border: `1px solid ${t.err}`,
            background: 'transparent', color: t.err, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} title="Stop">{I.stop}</button>
        ) : (
          <button style={{
            height: 30, width: 30, borderRadius: 6, border: 'none',
            background: value ? t.accent : t.surface3,
            color: value ? t.inkOnAcc : t.ink3, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} title="Send (⌘↵)">{I.send}</button>
        )}
      </div>
      <div style={{
        marginTop: 5, display: 'flex', justifyContent: 'space-between',
        font: `400 ${TT_TYPE.micro}px/1 ${TT_TYPE.ui}`, color: t.ink4, letterSpacing: 0.3,
      }}>
        <span>⌘↵ to send · ⇧↵ for newline</span>
        <span style={{ font: `400 ${TT_TYPE.micro}px/1 ${TT_TYPE.mono}` }}>gpt-4o</span>
      </div>
    </div>
  );
}

function ChatSidebar({ t, state }) {
  return (
    <div style={{
      width: 360, flex: '0 0 360px', display: 'flex', flexDirection: 'column',
      background: t.surface2, borderRight: `1px solid ${t.line}`, position: 'relative',
    }}>
      {/* header */}
      <div style={{
        height: TT_S.headerH, padding: '0 12px', display: 'flex', alignItems: 'center',
        font: `600 ${TT_TYPE.xs}px/1 ${TT_TYPE.ui}`, color: t.ink3,
        letterSpacing: 0.6, textTransform: 'uppercase', borderBottom: `1px solid ${t.line}`,
      }}>
        Requests
        <span style={{ flex: 1 }} />
        {state !== 'empty' && (
          <span style={{ font: `400 ${TT_TYPE.xs}px/1 ${TT_TYPE.mono}`, color: t.ink3, textTransform: 'none', letterSpacing: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <a href="#history" title="View transformation history" style={{
              color: t.ink2, textDecoration: 'underline', textDecorationColor: t.line2,
              textUnderlineOffset: 2, textDecorationThickness: 1,
            }}>
              {state === 'running' ? '3 transformations' : '4 transformations'}
            </a>
            {state === 'running' && <><span style={{ color: t.ink4 }}>·</span><span>1 running</span></>}
            {state === 'error'   && <><span style={{ color: t.ink4 }}>·</span><span style={{ color: t.err }}>1 failed</span></>}
          </span>
        )}
      </div>

      {/* messages */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '14px 12px 6px' }}>
        {state === 'empty' && (
          <div style={{ color: t.ink3, font: `400 ${TT_TYPE.sm}px/1.6 ${TT_TYPE.ui}`, padding: '6px 4px' }}>
            <div style={{ color: t.ink2, marginBottom: 6, fontSize: TT_TYPE.base, fontWeight: 500 }}>Load a table to begin.</div>
            Drop a CSV onto the table area, or click <em style={{ color: t.ink2, fontStyle: 'normal' }}>Open</em>. Then describe the change you want — in plain English.
          </div>
        )}

        {state !== 'empty' && (<>
          <ChatBubbleUser t={t}>load signups_nov.csv</ChatBubbleUser>
          <ChatResult t={t}
            detail={`source: signups_nov.csv (20 rows · 6 columns · 4.1 KB)\nencoding: utf-8 · delimiter: ","\nelapsed: 38 ms`}>
            Loaded <strong style={{ color: t.ink, fontWeight: 600 }}>20 rows</strong> across 6 columns.
          </ChatResult>

          <ChatBubbleUser t={t}>drop duplicate emails, keep the most recent</ChatBubbleUser>
          <ChatResult t={t}
            detail={`grouped by Email; kept row with max(Signup); removed 2 rows\nelapsed: 0.41 s · tokens in 312 / out 88`}>
            Removed <strong style={{ color: t.ink, fontWeight: 600 }}>2 duplicate rows</strong> by email.
          </ChatResult>

          <ChatBubbleUser t={t}>sort by Score, descending; blanks last</ChatBubbleUser>
          <ChatResult t={t}
            detail={`ORDER BY Score DESC NULLS LAST\nelapsed: 0.12 s`}>
            Sorted by <strong style={{ color: t.ink, fontWeight: 600 }}>Score</strong>, descending.
          </ChatResult>

          {state === 'running' && (<>
            <ChatBubbleUser t={t}>normalize phone numbers to E.164</ChatBubbleUser>
            <ChatProgress t={t} />
          </>)}

          {(state === 'loaded' || state === 'saving' || state === 'error') && (<>
            <ChatBubbleUser t={t}>normalize phone numbers to E.164</ChatBubbleUser>
            <ChatResult t={t} defaultOpen={false}
              detail={`column: Phone\napplied: parsed national + country code → E.164\nchanged: 19 / 20  ·  skipped (blank): 1\nelapsed: 2.1 s · tokens in 1,204 / out 612`}>
              Normalized <strong style={{ color: t.ink, fontWeight: 600 }}>19 phone numbers</strong>; 1 blank skipped.
            </ChatResult>
          </>)}

          {state === 'error' && (<>
            <ChatBubbleUser t={t}>predict each user's lifetime value in dollars</ChatBubbleUser>
            <div style={{
              marginBottom: 14, color: t.err, font: `400 ${TT_TYPE.base}px/1.5 ${TT_TYPE.ui}`,
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <span style={{ flex: '0 0 auto', marginTop: 3, color: t.err }}>{I.err}</span>
              <span>Couldn't apply that change — try rephrasing.</span>
            </div>
          </>)}
        </>)}
      </div>

      <ChatInput t={t}
        running={state === 'running'}
        disabled={state === 'empty'}
        value={state === 'error' ? 'predict each user\'s lifetime value in dollars' : ''}
      />
    </div>
  );
}

// ── Pagination ──────────────────────────────────────────────────────────
// Compact, dense pager. Mono numerals, single accent for the active page,
// ghost hover on inactive items. Builds the "1 2 3 … N" window from
// (current, total) so the bar stays a fixed width regardless of N.
function buildPageList(current, total) {
  // Always show first + last; show ±1 around current; ellipsis fills gaps.
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out = new Set([1, total, current - 1, current, current + 1]);
  // Anchor a couple near the edges so jumping from page 1 → middle still feels reachable.
  if (current <= 4)            { out.add(2); out.add(3); out.add(4); out.add(5); }
  if (current >= total - 3)    { out.add(total - 1); out.add(total - 2); out.add(total - 3); out.add(total - 4); }
  const sorted = [...out].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const result = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('…');
    result.push(sorted[i]);
  }
  return result;
}

function Pagination({ t, current = 1, total = 230, onChange, compact = false }) {
  const pages = buildPageList(current, total);
  const atStart = current <= 1;
  const atEnd   = current >= total;

  const itemBase = {
    height: 26, minWidth: 26, padding: '0 8px', display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 6, border: '1px solid transparent', background: 'transparent',
    cursor: 'pointer', userSelect: 'none',
    fontVariantNumeric: 'tabular-nums',
    transition: 'background .12s, color .12s, border-color .12s',
  };

  const PageBtn = ({ children, active, disabled, ariaLabel, onClick, isEllipsis }) => {
    const isNav = typeof children !== 'number';
    const style = {
      ...itemBase,
      color: disabled ? t.ink4 : active ? t.ink : t.ink2,
      font: `${active ? 600 : 500} ${TT_TYPE.sm}px/1 ${typeof children === 'number' ? TT_TYPE.mono : TT_TYPE.ui}`,
      letterSpacing: isNav ? 0.1 : 0,
      cursor: disabled || isEllipsis ? 'default' : 'pointer',
      ...(active ? { borderColor: t.line2, background: t.surface, color: t.ink } : {}),
      ...(isEllipsis ? { cursor: 'default', color: t.ink3 } : {}),
    };
    return (
      <button
        aria-label={ariaLabel}
        aria-current={active ? 'page' : undefined}
        disabled={disabled || isEllipsis}
        onClick={onClick}
        style={style}
        onMouseEnter={(e) => { if (!disabled && !active && !isEllipsis) { e.currentTarget.style.background = t.surface3; }}}
        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
      >
        {children}
      </button>
    );
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 2,
      font: `500 ${TT_TYPE.sm}px/1 ${TT_TYPE.ui}`,
    }}>
      <PageBtn ariaLabel="Previous page" disabled={atStart} onClick={() => onChange?.(current - 1)}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {I.chevL}<span>Previous</span>
        </span>
      </PageBtn>
      <span style={{ width: 4 }} />
      {pages.map((p, i) =>
        p === '…' ? (
          <PageBtn key={`e${i}`} isEllipsis>…</PageBtn>
        ) : (
          <PageBtn
            key={p}
            active={p === current}
            ariaLabel={`Page ${p}`}
            onClick={() => onChange?.(p)}
          >{p}</PageBtn>
        )
      )}
      <span style={{ width: 4 }} />
      <PageBtn ariaLabel="Next page" disabled={atEnd} onClick={() => onChange?.(current + 1)}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span>Next</span>{I.chevR}
        </span>
      </PageBtn>
    </div>
  );
}

// ── Table ───────────────────────────────────────────────────────────────
function Table({ t, state }) {
  // Decide which row range to render so the "more rows" indicator looks real.
  const visible = SAMPLE_ROWS;

  const inRunning = state === 'running';
  const [page, setPage] = useState(1);
  const TOTAL_PAGES = 230;
  const PAGE_SIZE = 20;
  const totalRows = TOTAL_PAGES * PAGE_SIZE;
  const firstRow = (page - 1) * PAGE_SIZE + 1;
  const lastRow  = Math.min(page * PAGE_SIZE, totalRows);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: t.surface, position: 'relative', minWidth: 0 }}>
      {/* header row */}
      <div style={{
        display: 'flex', height: TT_S.headerH, background: t.surface2,
        borderBottom: `1px solid ${t.line2}`, position: 'sticky', top: 0, zIndex: 1,
      }}>
        {SAMPLE_COLS.map((c, i) => {
          const sorted = (i === 4 || (i === 5 && state !== 'running'));
          return (
          <div key={c} style={{
            width: COL_WIDTHS[i], flex: `0 0 ${COL_WIDTHS[i]}px`, position: 'relative',
            display: 'flex', alignItems: 'center', padding: '0 10px', gap: 6,
            font: `600 ${TT_TYPE.sm}px/1 ${TT_TYPE.ui}`, color: t.ink2,
            borderRight: `1px solid ${t.line}`,
            ...(i === 5 && state !== 'running' ? {
              background: t.surface3, color: t.ink,
            } : {}),
          }}>
            <span style={{ color: t.ink4, opacity: 0, transition: 'opacity .15s', flex: '0 0 auto' }} className="tt-headergrip">{I.grip}</span>
            <span>{c}</span>
            {sorted && (
              <span style={{
                marginLeft: 'auto', flex: '0 0 auto',
                font: `400 ${TT_TYPE.micro}px/1 ${TT_TYPE.mono}`, color: t.accent,
              }}>↓ desc</span>
            )}
            {/* resize handle */}
            <div style={{
              position: 'absolute', right: -3, top: 4, bottom: 4, width: 6, cursor: 'col-resize',
            }} />
          </div>
          );
        })}
        <div style={{ flex: 1, borderBottom: `1px solid ${t.line2}` }} />
      </div>

      {/* body */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {visible.map((row, ri) => {
          const isSelected = !inRunning && ri === 2;
          return (
            <div key={ri} style={{
              display: 'flex', height: TT_S.rowH,
              background: isSelected ? t.accentSoft : (ri % 2 ? t.surface : t.surface),
              borderBottom: `1px solid ${t.line}`,
            }}>
              {row.map((cell, ci) => {
                const isBlank = cell === null;
                const isPhoneCol = ci === 3;
                // running animation: cells get filled in waves
                const filledInRun = inRunning && isPhoneCol && ri < 14;
                const flashing    = inRunning && isPhoneCol && ri >= 10 && ri < 14;
                const display = filledInRun ? NORMALIZED_PHONES[ri] : (state !== 'empty' && isPhoneCol && state !== 'running' ? NORMALIZED_PHONES[ri] : cell);
                const isNumeric = ci === 0 || ci === 5 || ci === 3;
                const isEditing = !inRunning && ri === 2 && ci === 1;
                return (
                  <div key={ci} className={flashing ? 'tt-flash' : ''} style={{
                    ['--hi']: t.cellHi,
                    width: COL_WIDTHS[ci], flex: `0 0 ${COL_WIDTHS[ci]}px`,
                    padding: '0 10px', display: 'flex', alignItems: 'center',
                    borderRight: `1px solid ${t.line}`,
                    font: `400 ${isNumeric || ci === 2 ? TT_TYPE.sm : TT_TYPE.sm}px/1 ${isNumeric || ci === 2 ? TT_TYPE.mono : TT_TYPE.ui}`,
                    color: isBlank ? t.ink4 : t.ink,
                    justifyContent: ci === 0 || ci === 5 ? 'flex-end' : 'flex-start',
                    fontVariantNumeric: 'tabular-nums',
                    position: 'relative',
                    ...(isEditing ? {
                      background: t.surface, boxShadow: `inset 0 0 0 2px ${t.accent}`,
                      zIndex: 1,
                    } : {}),
                  }}>
                    {isEditing ? (
                      <>
                        <span>{display}</span>
                        <span className="tt-caret" style={{
                          width: 1.5, height: 14, background: t.accent, marginLeft: 1,
                        }} />
                      </>
                    ) : isBlank ? (
                      <span style={{ color: t.ink4 }}>—</span>
                    ) : (
                      <span style={{
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%',
                      }}>{display}</span>
                    )}
                  </div>
                );
              })}
              <div style={{ flex: 1, borderBottom: `1px solid transparent` }} />
            </div>
          );
        })}
      </div>

      {/* pagination bar */}
      <div style={{
        height: 40, flex: '0 0 40px', display: 'flex', alignItems: 'center', gap: 14,
        padding: '0 10px 0 14px', borderTop: `1px solid ${t.line}`, background: t.surface2,
      }}>
        <span style={{ font: `400 ${TT_TYPE.xs}px/1 ${TT_TYPE.mono}`, color: t.ink3 }}>
          <span style={{ color: t.ink2 }}>{firstRow.toLocaleString()}–{lastRow.toLocaleString()}</span> of {totalRows.toLocaleString()} rows
        </span>
        <span style={{ flex: 1 }} />
        <Pagination t={t} current={page} total={TOTAL_PAGES} onChange={setPage} />
      </div>

      {/* status footer */}
      <div style={{
        height: 24, flex: '0 0 24px', display: 'flex', alignItems: 'center', gap: 14,
        padding: '0 14px', borderTop: `1px solid ${t.line}`, background: t.surface2,
        font: `400 ${TT_TYPE.xs}px/1 ${TT_TYPE.mono}`, color: t.ink3,
      }}>
        <span>R3 · Email</span>
        <span style={{ color: t.ink4 }}>·</span>
        <span>UTF-8</span>
        <span style={{ flex: 1 }} />
        {state === 'running' && <span style={{ color: t.accent }}>● running · 14 / 20</span>}
        {state === 'saving'  && <span style={{ color: t.ok }}>● saved 2s ago</span>}
        {state === 'loaded'  && <span>idle · last change 12s ago</span>}
        {state === 'error'   && <span>idle · last change 28s ago</span>}
      </div>
    </div>
  );
}

// ── Empty state ─────────────────────────────────────────────────────────
function EmptyPane({ t }) {
  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: t.surface, position: 'relative', minWidth: 0,
    }}>
      <div style={{
        width: 460, padding: 28, borderRadius: 10,
        border: `1.5px dashed ${t.line2}`, background: t.surface2,
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 8, background: t.accentSoft,
          color: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 14V3 M7 7l4-4 4 4 M4 16v1.5A1.5 1.5 0 0 0 5.5 19h11a1.5 1.5 0 0 0 1.5-1.5V16" />
          </svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ font: `600 ${TT_TYPE.lg}px/1.3 ${TT_TYPE.ui}`, color: t.ink, letterSpacing: -0.2 }}>
            Drop a CSV here to begin
          </div>
          <div style={{ font: `400 ${TT_TYPE.sm}px/1.5 ${TT_TYPE.ui}`, color: t.ink2 }}>
            or pick a file from disk. TSV and XLSX also work.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
          <Btn t={t} kind="primary">{I.folder} Open file…</Btn>
          <Btn t={t} kind="chrome" style={{ borderColor: t.line }}>Paste from clipboard</Btn>
        </div>
        <div style={{
          marginTop: 6, font: `400 ${TT_TYPE.xs}px/1.5 ${TT_TYPE.mono}`, color: t.ink3,
        }}>
          Tip: once loaded, ask things like<br/>
          <span style={{ color: t.ink2 }}>"drop duplicate emails"</span>,
          <span style={{ color: t.ink2 }}> "sort by date, newest first"</span>,
          <span style={{ color: t.ink2 }}> "normalize phone numbers"</span>
        </div>
      </div>
    </div>
  );
}

// ── Toast ───────────────────────────────────────────────────────────────
function Toast({ t, kind, children }) {
  const isErr = kind === 'error';
  return (
    <div style={{
      position: 'absolute', right: 16, bottom: 18, zIndex: 20,
      minWidth: 280, maxWidth: 380,
      background: t.surface, color: t.ink,
      border: `1px solid ${isErr ? t.err : t.line2}`,
      borderLeft: `3px solid ${isErr ? t.err : t.ok}`,
      borderRadius: 8, padding: '10px 12px',
      display: 'flex', alignItems: 'flex-start', gap: 10,
      boxShadow: t.shadowLg,
      font: `400 ${TT_TYPE.sm}px/1.5 ${TT_TYPE.ui}`,
    }}>
      <span style={{ color: isErr ? t.err : t.ok, marginTop: 1 }}>{isErr ? I.err : I.ok}</span>
      <div style={{ flex: 1 }}>{children}</div>
      <button style={{
        background: 'transparent', border: 0, padding: 2, color: t.ink3, cursor: 'pointer',
        display: 'flex', alignItems: 'center',
      }}>{I.x}</button>
    </div>
  );
}

// ── Settings panel ──────────────────────────────────────────────────────
function SettingsSheet({ t }) {
  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0, width: 380, zIndex: 30,
      background: t.surface, borderLeft: `1px solid ${t.line2}`,
      boxShadow: t.shadowLg, display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        height: 40, padding: '0 14px', display: 'flex', alignItems: 'center',
        borderBottom: `1px solid ${t.line}`,
      }}>
        <span style={{ font: `600 ${TT_TYPE.md}px/1 ${TT_TYPE.ui}`, color: t.ink }}>Settings</span>
        <span style={{ flex: 1 }} />
        <button style={{ background: 'transparent', border: 0, color: t.ink3, cursor: 'pointer', padding: 4 }}>{I.x}</button>
      </div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <div style={{ font: `600 ${TT_TYPE.sm}px/1.4 ${TT_TYPE.ui}`, color: t.ink, marginBottom: 4 }}>API key</div>
          <div style={{ font: `400 ${TT_TYPE.xs}px/1.55 ${TT_TYPE.ui}`, color: t.ink3, marginBottom: 8 }}>
            Required to make requests. Stored in this browser tab only.
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            border: `1px solid ${t.line2}`, borderRadius: 6, padding: '6px 8px',
            background: t.surface2,
          }}>
            <span style={{ font: `400 ${TT_TYPE.sm}px/1 ${TT_TYPE.mono}`, color: t.ink, flex: 1 }}>
              sk-•••••••••••••••••••••••••••••a7c2
            </span>
            <button style={{ background: 'transparent', border: 0, color: t.ink3, cursor: 'pointer', padding: 2 }} title="Show">{I.eye}</button>
          </div>
        </div>

        <div>
          <div style={{ font: `600 ${TT_TYPE.sm}px/1.4 ${TT_TYPE.ui}`, color: t.ink, marginBottom: 6 }}>Model</div>
          {[
            ['gpt-4o',         'Default. Strong reasoning, ~2s / 20 rows.'],
            ['gpt-4o-mini',    'Faster, cheaper. Best for simple sorts and filters.'],
            ['claude-sonnet',  'Long context. Best for big tables.'],
          ].map(([name, sub], i) => (
            <label key={name} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 8px',
              borderRadius: 5, cursor: 'pointer',
              background: i === 0 ? t.accentSoft : 'transparent',
            }}>
              <span style={{
                width: 14, height: 14, borderRadius: 8, marginTop: 2,
                border: `1.5px solid ${i === 0 ? t.accent : t.line2}`,
                background: i === 0 ? t.accent : 'transparent',
                boxShadow: i === 0 ? `inset 0 0 0 2.5px ${t.surface}` : 'none',
                flex: '0 0 auto',
              }} />
              <div>
                <div style={{ font: `500 ${TT_TYPE.sm}px/1.3 ${TT_TYPE.mono}`, color: t.ink }}>{name}</div>
                <div style={{ font: `400 ${TT_TYPE.xs}px/1.4 ${TT_TYPE.ui}`, color: t.ink3, marginTop: 1 }}>{sub}</div>
              </div>
            </label>
          ))}
        </div>

        <div>
          <div style={{ font: `600 ${TT_TYPE.sm}px/1.4 ${TT_TYPE.ui}`, color: t.ink, marginBottom: 8 }}>Behaviour</div>
          {[
            ['Stream changes into the table', true],
            ['Confirm before destructive changes', true],
            ['Show technical details by default', false],
          ].map(([label, on]) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', padding: '6px 0',
              font: `400 ${TT_TYPE.sm}px/1.4 ${TT_TYPE.ui}`, color: t.ink2,
            }}>
              <span style={{ flex: 1 }}>{label}</span>
              <span style={{
                width: 26, height: 14, borderRadius: 8, padding: 1,
                background: on ? t.accent : t.line2, transition: 'background .15s',
                display: 'flex', alignItems: 'center', justifyContent: on ? 'flex-end' : 'flex-start',
              }}>
                <span style={{ width: 12, height: 12, borderRadius: 6, background: t.surface }} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Composition: full screen ────────────────────────────────────────────
function AppScreen({ theme = 'light', state = 'loaded', showSettings = false, w = 1180, h = 740 }) {
  const t = theme === 'dark' ? TT_DARK : TT_LIGHT;
  return (
    <div style={{
      width: w, height: h, display: 'flex', flexDirection: 'column',
      background: t.bg, color: t.ink, position: 'relative', overflow: 'hidden',
      fontFamily: TT_TYPE.ui,
    }}>
      <TopBar t={t} state={state} />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <ChatSidebar t={t} state={state} />
        {/* drag handle */}
        <div style={{ width: 1, background: t.line, position: 'relative' }}>
          <div style={{
            position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: -3, width: 6, height: 32,
          }} />
        </div>
        {state === 'empty' ? <EmptyPane t={t} /> : <Table t={t} state={state} />}
        {showSettings && <SettingsSheet t={t} />}
      </div>

      {state === 'error'  && <Toast t={t} kind="error">Couldn't apply that change — try rephrasing it.</Toast>}
      {state === 'saving' && <Toast t={t} kind="ok">Saved to <span style={{ fontFamily: TT_TYPE.mono }}>signups_nov.csv</span></Toast>}
    </div>
  );
}

Object.assign(window, { AppScreen, TopBar, ChatSidebar, Table, EmptyPane, Toast, SettingsSheet, Btn, I, ChatBubbleUser, ChatResult, ChatProgress, ChatInput, Pagination });
