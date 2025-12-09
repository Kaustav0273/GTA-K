
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
        const zoom = 0.12; 
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
        // Viewport in world coords
        const viewW = radarWidth / zoom;
        const viewH = radarHeight / zoom;
        
        const startX = Math.max(0, Math.floor((player.pos.x - viewW/2) / TILE_SIZE));
        const endX = Math.min(MAP_WIDTH, Math.ceil((player.pos.x + viewW/2) / TILE_SIZE));
        const startY = Math.max(0, Math.floor((player.pos.y - viewH/2) / TILE_SIZE));
        const endY = Math.min(MAP_HEIGHT, Math.ceil((player.pos.y + viewH/2) / TILE_SIZE));

        // Draw Map Tiles - Safety check for empty map
        if (map && map.length > 0) {
            for (let y = startY; y < endY; y++) {
                if (!map[y]) continue; // Skip invalid rows
                
                for (let x = startX; x < endX; x++) {
                    // Skip invalid columns
                    if (x < 0 || x >= map[y].length) continue;

                    const tile = map[y][x];
                    const px = x * TILE_SIZE;
                    const py = y * TILE_SIZE;

                    let color = '#222';
                    switch (tile) {
                        case TileType.GRASS: color = '#3f6212'; break; // Green-800
                        case TileType.WATER: color = '#1e3a8a'; break; // Blue-900
                        case TileType.SIDEWALK: color = '#52525b'; break; // Zinc-600
                        case TileType.BUILDING: color = '#000000'; break;
                        case TileType.SKYSCRAPER: color = '#1e293b'; break; // Slate-800
                        case TileType.SHOP: color = '#78350f'; break; // Amber-900 (Brownish)
                        case TileType.HOSPITAL: color = '#ef4444'; break; // Red
                        case TileType.POLICE_STATION: color = '#3b82f6'; break; // Blue
                        case TileType.ROAD_V:
                        case TileType.ROAD_H:
                        case TileType.ROAD_CROSS:
                            color = '#a1a1aa'; // Zinc-400 (Roads lighter on radar)
                            break;
                    }

                    ctx.fillStyle = color;
                    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                }
            }
        }

        // Draw Vehicles
        vehicles.forEach(v => {
            // Simple rectangle for cars
            ctx.save();
            ctx.translate(v.pos.x, v.pos.y);
            ctx.rotate(v.angle);
            
            // Highlight Police/Emergency
            if (v.model === 'police' || v.model === 'ambulance') {
                ctx.fillStyle = '#3b82f6'; // Blue
                // Flash red/blue for police
                if (Date.now() % 400 < 200) ctx.fillStyle = '#ef4444';
            } else if (v.id === player.vehicleId) {
                ctx.fillStyle = '#ffffff'; // Player car white
            } else {
                ctx.fillStyle = '#d4d4d8'; // Light gray
            }

            ctx.fillRect(-v.size.x/2, -v.size.y/2, v.size.x, v.size.y);
            ctx.restore();
        });

        // Draw Pedestrians (Dots)
        pedestrians.forEach(p => {
             if (p.state === 'dead' || p.id === 'player') return;
             
             ctx.beginPath();
             ctx.arc(p.pos.x, p.pos.y, 8, 0, Math.PI * 2);
             
             if (p.weapon === 'pistol') {
                 ctx.fillStyle = '#ef4444'; // Red (Threat)
             } else if (p.chatPartnerId) {
                 ctx.fillStyle = '#facc15'; // Yellow (Interacting)
             } else {
                 ctx.fillStyle = '#71717a'; // Zinc-500
             }
             ctx.fill();
        });

        ctx.restore();

        // Draw Player Marker (Fixed Center)
        ctx.save();
        ctx.translate(radarWidth / 2, radarHeight / 2);
        // Player marker arrow points in player's direction
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

        // Draw 'N' icon for North
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
