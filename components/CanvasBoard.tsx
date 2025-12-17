import React, { useState, useRef, useEffect } from 'react';
import { CanvasNode, Note, Canvas } from '../types';
import { Move, Plus, X } from 'lucide-react';
import * as Storage from '../services/storageService';

interface CanvasBoardProps {
  notes: Note[];
  onOpenNote: (id: string) => void;
}

const CanvasBoard: React.FC<CanvasBoardProps> = ({ notes, onOpenNote }) => {
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Load initial state
  useEffect(() => {
    const canvases = Storage.getCanvases();
    if (canvases.length > 0) {
        setNodes(canvases[0].nodes);
    }
  }, []);

  // Save on change
  useEffect(() => {
    if (nodes.length === 0) return; // Optional: Don't save empty if we don't want to wipe on initial load glitch
    
    const canvas: Canvas = {
        id: 'default',
        title: 'Main Canvas',
        nodes: nodes,
        edges: [], // Edges not implemented in UI yet
        updatedAt: Date.now()
    };
    Storage.saveCanvases([canvas]);
  }, [nodes]);

  const addNode = (note: Note) => {
    // Check if already on canvas
    if (nodes.find(n => n.noteId === note.id)) return;

    const newNode: CanvasNode = {
      id: Math.random().toString(36).substr(2, 9),
      noteId: note.id,
      x: 100 + nodes.length * 20,
      y: 100 + nodes.length * 20,
      width: 250,
      height: 150,
      type: 'note'
    };
    setNodes([...nodes, newNode]);
  };

  const handleDragStart = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    
    setDraggingId(id);
    setDragOffset({
      x: e.clientX - node.x,
      y: e.clientY - node.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingId) return;
    
    setNodes(prev => prev.map(n => {
      if (n.id !== draggingId) return n;
      return {
        ...n,
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      };
    }));
  };

  const handleMouseUp = () => {
    setDraggingId(null);
  };

  const removeNode = (id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
  };

  // Helper to find note content
  const getNote = (id?: string) => notes.find(n => n.id === id);

  return (
    <div 
      className="w-full h-full relative overflow-hidden bg-[#1a1a1a]"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        backgroundImage: 'radial-gradient(#333 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}
    >
      {/* Sidebar Overlay to Add Notes */}
      <div className="absolute left-4 top-4 w-64 max-h-[calc(100%-2rem)] overflow-y-auto bg-obsidian-sidebar border border-obsidian-border rounded p-2 z-20 opacity-80 hover:opacity-100 transition-opacity">
        <h3 className="text-sm font-bold mb-2 text-gray-400">Add to Canvas</h3>
        {notes.map(note => (
            <div 
                key={note.id}
                onClick={() => addNode(note)}
                className="p-2 mb-1 text-sm bg-obsidian-bg rounded cursor-pointer hover:bg-obsidian-accent/20 truncate"
            >
                {note.title}
            </div>
        ))}
      </div>

      {/* Nodes */}
      {nodes.map(node => {
        const noteData = getNote(node.noteId);
        if (!noteData) return null;

        return (
          <div
            key={node.id}
            style={{
              left: node.x,
              top: node.y,
              width: node.width,
              height: node.height,
            }}
            className="absolute bg-obsidian-bg border border-obsidian-border rounded-lg shadow-xl flex flex-col group select-none"
          >
            {/* Header */}
            <div 
              className="h-8 bg-obsidian-sidebar border-b border-obsidian-border flex items-center justify-between px-2 cursor-grab active:cursor-grabbing"
              onMouseDown={(e) => handleDragStart(e, node.id)}
            >
              <span className="font-semibold text-xs text-gray-300 truncate">{noteData.title}</span>
              <div className="flex items-center gap-1">
                 <button onClick={() => onOpenNote(noteData.id)} title="Open Note" className="text-gray-500 hover:text-white"><Move size={12} /></button>
                 <button onClick={(e) => { e.stopPropagation(); removeNode(node.id); }} className="text-gray-500 hover:text-red-400"><X size={12} /></button>
              </div>
            </div>
            {/* Content Preview */}
            <div className="flex-1 p-3 overflow-hidden text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">
              {noteData.content.slice(0, 150)}{noteData.content.length > 150 ? '...' : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CanvasBoard;