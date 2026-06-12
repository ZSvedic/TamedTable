// TamedTable — design canvas composition.
// The current product inventory: main-screen states × 2 themes, the ui-kit
// primitives (Button, SplitButton, Icon, Toasts, ThemeProvider's toggle),
// the feature surfaces (Toolbar, TableView, ChatSidebar + MicButton,
// SettingsPanel/ModelChooser, TutorialPanel), brand renders, and the tokens.
// Everything reads TT_* tokens from tokens.jsx — nothing is hardcoded.

const { useState: useStateCanvas } = React;

const SCREEN_W = 1180;
const SCREEN_H = 740;

// ── Token boards ──────────────────────────────────────────────────────────
function Swatch({ name, value, t }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
      <div style={{
        width: 26, height: 26, borderRadius: TT_S.radius, background: value,
        border: `1px solid ${t.line}`, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.02)', flex: '0 0 auto',
      }}></div>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ font: `500 12px/1.3 ${TT_TYPE.mono}`, color: t.ink }}>{name}</div>
        <div style={{
          font: `400 10.5px/1.3 ${TT_TYPE.mono}`, color: t.ink3,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 170,
        }}>{value}</div>
      </div>
    </div>
  );
}

function TokenBoard({ theme }) {
  const t = theme === 'dark' ? TT_DARK : TT_LIGHT;
  const groups = [
    ['Surfaces', ['bg', 'surface', 'surface2', 'surface3', 'overlay']],
    ['Ink', ['ink', 'ink2', 'ink3', 'ink4', 'inkOnAcc', 'inkOnInk']],
    ['Lines & accent', ['line', 'line2', 'ring', 'accent', 'accentHover', 'accentSoft']],
    ['Semantics', ['ok', 'okSoft', 'err', 'errSoft', 'rec', 'onRec']],
    ['Highlights', ['cellHi', 'cellHi2']],
  ];
  return (
    <div style={{
      width: 980, padding: 22, background: t.bg, color: t.ink, fontFamily: TT_TYPE.ui,
      display: 'flex', flexDirection: 'column', gap: 14, border: `1px solid ${t.line}`, boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <div style={{ font: `600 18px/1 ${TT_TYPE.ui}`, color: t.ink, letterSpacing: -0.2 }}>
          {theme === 'dark' ? 'Dark' : 'Light'} tokens
        </div>
        <div style={{ font: `400 12px/1 ${TT_TYPE.mono}`, color: t.ink3 }}>
          generated from tokens.json — incl. rec/onRec (voice mic)
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
        {groups.map(([title, names]) => (
          <div key={title}>
            <div style={{
              font: `500 11px/1 ${TT_TYPE.ui}`, color: t.ink3, textTransform: 'uppercase',
              letterSpacing: 0.8, marginBottom: 6,
            }}>{title}</div>
            {names.map((n) => <Swatch key={n} name={n} value={t[n]} t={t} />)}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, paddingTop: 6, borderTop: `1px solid ${t.line}` }}>
        <div>
          <div style={{ font: `500 11px/1 ${TT_TYPE.ui}`, color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Type scale</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[['xl', TT_TYPE.xl, 600], ['lg', TT_TYPE.lg, 600], ['md', TT_TYPE.md, 500], ['base', TT_TYPE.base, 400], ['sm', TT_TYPE.sm, 400], ['xs', TT_TYPE.xs, 400], ['micro', TT_TYPE.micro, 400]].map(([label, size, w]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ font: `400 10px/1 ${TT_TYPE.mono}`, color: t.ink3, width: 64 }}>{label} {size}</span>
                <span style={{ font: `${w} ${size}px/1 ${TT_TYPE.ui}`, color: t.ink }}>The quiet table</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <span style={{ font: `400 10px/1 ${TT_TYPE.mono}`, color: t.ink3, width: 64 }}>mono {TT_TYPE.sm}</span>
              <span style={{ font: `400 ${TT_TYPE.sm}px/1 ${TT_TYPE.mono}`, color: t.ink, fontVariantNumeric: 'tabular-nums' }}>+14155550142</span>
            </div>
          </div>
        </div>
        <div>
          <div style={{ font: `500 11px/1 ${TT_TYPE.ui}`, color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Spacing</div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 36 }}>
            {[TT_S.px2, TT_S.px4, TT_S.px6, TT_S.px8, TT_S.px10, TT_S.px12, TT_S.px16, TT_S.px24, TT_S.px32].map((px) => (
              <div key={px} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ width: '100%', height: px, background: t.accent, borderRadius: 1, marginBottom: 2 }}></div>
                <span style={{ font: `400 9.5px/1 ${TT_TYPE.mono}`, color: t.ink3 }}>{px}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, font: `400 10.5px/1.6 ${TT_TYPE.mono}`, color: t.ink3 }}>
            rowH {TT_S.rowH} · headerH {TT_S.headerH} · topbarH {TT_S.topbarH}
          </div>
        </div>
        <div>
          <div style={{ font: `500 11px/1 ${TT_TYPE.ui}`, color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Radii & shadows</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {[['radiusSm', TT_S.radiusSm], ['radius', TT_S.radius], ['radiusLg', TT_S.radiusLg]].map(([n, r]) => (
              <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 28, height: 28, borderRadius: r, background: t.accentSoft, border: `1px solid ${t.line2}` }}></div>
                <span style={{ font: `400 9.5px/1 ${TT_TYPE.mono}`, color: t.ink3 }}>{r}</span>
              </div>
            ))}
            <div style={{ width: 56, height: 28, borderRadius: TT_S.radius, background: t.surface, boxShadow: t.shadow, marginLeft: 8 }}></div>
            <div style={{ width: 56, height: 28, borderRadius: TT_S.radius, background: t.surface, boxShadow: t.shadowLg }}></div>
          </div>
          <div style={{ marginTop: 8, font: `400 10.5px/1.6 ${TT_TYPE.mono}`, color: t.ink3 }}>shadow · shadowLg</div>
        </div>
      </div>
    </div>
  );
}

// ── Small framed stage for component artboards ───────────────────────────
function Stage({ theme = 'light', width, height, padding = 16, center = false, children }) {
  const t = theme === 'dark' ? TT_DARK : TT_LIGHT;
  return (
    <div style={{
      width, height, boxSizing: 'border-box', background: t.bg, color: t.ink,
      fontFamily: TT_TYPE.ui, padding, overflow: 'hidden', position: 'relative',
      display: 'flex', flexDirection: 'column', gap: 12,
      alignItems: center ? 'center' : 'stretch', justifyContent: center ? 'center' : 'flex-start',
    }}>{children}</div>
  );
}

function StageLabel({ t, children }) {
  return (
    <div style={{
      font: `500 10.5px/1 ${TT_TYPE.mono}`, color: t.ink3,
      textTransform: 'uppercase', letterSpacing: 0.6,
    }}>{children}</div>
  );
}

// ── Brand board ───────────────────────────────────────────────────────────
function BrandBoard() {
  const t = TT_LIGHT;
  return (
    <div style={{
      width: 760, padding: 24, background: TT_BRAND.ground, fontFamily: TT_TYPE.ui,
      display: 'flex', flexDirection: 'column', gap: 20, boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <StageLabel t={t}>grid · &gt;80px</StageLabel>
          <Mark height={120} mode="grid" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <StageLabel t={t}>crisp · ≤80px</StageLabel>
          <Mark height={56} mode="crisp" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <StageLabel t={t}>reverse · on ink</StageLabel>
          <div style={{ background: TT_BRAND.ink, padding: 14, borderRadius: TT_S.radius }}>
            <Mark height={56} mode="reverse" />
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 32, alignItems: 'center', paddingTop: 16, borderTop: `1px solid ${TT_BRAND.line}` }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <StageLabel t={t}>lockup A · single row</StageLabel>
          <Lockup size={26} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <StageLabel t={t}>lockup B · two row</StageLabel>
          <Lockup size={22} twoRow />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <StageLabel t={t}>toolbar scale · 14px</StageLabel>
          <Lockup size={TT_TYPE.md} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <StageLabel t={t}>reverse lockup</StageLabel>
          <div style={{ background: TT_BRAND.ink, padding: '10px 14px', borderRadius: TT_S.radius }}>
            <Lockup size={18} dark color={TT_LIGHT.inkOnInk} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ui-kit boards ─────────────────────────────────────────────────────────
function ButtonsBoard({ theme }) {
  const t = theme === 'dark' ? TT_DARK : TT_LIGHT;
  const row = { display: 'flex', alignItems: 'center', gap: 10 };
  return (
    <Stage theme={theme} width={560} height={300}>
      <StageLabel t={t}>Button — ghost · chrome · primary · danger</StageLabel>
      <div style={row}>
        <Button t={t}>Ghost</Button>
        <Button t={t} variant="chrome">Chrome</Button>
        <Button t={t} variant="primary">Primary</Button>
        <Button t={t} variant="danger">Danger</Button>
      </div>
      <StageLabel t={t}>hover</StageLabel>
      <div style={row}>
        <Button t={t} forceHover>Ghost</Button>
        <Button t={t} variant="chrome" forceHover>Chrome</Button>
        <Button t={t} variant="primary" forceHover>Primary</Button>
        <Button t={t} variant="danger" forceHover>Danger</Button>
      </div>
      <StageLabel t={t}>disabled · with icon</StageLabel>
      <div style={row}>
        <Button t={t} disabled>Ghost</Button>
        <Button t={t} variant="primary" disabled>Primary</Button>
        <Button t={t}><Icon name="save" />Save data</Button>
        <Button t={t} variant="chrome"><Icon name="folder" />Open URL…</Button>
      </div>
      <StageLabel t={t}>SplitButton — closed · open</StageLabel>
      <div style={{ ...row, alignItems: 'flex-start' }}>
        <SplitButton t={t} menu={[{ label: 'Open local…' }]} title="Open a CSV or JSONL file from a URL">
          <Icon name="folder" />Open URL…
        </SplitButton>
        <SplitButton t={t} defaultOpen menu={[{ label: 'Open local…' }, { label: 'Reload current', disabled: true }]}>
          <Icon name="folder" />Open URL…
        </SplitButton>
      </div>
    </Stage>
  );
}

function IconBoard({ theme }) {
  const t = theme === 'dark' ? TT_DARK : TT_LIGHT;
  return (
    <Stage theme={theme} width={560} height={220}>
      <StageLabel t={t}>Icon — 16×16 viewBox · 1.5 stroke · currentColor</StageLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 10 }}>
        {ICON_NAMES.map((name) => (
          <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            <span style={{ color: t.ink2, height: 18, display: 'flex', alignItems: 'center' }}><Icon name={name} size={16} /></span>
            <span style={{ font: `400 9.5px/1 ${TT_TYPE.mono}`, color: t.ink3 }}>{name}</span>
          </div>
        ))}
      </div>
      <StageLabel t={t}>in context — ink2 · ink3 · accent · err · ok</StageLabel>
      <div style={{ display: 'flex', gap: 14 }}>
        <span style={{ color: t.ink2 }}><Icon name="cog" size={16} /></span>
        <span style={{ color: t.ink3 }}><Icon name="chevron" size={16} /></span>
        <span style={{ color: t.accent }}><Icon name="send" size={16} /></span>
        <span style={{ color: t.err }}><Icon name="err" size={16} /></span>
        <span style={{ color: t.ok }}><Icon name="ok" size={16} /></span>
      </div>
    </Stage>
  );
}

function ToastBoard({ theme }) {
  const t = theme === 'dark' ? TT_DARK : TT_LIGHT;
  return (
    <Stage theme={theme} width={460} height={190}>
      <StageLabel t={t}>Toasts — bottom-right stack · info | error · dismissible</StageLabel>
      <div style={{ position: 'relative', flex: 1 }}>
        <Toasts t={t} toasts={[
          { id: 1, kind: 'info', message: 'Saved customers.csv (20 rows × 6 cols).' },
          { id: 2, kind: 'error', message: 'Could not fetch the URL — the server did not allow cross-origin requests.' },
        ]} />
      </div>
    </Stage>
  );
}

function MicBoard({ theme }) {
  const t = theme === 'dark' ? TT_DARK : TT_LIGHT;
  const cell = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 };
  return (
    <Stage theme={theme} width={460} height={170}>
      <StageLabel t={t}>MicButton — press-and-hold · idle → recording → sending</StageLabel>
      <div style={{ display: 'flex', gap: 36, padding: '12px 4px' }}>
        <div style={cell}>
          <MicButton t={t} status="idle" />
          <span style={{ font: `400 10.5px/1 ${TT_TYPE.mono}`, color: t.ink3 }}>idle</span>
        </div>
        <div style={cell}>
          <MicButton t={t} status="recording" />
          <span style={{ font: `400 10.5px/1 ${TT_TYPE.mono}`, color: t.rec }}>recording · rec fill + pulsing ring</span>
        </div>
        <div style={cell}>
          <MicButton t={t} status="sending" />
          <span style={{ font: `400 10.5px/1 ${TT_TYPE.mono}`, color: t.ink3 }}>sending · spinner</span>
        </div>
      </div>
      <div style={{ font: `400 ${TT_TYPE.xs}px/1.5 ${TT_TYPE.ui}`, color: t.ink4 }}>
        Hold to record · release to send · Esc or pointer-cancel cancels.
      </div>
    </Stage>
  );
}

// ── Table boards ──────────────────────────────────────────────────────────
function CellsBoard({ theme }) {
  const t = theme === 'dark' ? TT_DARK : TT_LIGHT;
  const cell = (extra, child) => (
    <div style={{
      width: 132, height: TT_S.rowH, padding: `0 ${TT_S.px10}px`, boxSizing: 'border-box',
      display: 'flex', alignItems: 'center', border: `1px solid ${t.line}`, background: t.surface,
      font: `400 ${TT_TYPE.sm}px/1 ${TT_TYPE.mono}`, color: t.ink, fontVariantNumeric: 'tabular-nums',
      whiteSpace: 'nowrap', overflow: 'hidden', ...extra,
    }}>{child}</div>
  );
  const lab = (s) => <span style={{ font: `400 10px/1 ${TT_TYPE.mono}`, color: t.ink3, width: 104, flex: '0 0 auto' }}>{s}</span>;
  const row = { display: 'flex', alignItems: 'center', gap: 12 };
  return (
    <Stage theme={theme} width={560} height={330}>
      <StageLabel t={t}>cell states — selection · edit · flash · pending</StageLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={row}>{lab('default')}{cell({}, '+14155550142')}</div>
        <div style={row}>{lab('selected')}{cell({ background: t.accentSoft }, '+14155550142')}</div>
        <div style={row}>{lab('editing')}{cell({ boxShadow: `inset 0 0 0 2px ${t.accent}` }, '+1415555014')}</div>
        <div style={row}>{lab('flash · cellHi')}{cell({ background: t.cellHi }, 'United States')}</div>
        <div style={row}>{lab('settled · cellHi2')}{cell({ background: t.cellHi2 }, 'United States')}</div>
        <div style={row}>{lab('pending AI')}{cell({}, <span className="tt-pulse" style={{ color: t.ink4 }}>…</span>)}</div>
        <div style={row}>{lab('null')}{cell({}, <span style={{ color: t.ink4 }}>null</span>)}</div>
      </div>
      <StageLabel t={t}>header — rest · hover (grip) · dragging</StageLabel>
      <div style={{ display: 'flex', gap: 12 }}>
        {[['rest', t.surface2, false], ['hover', t.surface3, true], ['dragging', t.accentSoft, true]].map(([k, bg, grip]) => (
          <div key={k} style={{
            width: 132, height: TT_S.headerH, padding: `0 ${TT_S.px10}px`, boxSizing: 'border-box',
            display: 'flex', alignItems: 'center', gap: TT_S.px6, background: bg,
            border: `1px solid ${t.line2}`, font: `600 ${TT_TYPE.sm}px/1 ${TT_TYPE.ui}`, color: t.ink2,
          }}>
            {grip && <span style={{ color: t.ink4 }}><Icon name="grip" size={12} /></span>}
            Phone
          </div>
        ))}
      </div>
    </Stage>
  );
}

function PaginationBoard({ theme }) {
  const t = theme === 'dark' ? TT_DARK : TT_LIGHT;
  return (
    <Stage theme={theme} width={460} height={190}>
      <StageLabel t={t}>Pagination — windowed 1 2 3 … N</StageLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Pagination t={t} page={1} pageCount={3} />
        <Pagination t={t} page={5} pageCount={23} />
        <Pagination t={t} page={23} pageCount={23} />
      </div>
    </Stage>
  );
}

function TableBoard({ theme }) {
  const t = theme === 'dark' ? TT_DARK : TT_LIGHT;
  return (
    <div style={{ width: 860, height: 420, display: 'flex', fontFamily: TT_TYPE.ui, background: t.bg }}>
      <TableView t={t} cols={COLS_WITH_COUNTRY} colWidths={[...COL_WIDTHS, 110]}
        rows={ROWS_FILTERED_AI.map((r, i) => (i >= 8 ? [...r.slice(0, 6), null] : r))}
        page={1} pageCount={1} totalRows={ROWS_FILTERED_AI.length}
        selection={{ row: 2, column: 'Email' }} streaming status="running"
        cellFlag={(row, col) => {
          if (col !== 6) return undefined;
          if (row >= 8) return 'pending';
          if (row === 7) return 'flash';
          return 'flash2';
        }} />
    </div>
  );
}

// ── Chat boards ───────────────────────────────────────────────────────────
function ChatBoard({ theme, variant }) {
  const t = theme === 'dark' ? TT_DARK : TT_LIGHT;
  const props = variant === 'running'
    ? { messages: CHAT_RUNNING, streaming: true, requestCount: 1, micStatus: 'idle' }
    : variant === 'detail'
      ? { messages: CHAT_DONE, requestCount: 2, openDetailId: 4 }
      : variant === 'error'
        ? { messages: CHAT_ERROR, requestCount: 0 }
        : variant === 'empty'
          ? { messages: [], requestCount: 0 }
          : { messages: CHAT_DONE, requestCount: 2 };
  return (
    <div style={{ width: 360, height: 560, display: 'flex', fontFamily: TT_TYPE.ui }}>
      <ChatSidebar t={t} {...props} />
    </div>
  );
}

function InputBoard({ theme }) {
  const t = theme === 'dark' ? TT_DARK : TT_LIGHT;
  const wrap = (child) => (
    <div style={{ background: t.surface2, border: `1px solid ${t.line}`, borderRadius: TT_S.radiusSm }}>{child}</div>
  );
  return (
    <Stage theme={theme} width={460} height={540}>
      <StageLabel t={t}>input row — idle · typed · focused · running · recording</StageLabel>
      {wrap(<ChatInputRow t={t} />)}
      {wrap(<ChatInputRow t={t} draft="round Score to 1 decimal" />)}
      {wrap(<ChatInputRow t={t} draft="drop duplicate emails" focused />)}
      {wrap(<ChatInputRow t={t} draft="" streaming />)}
      {wrap(<ChatInputRow t={t} draft="" micStatus="recording" />)}
    </Stage>
  );
}

// ── Settings / tutorial boards ────────────────────────────────────────────
function ChooserBoard({ theme, expanded = 'gemini' }) {
  const t = theme === 'dark' ? TT_DARK : TT_LIGHT;
  return (
    <Stage theme={theme} width={430} height={620}>
      <StageLabel t={t}>ModelChooser — provider accordion · {expanded} expanded</StageLabel>
      <ModelChooser t={t} expandedProvider={expanded} provider={expanded}
        primaryModel={expanded === 'anthropic' ? 'claude-sonnet-4-6' : expanded === 'openai' ? 'gpt-5.5' : 'gemini-3.5-flash'}
        secondaryModel={expanded === 'anthropic' ? 'claude-sonnet-4-5' : expanded === 'openai' ? 'gpt-5.4-mini' : 'gemini-3.5-flash'}
        keys={{ gemini: 'AIzaSyD8eXampleKey', openai: '', anthropic: 'sk-ant-api03-example' }} />
    </Stage>
  );
}

// ── Overview / intro artboards ────────────────────────────────────────────
function OverviewBoard() {
  const t = TT_LIGHT;
  const li = (head, body) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ font: `600 ${TT_TYPE.sm}px/1.3 ${TT_TYPE.ui}`, color: t.ink }}>{head}</span>
      <span style={{ font: `400 ${TT_TYPE.xs}px/1.5 ${TT_TYPE.ui}`, color: t.ink3 }}>{body}</span>
    </div>
  );
  return (
    <div style={{
      width: 780, height: 700, boxSizing: 'border-box', padding: 28,
      background: TT_BRAND.ground, fontFamily: TT_TYPE.ui,
      display: 'flex', flexDirection: 'column', gap: 22,
    }}>
      <Lockup size={30} />
      <div style={{ font: `400 ${TT_TYPE.lg}px/1.5 ${TT_TYPE.ui}`, color: t.ink2, maxWidth: 560 }}>
        A natural-language ETL tool: load a table, then drive transformations by
        chatting in plain English. Three regions — toolbar, table grid, chat
        sidebar — on a cool Mist ground with Aubergine ink. Pale Sky is the only
        accent: the mark's center cell, focus rings, and selection.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px', paddingTop: 4 }}>
        {li('Tokens are the single source', 'tokens.json is canonical; tokens.jsx and the app\'s ui-kit copy are generated mirrors — incl. the new rec/onRec voice tokens.')}
        {li('ui-kit primitives', 'Button (ghost · chrome · primary · danger), SplitButton, 19 icons, dismissible Toasts, ThemeProvider light/dark.')}
        {li('Toolbar', 'Brand lockup, file readout, Open URL/local split button, Save data / Save flow, undo/redo, theme toggle, Settings, Tutorial.')}
        {li('TableView', 'Silver grid · 28px rows · 32px header. Selection, inline edit, header drag-reorder, pagination + status footers. LLM cells flash cellHi → cellHi2; pending cells pulse.')}
        {li('ChatSidebar', 'Request list with collapsible request-detail strips, input row with send/stop and the press-and-hold MicButton (rec red + pulsing ring).')}
        {li('Settings & Tutorial', 'Provider accordion (Google / OpenAI / Anthropic) with masked keys and a Primary/Secondary model matrix; guided tutorial scenarios.')}
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Mark height={16} />
        <span style={{ font: `400 ${TT_TYPE.xs}px/1 ${TT_TYPE.mono}`, color: t.ink3 }}>
          worked example: “keep rows with Score ≥ 8, add a Country column from each phone number”
        </span>
      </div>
    </div>
  );
}

