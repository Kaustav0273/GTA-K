
import { TileType } from '../types';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, COLORS } from '../constants';
import { getTileAt } from '../utils/gameUtils';
import { drawStreetLight } from './renderInfrastructure';

export const drawRailTile = (ctx: CanvasRenderingContext2D, x: number, y: number, map: number[][], px: number, py: number) => {
    const gridX = x;
    const gridY = y;
    const isR = (t: number) => t === TileType.RAIL || t === TileType.RAIL_CROSSING || t === TileType.TRAIN_STATION;
    const hasL = gridX > 0 && isR(map[gridY][gridX-1]); const hasR = gridX < MAP_WIDTH - 1 && isR(map[gridY][gridX+1]);
    const hasT = gridY > 0 && isR(map[gridY-1][gridX]); const hasB = gridY < MAP_HEIGHT - 1 && isR(map[gridY+1][gridX]);
    
    const drawRailLine = (bx: number, by: number, ex: number, ey: number, isCurved: boolean = false, cX?: number, cY?: number, radius?: number, startAng?: number, endAng?: number) => { 
        ctx.strokeStyle = '#27272a'; ctx.lineWidth = 6; ctx.lineCap = 'butt'; ctx.beginPath(); 
        if(isCurved) { ctx.arc(cX!, cY!, radius!, startAng!, endAng!); } else { ctx.moveTo(bx, by); ctx.lineTo(ex, ey); } 
        ctx.stroke(); 
        ctx.strokeStyle = '#d4d4d8'; ctx.lineWidth = 2; ctx.beginPath(); 
        if(isCurved) { ctx.arc(cX!, cY!, radius!, startAng!, endAng!); } else { ctx.moveTo(bx, by); ctx.lineTo(ex, ey); } 
        ctx.stroke(); 
    };
    
    const sleeperColor = '#3f2e26'; 
    const drawHorz = () => { ctx.fillStyle = sleeperColor; for(let i=4; i<TILE_SIZE; i+=16) { ctx.fillRect(px + i, py + 16, 8, TILE_SIZE - 32); ctx.fillStyle = '#18181b'; ctx.fillRect(px + i + 2, py + 38, 4, 4); ctx.fillRect(px + i + 2, py + TILE_SIZE - 42, 4, 4); ctx.fillStyle = sleeperColor; } drawRailLine(px, py + 36, px + TILE_SIZE, py + 36); drawRailLine(px, py + 92, px + TILE_SIZE, py + 92); };
    const drawVert = () => { ctx.fillStyle = sleeperColor; for(let i=4; i<TILE_SIZE; i+=16) { ctx.fillRect(px + 16, py + i, TILE_SIZE - 32, 8); ctx.fillStyle = '#18181b'; ctx.fillRect(px + 38, py + i + 2, 4, 4); ctx.fillRect(px + 94, py + i + 2, 4, 4); ctx.fillStyle = sleeperColor; } drawRailLine(px + 36, py, px + 36, py + TILE_SIZE); drawRailLine(px + 92, py, px + 92, py + TILE_SIZE); };
    const drawCurve = (cX: number, cY: number, startAng: number, endAng: number) => { ctx.save(); ctx.translate(cX, cY); const steps = 10; const rInner = 36; const rOuter = 92; ctx.fillStyle = sleeperColor; for(let i=0; i<=steps; i++) { const t = i / steps; let angle = startAng + (endAng - startAng) * t; ctx.save(); ctx.rotate(angle); ctx.translate((rInner + rOuter)/2, 0); ctx.fillRect(-(rOuter-rInner)/2 - 10, -4, (rOuter-rInner) + 20, 8); ctx.fillStyle = '#18181b'; ctx.fillRect(-(rOuter-rInner)/2 + 2, -2, 4, 4); ctx.fillRect((rOuter-rInner)/2 - 6, -2, 4, 4); ctx.fillStyle = sleeperColor; ctx.restore(); } ctx.restore(); drawRailLine(0,0,0,0, true, cX, cY, 36, startAng, endAng); drawRailLine(0,0,0,0, true, cX, cY, 92, startAng, endAng); };
    
    const isStraightHorz = hasL && hasR; const isStraightVert = hasT && hasB; let drawn = false;
    if (isStraightHorz && isStraightVert) { ctx.fillStyle = sleeperColor; for(let i=4; i<TILE_SIZE; i+=16) { ctx.fillRect(px + i, py + 16, 8, TILE_SIZE - 32); } drawRailLine(px, py + 36, px + TILE_SIZE, py + 36); drawRailLine(px, py + 92, px + TILE_SIZE, py + 92); drawRailLine(px + 36, py, px + 36, py + TILE_SIZE); drawRailLine(px + 92, py, px + 92, py + TILE_SIZE); drawn = true; } 
    else if (isStraightHorz) { drawHorz(); drawn = true; } else if (isStraightVert) { drawVert(); drawn = true; } else if (hasL && hasB) { drawCurve(px, py + TILE_SIZE, -Math.PI * 0.5, 0); drawn = true; } else if (hasL && hasT) { drawCurve(px, py, 0, Math.PI * 0.5); drawn = true; } else if (hasR && hasB) { drawCurve(px + TILE_SIZE, py + TILE_SIZE, Math.PI, Math.PI * 1.5); drawn = true; } else if (hasR && hasT) { drawCurve(px + TILE_SIZE, py, Math.PI, Math.PI * 0.5); drawn = true; }
    if (!drawn) { if (hasL || hasR) drawHorz(); else if (hasT || hasB) drawVert(); else drawHorz(); }
};

