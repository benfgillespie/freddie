// Products, stock levels and postage for the shop page
import { PRODUCTS, SHIPPING } from './_shop.js';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    products: PRODUCTS,
    shipping: SHIPPING.map(({ id, label, small, large }) => ({ id, label, small, large })),
  });
}
