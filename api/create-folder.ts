import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchFolders, saveFolders } from './_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const name = req.query.name as string;
    if (!name) return res.status(400).json({ error: 'Missing name parameter' });
    
    const folders = await fetchFolders();
    if (!folders.includes(name)) {
      folders.push(name);
      await saveFolders(folders);
    }
    
    res.status(200).json({ success: true, folder: name });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
