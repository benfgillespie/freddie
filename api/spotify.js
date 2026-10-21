// Maps episode titles to their open.spotify.com links. The podcast feed only links to
// Spotify for Creators, so we read the episode list off the public show page instead.
const SHOW_URL = 'https://open.spotify.com/show/7wBQo7HwIbwXE8NncFk25z';

export default async function handler(req, res) {
  try {
    const response = await fetch(SHOW_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/605.1.15' },
    });
    const page = await response.text();

    const episodes = [];
    const seen = new Set();
    // Each episode appears as a link to /episode/<id> followed by its title
    for (const m of page.matchAll(/\/episode\/([A-Za-z0-9]{22})[^>]*>(?:<[^>]*>)*([^<>]{3,300})</g)) {
      if (seen.has(m[1])) continue;
      seen.add(m[1]);
      episodes.push({ id: m[1], title: decodeEntities(m[2].trim()) });
    }

    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');
    res.status(200).json({ show: SHOW_URL, episodes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch Spotify show page' });
  }
}

function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
