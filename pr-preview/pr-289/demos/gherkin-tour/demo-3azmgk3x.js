// packages/gherkin-tour/index.ts
function classify(text) {
  const load = text.match(/^load "(.+)"$/);
  if (load)
    return { kind: "load-file", filename: load[1] };
  if (/^(?:user )?loads? the shuffled sample$/.test(text))
    return { kind: "load-shuffled" };
  if (/^(?:user )?opens? the run-on-all estimate dialog$/.test(text))
    return { kind: "open-estimate" };
  if (/^(?:user )?declines? the estimate with "Not yet"$/.test(text))
    return { kind: "decline-estimate" };
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
  const audio = text.match(/^speak "(.+)"$/);
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
  let featureTags = [];
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
      const steps = all.filter((s) => s.action.kind !== "display" && s.action.kind !== "golden-source" && s.action.kind !== "show-golden");
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
    if (line.startsWith('"""')) {
      docstringReturn = state;
      state = "docstring";
      continue;
    }
    if (line === "" || line.startsWith("#"))
      continue;
    if (line.startsWith("Feature:")) {
      featureTags = pendingTags;
      pendingTags = [];
      continue;
    }
    if (line.startsWith("Rule:")) {
      flush();
      ruleBg = [];
      inRule = true;
      state = "idle";
      continue;
    }
    if (line.startsWith("@")) {
      pendingTags.push(...line.split(/\s+/).filter((t) => t.startsWith("@")));
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
      scenarioTags = [...featureTags, ...pendingTags];
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

class TourDriver {
  tour = null;
  index = null;
  adapter;
  constructor(adapter) {
    this.adapter = adapter;
  }
  play(tour) {
    if (tour.steps.length === 0)
      return;
    this.tour = tour;
    this.index = 0;
  }
  async next() {
    if (this.index === null || !this.tour)
      return;
    const total = this.tour.steps.length;
    if (this.index >= total)
      return;
    await this.execute(this.tour.steps[this.index]);
    this.index = this.index < total - 1 ? this.index + 1 : total;
    if (this.index >= total && this.tour.golden !== undefined) {
      await this.adapter.showGolden(this.tour.golden);
    }
  }
  cancel() {
    this.tour = null;
    this.index = null;
  }
  finish() {
    this.cancel();
    this.adapter.onFinish();
  }
  stay() {
    this.cancel();
    this.adapter.onStay?.();
  }
  isActive() {
    return this.tour !== null && this.index !== null && this.index < this.tour.steps.length;
  }
  isDone() {
    return this.tour !== null && this.index !== null && this.index >= this.tour.steps.length;
  }
  currentStep() {
    if (!this.isActive() || !this.tour || this.index === null)
      return null;
    return this.tour.steps[this.index] ?? null;
  }
  currentStepElementId() {
    const step = this.currentStep();
    return step ? this.adapter.elementIdFor(step.action) : null;
  }
  currentStepNumber() {
    return this.isActive() && this.index !== null ? this.index + 1 : null;
  }
  stepCount() {
    return this.tour ? this.tour.steps.length + 1 : 0;
  }
  async execute(step) {
    const { action } = step;
    switch (action.kind) {
      case "load-file":
        await this.adapter.loadFile(action.filename);
        break;
      case "load-lookup":
        await this.adapter.loadLookup(action.filename);
        break;
      case "prefill-chat":
        await this.adapter.prefillChat(action.text);
        break;
      case "show-golden":
        await this.adapter.showGolden(this.tour?.golden);
        break;
      case "play-audio":
        await this.adapter.playAudio(action.filename);
        break;
      case "load-shuffled":
        await this.adapter.loadShuffled?.();
        break;
      case "open-estimate":
        await this.adapter.openEstimate?.();
        break;
      case "decline-estimate":
        await this.adapter.declineEstimate?.();
        break;
      case "golden-source":
      case "display":
        break;
    }
  }
}

// node_modules/.bun/driver.js@1.4.0/node_modules/driver.js/dist/driver.js.mjs
var z = {};
var J;
function F(e = {}) {
  z = {
    animate: true,
    allowClose: true,
    overlayClickBehavior: "close",
    overlayOpacity: 0.7,
    smoothScroll: false,
    disableActiveInteraction: false,
    showProgress: false,
    stagePadding: 10,
    stageRadius: 5,
    popoverOffset: 10,
    showButtons: ["next", "previous", "close"],
    disableButtons: [],
    overlayColor: "#000",
    ...e
  };
}
function s(e) {
  return e ? z[e] : z;
}
function le(e) {
  J = e;
}
function _() {
  return J;
}
var I = {};
function N(e, o) {
  I[e] = o;
}
function L(e) {
  var o;
  (o = I[e]) == null || o.call(I);
}
function de() {
  I = {};
}
function O(e, o, t, i) {
  return (e /= i / 2) < 1 ? t / 2 * e * e + o : -t / 2 * (--e * (e - 2) - 1) + o;
}
function U(e) {
  const o = 'a[href]:not([disabled]), button:not([disabled]), textarea:not([disabled]), input[type="text"]:not([disabled]), input[type="radio"]:not([disabled]), input[type="checkbox"]:not([disabled]), select:not([disabled])';
  return e.flatMap((t) => {
    const i = t.matches(o), d = Array.from(t.querySelectorAll(o));
    return [...i ? [t] : [], ...d];
  }).filter((t) => getComputedStyle(t).pointerEvents !== "none" && ve(t));
}
function ee(e) {
  if (!e || ue(e))
    return;
  const o = s("smoothScroll"), t = e.offsetHeight > window.innerHeight;
  e.scrollIntoView({
    behavior: !o || pe(e) ? "auto" : "smooth",
    inline: "center",
    block: t ? "start" : "center"
  });
}
function pe(e) {
  if (!e || !e.parentElement)
    return;
  const o = e.parentElement;
  return o.scrollHeight > o.clientHeight;
}
function ue(e) {
  const o = e.getBoundingClientRect();
  return o.top >= 0 && o.left >= 0 && o.bottom <= (window.innerHeight || document.documentElement.clientHeight) && o.right <= (window.innerWidth || document.documentElement.clientWidth);
}
function ve(e) {
  return !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
}
var D = {};
function k(e, o) {
  D[e] = o;
}
function l(e) {
  return e ? D[e] : D;
}
function X() {
  D = {};
}
function fe(e, o, t, i) {
  let d = l("__activeStagePosition");
  const n = d || t.getBoundingClientRect(), f = i.getBoundingClientRect(), w = O(e, n.x, f.x - n.x, o), r = O(e, n.y, f.y - n.y, o), v = O(e, n.width, f.width - n.width, o), g = O(e, n.height, f.height - n.height, o);
  d = {
    x: w,
    y: r,
    width: v,
    height: g
  }, oe(d), k("__activeStagePosition", d);
}
function te(e) {
  if (!e)
    return;
  const o = e.getBoundingClientRect(), t = {
    x: o.x,
    y: o.y,
    width: o.width,
    height: o.height
  };
  k("__activeStagePosition", t), oe(t);
}
function he() {
  const e = l("__activeStagePosition"), o = l("__overlaySvg");
  if (!e)
    return;
  if (!o) {
    console.warn("No stage svg found.");
    return;
  }
  const { innerWidth: t, innerHeight: i } = window;
  o.setAttribute("viewBox", `0 0 ${t} ${i}`);
}
function ge(e) {
  const o = we(e);
  document.body.appendChild(o), re(o, (t) => {
    t.target.tagName === "path" && L("overlayClick");
  }), k("__overlaySvg", o);
}
function oe(e) {
  const o = l("__overlaySvg");
  if (!o) {
    ge(e);
    return;
  }
  const t = o.firstElementChild;
  if ((t == null ? undefined : t.tagName) !== "path")
    throw new Error("no path element found in stage svg");
  t.setAttribute("d", ie(e));
}
function we(e) {
  const { innerWidth: o, innerHeight: t } = window, i = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  i.classList.add("driver-overlay", "driver-overlay-animated"), i.setAttribute("viewBox", `0 0 ${o} ${t}`), i.setAttribute("xmlSpace", "preserve"), i.setAttribute("xmlnsXlink", "http://www.w3.org/1999/xlink"), i.setAttribute("version", "1.1"), i.setAttribute("preserveAspectRatio", "xMinYMin slice"), i.style.fillRule = "evenodd", i.style.clipRule = "evenodd", i.style.strokeLinejoin = "round", i.style.strokeMiterlimit = "2", i.style.zIndex = "10000", i.style.position = "fixed", i.style.top = "0", i.style.left = "0", i.style.width = "100%", i.style.height = "100%";
  const d = document.createElementNS("http://www.w3.org/2000/svg", "path");
  return d.setAttribute("d", ie(e)), d.style.fill = s("overlayColor") || "rgb(0,0,0)", d.style.opacity = `${s("overlayOpacity")}`, d.style.pointerEvents = "auto", d.style.cursor = "auto", i.appendChild(d), i;
}
function ie(e) {
  const { innerWidth: o, innerHeight: t } = window, i = s("stagePadding") || 0, d = s("stageRadius") || 0, n = e.width + i * 2, f = e.height + i * 2, w = Math.min(d, n / 2, f / 2), r = Math.floor(Math.max(w, 0)), v = e.x - i + r, g = e.y - i, y = n - r * 2, a = f - r * 2;
  return `M${o},0L0,0L0,${t}L${o},${t}L${o},0Z
    M${v},${g} h${y} a${r},${r} 0 0 1 ${r},${r} v${a} a${r},${r} 0 0 1 -${r},${r} h-${y} a${r},${r} 0 0 1 -${r},-${r} v-${a} a${r},${r} 0 0 1 ${r},-${r} z`;
}
function me() {
  const e = l("__overlaySvg");
  e && e.remove();
}
function ye() {
  const e = document.getElementById("driver-dummy-element");
  if (e)
    return e;
  let o = document.createElement("div");
  return o.id = "driver-dummy-element", o.style.width = "0", o.style.height = "0", o.style.pointerEvents = "none", o.style.opacity = "0", o.style.position = "fixed", o.style.top = "50%", o.style.left = "50%", document.body.appendChild(o), o;
}
function j(e) {
  const { element: o } = e;
  let t = typeof o == "function" ? o() : typeof o == "string" ? document.querySelector(o) : o;
  t || (t = ye()), be(t, e);
}
function xe() {
  const e = l("__activeElement"), o = l("__activeStep");
  e && (te(e), he(), ae(e, o));
}
function be(e, o) {
  var C;
  const i = Date.now(), d = l("__activeStep"), n = l("__activeElement") || e, f = !n || n === e, w = e.id === "driver-dummy-element", r = n.id === "driver-dummy-element", v = s("animate"), g = o.onHighlightStarted || s("onHighlightStarted"), y = (o == null ? undefined : o.onHighlighted) || s("onHighlighted"), a = (d == null ? undefined : d.onDeselected) || s("onDeselected"), p = s(), c = l();
  !f && a && a(r ? undefined : n, d, {
    config: p,
    state: c,
    driver: _()
  }), g && g(w ? undefined : e, o, {
    config: p,
    state: c,
    driver: _()
  });
  const u = !f && v;
  let h = false;
  Se(), k("previousStep", d), k("previousElement", n), k("activeStep", o), k("activeElement", e);
  const m = () => {
    if (l("__transitionCallback") !== m)
      return;
    const b = Date.now() - i, E = 400 - b <= 400 / 2;
    o.popover && E && !h && u && (Q(e, o), h = true), s("animate") && b < 400 ? fe(b, 400, n, e) : (te(e), y && y(w ? undefined : e, o, {
      config: s(),
      state: l(),
      driver: _()
    }), k("__transitionCallback", undefined), k("__previousStep", d), k("__previousElement", n), k("__activeStep", o), k("__activeElement", e)), window.requestAnimationFrame(m);
  };
  k("__transitionCallback", m), window.requestAnimationFrame(m), ee(e), !u && o.popover && Q(e, o), n.classList.remove("driver-active-element", "driver-no-interaction"), n.removeAttribute("aria-haspopup"), n.removeAttribute("aria-expanded"), n.removeAttribute("aria-controls"), ((C = o.disableActiveInteraction) != null ? C : s("disableActiveInteraction")) && e.classList.add("driver-no-interaction"), e.classList.add("driver-active-element"), e.setAttribute("aria-haspopup", "dialog"), e.setAttribute("aria-expanded", "true"), e.setAttribute("aria-controls", "driver-popover-content");
}
function Ce() {
  var e;
  (e = document.getElementById("driver-dummy-element")) == null || e.remove(), document.querySelectorAll(".driver-active-element").forEach((o) => {
    o.classList.remove("driver-active-element", "driver-no-interaction"), o.removeAttribute("aria-haspopup"), o.removeAttribute("aria-expanded"), o.removeAttribute("aria-controls");
  });
}
function M() {
  const e = l("__resizeTimeout");
  e && window.cancelAnimationFrame(e), k("__resizeTimeout", window.requestAnimationFrame(xe));
}
function Pe(e) {
  var r;
  if (!l("isInitialized") || !(e.key === "Tab" || e.keyCode === 9))
    return;
  const i = l("__activeElement"), d = (r = l("popover")) == null ? undefined : r.wrapper, n = U([
    ...d ? [d] : [],
    ...i ? [i] : []
  ]), f = n[0], w = n[n.length - 1];
  if (e.preventDefault(), e.shiftKey) {
    const v = n[n.indexOf(document.activeElement) - 1] || w;
    v == null || v.focus();
  } else {
    const v = n[n.indexOf(document.activeElement) + 1] || f;
    v == null || v.focus();
  }
}
function ne(e) {
  var t;
  ((t = s("allowKeyboardControl")) == null || t) && (e.key === "Escape" ? L("escapePress") : e.key === "ArrowRight" ? L("arrowRightPress") : e.key === "ArrowLeft" && L("arrowLeftPress"));
}
function re(e, o, t) {
  const i = (n, f) => {
    const w = n.target;
    e.contains(w) && ((!t || t(w)) && (n.preventDefault(), n.stopPropagation(), n.stopImmediatePropagation()), f == null || f(n));
  };
  document.addEventListener("pointerdown", i, true), document.addEventListener("mousedown", i, true), document.addEventListener("pointerup", i, true), document.addEventListener("mouseup", i, true), document.addEventListener("click", (n) => {
    i(n, o);
  }, true);
}
function ke() {
  window.addEventListener("keyup", ne, false), window.addEventListener("keydown", Pe, false), window.addEventListener("resize", M), window.addEventListener("scroll", M);
}
function _e() {
  window.removeEventListener("keyup", ne), window.removeEventListener("resize", M), window.removeEventListener("scroll", M);
}
function Se() {
  const e = l("popover");
  e && (e.wrapper.style.display = "none");
}
function Q(e, o) {
  var b, P;
  let t = l("popover");
  t && document.body.removeChild(t.wrapper), t = Le(), document.body.appendChild(t.wrapper);
  const {
    title: i,
    description: d,
    showButtons: n,
    disableButtons: f,
    showProgress: w,
    nextBtnText: r = s("nextBtnText") || "Next &rarr;",
    prevBtnText: v = s("prevBtnText") || "&larr; Previous",
    progressText: g = s("progressText") || "{current} of {total}"
  } = o.popover || {};
  t.nextButton.innerHTML = r, t.previousButton.innerHTML = v, t.progress.innerHTML = g, i ? (t.title.innerHTML = i, t.title.style.display = "block") : t.title.style.display = "none", d ? (t.description.innerHTML = d, t.description.style.display = "block") : t.description.style.display = "none";
  const y = n || s("showButtons"), a = w || s("showProgress") || false, p = (y == null ? undefined : y.includes("next")) || (y == null ? undefined : y.includes("previous")) || a;
  t.closeButton.style.display = y.includes("close") ? "block" : "none", p ? (t.footer.style.display = "flex", t.progress.style.display = a ? "block" : "none", t.nextButton.style.display = y.includes("next") ? "block" : "none", t.previousButton.style.display = y.includes("previous") ? "block" : "none") : t.footer.style.display = "none";
  const c = f || s("disableButtons") || [];
  c != null && c.includes("next") && (t.nextButton.disabled = true, t.nextButton.classList.add("driver-popover-btn-disabled")), c != null && c.includes("previous") && (t.previousButton.disabled = true, t.previousButton.classList.add("driver-popover-btn-disabled")), c != null && c.includes("close") && (t.closeButton.disabled = true, t.closeButton.classList.add("driver-popover-btn-disabled"));
  const u = t.wrapper;
  u.style.display = "block", u.style.left = "", u.style.top = "", u.style.bottom = "", u.style.right = "", u.id = "driver-popover-content", u.setAttribute("role", "dialog"), u.setAttribute("aria-labelledby", "driver-popover-title"), u.setAttribute("aria-describedby", "driver-popover-description");
  const h = t.arrow;
  h.className = "driver-popover-arrow";
  const m = ((b = o.popover) == null ? undefined : b.popoverClass) || s("popoverClass") || "";
  u.className = `driver-popover ${m}`.trim(), re(t.wrapper, (E) => {
    var B, R, W;
    const T = E.target, A = ((B = o.popover) == null ? undefined : B.onNextClick) || s("onNextClick"), H = ((R = o.popover) == null ? undefined : R.onPrevClick) || s("onPrevClick"), $ = ((W = o.popover) == null ? undefined : W.onCloseClick) || s("onCloseClick");
    if (T.closest(".driver-popover-next-btn"))
      return A ? A(e, o, {
        config: s(),
        state: l(),
        driver: _()
      }) : L("nextClick");
    if (T.closest(".driver-popover-prev-btn"))
      return H ? H(e, o, {
        config: s(),
        state: l(),
        driver: _()
      }) : L("prevClick");
    if (T.closest(".driver-popover-close-btn"))
      return $ ? $(e, o, {
        config: s(),
        state: l(),
        driver: _()
      }) : L("closeClick");
  }, (E) => !(t != null && t.description.contains(E)) && !(t != null && t.title.contains(E)) && typeof E.className == "string" && E.className.includes("driver-popover")), k("popover", t);
  const x = ((P = o.popover) == null ? undefined : P.onPopoverRender) || s("onPopoverRender");
  x && x(t, {
    config: s(),
    state: l(),
    driver: _()
  }), ae(e, o), ee(u);
  const C = e.classList.contains("driver-dummy-element"), S = U([u, ...C ? [] : [e]]);
  S.length > 0 && S[0].focus();
}
function se() {
  const e = l("popover");
  if (!(e != null && e.wrapper))
    return;
  const o = e.wrapper.getBoundingClientRect(), t = s("stagePadding") || 0, i = s("popoverOffset") || 0;
  return {
    width: o.width + t + i,
    height: o.height + t + i,
    realWidth: o.width,
    realHeight: o.height
  };
}
function Z(e, o) {
  const { elementDimensions: t, popoverDimensions: i, popoverPadding: d, popoverArrowDimensions: n } = o;
  return e === "start" ? Math.max(Math.min(t.top - d, window.innerHeight - i.realHeight - n.width), n.width) : e === "end" ? Math.max(Math.min(t.top - (i == null ? undefined : i.realHeight) + t.height + d, window.innerHeight - (i == null ? undefined : i.realHeight) - n.width), n.width) : e === "center" ? Math.max(Math.min(t.top + t.height / 2 - (i == null ? undefined : i.realHeight) / 2, window.innerHeight - (i == null ? undefined : i.realHeight) - n.width), n.width) : 0;
}
function G(e, o) {
  const { elementDimensions: t, popoverDimensions: i, popoverPadding: d, popoverArrowDimensions: n } = o;
  return e === "start" ? Math.max(Math.min(t.left - d, window.innerWidth - i.realWidth - n.width), n.width) : e === "end" ? Math.max(Math.min(t.left - (i == null ? undefined : i.realWidth) + t.width + d, window.innerWidth - (i == null ? undefined : i.realWidth) - n.width), n.width) : e === "center" ? Math.max(Math.min(t.left + t.width / 2 - (i == null ? undefined : i.realWidth) / 2, window.innerWidth - (i == null ? undefined : i.realWidth) - n.width), n.width) : 0;
}
function ae(e, o) {
  const t = l("popover");
  if (!t)
    return;
  const { align: i = "start", side: d = "left" } = (o == null ? undefined : o.popover) || {}, n = i, f = e.id === "driver-dummy-element" ? "over" : d, w = s("stagePadding") || 0, r = se(), v = t.arrow.getBoundingClientRect(), g = e.getBoundingClientRect(), y = g.top - r.height;
  let a = y >= 0;
  const p = window.innerHeight - (g.bottom + r.height);
  let c = p >= 0;
  const u = g.left - r.width;
  let h = u >= 0;
  const m = window.innerWidth - (g.right + r.width);
  let x = m >= 0;
  const C = !a && !c && !h && !x;
  let S = f;
  if (f === "top" && a ? x = h = c = false : f === "bottom" && c ? x = h = a = false : f === "left" && h ? x = a = c = false : f === "right" && x && (h = a = c = false), f === "over") {
    const b = window.innerWidth / 2 - r.realWidth / 2, P = window.innerHeight / 2 - r.realHeight / 2;
    t.wrapper.style.left = `${b}px`, t.wrapper.style.right = "auto", t.wrapper.style.top = `${P}px`, t.wrapper.style.bottom = "auto";
  } else if (C) {
    const b = window.innerWidth / 2 - (r == null ? undefined : r.realWidth) / 2, P = 10;
    t.wrapper.style.left = `${b}px`, t.wrapper.style.right = "auto", t.wrapper.style.bottom = `${P}px`, t.wrapper.style.top = "auto";
  } else if (h) {
    const b = Math.min(u, window.innerWidth - (r == null ? undefined : r.realWidth) - v.width), P = Z(n, {
      elementDimensions: g,
      popoverDimensions: r,
      popoverPadding: w,
      popoverArrowDimensions: v
    });
    t.wrapper.style.left = `${b}px`, t.wrapper.style.top = `${P}px`, t.wrapper.style.bottom = "auto", t.wrapper.style.right = "auto", S = "left";
  } else if (x) {
    const b = Math.min(m, window.innerWidth - (r == null ? undefined : r.realWidth) - v.width), P = Z(n, {
      elementDimensions: g,
      popoverDimensions: r,
      popoverPadding: w,
      popoverArrowDimensions: v
    });
    t.wrapper.style.right = `${b}px`, t.wrapper.style.top = `${P}px`, t.wrapper.style.bottom = "auto", t.wrapper.style.left = "auto", S = "right";
  } else if (a) {
    const b = Math.min(y, window.innerHeight - r.realHeight - v.width);
    let P = G(n, {
      elementDimensions: g,
      popoverDimensions: r,
      popoverPadding: w,
      popoverArrowDimensions: v
    });
    t.wrapper.style.top = `${b}px`, t.wrapper.style.left = `${P}px`, t.wrapper.style.bottom = "auto", t.wrapper.style.right = "auto", S = "top";
  } else if (c) {
    const b = Math.min(p, window.innerHeight - (r == null ? undefined : r.realHeight) - v.width);
    let P = G(n, {
      elementDimensions: g,
      popoverDimensions: r,
      popoverPadding: w,
      popoverArrowDimensions: v
    });
    t.wrapper.style.left = `${P}px`, t.wrapper.style.bottom = `${b}px`, t.wrapper.style.top = "auto", t.wrapper.style.right = "auto", S = "bottom";
  }
  C ? t.arrow.classList.add("driver-popover-arrow-none") : Ee(n, S, e);
}
function Ee(e, o, t) {
  const i = l("popover");
  if (!i)
    return;
  const d = t.getBoundingClientRect(), n = se(), f = i.arrow, w = n.width, r = window.innerWidth, v = d.width, g = d.left, y = n.height, a = window.innerHeight, p = d.top, c = d.height;
  f.className = "driver-popover-arrow";
  let u = o, h = e;
  if (o === "top" ? (g + v <= 0 ? (u = "right", h = "end") : g + v - w <= 0 && (u = "top", h = "start"), g >= r ? (u = "left", h = "end") : g + w >= r && (u = "top", h = "end")) : o === "bottom" ? (g + v <= 0 ? (u = "right", h = "start") : g + v - w <= 0 && (u = "bottom", h = "start"), g >= r ? (u = "left", h = "start") : g + w >= r && (u = "bottom", h = "end")) : o === "left" ? (p + c <= 0 ? (u = "bottom", h = "end") : p + c - y <= 0 && (u = "left", h = "start"), p >= a ? (u = "top", h = "end") : p + y >= a && (u = "left", h = "end")) : o === "right" && (p + c <= 0 ? (u = "bottom", h = "start") : p + c - y <= 0 && (u = "right", h = "start"), p >= a ? (u = "top", h = "start") : p + y >= a && (u = "right", h = "end")), !u)
    f.classList.add("driver-popover-arrow-none");
  else {
    f.classList.add(`driver-popover-arrow-side-${u}`), f.classList.add(`driver-popover-arrow-align-${h}`);
    const m = t.getBoundingClientRect(), x = f.getBoundingClientRect(), C = s("stagePadding") || 0, S = m.left - C < window.innerWidth && m.right + C > 0 && m.top - C < window.innerHeight && m.bottom + C > 0;
    o === "bottom" && S && (x.x > m.x && x.x + x.width < m.x + m.width ? i.wrapper.style.transform = "translateY(0)" : (f.classList.remove(`driver-popover-arrow-align-${h}`), f.classList.add("driver-popover-arrow-none"), i.wrapper.style.transform = `translateY(-${C / 2}px)`));
  }
}
function Le() {
  const e = document.createElement("div");
  e.classList.add("driver-popover");
  const o = document.createElement("div");
  o.classList.add("driver-popover-arrow");
  const t = document.createElement("header");
  t.id = "driver-popover-title", t.classList.add("driver-popover-title"), t.style.display = "none", t.innerText = "Popover Title";
  const i = document.createElement("div");
  i.id = "driver-popover-description", i.classList.add("driver-popover-description"), i.style.display = "none", i.innerText = "Popover description is here";
  const d = document.createElement("button");
  d.type = "button", d.classList.add("driver-popover-close-btn"), d.setAttribute("aria-label", "Close"), d.innerHTML = "&times;";
  const n = document.createElement("footer");
  n.classList.add("driver-popover-footer");
  const f = document.createElement("span");
  f.classList.add("driver-popover-progress-text"), f.innerText = "";
  const w = document.createElement("span");
  w.classList.add("driver-popover-navigation-btns");
  const r = document.createElement("button");
  r.type = "button", r.classList.add("driver-popover-prev-btn"), r.innerHTML = "&larr; Previous";
  const v = document.createElement("button");
  return v.type = "button", v.classList.add("driver-popover-next-btn"), v.innerHTML = "Next &rarr;", w.appendChild(r), w.appendChild(v), n.appendChild(f), n.appendChild(w), e.appendChild(d), e.appendChild(o), e.appendChild(t), e.appendChild(i), e.appendChild(n), {
    wrapper: e,
    arrow: o,
    title: t,
    description: i,
    footer: n,
    previousButton: r,
    nextButton: v,
    closeButton: d,
    footerButtons: w,
    progress: f
  };
}
function Te() {
  var o;
  const e = l("popover");
  e && ((o = e.wrapper.parentElement) == null || o.removeChild(e.wrapper));
}
function Ae(e = {}) {
  F(e);
  function o() {
    s("allowClose") && g();
  }
  function t() {
    const a = s("overlayClickBehavior");
    if (s("allowClose") && a === "close") {
      g();
      return;
    }
    if (typeof a == "function") {
      const p = l("__activeStep"), c = l("__activeElement");
      a(c, p, {
        config: s(),
        state: l(),
        driver: _()
      });
      return;
    }
    a === "nextStep" && i();
  }
  function i() {
    const a = l("activeIndex"), p = s("steps") || [];
    if (typeof a == "undefined")
      return;
    const c = a + 1;
    p[c] ? v(c) : g();
  }
  function d() {
    const a = l("activeIndex"), p = s("steps") || [];
    if (typeof a == "undefined")
      return;
    const c = a - 1;
    p[c] ? v(c) : g();
  }
  function n(a) {
    (s("steps") || [])[a] ? v(a) : g();
  }
  function f() {
    var x;
    if (l("__transitionCallback"))
      return;
    const p = l("activeIndex"), c = l("__activeStep"), u = l("__activeElement");
    if (typeof p == "undefined" || typeof c == "undefined" || typeof l("activeIndex") == "undefined")
      return;
    const m = ((x = c.popover) == null ? undefined : x.onPrevClick) || s("onPrevClick");
    if (m)
      return m(u, c, {
        config: s(),
        state: l(),
        driver: _()
      });
    d();
  }
  function w() {
    var m;
    if (l("__transitionCallback"))
      return;
    const p = l("activeIndex"), c = l("__activeStep"), u = l("__activeElement");
    if (typeof p == "undefined" || typeof c == "undefined")
      return;
    const h = ((m = c.popover) == null ? undefined : m.onNextClick) || s("onNextClick");
    if (h)
      return h(u, c, {
        config: s(),
        state: l(),
        driver: _()
      });
    i();
  }
  function r() {
    l("isInitialized") || (k("isInitialized", true), document.body.classList.add("driver-active", s("animate") ? "driver-fade" : "driver-simple"), ke(), N("overlayClick", t), N("escapePress", o), N("arrowLeftPress", f), N("arrowRightPress", w));
  }
  function v(a = 0) {
    var $, B, R, W, V, q, K, Y;
    const p = s("steps");
    if (!p) {
      console.error("No steps to drive through"), g();
      return;
    }
    if (!p[a]) {
      g();
      return;
    }
    k("__activeOnDestroyed", document.activeElement), k("activeIndex", a);
    const c = p[a], u = p[a + 1], h = p[a - 1], m = (($ = c.popover) == null ? undefined : $.doneBtnText) || s("doneBtnText") || "Done", x = s("allowClose"), C = typeof ((B = c.popover) == null ? undefined : B.showProgress) != "undefined" ? (R = c.popover) == null ? undefined : R.showProgress : s("showProgress"), b = (((W = c.popover) == null ? undefined : W.progressText) || s("progressText") || "{{current}} of {{total}}").replace("{{current}}", `${a + 1}`).replace("{{total}}", `${p.length}`), P = ((V = c.popover) == null ? undefined : V.showButtons) || s("showButtons"), E = [
      "next",
      "previous",
      ...x ? ["close"] : []
    ].filter((ce) => !(P != null && P.length) || P.includes(ce)), T = ((q = c.popover) == null ? undefined : q.onNextClick) || s("onNextClick"), A = ((K = c.popover) == null ? undefined : K.onPrevClick) || s("onPrevClick"), H = ((Y = c.popover) == null ? undefined : Y.onCloseClick) || s("onCloseClick");
    j({
      ...c,
      popover: {
        showButtons: E,
        nextBtnText: u ? undefined : m,
        disableButtons: [...h ? [] : ["previous"]],
        showProgress: C,
        progressText: b,
        onNextClick: T || (() => {
          u ? v(a + 1) : g();
        }),
        onPrevClick: A || (() => {
          v(a - 1);
        }),
        onCloseClick: H || (() => {
          g();
        }),
        ...(c == null ? undefined : c.popover) || {}
      }
    });
  }
  function g(a = true) {
    const p = l("__activeElement"), c = l("__activeStep"), u = l("__activeOnDestroyed"), h = s("onDestroyStarted");
    if (a && h) {
      const C = !p || (p == null ? undefined : p.id) === "driver-dummy-element";
      h(C ? undefined : p, c, {
        config: s(),
        state: l(),
        driver: _()
      });
      return;
    }
    const m = (c == null ? undefined : c.onDeselected) || s("onDeselected"), x = s("onDestroyed");
    if (document.body.classList.remove("driver-active", "driver-fade", "driver-simple"), _e(), Te(), Ce(), me(), de(), X(), p && c) {
      const C = p.id === "driver-dummy-element";
      m && m(C ? undefined : p, c, {
        config: s(),
        state: l(),
        driver: _()
      }), x && x(C ? undefined : p, c, {
        config: s(),
        state: l(),
        driver: _()
      });
    }
    u && u.focus();
  }
  const y = {
    isActive: () => l("isInitialized") || false,
    refresh: M,
    drive: (a = 0) => {
      r(), v(a);
    },
    setConfig: F,
    setSteps: (a) => {
      X(), F({
        ...s(),
        steps: a
      });
    },
    getConfig: s,
    getState: l,
    getActiveIndex: () => l("activeIndex"),
    isFirstStep: () => l("activeIndex") === 0,
    isLastStep: () => {
      const a = s("steps") || [], p = l("activeIndex");
      return p !== undefined && p === a.length - 1;
    },
    getActiveStep: () => l("activeStep"),
    getActiveElement: () => l("activeElement"),
    getPreviousElement: () => l("previousElement"),
    getPreviousStep: () => l("previousStep"),
    moveNext: i,
    movePrevious: d,
    moveTo: n,
    hasNextStep: () => {
      const a = s("steps") || [], p = l("activeIndex");
      return p !== undefined && !!a[p + 1];
    },
    hasPreviousStep: () => {
      const a = s("steps") || [], p = l("activeIndex");
      return p !== undefined && !!a[p - 1];
    },
    highlight: (a) => {
      r(), j({
        ...a,
        popover: a.popover ? {
          showButtons: [],
          showProgress: false,
          progressText: "",
          ...a.popover
        } : undefined
      });
    },
    destroy: () => {
      g(false);
    }
  };
  return le(y), y;
}

// packages/gherkin-tour/ui.ts
class TourUi {
  tour;
  opts;
  d = null;
  silentDestroy = false;
  keyHandler = null;
  retryTimer = null;
  retryFor = null;
  retries = 0;
  proxy = null;
  wheelHandler = null;
  touchStartHandler = null;
  touchMoveHandler = null;
  lastTouch = null;
  scrollHit = null;
  constructor(tour, opts) {
    this.tour = tour;
    this.opts = opts;
  }
  start() {
    this.attachKeyboard();
    this.attachScrollForwarding();
    this.render();
  }
  render() {
    const active = this.tour.isActive();
    const done = this.tour.isDone();
    if (!active && !done) {
      this.clearRetry();
      this.destroyOverlay();
      this.opts.onChange?.();
      return;
    }
    const elementId = done ? this.opts.doneElementId : this.tour.currentStepElementId();
    const el = elementId ? document.getElementById(elementId) : null;
    if (!el) {
      this.scheduleRetry(elementId);
      return;
    }
    this.clearRetry();
    this.destroyOverlay();
    const total = this.tour.stepCount();
    const num = done ? total : this.tour.currentStepNumber() ?? 1;
    const description = done ? this.opts.doneDescription ?? "Done." : asInstruction(this.tour.currentStep()?.text ?? "");
    const canStay = done && typeof this.tour.stay === "function";
    const d = Ae({
      animate: true,
      overlayOpacity: 0.25,
      allowClose: true,
      disableActiveInteraction: true,
      overlayClickBehavior: () => {},
      onDestroyStarted: () => {
        if (this.silentDestroy)
          return;
        if (canStay)
          this.stay();
        else
          this.cancel();
      },
      onPopoverRender: (popover) => {
        this.applyTheme(popover.wrapper);
      }
    });
    this.d = d;
    d.highlight({
      element: this.spotlightTarget(el),
      popover: {
        description,
        side: "bottom",
        align: "start",
        showButtons: canStay ? ["previous", "next"] : ["next"],
        showProgress: true,
        progressText: `${num} of ${total}`,
        nextBtnText: done ? this.opts.doneBtnText ?? "Done" : "Next &rarr;",
        prevBtnText: this.opts.stayBtnText ?? "Stay here",
        onNextClick: () => {
          if (done)
            this.finish();
          else
            this.advance();
        },
        onPrevClick: () => {
          this.stay();
        },
        onCloseClick: () => {
          if (canStay)
            this.stay();
          else
            this.cancel();
        }
      }
    });
    this.opts.onChange?.();
  }
  destroy() {
    this.clearRetry();
    this.destroyOverlay();
    this.detachKeyboard();
    this.detachScrollForwarding();
  }
  scheduleRetry(elementId) {
    if (this.retryFor !== elementId) {
      this.retryFor = elementId;
      this.retries = 0;
    }
    if (this.retries >= 25)
      return;
    this.retries += 1;
    if (this.retryTimer)
      clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.render();
    }, 80);
  }
  clearRetry() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.retryFor = null;
    this.retries = 0;
  }
  applyTheme(wrapper) {
    const theme = this.opts.theme;
    if (!theme)
      return;
    if (theme.background)
      wrapper.style.background = theme.background;
    if (theme.text)
      wrapper.style.color = theme.text;
    if (theme.border) {
      wrapper.style.borderStyle = "solid";
      wrapper.style.borderWidth = "1px";
      wrapper.style.borderColor = theme.border;
    }
    const desc = wrapper.querySelector(".driver-popover-description");
    if (desc && theme.text)
      desc.style.color = theme.text;
    const progress = wrapper.querySelector(".driver-popover-progress-text");
    if (progress && theme.text)
      progress.style.color = theme.text;
    const next = wrapper.querySelector(".driver-popover-next-btn");
    if (next) {
      next.style.textShadow = "none";
      const bg = theme.primaryBg ?? theme.accent;
      const fg = theme.primaryText ?? theme.background;
      if (bg) {
        next.style.background = bg;
        next.style.borderColor = bg;
      }
      if (fg)
        next.style.color = fg;
    }
    const prev = wrapper.querySelector(".driver-popover-prev-btn");
    if (prev) {
      prev.style.textShadow = "none";
      if (theme.background)
        prev.style.background = theme.background;
      if (theme.border)
        prev.style.borderColor = theme.border;
      if (theme.text)
        prev.style.color = theme.text;
    }
    if (theme.background) {
      const arrow = wrapper.querySelector(".driver-popover-arrow");
      const side = ["top", "bottom", "left", "right"].find((s2) => arrow?.classList.contains(`driver-popover-arrow-side-${s2}`));
      if (arrow && side) {
        const prop = `border${side[0].toUpperCase()}${side.slice(1)}Color`;
        arrow.style[prop] = theme.background;
      }
    }
  }
  async advance() {
    await this.tour.next();
    this.render();
  }
  finish() {
    this.tour.finish();
    this.render();
    this.detachKeyboard();
    this.detachScrollForwarding();
  }
  stay() {
    this.tour.stay?.();
    this.render();
    this.detachKeyboard();
    this.detachScrollForwarding();
  }
  cancel() {
    this.tour.cancel();
    this.render();
    this.detachKeyboard();
    this.detachScrollForwarding();
  }
  attachScrollForwarding() {
    if (this.wheelHandler)
      return;
    this.wheelHandler = (e) => {
      if (!this.d || this.overPopover(e.target))
        return;
      const el = this.scrollableAt(e.clientX, e.clientY);
      if (!el)
        return;
      const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      el.scrollLeft += e.deltaX * scale;
      el.scrollTop += e.deltaY * scale;
      e.preventDefault();
    };
    this.touchStartHandler = (e) => {
      const t = e.touches.length === 1 ? e.touches[0] : undefined;
      this.lastTouch = this.d && t ? { x: t.clientX, y: t.clientY } : null;
    };
    this.touchMoveHandler = (e) => {
      const t = e.touches.length === 1 ? e.touches[0] : undefined;
      if (!this.d || !t || !this.lastTouch || this.overPopover(e.target))
        return;
      const dx = this.lastTouch.x - t.clientX;
      const dy = this.lastTouch.y - t.clientY;
      this.lastTouch = { x: t.clientX, y: t.clientY };
      const el = this.scrollableAt(t.clientX, t.clientY);
      if (!el)
        return;
      el.scrollLeft += dx;
      el.scrollTop += dy;
      e.preventDefault();
    };
    window.addEventListener("wheel", this.wheelHandler, { passive: false, capture: true });
    window.addEventListener("touchstart", this.touchStartHandler, { passive: true, capture: true });
    window.addEventListener("touchmove", this.touchMoveHandler, { passive: false, capture: true });
  }
  detachScrollForwarding() {
    if (this.wheelHandler)
      window.removeEventListener("wheel", this.wheelHandler, { capture: true });
    if (this.touchStartHandler)
      window.removeEventListener("touchstart", this.touchStartHandler, { capture: true });
    if (this.touchMoveHandler)
      window.removeEventListener("touchmove", this.touchMoveHandler, { capture: true });
    this.wheelHandler = null;
    this.touchStartHandler = null;
    this.touchMoveHandler = null;
    this.lastTouch = null;
    this.scrollHit = null;
  }
  overPopover(target) {
    return target instanceof Element && target.closest(".driver-popover") !== null;
  }
  scrollableAt(x, y) {
    const now = Date.now();
    const hit = this.scrollHit;
    if (hit && now - hit.at < 300 && hit.el.isConnected) {
      const r = hit.el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        hit.at = now;
        return hit.el;
      }
    }
    let best = null;
    let bestArea = Infinity;
    for (const el of document.body.querySelectorAll("*")) {
      if (el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1)
        continue;
      if (el.closest(".driver-popover") || el.hasAttribute("data-gt-spotlight-proxy"))
        continue;
      const r = el.getBoundingClientRect();
      if (x < r.left || x > r.right || y < r.top || y > r.bottom)
        continue;
      const s2 = getComputedStyle(el);
      if (!/(auto|scroll)/.test(s2.overflowY + s2.overflowX))
        continue;
      const area = r.width * r.height;
      if (area < bestArea) {
        best = el;
        bestArea = area;
      }
    }
    this.scrollHit = best ? { el: best, at: now } : null;
    return best;
  }
  spotlightTarget(el) {
    this.removeProxy();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxH = vh * 0.55;
    let rect = el.getBoundingClientRect();
    if (rect.height <= maxH && rect.width <= vw)
      return el;
    if (Math.min(rect.bottom, vh) - Math.max(rect.top, 0) < 40) {
      el.scrollIntoView({ block: "nearest" });
      rect = el.getBoundingClientRect();
    }
    const top = Math.max(rect.top, 0);
    const left = Math.max(rect.left, 0);
    const width = Math.min(rect.right, vw) - left;
    const height = Math.min(Math.min(rect.bottom, vh) - top, maxH);
    const proxy = document.createElement("div");
    proxy.setAttribute("data-gt-spotlight-proxy", "");
    proxy.style.cssText = `position:fixed;top:${top}px;left:${left}px;width:${width}px;height:${height}px;` + "pointer-events:none;";
    document.body.appendChild(proxy);
    this.proxy = proxy;
    return proxy;
  }
  removeProxy() {
    this.proxy?.remove();
    this.proxy = null;
  }
  destroyOverlay() {
    this.silentDestroy = true;
    this.d?.destroy();
    this.d = null;
    this.silentDestroy = false;
    this.removeProxy();
  }
  attachKeyboard() {
    if (this.keyHandler)
      return;
    this.keyHandler = (e) => {
      const done = this.tour.isDone();
      if (!this.tour.isActive() && !done)
        return;
      if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (done)
          this.finish();
        else
          this.advance();
      }
    };
    window.addEventListener("keydown", this.keyHandler);
  }
  detachKeyboard() {
    if (!this.keyHandler)
      return;
    window.removeEventListener("keydown", this.keyHandler);
    this.keyHandler = null;
  }
}
function asInstruction(text) {
  if (/^query "(.+)"$/.test(text))
    return "Typing and running the query…";
  if (/^speak "(.+)"$/.test(text))
    return "Speaking and running the voice query…";
  const load = text.match(/^load "(.+)"$/);
  if (load)
    return `Opening the sample "${load[1]}"…`;
  if (/^loads? the shuffled sample$/.test(text))
    return "Loading the shuffled sample…";
  if (/^opens? the run-on-all estimate dialog$/.test(text))
    return "Opening the run-on-all estimate…";
  if (/^declines? the estimate with "Not yet"$/.test(text)) {
    return 'The "Run on all rows?" dialog estimates the time and cost of cleaning the remaining 24,900 rows. Choosing "Not yet" because it would take some time.';
  }
  return text.length === 0 ? text : `${text.charAt(0).toUpperCase()}${text.slice(1)}…`;
}

