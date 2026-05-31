import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        {
          name: 'api-middleware',
          configureServer(server) {
            const dataFile = path.resolve(__dirname, 'data.json');
            
            // Helper to read data
            const readData = () => {
              if (fs.existsSync(dataFile)) {
                try {
                  return JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
                } catch (e) {
                  console.error('Error parsing data.json', e);
                }
              }
              const defaultData = {
                notes: [
                  { id: '1', title: 'Welcome', content: 'This is a note.', folder: 'Inbox', tags: ['welcome'], createdAt: Date.now(), updatedAt: Date.now() }
                ],
                folders: ['Inbox', 'Notes', 'Projects']
              };
              fs.writeFileSync(dataFile, JSON.stringify(defaultData, null, 2));
              return defaultData;
            };

            // Helper to write data
            const writeData = (data: any) => {
              fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
              
              if (env.VITE_FIREBASE_DATABASE_URL) {
                const url = env.VITE_FIREBASE_DATABASE_URL.endsWith('/') 
                  ? env.VITE_FIREBASE_DATABASE_URL.slice(0, -1) 
                  : env.VITE_FIREBASE_DATABASE_URL;
                  
                fetch(`${url}/.json`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ notes: data.notes, folders: data.folders })
                }).catch(err => console.error("Firebase sync error from API:", err));
              }
            };

            server.middlewares.use((req, res, next) => {
              if (!req.url?.startsWith('/api/')) {
                return next();
              }

              const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
              const pathname = urlObj.pathname;
              const params = urlObj.searchParams;
              
              res.setHeader('Content-Type', 'application/json');

              // ALL APIS ARE GET NOW
              if (req.method !== 'GET') {
                 res.statusCode = 405;
                 res.end(JSON.stringify({ error: 'Method not allowed, use GET' }));
                 return;
              }

              let data = readData();

              if (pathname === '/api/notes') {
                const query = params.get('search');
                let notes = data.notes;
                if (query) {
                  const lowerQuery = query.toLowerCase();
                  notes = notes.filter((n: any) => 
                    n.title.toLowerCase().includes(lowerQuery) || 
                    n.content.toLowerCase().includes(lowerQuery)
                  );
                }
                res.end(JSON.stringify(notes));
                return;
              }

              if (pathname === '/api/folders') {
                res.end(JSON.stringify(data.folders));
                return;
              }

              if (pathname === '/api/create-note') {
                const title = params.get('title') || 'Untitled Note';
                const content = params.get('content') || '';
                const folder = params.get('folder') || 'Inbox';
                const providedId = params.get('id');
                
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
                
                data.notes.push(newNote);
                writeData(data);
                res.end(JSON.stringify({ success: true, note: newNote }));
                return;
              }

              if (pathname === '/api/edit-note') {
                const id = params.get('id');
                if (!id) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Missing id parameter' }));
                  return;
                }
                
                const noteIndex = data.notes.findIndex((n: any) => n.id === id);
                if (noteIndex === -1) {
                  res.statusCode = 404;
                  res.end(JSON.stringify({ error: 'Note not found' }));
                  return;
                }
                
                const note = data.notes[noteIndex];
                if (params.has('title')) note.title = params.get('title');
                if (params.has('content')) {
                  note.content = params.get('content');
                  const tags: string[] = [];
                  const tagRegex = /#([\w]+)/g;
                  let match;
                  while ((match = tagRegex.exec(note.content)) !== null) {
                    if (!tags.includes(match[1])) tags.push(match[1]);
                  }
                  note.tags = tags;
                }
                if (params.has('folder')) note.folder = params.get('folder');
                
                note.updatedAt = Date.now();
                data.notes[noteIndex] = note;
                writeData(data);
                
                res.end(JSON.stringify({ success: true, note }));
                return;
              }

              if (pathname === '/api/delete-note') {
                const id = params.get('id');
                if (!id) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Missing id parameter' }));
                  return;
                }
                
                const initialLength = data.notes.length;
                data.notes = data.notes.filter((n: any) => n.id !== id);
                
                if (data.notes.length === initialLength) {
                  res.statusCode = 404;
                  res.end(JSON.stringify({ error: 'Note not found' }));
                  return;
                }
                
                writeData(data);
                res.end(JSON.stringify({ success: true, message: 'Note deleted' }));
                return;
              }

              if (pathname === '/api/create-folder') {
                const name = params.get('name');
                if (!name) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Missing name parameter' }));
                  return;
                }
                
                if (!data.folders.includes(name)) {
                  data.folders.push(name);
                  writeData(data);
                }
                
                res.end(JSON.stringify({ success: true, folder: name }));
                return;
              }
              
              if (pathname === '/api/import') {
                 // For GET import, we expect the entire JSON string as a query param called 'data'
                 const dataStr = params.get('data');
                 if (!dataStr) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ error: 'Missing data parameter' }));
                    return;
                 }
                 try {
                    const parsed = JSON.parse(dataStr);
                    if (parsed.notes) data.notes = parsed.notes;
                    if (parsed.folders) data.folders = parsed.folders;
                    writeData(data);
                    res.end(JSON.stringify({ success: true }));
                 } catch (e) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ error: 'Invalid JSON data' }));
                 }
                 return;
              }

              // If no API matched
              next();
            });
          }
        }
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
