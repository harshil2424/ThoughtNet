import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Note, extractLinks, GraphNode, GraphLink } from '../types';

interface GraphViewProps {
  notes: Note[];
  onNodeClick: (noteId: string) => void;
}

const GraphView: React.FC<GraphViewProps> = ({ notes, onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Calculate connections for highlighting
  const connectionMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    const titleToId = new Map<string, string>(notes.map(n => [n.title.toLowerCase(), n.id] as [string, string]));

    notes.forEach(source => {
      const links = extractLinks(source.content);
      links.forEach(linkedTitle => {
        const targetId = titleToId.get(linkedTitle.toLowerCase());
        if (targetId) {
          if (!map.has(source.id)) map.set(source.id, new Set());
          if (!map.has(targetId)) map.set(targetId, new Set());
          
          map.get(source.id)!.add(targetId);
          map.get(targetId)!.add(source.id);
        }
      });
    });
    return map;
  }, [notes]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // D3 Logic
  useEffect(() => {
    if (!svgRef.current || notes.length === 0) return;

    // 1. Prepare Data
    // Clone to prevent React strict mode double-invokation issues with D3 mutation
    const nodes: GraphNode[] = notes.map(note => ({
      id: note.id,
      title: note.title,
      group: note.folder === 'Inbox' ? 1 : note.folder === 'Projects' ? 2 : 3
    }));

    const links: GraphLink[] = [];
    const titleToIdMap = new Map<string, string>(notes.map(n => [n.title.toLowerCase(), n.id] as [string, string]));

    notes.forEach(note => {
      const linkedTitles = extractLinks(note.content);
      linkedTitles.forEach(linkedTitle => {
        const targetId = titleToIdMap.get(linkedTitle.toLowerCase());
        if (targetId) {
          links.push({
            source: note.id,
            target: targetId,
          });
        }
      });
    });

    // Clear previous
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = dimensions.width;
    const height = dimensions.height;

    // Zoom container
    const g = svg.append("g");
    
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom)
       .on("dblclick.zoom", null); // Disable double click to zoom so we can use it for editing

    // Background click to deselect
    svg.on("click", () => {
        setSelectedNodeId(null);
    });

    // Simulation
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(30));

    // Draw Links
    const link = g.append("g")
      .attr("class", "links") // Class for easy selection later
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#4b5563")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 1.5);

    // Draw Nodes
    const node = g.append("g")
      .attr("class", "nodes")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", 8)
      .attr("fill", d => {
        if (d.group === 1) return "#facc15"; // Yellow for Inbox
        if (d.group === 2) return "#7c3aed"; // Violet for Projects
        return "#3b82f6"; // Blue for Notes
      })
      .attr("cursor", "pointer")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5);

    // Interactions
    node.on("click", (event, d) => {
        event.stopPropagation();
        setSelectedNodeId(d.id);

        // Center View on Node
        // We need to calculate the transform that puts (d.x, d.y) at (width/2, height/2)
        // Let's zoom into scale 1.5 for a "focus" feel
        const scale = 1.5;
        const transform = d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(scale)
            .translate(-d.x!, -d.y!);

        svg.transition().duration(750).call(zoom.transform, transform);
    });

    node.on("dblclick", (event, d) => {
        event.stopPropagation();
        onNodeClick(d.id);
    });

    // Labels
    const labels = g.append("g")
      .attr("class", "labels")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .text(d => d.title)
      .attr("x", 12)
      .attr("y", 3)
      .attr("fill", "#dcddde")
      .attr("font-size", "10px")
      .style("pointer-events", "none");

    // Simulation Tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as GraphNode).x!)
        .attr("y1", d => (d.source as GraphNode).y!)
        .attr("x2", d => (d.target as GraphNode).x!)
        .attr("y2", d => (d.target as GraphNode).y!);

      node
        .attr("cx", d => d.x!)
        .attr("cy", d => d.y!);

      labels
        .attr("x", d => d.x! + 12)
        .attr("y", d => d.y! + 3);
    });

    // Drag behavior
    const drag = d3.drag<SVGCircleElement, GraphNode>()
      .on("start", (event) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      })
      .on("drag", (event) => {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      })
      .on("end", (event) => {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      });

    node.call(drag);

    return () => {
      simulation.stop();
    };
  }, [notes, dimensions, onNodeClick]); // Only re-run if data structure changes

  // Separate Effect for Highlighting to avoid re-simulating
  useEffect(() => {
      if (!svgRef.current) return;
      
      const svg = d3.select(svgRef.current);
      const nodes = svg.selectAll<SVGCircleElement, GraphNode>(".nodes circle");
      const links = svg.selectAll<SVGLineElement, GraphLink>(".links line");
      const labels = svg.selectAll<SVGTextElement, GraphNode>(".labels text");

      const baseOpacity = 1;
      const dimmedOpacity = 0.1;

      if (!selectedNodeId) {
          // Reset to default
          nodes.transition().duration(300).style("opacity", baseOpacity).attr("stroke", "#fff");
          links.transition().duration(300).style("opacity", 0.6).attr("stroke", "#4b5563").attr("stroke-width", 1.5);
          labels.transition().duration(300).style("opacity", baseOpacity);
          return;
      }

      // Helper to check connection
      const isConnected = (id: string) => {
          if (id === selectedNodeId) return true;
          const neighbors = connectionMap.get(selectedNodeId);
          return neighbors ? neighbors.has(id) : false;
      };

      // Filter selections for "raising" (bringing to front)
      const connectedLinks = links.filter(d => {
           const sourceId = (d.source as GraphNode).id;
           const targetId = (d.target as GraphNode).id;
           return (sourceId === selectedNodeId && isConnected(targetId)) ||
                  (targetId === selectedNodeId && isConnected(sourceId));
      });
      
      const connectedNodes = nodes.filter(d => isConnected(d.id));
      const connectedLabels = labels.filter(d => isConnected(d.id));

      // Bring to front
      connectedLinks.raise();
      connectedNodes.raise();
      connectedLabels.raise();

      // Update Nodes
      nodes.transition().duration(300)
           .style("opacity", d => isConnected(d.id) ? 1 : dimmedOpacity)
           .attr("stroke", d => d.id === selectedNodeId ? "#fff" : (isConnected(d.id) ? "#dcddde" : "#fff"))
           .attr("stroke-width", d => d.id === selectedNodeId ? 3 : 1.5);

      // Update Labels
      labels.transition().duration(300)
            .style("opacity", d => isConnected(d.id) ? 1 : dimmedOpacity);

      // Update Links
      links.transition().duration(300)
           .style("opacity", d => {
               const sourceId = (d.source as GraphNode).id;
               const targetId = (d.target as GraphNode).id;
               const isDirectLink = (sourceId === selectedNodeId && isConnected(targetId)) ||
                                    (targetId === selectedNodeId && isConnected(sourceId));
               return isDirectLink ? 1 : dimmedOpacity;
           })
           .attr("stroke", d => {
               const sourceId = (d.source as GraphNode).id;
               const targetId = (d.target as GraphNode).id;
               const isDirectLink = (sourceId === selectedNodeId && isConnected(targetId)) ||
                                    (targetId === selectedNodeId && isConnected(sourceId));
               return isDirectLink ? "#7c3aed" : "#4b5563";
           })
           .attr("stroke-width", d => {
               const sourceId = (d.source as GraphNode).id;
               const targetId = (d.target as GraphNode).id;
               const isDirectLink = (sourceId === selectedNodeId && isConnected(targetId)) ||
                                    (targetId === selectedNodeId && isConnected(sourceId));
               return isDirectLink ? 2.5 : 1.5;
           });

  }, [selectedNodeId, connectionMap]);

  return (
    <div ref={containerRef} className="w-full h-full bg-obsidian-bg overflow-hidden relative">
        <div className="absolute top-4 left-4 z-10 bg-black/50 p-2 rounded text-xs text-gray-400 pointer-events-none">
            <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-yellow-400"></div> Inbox</div>
            <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Notes</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-violet-600"></div> Projects</div>
        </div>
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className="block" />
    </div>
  );
};

export default GraphView;