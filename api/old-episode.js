// Old WordPress episode addresses (/archives/podcast/72-zane-westwood) go to the matching new episode page,
// found by episode number. Anything we can't match goes to the episodes list.
import { parseEpisodes } from './episode.js';

const RSS_URL = 'https://anchor.fm/s/a86ee904/podcast/rss';

export default async function handler(req, res) {
  const slug = String(req.query?.slug || '');
  const num = (slug.match(/^(\d{1,3})-/) || [])[1];
  let dest = '/episodes';
  if (num) {
    try {
      const xml = await (await fetch(RSS_URL)).text();
      const ep = parseEpisodes(xml).find(e => e.num === String(Number(num)) || e.num === num);
      if (ep) dest = '/episode/' + ep.slug;
    } catch (e) { /* fall back to the list */ }
  }
  res.setHeader('Cache-Control', 's-maxage=3600');
  res.setHeader('Location', dest);
  return res.status(301).end();
}
