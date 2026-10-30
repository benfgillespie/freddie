// Contact form: checks the message for spam, then emails it to the podcast inbox.
// Sending needs RESEND_API_KEY in Vercel (Ben). Optional: CONTACT_TO, CONTACT_FROM.
// Spam checks: a hidden trap box, a minimum time on the page, a limit per visitor, and a junk filter.

const TOPICS = ['Guest or episode idea', 'Brand partnership or sponsorship', 'Gear question', 'Merch order', 'Just saying hi'];
const TO = process.env.CONTACT_TO || 'thegenericfoilingpod@gmail.com';
const FROM = process.env.CONTACT_FROM || 'GFP Website <onboarding@resend.dev>';
const MIN_SECONDS = 4;            // a person takes longer than this to write a message
const MAX_PER_HOUR = 5;           // messages per visitor per hour
const MAX_LINKS = 2;
const SPAMMY = /\b(viagra|cialis|casino|crypto|bitcoin|forex|seo (services|expert)|backlinks?|guest post(s|ing)? (for|service)|loan offer|escort|porn|telegram|whatsapp me|click here)\b/i;

const seen = new Map();           // visitor -> times of recent messages (resets when the server restarts)

const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);
const oneLine = (s, max) => clean(s, max).replace(/\s+/g, ' ');
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const b = req.body && typeof req.body === 'object' ? req.body : {};

  // 1. The trap box: real people never see it, bots fill in every box. Pretend it worked.
  if (clean(b.website, 200)) return res.status(200).json({ ok: true });

  // 2. Too quick to be a person (or no timestamp at all)
  const secs = (Date.now() - Number(b.t)) / 1000;
  if (!(secs >= MIN_SECONDS) || secs > 60 * 60 * 6) {
    return res.status(400).json({ error: secs > 0 && secs < MIN_SECONDS ? 'That was quick! Take a moment, then press send again.' : 'This page has been open a while. Please refresh it and try again.' });
  }

  const name = oneLine(b.name, 80);
  const email = oneLine(b.email, 120);
  const message = clean(b.message, 4000);
  const topic = TOPICS.includes(b.topic) ? b.topic : 'Just saying hi';
  if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please fill in your name, a proper email address and a message.' });
  }

  // 3. Junk filter: lots of links, or the usual spam words
  const links = (message.match(/https?:\/\/|www\./gi) || []).length;
  if (links > MAX_LINKS || SPAMMY.test(message + ' ' + name)) {
    return res.status(400).json({ error: 'That looks like it has links or wording we filter out. Please remove them, or email us directly.' });
  }

  // 4. A few messages per visitor per hour
  const who = String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const recent = (seen.get(who) || []).filter(x => now - x < 3600_000);
  if (recent.length >= MAX_PER_HOUR) return res.status(429).json({ error: 'You’ve sent a few messages already. Please try again in a bit.' });
  // only messages that really get sent count towards the limit (see below)
  const used = () => { recent.push(now); seen.set(who, recent); if (seen.size > 5000) seen.clear(); };

  const subject = `${topic} — from ${name}`;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.VERCEL) return res.status(503).json({ error: 'The form isn’t switched on yet. Please email us directly.' });
    used();
    console.log('\n[contact form — preview only, not emailed]\n', subject, '\n', email, '\n', message, '\n');
    return res.status(200).json({ ok: true, preview: true });
  }

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM, to: [TO], reply_to: email, subject,
        text: `${message}\n\n— ${name} <${email}>\nTopic: ${topic}`,
        html: `<p style="white-space:pre-wrap">${esc(message)}</p><hr><p><b>${esc(name)}</b> &lt;${esc(email)}&gt;<br>Topic: ${esc(topic)}</p>`,
      }),
    });
    if (!r.ok) { console.error('Resend said', r.status, await r.text()); throw new Error('send failed'); }
    used();
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Contact send failed:', err);
    return res.status(502).json({ error: 'Sorry, that didn’t send. Please email us directly.' });
  }
}
