
import { TileType } from '../types';
import { TILE_SIZE, COLORS, MAP_WIDTH, MAP_HEIGHT } from '../constants';
import { getTileAt, getTrafficLightState } from '../utils/gameUtils';
import { SHADOW_COLOR, SHADOW_OFFSET_X, SHADOW_OFFSET_Y, drawLightGlow } from './renderUtils';

export const drawStreetLight = (ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number) => {
    // Shadow for the pole
    const height = 40;
    const shadowX = height * SHADOW_OFFSET_X;
    const shadowY = height * SHADOW_OFFSET_Y;
    
    ctx.save();
    ctx.strokeStyle = SHADOW_COLOR;
    ctx.lineWidth = 4;
    // Removed blur for performance
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + shadowX, y + shadowY);
    ctx.stroke();
    ctx.restore();

    // Pole Base
    ctx.fillStyle = '#52525b';
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI*2); ctx.fill();

    // Arm length
    const armLen = 25;
    const lampX = x + Math.cos(rotation) * armLen;
    const lampY = y + Math.sin(rotation) * armLen;

    // Arm
    ctx.strokeStyle = '#52525b';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(lampX, lampY); ctx.stroke();

    // Lamp Head
    ctx.fillStyle = '#d4d4d8';
    ctx.beginPath(); ctx.arc(lampX, lampY, 4, 0, Math.PI*2); ctx.fill();

    // Light Glow
    drawLightGlow(ctx, lampX, lampY, 45, 'rgba(253, 224, 71, 0.25)');
};

export const drawTrafficLight = (ctx: CanvasRenderingContext2D, x: number, y: number, timeTicker: number) => {
    // Determine Light State
    const { ns, ew } = getTrafficLightState(timeTicker, x, y);

    // Shadow for wire/poles
    ctx.save();
    ctx.strokeStyle = SHADOW_COLOR;
    ctx.lineWidth = 3;
    ctx.translate(10, 10); // Shadow offset
    ctx.beginPath();
    ctx.moveTo(x + 10, y + TILE_SIZE/2 + 10); ctx.lineTo(x + TILE_SIZE + 10, y + TILE_SIZE/2 + 10);
    ctx.moveTo(x + TILE_SIZE/2 + 10, y + 10); ctx.lineTo(x + TILE_SIZE/2 + 10, y + TILE_SIZE + 10);
    ctx.stroke();
    ctx.restore();

    // Wire crossing
    ctx.strokeStyle = '#171717';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + TILE_SIZE/2); ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE/2);
    ctx.moveTo(x + TILE_SIZE/2, y); ctx.lineTo(x + TILE_SIZE/2, y + TILE_SIZE);
    ctx.stroke();
    
    // Center Hub
    const cx = x + TILE_SIZE/2;
    const cy = y + TILE_SIZE/2;
    
    ctx.fillStyle = '#171717';
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI*2); ctx.fill();

    const colorMap = {
        'GREEN': '#22c55e',
        'YELLOW': '#eab308',
        'RED': '#ef4444'
    };

    const offsets = [
        // Top Light (Faces Southbound Traffic coming from Top) -> Controls NS Traffic
        { dx: 0, dy: -12, color: colorMap[ns] },
        // Bottom Light (Faces Northbound Traffic coming from Bottom) -> Controls NS Traffic
        { dx: 0, dy: 12, color: colorMap[ns] },
        // Left Light (Faces Eastbound Traffic coming from Left) -> Controls EW Traffic
        { dx: -12, dy: 0, color: colorMap[ew] },
        // Right Light (Faces Westbound Traffic coming from Right) -> Controls EW Traffic
        { dx: 12, dy: 0, color: colorMap[ew] }
    ];

    offsets.forEach((off) => {
        const lx = cx + off.dx;
        const ly = cy + off.dy;
        
        // Box
        ctx.fillStyle = '#000';
        ctx.fillRect(lx - 3, ly - 3, 6, 6);
        
        // Light
        ctx.fillStyle = off.color;
        ctx.shadowColor = off.color;
        ctx.shadowBlur = 5;
        ctx.beginPath(); ctx.arc(lx, ly, 1.5, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
    });
};

