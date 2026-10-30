// One page per episode, built from the podcast feed the moment someone asks for it, so new episodes
// get their own page automatically. Extra "what we talk about" bullets live in public/episode-notes.json
// (keyed by episode number); without them the page uses the bullets or text from the show notes.
const RSS_URL = 'https://anchor.fm/s/a86ee904/podcast/rss';
const SITE = 'https://genericfoilingpod.com';

const decode = s => s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugify = s => s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90).replace(/-+$/, '');

function tag(item, name) {
  const m = item.match(new RegExp('<' + name + '[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</' + name + '>'));
  return m ? m[1].trim() : '';
}

export function parseEpisodes(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => {
    const it = m[1];
    const title = decode(tag(it, 'title'));
    const num = (title.match(/^\s*(\d+)\b/) || [])[1] || '';
    const image = (it.match(/<itunes:image href="([^"]+)"/) || [])[1] || '';
    const audio = (it.match(/<enclosure url="([^"]+)"/) || [])[1] || '';
    return { title, num, slug: slugify(title), date: tag(it, 'pubDate'), duration: tag(it, 'itunes:duration'), image, audio, descHtml: tag(it, 'description') };
  });
}

// Show notes: bullets (lines starting with a dot or dash) and paragraphs, minus the "rate us / support us" sign-off
function readNotes(html) {
  const text = decode(html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '')).replace(/[\u2060\u200b]/g, '');
  const bullets = [], paras = [];
  for (const raw of text.split(/\n+/)) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (!line) continue;
    if (/^[•·\-–\*]\s*/.test(line)) { const b = line.replace(/^[•·\-–\*]\s*/, ''); if (!/^and (much|lots) more/i.test(b)) bullets.push(b); continue; }
    if (/rate us 5 stars|buymeacoffee|if you like what we do|we cover a lot of ground|covered in this episode:?$/i.test(line)) continue;
    paras.push(line);
  }
  return { bullets, paras };
}

function fmtDuration(d) {
  const p = d.split(':').map(Number);
  if (p.length === 3) return [p[0] ? p[0] + 'h' : '', p[1] ? p[1] + 'm' : ''].filter(Boolean).join(' ');
  if (p.length === 2) return p[0] + 'm';
  return '';
}

async function fetchText(url) { const r = await fetch(url); if (!r.ok) throw new Error(url + ' ' + r.status); return r.text(); }

function notFound(res, host, proto) {
  res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send('<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>Episode not found</title><body style="font-family:sans-serif;background:#0b0b0c;color:#eee;padding:48px"><h1>Episode not found</h1><p><a style="color:#ffac00" href="/episodes">See all episodes</a></p>');
}

