// Homepage: the photo bands stay put while the page scrolls over them; this just tells them how tall the sticky header is
(function () {
  var header = document.querySelector('.site-header');
  function sizeHeader() { if (header) document.documentElement.style.setProperty('--hdr', header.offsetHeight + 'px'); }
  sizeHeader();
  window.addEventListener('resize', sizeHeader);
})();