function PrototypeLinkBoard() {
  const t = TT_LIGHT;
  return (
    <a href="Prototype.html" target="_top" style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      width: 380, height: 700, boxSizing: 'border-box', padding: 26,
      background: TT_BRAND.ink, textDecoration: 'none', fontFamily: TT_TYPE.ui,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Mark height={40} mode="reverse" />
        <div style={{ font: `600 ${TT_TYPE.xl}px/1.3 ${TT_TYPE.ui}`, color: t.inkOnInk }}>
          Clickable prototype
        </div>
        <div style={{ font: `400 ${TT_TYPE.sm}px/1.6 ${TT_TYPE.ui}`, color: TT_BRAND.accent }}>
          The full three-region app, interactive: open a sample, type or hold-to-speak
          a request, watch AI cells fill and flash, undo, save, switch themes.
        </div>
        <div style={{ font: `400 ${TT_TYPE.xs}px/1.8 ${TT_TYPE.mono}`, color: 'color-mix(in srgb, ' + t.inkOnInk + ' 55%, transparent)' }}>
          try: filter Score ≥ 8<br />
          → add a Country column<br />
          → normalize phone numbers<br />
          → :undo · :save
        </div>
      </div>
      <div style={{
        alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '10px 16px', borderRadius: TT_S.radius, background: TT_BRAND.accent,
        color: t.inkOnAcc, font: `600 ${TT_TYPE.sm}px/1 ${TT_TYPE.ui}`,
      }}>
        Open Prototype.html
        <span style={{ display: 'inline-flex', transform: 'rotate(-90deg)' }}><Icon name="chevron" size={13} /></span>
      </div>
    </a>
  );
}

