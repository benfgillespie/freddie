// The GFP icon as one continuous line, so it can draw itself.
// Used for: the header logo (draws on load and on hover), the "Loading..." messages and the newsletter thank-you.
(function () {
  var d = 'M4.5,166.5 V119.5 A6,6 0 0 1 16.5,119.5 V264.5 A6,6 0 0 0 28.5,264.5 V39.5 A6,6 0 0 1 40.5,39.5 V300.5 A6,6 0 0 0 52,300.5 V11.5 A6,6 0 0 1 64,11.5 V328.5 A6,6 0 0 0 76,328.5 V164.5';
  for (var k = 0; k < 8; k++) {
    var x = 76 + 24 * k;
    d += ' A6,6 0 0 1 ' + (x + 12) + ',164.5 V175.5 A6,6 0 0 0 ' + (x + 24) + ',175.5';
    if (k < 7) d += ' V164.5';
  }
  d += ' V86.25 A5.75,5.75 0 0 1 279.5,86.25 V265 A5.75,5.75 0 0 0 291,265 V51.5 A6,6 0 0 1 303,51.5 V166.5';

  // kind: 'draw' (traces itself once) or 'pulse' (a glow runs along it, for loading)
  function markup(cls, kind) {
    var paths = kind === 'pulse'
      ? '<path class="base" pathLength="1" d="' + d + '"/><path class="pulse" pathLength="1" d="' + d + '"/>'
      : '<path class="draw" pathLength="1" d="' + d + '"/>';
    return '<svg class="gfp-wave ' + (cls || '') + (kind === 'pulse' ? '' : ' go') + '" viewBox="0 0 308 341" aria-hidden="true" focusable="false">' + paths + '</svg>';
  }
  function replay(svg) {
    svg.classList.remove('go');
    void svg.getBoundingClientRect();
    svg.classList.add('go');
  }
  window.gfpWave = { markup: markup, replay: replay };

  // Header logo: swap the picture for the line version
  document.querySelectorAll('.site-header .brand').forEach(function (brand) {
    var img = brand.querySelector('img');
    if (!img) return;
    var holder = document.createElement('span');
    holder.innerHTML = markup('brand-wave', 'draw');
    var svg = holder.firstChild;
    svg.setAttribute('aria-hidden', 'true');
    img.replaceWith(svg);
    brand.addEventListener('mouseenter', function () { replay(svg); });
  });

  // "Loading..." messages get the pulsing wave above them
  document.querySelectorAll('.posts-status').forEach(function (el) {
    if (!/^\s*Loading/i.test(el.textContent)) return;
    el.classList.add('is-loading');
    el.insertAdjacentHTML('afterbegin', markup('loader-wave', 'pulse'));
  });

// ---- Small touches ----
var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Numbers count up the first time they scroll into view
(function () {
  var els = document.querySelectorAll('.count');
  if (!els.length || calm || !('IntersectionObserver' in window)) return;
  function run(el) {
    var suffix = el.dataset.suffix || '';
    var start = null;
    function tick(ts) {
      if (start === null) start = ts;
      var u = Math.min((ts - start) / 1400, 1);
      var e = 1 - Math.pow(1 - u, 3);
      var to = parseInt(el.dataset.to, 10) || 0;
      el.textContent = Math.round(to * e) + (u === 1 ? suffix : '');
      if (u < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { io.unobserve(en.target); run(en.target); }
    });
  }, { threshold: 0.6 });
  els.forEach(function (el) { io.observe(el); });
})();

// Listen Now buttons get little sound bars that dance on hover
document.querySelectorAll('a.btn-gold').forEach(function (a) {
  if (!/^\s*Listen Now/i.test(a.textContent)) return;
  a.classList.add('has-eq');
  a.insertAdjacentHTML('afterbegin', '<span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>');
});
})();
