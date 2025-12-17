import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3';

export interface Note {
  id: string;
  title: string;
  content: string;
  folder: string;
  createdAt: number;
  updatedAt: number;
  tags: string[];
}

export interface CanvasNode {
  id: string;
  noteId?: string; // If linked to a note
  text?: string;   // If just a text label
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'note' | 'text' | 'image';
}

export interface Canvas {
  id: string;
  title: string;
  nodes: CanvasNode[];
  edges: { from: string; to: string }[];
  updatedAt: number;
}

export interface GraphNode extends SimulationNodeDatum {
  id: string;
  title: string;
  group: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink extends SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

export type ViewMode = 'editor' | 'graph' | 'canvas';

// Helper to extract wiki links [[Note Title]]
export const extractLinks = (content: string): string[] => {
  const regex = /\[\[(.*?)\]\]/g;
  const matches = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    matches.push(match[1]);
  }
  return matches;
};

export const extractTags = (content: string): string[] => {
  const regex = /#(\w+)/g;
  const matches = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    matches.push(match[1]);
  }
  return matches;
};