
import { MutableGameState, TileType, GameSettings } from '../types';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, COLORS } from '../constants';
import { getTileAt, isSolid } from '../utils/gameUtils';

import { SHADOW_OFFSET_X, SHADOW_OFFSET_Y, SHADOW_COLOR, drawLightGlow, drawRoundRectPath } from './renderUtils';
import { drawBuilding, getBuildingHeight } from './renderBuildings';
import { drawStreetLight, drawTrafficLight, drawRoad, drawFence, drawHelipad } from './renderInfrastructure';
import { drawVehicle, drawCharacter, drawDrop } from './renderEntities';
import { drawRailTile, drawConstructionSite, drawFootballField, drawSidewalkTile } from './renderEnvironment';

// Re-export common functions if needed by other components
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
                    drawRailTile(ctx, x, y, state.map, px, py);
                } else if (tile === TileType.CONSTRUCTION) {
                    drawConstructionSite(ctx, x, y, px, py, renderList);
                } else if (tile === TileType.FOOTBALL_FIELD) {
                    drawFootballField(ctx, x, y, px, py, renderList);
                } else if (tile === TileType.SIDEWALK || tile === TileType.FOOTPATH) {
                    drawSidewalkTile(ctx, x, y, state.map, px, py, textures, renderList);
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
    
    if (state.tracks) {
        state.tracks.forEach(t => {
            if (t.pos.x < camX || t.pos.x > camX + camW || t.pos.y < camY || t.pos.y > camY + camH) return;
            renderList.push({
                y: t.pos.y, // Ground level, sort by Y
                draw: () => {
                    ctx.save();
                    ctx.translate(t.pos.x, t.pos.y);
                    ctx.rotate(t.angle);
                    ctx.globalAlpha = t.opacity;
                    if (t.type === 'blood') {
                        ctx.fillStyle = '#7f1d1d';
                        ctx.fillRect(-2, -2, 4, 4);
                    }
                    ctx.globalAlpha = 1;
                    ctx.restore();
                }
            });
        });
    }

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
