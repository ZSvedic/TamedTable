// #GherkinTour demo logic — referenced by demo.html as an external module so
// `bun build` bundles it (inline scripts are left unbundled and 404 on ./index.ts).
//
// This is a self-touring page: a trivial TourAdapter wires the package's
// TourDriver + ./ui onto this page's own elements (no engine, no cassette), so
// the same tour flow the app ships is exercised against a non-TamedTable host.
import { parseTours, TourDriver, type TourAction, type TourScenario } from './index.ts';
import { TourUi } from './ui.ts';

// The `.feature` whose @tutorial scenario tours this page: load → query → play
// audio → show a golden. Shown on the page and parsed into the driver.
const featureText = `Feature: Tour the gherkin-tour demo

  Background:
    Given load "people.csv"

  @tutorial
  Scenario: A quick tour of this page
    When query "keep rows where age >= 18"
    And play audio "chime"
    Then the expected output is "adults"
    And compare with the expected output
`;

// Inline fixtures — the demo's stand-in for files + a recorded result.
const PEOPLE = [
  { name: 'Ada', age: 36 },
  { name: 'Cody', age: 14 },
  { name: 'Mira', age: 27 },
  { name: 'Sam', age: 9 },
];
const ADULTS = PEOPLE.filter((r) => r.age >= 18);

// ── Page elements ────────────────────────────────────────────────────────────
const el = (id: string) => document.getElementById(id)!;
const chatInput = el('chat-input') as HTMLInputElement;
const tableView = el('table-view');
const status = el('status');

el('feature').textContent = featureText;
el('out').textContent = JSON.stringify(parseTours(featureText), null, 2);

function setStatus(msg: string): void { status.textContent = msg; }

function renderTable(rows: Array<Record<string, unknown>>): void {
  if (rows.length === 0) { tableView.textContent = 'No data loaded.'; return; }
  const cols = Object.keys(rows[0]!);
  const head = `<tr>${cols.map((c) => `<th>${c}</th>`).join('')}</tr>`;
  const body = rows
    .map((r) => `<tr>${cols.map((c) => `<td>${String(r[c])}</td>`).join('')}</tr>`)
    .join('');
  tableView.innerHTML = `<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

// A short Web-Audio chime — no bundled asset needed.
function playChime(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 660;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
      osc.onended = () => { ctx.close().catch(() => {}); resolve(); };
    } catch {
      resolve(); // headless / no audio — the demo still tours
    }
  });
}

// ── The demo's TourAdapter ───────────────────────────────────────────────────
// Maps each typed action to a side effect on this page, and each action to the
// element the spotlight should land on. No engine, no cassette — playAudio
// plays a tone then shows a canned result; onFinish just notes completion (the
// app opens its Tutorial panel here instead).
const adapter = {
  async loadFile(_filename: string): Promise<void> {
    renderTable(PEOPLE);
    setStatus(`Loaded ${PEOPLE.length} rows.`);
  },
  async loadLookup(_filename: string): Promise<void> {
    setStatus('Loaded lookup table.');
  },
  async prefillChat(text: string): Promise<void> {
    chatInput.value = text;
    setStatus(`Query: "${text}"`);
  },
  async showGolden(_goldenFile: string | undefined): Promise<void> {
    renderTable(ADULTS);
    setStatus(`Expected output — ${ADULTS.length} rows.`);
  },
  async playAudio(_filename: string): Promise<void> {
    setStatus('Playing audio…');
    await playChime();
    renderTable(ADULTS);
    setStatus('Heard the clip → applied the result.');
  },
  elementIdFor(action: TourAction): string | null {
    switch (action.kind) {
      case 'load-file':
      case 'load-lookup': return 'open-btn';
      case 'prefill-chat': return 'chat-input';
      case 'play-audio':
      case 'show-golden':
      case 'golden-source':
      case 'display': return 'table-view';
    }
  },
  onFinish(): void {
    // In the app this is where the Tutorial panel reopens so the user can pick
    // another tour; the demo just notes it.
    setStatus('Tour finished — the app would open the Tutorials panel here.');
  },
};

// ── Wire the buttons through parseTours → TourDriver → ./ui ───────────────────
function tour(): TourScenario {
  const t = parseTours(featureText).find((s) => s.tags.includes('@tutorial'));
  if (!t) throw new Error('demo feature has no @tutorial scenario');
  return t;
}

function makeUi(): { driver: TourDriver; ui: TourUi } {
  const driver = new TourDriver(adapter);
  const ui = new TourUi(driver, {
    doneElementId: 'table-view',
    doneDescription: 'Voilà, the tour is done.',
  });
  return { driver, ui };
}

el('start-tour').addEventListener('click', () => {
  const { driver, ui } = makeUi();
  driver.play(tour());
  ui.start();
});

el('open-btn').addEventListener('click', () => { void adapter.loadFile('people.csv'); });