// packages/gherkin-tour/demo.ts
var featureText = `Feature: Tour the gherkin-tour demo

  Background:
    Given load "people.csv"

  @tour
  Scenario: A quick tour of this page
    When query "keep rows where age >= 18"
    And speak "chime"
    Then the expected output is "adults"
    And compare with the expected output
`;
var PEOPLE = [
  { name: "Ada", age: 36 },
  { name: "Cody", age: 14 },
  { name: "Mira", age: 27 },
  { name: "Sam", age: 9 },
  { name: "Iris", age: 41 },
  { name: "Leo", age: 8 },
  { name: "Noor", age: 22 },
  { name: "Pia", age: 61 },
  { name: "Ravi", age: 17 },
  { name: "Tess", age: 33 }
];
var ADULTS = PEOPLE.filter((r) => r.age >= 18);
var el = (id) => document.getElementById(id);
var chatInput = el("chat-input");
var tableView = el("table-view");
var status = el("status");
el("feature").textContent = featureText;
el("out").textContent = JSON.stringify(parseTours(featureText), null, 2);
function setStatus(msg) {
  status.textContent = msg;
}
function renderTable(rows) {
  if (rows.length === 0) {
    tableView.textContent = "No data loaded.";
    return;
  }
  const cols = Object.keys(rows[0]);
  const head = `<tr>${cols.map((c) => `<th>${c}</th>`).join("")}</tr>`;
  const body = rows.map((r) => `<tr>${cols.map((c) => `<td>${String(r[c])}</td>`).join("")}</tr>`).join("");
  tableView.innerHTML = `<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
}
function playChime() {
  return new Promise((resolve) => {
    try {
      const Ctx = window.AudioContext ?? window.webkitAudioContext;
      const ctx = new Ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 660;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
      osc.onended = () => {
        ctx.close().catch(() => {});
        resolve();
      };
    } catch {
      resolve();
    }
  });
}
var adapter = {
  async loadFile(_filename) {
    renderTable(PEOPLE);
    setStatus(`Loaded ${PEOPLE.length} rows.`);
  },
  async loadLookup(_filename) {
    setStatus("Loaded lookup table.");
  },
  async prefillChat(text) {
    chatInput.value = text;
    setStatus(`Query: "${text}"`);
  },
  async showGolden(_goldenFile) {
    renderTable(ADULTS);
    setStatus(`Expected output — ${ADULTS.length} rows.`);
  },
  async playAudio(_filename) {
    setStatus("Playing audio…");
    await playChime();
    renderTable(ADULTS);
    setStatus("Heard the clip → applied the result.");
  },
  elementIdFor(action) {
    switch (action.kind) {
      case "load-file":
      case "load-lookup":
        return "open-btn";
      case "prefill-chat":
        return "chat-input";
      case "play-audio":
      case "show-golden":
      case "golden-source":
      case "load-shuffled":
      case "open-estimate":
      case "decline-estimate":
      case "display":
        return "table-view";
    }
  },
  onFinish() {
    setStatus("Tour finished — the app would open the Tutorials panel here.");
  }
};
function tour() {
  const t = parseTours(featureText).find((s2) => s2.tags.includes("@tour"));
  if (!t)
    throw new Error("demo feature has no @tour scenario");
  return t;
}
function makeUi() {
  const driver = new TourDriver(adapter);
  const ui = new TourUi(driver, {
    doneElementId: "table-view",
    doneDescription: "Voilà, the tour is done."
  });
  return { driver, ui };
}
el("start-tour").addEventListener("click", () => {
  const { driver, ui } = makeUi();
  driver.play(tour());
  ui.start();
});
el("open-btn").addEventListener("click", () => {
  adapter.loadFile("people.csv");
});
