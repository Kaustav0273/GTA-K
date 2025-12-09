
import { Vehicle, Pedestrian, TileType } from '../types';
import { MutableGameState } from './physics';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, COLORS } from '../constants';

export const drawBuilding = (ctx: CanvasRenderingContext2D, x: number, y: number, tileType: TileType, textures: any) => {
    const height = tileType === TileType.HOSPITAL || tileType === TileType.POLICE_STATION ? 70 : 50; 
    const w = TILE_SIZE;
    const h = TILE_SIZE;

    let wallColor = '#262626';
    let roofColor = '#3f3f46';
    
    if (tileType === TileType.HOSPITAL) {
        wallColor = '#d1d5db';
        roofColor = '#f3f4f6';
    } else if (tileType === TileType.POLICE_STATION) {
        wallColor = '#1e3a8a';
        roofColor = '#334155';
    }

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x + 10, y + 10, w, h);

    const wallGrad = ctx.createLinearGradient(x, y + h, x, y + h + height);
    wallGrad.addColorStop(0, '#000000');
    wallGrad.addColorStop(1, wallColor);
    ctx.fillStyle = wallGrad;
    ctx.fillRect(x, y + h, w, height);

    if (tileType !== TileType.GRASS) {
         const windowColor = tileType === TileType.HOSPITAL ? '#38bdf8' : '#1e293b';
         const stories = Math.floor(height / 15);
         const cols = Math.floor(w / 12);
         ctx.fillStyle = windowColor;
         for (let s=0; s < stories; s++) {
             for (let c=0; c < cols; c++) {
                 if ((x + y + s + c) % 7 !== 0) { 
                    const wy = y + h + 5 + s * 14;
                    const wx = x + 4 + c * 10;
                    if (wx + 6 < x + w) ctx.fillRect(wx, wy, 6, 8);
                 }
             }
         }
    }

    ctx.fillStyle = roofColor;
    if (textures['roof']) ctx.fillStyle = textures['roof'];
    ctx.fillRect(x, y, w, h);
    
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    if ((x+y) % 2 === 0) ctx.fillRect(x, y, w, h/2);
    
    ctx.strokeStyle = '#525252';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);

    const seed = x * 13 + y * 7;
    const centerX = x + w/2;
    const centerY = y + h/2;

    if (tileType === TileType.HOSPITAL) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.arc(centerX, centerY, 20, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(centerX, centerY, 16, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = '900 20px sans-serif'; 
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('H', centerX, centerY + 1);
    } else if (tileType === TileType.POLICE_STATION) {
        ctx.strokeStyle = '#fbbf24'; 
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(centerX, centerY, 20, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#fbbf24';
        ctx.font = '900 20px sans-serif'; 
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('P', centerX, centerY + 1);
        const time = Date.now() / 200;
        const blinkBlue = Math.floor(time) % 2 === 0 ? '#3b82f6' : '#1d4ed8';
        const blinkRed = Math.floor(time) % 2 !== 0 ? '#ef4444' : '#991b1b';
        ctx.fillStyle = blinkBlue;
        ctx.fillRect(x, y, 6, 6);
        ctx.fillStyle = blinkRed;
        ctx.fillRect(x + w - 6, y, 6, 6);
        ctx.fillStyle = blinkRed;
        ctx.fillRect(x, y + h - 6, 6, 6);
        ctx.fillStyle = blinkBlue;
        ctx.fillRect(x + w - 6, y + h - 6, 6, 6);
    } else {
        const hasAC = seed % 3 === 0;
        const hasVent = seed % 5 === 0;
        const hasPipe = seed % 4 === 0;
        if (hasAC) {
            const acX = x + 8 + (seed % 20);
            const acY = y + 8 + (seed % 20);
            ctx.fillStyle = '#d4d4d8';
            ctx.fillRect(acX, acY, 14, 14);
            ctx.fillStyle = '#525252';
            ctx.beginPath(); ctx.arc(acX + 7, acY + 7, 5, 0, Math.PI*2); ctx.fill();
        }
        if (hasVent) {
             const vX = x + w - 16;
             const vY = y + 10;
             ctx.fillStyle = '#737373';
             ctx.fillRect(vX, vY, 8, 8);
             ctx.fillStyle = '#171717';
             ctx.fillRect(vX+2, vY+2, 4, 4);
        }
        if (hasPipe) {
            ctx.strokeStyle = '#525252';
            ctx.lineWidth = 2;
            ctx.beginPath(); 
            ctx.moveTo(x + 5, y + 5);
            ctx.lineTo(x + 5, y + h - 10);
            ctx.lineTo(x + w - 10, y + h - 10);
            ctx.stroke();
        }
    }
};

export const drawRoad = (ctx: CanvasRenderingContext2D, x: number, y: number, type: number, textures: any) => {
    ctx.fillStyle = textures['road'] || COLORS.road;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    
    ctx.lineWidth = 4;
    
    if (type === TileType.ROAD_H) {
         ctx.strokeStyle = '#d97706';
         ctx.beginPath(); ctx.moveTo(x, y + TILE_SIZE/2 - 3); ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE/2 - 3); ctx.stroke();
         ctx.beginPath(); ctx.moveTo(x, y + TILE_SIZE/2 + 3); ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE/2 + 3); ctx.stroke();
         ctx.strokeStyle = '#a8a29e';
         ctx.lineWidth = 2;
         ctx.beginPath(); ctx.moveTo(x, y+4); ctx.lineTo(x+TILE_SIZE, y+4); ctx.stroke();
         ctx.beginPath(); ctx.moveTo(x, y+60); ctx.lineTo(x+TILE_SIZE, y+60); ctx.stroke();
    } else if (type === TileType.ROAD_V) {
         ctx.strokeStyle = '#d97706';
         ctx.lineWidth = 4;
         ctx.beginPath(); ctx.moveTo(x + TILE_SIZE/2 - 3, y); ctx.lineTo(x + TILE_SIZE/2 - 3, y + TILE_SIZE); ctx.stroke();
         ctx.beginPath(); ctx.moveTo(x + TILE_SIZE/2 + 3, y); ctx.lineTo(x + TILE_SIZE/2 + 3, y + TILE_SIZE); ctx.stroke();
         ctx.strokeStyle = '#a8a29e';
         ctx.lineWidth = 2;
         ctx.beginPath(); ctx.moveTo(x+4, y); ctx.lineTo(x+4, y+TILE_SIZE); ctx.stroke();
         ctx.beginPath(); ctx.moveTo(x+60, y); ctx.lineTo(x+60, y+TILE_SIZE); ctx.stroke();
    } else if (type === TileType.ROAD_CROSS) {
        ctx.fillStyle = '#a8a29e';
        for (let i = 4; i < TILE_SIZE; i += 12) {
            ctx.fillRect(x + i, y + 2, 6, 16);
            ctx.fillRect(x + i, y + 46, 6, 16);
            ctx.fillRect(x + 2, y + i, 16, 6);
            ctx.fillRect(x + 46, y + i, 16, 6);
        }
    }
};

