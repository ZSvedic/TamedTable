// TamedTable homepage behavior: mobile nav toggle + interactive feature lists.
// Vanilla JS, no dependencies.

// ---- #Analytics: Umami Cloud analytics (cookie-less page views) ----
// One loader for every marketing page; the web app injects the same script
// from its own #Analytics module (src/packages/web/src/analytics.ts). The
// website ID is public by design: it ships to every visitor. What is tracked
// is public too: /analytics documents it. A blocked or failed load changes
// nothing else on the page.
(function () {
  var s = document.createElement('script');
  s.defer = true;
  s.src = 'https://cloud.umami.is/script.js';
  s.setAttribute('data-website-id', '4d86471c-f8c7-42e7-9138-23cd1e8a1314');
  document.head.appendChild(s);
})();

// ---- Mobile nav toggle ----
(function () {
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  toggle.addEventListener('click', function () {
    var open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  links.addEventListener('click', function (e) {
    if (e.target.closest('a')) { links.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
  });
})();

// ---- Interactive feature lists ----
document.querySelectorAll('[data-feature]').forEach(function (block) {
  var items = Array.prototype.slice.call(block.querySelectorAll('.feat-item'));
  var img   = block.querySelector('.feat-ill');
  var demo  = block.querySelector('.feat-demo');
  var dotWrap = block.querySelector('.feat-dots');

  var dots = items.map(function (item, i) {
    var dot = document.createElement('button');
    dot.className = 'feat-dot' + (item.classList.contains('active') ? ' active' : '');
    dot.setAttribute('aria-label', 'Show example ' + (i + 1));
    dot.addEventListener('click', function () { activate(i); });
    dotWrap.appendChild(dot);
    return dot;
  });

  function activate(i) {
    items.forEach(function (it, j) { it.classList.toggle('active', i === j); });
    dots.forEach(function (d, j) { d.classList.toggle('active', i === j); });
    var item = items[i];
    if (img && item.dataset.ill) { img.src = item.dataset.ill; }
    if (demo) {
      // "Show me →" opens the web app on a deep link that auto-plays the tour:
      //   /app/?feature=<file>&scenario=<name>
      // data-url is the app base (rewritten to the preview prefix at build time);
      // the tour params are appended here so they survive that rewrite.
      var url = item.dataset.url;
      if (item.dataset.feature && item.dataset.scenario) {
        url += '?feature=' + encodeURIComponent(item.dataset.feature) +
               '&scenario=' + encodeURIComponent(item.dataset.scenario);
      }
      demo.href = url;
      demo.textContent = item.dataset.label;
    }
  }

  items.forEach(function (item, i) {
    item.addEventListener('click', function () {
      activate(i);
      // Reflect the bullet in the URL so the address bar is always a shareable
      // deep link. replaceState, not location.hash, to keep Back unpolluted.
      if (item.id) { history.replaceState(null, '', '#' + item.id); }
    });
  });
  var startIndex = Math.max(0, items.findIndex(function (it) { return it.classList.contains('active'); }));
  activate(startIndex);
});

// ---- Deep links to feature bullets ----
// Section ids need no JS: the browser scrolls to them natively. A bullet id
// additionally needs its list's activate() (illustration swap) and a brief
// flash so the reader sees which bullet the link meant.
(function () {
  function goToHash() {
    var el = location.hash.length > 1 && document.getElementById(location.hash.slice(1));
    if (!el || !el.classList.contains('feat-item')) { return; }
    el.click(); // runs that block's activate() and re-writes the same hash
    el.scrollIntoView({ block: 'center' });
    el.classList.remove('linked');
    void el.offsetWidth; // restart the flash animation on repeat visits
    el.classList.add('linked');
  }
  window.addEventListener('hashchange', goToHash);
  goToHash();
  // Illustrations loading after the initial anchor jump shift the layout and
  // strand the scroll position; re-scroll once everything has its final size.
  window.addEventListener('load', goToHash);
})();
