// packages/gherkin-tour/index.ts
function classify(text) {
  const load = text.match(/^load "(.+)"$/);
  if (load)
    return { kind: "load-file", filename: load[1] };
  const lookup = text.match(/^load the lookup table "(.+)" with columns/);
  if (lookup)
    return { kind: "load-lookup", filename: lookup[1] };
  const chat = text.match(/^query "(.+)"$/);
  if (chat)
    return { kind: "prefill-chat", text: chat[1] };
  const golden = text.match(/^the expected output is "(.+)"$/);
  if (golden)
    return { kind: "golden-source", filename: golden[1] };
  if (text === "compare with the expected output")
    return { kind: "show-golden" };
  const audio = text.match(/^play audio "(.+)"$/);
  if (audio)
    return { kind: "play-audio", filename: audio[1] };
  return { kind: "display" };
}
var STEP_WORDS = new Set(["Given", "When", "Then", "And", "But"]);
function parseTours(source) {
  const result = [];
  let state = "idle";
  let docstringReturn = "idle";
  let topBg = [];
  let ruleBg = [];
  let inRule = false;
  let scenarioName = "";
  let scenarioTags = [];
  let scenarioSteps = [];
  let hasScenario = false;
  let pendingTags = [];
  function flush() {
    if (hasScenario) {
      const bg = inRule ? [...topBg, ...ruleBg] : [...topBg];
      const all = [...bg, ...scenarioSteps];
      let golden;
      for (const s of all) {
        if (s.action.kind === "golden-source") {
          golden = s.action.filename;
          break;
        }
      }
      const steps = all.filter((s) => s.action.kind !== "display" && s.action.kind !== "golden-source");
      const scenario = { name: scenarioName, tags: scenarioTags, steps };
      if (golden !== undefined)
        scenario.golden = golden;
      result.push(scenario);
    }
    hasScenario = false;
    scenarioName = "";
    scenarioTags = [];
    scenarioSteps = [];
  }
  for (const raw of source.split(`
`)) {
    const line = raw.trim();
    if (state === "docstring") {
      if (line === '"""')
        state = docstringReturn;
      continue;
    }
    if (line === '"""') {
      docstringReturn = state;
      state = "docstring";
      continue;
    }
    if (line === "" || line.startsWith("#"))
      continue;
    if (line.startsWith("Feature:"))
      continue;
    if (line.startsWith("Rule:")) {
      flush();
      ruleBg = [];
      inRule = true;
      state = "idle";
      continue;
    }
    if (line.startsWith("@")) {
      pendingTags = line.split(/\s+/).filter((t) => t.startsWith("@"));
      continue;
    }
    if (line.startsWith("Background:")) {
      flush();
      pendingTags = [];
      if (inRule) {
        ruleBg = [];
        state = "background";
      } else {
        topBg = [];
        state = "background";
      }
      continue;
    }
    if (line.startsWith("Scenario Outline:")) {
      flush();
      pendingTags = [];
      state = "outline";
      continue;
    }
    if (line.startsWith("Scenario:")) {
      flush();
      scenarioName = line.slice("Scenario:".length).trim();
      scenarioTags = pendingTags;
      scenarioSteps = [];
      hasScenario = true;
      pendingTags = [];
      state = "scenario";
      continue;
    }
    const keyword = line.split(/\s+/)[0] ?? "";
    if (STEP_WORDS.has(keyword)) {
      const text = line.slice(keyword.length).trim();
      const step = { keyword, text, action: classify(text) };
      if (state === "background") {
        inRule ? ruleBg.push(step) : topBg.push(step);
      } else if (state === "scenario") {
        scenarioSteps.push(step);
      }
      continue;
    }
  }
  flush();
  return result;
}

// packages/gherkin-tour/demo.ts
var sample = `Feature: Demo

  Background:
    Given load "people.csv"

  @tutorial
  Scenario: Filter adults
    When query "keep rows where age >= 18"
    Then the expected output is "adults.csv"
    And compare with the expected output
`;
var src = document.getElementById("src");
var out = document.getElementById("out");
src.value = sample;
function render() {
  try {
    out.textContent = JSON.stringify(parseTours(src.value), null, 2);
  } catch (e) {
    out.textContent = String(e);
  }
}
src.addEventListener("input", render);
render();
