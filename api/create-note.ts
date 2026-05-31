import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchNotes, saveNotes } from './_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const title = (req.query.title as string) || 'Untitled Note';
    const content = (req.query.content as string) || '';
    const folder = (req.query.folder as string) || 'Inbox';
    const providedId = req.query.id as string;
    
    const tags: string[] = [];
    const tagRegex = /#([\w]+)/g;
    let match;
    while ((match = tagRegex.exec(content)) !== null) {
      if (!tags.includes(match[1])) tags.push(match[1]);
    }

    const newNote = {
      id: providedId || Date.now().toString(),
      title,
      content,
      folder,
      tags,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    const notes = await fetchNotes();
    notes.push(newNote);
    await saveNotes(notes);
    
    res.status(200).json({ success: true, note: newNote });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
