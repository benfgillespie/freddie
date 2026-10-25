// Turns a basket into a Stripe Checkout page. Prices, stock and postage come from _shop.js,
// never from the browser. Needs STRIPE_SECRET_KEY set in Vercel (Ben).
import { PRODUCTS, SHIPPING, postageFor, variantKey } from './_shop.js';
import { loadSold, stockLeft } from './_stock.js';

// The order goes to Stripe as JSON in one metadata value, which is capped at 500 characters
const MAX_LINES = 10;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(503).json({ error: 'Payments aren’t switched on yet. Please try again soon.' });

  const { items, region: regionId } = req.body || {};
  const region = SHIPPING.find(r => r.id === regionId);
  if (!region || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'Your basket looks empty.' });
  }

  // Check every line against the real products, merging repeats of the same size/colour
  const lines = new Map();
  for (const item of items) {
    const product = PRODUCTS.find(p => p.id === item.id);
    const qty = Math.floor(Number(item.qty));
    if (!product || !(qty > 0)) return res.status(400).json({ error: 'Something in your basket isn’t in the shop any more.' });
    const choice = item.choice || {};
    const valid = Object.entries(product.options).every(([name, values]) => values.includes(choice[name]));
    if (!valid) return res.status(400).json({ error: `Please pick a size/colour for: ${product.name}.` });
    const key = `${product.id}::${variantKey(product, choice)}`;
    if (lines.has(key)) lines.get(key).qty += qty;
    else lines.set(key, { product, choice, qty, label: Object.keys(product.options).map(name => choice[name]).join(' / ') });
  }
  if (lines.size > MAX_LINES) {
    return res.status(400).json({ error: `Sorry, we can only take ${MAX_LINES} different items per order.` });
  }

  // Then check the totals against what's left
  let sold = {};
  try { sold = await loadSold(); } catch (err) { console.error('Stock lookup failed:', err); }
  for (const { product, choice, qty, label } of lines.values()) {
    if (qty > stockLeft(product, choice, sold)) {
      return res.status(409).json({ error: `Sorry, we haven’t got enough left of: ${product.name} (${label}).` });
    }
  }
  const itemCount = [...lines.values()].reduce((n, l) => n + l.qty, 0);

  // Built from the host rather than the Origin header, which the browser (or anyone) can set
  const host = req.headers.host;
  const origin = /^localhost(:\d+)?$/.test(host) ? `http://${host}` : `https://${host}`;
  const order = [...lines.values()].map(({ product, choice, qty }) => [product.id, variantKey(product, choice), qty]);
  const form = new URLSearchParams({
    mode: 'payment',
    'metadata[items]': JSON.stringify(order),
    success_url: `${origin}/shop.html?order=thanks`,
    cancel_url: `${origin}/shop.html?order=cancelled`,
    'shipping_options[0][shipping_rate_data][display_name]': `${region.label} postage`,
    'shipping_options[0][shipping_rate_data][type]': 'fixed_amount',
    'shipping_options[0][shipping_rate_data][fixed_amount][amount]': String(postageFor(region, itemCount)),
    'shipping_options[0][shipping_rate_data][fixed_amount][currency]': 'gbp',
  });
  region.countries.forEach((c, i) => form.append(`shipping_address_collection[allowed_countries][${i}]`, c));
  [...lines.values()].forEach(({ product, qty, label }, i) => {
    form.append(`line_items[${i}][quantity]`, String(qty));
    form.append(`line_items[${i}][price_data][currency]`, 'gbp');
    form.append(`line_items[${i}][price_data][unit_amount]`, String(product.price));
    form.append(`line_items[${i}][price_data][product_data][name]`, `${product.name} – ${label}`);
    form.append(`line_items[${i}][price_data][product_data][images][0]`, origin + product.images[0]);
  });

  try {
    const stripe = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    const session = await stripe.json();
    if (!stripe.ok) {
      console.error('Stripe error:', session.error);
      return res.status(502).json({ error: 'We couldn’t open the checkout just now. Please try again.' });
    }
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(502).json({ error: 'We couldn’t open the checkout just now. Please try again.' });
  }
}
