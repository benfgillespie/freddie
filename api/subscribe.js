// Newsletter sign-up: checks the sign-up for bots, then passes it on to Mailchimp.
// The Mailchimp address lives only here, so bots reading the page can't post straight to it.
// Checks: a hidden trap box, a minimum time on the page, a limit per visitor, and made-up Gmail addresses.

const MC = 'https://gmail.us12.list-manage.com/subscribe/post-json?u=0a5fd5ca7498cd5715ccaa6bc&id=929e2eace3';
const TRAP = 'b_0a5fd5ca7498cd5715ccaa6bc_929e2eace3';
const MIN_SECONDS = 3;            // a person takes longer than this to type an email
const MAX_PER_HOUR = 6;           // tries per visitor per hour
const seen = new Map();           // visitor -> times of recent tries (resets when the server restarts)

const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, max);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ result: 'error', msg: 'Method not allowed' });
  const b = req.body && typeof req.body === 'object' ? req.body : {};
  const plain = !String(req.headers['content-type'] || '').includes('json');   // a normal form post, not our script
  const reply = (code, result, msg) => {
    if (!plain) return res.status(code).json({ result, msg });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(code).send(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Newsletter</title><body style="font-family:sans-serif;background:#0B0B0C;color:#fff;text-align:center;padding:80px 20px"><h1 style="color:#FFAC00">${result === 'success' ? 'You&rsquo;re in.' : 'Not quite'}</h1><p>${result === 'success' ? 'Check your inbox for a message from us and confirm your email address.' : msg.replace(/[<&]/g, '')}</p><p><a style="color:#FFAC00" href="/">Back to the site</a></p>`);
  };

  // 1. The trap box: real people never see it, bots fill in every box. Pretend it worked.
  if (clean(b[TRAP], 200)) return reply(200, 'success', 'ok');

  // 2. Too quick to be a person (or no timestamp at all)
  const secs = (Date.now() - Number(b.t)) / 1000;
  if (!(secs >= MIN_SECONDS) || secs > 60 * 60 * 24) {
    return reply(400, 'error', secs > 0 && secs < MIN_SECONDS ? 'That was quick! Take a moment, then press subscribe again.' : 'This page has been open a while. Please refresh it and try again.');
  }

  const email = clean(b.EMAIL, 120).toLowerCase();
  const fname = clean(b.FNAME, 60);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply(400, 'error', 'That email address doesn’t look right.');

  // 3. A limit per visitor
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const recent = (seen.get(ip) || []).filter(x => now - x < 3600e3);
  if (recent.length >= MAX_PER_HOUR) return reply(429, 'error', 'Too many tries. Please try again in a bit.');
  recent.push(now);
  seen.set(ip, recent);

  // 4. Gmail ignores dots, so bots invent endless addresses like q.iwob.u.jegi.s.u.73@gmail.com. Pretend it worked.
  const [local, domain] = email.split('@');
  if (/^(gmail|googlemail)\.com$/.test(domain) && (local.split('.').length - 1) >= 3) return reply(200, 'success', 'ok');

  // 5. Looks like a person: pass it to Mailchimp
  try {
    const url = MC + '&EMAIL=' + encodeURIComponent(email) + (fname ? '&FNAME=' + encodeURIComponent(fname) : '') + '&' + TRAP + '=&c=cb';
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 GFP website' } });
    const text = await r.text();
    const json = JSON.parse(text.replace(/^[^{]*/, '').replace(/[^}]*$/, ''));
    return reply(200, json.result === 'success' ? 'success' : 'error', String(json.msg || ''));
  } catch (e) {
    return reply(502, 'error', 'We couldn’t reach the newsletter just now. Please try again in a moment.');
  }
}
