// Products, stock levels and postage for the shop page
import { PRODUCTS, SHIPPING } from './_shop.js';
import { loadSold, withLiveStock } from './_stock.js';

export default async function handler(req, res) {
  let sold = {};
  try { sold = await loadSold(); } catch (err) { console.error('Stock lookup failed:', err); }
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    products: PRODUCTS.map(p => withLiveStock(p, sold)),
    shipping: SHIPPING.map(({ id, label, small, large }) => ({ id, label, small, large })),
  });
}
