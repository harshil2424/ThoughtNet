import { Note, Canvas } from '../types';

const STORAGE_KEY_NOTES = 'obsidian_mvp_notes';
const STORAGE_KEY_CANVASES = 'obsidian_mvp_canvases';
const STORAGE_KEY_FOLDERS = 'obsidian_mvp_folders';

const DEFAULT_FOLDERS = ['Inbox', 'Notes', 'Projects'];

const DEFAULT_NOTES: Note[] = [
  {
    id: '1',
    title: 'Welcome to Obsidian MVP',
    content: 'This is a **MVP** of a node-based knowledge tool.\n\nTry linking to [[Philosophy]] or check out the [[Project Alpha]].\n\n#welcome #start',
    folder: 'Inbox',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tags: ['welcome', 'start']
  },
  {
    id: '2',
    title: 'Philosophy',
    content: 'The core idea is that one note equals one node. \n\nRelated: [[Zettelkasten Method]]',
    folder: 'Notes',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tags: ['philosophy']
  },
  {
    id: '3',
    title: 'Zettelkasten Method',
    content: 'A system of note-taking using small, atomic notes.\n\nSee also: [[Project Alpha]]',
    folder: 'Notes',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tags: ['learning']
  },
  {
    id: '4',
    title: 'Project Alpha',
    content: 'A secret project. Needs research on [[Philosophy]].',
    folder: 'Projects',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tags: ['project']
  }
];

export const getNotes = (): Note[] => {
  const stored = localStorage.getItem(STORAGE_KEY_NOTES);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(DEFAULT_NOTES));
    return DEFAULT_NOTES;
  }
  return JSON.parse(stored);
};

export const saveNotes = (notes: Note[]) => {
  localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notes));
};

export const getCanvases = (): Canvas[] => {
  const stored = localStorage.getItem(STORAGE_KEY_CANVASES);
  if (!stored) return [];
  return JSON.parse(stored);
};

export const saveCanvases = (canvases: Canvas[]) => {
  localStorage.setItem(STORAGE_KEY_CANVASES, JSON.stringify(canvases));
};

export const getFolders = (): string[] => {
  const stored = localStorage.getItem(STORAGE_KEY_FOLDERS);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(DEFAULT_FOLDERS));
    return DEFAULT_FOLDERS;
  }
  return JSON.parse(stored);
};

export const saveFolders = (folders: string[]) => {
  localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(folders));
};