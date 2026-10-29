// The shop's products, stock and postage. One place to change all three: the shop page
// reads it through /api/shop, and /api/checkout checks every order against it.
// Files starting with "_" aren't routes on Vercel.

// Stock is keyed "Size|Colour" (or just "Colour" / "Size" when a product has one option).
// 0 shows as Sold out; 1 shows "Last one!".
// Tee-only photos are .webp cut-outs (no white background); they're shown whole on a soft panel.
// fit: shown on the product page. colourPhotos: the photo shown when that colour is picked.
// images: the first photo is the one on the shop page; the rest show on the product's own page.

// When the stock counts below were last checked. Online orders after this time are taken off
// them automatically (see _stock.js), so set it to now whenever you change any counts.
export const STOCK_COUNTED_AT = '2026-10-26T12:28:40Z';

export const PRODUCTS = [
  {
    id: 'gfp-mens-logo-tee',
    name: 'Mens GFP logo tee',
    price: 2500,
    images: ['/img/shop/gfp-tee-blue.webp', '/img/shop/gfp-tee-black.webp', '/img/shop/worn-blue-tee.webp', '/img/shop/worn-recording.jpg', '/img/shop/worn-dinner.jpg',
      '/img/shop/worn-truck.jpg', '/img/shop/worn-flitelab.jpg', '/img/shop/worn-reading.jpg', '/img/shop/worn-awsi-chat.jpg', '/img/shop/size-guide.jpg'],
    description: 'Represent the spirit of GFP everywhere you go with the simple logo tee.',
    fit: 'Regular',
    options: { Size: ['Small', 'Medium', 'Large', 'X Large'], Colour: ['Blue', 'Black'] },
    colourPhotos: { Blue: '/img/shop/gfp-tee-blue.webp', Black: '/img/shop/gfp-tee-black.webp' },
    stock: { 'X Large|Blue': 1 },
  },
  {
    id: 'gfp-wang-lordz-tee',
    name: 'Mens Wang Lordz logo tee',
    price: 2500,
    images: ['/img/shop/wang-lordz-black.webp', '/img/shop/wang-lordz-blue.webp', '/img/shop/wang-lordz-lilac.webp', '/img/shop/worn-awsi-chat.jpg',
      '/img/shop/worn-reading.jpg', '/img/shop/worn-flitelab.jpg', '/img/shop/worn-truck.jpg', '/img/shop/worn-dinner.jpg', '/img/shop/worn-recording.jpg', '/img/shop/size-guide.jpg'],
    description: 'Represent the spirit of the Wang Lordz everywhere you go with the simple logo tee.',
    fit: 'Regular',
    options: { Size: ['Small', 'Medium', 'Large', 'X Large'], Colour: ['Blue', 'Black', 'Lilac'] },
    colourPhotos: { Black: '/img/shop/wang-lordz-black.webp', Blue: '/img/shop/wang-lordz-blue.webp', Lilac: '/img/shop/wang-lordz-lilac.webp' },
    stock: { 'Small|Black': 1, 'Medium|Blue': 3, 'Medium|Black': 1, 'X Large|Blue': 2, 'X Large|Black': 1 },
  },
  {
    id: 'gfp-beanie',
    name: 'The Famous GFP Beanie',
    price: 1200,
    images: ['/img/shop-beanie.jpg', '/img/shop/beanie-1.jpg', '/img/shop/beanie-2.jpg', '/img/shop/beanie-3.jpg', '/img/shop/beanie-4.jpg'],
    description: 'Just in time for Christmas – the best present a foiler could ever hope for! Our first range of headwear – simple, subtle, stylish….. how could you resist?!',
    options: { Colour: ['Chocolate', 'Charcoal', 'Navy', 'Burgundy'] },
    colourPhotos: { Chocolate: '/img/shop-beanie.jpg', Charcoal: '/img/shop/beanie-4.jpg', Navy: '/img/shop/beanie-1.jpg', Burgundy: '/img/shop/beanie-3.jpg' },
    stock: { Chocolate: 4, Charcoal: 1, Navy: 1 },
  },
  {
    id: 'gfp-womens-logo-tee',
    name: 'Womens GFP logo tee',
    price: 2500,
    images: ['/img/shop-womens-gfp-tee.jpg', '/img/shop/womens-tee.webp', '/img/shop/size-guide.jpg'],
    description: 'Ladies – Represent the spirit of GFP everywhere you go with the simple Orchid coloured logo tee! Relaxed fit, heavy weight 280 GSM 100% carded cotton, preshrunk.',
    fit: 'Relaxed',
    options: { Size: ['Small', 'Medium'] },
    stock: { Small: 1 },
  },
];

// Postage per order, in pence. "small" is up to 2 items, "large" is 3 or more.
export const SHIPPING = [
  { id: 'uk', label: 'UK', small: 350, large: 500, countries: ['GB'] },
  {
    id: 'europe', label: 'Europe', small: 1200, large: 1500,
    countries: ['IE', 'FR', 'DE', 'ES', 'PT', 'IT', 'NL', 'BE', 'LU', 'AT', 'CH', 'DK', 'SE', 'NO', 'FI', 'IS',
      'PL', 'CZ', 'SK', 'HU', 'SI', 'HR', 'GR', 'CY', 'MT', 'EE', 'LV', 'LT', 'RO', 'BG', 'MC', 'GI'],
  },
  { id: 'usa', label: 'USA', small: 1200, large: 1500, countries: ['US'] },
  { id: 'aus-nz', label: 'Australia / New Zealand', small: 1500, large: 1800, countries: ['AU', 'NZ'] },
];

export const variantKey = (product, choice) =>
  Object.keys(product.options).map(name => choice[name]).join('|');

export const stockFor = (product, choice) => product.stock[variantKey(product, choice)] || 0;

export const postageFor = (region, itemCount) => (itemCount >= 3 ? region.large : region.small);