export const drawVehicle = (ctx: CanvasRenderingContext2D, v: Vehicle) => {
    ctx.save();
    ctx.translate(v.pos.x, v.pos.y);
    ctx.rotate(v.angle + Math.PI/2);

    const halfW = v.size.x / 2;
    const halfL = v.size.y / 2;

    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;

    const wheelW = 5, wheelL = 12;
    const axleFront = -halfL * 0.65, axleRear = halfL * 0.65, wheelInset = halfW - 2;

    const drawWheel = (x: number, y: number, isPopped: boolean) => {
        ctx.fillStyle = isPopped ? '#1f2937' : '#09090b';
        ctx.fillRect(x - wheelW/2, y - wheelL/2, wheelW, wheelL);
        if (!isPopped) { ctx.fillStyle = '#525252'; ctx.fillRect(x - 1, y - 2, 2, 4); }
    };

    ctx.shadowColor = 'transparent';
    drawWheel(-wheelInset, axleFront, v.damage.tires[0]);
    drawWheel(wheelInset, axleFront, v.damage.tires[1]);
    drawWheel(-wheelInset, axleRear, v.damage.tires[2]);
    drawWheel(wheelInset, axleRear, v.damage.tires[3]);

    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    const bodyGrad = ctx.createLinearGradient(-halfW, 0, halfW, 0);
    bodyGrad.addColorStop(0, '#000000');
    bodyGrad.addColorStop(0.15, v.color);
    bodyGrad.addColorStop(0.5, '#ffffffaa');
    bodyGrad.addColorStop(0.85, v.color);
    bodyGrad.addColorStop(1, '#000000');
    ctx.fillStyle = bodyGrad;

    if (v.model === 'truck' || v.model === 'van' || v.model === 'ambulance') {
         ctx.beginPath(); ctx.roundRect(-halfW, -halfL, v.size.x, v.size.y, 3); ctx.fill();
    } else if (v.model === 'sport' || v.model === 'muscle') {
         ctx.beginPath(); ctx.moveTo(-halfW, axleRear + 5); ctx.lineTo(-halfW, -halfL + 8);
         ctx.quadraticCurveTo(0, -halfL - 5, halfW, -halfL + 8); ctx.lineTo(halfW, axleRear + 5);
         ctx.lineTo(halfW - 2, halfL); ctx.lineTo(-halfW + 2, halfL); ctx.closePath(); ctx.fill();
    } else {
         ctx.beginPath(); ctx.roundRect(-halfW, -halfL, v.size.x, v.size.y, 4); ctx.fill();
    }

    ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

    const cabinWidth = v.size.x - 6;
    const cabinLen = v.size.y * 0.55;
    const cabinY = -v.size.y * 0.1;

    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.roundRect(-cabinWidth/2, cabinY - cabinLen/2, cabinWidth, cabinLen, 4); ctx.fill();

    const roofLen = cabinLen * 0.7;
    const roofGrad = ctx.createLinearGradient(-halfW, 0, halfW, 0);
    roofGrad.addColorStop(0, v.color); 
    roofGrad.addColorStop(0.5, '#ffffff88'); 
    roofGrad.addColorStop(1, v.color);
    ctx.fillStyle = roofGrad;
    
    if (v.model === 'truck') {
        ctx.fillStyle = '#262626'; ctx.fillRect(-halfW + 2, 0, v.size.x - 4, v.size.y/2 - 2);
        ctx.fillStyle = roofGrad; ctx.fillRect(-halfW + 2, -halfL + 5, v.size.x - 4, v.size.y * 0.35);
    } else {
        ctx.beginPath(); ctx.roundRect(-cabinWidth/2 + 2, cabinY - roofLen/2, cabinWidth - 4, roofLen, 2); ctx.fill();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath(); ctx.moveTo(cabinWidth/2, cabinY - cabinLen/2); ctx.lineTo(cabinWidth/2 - 10, cabinY - cabinLen/2);
    ctx.lineTo(cabinWidth/2, cabinY - cabinLen/2 + 10); ctx.fill();
    
    ctx.shadowColor = '#fde047'; ctx.shadowBlur = 10; ctx.fillStyle = '#fef08a';
    ctx.fillRect(-halfW + 3, -halfL, 5, 2); ctx.fillRect(halfW - 8, -halfL, 5, 2);
    ctx.shadowBlur = 0;

    ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 10; ctx.fillStyle = '#dc2626';
    ctx.fillRect(-halfW + 3, halfL - 2, 5, 2); ctx.fillRect(halfW - 8, halfL - 2, 5, 2);
    ctx.shadowBlur = 0;

    if (v.model === 'sport' || v.model === 'muscle') {
        ctx.fillStyle = '#000'; ctx.fillRect(-halfW, halfL - 6, v.size.x, 4);
    }

    if (v.model === 'police') {
        const blink = Math.floor(Date.now() / 150) % 2 === 0;
        ctx.shadowBlur = 15;
        ctx.shadowColor = blink ? '#ef4444' : '#3b82f6'; ctx.fillStyle = blink ? '#ef4444' : '#3b82f6';
        ctx.fillRect(-10, -5, 8, 4);
        ctx.shadowColor = blink ? '#3b82f6' : '#ef4444'; ctx.fillStyle = blink ? '#3b82f6' : '#ef4444';
        ctx.fillRect(2, -5, 8, 4);
        ctx.shadowBlur = 0;
    }

    if (v.damage.windows[0]) {
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, cabinY - cabinLen/2 + 2); ctx.lineTo(-4, cabinY - cabinLen/2 + 8); 
        ctx.lineTo(3, cabinY - cabinLen/2 + 5); ctx.stroke();
    }

    ctx.restore();
};