export const drawRoad = (ctx: CanvasRenderingContext2D, x: number, y: number, type: TileType, textures: any, map: number[][], gridX: number, gridY: number, timeTicker: number) => {
    let roadColor = textures['road'] || COLORS.road;
    if (type === TileType.RUNWAY) roadColor = '#18181b'; 
    else if (type === TileType.TARMAC) roadColor = '#3f3f46';
    else if (type === TileType.MILITARY_GROUND) roadColor = '#4b5563'; // Concrete base color, noise applied later
    
    ctx.fillStyle = roadColor;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    
    if (type === TileType.MILITARY_GROUND) {
        // Camo Noise
        const hash = (gridX * 73856093) ^ (gridY * 19349663);
        ctx.fillStyle = (hash % 2 === 0) ? '#3f4f3a' : '#57534e'; // Green/Brown patches
        ctx.globalAlpha = 0.3;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.globalAlpha = 1.0;
        return;
    }
    
    if (type === TileType.TARMAC) {
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        if ((gridX + gridY) % 2 === 0) ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        return; 
    }

    const hasRoadTop = gridY > 0 && map[gridY-1][gridX] === type;
    const hasRoadBottom = gridY < MAP_HEIGHT-1 && map[gridY+1][gridX] === type;
    const hasRoadLeft = gridX > 0 && map[gridY][gridX-1] === type;
    const hasRoadRight = gridX < MAP_WIDTH-1 && map[gridY][gridX+1] === type;

    const center = TILE_SIZE / 2;

    if (type === TileType.RUNWAY) {
        if (hasRoadLeft && hasRoadRight) {
             ctx.fillStyle = '#fff'; ctx.fillRect(x + center - 4, y + 20, 8, TILE_SIZE - 40);
        }
        if (!hasRoadTop && hasRoadBottom) {
             ctx.fillStyle = '#fff'; ctx.font = 'bold 40px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
             ctx.fillText('18', x + center, y + center);
        } else if (hasRoadTop && !hasRoadBottom) {
             ctx.fillStyle = '#fff'; ctx.font = 'bold 40px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
             ctx.fillText('36', x + center, y + center);
        }
    } else if (type === TileType.ROAD_H) {
        ctx.strokeStyle = '#eab308'; ctx.lineWidth = 2; ctx.beginPath();
        if (hasRoadTop || hasRoadBottom) { ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.setLineDash([15, 15]); } else { ctx.strokeStyle = '#eab308'; ctx.setLineDash([10, 10]); }
        ctx.moveTo(x, y + center); ctx.lineTo(x + TILE_SIZE, y + center); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#d4d4d8'; if (!hasRoadTop) ctx.fillRect(x, y, TILE_SIZE, 4); if (!hasRoadBottom) ctx.fillRect(x, y + TILE_SIZE - 4, TILE_SIZE, 4);
    } else if (type === TileType.ROAD_V) {
        ctx.strokeStyle = '#eab308'; ctx.lineWidth = 2; ctx.beginPath();
        if (hasRoadLeft || hasRoadRight) { ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.setLineDash([15, 15]); } else { ctx.strokeStyle = '#eab308'; ctx.setLineDash([10, 10]); }
        ctx.moveTo(x + center, y); ctx.lineTo(x + center, y + TILE_SIZE); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#d4d4d8'; if (!hasRoadLeft) ctx.fillRect(x, y, 4, TILE_SIZE); if (!hasRoadRight) ctx.fillRect(x + TILE_SIZE - 4, y, 4, TILE_SIZE);
    } else if (type === TileType.ROAD_CROSS || type === TileType.RAIL_CROSSING) {
         if (type === TileType.RAIL_CROSSING) {
             const isRailV = (gridY > 0 && (map[gridY-1][gridX] === TileType.RAIL || map[gridY-1][gridX] === TileType.RAIL_CROSSING)) ||
                             (gridY < MAP_HEIGHT-1 && (map[gridY+1][gridX] === TileType.RAIL || map[gridY+1][gridX] === TileType.RAIL_CROSSING));
             
             const drawCrossingRail = (bx: number, by: number, ex: number, ey: number) => {
                 ctx.strokeStyle = '#27272a'; ctx.lineWidth = 6; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
                 ctx.strokeStyle = '#d4d4d8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
             };
             if (isRailV) { drawCrossingRail(x + 36, y, x + 36, y + TILE_SIZE); drawCrossingRail(x + 92, y, x + 92, y + TILE_SIZE); ctx.fillStyle = '#fbbf24'; ctx.fillRect(x + 20, y + 10, 2, TILE_SIZE - 20); ctx.fillRect(x + TILE_SIZE - 22, y + 10, 2, TILE_SIZE - 20); } 
             else { drawCrossingRail(x, y + 36, x + TILE_SIZE, y + 36); drawCrossingRail(x, y + 92, x + TILE_SIZE, y + 92); ctx.fillStyle = '#fbbf24'; ctx.fillRect(x + 10, y + 20, TILE_SIZE - 20, 2); ctx.fillRect(x + 10, y + TILE_SIZE - 22, TILE_SIZE - 20, 2); }
         } else {
             ctx.fillStyle = '#fff'; const cwW = 12; const cwL = TILE_SIZE - 10;
             ctx.fillRect(x + 5, y + 4, cwL, cwW); ctx.fillRect(x + 5, y + TILE_SIZE - 16, cwL, cwW); ctx.fillRect(x + 4, y + 5, cwW, cwL); ctx.fillRect(x + TILE_SIZE - 16, y + 5, cwW, cwL);
         }
    }
};

