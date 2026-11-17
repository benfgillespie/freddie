// Shop product pages: fills in the title, description, picture and Google product details
// for the product being asked for. The page itself still builds in the browser.
import { PRODUCTS } from './_shop.js';
import { SITE, get, originOf, applyTags, absolute } from './_share.js';

export default async function handler(req, res) {
  const id = String(req.query?.id || '');
  const { origin } = originOf(req);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  let html;
  try { html = await (await get(origin + '/product-template.html')).text(); } catch (e) { return res.status(502).send('This page is unavailable right now. Please try again in a minute.'); }
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) { res.setHeader('Cache-Control', 's-maxage=60'); return res.status(200).send(html); }
  try {
    const url = `${SITE}/product?id=${encodeURIComponent(p.id)}`;
    const image = absolute(p.images && p.images[0]);
    const inStock = Object.values(p.stock || {}).some(n => n > 0);
    const desc = p.description + ' Official Generic Foiling Podcast merch, printed in the UK and shipped worldwide.';
    html = applyTags(html, {
      title: p.name + ' | The Generic Foiling Podcast Shop', description: desc, url, image, alt: p.name, type: 'product',
      ld: {
        '@context': 'https://schema.org', '@type': 'Product', name: p.name, description: p.description, image: (p.images || []).slice(0, 4).map(absolute),
        brand: { '@type': 'Brand', name: 'The Generic Foiling Podcast' },
        offers: { '@type': 'Offer', url, priceCurrency: 'GBP', price: (p.price / 100).toFixed(2), availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' },
      },
    });
  } catch (e) { /* the normal page still works */ }
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400');
  return res.status(200).send(html);
}
