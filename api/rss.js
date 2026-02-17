export default async function handler(req, res) {
  const RSS_URL = 'https://anchor.fm/s/a86ee904/podcast/rss';

  try {
    const response = await fetch(RSS_URL);
    const xml = await response.text();

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');
    res.status(200).send(xml);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch RSS feed' });
  }
}
