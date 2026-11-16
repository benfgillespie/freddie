// Blog post pages: the page itself builds in the browser, but search engines and link previews
// (WhatsApp, iMessage, Facebook) need the title, description and picture in the page up front.
// This takes the normal blog page and fills those in for the post being asked for.
const SITE = 'https://genericfoilingpod.com';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const get = async url => { const r = await fetch(url); if (!r.ok) throw new Error(url + ' ' + r.status); return r; };

// swap the content of an existing tag, or add the tag if the page doesn't have it yet
function setMeta(html, attr, name, value) {
  const re = new RegExp('<meta ' + attr + '="' + name + '"[^>]*>');
  const tag = `<meta ${attr}="${name}" content="${esc(value)}">`;
  return re.test(html) ? html.replace(re, tag) : html.replace('</head>', '  ' + tag + '\n</head>');
}

export default async function handler(req, res) {
  const slug = String(req.query?.post || '');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = host.startsWith('localhost') ? 'http' : 'https';
  const origin = `${proto}://${host}`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  let html;
  try { html = await (await get(origin + '/blog-post-template.html')).text(); } catch (e) { return res.status(502).send('This page is unavailable right now. Please try again in a minute.'); }

  try {
    const posts = await (await get(origin + '/blog/posts.json')).json();
    const post = posts.find(p => p.slug === slug);
    // unknown posts, and drafts on the live site, get the normal page (which says "Post not found")
    if (!post || (post.draft && !host.startsWith('localhost'))) {
      res.setHeader('Cache-Control', 's-maxage=60');
      return res.status(200).send(html);
    }
    const title = post.title + ' | The Generic Foiling Podcast';
    let desc = String(post.description || post.excerpt || '').replace(/\s+/g, ' ').trim();
    if (desc.length > 160) desc = desc.slice(0, 157).replace(/\s+\S*$/, '') + '…';
    const url = `${SITE}/blog-post?post=${encodeURIComponent(post.slug)}`;
    const image = post.image ? (/^https?:/.test(post.image) ? post.image : SITE + post.image) : SITE + '/img/share.jpg';

    html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
    html = html.replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${esc(url)}">`);
    html = html.replace(/\s*<meta property="og:image:(width|height|alt)"[^>]*>/g, '');   // those described the default share picture
    html = setMeta(html, 'name', 'description', desc);
    html = setMeta(html, 'property', 'og:type', 'article');
    html = setMeta(html, 'property', 'og:title', title);
    html = setMeta(html, 'property', 'og:description', desc);
    html = setMeta(html, 'property', 'og:url', url);
    html = setMeta(html, 'property', 'og:image', image);
    html = setMeta(html, 'property', 'og:image:alt', post.title);
    html = setMeta(html, 'property', 'article:published_time', post.date);
    html = setMeta(html, 'name', 'twitter:title', title);
    html = setMeta(html, 'name', 'twitter:description', desc);
    html = setMeta(html, 'name', 'twitter:image', image);
    const ld = {
      '@context': 'https://schema.org', '@type': 'BlogPosting', headline: post.title, description: desc, image,
      datePublished: post.date, author: { '@type': 'Person', name: post.author || 'The Generic Foiling Podcast' },
      publisher: { '@type': 'Organization', name: 'The Generic Foiling Podcast', logo: { '@type': 'ImageObject', url: SITE + '/img/icon-192.png' } },
      mainEntityOfPage: url,
    };
    html = html.replace('</head>', `  <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>\n</head>`);
  } catch (e) { /* if anything goes wrong the normal page still works */ }

  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');
  return res.status(200).send(html);
}
