import { put, list, del } from '@vercel/blob';

const BLOB_PATH = 'feedback/data.json';

async function getItems() {
  const { blobs } = await list({ prefix: 'feedback/' });
  if (blobs.length === 0) return { items: [], url: null };
  const res = await fetch(blobs[0].url);
  return { items: await res.json(), url: blobs[0].url };
}

async function saveItems(items, oldUrl) {
  if (oldUrl) await del(oldUrl);
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
      const { items, url } = await getItems();
      items.push(item);
      await saveItems(items, url);
      return res.status(201).json(item);
    }

    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const { items, url } = await getItems();
      const filtered = items.filter(i => i.id !== id);
      await saveItems(filtered, url);
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Feedback API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
