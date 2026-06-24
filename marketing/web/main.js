// TamedTable homepage behavior: mobile nav toggle + interactive feature lists.
// Vanilla JS, no dependencies.

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

  items.forEach(function (item, i) { item.addEventListener('click', function () { activate(i); }); });
  var startIndex = Math.max(0, items.findIndex(function (it) { return it.classList.contains('active'); }));
  activate(startIndex);
});
