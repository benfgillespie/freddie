// Sets the search description and share-preview details for pages that build themselves in the browser
window.gfpSeo = function (o) {
  var site = 'https://genericfoilingpod.com';
  var url = site + location.pathname.replace(/\.html$/, '') + location.search;
  var image = o.image ? (/^https?:/.test(o.image) ? o.image : site + (o.image.charAt(0) === '/' ? '' : '/') + o.image) : site + '/img/share.jpg';
  var desc = (o.description || '').replace(/\s+/g, ' ').trim();
  if (desc.length > 160) desc = desc.slice(0, 157).replace(/\s+\S*$/, '') + '…';
  function set(selector, attr, value) {
    if (!value) return;
    var el = document.head.querySelector(selector);
    if (!el) {
      el = document.createElement(selector.indexOf('link') === 0 ? 'link' : 'meta');
      var m = selector.match(/\[(\w+)="([^"]+)"\]/);
      el.setAttribute(m[1], m[2]);
      document.head.appendChild(el);
    }
    el.setAttribute(attr, value);
  }
  set('meta[name="description"]', 'content', desc);
  set('meta[property="og:title"]', 'content', o.title);
  set('meta[property="og:description"]', 'content', desc);
  set('meta[property="og:image"]', 'content', image);
  set('meta[property="og:url"]', 'content', url);
  set('link[rel="canonical"]', 'href', url);
};
