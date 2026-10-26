// /sitemap.xml (rewritten here in vercel.json) for Google: the main pages, every published
// blog post and every shop product, so new posts and products are picked up without editing this.
import { PRODUCTS } from './_shop.js';

const SITE = 'https://genericfoilingpod.com';
const PAGES = ['/', '/episodes', '/about', '/blog', '/shop', '/newsletter', '/contact', '/privacy', '/shop-terms'];

export default async function handler(req, res) {
  const urls = PAGES.map(path => ({ path }));

  try {
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const proto = host.startsWith('localhost') ? 'http' : 'https';
    const posts = await fetch(`${proto}://${host}/blog/posts.json`).then(r => r.json());
    for (const post of posts.filter(p => !p.draft)) {
      urls.push({ path: '/blog-post?post=' + encodeURIComponent(post.slug), lastmod: post.date });
    }
  } catch (err) {
    console.error('Sitemap: blog posts unavailable', err);
  }

  for (const product of PRODUCTS) {
    urls.push({ path: '/product?id=' + encodeURIComponent(product.id) });
  }

  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + urls.map(u => `  <url><loc>${SITE}${u.path.replace(/&/g, '&amp;')}</loc>`
      + (u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : '') + '</url>').join('\n')
    + '\n</urlset>\n';

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(xml);
}