export const drawCharacter = (ctx: CanvasRenderingContext2D, p: Pedestrian) => {
    ctx.save();
    ctx.translate(p.pos.x, p.pos.y);
    ctx.rotate(p.angle);

    if (p.state === 'walking' || p.state === 'fleeing' || p.state === 'chasing') {
        const time = Date.now() / 100;
        const legOffset = Math.sin(time) * 4;
        ctx.fillStyle = p.role === 'police' ? '#172554' : '#444'; 
        ctx.beginPath(); ctx.roundRect(0, -6 + legOffset, 10, 4, 2); ctx.fill();
        ctx.beginPath(); ctx.roundRect(0, 2 - legOffset, 10, 4, 2); ctx.fill();
    } else {
        ctx.fillStyle = p.role === 'police' ? '#172554' : '#444';
        ctx.beginPath(); ctx.roundRect(0, -6, 10, 4, 2); ctx.fill();
        ctx.beginPath(); ctx.roundRect(0, 2, 10, 4, 2); ctx.fill();
    }

    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.roundRect(-5, -7, 12, 14, 4); ctx.fill();
    
    if (p.role === 'police') {
         ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(2, -3, 2, 0, Math.PI*2); ctx.fill();
    }

    ctx.fillStyle = '#fca5a5';
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
    
    if (p.role === 'police') {
        ctx.fillStyle = '#1e3a8a'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#172554'; ctx.fillRect(3, -5, 3, 10);
    } else {
        ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(-1, 0, 4, 0, Math.PI * 2); ctx.fill();
    }

    ctx.fillStyle = p.role === 'police' ? '#1e3a8a' : '#fca5a5';
    let punchOffset = 0;
    if (p.state === 'punching') {
        const t = (p.actionTimer || 0) / 15;
        punchOffset = Math.sin(t * Math.PI) * 12; 
    }

    ctx.beginPath(); ctx.roundRect(2, -8, 8, 3, 2); ctx.fill();
    ctx.beginPath(); ctx.roundRect(2 + punchOffset, 5, 8, 3, 2); ctx.fill();

    if (p.weapon !== 'fist') {
        ctx.fillStyle = '#111';
        if (p.weapon === 'rocket') {
             ctx.fillStyle = '#3f6212'; ctx.fillRect(6, -1, 16, 4);
             ctx.fillStyle = '#57534e'; ctx.fillRect(20, -2, 6, 6);
        } else if (p.weapon === 'flame') {
             ctx.fillStyle = '#ea580c'; ctx.fillRect(6, 0, 14, 3);
             ctx.fillStyle = '#333'; ctx.fillRect(8, 3, 2, 4);
        } else {
            ctx.fillRect(8, 2, 12, 2); 
            if (p.weapon === 'uzi' || p.weapon === 'shotgun') ctx.fillRect(8, 4, 4, 4);
        }
    }

    ctx.restore();
};

