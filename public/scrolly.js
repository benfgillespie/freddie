// Homepage: the photo behind the page changes as you scroll, and each big line fades in when it arrives
(function () {
  var imgs = document.querySelectorAll('#pageBg img');
  var marks = document.querySelectorAll('[data-bg]');
  var current = 0;
  var header = document.querySelector('.site-header');
  function sizeBackdrop() { if (header) document.documentElement.style.setProperty('--hdr', header.offsetHeight + 'px'); }
  sizeBackdrop();
  window.addEventListener('resize', sizeBackdrop);
  function update() {
    var line = window.innerHeight * 0.5, index = 0;
    marks.forEach(function (m) { if (m.getBoundingClientRect().top < line) index = Number(m.dataset.bg); });
    if (index === current) return;
    current = index;
    imgs.forEach(function (img, i) { img.classList.toggle('on', i === index); });
  }
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.35 });
    document.querySelectorAll('.interlude').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.interlude').forEach(function (el) { el.classList.add('in'); });
  }
})();
