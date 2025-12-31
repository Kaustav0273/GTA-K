
import React, { useRef, useEffect } from 'react';
import { GameState, TileType } from '../types';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from '../constants';

interface RadarProps {
    gameState: GameState;
    zoomLevel?: number;
    className?: string;
}

const Radar: React.FC<RadarProps> = ({ gameState, zoomLevel = 0.10, className = "w-full h-full object-cover" }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // Dynamic sizing based on parent container
        const parent = canvas.parentElement;
        if (parent) {
            canvas.width = parent.clientWidth;
            canvas.height = parent.clientHeight;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { player, map, vehicles, pedestrians, safehouses } = gameState;
        
        const radarWidth = canvas.width;
        const radarHeight = canvas.height;

        // Clear Background
        ctx.fillStyle = '#18181b'; // Zinc-900
        ctx.fillRect(0, 0, radarWidth, radarHeight);

        ctx.save();
        
        ctx.translate(radarWidth / 2, radarHeight / 2);
        
        ctx.scale(zoomLevel, zoomLevel);
        ctx.translate(-player.pos.x, -player.pos.y);

        const viewW = radarWidth / zoomLevel;
        const viewH = radarHeight / zoomLevel;
        
        const startX = Math.max(0, Math.floor((player.pos.x - viewW/2) / TILE_SIZE));
        const endX = Math.min(MAP_WIDTH, Math.ceil((player.pos.x + viewW/2) / TILE_SIZE));
        const startY = Math.max(0, Math.floor((player.pos.y - viewH/2) / TILE_SIZE));
        const endY = Math.min(MAP_HEIGHT, Math.ceil((player.pos.y + viewH/2) / TILE_SIZE));

        // Draw Map Tiles
        if (map && map.length > 0) {
            for (let y = startY; y < endY; y++) {
                if (!map[y]) continue; 
                
                for (let x = startX; x < endX; x++) {
                    if (x < 0 || x >= map[y].length) continue;

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
                        case TileType.MALL: color = '#f472b6'; break; 
                        case TileType.HOSPITAL: color = '#ef4444'; break; 
                        case TileType.POLICE_STATION: color = '#3b82f6'; break; 
                        case TileType.CONTAINER: color = '#b45309'; break; 
                        case TileType.SHIP_DECK: color = '#713f12'; break;
                        case TileType.SAND: color = '#d6d3d1'; break;
                        case TileType.WALL: color = '#171717'; break;
                        case TileType.RUNWAY: color = '#171717'; break; 
                        case TileType.TARMAC: color = '#3f3f46'; break; 
                        case TileType.AIRPORT_TERMINAL: color = '#0ea5e9'; break; 
                        case TileType.HANGAR: color = '#94a3b8'; break; 
                        case TileType.CONSTRUCTION: color = '#78350f'; break; 
                        case TileType.FOOTBALL_FIELD: color = '#15803d'; break;
                        case TileType.RAIL: color = '#292524'; break;
                        case TileType.RAIL_CROSSING: color = '#292524'; break;
                        case TileType.MILITARY_GROUND: color = '#4b5563'; break;
                        case TileType.FENCE_H:
                        case TileType.FENCE_V: color = '#a3a3a3'; break;
                        case TileType.BUNKER: color = '#3f4f3a'; break;
                        case TileType.WATCHTOWER: color = '#171717'; break;
                        case TileType.HELIPAD: color = '#3f3f46'; break;
                        case TileType.WAREHOUSE: color = '#374151'; break;
                        case TileType.FACTORY: color = '#7f1d1d'; break;
                        case TileType.TENEMENT: color = '#9f1239'; break;
                        case TileType.PROJECTS: color = '#525252'; break;
                        case TileType.SAFEHOUSE: color = '#22c55e'; break;
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
        
        // Draw Safehouses
        safehouses.forEach(sh => {
             const px = sh.tile.x * TILE_SIZE;
             const py = sh.tile.y * TILE_SIZE;
             ctx.fillStyle = sh.owned ? '#22c55e' : '#eab308';
             ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        });

        // Draw Vehicles (simple dots/rects)
        vehicles.forEach(v => {
            // Optimization: Skip off-screen
            if (v.pos.x < player.pos.x - viewW/2 - 100 || v.pos.x > player.pos.x + viewW/2 + 100) return;
            if (v.pos.y < player.pos.y - viewH/2 - 100 || v.pos.y > player.pos.y + viewH/2 + 100) return;

            ctx.save();
            ctx.translate(v.pos.x, v.pos.y);
            ctx.rotate(v.angle);
            ctx.fillStyle = v.id === player.vehicleId ? '#fff' : '#ccc';
            if (v.model === 'police' || v.model === 'swat') ctx.fillStyle = '#3b82f6';
            else if (v.model === 'tank') ctx.fillStyle = '#166534';
            
            ctx.fillRect(-v.size.x/2, -v.size.y/2, v.size.x, v.size.y);
            ctx.restore();
        });

        // Draw Pedestrians (Dots) - Hide when zoomed out too much
        if (zoomLevel > 0.05) {
            pedestrians.forEach(p => {
                 if (p.state === 'dead' || p.id === 'player') return;
                 // Optimization
                 if (p.pos.x < player.pos.x - viewW/2 - 50 || p.pos.x > player.pos.x + viewW/2 + 50) return;
                 if (p.pos.y < player.pos.y - viewH/2 - 50 || p.pos.y > player.pos.y + viewH/2 + 50) return;
                 
                 ctx.beginPath();
                 ctx.arc(p.pos.x, p.pos.y, 8, 0, Math.PI * 2);
                 
                 if (p.role === 'army') ctx.fillStyle = '#166534';
                 else if (p.weapon === 'pistol' || p.role === 'police') ctx.fillStyle = '#ef4444';
                 else ctx.fillStyle = '#71717a'; 
                 
                 ctx.fill();
            });
        }

        // Draw Player Arrow
        ctx.save();
        ctx.translate(player.pos.x, player.pos.y);
        ctx.rotate(player.angle);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        // Scale player marker up if zoomed out
        const markerScale = Math.max(1, 0.1 / zoomLevel);
        ctx.scale(markerScale, markerScale);
        ctx.moveTo(10, 0);
        ctx.lineTo(-8, 6);
        ctx.lineTo(-8, -6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.restore();
    }, [gameState, zoomLevel]);

    return (
        <canvas 
            ref={canvasRef} 
            className={className}
        />
    );
};

export default Radar;