export default async function handler(req, res) {
  const slug = String(req.query?.slug || '').toLowerCase();
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = host.startsWith('localhost') ? 'http' : 'https';
  const origin = `${proto}://${host}`;

  let eps;
  try { eps = parseEpisodes(await fetchText(RSS_URL)); } catch (e) { return res.status(502).send('The episode list is unavailable right now. Please try again in a minute.'); }
  const i = eps.findIndex(e => e.slug === slug);
  if (i < 0) return notFound(res);
  const ep = eps[i], newer = eps[i - 1], older = eps[i + 1];

  let notes = {};
  try { notes = JSON.parse(await fetchText(origin + '/episode-notes.json')); } catch (e) { /* none yet */ }
  const mine = (ep.num && notes[ep.num]) || notes[ep.slug] || null;
  const show = readNotes(ep.descHtml);
  const bullets = mine?.bullets?.length ? mine.bullets : show.bullets;
  const intro = show.paras;

  // Reuse the real header, footer and file versions from the About page, so the menu stays in sync
  let header = '', footer = '', css = '/gfp.css', wave = '/wave.js';
  try {
    const about = await fetchText(origin + '/about.html');
    header = (about.match(/<header class="site-header">[\s\S]*?<\/header>/) || [''])[0].replace(/\sclass="active"/g, '');
    footer = (about.match(/<footer class="site-footer">[\s\S]*?<\/footer>/) || [''])[0];
    css = '/' + ((about.match(/href="(gfp\.css[^"]*)"/) || [])[1] || 'gfp.css');
    wave = '/' + ((about.match(/src="(wave\.js[^"]*)"/) || [])[1] || 'wave.js');
  } catch (e) { /* page still works without the shared bits */ }

  const d = new Date(ep.date);
  const dateStr = isNaN(d) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const len = fmtDuration(ep.duration);
  const nice = ep.title.replace(/^\s*\d+\s*[-–—:]\s*/, '');
  const desc = (bullets.length ? 'We talk about: ' + bullets.slice(0, 4).join('; ') + '.' : (intro[0] || nice)).slice(0, 300);
  const url = `${SITE}/episode/${ep.slug}`;
  const ld = {
    '@context': 'https://schema.org', '@type': 'PodcastEpisode', name: ep.title, url, datePublished: isNaN(d) ? undefined : d.toISOString().slice(0, 10),
    description: desc, image: ep.image || undefined, episodeNumber: ep.num ? Number(ep.num) : undefined,
    associatedMedia: ep.audio ? { '@type': 'AudioObject', contentUrl: ep.audio } : undefined,
    partOfSeries: { '@type': 'PodcastSeries', name: 'The Generic Foiling Podcast', url: SITE }
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" href="/img/favicon-32.png" sizes="32x32">
  <link rel="icon" href="/img/icon-192.png" sizes="192x192">
  <link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
  <title>${esc(ep.title)} | The Generic Foiling Podcast</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="The Generic Foiling Podcast">
  <meta property="og:title" content="${esc(ep.title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${esc(ep.image || SITE + '/img/share.jpg')}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${esc(ep.title)}">
  <meta name="twitter:description" content="${esc(desc)}">
  <meta name="twitter:image" content="${esc(ep.image || SITE + '/img/share.jpg')}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Anton&family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@500;600;700&family=Caveat:wght@500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${css}">
  <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-P9ZZ6R32H7"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-P9ZZ6R32H7');</script>
</head>
<body>
  ${header}
  <main>
    <section class="section ep-page">
      <div class="wrap">
        <a class="ep-back" href="/episodes">&larr; All episodes</a>
        <div class="ep-top">
          ${ep.image ? `<img class="ep-art" src="${esc(ep.image)}" alt="Artwork for ${esc(ep.title)}" width="420" height="420">` : ''}
          <div class="ep-info">
            <p class="ep-tag">${ep.num ? 'Episode ' + esc(ep.num) : 'Bonus episode'}${dateStr ? ' &middot; ' + esc(dateStr) : ''}${len ? ' &middot; ' + esc(len) : ''}</p>
            <h1>${esc(nice)}</h1>
            <div class="ep-listen">
              ${ep.audio ? `<button type="button" class="btn-gold" id="epPlay" data-audio="${esc(ep.audio)}" data-title="${esc(ep.title)}" data-image="${esc(ep.image)}" data-tag="${ep.num ? 'Episode ' + esc(ep.num) : 'Bonus episode'}">&#9654;&#xFE0E; Play episode</button>` : ''}
              <a class="btn-outline" id="epSpotify" href="https://open.spotify.com/show/7wBQo7HwIbwXE8NncFk25z" target="_blank" rel="noopener">Spotify</a>
              <a class="btn-outline" href="https://podcasts.apple.com/us/podcast/the-generic-foiling-podcast/id1637901696" target="_blank" rel="noopener">Apple Podcasts</a>
              <a class="btn-outline" href="https://www.youtube.com/@GenericFoilingPodcast" target="_blank" rel="noopener">YouTube</a>
            </div>
          </div>
        </div>

        ${bullets.length ? `<div class="ep-block"><h2>What we talk about</h2><ul class="ep-bullets">${bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul></div>` : ''}
        ${intro.length ? `<div class="ep-block"><h2>About this episode</h2>${intro.map(p => `<p>${esc(p)}</p>`).join('')}</div>` : ''}

        <div class="ep-nav">
          ${older ? `<a href="/episode/${older.slug}"><small>&larr; Previous episode</small><span>${esc(older.title)}</span></a>` : '<span></span>'}
          ${newer ? `<a class="next" href="/episode/${newer.slug}"><small>Next episode &rarr;</small><span>${esc(newer.title)}</span></a>` : '<span></span>'}
        </div>
      </div>
    </section>
  </main>
  ${footer}

  <!-- Player bar: the same one as the Episodes page; appears once Play is pressed -->
  <div class="player-bar" id="playerBar" hidden>
    <div class="wrap player-inner">
      <img class="player-art" id="playerArt" src="" alt="">
      <div class="player-info">
        <div class="player-tag" id="playerTag"></div>
        <div class="player-title" id="playerTitle"></div>
      </div>
      <div class="player-controls">
        <button type="button" class="player-skip" data-skip="-15" aria-label="Back 15 seconds">&minus;15</button>
        <button type="button" class="player-play" id="playerPlay" aria-label="Play">&#9654;&#xFE0E;</button>
        <button type="button" class="player-skip" data-skip="30" aria-label="Forward 30 seconds">+30</button>
      </div>
      <div class="player-progress">
        <span id="playerTime">0:00</span>
        <input type="range" id="playerSeek" min="0" max="1000" value="0" aria-label="Seek">
        <span id="playerDuration">0:00</span>
      </div>
      <button type="button" class="player-speed" id="playerSpeed" aria-label="Playback speed">1&times;</button>
      <a class="player-download" id="playerDownload" href="#" download aria-label="Download episode" title="Download episode">&#8615;</a>
    </div>
  </div>

  <script>
    (function () { var t = document.querySelector('.menu-toggle'); if (t) t.addEventListener('click', function () { document.getElementById('mainNav').classList.toggle('open'); }); })();
  </script>
  <script src="/ep-player.js?v=3"></script>
  <script src="/spotify-links.js"></script>
  <script>
    // Point the Spotify button at this exact episode
    if (typeof spotifyLinks !== 'undefined') spotifyLinks.then(function (f) { document.getElementById('epSpotify').href = f(${JSON.stringify(ep.title)}); });
  </script>
  <script src="${wave}"></script>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
  return res.status(200).send(html);
}
