// TamedTable — design canvas composition.
// Five main-screen states × 2 themes, a components zoo, and design tokens.

const { useState: useStateCanvas } = React;

// ── Token display helpers ──────────────────────────────────────────────
function Swatch({ name, value, t, big }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
      <div style={{
        width: big ? 56 : 28, height: big ? 56 : 28, borderRadius: 6,
        background: value, border: `1px solid ${t.line}`,
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.02)'
      }} />
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ font: `500 12px/1.3 ${TT_TYPE.mono}`, color: t.ink }}>{name}</div>
        <div style={{ font: `400 10.5px/1.3 ${TT_TYPE.mono}`, color: t.ink3 }}>{value}</div>
      </div>
    </div>);

}

function TokenBoard({ theme }) {
  const t = theme === 'dark' ? TT_DARK : TT_LIGHT;
  const palette = theme === 'dark' ? TT_DARK : TT_LIGHT;
  const swatches = [
  ['bg', palette.bg], ['surface', palette.surface], ['surface2', palette.surface2], ['surface3', palette.surface3],
  ['ink', palette.ink], ['ink2', palette.ink2], ['ink3', palette.ink3], ['ink4', palette.ink4],
  ['line', palette.line], ['line2', palette.line2],
  ['accent', palette.accent], ['accentSoft', palette.accentSoft],
  ['ok', palette.ok], ['err', palette.err],
  ['cellHi', palette.cellHi]];

  return (
    <div style={{
      width: 760, height: 540, padding: 22, background: t.bg, color: t.ink,
      fontFamily: TT_TYPE.ui, display: 'flex', flexDirection: 'column', gap: 14,
      border: `1px solid ${t.line}`
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <div style={{ font: `600 18px/1 ${TT_TYPE.ui}`, color: t.ink, letterSpacing: -0.2 }}>
          {theme === 'dark' ? 'Dark' : 'Light'} tokens
        </div>
        <div style={{ font: `400 12px/1 ${TT_TYPE.mono}`, color: t.ink3 }}>
          colour · type · spacing
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <div>
          <div style={{ font: `500 11px/1 ${TT_TYPE.ui}`, color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Surfaces & ink</div>
          {swatches.slice(0, 8).map(([n, v]) => <Swatch key={n} name={n} value={v} t={t} />)}
        </div>
        <div>
          <div style={{ font: `500 11px/1 ${TT_TYPE.ui}`, color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Lines & accent</div>
          {swatches.slice(8).map(([n, v]) => <Swatch key={n} name={n} value={v} t={t} />)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ font: `500 11px/1 ${TT_TYPE.ui}`, color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Type scale</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[['xl 20', 20, 600], ['lg 16', 16, 600], ['md 14', 14, 500], ['base 13', 13, 400], ['sm 12.5', 12.5, 400], ['xs 11.5', 11.5, 400], ['micro 10.5', 10.5, 400]].map(([label, size, w]) =>
              <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ font: `400 10px/1 ${TT_TYPE.mono}`, color: t.ink3, width: 60 }}>{label}</span>
                  <span style={{ font: `${w} ${size}px/1 ${TT_TYPE.ui}`, color: t.ink }}>The quiet table</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                <span style={{ font: `400 10px/1 ${TT_TYPE.mono}`, color: t.ink3, width: 60 }}>mono 12.5</span>
                <span style={{ font: `400 12.5px/1 ${TT_TYPE.mono}`, color: t.ink, fontVariantNumeric: 'tabular-nums' }}>+14155550142</span>
              </div>
            </div>
          </div>
          <div>
            <div style={{ font: `500 11px/1 ${TT_TYPE.ui}`, color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Spacing & radii</div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 32 }}>
              {[2, 4, 6, 8, 10, 12, 16, 24].map((px) =>
              <div key={px} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ width: '100%', height: px, background: t.accent, borderRadius: 1, marginBottom: 2 }} />
                  <span style={{ font: `400 9.5px/1 ${TT_TYPE.mono}`, color: t.ink3 }}>{px}</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
              {[4, 6, 8, 10].map((r) =>
              <div key={r} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{ width: 26, height: 26, borderRadius: r, background: t.accentSoft, border: `1px solid ${t.line2}` }} />
                  <span style={{ font: `400 9.5px/1 ${TT_TYPE.mono}`, color: t.ink3 }}>r{r}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>);

}

// ── Component zoo helpers ──────────────────────────────────────────────
function Frame({ title, theme = 'light', width = 380, height = 220, children, padding = 14 }) {
  const t = theme === 'dark' ? TT_DARK : TT_LIGHT;
  return (
    <div style={{
      width, height, background: t.bg, color: t.ink,
      fontFamily: TT_TYPE.ui, border: `1px solid ${t.line}`,
      display: 'flex', flexDirection: 'column'
    }}>
      <div style={{
        height: 24, padding: '0 10px', display: 'flex', alignItems: 'center',
        background: t.surface2, borderBottom: `1px solid ${t.line}`,
        font: `500 10.5px/1 ${TT_TYPE.mono}`, color: t.ink3, letterSpacing: 0.5,
        textTransform: 'uppercase'
      }}>{title}</div>
      <div style={{ flex: 1, padding, overflow: 'hidden', position: 'relative' }}>
        {children}
      </div>
    </div>);

}

// Header-cell + data-cell variants
function CellsBoard({ theme }) {
  const t = theme === 'dark' ? TT_DARK : TT_LIGHT;
  const HC = ({ label, sort, dragging, hover, width = 130 }) =>
  <div style={{
    width, display: 'flex', alignItems: 'center', height: TT_S.headerH,
    padding: '0 10px', gap: 6, position: 'relative',
    background: dragging ? t.accentSoft : hover ? t.surface3 : t.surface2,
    border: `1px solid ${t.line2}`,
    boxShadow: dragging ? `0 6px 14px ${t.shadow}` : 'none',
    transform: dragging ? 'translateY(-2px)' : 'none',
    font: `600 12.5px/1 ${TT_TYPE.ui}`, color: t.ink
  }}>
      {hover && <span style={{ color: t.ink4 }}>{I.grip}</span>}
      <span>{label}</span>
      {sort && <span style={{ marginLeft: 'auto', font: `400 10.5px/1 ${TT_TYPE.mono}`, color: t.accent }}>{sort}</span>}
      {hover &&
    <div style={{ position: 'absolute', right: -1, top: 0, bottom: 0, width: 2, background: t.accent }} />
    }
    </div>;

  const DC = ({ children, kind, width = 130 }) =>
  <div style={{
    width, height: TT_S.rowH, padding: '0 10px', display: 'flex', alignItems: 'center',
    borderBottom: `1px solid ${t.line}`, borderLeft: `1px solid ${t.line}`,
    borderRight: `1px solid ${t.line}`, background: t.surface,
    font: `400 12.5px/1 ${kind === 'mono' || kind === 'edit' ? TT_TYPE.mono : TT_TYPE.ui}`, color: t.ink,
    fontVariantNumeric: 'tabular-nums',
    ...(kind === 'selected' ? { background: t.accentSoft } : {}),
    ...(kind === 'edit' ? { background: t.surface, boxShadow: `inset 0 0 0 2px ${t.accent}` } : {}),
    ...(kind === 'flashing' ? { background: t.cellHi } : {}),
    ...(kind === 'blank' ? { color: t.ink4 } : {})
  }}>
      {children}
      {kind === 'edit' && <span style={{ width: 1.5, height: 14, background: t.accent, marginLeft: 2 }} />}
    </div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={{ font: `500 10.5px/1 ${TT_TYPE.ui}`, color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6 }}>Header cell</div>
        <div style={{ display: 'flex', gap: 0 }}>
          <HC label="Email" />
          <HC label="Score" sort="↓ desc" />
          <HC label="Phone" hover />
          <HC label="Signup" dragging />
        </div>
      </div>
      <div>
        <div style={{ font: `500 10.5px/1 ${TT_TYPE.ui}`, color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6 }}>Data cell</div>
        <div>
          <div style={{ display: 'flex' }}>
            <DC kind="mono">+14155550142</DC>
            <DC kind="selected">selected row</DC>
            <DC kind="edit">Maren Whitfield</DC>
            <DC kind="blank">—</DC>
          </div>
          <div style={{ display: 'flex' }}>
            <DC kind="flashing">+16285550117</DC>
            <DC>9.3</DC>
            <DC kind="mono">2025-11-13</DC>
            <DC>idle</DC>
          </div>
        </div>
        <div style={{ marginTop: 6, font: `400 10.5px/1.4 ${TT_TYPE.ui}`, color: t.ink3 }}>
          mono · selected · editing (with caret) · blank · briefly flashing on AI update
        </div>
      </div>
    </div>);

}

// ── DCArtboard wrapper that injects keyframes once ──────────────────────
const FLASH_CSS = `
@keyframes tt-flash-kf { 0% { background: var(--hi); } 100% { background: transparent; } }
.tt-flash { animation: tt-flash-kf 1.6s ease-out infinite; }
@keyframes tt-pulse-kf { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
.tt-pulse { animation: tt-pulse-kf 1.2s ease-in-out infinite; }
@keyframes tt-caret-kf { 0%,49% { opacity: 1; } 50%,100% { opacity: 0; } }
.tt-caret { animation: tt-caret-kf 1.1s steps(1) infinite; }
.tt-headergrip-target:hover .tt-headergrip { opacity: 1 !important; }
`;
if (typeof document !== 'undefined' && !document.getElementById('tt-css')) {
  const s = document.createElement('style');s.id = 'tt-css';s.textContent = FLASH_CSS;
  document.head.appendChild(s);
}

// ── Canvas root ─────────────────────────────────────────────────────────
const SCREEN_W = 1180,SCREEN_H = 740;

function Canvas() {
  return (
    <DesignCanvas>
      <DCSection id="intro" title="TamedTable" subtitle="Plain-English table transformations · refreshed against the new brand system.">
        <DCArtboard id="overview" label="System at a glance" width={780} height={700}>
          <div style={{
            background: TT_BRAND.ground,
            fontFamily: TT_TYPE.ui, display: 'flex', flexDirection: 'column',
            width: 780, padding: 24, gap: 22, height: "700px"
          }}>
            {/* hero — lockup + pitch */}
            <div style={{ display: 'flex', gap: 28, flex: '0 0 auto', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Lockup size={22} color={TT_BRAND.ink} />
                <div style={{
                  font: `500 30px/1.1 ${TT_TYPE.brand}`, color: TT_BRAND.ink,
                  letterSpacing: '0.005em', fontVariantCaps: 'small-caps'
                }}>
                  A calm instrument<br />for reshaping data.
                </div>
                <div style={{ font: `400 13.5px/1.55 ${TT_TYPE.ui}`, color: TT_LIGHT.ink2, maxWidth: 360 }}>
                  Two panes under a thin top bar — requests on the left, the table on the right. Aubergine ink, pale-sky accent, mist ground — calm but cool.
                </div>
                <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['Outfit', 'Inter', 'JetBrains Mono', 'oklch palette', 'light + dark', '9×5 pixel mark'].map((c) =>
                  <span key={c} style={{
                    font: `400 11px/1 ${TT_TYPE.mono}`, color: TT_LIGHT.ink2,
                    background: '#fff', border: `1px solid ${TT_BRAND.line}`,
                    borderRadius: 4, padding: '4px 7px'
                  }}>{c}</span>
                  )}
                </div>
              </div>

              {/* mark — three rendering modes */}
              <div style={{
                flex: '0 0 280px', background: '#fff',
                border: `1px solid ${TT_BRAND.line}`, borderRadius: 8, padding: 16,
                display: 'flex', flexDirection: 'column', gap: 14
              }}>
                <div style={{
                  font: `500 10.5px/1 ${TT_TYPE.mono}`, color: TT_LIGHT.ink3,
                  letterSpacing: 0.6, textTransform: 'uppercase'
                }}>The mark · three modes</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <Mark height={28} mode="crisp" />
                  <div>
                    <div style={{ font: `500 12px/1.2 ${TT_TYPE.ui}`, color: TT_LIGHT.ink }}>Crisp</div>
                    <div style={{ font: `400 10.5px/1.3 ${TT_TYPE.mono}`, color: TT_LIGHT.ink3 }}>≤ 80 px · UI scale</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <Mark height={64} mode="grid" />
                  <div>
                    <div style={{ font: `500 12px/1.2 ${TT_TYPE.ui}`, color: TT_LIGHT.ink }}>Grid</div>
                    <div style={{ font: `400 10.5px/1.3 ${TT_TYPE.mono}`, color: TT_LIGHT.ink3 }}>{`> 80 px · hero scale`}</div>
                  </div>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  background: TT_BRAND.ink, padding: '10px 12px', borderRadius: 6, margin: '-2px -2px 0'
                }}>
                  <Mark height={28} mode="reverse" />
                  <div>
                    <div style={{ font: `500 12px/1.2 ${TT_TYPE.ui}`, color: '#fff' }}>Reverse</div>
                    <div style={{ font: `400 10.5px/1.3 ${TT_TYPE.mono}`, color: 'rgba(255,255,255,.65)' }}>on dark surfaces</div>
                  </div>
                </div>
              </div>
            </div>

            {/* palette — brand-literal hex values, with where each appears */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{
                  font: `500 11px/1 ${TT_TYPE.mono}`, color: TT_LIGHT.ink3,
                  letterSpacing: 0.6, textTransform: 'uppercase'
                }}>Palette · six brand colors</span>
                <span style={{ font: `400 10.5px/1 ${TT_TYPE.mono}`, color: TT_LIGHT.ink3 }}>distinct roles · don't mix</span>
              </div>
              <div style={{
                border: `1px solid ${TT_BRAND.line}`, borderRadius: 6, overflow: 'hidden',
                display: 'grid',
                gridTemplateColumns: '22px 100px 78px minmax(0, 1fr) minmax(0, 1.6fr)',
                background: '#fff'
              }}>
                {[
                { name: 'Aubergine', role: 'Ink', hex: '#281C60', textOn: '#fff', bg: '#281C60', sample: 'TamedTable', where: 'All text, T-pillars, cross-bars' },
                { name: 'Pale Sky', role: 'Accent', hex: '#96BED7', textOn: TT_BRAND.ink, bg: '#96BED7', sample: '◆ accent cell', where: 'The accent cell, focus, selection' },
                { name: 'Silver', role: 'Grid Lines', hex: '#DCDCDC', textOn: TT_BRAND.ink, bg: '#DCDCDC', sample: '────────', where: 'Grid gutters, dividers, table lines' },
                { name: 'White', role: 'Icon BG', hex: '#FFFFFF', textOn: TT_BRAND.ink, bg: '#FFFFFF', sample: 'panel · table', where: 'Empty cells in mark, panel surface' },
                { name: 'Mist', role: 'Ground', hex: '#ECF0F7', textOn: TT_BRAND.ink, bg: '#ECF0F7', sample: 'page bg', where: 'Page background, chat sidebar' },
                { name: 'Linen', role: 'Warm Accent', hex: '#F6F2EB', textOn: TT_BRAND.ink, bg: '#F6F2EB', sample: 'warm callout', where: 'Optional warm-tone surface' }].
                flatMap((c, i, arr) => {
                  const border = i < arr.length - 1 ? `1px solid ${TT_BRAND.line}` : 'none';
                  const cell = (extra) => ({
                    borderBottom: border, padding: '8px 10px',
                    display: 'flex', alignItems: 'center', minWidth: 0,
                    ...extra
                  });
                  return [
                  <div key={c.name + '-sw'} style={cell({ padding: 0, background: c.bg, borderRight: `1px solid ${TT_BRAND.line}` })} />,
                  <div key={c.name + '-nm'} style={cell({ font: `600 12px/1.2 ${TT_TYPE.ui}`, color: TT_BRAND.ink, flexDirection: 'column', alignItems: 'flex-start', gap: 1 })}>
                      <span>{c.name}</span>
                      <span style={{ font: `400 10px/1 ${TT_TYPE.mono}`, color: TT_LIGHT.ink3, textTransform: 'uppercase', letterSpacing: 0.4 }}>{c.role}</span>
                    </div>,
                  <div key={c.name + '-hx'} style={cell({ font: `500 11px/1 ${TT_TYPE.mono}`, color: TT_LIGHT.ink2 })}>{c.hex}</div>,
                  <div key={c.name + '-ex'} style={cell({ background: c.bg, font: `500 11.5px/1.2 ${TT_TYPE.mono}`, color: c.textOn, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', borderRight: `1px solid ${TT_BRAND.line}` })}>{c.sample}</div>,
                  <div key={c.name + '-wh'} style={cell({ font: `400 11.5px/1.35 ${TT_TYPE.ui}`, color: TT_LIGHT.ink2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' })}>{c.where}</div>];

                })}
              </div>
            </div>
          </div>
        </DCArtboard>

        <DCArtboard id="proto-link" label="Clickable prototype" width={380} height={700}>
          <a href="Prototype.html" target="_top" style={{
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            width: 380, padding: 28, textDecoration: 'none',
            background: TT_BRAND.ink, color: '#fff',
            fontFamily: TT_TYPE.ui, height: "700px"
          }}>
            <Lockup size={18} color="#fff" dark />
            <div style={{ display: 'flex', justifyContent: 'center', flex: 1, alignItems: 'center' }}>
              <Mark height={150} mode="reverse" />
            </div>
            <div>
              <div style={{
                font: `400 11px/1 ${TT_TYPE.mono}`, color: 'rgba(255,255,255,.55)',
                textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 10
              }}>
                Prototype
              </div>
              <div style={{
                font: `500 30px/1.1 ${TT_TYPE.brand}`,
                letterSpacing: '0.005em', fontVariantCaps: 'small-caps'
              }}>
                Try it →
              </div>
              <div style={{ font: `400 12.5px/1.55 ${TT_TYPE.ui}`, color: 'rgba(255,255,255,.70)', marginTop: 10 }}>
                Open a file, type a request, watch the table change. Save, undo, redo all work.
              </div>
            </div>
          </a>
        </DCArtboard>
      </DCSection>

      <DCSection id="light-states" title="Main screen — light" subtitle="Five working states; the default theme.">
        <DCArtboard id="light-loaded" label="Loaded · idle" width={SCREEN_W} height={SCREEN_H}>
          <AppScreen theme="light" state="loaded" />
        </DCArtboard>
        <DCArtboard id="light-running" label="Request running" width={SCREEN_W} height={SCREEN_H}>
          <AppScreen theme="light" state="running" />
        </DCArtboard>
        <DCArtboard id="light-empty" label="Empty · no file" width={SCREEN_W} height={SCREEN_H}>
          <AppScreen theme="light" state="empty" />
        </DCArtboard>
        <DCArtboard id="light-error" label="Error toast" width={SCREEN_W} height={SCREEN_H}>
          <AppScreen theme="light" state="error" />
        </DCArtboard>
        <DCArtboard id="light-saving" label="Saved" width={SCREEN_W} height={SCREEN_H}>
          <AppScreen theme="light" state="saving" />
        </DCArtboard>
        <DCArtboard id="light-settings" label="Settings open" width={SCREEN_W} height={SCREEN_H}>
          <AppScreen theme="light" state="loaded" showSettings />
        </DCArtboard>
      </DCSection>

      <DCSection id="dark-states" title="Main screen — dark" subtitle="Same five states, same density. Dark matters to this audience.">
        <DCArtboard id="dark-loaded" label="Loaded · idle" width={SCREEN_W} height={SCREEN_H}>
          <AppScreen theme="dark" state="loaded" />
        </DCArtboard>
        <DCArtboard id="dark-running" label="Request running" width={SCREEN_W} height={SCREEN_H}>
          <AppScreen theme="dark" state="running" />
        </DCArtboard>
        <DCArtboard id="dark-empty" label="Empty · no file" width={SCREEN_W} height={SCREEN_H}>
          <AppScreen theme="dark" state="empty" />
        </DCArtboard>
        <DCArtboard id="dark-error" label="Error toast" width={SCREEN_W} height={SCREEN_H}>
          <AppScreen theme="dark" state="error" />
        </DCArtboard>
        <DCArtboard id="dark-saving" label="Saved" width={SCREEN_W} height={SCREEN_H}>
          <AppScreen theme="dark" state="saving" />
        </DCArtboard>
        <DCArtboard id="dark-settings" label="Settings open" width={SCREEN_W} height={SCREEN_H}>
          <AppScreen theme="dark" state="loaded" showSettings />
        </DCArtboard>
      </DCSection>

      <DCSection id="chat-comps" title="Components · chat" subtitle="Top bar, chat messages, the collapsible detail strip, progress, and the input.">

        <DCArtboard id="cmp-topbar-l" label="Top bar · light" width={760} height={70}>
          <div style={{ width: 760, fontFamily: TT_TYPE.ui }}><TopBar t={TT_LIGHT} state="loaded" /></div>
        </DCArtboard>
        <DCArtboard id="cmp-topbar-d" label="Top bar · dark" width={760} height={70}>
          <div style={{ width: 760, fontFamily: TT_TYPE.ui }}><TopBar t={TT_DARK} state="loaded" /></div>
        </DCArtboard>
        <DCArtboard id="cmp-topbar-empty" label="Top bar · empty (Save disabled)" width={760} height={70}>
          <div style={{ width: 760, fontFamily: TT_TYPE.ui }}><TopBar t={TT_LIGHT} state="empty" /></div>
        </DCArtboard>

        <DCArtboard id="cmp-msg" label="Chat — request + result + open detail" width={420} height={260}>
          <div style={{
            width: 420, height: 260, background: TT_LIGHT.surface2, padding: 14,
            fontFamily: TT_TYPE.ui, color: TT_LIGHT.ink
          }}>
            <ChatBubbleUser t={TT_LIGHT}>sort by Score, descending; blanks last</ChatBubbleUser>
            <ChatResult t={TT_LIGHT} defaultOpen
            detail={`ORDER BY Score DESC NULLS LAST\nrows: 20 → 20  · changed: 0  · reordered: 17\nelapsed: 0.12 s · tokens in 184 / out 42`}>
              Sorted by <strong style={{ color: TT_LIGHT.ink, fontWeight: 600 }}>Score</strong>, descending. <span style={{ color: TT_LIGHT.ink3 }}>17 rows moved.</span>
            </ChatResult>
          </div>
        </DCArtboard>

        <DCArtboard id="cmp-progress" label="Progress while a request runs" width={420} height={200}>
          <div style={{ width: 420, height: 200, background: TT_LIGHT.surface2, padding: 14, fontFamily: TT_TYPE.ui }}>
            <ChatProgress t={TT_LIGHT} />
          </div>
        </DCArtboard>

        <DCArtboard id="cmp-input-idle" label="Input · idle" width={420} height={110}>
          <div style={{ width: 420, fontFamily: TT_TYPE.ui }}><ChatInput t={TT_LIGHT} /></div>
        </DCArtboard>
        <DCArtboard id="cmp-input-typed" label="Input · typed (send active)" width={420} height={110}>
          <div style={{ width: 420, fontFamily: TT_TYPE.ui }}><ChatInput t={TT_LIGHT} value="round Score to 1 decimal" /></div>
        </DCArtboard>
        <DCArtboard id="cmp-input-run" label="Input · running (stop)" width={420} height={110}>
          <div style={{ width: 420, fontFamily: TT_TYPE.ui }}><ChatInput t={TT_LIGHT} running value="normalize phone numbers to E.164" /></div>
        </DCArtboard>
        <DCArtboard id="cmp-input-d" label="Input · dark" width={420} height={110}>
          <div style={{ width: 420, fontFamily: TT_TYPE.ui }}><ChatInput t={TT_DARK} value="drop duplicate emails" /></div>
        </DCArtboard>
      </DCSection>

      <DCSection id="table-comps" title="Components · table" subtitle="Header cells, data cells, the truncation marker.">
        <DCArtboard id="cmp-cells-l" label="Cells · light" width={620} height={300}>
          <div style={{
            width: 620, height: 300, background: TT_LIGHT.bg, padding: 16, fontFamily: TT_TYPE.ui
          }}>
            <CellsBoard theme="light" />
          </div>
        </DCArtboard>
        <DCArtboard id="cmp-cells-d" label="Cells · dark" width={620} height={300}>
          <div style={{
            width: 620, height: 300, background: TT_DARK.bg, padding: 16, fontFamily: TT_TYPE.ui
          }}>
            <CellsBoard theme="dark" />
          </div>
        </DCArtboard>

        <DCArtboard id="cmp-trunc" label="Truncation marker (rows)" width={420} height={120}>
          <div style={{
            width: 420, height: 120, background: TT_LIGHT.surface, fontFamily: TT_TYPE.ui,
            position: 'relative', overflow: 'hidden',
            display: 'flex', flexDirection: 'column'
          }}>
            {[0, 1, 2].map((i) =>
            <div key={i} style={{
              display: 'flex', height: 28, borderBottom: `1px solid ${TT_LIGHT.line}`,
              font: `400 12.5px/1 ${TT_TYPE.mono}`, color: TT_LIGHT.ink, fontVariantNumeric: 'tabular-nums'
            }}>
                <div style={{ width: 60, padding: '0 10px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', borderRight: `1px solid ${TT_LIGHT.line}` }}>{1041 + i}</div>
                <div style={{ flex: 1, padding: '0 10px', display: 'flex', alignItems: 'center' }}>Hannah Voss</div>
                <div style={{ width: 90, padding: '0 10px', display: 'flex', alignItems: 'center' }}>2025-11-04</div>
              </div>
            )}
            <div style={{
              position: 'absolute', left: 0, right: 0, bottom: 0, height: 30,
              background: `linear-gradient(180deg, transparent, ${TT_LIGHT.surface2})`,
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 6,
              font: `400 11.5px/1 ${TT_TYPE.mono}`, color: TT_LIGHT.ink3
            }}>…17 more rows · 4 more columns</div>
          </div>
        </DCArtboard>

        <DCArtboard id="cmp-pagination-l" label="Pagination · light (page 1)" width={620} height={80}>
          <div style={{
            width: 620, height: 80, background: TT_LIGHT.surface2, fontFamily: TT_TYPE.ui,
            borderTop: `1px solid ${TT_LIGHT.line}`, display: 'flex', alignItems: 'center',
            gap: 14, padding: '0 10px 0 14px'
          }}>
            <span style={{ font: `400 11.5px/1 ${TT_TYPE.mono}`, color: TT_LIGHT.ink3 }}>
              <span style={{ color: TT_LIGHT.ink2 }}>1–20</span> of 4,600 rows
            </span>
            <span style={{ flex: 1 }} />
            <Pagination t={TT_LIGHT} current={1} total={230} />
          </div>
        </DCArtboard>

        <DCArtboard id="cmp-pagination-mid" label="Pagination · mid-range (page 47)" width={620} height={80}>
          <div style={{
            width: 620, height: 80, background: TT_LIGHT.surface2, fontFamily: TT_TYPE.ui,
            borderTop: `1px solid ${TT_LIGHT.line}`, display: 'flex', alignItems: 'center',
            gap: 14, padding: '0 10px 0 14px'
          }}>
            <span style={{ font: `400 11.5px/1 ${TT_TYPE.mono}`, color: TT_LIGHT.ink3 }}>
              <span style={{ color: TT_LIGHT.ink2 }}>921–940</span> of 4,600 rows
            </span>
            <span style={{ flex: 1 }} />
            <Pagination t={TT_LIGHT} current={47} total={230} />
          </div>
        </DCArtboard>

        <DCArtboard id="cmp-pagination-end" label="Pagination · last page (Next disabled)" width={620} height={80}>
          <div style={{
            width: 620, height: 80, background: TT_LIGHT.surface2, fontFamily: TT_TYPE.ui,
            borderTop: `1px solid ${TT_LIGHT.line}`, display: 'flex', alignItems: 'center',
            gap: 14, padding: '0 10px 0 14px'
          }}>
            <span style={{ font: `400 11.5px/1 ${TT_TYPE.mono}`, color: TT_LIGHT.ink3 }}>
              <span style={{ color: TT_LIGHT.ink2 }}>4,581–4,600</span> of 4,600 rows
            </span>
            <span style={{ flex: 1 }} />
            <Pagination t={TT_LIGHT} current={230} total={230} />
          </div>
        </DCArtboard>

        <DCArtboard id="cmp-pagination-d" label="Pagination · dark" width={620} height={80}>
          <div style={{
            width: 620, height: 80, background: TT_DARK.surface2, fontFamily: TT_TYPE.ui,
            borderTop: `1px solid ${TT_DARK.line}`, display: 'flex', alignItems: 'center',
            gap: 14, padding: '0 10px 0 14px'
          }}>
            <span style={{ font: `400 11.5px/1 ${TT_TYPE.mono}`, color: TT_DARK.ink3 }}>
              <span style={{ color: TT_DARK.ink2 }}>1–20</span> of 4,600 rows
            </span>
            <span style={{ flex: 1 }} />
            <Pagination t={TT_DARK} current={1} total={230} />
          </div>
        </DCArtboard>
      </DCSection>

      <DCSection id="surface-comps" title="Components · surfaces" subtitle="Toasts, settings, empty CTA, buttons.">
        <DCArtboard id="cmp-toast-err" label="Toast · error" width={420} height={90}>
          <div style={{ width: 420, height: 90, background: TT_LIGHT.bg, position: 'relative', fontFamily: TT_TYPE.ui }}>
            <div style={{ position: 'absolute', right: 14, bottom: 14 }}>
              <Toast t={{ ...TT_LIGHT }} kind="error">Couldn't apply that change — try rephrasing it.</Toast>
            </div>
          </div>
        </DCArtboard>
        <DCArtboard id="cmp-toast-ok" label="Toast · saved" width={420} height={90}>
          <div style={{ width: 420, height: 90, background: TT_LIGHT.bg, position: 'relative', fontFamily: TT_TYPE.ui }}>
            <div style={{ position: 'absolute', right: 14, bottom: 14 }}>
              <Toast t={{ ...TT_LIGHT }} kind="ok">Saved to <span style={{ fontFamily: TT_TYPE.mono }}>signups_nov.csv</span></Toast>
            </div>
          </div>
        </DCArtboard>
        <DCArtboard id="cmp-toast-d" label="Toast · error · dark" width={420} height={90}>
          <div style={{ width: 420, height: 90, background: TT_DARK.bg, position: 'relative', fontFamily: TT_TYPE.ui }}>
            <div style={{ position: 'absolute', right: 14, bottom: 14 }}>
              <Toast t={{ ...TT_DARK }} kind="error">Couldn't reach the model — check your API key.</Toast>
            </div>
          </div>
        </DCArtboard>

        <DCArtboard id="cmp-settings" label="Settings sheet" width={420} height={520}>
          <div style={{
            width: 420, height: 520, background: TT_LIGHT.bg, position: 'relative', fontFamily: TT_TYPE.ui
          }}>
            <div style={{ position: 'absolute', inset: 0 }}>
              <SettingsSheet t={TT_LIGHT} />
            </div>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 380, bottom: 0, background: TT_LIGHT.overlay }} />
          </div>
        </DCArtboard>

        <DCArtboard id="cmp-empty" label="Empty CTA" width={520} height={340}>
          <div style={{ width: 520, height: 340, fontFamily: TT_TYPE.ui }}>
            <EmptyPane t={TT_LIGHT} />
          </div>
        </DCArtboard>

        <DCArtboard id="cmp-buttons" label="Buttons" width={420} height={170}>
          <div style={{
            width: 420, height: 170, background: TT_LIGHT.bg, padding: 16, fontFamily: TT_TYPE.ui,
            display: 'flex', flexDirection: 'column', gap: 10
          }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn t={TT_LIGHT} kind="primary">{I.send} Send</Btn>
              <Btn t={TT_LIGHT} kind="chrome" style={{ borderColor: TT_LIGHT.line }}>{I.folder} Open</Btn>
              <Btn t={TT_LIGHT}>{I.undo} Undo</Btn>
              <Btn t={TT_LIGHT} disabled>{I.redo} Redo</Btn>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn t={TT_LIGHT} kind="danger" style={{ borderColor: TT_LIGHT.err }}>{I.stop} Stop</Btn>
              <Btn t={TT_LIGHT} kind="chrome" style={{ borderColor: TT_LIGHT.line }}>Cancel</Btn>
              <Btn t={TT_LIGHT}>{I.cog} Settings</Btn>
            </div>
            <div style={{ font: `400 11px/1.4 ${TT_TYPE.mono}`, color: TT_LIGHT.ink3, marginTop: 4 }}>
              primary · chrome · ghost · disabled · danger
            </div>
          </div>
        </DCArtboard>
      </DCSection>

      <DCSection id="tokens" title="Design tokens" subtitle="Side-by-side light and dark; everything sized in the actual scale.">
        <DCArtboard id="tok-light" label="Light theme" width={760} height={540}>
          <TokenBoard theme="light" />
        </DCArtboard>
        <DCArtboard id="tok-dark" label="Dark theme" width={760} height={540}>
          <TokenBoard theme="dark" />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>);

}

ReactDOM.createRoot(document.getElementById('root')).render(<Canvas />);