export const drawConstructionSite = (ctx: CanvasRenderingContext2D, x: number, y: number, px: number, py: number, renderList: any[]) => {
    ctx.fillStyle = '#78350f'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
    const seed = x * 997 + y * 79;
    if (seed % 3 === 0) { ctx.fillStyle = '#5c2d08'; ctx.beginPath(); ctx.ellipse(px + TILE_SIZE/2, py + TILE_SIZE/2, 40, 20, (seed % 4) * Math.PI/4, 0, Math.PI*2); ctx.fill(); }
    const cX = 60; const cY = 16; const cW = 11; const cH = 7;
    const relX = x - cX; const relY = y - cY;
    if (relX >= 0 && relX < cW && relY >= 0 && relY < cH) {
        const isTop = relY === 0; const isBottom = relY === cH - 1; const isLeft = relX === 0; const isRight = relX === cW - 1;
        if (isTop || isBottom || isLeft || isRight) {
            ctx.fillStyle = 'rgba(0,0,0,0.3)'; if (isTop) ctx.fillRect(px, py + 2, TILE_SIZE, 4);
            ctx.fillStyle = '#a8a29e'; 
            if (isTop) ctx.fillRect(px, py, TILE_SIZE, 2); if (isBottom) ctx.fillRect(px, py + TILE_SIZE - 4, TILE_SIZE, 2); if (isLeft) ctx.fillRect(px, py, 2, TILE_SIZE); if (isRight) ctx.fillRect(px + TILE_SIZE - 2, py, 2, TILE_SIZE);
            ctx.fillStyle = '#57534e'; if (isTop || isBottom) { ctx.fillRect(px + TILE_SIZE/2, py - 4, 4, 12); } if (isLeft || isRight) { ctx.fillRect(px - 2, py + TILE_SIZE/2, 8, 4); }
        }
        
        if (relX > 2 && relX < cW - 2 && relY > 2 && relY < cH - 2) { 
            ctx.fillStyle = '#451a03'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE); 
            if ((relX + relY) % 2 === 0) { 
                ctx.fillStyle = '#d6d3d1'; ctx.fillRect(px + 10, py + 10, TILE_SIZE - 20, TILE_SIZE - 20); 
                ctx.strokeStyle = '#44403c'; ctx.lineWidth = 2; ctx.beginPath(); 
                ctx.moveTo(px + TILE_SIZE/2, py + 10); ctx.lineTo(px + TILE_SIZE/2, py + TILE_SIZE - 10); 
                ctx.moveTo(px + 10, py + TILE_SIZE/2); ctx.lineTo(px + TILE_SIZE - 10, py + TILE_SIZE/2); ctx.stroke(); 
            } 
        }
        else if (!isTop && !isBottom && !isLeft && !isRight) { 
            if (seed % 5 === 0) { ctx.fillStyle = '#b45309'; ctx.fillRect(px + 20, py + 30, 60, 20); ctx.fillStyle = '#d97706'; ctx.fillRect(px + 20, py + 30, 55, 15); } 
            else if (seed % 7 === 0) { ctx.fillStyle = '#0ea5e9'; ctx.fillRect(px + 30, py + 10, 20, 80); ctx.fillStyle = '#0284c7'; ctx.fillRect(px + 45, py + 10, 5, 80); } 
            else if (seed % 11 === 0) { ctx.fillStyle = '#1e3a8a'; ctx.fillRect(px + 40, py + 40, 25, 25); ctx.fillStyle = '#fff'; ctx.fillRect(px + 45, py + 45, 15, 15); } 
            else if (seed % 3 === 0) { ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(px, py + 20); ctx.quadraticCurveTo(px + 60, py + 60, px + TILE_SIZE, py + 40); ctx.stroke(); } 
        }
        
        if (relX === 1 && relY === 1) { 
            ctx.fillStyle = '#facc15'; ctx.fillRect(px + 20, py + 20, TILE_SIZE - 40, TILE_SIZE - 40); 
            ctx.strokeStyle = '#a16207'; ctx.lineWidth = 4; ctx.beginPath(); 
            ctx.moveTo(px+20, py+20); ctx.lineTo(px+TILE_SIZE-20, py+TILE_SIZE-20); 
            ctx.moveTo(px+TILE_SIZE-20, py+20); ctx.lineTo(px+20, py+TILE_SIZE-20); ctx.stroke(); 
            renderList.push({ y: py, draw: () => { ctx.save(); ctx.translate(px + TILE_SIZE/2, py + TILE_SIZE/2); ctx.rotate(Date.now() / 5000); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(0, -10, 400, 20); ctx.restore(); }}); 
        }
    }
};