export const drawFence = (ctx: CanvasRenderingContext2D, x: number, y: number, type: TileType, textures: any, map: number[][], gridX: number, gridY: number, timeTicker: number) => {
    // Chainlink Fence
    ctx.strokeStyle = '#a3a3a3';
    ctx.lineWidth = 2;
    
    // Posts
    ctx.fillStyle = '#525252';
    if (type === TileType.FENCE_H) {
        for(let i=0; i<=TILE_SIZE; i+=32) {
            ctx.fillRect(x + i, y + TILE_SIZE/2 - 2, 4, 4); // Post base
            // Vertical post up to height? No, top down view. Just post tops.
        }
        // Mesh
        ctx.beginPath();
        ctx.moveTo(x, y + TILE_SIZE/2); ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE/2);
        ctx.stroke();
        // Cross pattern for mesh top-down look
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i=0; i<TILE_SIZE; i+=8) {
             ctx.moveTo(x + i, y + TILE_SIZE/2 - 2); ctx.lineTo(x + i + 4, y + TILE_SIZE/2 + 2);
             ctx.moveTo(x + i + 4, y + TILE_SIZE/2 - 2); ctx.lineTo(x + i, y + TILE_SIZE/2 + 2);
        }
        ctx.stroke();
    } else {
        for(let i=0; i<=TILE_SIZE; i+=32) {
            ctx.fillRect(x + TILE_SIZE/2 - 2, y + i, 4, 4);
        }
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + TILE_SIZE/2, y); ctx.lineTo(x + TILE_SIZE/2, y + TILE_SIZE);
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i=0; i<TILE_SIZE; i+=8) {
             ctx.moveTo(x + TILE_SIZE/2 - 2, y + i); ctx.lineTo(x + TILE_SIZE/2 + 2, y + i + 4);
             ctx.moveTo(x + TILE_SIZE/2 - 2, y + i + 4); ctx.lineTo(x + TILE_SIZE/2 + 2, y + i);
        }
        ctx.stroke();
    }
}

export const drawHelipad = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = '#3f3f46'; // Dark asphalt
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    
    // Circle
    ctx.strokeStyle = '#eab308'; // Yellow
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x + TILE_SIZE/2, y + TILE_SIZE/2, TILE_SIZE/2 - 10, 0, Math.PI*2);
    ctx.stroke();
    
    // 'H'
    ctx.fillStyle = '#eab308';
    ctx.fillRect(x + TILE_SIZE/2 - 20, y + TILE_SIZE/2 - 30, 10, 60);
    ctx.fillRect(x + TILE_SIZE/2 + 10, y + TILE_SIZE/2 - 30, 10, 60);
    ctx.fillRect(x + TILE_SIZE/2 - 20, y + TILE_SIZE/2 - 5, 40, 10);
}
