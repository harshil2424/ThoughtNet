export const getDbUrl = () => {
  const url = process.env.VITE_FIREBASE_DATABASE_URL || process.env.FIREBASE_DATABASE_URL;
  if (!url) throw new Error('Firebase URL missing from environment variables');
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

export const fetchNotes = async () => {
  const res = await fetch(`${getDbUrl()}/notes.json`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data ? Object.values(data) : []);
};

export const fetchFolders = async () => {
  const res = await fetch(`${getDbUrl()}/folders.json`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data ? Object.values(data) : []);
};

export const saveNotes = async (notes: any[]) => {
  await fetch(`${getDbUrl()}/notes.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(notes)
  });
};

export const saveFolders = async (folders: string[]) => {
  await fetch(`${getDbUrl()}/folders.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(folders)
  });
};
