
import { MutableGameState, TileType, GameSettings } from '../types';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, COLORS } from '../constants';
import { getTileAt, isSolid } from '../utils/gameUtils';

import { SHADOW_OFFSET_X, SHADOW_OFFSET_Y, SHADOW_COLOR, drawLightGlow, drawRoundRectPath } from './renderUtils';
import { drawBuilding, getBuildingHeight } from './renderBuildings';
import { drawStreetLight, drawTrafficLight, drawRoad, drawFence, drawHelipad } from './renderInfrastructure';
import { drawVehicle, drawCharacter, drawDrop } from './renderEntities';

// Re-export common functions if needed by other components, though mostly internal to renderGame
export { drawBuilding, getBuildingHeight, drawStreetLight, drawTrafficLight, drawRoad, drawVehicle, drawCharacter };

export const renderGame = (ctx: CanvasRenderingContext2D, state: MutableGameState, textures: any, settings?: GameSettings) => {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    
    const isMobile = width < 768;
    const zoom = isMobile ? 0.6 : 1;
    
    let buffer = 0;
    if (settings) {
        switch(settings.drawDistance) {
            case 'LOW': buffer = 0; break;
            case 'MED': buffer = 200; break;
            case 'HIGH': buffer = 500; break;
            case 'ULTRA': buffer = 1000; break;
        }
    }
    
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    
    const camCenterX = state.camera.x + width / 2;
    const camCenterY = state.camera.y + height / 2;

    ctx.translate(width / 2, height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-camCenterX, -camCenterY);
    
    const visibleWidth = width / zoom;
    const visibleHeight = height / zoom;
    
    const camX = camCenterX - visibleWidth / 2 - buffer;
    const camY = camCenterY - visibleHeight / 2 - buffer;
    const camW = visibleWidth + (buffer * 2);
    const camH = visibleHeight + (buffer * 2);

    const startCol = Math.max(0, Math.floor(camX / TILE_SIZE));
    const endCol = Math.min(MAP_WIDTH, Math.floor((camX + camW) / TILE_SIZE) + 1);
    const startRow = Math.max(0, Math.floor(camY / TILE_SIZE));
    const endRow = Math.min(MAP_HEIGHT, Math.floor((camY + camH) / TILE_SIZE) + 1);

    const renderList: { y: number, draw: () => void }[] = [];

    // LAYER 1: GROUND & Gather Static Renderables
    for (let y = startRow; y < endRow; y++) {
        for (let x = startCol; x < endCol; x++) {
            if (y >= 0 && y < MAP_HEIGHT && x >= 0 && x < MAP_WIDTH) {
                const tile = state.map[y][x];
                const px = x * TILE_SIZE;
                const py = y * TILE_SIZE;
                
                if (tile === TileType.GRASS) {
                    ctx.fillStyle = textures['grass'] || COLORS.grass;
                    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    const seed = (x * 123 + y * 456);
                    if (seed % 7 === 0) {
                        ctx.fillStyle = 'rgba(0,0,0,0.4)';
                        ctx.beginPath(); ctx.arc(px + 35, py + 35, 18, 0, Math.PI*2); ctx.fill();
                        renderList.push({
                             y: py + 45,
                             draw: () => {
                                 ctx.fillStyle = '#14532d'; ctx.beginPath(); ctx.arc(px + 32, py + 32, 16, 0, Math.PI*2); ctx.fill();
                                 ctx.fillStyle = '#166534'; ctx.beginPath(); ctx.arc(px + 32, py + 32, 10, 0, Math.PI*2); ctx.fill();
                             }
                        });
                    }
                } else if (tile === TileType.RAIL) {
                    // RE-INJECTING RAIL RENDER LOGIC
                    const gridX = Math.round(px / TILE_SIZE); const gridY = Math.round(py / TILE_SIZE);
                    const isR = (t: number) => t === TileType.RAIL || t === TileType.RAIL_CROSSING || t === TileType.TRAIN_STATION;
                    const hasL = gridX > 0 && isR(state.map[gridY][gridX-1]); const hasR = gridX < MAP_WIDTH - 1 && isR(state.map[gridY][gridX+1]);
                    const hasT = gridY > 0 && isR(state.map[gridY-1][gridX]); const hasB = gridY < MAP_HEIGHT - 1 && isR(state.map[gridY+1][gridX]);
                    const drawRailLine = (bx: number, by: number, ex: number, ey: number, isCurved: boolean = false, cX?: number, cY?: number, radius?: number, startAng?: number, endAng?: number) => { ctx.strokeStyle = '#27272a'; ctx.lineWidth = 6; ctx.lineCap = 'butt'; ctx.beginPath(); if(isCurved) { ctx.arc(cX!, cY!, radius!, startAng!, endAng!); } else { ctx.moveTo(bx, by); ctx.lineTo(ex, ey); } ctx.stroke(); ctx.strokeStyle = '#d4d4d8'; ctx.lineWidth = 2; ctx.beginPath(); if(isCurved) { ctx.arc(cX!, cY!, radius!, startAng!, endAng!); } else { ctx.moveTo(bx, by); ctx.lineTo(ex, ey); } ctx.stroke(); };
                    const sleeperColor = '#3f2e26'; 
                    const drawHorz = () => { ctx.fillStyle = sleeperColor; for(let i=4; i<TILE_SIZE; i+=16) { ctx.fillRect(px + i, py + 16, 8, TILE_SIZE - 32); ctx.fillStyle = '#18181b'; ctx.fillRect(px + i + 2, py + 38, 4, 4); ctx.fillRect(px + i + 2, py + TILE_SIZE - 42, 4, 4); ctx.fillStyle = sleeperColor; } drawRailLine(px, py + 36, px + TILE_SIZE, py + 36); drawRailLine(px, py + 92, px + TILE_SIZE, py + 92); };
                    const drawVert = () => { ctx.fillStyle = sleeperColor; for(let i=4; i<TILE_SIZE; i+=16) { ctx.fillRect(px + 16, py + i, TILE_SIZE - 32, 8); ctx.fillStyle = '#18181b'; ctx.fillRect(px + 38, py + i + 2, 4, 4); ctx.fillRect(px + 94, py + i + 2, 4, 4); ctx.fillStyle = sleeperColor; } drawRailLine(px + 36, py, px + 36, py + TILE_SIZE); drawRailLine(px + 92, py, px + 92, py + TILE_SIZE); };
                    const drawCurve = (cX: number, cY: number, startAng: number, endAng: number) => { ctx.save(); ctx.translate(cX, cY); const steps = 10; const rInner = 36; const rOuter = 92; ctx.fillStyle = sleeperColor; for(let i=0; i<=steps; i++) { const t = i / steps; let angle = startAng + (endAng - startAng) * t; ctx.save(); ctx.rotate(angle); ctx.translate((rInner + rOuter)/2, 0); ctx.fillRect(-(rOuter-rInner)/2 - 10, -4, (rOuter-rInner) + 20, 8); ctx.fillStyle = '#18181b'; ctx.fillRect(-(rOuter-rInner)/2 + 2, -2, 4, 4); ctx.fillRect((rOuter-rInner)/2 - 6, -2, 4, 4); ctx.fillStyle = sleeperColor; ctx.restore(); } ctx.restore(); drawRailLine(0,0,0,0, true, cX, cY, 36, startAng, endAng); drawRailLine(0,0,0,0, true, cX, cY, 92, startAng, endAng); };
                    const isStraightHorz = hasL && hasR; const isStraightVert = hasT && hasB; let drawn = false;
                    if (isStraightHorz && isStraightVert) { ctx.fillStyle = sleeperColor; for(let i=4; i<TILE_SIZE; i+=16) { ctx.fillRect(px + i, py + 16, 8, TILE_SIZE - 32); } drawRailLine(px, py + 36, px + TILE_SIZE, py + 36); drawRailLine(px, py + 92, px + TILE_SIZE, py + 92); drawRailLine(px + 36, py, px + 36, py + TILE_SIZE); drawRailLine(px + 92, py, px + 92, py + TILE_SIZE); drawn = true; } 
                    else if (isStraightHorz) { drawHorz(); drawn = true; } else if (isStraightVert) { drawVert(); drawn = true; } else if (hasL && hasB) { drawCurve(px, py + TILE_SIZE, -Math.PI * 0.5, 0); drawn = true; } else if (hasL && hasT) { drawCurve(px, py, 0, Math.PI * 0.5); drawn = true; } else if (hasR && hasB) { drawCurve(px + TILE_SIZE, py + TILE_SIZE, Math.PI, Math.PI * 1.5); drawn = true; } else if (hasR && hasT) { drawCurve(px + TILE_SIZE, py, Math.PI, Math.PI * 0.5); drawn = true; }
                    if (!drawn) { if (hasL || hasR) drawHorz(); else if (hasT || hasB) drawVert(); else drawHorz(); }

                } else if (tile === TileType.CONSTRUCTION) {
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
                        // ... inner construction ...
                        if (relX > 2 && relX < cW - 2 && relY > 2 && relY < cH - 2) { ctx.fillStyle = '#451a03'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE); if ((relX + relY) % 2 === 0) { ctx.fillStyle = '#d6d3d1'; ctx.fillRect(px + 10, py + 10, TILE_SIZE - 20, TILE_SIZE - 20); ctx.strokeStyle = '#44403c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px + TILE_SIZE/2, py + 10); ctx.lineTo(px + TILE_SIZE/2, py + TILE_SIZE - 10); ctx.moveTo(px + 10, py + TILE_SIZE/2); ctx.lineTo(px + TILE_SIZE - 10, py + TILE_SIZE/2); ctx.stroke(); } }
                        else if (!isTop && !isBottom && !isLeft && !isRight) { if (seed % 5 === 0) { ctx.fillStyle = '#b45309'; ctx.fillRect(px + 20, py + 30, 60, 20); ctx.fillStyle = '#d97706'; ctx.fillRect(px + 20, py + 30, 55, 15); } else if (seed % 7 === 0) { ctx.fillStyle = '#0ea5e9'; ctx.fillRect(px + 30, py + 10, 20, 80); ctx.fillStyle = '#0284c7'; ctx.fillRect(px + 45, py + 10, 5, 80); } else if (seed % 11 === 0) { ctx.fillStyle = '#1e3a8a'; ctx.fillRect(px + 40, py + 40, 25, 25); ctx.fillStyle = '#fff'; ctx.fillRect(px + 45, py + 45, 15, 15); } else if (seed % 3 === 0) { ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(px, py + 20); ctx.quadraticCurveTo(px + 60, py + 60, px + TILE_SIZE, py + 40); ctx.stroke(); } }
                        if (relX === 1 && relY === 1) { ctx.fillStyle = '#facc15'; ctx.fillRect(px + 20, py + 20, TILE_SIZE - 40, TILE_SIZE - 40); ctx.strokeStyle = '#a16207'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(px+20, py+20); ctx.lineTo(px+TILE_SIZE-20, py+TILE_SIZE-20); ctx.moveTo(px+TILE_SIZE-20, py+20); ctx.lineTo(px+20, py+TILE_SIZE-20); ctx.stroke(); renderList.push({ y: py, draw: () => { ctx.save(); ctx.translate(px + TILE_SIZE/2, py + TILE_SIZE/2); ctx.rotate(Date.now() / 5000); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(0, -10, 400, 20); ctx.restore(); }}); }
                    }
                } else if (tile === TileType.FOOTBALL_FIELD) {
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
                } else if (tile === TileType.SIDEWALK || tile === TileType.FOOTPATH) {
                    ctx.fillStyle = textures['sidewalk'] || COLORS.sidewalk; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE); ctx.strokeStyle = '#57534e'; ctx.lineWidth = 1; ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
                    if (tile === TileType.FOOTPATH) { ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE); }
                    if (x % 5 === 0 && y % 5 === 0) { ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(px+TILE_SIZE, py+TILE_SIZE, 3, 0, Math.PI*2); ctx.fill(); }
                    if ((x * 7 + y * 13) % 4 === 0) {
                        let rot = -1;
                        if (getTileAt(state.map, px + TILE_SIZE, py) === TileType.ROAD_V) rot = 0;
                        else if (getTileAt(state.map, px - TILE_SIZE, py) === TileType.ROAD_V) rot = Math.PI;
                        else if (getTileAt(state.map, px, py + TILE_SIZE) === TileType.ROAD_H) rot = Math.PI/2;
                        else if (getTileAt(state.map, px, py - TILE_SIZE) === TileType.ROAD_H) rot = 3*Math.PI/2;
                        if (rot !== -1) { renderList.push({ y: py + 99999, draw: () => drawStreetLight(ctx, px + TILE_SIZE/2, py + TILE_SIZE/2, rot) }); }
                    }
                } else if (tile === TileType.BUILDING || tile === TileType.HOSPITAL || tile === TileType.POLICE_STATION || tile === TileType.SKYSCRAPER || tile === TileType.SHOP || tile === TileType.MALL || tile === TileType.CONTAINER || tile === TileType.PAINT_SHOP || tile === TileType.AIRPORT_TERMINAL || tile === TileType.HANGAR || tile === TileType.TRAIN_STATION || tile === TileType.BUNKER || tile === TileType.WATCHTOWER || tile === TileType.WAREHOUSE || tile === TileType.FACTORY || tile === TileType.TENEMENT || tile === TileType.PROJECTS) {
                     let drawWidth = TILE_SIZE;
                     let skip = false;

                     if (tile === TileType.CONTAINER) {
                         const hasLeft = x > 0 && state.map[y][x-1] === TileType.CONTAINER;
                         const hasRight = x < MAP_WIDTH - 1 && state.map[y][x+1] === TileType.CONTAINER;
                         if (hasLeft) skip = true; else if (hasRight) drawWidth = TILE_SIZE * 2;
                     }

                     if (!skip) {
                         ctx.fillStyle = '#171717'; 
                         ctx.fillRect(px, py, drawWidth, TILE_SIZE);

                         let opacity = 1;
                         const height = getBuildingHeight(tile, px, py);
                         const p = state.player;
                         
                         if (p.pos.x >= px && p.pos.x <= px + drawWidth &&
                             p.pos.y >= py - height && p.pos.y <= py + TILE_SIZE) {
                                if ((py + TILE_SIZE) > p.pos.y) {
                                    opacity = 0.4;
                                }
                         }

                         renderList.push({
                            y: py + TILE_SIZE, 
                            draw: () => drawBuilding(ctx, px, py, tile, textures, opacity, drawWidth)
                         });
                     }
                } else if (tile === TileType.FENCE_H || tile === TileType.FENCE_V) {
                    drawRoad(ctx, px, py, TileType.MILITARY_GROUND, textures, state.map, x, y, state.timeTicker); // Ground under fence
                    renderList.push({ y: py + TILE_SIZE, draw: () => drawFence(ctx, px, py, tile, textures, state.map, x, y, state.timeTicker) });
                } else if (tile === TileType.HELIPAD) {
                    drawHelipad(ctx, px, py);
                } else if (tile === TileType.SHIP_DECK) {
                    ctx.fillStyle = '#78350f'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE); ctx.fillStyle = 'rgba(0,0,0,0.1)'; for(let i=0; i<TILE_SIZE; i+=8) ctx.fillRect(px+i, py, 1, TILE_SIZE);
                    const below = getTileAt(state.map, px, py + TILE_SIZE); if (below === TileType.WATER) { ctx.fillStyle = '#451a03'; ctx.fillRect(px, py + TILE_SIZE - 4, TILE_SIZE, 4); }
                } else if (tile === TileType.WATER) {
                    ctx.fillStyle = COLORS.water; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE); ctx.fillStyle = 'rgba(255,255,255,0.1)'; const offset = (Date.now() / 50) % 20; ctx.beginPath(); ctx.arc(px + 20 + offset, py + 20, 5, 0, Math.PI*2); ctx.fill();
                } else if (tile === TileType.ROAD_CROSS) {
                    drawRoad(ctx, px, py, tile, textures, state.map, x, y, state.timeTicker); renderList.push({ y: py + 99999, draw: () => drawTrafficLight(ctx, px, py, state.timeTicker) });
                } else {
                    drawRoad(ctx, px, py, tile, textures, state.map, x, y, state.timeTicker);
                }
            }
        }
    }
    
    state.drops.forEach(d => { if (d.pos.x < camX || d.pos.x > camX + camW || d.pos.y < camY || d.pos.y > camY + camH) return; renderList.push({ y: d.pos.y, draw: () => drawDrop(ctx, d) }); });
    state.pedestrians.forEach(p => { if (p.pos.x < camX || p.pos.x > camX + camW || p.pos.y < camY || p.pos.y > camY + camH) return; if (p.state === 'dead') { ctx.save(); ctx.translate(p.pos.x, p.pos.y); ctx.fillStyle = '#7f1d1d'; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.ellipse(0, 0, 15, 12, Math.random(), 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1; ctx.rotate(p.angle); ctx.fillStyle = p.color; ctx.fillRect(-8,-4,16,8); ctx.restore(); } });
    state.vehicles.forEach(v => { if (v.pos.x < camX - 100 || v.pos.x > camX + camW + 100 || v.pos.y < camY - 100 || v.pos.y > camY + camH + 100) return; renderList.push({ y: v.pos.y, draw: () => drawVehicle(ctx, v) }); });
    state.pedestrians.forEach(p => { if (p.pos.x < camX || p.pos.x > camX + camW || p.pos.y < camY || p.pos.y > camY + camH) return; if (p.state !== 'dead') renderList.push({ y: p.pos.y, draw: () => drawCharacter(ctx, p) }); });
    if (!state.player.vehicleId) { renderList.push({ y: state.player.pos.y, draw: () => drawCharacter(ctx, state.player) }); }

    renderList.sort((a, b) => a.y - b.y);
    renderList.forEach(item => item.draw());

    state.bullets.forEach(b => {
        if (b.pos.x < camX || b.pos.x > camX + camW || b.pos.y < camY || b.pos.y > camY + camH) return;
        if (b.type === 'rocket') { ctx.fillStyle = '#57534e'; ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, 3, 0, Math.PI*2); ctx.fill(); } 
        else if (b.type === 'fire') { ctx.fillStyle = 'rgba(255, 100, 0, 0.3)'; ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, 4, 0, Math.PI*2); ctx.fill(); } 
        else { ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 10; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, 2, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,0,0.5)'; ctx.lineWidth = 1; ctx.stroke(); }
    });

    state.particles.forEach(p => {
        if (p.pos.x < camX || p.pos.x > camX + camW || p.pos.y < camY || p.pos.y > camY + camH) return;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.size, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
    });

    ctx.restore();
    
    // Vignette
    const grad = ctx.createRadialGradient(width/2, height/2, height/2, width/2, height/2, height);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,width,height);
};