export const renderGame = (ctx: CanvasRenderingContext2D, state: MutableGameState, textures: any) => {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(-Math.floor(state.camera.x), -Math.floor(state.camera.y));

    const startCol = Math.floor(state.camera.x / TILE_SIZE);
    const endCol = startCol + (width / TILE_SIZE) + 1;
    const startRow = Math.floor(state.camera.y / TILE_SIZE);
    const endRow = startRow + (height / TILE_SIZE) + 1;

    const renderList: { y: number, draw: () => void }[] = [];

    // LAYER 1: GROUND & Gather Static Renderables
    for (let y = startRow; y <= endRow; y++) {
        for (let x = startCol; x <= endCol; x++) {
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
                } else if (tile === TileType.BUILDING || tile === TileType.HOSPITAL || tile === TileType.POLICE_STATION) {
                     ctx.fillStyle = '#222'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                     renderList.push({
                        y: py + TILE_SIZE,
                        draw: () => drawBuilding(ctx, px, py, tile, textures)
                     });
                } else if (tile === TileType.WATER) {
                    ctx.fillStyle = COLORS.water; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    ctx.fillStyle = 'rgba(255,255,255,0.1)';
                    const offset = (Date.now() / 50) % 20;
                    ctx.beginPath(); ctx.arc(px + 20 + offset, py + 20, 5, 0, Math.PI*2); ctx.fill();
                } else {
                    drawRoad(ctx, px, py, tile, textures);
                }
            }
        }
    }
    
    // LAYER 3: ENTITIES
    state.pedestrians.forEach(p => {
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
         renderList.push({ y: v.pos.y, draw: () => drawVehicle(ctx, v) });
    });

    state.pedestrians.forEach(p => {
        if (p.state !== 'dead') renderList.push({ y: p.pos.y, draw: () => drawCharacter(ctx, p) });
    });

    if (!state.player.vehicleId) {
        renderList.push({ y: state.player.pos.y, draw: () => drawCharacter(ctx, state.player) });
    }

    renderList.sort((a, b) => a.y - b.y);
    renderList.forEach(item => item.draw());

    // Projectiles
    state.bullets.forEach(b => {
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
         ctx.globalAlpha = p.life / p.maxLife; ctx.fillStyle = p.color;
         ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.size, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1;
    });

    ctx.restore();
};
