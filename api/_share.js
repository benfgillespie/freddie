// Shared by the pages that build themselves in the browser (shop products, newsletter issues):
// puts the title, description and share picture into the page up front, so Google, WhatsApp,
// iMessage and Facebook can read them. Files starting with "_" aren't routes on Vercel.
export const SITE = 'https://genericfoilingpod.com';

export const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const get = async url => { const r = await fetch(url); if (!r.ok) throw new Error(url + ' ' + r.status); return r; };

export function originOf(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return { host, origin: `${host.startsWith('localhost') ? 'http' : 'https'}://${host}` };
}

function setMeta(html, attr, name, value) {
  const re = new RegExp('<meta ' + attr + '="' + name + '"[^>]*>');
  const tag = `<meta ${attr}="${name}" content="${esc(value)}">`;
  return re.test(html) ? html.replace(re, tag) : html.replace('</head>', '  ' + tag + '\n</head>');
}

export function shorten(text, max) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : t.slice(0, max - 3).replace(/\s+\S*$/, '') + '…';
}

export const absolute = img => img ? (/^https?:/.test(img) ? img : SITE + (img.startsWith('/') ? '' : '/') + img) : SITE + '/img/share.jpg';

// o: { title, description, url, image, alt, type, ld }
export function applyTags(html, o) {
  const desc = shorten(o.description, 160);
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(o.title)}</title>`);
  html = html.replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${esc(o.url)}">`);
  html = html.replace(/\s*<meta property="og:image:(width|height|alt)"[^>]*>/g, '');
  html = setMeta(html, 'name', 'description', desc);
  html = setMeta(html, 'property', 'og:type', o.type || 'website');
  html = setMeta(html, 'property', 'og:title', o.title);
  html = setMeta(html, 'property', 'og:description', desc);
  html = setMeta(html, 'property', 'og:url', o.url);
  html = setMeta(html, 'property', 'og:image', o.image);
  html = setMeta(html, 'property', 'og:image:alt', o.alt || o.title);
  html = setMeta(html, 'name', 'twitter:title', o.title);
  html = setMeta(html, 'name', 'twitter:description', desc);
  html = setMeta(html, 'name', 'twitter:image', o.image);
  if (o.ld) html = html.replace('</head>', `  <script type="application/ld+json">${JSON.stringify(o.ld).replace(/</g, '\\u003c')}</script>\n</head>`);
  return html;
}
