// "Share" buttons: opens the phone's share sheet where there is one, otherwise copies the link
document.addEventListener('click', function (e) {
  var btn = e.target.closest('[data-share]');
  if (!btn) return;
  var url = location.origin + location.pathname.replace(/\.html$/, '') + location.search;
  var title = btn.getAttribute('data-share-title') || document.title.replace(/\s*\|.*$/, '');
  var label = btn.getAttribute('data-label') || btn.textContent;
  btn.setAttribute('data-label', label);
  function done(msg) { btn.textContent = msg; setTimeout(function () { btn.textContent = label; }, 2200); }
  if (navigator.share) {
    navigator.share({ title: title, url: url }).catch(function () {});
    return;
  }
  function fallback() {
    var ta = document.createElement('textarea'); ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done('Link copied'); } catch (err) { done('Copy: ' + url); }
    document.body.removeChild(ta);
  }
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { done('Link copied'); }, fallback);
  else fallback();
});
