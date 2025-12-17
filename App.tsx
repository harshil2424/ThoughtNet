import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileText, 
  Search, 
  Settings, 
  Plus, 
  Folder, 
  Network, 
  Layout, 
  ChevronRight, 
  ChevronDown,
  Menu,
  X,
  Download,
  Upload,
  FolderPlus
} from 'lucide-react';
import { Note, extractLinks, extractTags, ViewMode } from './types';
import * as Storage from './services/storageService';
import GraphView from './components/GraphView';
import CanvasBoard from './components/CanvasBoard';

// --- Utility Components ---

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }> = 
  ({ className, variant = 'primary', ...props }) => {
  const base = "px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-obsidian-accent text-white hover:bg-opacity-90",
    secondary: "bg-gray-700 text-gray-200 hover:bg-gray-600",
    ghost: "text-gray-400 hover:text-white hover:bg-white/5"
  };
  return <button className={`${base} ${variants[variant]} ${className || ''}`} {...props} />;
};

// --- Main App ---

const App = () => {
  // State
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [canvasRefreshKey, setCanvasRefreshKey] = useState(0); // To force canvas reload on import
  
  // Load data on mount
  useEffect(() => {
    const loadedNotes = Storage.getNotes();
    const loadedFolders = Storage.getFolders();
    setNotes(loadedNotes);
    setFolders(loadedFolders);
    if (loadedNotes.length > 0) setActiveNoteId(loadedNotes[0].id);
  }, []);

  // Persist notes
  useEffect(() => {
    if (notes.length > 0) Storage.saveNotes(notes);
  }, [notes]);

  const activeNote = useMemo(() => notes.find(n => n.id === activeNoteId), [notes, activeNoteId]);

  // Actions
  const handleCreateNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: 'Untitled Note',
      content: '',
      folder: 'Inbox', // Default to Inbox, user can move it
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: []
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
    setViewMode('editor');
  };

  const handleCreateFolder = () => {
    const name = prompt("Enter new folder name:");
    if (name && name.trim() !== "") {
        if (folders.includes(name.trim())) {
            alert("Folder already exists.");
            return;
        }
        const newFolders = [...folders, name.trim()];
        setFolders(newFolders);
        Storage.saveFolders(newFolders);
    }
  };

  const handleUpdateNote = (id: string, updates: Partial<Note>) => {
    setNotes(prev => prev.map(n => {
      if (n.id !== id) return n;
      const updated = { ...n, ...updates, updatedAt: Date.now() };
      // Auto-extract tags
      if (updates.content !== undefined) {
        updated.tags = extractTags(updates.content);
      }
      return updated;
    }));
  };

  const handleDeleteNote = (id: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      setNotes(prev => prev.filter(n => n.id !== id));
      if (activeNoteId === id) setActiveNoteId(null);
    }
  };

  // --- Import / Export ---
  const handleExportData = () => {
    const exportData = {
        notes: notes,
        folders: folders,
        canvases: Storage.getCanvases(),
        exportedAt: Date.now(),
        appVersion: '1.0'
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `obsidian-mvp-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target?.result as string);
            
            // Import Folders
            if (data.folders && Array.isArray(data.folders)) {
                // Merge unique folders
                const mergedFolders = Array.from(new Set([...folders, ...data.folders]));
                setFolders(mergedFolders);
                Storage.saveFolders(mergedFolders);
            }

            // Import Notes
            if (data.notes && Array.isArray(data.notes)) {
                // Merge: Overwrite existing ID, add new
                // Explicitly type the Map to avoid inference errors with array map
                const mergedNotesMap = new Map<string, Note>(notes.map(n => [n.id, n] as [string, Note]));
                data.notes.forEach((n: Note) => mergedNotesMap.set(n.id, n));
                const mergedNotes = Array.from(mergedNotesMap.values());
                
                setNotes(mergedNotes);
                Storage.saveNotes(mergedNotes);
            }

            // Import Canvases
            if (data.canvases && Array.isArray(data.canvases)) {
                Storage.saveCanvases(data.canvases);
                setCanvasRefreshKey(prev => prev + 1); // Force canvas reload
            }

            alert(`Import successful! ${data.notes?.length || 0} notes processed.`);
        } catch (error) {
            console.error(error);
            alert('Error importing file. Invalid JSON.');
        }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  // Group notes for sidebar
  const filteredNotes = notes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()));

  // Render Helpers
  const renderNoteList = (title: string, list: Note[], icon: React.ReactNode) => (
    <div className="mb-4" key={title}>
      <div className="flex items-center text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-2">
        {icon} <span className="ml-2">{title}</span>
      </div>
      {list.length === 0 && <div className="text-gray-600 text-xs px-2 italic">Empty</div>}
      {list.map(note => (
        <div
          key={note.id}
          onClick={() => { setActiveNoteId(note.id); setViewMode('editor'); }}
          className={`
            px-3 py-2 text-sm rounded cursor-pointer flex items-center gap-2 truncate transition-colors
            ${activeNoteId === note.id ? 'bg-obsidian-accent/20 text-white border-l-2 border-obsidian-accent' : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'}
          `}
        >
          <FileText size={14} className="shrink-0" />
          <span className="truncate">{note.title}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex h-screen w-screen bg-obsidian-bg text-obsidian-text overflow-hidden font-sans">
      
      {/* --- Sidebar --- */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-0'} bg-obsidian-sidebar border-r border-obsidian-border flex flex-col transition-all duration-300 ease-in-out shrink-0 overflow-hidden relative`}>
        {/* Header */}
        <div className="p-4 border-b border-obsidian-border flex items-center justify-between">
          <div className="font-bold text-lg tracking-tight flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-purple-600 to-blue-600 rounded-md"></div>
            Obsidian MVP
          </div>
        </div>

        {/* Search & Actions */}
        <div className="p-3 gap-2 flex flex-col">
           <div className="relative">
             <Search className="absolute left-2 top-2.5 text-gray-500" size={14} />
             <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#252525] border border-obsidian-border rounded px-8 py-2 text-sm text-gray-300 focus:outline-none focus:border-obsidian-accent"
             />
           </div>
           <div className="flex gap-2">
             <Button variant="primary" onClick={handleCreateNote} className="flex-1 justify-center">
               <Plus size={16} /> Note
             </Button>
             <Button variant="secondary" onClick={handleCreateFolder} className="flex-1 justify-center" title="New Folder">
               <FolderPlus size={16} /> Folder
             </Button>
           </div>
        </div>

        {/* File Tree */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {folders.map(folder => (
            renderNoteList(folder, filteredNotes.filter(n => n.folder === folder), <Folder size={12} />)
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-obsidian-border flex flex-col gap-2 bg-obsidian-sidebar">
            <div className="flex gap-2">
                <Button variant="secondary" className="flex-1 text-xs py-1" onClick={handleExportData} title="Export JSON">
                    <Download size={12} /> Export
                </Button>
                <Button variant="secondary" className="flex-1 text-xs py-1" onClick={() => fileInputRef.current?.click()} title="Import JSON">
                    <Upload size={12} /> Import
                </Button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".json" 
                    onChange={handleImportData} 
                />
            </div>
            <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                <span>{notes.length} notes</span>
                <button onClick={() => setViewMode('graph')} className="hover:text-white flex items-center gap-1"><Network size={12} /> Graph</button>
            </div>
        </div>
      </div>

      {/* --- Main Area --- */}
      <div className="flex-1 flex flex-col h-full relative">
        
        {/* Top Bar */}
        <div className="h-12 border-b border-obsidian-border flex items-center justify-between px-4 bg-obsidian-bg shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-gray-400 hover:text-white">
              {isSidebarOpen ? <Menu size={18} /> : <Menu size={18} />}
            </button>
            <div className="h-4 w-[1px] bg-gray-700 mx-2"></div>
            
            {/* View Toggles */}
            <div className="flex bg-[#252525] rounded p-0.5">
               <button 
                onClick={() => setViewMode('editor')}
                className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1.5 ${viewMode === 'editor' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}
               >
                 <FileText size={12} /> Editor
               </button>
               <button 
                onClick={() => setViewMode('graph')}
                className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1.5 ${viewMode === 'graph' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}
               >
                 <Network size={12} /> Graph
               </button>
               <button 
                onClick={() => setViewMode('canvas')}
                className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1.5 ${viewMode === 'canvas' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}
               >
                 <Layout size={12} /> Canvas
               </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeNoteId && viewMode === 'editor' && (
                <>
                <Button variant="ghost" className="text-red-400 hover:bg-red-900/20" onClick={() => handleDeleteNote(activeNoteId)}>
                  <span className="text-xs">Delete</span>
                </Button>
                </>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
          
          {/* EDITOR VIEW */}
          {viewMode === 'editor' && activeNote ? (
            <div className="h-full flex flex-col max-w-4xl mx-auto w-full">
              {/* Note Header */}
              <div className="px-8 pt-8 pb-4">
                 <input 
                  type="text" 
                  value={activeNote.title}
                  onChange={(e) => handleUpdateNote(activeNote.id, { title: e.target.value })}
                  className="bg-transparent text-3xl font-bold w-full focus:outline-none text-white placeholder-gray-600"
                  placeholder="Note Title"
                 />
                 <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                        <Folder size={12} />
                        <select 
                            value={activeNote.folder}
                            onChange={(e) => handleUpdateNote(activeNote.id, { folder: e.target.value })}
                            className="bg-transparent focus:outline-none hover:text-white cursor-pointer"
                        >
                            {folders.map(f => (
                                <option key={f} value={f} className="bg-obsidian-bg">{f}</option>
                            ))}
                        </select>
                    </div>
                    <span>|</span>
                    <span>{activeNote.tags.map(t => `#${t}`).join(' ')}</span>
                 </div>
              </div>
              
              {/* Note Body */}
              <div className="flex-1 px-8 pb-8 overflow-y-auto">
                <textarea
                  value={activeNote.content}
                  onChange={(e) => handleUpdateNote(activeNote.id, { content: e.target.value })}
                  className="w-full h-full bg-transparent resize-none focus:outline-none text-gray-300 leading-7 font-mono text-sm"
                  placeholder="Start writing... Use [[Link]] to connect ideas."
                />
              </div>
            </div>
          ) : viewMode === 'editor' && !activeNote ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-600">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <FileText size={32} />
                </div>
                <p>Select a note or create a new one.</p>
            </div>
          ) : null}

          {/* GRAPH VIEW */}
          {viewMode === 'graph' && (
            <GraphView 
                notes={notes} 
                onNodeClick={(id) => {
                    setActiveNoteId(id);
                    setViewMode('editor');
                }} 
            />
          )}

          {/* CANVAS VIEW */}
          {viewMode === 'canvas' && (
             <CanvasBoard 
                key={canvasRefreshKey}
                notes={notes} 
                onOpenNote={(id) => {
                    setActiveNoteId(id);
                    setViewMode('editor');
                }}
             />
          )}
        </div>
      </div>
    </div>
  );
};

export default App;