
import { TileType, GameSettings } from '../types';
import { MutableGameState } from './gameState';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, COLORS } from '../constants';
import { getTileAt, isSolid } from '../utils/gameUtils';
import { getBuildingHeight, drawLightGlow } from './renderHelpers';
import { drawRoad, drawStreetLight, drawTrafficLight } from './renderRoads';
import { drawBuilding } from './renderBuildings';
import { drawDrop, drawVehicle, drawCharacter } from './renderEntities';

export const renderGame = (ctx: CanvasRenderingContext2D, state: MutableGameState, textures: any, settings?: GameSettings) => {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    
    // Zoom Logic
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
                } else if (tile === TileType.SIDEWALK) {
                    ctx.fillStyle = textures['sidewalk'] || COLORS.sidewalk;
                    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    ctx.strokeStyle = '#57534e'; ctx.lineWidth = 1; ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
                    if (x % 5 === 0 && y % 5 === 0) {
                         ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(px+TILE_SIZE, py+TILE_SIZE, 3, 0, Math.PI*2); ctx.fill();
                    }
                    
                    if ((x * 7 + y * 13) % 4 === 0) {
                        let rot = -1;
                        if (getTileAt(state.map, px + TILE_SIZE, py) === TileType.ROAD_V) rot = 0;
                        else if (getTileAt(state.map, px - TILE_SIZE, py) === TileType.ROAD_V) rot = Math.PI;
                        else if (getTileAt(state.map, px, py + TILE_SIZE) === TileType.ROAD_H) rot = Math.PI/2;
                        else if (getTileAt(state.map, px, py - TILE_SIZE) === TileType.ROAD_H) rot = 3*Math.PI/2;
                        
                        if (rot !== -1) {
                             renderList.push({
                                 y: py + 99999,
                                 draw: () => drawStreetLight(ctx, px + TILE_SIZE/2, py + TILE_SIZE/2, rot)
                             });
                        }
                    }

                } else if (tile === TileType.BUILDING || tile === TileType.HOSPITAL || tile === TileType.POLICE_STATION || tile === TileType.SKYSCRAPER || tile === TileType.SHOP || tile === TileType.CONTAINER) {
                     ctx.fillStyle = '#171717'; 
                     ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

                     let opacity = 1;
                     const height = getBuildingHeight(tile, px, py);
                     const p = state.player;
                     
                     if (p.pos.x >= px && p.pos.x <= px + TILE_SIZE &&
                         p.pos.y >= py - height && p.pos.y <= py + TILE_SIZE) {
                            if ((py + TILE_SIZE) > p.pos.y) {
                                opacity = 0.4;
                            }
                     }

                     renderList.push({
                        y: py + TILE_SIZE, 
                        draw: () => drawBuilding(ctx, px, py, tile, textures, opacity)
                     });
                } else if (tile === TileType.SHIP_DECK) {
                    ctx.fillStyle = '#78350f';
                    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    ctx.fillStyle = 'rgba(0,0,0,0.1)';
                    for(let i=0; i<TILE_SIZE; i+=8) ctx.fillRect(px+i, py, 1, TILE_SIZE);
                    
                    const below = getTileAt(state.map, px, py + TILE_SIZE);
                    if (below === TileType.WATER) {
                        ctx.fillStyle = '#451a03';
                        ctx.fillRect(px, py + TILE_SIZE - 4, TILE_SIZE, 4);
                    }
                } else if (tile === TileType.WATER) {
                    ctx.fillStyle = COLORS.water; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    ctx.fillStyle = 'rgba(255,255,255,0.1)';
                    const offset = (Date.now() / 50) % 20;
                    ctx.beginPath(); ctx.arc(px + 20 + offset, py + 20, 5, 0, Math.PI*2); ctx.fill();
                } else if (tile === TileType.ROAD_CROSS) {
                    drawRoad(ctx, px, py, tile, textures, state.map, x, y);
                    renderList.push({
                         y: py + 99999,
                         draw: () => drawTrafficLight(ctx, px, py)
                    });
                } else {
                    drawRoad(ctx, px, py, tile, textures, state.map, x, y);
                }
            }
        }
    }
    
    // LAYER 2: DROPS
    state.drops.forEach(d => {
        if (d.pos.x < camX || d.pos.x > camX + camW || d.pos.y < camY || d.pos.y > camY + camH) return;
        renderList.push({
            y: d.pos.y,
            draw: () => drawDrop(ctx, d)
        });
    });

    // LAYER 3: ENTITIES
    state.pedestrians.forEach(p => {
         if (p.pos.x < camX || p.pos.x > camX + camW || p.pos.y < camY || p.pos.y > camY + camH) return;

         if (p.state === 'dead') {
             ctx.save(); ctx.translate(p.pos.x, p.pos.y);
             ctx.fillStyle = '#7f1d1d'; ctx.globalAlpha = 0.8;
             ctx.beginPath(); ctx.ellipse(0, 0, 15, 12, Math.random(), 0, Math.PI*2); ctx.fill();
             ctx.globalAlpha = 1;
             ctx.rotate(p.angle);
             ctx.fillStyle = p.color; ctx.fillRect(-8,-4,16,8);
             ctx.restore();
         }
    });

    state.vehicles.forEach(v => {
         if (v.pos.x < camX - 100 || v.pos.x > camX + camW + 100 || v.pos.y < camY - 100 || v.pos.y > camY + camH + 100) return;
         renderList.push({ y: v.pos.y, draw: () => drawVehicle(ctx, v) });
    });

    state.pedestrians.forEach(p => {
        if (p.pos.x < camX || p.pos.x > camX + camW || p.pos.y < camY || p.pos.y > camY + camH) return;
        if (p.state !== 'dead') renderList.push({ y: p.pos.y, draw: () => drawCharacter(ctx, p) });
    });

    if (!state.player.vehicleId) {
        renderList.push({ y: state.player.pos.y, draw: () => drawCharacter(ctx, state.player) });
    }

    renderList.sort((a, b) => a.y - b.y);
    renderList.forEach(item => item.draw());

    // Projectiles
    state.bullets.forEach(b => {
        if (b.pos.x < camX || b.pos.x > camX + camW || b.pos.y < camY || b.pos.y > camY + camH) return;

        if (b.type === 'rocket') {
             ctx.fillStyle = '#57534e'; ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, 3, 0, Math.PI*2); ctx.fill();
        } else if (b.type === 'fire') {
             ctx.fillStyle = 'rgba(255, 100, 0, 0.3)'; ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, 4, 0, Math.PI*2); ctx.fill();
        } else {
            ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 10; ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, 2, 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)'; ctx.beginPath(); ctx.moveTo(b.pos.x, b.pos.y); 
            ctx.lineTo(b.pos.x - b.velocity.x, b.pos.y - b.velocity.y); ctx.stroke();
        }
    });

    state.particles.forEach(p => {
         if (p.pos.x < camX || p.pos.x > camX + camW || p.pos.y < camY || p.pos.y > camY + camH) return;
         ctx.globalAlpha = p.life / p.maxLife; ctx.fillStyle = p.color;
         ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.size, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1;
    });

    ctx.restore();
};