// ── Canvas ────────────────────────────────────────────────────────────────
function Canvas() {
  return (
    <DesignCanvas>
      <DCSection id="intro" title="TamedTable" subtitle="Plain-English table transformations · regenerated against the current product and tokens.json.">
        <DCArtboard id="overview" label="System at a glance" width={780} height={700}>
          <OverviewBoard />
        </DCArtboard>
        <DCArtboard id="proto-link" label="Clickable prototype" width={380} height={700}>
          <PrototypeLinkBoard />
        </DCArtboard>
      </DCSection>

      <DCSection id="brand" title="Brand" subtitle="The 9×5 mark with overhanging eaves — crisp ≤80px, grid >80px, reverse on dark. Accent cell is always Pale Sky.">
        <DCArtboard id="brand-board" label="Mark modes & lockups" width={760} height={330}>
          <BrandBoard />
        </DCArtboard>
      </DCSection>

      <DCSection id="tokens" title="Tokens" subtitle="Generated from tokens.json — the single source of truth. Includes the new rec/onRec recording tokens.">
        <DCArtboard id="tokens-light" label="Light" width={980} height={560}>
          <TokenBoard theme="light" />
        </DCArtboard>
        <DCArtboard id="tokens-dark" label="Dark" width={980} height={560}>
          <TokenBoard theme="dark" />
        </DCArtboard>
      </DCSection>

      <DCSection id="light-states" title="Main screen — light" subtitle="The worked example: normalize phones, then filter Score ≥ 8 + AI Country column (cells flash cellHi → cellHi2, pending cells pulse).">
        <DCArtboard id="light-empty" label="Empty · no file" width={SCREEN_W} height={SCREEN_H}>
          <AppScreen theme="light" state="empty" />
        </DCArtboard>
        <DCArtboard id="light-loaded" label="Loaded · 1 transformation" width={SCREEN_W} height={SCREEN_H}>
          <AppScreen theme="light" state="loaded" />
        </DCArtboard>
        <DCArtboard id="light-running" label="Running · AI cells filling" width={SCREEN_W} height={SCREEN_H}>
          <AppScreen theme="light" state="running" />
        </DCArtboard>
        <DCArtboard id="light-saved" label="Saved toast" width={SCREEN_W} height={SCREEN_H}>
          <AppScreen theme="light" state="saved" />
        </DCArtboard>
        <DCArtboard id="light-error" label="Error toast + chat error" width={SCREEN_W} height={SCREEN_H}>
          <AppScreen theme="light" state="error" />
        </DCArtboard>
        <DCArtboard id="light-settings" label="Settings open" width={SCREEN_W} height={SCREEN_H}>
          <AppScreen theme="light" state="loaded" showSettings />
        </DCArtboard>
        <DCArtboard id="light-tutorial" label="Tutorial open" width={SCREEN_W} height={SCREEN_H}>
          <AppScreen theme="light" state="loaded" showTutorial />
        </DCArtboard>
        <DCArtboard id="light-open-dialog" label="Open from URL dialog" width={SCREEN_W} height={SCREEN_H}>
          <AppScreen theme="light" state="empty" showOpenDialog />
        </DCArtboard>
      </DCSection>

      <DCSection id="dark-states" title="Main screen — dark" subtitle="Same states, same density; the accent stays Pale Sky.">
        <DCArtboard id="dark-empty" label="Empty · no file" width={SCREEN_W} height={SCREEN_H}>
          <AppScreen theme="dark" state="empty" />
        </DCArtboard>
        <DCArtboard id="dark-loaded" label="Loaded · 1 transformation" width={SCREEN_W} height={SCREEN_H}>
          <AppScreen theme="dark" state="loaded" />
        </DCArtboard>
        <DCArtboard id="dark-running" label="Running · AI cells filling" width={SCREEN_W} height={SCREEN_H}>
          <AppScreen theme="dark" state="running" />
        </DCArtboard>
        <DCArtboard id="dark-saved" label="Saved toast" width={SCREEN_W} height={SCREEN_H}>
          <AppScreen theme="dark" state="saved" />
        </DCArtboard>
        <DCArtboard id="dark-error" label="Error toast + chat error" width={SCREEN_W} height={SCREEN_H}>
          <AppScreen theme="dark" state="error" />
        </DCArtboard>
        <DCArtboard id="dark-settings" label="Settings open" width={SCREEN_W} height={SCREEN_H}>
          <AppScreen theme="dark" state="loaded" showSettings />
        </DCArtboard>
        <DCArtboard id="dark-tutorial" label="Tutorial open" width={SCREEN_W} height={SCREEN_H}>
          <AppScreen theme="dark" state="loaded" showTutorial />
        </DCArtboard>
      </DCSection>

      <DCSection id="uikit" title="ui-kit primitives" subtitle="Mirrors src/packages/ui-kit — Button, SplitButton, Icon, Toasts. Primary is Ink; Pale Sky is never a button fill.">
        <DCArtboard id="buttons-l" label="Buttons · light" width={560} height={300}>
          <ButtonsBoard theme="light" />
        </DCArtboard>
        <DCArtboard id="buttons-d" label="Buttons · dark" width={560} height={300}>
          <ButtonsBoard theme="dark" />
        </DCArtboard>
        <DCArtboard id="icons-l" label="Icons · light" width={560} height={220}>
          <IconBoard theme="light" />
        </DCArtboard>
        <DCArtboard id="icons-d" label="Icons · dark" width={560} height={220}>
          <IconBoard theme="dark" />
        </DCArtboard>
        <DCArtboard id="toasts-l" label="Toasts · light" width={460} height={190}>
          <ToastBoard theme="light" />
        </DCArtboard>
        <DCArtboard id="toasts-d" label="Toasts · dark" width={460} height={190}>
          <ToastBoard theme="dark" />
        </DCArtboard>
      </DCSection>

      <DCSection id="toolbar" title="Toolbar" subtitle="Brand lockup · file readout · Open URL/local split button · Save data / Save flow · undo/redo · theme · Settings · Tutorial.">
        <DCArtboard id="tb-loaded-l" label="Loaded · light" width={1080} height={72}>
          <div style={{ width: 1080, fontFamily: TT_TYPE.ui }}><Toolbar t={TT_LIGHT} /></div>
        </DCArtboard>
        <DCArtboard id="tb-loaded-d" label="Loaded · dark" width={1080} height={72}>
          <div style={{ width: 1080, fontFamily: TT_TYPE.ui }}><Toolbar t={TT_DARK} /></div>
        </DCArtboard>
        <DCArtboard id="tb-empty" label="Empty (saves disabled)" width={1080} height={72}>
          <div style={{ width: 1080, fontFamily: TT_TYPE.ui }}>
            <Toolbar t={TT_LIGHT} loaded={false} canUndo={false} canRedo={false} />
          </div>
        </DCArtboard>
        <DCArtboard id="tb-split-open" label="Split button open" width={1080} height={130}>
          <div style={{ width: 1080, height: 130, fontFamily: TT_TYPE.ui, background: TT_LIGHT.bg }}>
            <Toolbar t={TT_LIGHT} splitOpen />
          </div>
        </DCArtboard>
        <DCArtboard id="tb-dialog" label="Open-from-URL dialog · samples" width={680} height={560}>
          <div style={{ width: 680, height: 560, position: 'relative', fontFamily: TT_TYPE.ui, background: TT_LIGHT.bg }}>
            <OpenUrlDialog t={TT_LIGHT} inline url="https://zsvedic.github.io/TamedTable/samples/customers.csv" />
          </div>
        </DCArtboard>
      </DCSection>

      <DCSection id="table" title="TableView" subtitle="Paged grid · Silver lines · rowH 28 / headerH 32 · selection accentSoft · LLM flash cellHi → cellHi2 · pending pulse.">
        <DCArtboard id="table-running" label="Running · streaming AI column" width={860} height={420}>
          <TableBoard theme="light" />
        </DCArtboard>
        <DCArtboard id="cells-l" label="Cell & header states · light" width={560} height={330}>
          <CellsBoard theme="light" />
        </DCArtboard>
        <DCArtboard id="cells-d" label="Cell & header states · dark" width={560} height={330}>
          <CellsBoard theme="dark" />
        </DCArtboard>
        <DCArtboard id="pagination" label="Pagination" width={460} height={190}>
          <PaginationBoard theme="light" />
        </DCArtboard>
      </DCSection>

      <DCSection id="chat" title="ChatSidebar" subtitle="Request list · collapsible request detail (copyable) · input row with MicButton and send/stop.">
        <DCArtboard id="chat-empty" label="Empty state" width={360} height={560}>
          <ChatBoard theme="light" variant="empty" />
        </DCArtboard>
        <DCArtboard id="chat-running" label="Running" width={360} height={560}>
          <ChatBoard theme="light" variant="running" />
        </DCArtboard>
        <DCArtboard id="chat-detail" label="Request detail open" width={360} height={560}>
          <ChatBoard theme="light" variant="detail" />
        </DCArtboard>
        <DCArtboard id="chat-error" label="Error reply" width={360} height={560}>
          <ChatBoard theme="light" variant="error" />
        </DCArtboard>
        <DCArtboard id="chat-dark" label="Dark" width={360} height={560}>
          <ChatBoard theme="dark" variant="done" />
        </DCArtboard>
        <DCArtboard id="inputs" label="Input row states" width={460} height={540}>
          <InputBoard theme="light" />
        </DCArtboard>
        <DCArtboard id="mic-l" label="MicButton · light" width={460} height={170}>
          <MicBoard theme="light" />
        </DCArtboard>
        <DCArtboard id="mic-d" label="MicButton · dark" width={460} height={170}>
          <MicBoard theme="dark" />
        </DCArtboard>
      </DCSection>

      <DCSection id="settings" title="Settings · ModelChooser" subtitle="Provider accordion — masked API key (eye reveal) + Primary/Secondary model matrix; voice-capable models carry the 🎙 badge.">
        <DCArtboard id="chooser-gemini" label="Google expanded · light" width={430} height={620}>
          <ChooserBoard theme="light" expanded="gemini" />
        </DCArtboard>
        <DCArtboard id="chooser-anthropic" label="Anthropic expanded · light" width={430} height={620}>
          <ChooserBoard theme="light" expanded="anthropic" />
        </DCArtboard>
        <DCArtboard id="chooser-dark" label="Google expanded · dark" width={430} height={620}>
          <ChooserBoard theme="dark" expanded="gemini" />
        </DCArtboard>
      </DCSection>

      <DCSection id="tutorial" title="TutorialPanel" subtitle="Scenario picker and the active tour's step readout — step bubbles spotlight live UI in the app.">
        <DCArtboard id="tut-picker" label="Scenario picker" width={420} height={520}>
          <div style={{ width: 420, height: 520, position: 'relative', fontFamily: TT_TYPE.ui, background: TT_LIGHT.bg }}>
            <TutorialSheet t={TT_LIGHT} inline />
          </div>
        </DCArtboard>
        <DCArtboard id="tut-active" label="Active tour · step 2 of 5" width={420} height={520}>
          <div style={{ width: 420, height: 520, position: 'relative', fontFamily: TT_TYPE.ui, background: TT_LIGHT.bg }}>
            <TutorialSheet t={TT_LIGHT} inline active stepNum={2} stepTotal={5}
              stepText="Type “keep rows with Score ≥ 8” into the chat input and press Enter." />
          </div>
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Canvas />);
