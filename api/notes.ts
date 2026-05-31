import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchNotes } from './_db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    let notes = await fetchNotes();
    const search = req.query.search as string;
    
    if (search) {
      const lowerQuery = search.toLowerCase();
      notes = notes.filter((n: any) => 
        n.title.toLowerCase().includes(lowerQuery) || 
        n.content.toLowerCase().includes(lowerQuery)
      );
    }
    
    res.status(200).json(notes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
