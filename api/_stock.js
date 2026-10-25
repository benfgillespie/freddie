// Live stock: the counts in _shop.js minus anything sold since STOCK_COUNTED_AT.
// Each paid order is saved to Vercel Blob as shop/sales/<checkout session id>.json by
// /api/stripe-webhook, so Stripe retrying a webhook can't count a sale twice.
// Without BLOB_READ_WRITE_TOKEN (e.g. the local preview) it falls back to the _shop.js counts.
import { put, list } from '@vercel/blob';
import { STOCK_COUNTED_AT, stockFor, variantKey } from './_shop.js';

const PREFIX = 'shop/sales/';
const soldKey = (productId, variant) => `${productId}::${variant}`;

// { "gfp-beanie::Chocolate": 2, ... } for sales since the last stock count
export async function loadSold() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return {};
  const since = new Date(STOCK_COUNTED_AT);
  const blobs = [];
  let cursor;
  do {
    const page = await list({ prefix: PREFIX, cursor });
    blobs.push(...page.blobs.filter(b => new Date(b.uploadedAt) >= since));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  const sold = {};
  const sales = await Promise.all(blobs.map(b => fetch(b.url).then(r => r.json())));
  for (const sale of sales) {
    for (const [productId, variant, qty] of sale.items) {
      const key = soldKey(productId, variant);
      sold[key] = (sold[key] || 0) + qty;
    }
  }
  return sold;
}

export const stockLeft = (product, choice, sold) =>
  Math.max(0, stockFor(product, choice) - (sold[soldKey(product.id, variantKey(product, choice))] || 0));

// The same product with its stock counts reduced by what's sold
export function withLiveStock(product, sold) {
  const stock = {};
  for (const [variant, count] of Object.entries(product.stock)) {
    stock[variant] = Math.max(0, count - (sold[soldKey(product.id, variant)] || 0));
  }
  return { ...product, stock };
}

// items: [[productId, variant, qty], ...] as stored in the Checkout Session metadata
export async function recordSale(sessionId, items) {
  await put(`${PREFIX}${sessionId}.json`, JSON.stringify({ items }), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}
