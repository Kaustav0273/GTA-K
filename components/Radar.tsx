
import React, { useRef, useEffect } from 'react';
import { GameState, TileType, EntityType } from '../types';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from '../constants';

interface RadarProps {
    gameState: GameState;
}

const Radar: React.FC<RadarProps> = ({ gameState }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { player, map, vehicles, pedestrians, mission } = gameState;
        
        // Radar Settings
        // Adjust zoom relative to map size, or keep consistent? 
        // 0.12 was fine for 50x50, might be okay for 128x128 but will see less.
        // Let's keep it zoomed in for gameplay utility.
        const zoom = 0.10; 
        const radarWidth = canvas.width;
        const radarHeight = canvas.height;

        // Clear Background
        ctx.fillStyle = '#18181b'; // Zinc-900
        ctx.fillRect(0, 0, radarWidth, radarHeight);

        ctx.save();
        
        // Center the radar on the canvas
        ctx.translate(radarWidth / 2, radarHeight / 2);
        
        // Transform: Scale and translate to player position (North Up)
        ctx.scale(zoom, zoom);
        ctx.translate(-player.pos.x, -player.pos.y);

        // Calculate visible tile bounds to optimize rendering
        const viewW = radarWidth / zoom;
        const viewH = radarHeight / zoom;
        
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
                        case TileType.MALL: color = '#f472b6'; break; // Pink-400 (Distinct Mall Color)
                        case TileType.HOSPITAL: color = '#ef4444'; break; // Red
                        case TileType.POLICE_STATION: color = '#3b82f6'; break; // Blue
                        case TileType.CONTAINER: color = '#b45309'; break; 
                        case TileType.SHIP_DECK: color = '#713f12'; break;
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
            ctx.save();
            ctx.translate(v.pos.x, v.pos.y);
            ctx.rotate(v.angle);
            
            if (v.model === 'police' || v.model === 'ambulance') {
                ctx.fillStyle = '#3b82f6'; 
                if (Date.now() % 400 < 200) ctx.fillStyle = '#ef4444';
            } else if (v.model === 'plane' || v.model === 'jet') {
                ctx.fillStyle = '#fff';
            } else if (v.id === player.vehicleId) {
                ctx.fillStyle = '#ffffff'; 
            } else {
                ctx.fillStyle = '#d4d4d8'; 
            }

            ctx.fillRect(-v.size.x/2, -v.size.y/2, v.size.x, v.size.y);
            ctx.restore();
        });

        // Draw Pedestrians
        pedestrians.forEach(p => {
             if (p.state === 'dead' || p.id === 'player') return;
             
             ctx.beginPath();
             ctx.arc(p.pos.x, p.pos.y, 8, 0, Math.PI * 2);
             
             if (p.weapon === 'pistol') {
                 ctx.fillStyle = '#ef4444'; 
             } else if (p.chatPartnerId) {
                 ctx.fillStyle = '#facc15'; 
             } else {
                 ctx.fillStyle = '#71717a'; 
             }
             ctx.fill();
        });

        ctx.restore();

        // Draw Player Marker
        ctx.save();
        ctx.translate(radarWidth / 2, radarHeight / 2);
        ctx.rotate(player.angle);
        
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(-8, 7);
        ctx.lineTo(-8, -7);
        ctx.fill();
        ctx.restore();

        // Draw 'N' icon
        ctx.save();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('N', radarWidth/2 - 4, 15);
        ctx.restore();

    }, [gameState]);

    return (
        <canvas 
            ref={canvasRef} 
            width={240} 
            height={160} 
            className="w-full h-full object-cover"
        />
    );
};

export default Radar;
