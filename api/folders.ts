import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchFolders } from './_db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const folders = await fetchFolders();
    res.status(200).json(folders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
