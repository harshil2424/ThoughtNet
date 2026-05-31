import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchNotes, saveNotes } from './_db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const id = req.query.id as string;
    if (!id) return res.status(400).json({ error: 'Missing id parameter' });
    
    const notes = await fetchNotes();
    const noteIndex = notes.findIndex((n: any) => n.id === id);
    if (noteIndex === -1) return res.status(404).json({ error: 'Note not found' });
    
    const note = notes[noteIndex];
    if (req.query.title !== undefined) note.title = req.query.title as string;
    if (req.query.content !== undefined) {
      note.content = req.query.content as string;
      const tags: string[] = [];
      const tagRegex = /#([\w]+)/g;
      let match;
      while ((match = tagRegex.exec(note.content)) !== null) {
        if (!tags.includes(match[1])) tags.push(match[1]);
      }
      note.tags = tags;
    }
    if (req.query.folder !== undefined) note.folder = req.query.folder as string;
    
    note.updatedAt = Date.now();
    notes[noteIndex] = note;
    
    await saveNotes(notes);
    res.status(200).json({ success: true, note });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
