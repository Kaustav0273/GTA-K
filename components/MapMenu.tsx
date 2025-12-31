
import React, { useRef, useEffect, useState } from 'react';
import { GameState, TileType } from '../types';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from '../constants';

interface MapMenuProps {
  gameState: GameState;
  onResume: () => void;
  onQuit: () => void;
  onOptions: () => void;
  onSave: () => void;
}

const MapMenu: React.FC<MapMenuProps> = ({ gameState, onResume, onQuit, onOptions, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // View State: scale (zoom), translation x/y
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Initial fit
  useEffect(() => {
      const container = canvasRef.current?.parentElement;
      if (container) {
          const worldW = MAP_WIDTH * TILE_SIZE;
          const worldH = MAP_HEIGHT * TILE_SIZE;
          const scaleX = (container.clientWidth - 40) / worldW;
          const scaleY = (container.clientHeight - 40) / worldH;
          const k = Math.min(scaleX, scaleY);
          
          const x = (container.clientWidth - worldW * k) / 2;
          const y = (container.clientHeight - worldH * k) / 2;
          
          setView({ k, x, y });
      }
  }, []); // Run once on mount

  const handleWheel = (e: React.WheelEvent) => {
      e.stopPropagation();
      const zoomFactor = 0.1;
      const direction = e.deltaY > 0 ? -1 : 1;
      const newScale = Math.min(Math.max(0.1, view.k + direction * zoomFactor * view.k), 5);
      
      // Zoom towards center of screen to keep it simple, or just simple zoom
      // Calculate offset adjustment to zoom around center
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // World point under mouse before zoom
      const worldX = (mouseX - view.x) / view.k;
      const worldY = (mouseY - view.y) / view.k;
      
      // New offset
      const newX = mouseX - worldX * newScale;
      const newY = mouseY - worldY * newScale;

      setView({ k: newScale, x: newX, y: newY });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      setIsDragging(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (isDragging) {
          const dx = e.clientX - lastMousePos.current.x;
          const dy = e.clientY - lastMousePos.current.y;
          setView(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
          lastMousePos.current = { x: e.clientX, y: e.clientY };
      }
  };

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to match container
    const container = canvas.parentElement;
    if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    }

    const { map, vehicles, pedestrians, player } = gameState;

    // Clear
    ctx.fillStyle = '#101010';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    
    // Apply Transform
    ctx.translate(view.x, view.y);
    ctx.scale(view.k, view.k);

    // Calculate visible bounds to optimize
    // Only draw what's in visible canvas area (inverse transform)
    // For simplicity, just drawing all tiles for now as canvas clipping handles it, 
    // but we can skip loops.
    // Let's assume standard full draw for code simplicity unless perf hit.
    // 160x160 tiles = 25600 rects. Might be heavy.
    // Optimization:
    const startX = Math.max(0, Math.floor((-view.x / view.k) / TILE_SIZE));
    const startY = Math.max(0, Math.floor((-view.y / view.k) / TILE_SIZE));
    const endX = Math.min(MAP_WIDTH, Math.ceil(((canvas.width - view.x) / view.k) / TILE_SIZE));
    const endY = Math.min(MAP_HEIGHT, Math.ceil(((canvas.height - view.y) / view.k) / TILE_SIZE));

    // Draw Tiles
    if (map && map.length > 0) {
        for (let y = startY; y < endY; y++) {
            if (!map[y]) continue;
            for (let x = startX; x < endX; x++) {
                 const tile = map[y][x];
                 const px = x * TILE_SIZE;
                 const py = y * TILE_SIZE;

                 let color = '#222';
                 switch (tile) {
                     case TileType.GRASS: color = '#3f6212'; break; // Green-800
                     case TileType.WATER: color = '#1e3a8a'; break; // Blue-900
                     case TileType.SIDEWALK: color = '#52525b'; break; // Zinc-600
                     case TileType.FOOTPATH: color = '#6b7280'; break; // Gray-500
                     case TileType.BUILDING: color = '#000000'; break;
                     case TileType.SKYSCRAPER: color = '#1e293b'; break; // Slate-800
                     case TileType.SHOP: color = '#78350f'; break; // Amber-900
                     case TileType.MALL: color = '#f472b6'; break; // Pink-400
                     case TileType.HOSPITAL: color = '#ef4444'; break; // Red
                     case TileType.POLICE_STATION: color = '#3b82f6'; break; // Blue
                     case TileType.CONTAINER: color = '#b45309'; break; // Orange-700
                     case TileType.SHIP_DECK: color = '#713f12'; break; // Brown
                     case TileType.SAND: color = '#d6d3d1'; break;
                     case TileType.WALL: color = '#171717'; break;
                     case TileType.RUNWAY: color = '#171717'; break; // Dark
                     case TileType.TARMAC: color = '#3f3f46'; break; // Grey
                     case TileType.AIRPORT_TERMINAL: color = '#0ea5e9'; break; // Blue
                     case TileType.HANGAR: color = '#94a3b8'; break; // Slate
                     case TileType.CONSTRUCTION: color = '#78350f'; break; // Brown
                     case TileType.FOOTBALL_FIELD: color = '#15803d'; break; // Green
                     case TileType.ROAD_V:
                     case TileType.ROAD_H:
                     case TileType.ROAD_CROSS:
                         color = '#a1a1aa'; // Zinc-400
                         break;
                 }
                 ctx.fillStyle = color;
                 ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    // Draw Vehicles
    vehicles.forEach(v => {
        // Optimization: check bounds
        if (v.pos.x < startX * TILE_SIZE || v.pos.x > endX * TILE_SIZE) return;
        if (v.pos.y < startY * TILE_SIZE || v.pos.y > endY * TILE_SIZE) return;

        ctx.save();
        ctx.translate(v.pos.x, v.pos.y);
        ctx.rotate(v.angle);
        if (v.id === player.vehicleId) ctx.fillStyle = '#fff';
        else if (v.model === 'police' || v.model === 'swat') ctx.fillStyle = '#3b82f6';
        else if (v.model === 'plane' || v.model === 'jet') ctx.fillStyle = '#fff';
        else ctx.fillStyle = '#d4d4d8';
        ctx.fillRect(-v.size.x/2, -v.size.y/2, v.size.x, v.size.y);
        ctx.restore();
    });

    // Draw Pedestrians
    // Optimization: Skip rendering civs on full map to save perf, usually only need key items
    // But keeping it for completeness if zoomed in
    if (view.k > 0.5) { // Only draw peds if zoomed in enough
        pedestrians.forEach(p => {
             if (p.state === 'dead' || p.id === 'player') return;
             if (p.pos.x < startX * TILE_SIZE || p.pos.x > endX * TILE_SIZE) return;
             if (p.pos.y < startY * TILE_SIZE || p.pos.y > endY * TILE_SIZE) return;

             ctx.beginPath();
             ctx.arc(p.pos.x, p.pos.y, 8, 0, Math.PI * 2);
             ctx.fillStyle = p.role === 'police' ? '#3b82f6' : '#71717a';
             ctx.fill();
        });
    }

    // Draw Player
    ctx.save();
    ctx.translate(player.pos.x, player.pos.y);
    ctx.rotate(player.angle);
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 10;
    // Larger marker on full map
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-15, 12);
    ctx.lineTo(-15, -12);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }, [gameState, view]);

  return (
    <div className="absolute inset-0 z-[100] flex bg-black">
        {/* Left Nav */}
        <div className="w-64 bg-zinc-900 flex flex-col p-8 border-r border-gray-800 z-10">
             <h1 className="font-gta text-4xl text-white mb-10">MAP</h1>
             
             <div className="flex flex-col gap-4">
                 <button onClick={onResume} className="text-left font-gta text-2xl text-gray-400 hover:text-yellow-400 transition-colors">
                     RESUME
                 </button>
                 <button onClick={onSave} className="text-left font-gta text-2xl text-gray-400 hover:text-green-400 transition-colors">
                     SAVE GAME
                 </button>
                 <button onClick={onOptions} className="text-left font-gta text-2xl text-gray-400 hover:text-white transition-colors">
                     OPTIONS
                 </button>
                 <button onClick={onQuit} className="text-left font-gta text-2xl text-gray-400 hover:text-red-500 transition-colors mt-auto">
                     MAIN MENU
                 </button>
             </div>

             <div className="mt-auto text-gray-600 text-xs font-mono">
                 <p>VICE DIVIDE</p>
                 <p>GPS SIGNAL: STRONG</p>
             </div>
        </div>
        
        {/* Right Map */}
        <div className="flex-1 bg-zinc-950 relative overflow-hidden cursor-move"
             onWheel={handleWheel}
             onMouseDown={handleMouseDown}
             onMouseMove={handleMouseMove}
             onMouseUp={handleMouseUp}
             onMouseLeave={handleMouseUp}
        >
             <canvas ref={canvasRef} className="w-full h-full block" />
             
             {/* Map Controls */}
             <div className="absolute top-4 right-4 flex flex-col gap-2">
                 <div className="bg-black/50 px-3 py-1 text-white/50 text-xs font-mono rounded text-center mb-2 pointer-events-none">
                     SCROLL TO ZOOM • DRAG TO PAN
                 </div>
                 <div className="flex gap-2 justify-end">
                     <button 
                        className="w-10 h-10 bg-black/70 text-white rounded border border-white/20 hover:bg-white/20 text-xl font-bold"
                        onClick={() => setView(v => ({ ...v, k: Math.min(5, v.k * 1.2) }))}
                     >
                         +
                     </button>
                     <button 
                        className="w-10 h-10 bg-black/70 text-white rounded border border-white/20 hover:bg-white/20 text-xl font-bold"
                        onClick={() => setView(v => ({ ...v, k: Math.max(0.1, v.k / 1.2) }))}
                     >
                         -
                     </button>
                 </div>
             </div>
        </div>
    </div>
  );
};

export default MapMenu;
