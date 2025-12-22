
import { TileType } from '../types';
import { TILE_SIZE, MAP_HEIGHT, MAP_WIDTH, COLORS } from '../constants';
import { drawLightGlow } from './renderHelpers';

export const drawStreetLight = (ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number) => {
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

export const drawTrafficLight = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.strokeStyle = '#171717';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + TILE_SIZE/2); ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE/2);
    ctx.moveTo(x + TILE_SIZE/2, y); ctx.lineTo(x + TILE_SIZE/2, y + TILE_SIZE);
    ctx.stroke();
    
    const cx = x + TILE_SIZE/2;
    const cy = y + TILE_SIZE/2;
    
    ctx.fillStyle = '#171717';
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI*2); ctx.fill();

    const offsets = [
        { dx: -10, dy: -10 },
        { dx: 10, dy: -10 },
        { dx: 10, dy: 10 },
        { dx: -10, dy: 10 },
    ];

    const time = Date.now() / 2000;
    const cycle = Math.floor(time) % 3; // 0 Green, 1 Yellow, 2 Red
    
    offsets.forEach((off, i) => {
        const lx = cx + off.dx;
        const ly = cy + off.dy;
        
        ctx.fillStyle = '#000';
        ctx.fillRect(lx - 3, ly - 3, 6, 6);
        
        let lightColor = '#ef4444';
        if (i % 2 === 0) {
            lightColor = cycle === 0 ? '#22c55e' : (cycle === 1 ? '#eab308' : '#ef4444');
        } else {
            lightColor = cycle === 0 ? '#ef4444' : (cycle === 1 ? '#ef4444' : '#22c55e');
        }
        
        ctx.fillStyle = lightColor;
        ctx.shadowColor = lightColor;
        ctx.shadowBlur = 4;
        ctx.beginPath(); ctx.arc(lx, ly, 1.5, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
    });
};

export const drawRoad = (ctx: CanvasRenderingContext2D, x: number, y: number, type: TileType, textures: any, map: number[][], gridX: number, gridY: number) => {
    ctx.fillStyle = textures['road'] || COLORS.road;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    
    const hasRoadTop = gridY > 0 && map[gridY-1][gridX] === TileType.ROAD_H;
    const hasRoadBottom = gridY < MAP_HEIGHT-1 && map[gridY+1][gridX] === TileType.ROAD_H;
    const hasRoadLeft = gridX > 0 && map[gridY][gridX-1] === TileType.ROAD_V;
    const hasRoadRight = gridX < MAP_WIDTH-1 && map[gridY][gridX+1] === TileType.ROAD_V;

    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2;
    const center = TILE_SIZE / 2;

    if (type === TileType.ROAD_H) {
        ctx.beginPath();
        if (hasRoadTop || hasRoadBottom) {
             ctx.strokeStyle = 'rgba(255,255,255,0.5)';
             ctx.setLineDash([15, 15]);
        } else {
             ctx.strokeStyle = '#eab308';
             ctx.setLineDash([10, 10]);
        }
        
        ctx.moveTo(x, y + center);
        ctx.lineTo(x + TILE_SIZE, y + center);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = '#d4d4d8';
        if (!hasRoadTop) ctx.fillRect(x, y, TILE_SIZE, 4);
        if (!hasRoadBottom) ctx.fillRect(x, y + TILE_SIZE - 4, TILE_SIZE, 4);

    } else if (type === TileType.ROAD_V) {
        ctx.beginPath();
        if (hasRoadLeft || hasRoadRight) {
             ctx.strokeStyle = 'rgba(255,255,255,0.5)';
             ctx.setLineDash([15, 15]);
        } else {
             ctx.strokeStyle = '#eab308';
             ctx.setLineDash([10, 10]);
        }

        ctx.moveTo(x + center, y);
        ctx.lineTo(x + center, y + TILE_SIZE);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#d4d4d8';
        if (!hasRoadLeft) ctx.fillRect(x, y, 4, TILE_SIZE);
        if (!hasRoadRight) ctx.fillRect(x + TILE_SIZE - 4, y, 4, TILE_SIZE);

    } else if (type === TileType.ROAD_CROSS) {
         ctx.fillStyle = '#fff';
         const cwW = 12;
         const cwL = TILE_SIZE - 10;
         
         ctx.fillRect(x + 5, y + 4, cwL, cwW);
         ctx.fillRect(x + 5, y + TILE_SIZE - 16, cwL, cwW);
         ctx.fillRect(x + 4, y + 5, cwW, cwL);
         ctx.fillRect(x + TILE_SIZE - 16, y + 5, cwW, cwL);
    }
};
