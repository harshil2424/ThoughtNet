import { Note, Canvas } from '../types';
import { db } from './firebase';
import { ref, onValue, set } from 'firebase/database';

const STORAGE_KEY_NOTES = 'obsidian_mvp_notes';
const STORAGE_KEY_FOLDERS = 'obsidian_mvp_folders';
const STORAGE_KEY_CANVASES = 'obsidian_mvp_canvases';

// Real-time listener unsubscribers
let unsubscribeNotes: (() => void) | null = null;
let unsubscribeSettings: (() => void) | null = null;

export const initSync = (
  onNotesUpdate: (notes: Note[]) => void,
  onFoldersUpdate: (folders: string[]) => void
) => {
  console.log("RTDB: Init Sync called - attempting to connect");

  // 1. Listen to Notes (Shared Path)
  const notesRef = ref(db, 'notes');

  unsubscribeNotes = onValue(notesRef, (snapshot) => {
    console.log("RTDB: Notes snapshot received");
    const data = snapshot.val();
    if (data) {
      console.log("RTDB: Notes data found", Object.keys(data).length);
      // Convert object back to array if stored as object, or just array
      const rawNotes: any[] = Array.isArray(data) ? data : Object.values(data);
      const notesList: Note[] = rawNotes.map(n => ({
        ...n,
        tags: n.tags || [] // Ensure tags is always an array
      }));
      onNotesUpdate(notesList);
    } else {
      console.log("RTDB: Notes data is null/empty");
    }
  }, (error) => {
    console.error("RTDB: Storage Error (Notes):", error);
  });

  // 2. Listen to Folders (Shared Path)
  const foldersRef = ref(db, 'folders');
  unsubscribeSettings = onValue(foldersRef, (snapshot) => {
    console.log("RTDB: Folders snapshot received");
    const data = snapshot.val();
    if (data) {
      console.log("RTDB: Folders found", data);
      onFoldersUpdate(data);
    }
  }, (error) => {
    console.error("RTDB: Storage Error (Folders):", error);
  });

  console.log("RTDB Sync initialized (Shared Mode)");
};

export const saveNotes = (notes: Note[]) => {
  // Save to LocalStorage as backup/cache
  localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notes));

  // Save to RTDB
  console.log("RTDB: Saving notes...", notes.length);
  set(ref(db, 'notes'), notes)
    .then(() => console.log("RTDB: Notes save success"))
    .catch(err => console.error("RTDB: Notes save failed", err));
};

export const saveFolders = (folders: string[]) => {
  localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(folders));

  console.log("RTDB: Saving folders...", folders.length);
  set(ref(db, 'folders'), folders)
    .then(() => console.log("RTDB: Folders save success"))
    .catch(err => console.error("RTDB: Folders save failed", err));
};

// Canvas sync omitted for brevity, logic would be similar
export const getCanvases = (): Canvas[] => {
  const stored = localStorage.getItem(STORAGE_KEY_CANVASES);
  return stored ? JSON.parse(stored) : [];
};

export const saveCanvases = (canvases: Canvas[]) => {
  localStorage.setItem(STORAGE_KEY_CANVASES, JSON.stringify(canvases));
};

// Hybrid Getters: Return Local first (for instant load), then Sync updates
export const getNotes = (): Note[] => {
  const stored = localStorage.getItem(STORAGE_KEY_NOTES);
  return stored ? JSON.parse(stored) : [];
};

export const getFolders = (): string[] => {
  const stored = localStorage.getItem(STORAGE_KEY_FOLDERS);
  return stored ? JSON.parse(stored) : ['Inbox', 'Notes', 'Projects'];
};