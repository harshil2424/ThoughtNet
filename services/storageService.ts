import { Note, Canvas } from '../types';
import { db } from './firebase';
import { ref, onValue } from 'firebase/database';

const STORAGE_KEY_CANVASES = 'obsidian_mvp_canvases';

export const initSync = (
  onNotesUpdate: (notes: Note[]) => void,
  onFoldersUpdate: (folders: string[]) => void
) => {
  const notesRef = ref(db, 'notes');
  onValue(notesRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const rawNotes: any[] = Array.isArray(data) ? data : Object.values(data);
      const notesList: Note[] = rawNotes.map(n => ({
        ...n,
        tags: n.tags || []
      }));
      onNotesUpdate(notesList);
    } else {
      onNotesUpdate([]);
    }
  });

  const foldersRef = ref(db, 'folders');
  onValue(foldersRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      onFoldersUpdate(data);
    }
  });
};

export const fetchNotes = async (): Promise<Note[]> => {
  const res = await fetch('/api/notes');
  if (!res.ok) throw new Error('Failed to fetch notes');
  return res.json();
};

export const createNote = async (note: Partial<Note>): Promise<Note> => {
  const params = new URLSearchParams();
  if (note.title) params.append('title', note.title);
  if (note.content) params.append('content', note.content);
  if (note.folder) params.append('folder', note.folder);
  if (note.id) params.append('id', note.id);
  
  const res = await fetch(`/api/create-note?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to create note');
  const data = await res.json();
  return data.note;
};

export const updateNote = async (id: string, updates: Partial<Note>): Promise<Note> => {
  const params = new URLSearchParams();
  params.append('id', id);
  if (updates.title !== undefined) params.append('title', updates.title);
  if (updates.content !== undefined) params.append('content', updates.content);
  if (updates.folder !== undefined) params.append('folder', updates.folder);
  
  const res = await fetch(`/api/edit-note?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to update note');
  const data = await res.json();
  return data.note;
};

export const deleteNote = async (id: string): Promise<void> => {
  const res = await fetch(`/api/delete-note?id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Failed to delete note');
};

export const fetchFolders = async (): Promise<string[]> => {
  const res = await fetch('/api/folders');
  if (!res.ok) throw new Error('Failed to fetch folders');
  return res.json();
};

export const createFolder = async (name: string): Promise<string> => {
  const res = await fetch(`/api/create-folder?name=${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error('Failed to create folder');
  const data = await res.json();
  return data.folder;
};

export const importData = async (notes: Note[], folders: string[]): Promise<void> => {
  const params = new URLSearchParams();
  params.append('data', JSON.stringify({ notes, folders }));
  const res = await fetch(`/api/import?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to import data');
};

export const getCanvases = (): Canvas[] => {
  const stored = localStorage.getItem(STORAGE_KEY_CANVASES);
  return stored ? JSON.parse(stored) : [];
};

export const saveCanvases = (canvases: Canvas[]) => {
  localStorage.setItem(STORAGE_KEY_CANVASES, JSON.stringify(canvases));
};