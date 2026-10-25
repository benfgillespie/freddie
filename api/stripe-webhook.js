// Stripe calls this when someone pays, and we take what they bought off the stock (_stock.js).
// Needs STRIPE_WEBHOOK_SECRET (the endpoint's whsec_ signing secret) and BLOB_READ_WRITE_TOKEN
// in Vercel (Ben). Stripe can't reach the local preview, so this only runs online.
import crypto from 'node:crypto';
import { recordSale } from './_stock.js';

const TOLERANCE_SECONDS = 5 * 60;

// The signature covers the exact bytes Stripe sent, so read the raw body and leave req.body alone
async function rawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function verify(payload, header, secret) {
  // Header looks like "t=1700000000,v1=abc...,v1=def..."
  const parts = (header || '').split(',').map(p => p.split('='));
  const timestamp = Number(parts.find(([k]) => k === 't')?.[1]);
  const signatures = parts.filter(([k]) => k === 'v1').map(([, v]) => v || '');
  if (!timestamp || !signatures.length) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > TOLERANCE_SECONDS) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  return signatures.some(sig => sig.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('Stripe webhook: STRIPE_WEBHOOK_SECRET or BLOB_READ_WRITE_TOKEN not set');
    return res.status(503).json({ error: 'Not configured' });
  }

  const payload = await rawBody(req);
  if (!verify(payload, req.headers['stripe-signature'], secret)) {
    return res.status(400).json({ error: 'Bad signature' });
  }

  const event = JSON.parse(payload);
  const session = event.data?.object;
  const paid = (event.type === 'checkout.session.completed' && session.payment_status === 'paid') ||
    event.type === 'checkout.session.async_payment_succeeded';
  if (paid && session.metadata?.items) {
    try {
      await recordSale(session.id, JSON.parse(session.metadata.items));
    } catch (err) {
      // A 500 makes Stripe retry later, and recordSale is safe to repeat
      console.error('Stripe webhook: could not record sale', session.id, err);
      return res.status(500).json({ error: 'Could not record sale' });
    }
  }
  return res.status(200).json({ received: true });
}
