import { put, list, del } from '@vercel/blob';

const BLOB_PATH = 'feedback/data.json';

async function getItems() {
  const { blobs } = await list({ prefix: 'feedback/' });
  if (blobs.length === 0) return { items: [], urls: [] };
  // Fetch the most recent blob
  const latest = blobs[blobs.length - 1];
  const res = await fetch(latest.url);
  return { items: await res.json(), urls: blobs.map(b => b.url) };
}

async function saveItems(items, oldUrls) {
  // Delete ALL old blobs to prevent duplicates
  for (const url of oldUrls) {
    try { await del(url); } catch (e) { /* ignore */ }
  }
  await put(BLOB_PATH, JSON.stringify(items), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  });
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { items } = await getItems();
      return res.json(items);
    }

    if (req.method === 'POST') {
      const item = req.body;
      const { items, urls } = await getItems();
      items.push(item);
      await saveItems(items, urls);
      return res.status(201).json(item);
    }

    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const { items, urls } = await getItems();
      // Support comma-separated IDs for batch delete
      const idsToDelete = id.split(',');
      const filtered = items.filter(i => !idsToDelete.includes(i.id));
      await saveItems(filtered, urls);
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Feedback API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
