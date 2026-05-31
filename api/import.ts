import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchNotes, fetchFolders, saveNotes, saveFolders } from './_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const dataStr = req.query.data as string;
    if (!dataStr) return res.status(400).json({ error: 'Missing data parameter' });
    
    const parsed = JSON.parse(dataStr);
    
    if (parsed.notes) {
      await saveNotes(parsed.notes);
    }
    if (parsed.folders) {
      await saveFolders(parsed.folders);
    }
    
    res.status(200).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Invalid JSON data' });
  }
}
