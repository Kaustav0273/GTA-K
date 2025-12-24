

import React, { useRef, useEffect } from 'react';
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

    // Calculate Scale to fit map
    const worldW = MAP_WIDTH * TILE_SIZE;
    const worldH = MAP_HEIGHT * TILE_SIZE;
    
    // Maintain aspect ratio, fit inside canvas with padding
    const padding = 20;
    const availableW = canvas.width - padding * 2;
    const availableH = canvas.height - padding * 2;
    
    const scale = Math.min(availableW / worldW, availableH / worldH);
    
    // Center map
    const drawW = worldW * scale;
    const drawH = worldH * scale;
    const offsetX = (canvas.width - drawW) / 2;
    const offsetY = (canvas.height - drawH) / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Draw Tiles
    if (map && map.length > 0) {
        for (let y = 0; y < MAP_HEIGHT; y++) {
            if (!map[y]) continue;
            for (let x = 0; x < MAP_WIDTH; x++) {
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
    pedestrians.forEach(p => {
         if (p.state === 'dead' || p.id === 'player') return;
         ctx.beginPath();
         ctx.arc(p.pos.x, p.pos.y, 8, 0, Math.PI * 2);
         ctx.fillStyle = p.role === 'police' ? '#3b82f6' : '#71717a';
         ctx.fill();
    });

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
  }, [gameState]);

  return (
    <div className="absolute inset-0 z-[100] flex bg-black">
        {/* Left Nav */}
        <div className="w-64 bg-zinc-900 flex flex-col p-8 border-r border-gray-800">
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
        <div className="flex-1 bg-zinc-950 relative overflow-hidden">
             <canvas ref={canvasRef} className="w-full h-full block" />
             <div className="absolute top-4 right-4 bg-black/50 px-3 py-1 text-white/50 text-xs font-mono rounded">
                 FULL COVERAGE
             </div>
        </div>
    </div>
  );
};

export default MapMenu;