export const drawFootballField = (ctx: CanvasRenderingContext2D, x: number, y: number, px: number, py: number, renderList: any[]) => {
    const fieldX = 73; const fieldY = 96; const fieldW = 14; const fieldH = 8;
    const relX = x - fieldX; const relY = y - fieldY;
    if (relX >= 0 && relX < fieldW && relY >= 0 && relY < fieldH) {
        const stripe = Math.floor(relX / 1) % 2 === 0; ctx.fillStyle = stripe ? '#15803d' : '#16a34a'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        const lineW = 4; const fieldWorldX = fieldX * TILE_SIZE; const fieldWorldY = fieldY * TILE_SIZE; const fieldWorldW = fieldW * TILE_SIZE; const fieldWorldH = fieldH * TILE_SIZE; const centerX = fieldWorldX + fieldWorldW / 2; const centerY = fieldWorldY + fieldWorldH / 2;
        ctx.save(); ctx.beginPath(); ctx.rect(px, py, TILE_SIZE, TILE_SIZE); ctx.clip(); ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = lineW; ctx.lineCap = 'butt';
        ctx.strokeRect(fieldWorldX + lineW/2, fieldWorldY + lineW/2, fieldWorldW - lineW, fieldWorldH - lineW); ctx.beginPath(); ctx.moveTo(centerX, fieldWorldY); ctx.lineTo(centerX, fieldWorldY + fieldWorldH); ctx.stroke();
        const circleRadius = TILE_SIZE * 1.5; ctx.beginPath(); ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(centerX, centerY, 6, 0, Math.PI * 2); ctx.fill();
        const penaltyW = TILE_SIZE * 2.5; const penaltyH = TILE_SIZE * 4; const penaltyY = centerY - penaltyH / 2; ctx.strokeRect(fieldWorldX + lineW/2, penaltyY, penaltyW, penaltyH); ctx.strokeRect(fieldWorldX + fieldWorldW - penaltyW - lineW/2, penaltyY, penaltyW, penaltyH); ctx.restore();
        if (relX === 0 && relY === 4) { renderList.push({ y: py + TILE_SIZE, draw: () => { const postH = 20; const postW = 6; ctx.fillStyle = '#fbbf24'; ctx.fillRect(px + lineW, py - 10, postW, postH); ctx.fillRect(px + lineW, py + TILE_SIZE - 10, postW, postH); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(px + lineW, py, 2, TILE_SIZE); } }); }
        if (relX === fieldW - 1 && relY === 4) { renderList.push({ y: py + TILE_SIZE, draw: () => { const postH = 20; const postW = 6; ctx.fillStyle = '#fbbf24'; ctx.fillRect(px + TILE_SIZE - lineW - postW, py - 10, postW, postH); ctx.fillRect(px + TILE_SIZE - lineW - postW, py + TILE_SIZE - 10, postW, postH); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(px + TILE_SIZE - lineW - 2, py, 2, TILE_SIZE); } }); }
    }
};

export const drawSidewalkTile = (ctx: CanvasRenderingContext2D, x: number, y: number, map: number[][], px: number, py: number, textures: any, renderList: any[]) => {
    ctx.fillStyle = textures['sidewalk'] || COLORS.sidewalk; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE); ctx.strokeStyle = '#57534e'; ctx.lineWidth = 1; ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
    
    // Footpath texture variance
    if (getTileAt(map, px, py) === TileType.FOOTPATH) { ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE); }
    
    // Manholes
    if (x % 5 === 0 && y % 5 === 0) { ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(px+TILE_SIZE, py+TILE_SIZE, 3, 0, Math.PI*2); ctx.fill(); }
    
    // Street Lights
    if ((x * 7 + y * 13) % 4 === 0) {
        let rot = -1;
        if (getTileAt(map, px + TILE_SIZE, py) === TileType.ROAD_V) rot = 0;
        else if (getTileAt(map, px - TILE_SIZE, py) === TileType.ROAD_V) rot = Math.PI;
        else if (getTileAt(map, px, py + TILE_SIZE) === TileType.ROAD_H) rot = Math.PI/2;
        else if (getTileAt(map, px, py - TILE_SIZE) === TileType.ROAD_H) rot = 3*Math.PI/2;
        
        if (rot !== -1) { 
            renderList.push({ y: py + 99999, draw: () => drawStreetLight(ctx, px + TILE_SIZE/2, py + TILE_SIZE/2, rot) }); 
        }
    }
};
