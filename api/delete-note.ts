import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchNotes, saveNotes } from './_db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const id = req.query.id as string;
    if (!id) return res.status(400).json({ error: 'Missing id parameter' });
    
    let notes = await fetchNotes();
    const initialLength = notes.length;
    notes = notes.filter((n: any) => n.id !== id);
    
    if (notes.length === initialLength) return res.status(404).json({ error: 'Note not found' });
    
    await saveNotes(notes);
    res.status(200).json({ success: true, message: 'Note deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
