
import { Vehicle, Pedestrian, TileType, Drop, GameSettings } from '../types';
import { MutableGameState } from './physics';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, COLORS, CAR_MODELS } from '../constants';
import { getTileAt, isSolid } from '../utils/gameUtils';

// --- SHADOW CONSTANTS ---
// Sun Direction: Top-Left to Bottom-Right
const SHADOW_OFFSET_X = 0.5; 
const SHADOW_OFFSET_Y = 0.5; 
const SHADOW_COLOR = 'rgba(0, 0, 0, 0.35)'; // Slightly more transparent for realism

// Helper to calculate building height
const getBuildingHeight = (tileType: TileType, px: number, py: number): number => {
    const seed = px * 13 + py * 7;
    if (tileType === TileType.SKYSCRAPER) {
        return 120 + (seed % 60);
    } else if (tileType === TileType.SHOP) {
        return 40 + (seed % 15);
    } else if (tileType === TileType.MALL) {
        return 65; // High but flat
    } else if (tileType === TileType.BUILDING) {
        return 45 + (seed % 20);
    } else if (tileType === TileType.HOSPITAL) {
        return 75;
    } else if (tileType === TileType.POLICE_STATION) {
        return 75;
    } else if (tileType === TileType.CONTAINER) {
        return 28 + (seed % 2) * 28; 
    } else if (tileType === TileType.PAINT_SHOP) {
        return 40;
    } else if (tileType === TileType.AIRPORT_TERMINAL) {
        return 60;
    } else if (tileType === TileType.HANGAR) {
        return 50;
    }
    return 50;
};

// Helper to draw light glow
const drawLightGlow = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) => {
    ctx.save();
    ctx.globalCompositeOperation = 'screen'; 
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

const drawDrop = (ctx: CanvasRenderingContext2D, drop: Drop) => {
    ctx.save();
    ctx.translate(drop.pos.x, drop.pos.y);
    const float = Math.sin(Date.now() / 200) * 2;
    ctx.translate(0, float);

    // Drop Shadow
    ctx.save();
    ctx.translate(3, 10 - float); // Fixed offset for drop shadow relative to floating item
    ctx.scale(1, 0.5);
    ctx.fillStyle = SHADOW_COLOR;
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    if (drop.type === 'cash') {
        ctx.fillStyle = '#22c55e';
        ctx.strokeStyle = '#14532d';
        ctx.lineWidth = 1;
        ctx.shadowColor = '#4ade80';
        ctx.shadowBlur = 5;
        ctx.beginPath(); ctx.rect(-6, -3, 12, 6); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#bbf7d0';
        ctx.font = 'bold 6px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 0.5);
    } else if (drop.type === 'weapon') {
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 5;
        if (drop.weapon === 'pistol') {
            ctx.fillStyle = '#9ca3af';
            ctx.beginPath(); 
            ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.lineTo(5, -2); ctx.lineTo(-2, -2); ctx.lineTo(-2, -4); ctx.lineTo(-5, -4); 
            ctx.fill();
        } else if (drop.weapon === 'uzi') {
            ctx.fillStyle = '#4b5563';
            ctx.beginPath();
            ctx.rect(-6, -2, 12, 4); ctx.fill(); 
            ctx.rect(-2, 2, 2, 3); ctx.fill();
        }
    }
    ctx.restore();
};

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

export const drawTrafficLight = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    // Shadow for wire/poles
    ctx.save();
    ctx.strokeStyle = SHADOW_COLOR;
    ctx.lineWidth = 3;
    // Removed blur for performance
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

    const offsets = [
        { dx: -10, dy: -10, color: 0 }, 
        { dx: 10, dy: -10, color: 1 },  
        { dx: 10, dy: 10, color: 2 },   
        { dx: -10, dy: 10, color: 0 },  
    ];

    const time = Date.now() / 2000;
    const cycle = Math.floor(time) % 3; 
    
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

// NEW: Projected Building Shadow
const drawBuildingShadow = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, height: number) => {
    const shadowX = height * SHADOW_OFFSET_X;
    const shadowY = height * SHADOW_OFFSET_Y;

    ctx.save();
    // Removed blur for performance
    ctx.fillStyle = SHADOW_COLOR;
    
    ctx.beginPath();
    // Base Top-Left
    ctx.moveTo(x, y); 
    // Base Top-Right
    ctx.lineTo(x + w, y);
    // Shadow Top-Right
    ctx.lineTo(x + w + shadowX, y + shadowY);
    // Shadow Bottom-Right
    ctx.lineTo(x + w + shadowX, y + w + shadowY);
    // Base Bottom-Right
    ctx.lineTo(x + w, y + w);
    // Base Bottom-Left
    ctx.lineTo(x, y + w);
    // Base Top-Left
    ctx.lineTo(x, y);
    
    ctx.fill();
    ctx.restore();
};

export const drawBuilding = (ctx: CanvasRenderingContext2D, x: number, y: number, tileType: TileType, textures: any, opacity: number = 1) => {
    const w = TILE_SIZE;
    const height = getBuildingHeight(tileType, x, y);

    // Draw Projected Shadow First
    drawBuildingShadow(ctx, x, y, w, height);

    ctx.save();
    if (opacity < 1) ctx.globalAlpha = opacity;

    const seed = x * 13 + y * 7;
    const centerX = x + w/2;
    const centerY = y + w/2; 
    
    let baseColor = '#262626';
    let roofColor = '#3f3f46';
    let windowColor = '#1e293b'; 

    if (tileType === TileType.SKYSCRAPER) {
        baseColor = (seed % 2 === 0) ? '#0f172a' : '#1e3a8a'; 
        roofColor = '#020617';
        windowColor = '#38bdf8'; 
    } else if (tileType === TileType.SHOP) {
        const shopColors = ['#991b1b', '#065f46', '#1e40af', '#854d0e'];
        baseColor = shopColors[seed % shopColors.length];
        roofColor = '#404040';
        windowColor = '#fef08a'; 
    } else if (tileType === TileType.MALL) {
        baseColor = '#f5f5f4'; // Stone-100 (Clean White/Beige)
        roofColor = '#e7e5e4'; // Stone-200
        windowColor = '#38bdf8'; // Sky Blue Glass
    } else if (tileType === TileType.BUILDING) {
        const resColors = ['#57534e', '#44403c', '#78716c', '#292524'];
        baseColor = resColors[seed % resColors.length];
        roofColor = '#1c1917';
    } else if (tileType === TileType.HOSPITAL) {
        baseColor = '#d1d5db'; 
        roofColor = '#f3f4f6';
        windowColor = '#bae6fd';
    } else if (tileType === TileType.POLICE_STATION) {
        baseColor = '#1e3a8a'; 
        roofColor = '#334155';
    } else if (tileType === TileType.CONTAINER) {
        const containerColors = ['#dc2626', '#2563eb', '#16a34a', '#d97706', '#4b5563'];
        baseColor = containerColors[seed % containerColors.length];
        roofColor = baseColor; 
    } else if (tileType === TileType.PAINT_SHOP) {
        baseColor = '#ca8a04';
        roofColor = '#854d0e';
    } else if (tileType === TileType.AIRPORT_TERMINAL) {
        baseColor = '#1e293b';
        roofColor = '#334155';
        windowColor = '#0ea5e9'; // Bright Blue Glass
    } else if (tileType === TileType.HANGAR) {
        baseColor = '#64748b';
        roofColor = '#94a3b8'; // Metallic
    }

    // -- Ground Occlusion Patch --
    ctx.fillStyle = '#000';
    ctx.fillRect(x, y, w, w);

    // -- South Wall (Front Face) --
    if (tileType !== TileType.PAINT_SHOP) {
        const wallGrad = ctx.createLinearGradient(x, y + w - height, x, y + w);
        wallGrad.addColorStop(0, roofColor); 
        wallGrad.addColorStop(1, '#000'); 
        ctx.fillStyle = wallGrad;
        ctx.fillRect(x, y + w - height, w, height);
    } else {
        // Garage Pillars
        ctx.fillStyle = baseColor;
        ctx.fillRect(x, y + w - height, 10, height);
        ctx.fillRect(x + w - 10, y + w - height, 10, height);
        // Dark interior
        ctx.fillStyle = '#121212';
        ctx.fillRect(x + 10, y + w - height, w - 20, height);
    }

    // -- Windows / Details --
    if (tileType === TileType.AIRPORT_TERMINAL) {
        // Big Glass Panes
        ctx.fillStyle = windowColor;
        const paneW = 16;
        for (let i = 4; i < w - 4; i += paneW + 4) {
            ctx.fillRect(x + i, y + w - height + 4, paneW, height - 8);
        }
    } else if (tileType === TileType.HANGAR) {
        // Hangar Door lines
        ctx.fillStyle = '#475569';
        for(let i=0; i<w; i+=8) {
             ctx.fillRect(x + i, y + w - height, 2, height);
        }
    } else if (tileType === TileType.MALL) {
        // Mall Entrance / Glass Facade
        ctx.fillStyle = windowColor;
        // Large glass section
        ctx.fillRect(x + 10, y + w - height + 10, w - 20, height - 20);
    } else if (tileType !== TileType.PAINT_SHOP && tileType !== TileType.CONTAINER && tileType !== TileType.SKYSCRAPER) {
        const stories = Math.floor(height / 15);
        const cols = Math.floor(w / 12);
        ctx.fillStyle = windowColor;
        for (let s=0; s < stories; s++) {
            for (let c=0; c < cols; c++) {
                if ((x + y + s + c) % 7 !== 0) { 
                    const wy = y + w - height + 5 + s * 14; 
                    const wx = x + 4 + c * 10;
                    if (wx + 6 < x + w && wy + 8 < y + w) ctx.fillRect(wx, wy, 6, 8);
                }
            }
        }
    } else if (tileType === TileType.SKYSCRAPER) {
         ctx.fillStyle = 'rgba(255,255,255,0.1)';
         const cols = Math.floor(w / 12);
         for(let c=0; c<cols; c++) {
            ctx.fillRect(x + 4 + c * 10, y + w - height, 6, height - 2);
         }
    }

    // -- Roof --
    const roofY = y - height;
    ctx.fillStyle = roofColor;
    if (tileType === TileType.BUILDING && textures['roof']) ctx.fillStyle = textures['roof'];
    
    if (tileType === TileType.HANGAR) {
        // Rounded Roof Effect via gradient
        const grd = ctx.createLinearGradient(x, roofY, x + w, roofY);
        grd.addColorStop(0, '#475569');
        grd.addColorStop(0.5, '#cbd5e1');
        grd.addColorStop(1, '#475569');
        ctx.fillStyle = grd;
    }
    
    ctx.fillRect(x, roofY, w, w);
    
    // Roof Border
    ctx.strokeStyle = '#171717';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, roofY, w, w);

    // -- Roof Details --
    const roofCY = roofY + w/2;
    
    if (tileType === TileType.AIRPORT_TERMINAL) {
        ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, roofY); ctx.lineTo(x+w, roofY+w); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x+w, roofY); ctx.lineTo(x, roofY+w); ctx.stroke();
        
        ctx.fillStyle = '#0ea5e9';
        ctx.fillRect(x + w/2 - 10, roofY + w/2 - 5, 20, 10);
    } else if (tileType === TileType.HANGAR) {
        // Ribs
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        for(let i=10; i<w; i+=20) {
            ctx.fillRect(x + i, roofY, 4, w);
        }
    } else if (tileType === TileType.HOSPITAL) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.arc(centerX, roofCY, 20, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(centerX, roofCY, 16, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = '900 20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('H', centerX, roofCY + 1);
    } else if (tileType === TileType.POLICE_STATION) {
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(centerX, roofCY, 20, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#fbbf24'; ctx.font = '900 20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('P', centerX, roofCY + 1);
        const time = Date.now() / 200;
        const blinkBlue = Math.floor(time) % 2 === 0 ? '#3b82f6' : '#1d4ed8';
        const blinkRed = Math.floor(time) % 2 !== 0 ? '#ef4444' : '#991b1b';
        ctx.fillStyle = blinkBlue; ctx.fillRect(x, roofY, 6, 6);
        ctx.fillStyle = blinkRed; ctx.fillRect(x + w - 6, roofY, 6, 6);
        ctx.fillStyle = blinkRed; ctx.fillRect(x, roofY + w - 6, 6, 6);
        ctx.fillStyle = blinkBlue; ctx.fillRect(x + w - 6, roofY + w - 6, 6, 6);
    } else if (tileType === TileType.MALL) {
        // Skylights for Mall
        ctx.fillStyle = '#38bdf8'; // Glass
        // Random skylights based on seed to break uniformity
        if (seed % 3 === 0) {
            ctx.fillRect(x + 10, roofY + 10, w - 20, w - 20); // Big central
        } else {
            ctx.fillRect(x + 5, roofY + 5, w/2 - 10, w - 10);
            ctx.fillRect(x + w/2 + 5, roofY + 5, w/2 - 10, w - 10);
        }
    } else if (tileType === TileType.SHOP) {
        const awningColor = (seed % 2 === 0) ? '#ef4444' : '#22c55e';
        const awningY = y + w - 50; 
        
        ctx.fillStyle = awningColor;
        for(let i=0; i<w; i+=8) {
            ctx.fillStyle = (i/8)%2===0 ? awningColor : '#e5e7eb';
            ctx.fillRect(x + i, awningY, 8, 12);
        }
        ctx.fillStyle = '#262626';
        ctx.fillRect(x + 10, roofY + 10, w - 20, w - 20);
    } else if (tileType === TileType.PAINT_SHOP) {
        // Spray Can Icon
        ctx.save();
        ctx.translate(centerX, roofCY);
        ctx.fillStyle = '#fff';
        ctx.fillRect(-8, -8, 16, 24);
        ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(-6, -12); ctx.lineTo(6, -12); ctx.lineTo(8, -8); ctx.fill();
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-3, -15, 6, 3);
        ctx.restore();
    } 
    // ... existing generic roof details
    else if (tileType !== TileType.CONTAINER) {
        if (seed % 3 === 0) { // AC
            const acX = x + 8 + (seed % 20);
            const acY = roofY + 8 + (seed % 20);
            ctx.fillStyle = '#d4d4d8'; ctx.fillRect(acX, acY, 14, 14);
            ctx.fillStyle = '#525252'; ctx.beginPath(); ctx.arc(acX + 7, acY + 7, 5, 0, Math.PI*2); ctx.fill();
        }
        if (seed % 5 === 0) { // Vent
             const vX = x + w - 16;
             const vY = roofY + 10;
             ctx.fillStyle = '#737373'; ctx.fillRect(vX, vY, 8, 8);
             ctx.fillStyle = '#171717'; ctx.fillRect(vX+2, vY+2, 4, 4);
        }
    }
    
    ctx.restore();
};

const drawRoad = (ctx: CanvasRenderingContext2D, x: number, y: number, type: TileType, textures: any, map: number[][], gridX: number, gridY: number) => {
    // Determine Base Color
    let roadColor = textures['road'] || COLORS.road;
    if (type === TileType.RUNWAY) roadColor = '#18181b'; // Zinc-950
    else if (type === TileType.TARMAC) roadColor = '#3f3f46'; // Zinc-700
    
    ctx.fillStyle = roadColor;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    
    // TARMAC detail
    if (type === TileType.TARMAC) {
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        if ((gridX + gridY) % 2 === 0) ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        return; // No markings for plain tarmac
    }

    const hasRoadTop = gridY > 0 && map[gridY-1][gridX] === type;
    const hasRoadBottom = gridY < MAP_HEIGHT-1 && map[gridY+1][gridX] === type;
    const hasRoadLeft = gridX > 0 && map[gridY][gridX-1] === type;
    const hasRoadRight = gridX < MAP_WIDTH-1 && map[gridY][gridX+1] === type;

    const center = TILE_SIZE / 2;

    if (type === TileType.RUNWAY) {
        // Dashed Center Line if middle of runway
        // Simple logic: if left and right are also runway, we are middle
        if (hasRoadLeft && hasRoadRight) {
             ctx.fillStyle = '#fff';
             ctx.fillRect(x + center - 4, y + 20, 8, TILE_SIZE - 40);
        }
        // Numbers
        if (!hasRoadTop && hasRoadBottom) {
             ctx.fillStyle = '#fff';
             ctx.font = 'bold 40px monospace';
             ctx.textAlign = 'center';
             ctx.textBaseline = 'middle';
             ctx.fillText('18', x + center, y + center);
        } else if (hasRoadTop && !hasRoadBottom) {
             ctx.fillStyle = '#fff';
             ctx.font = 'bold 40px monospace';
             ctx.textAlign = 'center';
             ctx.textBaseline = 'middle';
             ctx.fillText('36', x + center, y + center);
        }
        
    } else if (type === TileType.ROAD_H) {
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2;
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
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2;
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

const drawVehicle = (ctx: CanvasRenderingContext2D, v: Vehicle) => {
    // 1. Draw SHADOW (Before car body, translated by global light direction)
    const length = v.size.y;
    const width = v.size.x;
    
    // Simulate flight height for planes if moving fast?
    let zHeight = 0;
    if ((v.model === 'plane' || v.model === 'jet') && Math.abs(v.speed) > 15) {
        zHeight = (Math.abs(v.speed) - 15) * 4;
    }

    ctx.save();
    const shadowDist = 15 + zHeight;
    const shadowWorldX = v.pos.x + shadowDist * SHADOW_OFFSET_X;
    const shadowWorldY = v.pos.y + shadowDist * SHADOW_OFFSET_Y;
    
    ctx.translate(shadowWorldX, shadowWorldY);
    ctx.rotate(v.angle); 
    
    ctx.fillStyle = SHADOW_COLOR;
    ctx.beginPath();
    // Shadow shape depends on model
    if (v.model === 'plane' || v.model === 'jet') {
         // Fuselage
         ctx.roundRect(-length/2, -width/6, length, width/3, 6);
         // Wings
         ctx.fillRect(-length/6, -width/2, length/3, width);
         // Tail
         ctx.fillRect(-length/2, -width/4, length/6, width/2);
    } else {
         // Simple shadow for car (could deform too but simple rect is fine for shadow)
         ctx.roundRect(-length/2, -width/2, length, width, 6);
    }
    ctx.fill();
    ctx.restore();

    // 2. Draw VEHICLE BODY
    ctx.save();
    ctx.translate(v.pos.x, v.pos.y);
    ctx.rotate(v.angle);
    
    // Scaling for takeoff effect
    if (zHeight > 0) {
        const scale = 1 + (zHeight / 200);
        ctx.scale(scale, scale);
    }
    
    const modelData = CAR_MODELS[v.model];
    const maxHealth = (modelData as any)?.health || 100;
    const hpPct = v.health / maxHealth;

    if (v.model === 'plane' || v.model === 'jet') {
        // PLANE RENDERING (Skip deformation for planes to keep it simple/aerodynamic)
        const isJet = v.model === 'jet';
        const fuselageW = width / 3;
        
        ctx.fillStyle = v.color;
        
        // Wings
        ctx.beginPath();
        if (isJet) {
            // Swept back wings
            ctx.moveTo(length/6, -fuselageW/2);
            ctx.lineTo(-length/2, -width/2);
            ctx.lineTo(-length/6, -fuselageW/2);
            ctx.lineTo(-length/6, fuselageW/2);
            ctx.lineTo(-length/2, width/2);
            ctx.lineTo(length/6, fuselageW/2);
        } else {
            // Straight wings
            ctx.roundRect(-length/6, -width/2, length/3, width, 2);
        }
        ctx.fill();
        
        // Fuselage
        ctx.fillStyle = isJet ? '#94a3b8' : '#ffffff';
        ctx.beginPath();
        ctx.roundRect(-length/2, -fuselageW/2, length, fuselageW, 10);
        ctx.fill();

        // Cockpit
        ctx.fillStyle = '#0ea5e9'; // Glass
        ctx.beginPath();
        ctx.roundRect(length/4, -fuselageW/3, length/5, fuselageW/1.5, 3);
        ctx.fill();
        
        // Tail
        ctx.fillStyle = v.color;
        ctx.beginPath();
        ctx.moveTo(-length/2 + 5, -fuselageW/2);
        ctx.lineTo(-length/2 - 10, -width/3);
        ctx.lineTo(-length/2 - 10, width/3);
        ctx.lineTo(-length/2 + 5, fuselageW/2);
        ctx.fill();

        // Propeller (if plane)
        if (!isJet) {
            const propAngle = (Date.now() / 50) % (Math.PI*2);
            ctx.save();
            ctx.translate(length/2, 0);
            ctx.rotate(propAngle);
            ctx.fillStyle = '#111';
            ctx.fillRect(-2, -25, 4, 50);
            ctx.fillRect(-25, -2, 50, 4);
            ctx.restore();
        } else {
            // Jet Engine Glow
            if (v.speed > 5) {
                ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
                ctx.beginPath(); ctx.arc(-length/2 - 5, 0, 8, 0, Math.PI*2); ctx.fill();
            }
        }

    } else {
        // CAR RENDERING WITH DEFORMATION
        const drawWheel = (index: number, cx: number, cy: number) => {
            const isPopped = v.damage.tires[index];
            if (isPopped) {
                ctx.fillStyle = '#171717'; 
                ctx.fillRect(cx, cy + 1, 6, 1);
            } else {
                ctx.fillStyle = '#171717';
                ctx.fillRect(cx, cy, 6, 2);
            }
        };
        // Wheels (positions roughly estimated)
        // FL, FR, BL, BR
        drawWheel(0, length/2 - 8, -width/2 - 1);
        drawWheel(1, length/2 - 8, width/2 - 1);
        drawWheel(2, -length/2 + 4, -width/2 - 1);
        drawWheel(3, -length/2 + 4, width/2 - 1);

        // Body Shape with Deformation
        ctx.fillStyle = v.color;
        ctx.beginPath();

        // Default deformation if missing (compatibility)
        const def = v.deformation || { fl: 0, fr: 0, bl: 0, br: 0 };
        
        // Corners relative to center (0,0)
        // FL: Front (+x), Left (-y)
        const flX = length/2 - def.fl;
        const flY = -width/2 + (def.fl * 0.3); // Squeeze Y slightly when crushing X

        // FR: Front (+x), Right (+y)
        const frX = length/2 - def.fr;
        const frY = width/2 - (def.fr * 0.3);

        // BR: Back (-x), Right (+y)
        const brX = -length/2 + def.br;
        const brY = width/2 - (def.br * 0.3);

        // BL: Back (-x), Left (-y)
        const blX = -length/2 + def.bl;
        const blY = -width/2 + (def.bl * 0.3);

        ctx.moveTo(flX, flY);
        ctx.lineTo(frX, frY);
        ctx.lineTo(brX, brY);
        ctx.lineTo(blX, blY);
        ctx.closePath();
        ctx.fill();

        // Body Highlight (Top) - Adjusted to deformation slightly
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        const safeL = (frX - brX) * 0.9; // Approximate length based on deformed right side
        ctx.fillRect(-safeL/2, -width/4, safeL, width/2);

        // Bumpers (only draw if not heavily damaged)
        if (v.model !== 'supercar') {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            if (def.fr < 3 && def.fl < 3) ctx.fillRect(length/2 - 1 - Math.max(def.fr, def.fl), -width/2 + 1, 2, width - 2);
            if (def.br < 3 && def.bl < 3) ctx.fillRect(-length/2 - 1 + Math.max(def.br, def.bl), -width/2 + 1, 2, width - 2);
        }

        if (v.model === 'pickup') {
            ctx.fillStyle = '#0f172a'; 
            ctx.fillRect(-length/2 + 2 + def.bl, -width/2 + 2, length/3, width - 4);
            // Rails
            ctx.fillStyle = '#334155';
            ctx.fillRect(-length/2 + 2 + def.bl, -width/2 + 2, length/3, 2);
            ctx.fillRect(-length/2 + 2 + def.br, width/2 - 4, length/3, 2);
            ctx.fillRect(-length/2 + 2 + Math.max(def.bl, def.br), -width/2 + 2, 2, width - 4);
        }

        // Roof / Windshield Area
        let roofL = length - 20;
        let roofW = width - 4;
        let roofOffset = 0; 

        if (v.model === 'truck' || v.model === 'pickup' || v.model === 'van' || v.model === 'ambulance' || v.model === 'swat' || v.model === 'firetruck') {
            roofL = length * 0.4;
            roofOffset = length * 0.2; 
        } else if (v.model === 'supercar') {
            roofL = length * 0.5;
            roofW = width - 6;
        } else if (v.model === 'bus') {
            roofL = length - 10;
        } else if (v.model === 'compact') {
            roofL = length - 14;
        }

        // Deform Roof if impact is deep
        const maxFrontDef = Math.max(def.fl, def.fr);
        const maxRearDef = Math.max(def.bl, def.br);
        // Shrink roof if car is crushed
        if (maxFrontDef > 5) { roofL -= 2; roofOffset -= 2; }
        if (maxRearDef > 5) { roofL -= 2; roofOffset += 2; }

        ctx.fillStyle = '#1f2937'; 
        if (v.model === 'pickup' || v.model === 'truck') {
            ctx.fillRect(roofOffset - roofL/2 - 1, -roofW/2 - 1, roofL + 2, roofW + 2);
        } else {
            ctx.fillRect(-roofL/2 - 1, -roofW/2 - 1, roofL + 2, roofW + 2);
        }

        const windshieldColor = v.damage.windows[0] ? '#e5e7eb' : '#38bdf8'; 
        const rearWindowColor = v.damage.windows[1] ? '#e5e7eb' : '#38bdf8';
        
        ctx.fillStyle = windshieldColor;
        if (v.model === 'truck' || v.model === 'pickup' || v.model === 'van' || v.model === 'ambulance' || v.model === 'swat' || v.model === 'firetruck') {
            ctx.fillRect(roofOffset + roofL/2 - 3, -roofW/2 + 1, 3, roofW - 2);
        } else if (v.model === 'bus') {
            ctx.fillRect(length/2 - 6 - maxFrontDef, -width/2 + 2, 4, width - 4);
        } else {
            ctx.fillRect(roofL/2 - 4, -roofW/2 + 1, 4, roofW - 2);
        }

        if (v.model !== 'truck' && v.model !== 'pickup' && v.model !== 'van' && v.model !== 'ambulance' && v.model !== 'swat' && v.model !== 'firetruck' && v.model !== 'bus') {
            ctx.fillStyle = rearWindowColor;
            ctx.fillRect(-roofL/2, -roofW/2 + 1, 3, roofW - 2);
        }

        ctx.fillStyle = v.color;
        let rtL = roofL - 6; 
        let rtW = roofW - 2;
        let rtX = 0;
        
        if (v.model === 'pickup' || v.model === 'truck' || v.model === 'van' || v.model === 'ambulance' || v.model === 'swat' || v.model === 'firetruck') {
            rtL = roofL - 6;
            rtX = roofOffset - 1; 
        } else if (v.model === 'supercar') {
            rtL = roofL - 8;
        } else if (v.model === 'bus') {
            rtL = length - 16;
        } else {
            rtL = roofL - 8;
        }
        ctx.fillRect(rtX - rtL/2, -rtW/2, rtL, rtW);

        // ... existing damage and details rendering for cars ...
        if (hpPct < 0.5) {
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.moveTo(length/2 - 10, -width/2 + 4);
            ctx.lineTo(length/2 - 5, -width/2 + 8);
            ctx.lineTo(length/2 - 12, -width/2 + 10);
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(0, 0); ctx.lineTo(5, 5); ctx.lineTo(2, 6); ctx.fill();
        }
        
        if (hpPct < 0.2) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(-length/2 + 2, -5, 8, 10);
            ctx.fillRect(length/2 - 12, -4, 10, 8);
        }
        
        ctx.fillStyle = v.color;
        if (v.model !== 'bus' && v.model !== 'firetruck') {
            const mirrorX = (v.model === 'pickup' || v.model === 'truck' || v.model === 'van' || v.model === 'ambulance') 
                ? roofOffset + roofL/2 - 2 
                : roofL/2 - 2;
            ctx.beginPath();
            ctx.moveTo(mirrorX, -width/2 + (def.fl > 0 ? def.fl*0.5 : 0));
            ctx.lineTo(mirrorX + 2, -width/2 - 3 + (def.fl > 0 ? def.fl*0.5 : 0));
            ctx.lineTo(mirrorX - 2, -width/2 - 3 + (def.fl > 0 ? def.fl*0.5 : 0));
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(mirrorX, width/2 - (def.fr > 0 ? def.fr*0.5 : 0));
            ctx.lineTo(mirrorX + 2, width/2 + 3 - (def.fr > 0 ? def.fr*0.5 : 0));
            ctx.lineTo(mirrorX - 2, width/2 + 3 - (def.fr > 0 ? def.fr*0.5 : 0));
            ctx.fill();
        }
        
        ctx.fillStyle = '#fef08a'; 
        if (hpPct < 0.2 && v.damage.windows[0]) ctx.fillStyle = '#713f12'; 
        ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 6;
        // Headlights (move with deformation)
        ctx.fillRect(length/2 - 1 - def.fl, -width/2 + 2 + (def.fl*0.2), 1, 5);
        ctx.fillRect(length/2 - 1 - def.fr, width/2 - 7 - (def.fr*0.2), 1, 5);
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ef4444';
        // Taillights
        ctx.fillRect(-length/2 + def.bl, -width/2 + 2 + (def.bl*0.2), 1, 5);
        ctx.fillRect(-length/2 + def.br, width/2 - 7 - (def.br*0.2), 1, 5);
        
        if (v.model === 'supercar') {
            ctx.fillStyle = v.color;
            ctx.fillRect(-length/2 + 2 + maxRearDef, -width/2, 4, width);
            ctx.fillStyle = '#171717';
            for(let i=0; i<3; i++) {
                ctx.fillRect(-length/2 + 8 + i*3, -width/4, 2, width/2);
            }
        } else if (v.model === 'police' || v.model === 'swat' || v.model === 'ambulance' || v.model === 'firetruck') {
            const time = Date.now() / 150;
            const blink = Math.floor(time) % 2;
            const color1 = blink ? '#2563eb' : '#dc2626';
            const color2 = blink ? '#dc2626' : '#2563eb';
            
            ctx.shadowColor = color1; ctx.shadowBlur = 10;
            ctx.fillStyle = color1;
            
            if (v.model === 'ambulance' || v.model === 'swat') {
                ctx.fillRect(roofOffset, -width/2 + 2, 4, 4);
                ctx.shadowColor = color2; ctx.fillStyle = color2;
                ctx.fillRect(roofOffset, width/2 - 6, 4, 4);
            } else if (v.model === 'firetruck') {
                ctx.fillRect(roofOffset + 10, -width/2 + 2, 4, 4);
                ctx.shadowColor = color2; ctx.fillStyle = color2;
                ctx.fillRect(roofOffset + 10, width/2 - 6, 4, 4);
                ctx.fillStyle = '#cbd5e1';
                ctx.fillRect(-length/2 + 5, -5, length - 20, 10);
                ctx.fillStyle = '#64748b';
                for(let i=0; i<length-20; i+=4) ctx.fillRect(-length/2 + 5 + i, -4, 1, 8);
            } else {
                ctx.fillRect(-2, -width/2 + 6, 4, width - 12);
            }
            ctx.shadowBlur = 0;
        } else if (v.model === 'taxi') {
            ctx.fillStyle = '#facc15';
            ctx.shadowColor = '#facc15'; ctx.shadowBlur = 5;
            ctx.fillRect(-3, -6, 6, 12);
            ctx.fillStyle = '#000';
            ctx.fillRect(-3, -6, 2, 2); ctx.fillRect(-1, -6, 2, 2); ctx.fillRect(1, -6, 2, 2);
            ctx.fillRect(-2, -4, 2, 2); ctx.fillRect(0, -4, 2, 2); ctx.fillRect(2, -4, 2, 2);
            ctx.shadowBlur = 0;
        } else if (v.model === 'bus') {
            ctx.fillStyle = '#9ca3af'; 
            const wins = 6;
            const spacing = (length - 20) / wins;
            for(let i=0; i<wins; i++) {
                ctx.fillRect(-length/2 + 10 + i * spacing, -width/2 + 1, spacing - 2, 2);
                ctx.fillRect(-length/2 + 10 + i * spacing, width/2 - 3, spacing - 2, 2);
            }
        }
    }
    
    ctx.restore();
};

const drawCharacter = (ctx: CanvasRenderingContext2D, p: Pedestrian) => {
    ctx.save();
    
    // 1. Draw Shadow
    ctx.save();
    ctx.translate(p.pos.x + 8 * SHADOW_OFFSET_X, p.pos.y + 8 * SHADOW_OFFSET_Y);
    ctx.fillStyle = SHADOW_COLOR;
    // Removed blur for performance
    ctx.beginPath();
    ctx.ellipse(0, 0, 7, 7, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    ctx.translate(p.pos.x, p.pos.y);
    ctx.rotate(p.angle);
    
    const isMoving = p.velocity.x !== 0 || p.velocity.y !== 0;
    const walkCycle = isMoving ? Math.sin(Date.now() / 100) * 5 : 0;
    
    // Feet
    ctx.fillStyle = '#1c1917'; 
    ctx.beginPath(); ctx.ellipse(3 + walkCycle, -5, 4, 2.5, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(3 - walkCycle, 5, 4, 2.5, 0, 0, Math.PI*2); ctx.fill();

    // Shoulders / Torso
    ctx.fillStyle = p.color; 
    ctx.beginPath();
    ctx.roundRect(-4, -8, 10, 16, 4);
    ctx.fill();

    // Head
    ctx.fillStyle = '#fca5a5'; 
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
    
    // Hair
    if (p.role === 'police') {
        ctx.fillStyle = '#1e3a8a'; 
        ctx.beginPath(); ctx.ellipse(-1, 0, 5.5, 5.5, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.ellipse(3, 0, 3, 5, 0, -Math.PI/2, Math.PI/2); ctx.fill();
    } else {
        const hairColor = p.id.length % 2 === 0 ? '#451a03' : '#000000';
        ctx.fillStyle = hairColor;
        ctx.beginPath(); ctx.arc(-1, 0, 5, 0, Math.PI * 2); ctx.fill();
    }

    // Arms
    ctx.fillStyle = p.color; 
    
    if (p.weapon === 'fist') {
        const armSwing = isMoving ? Math.cos(Date.now() / 100) * 3 : 0;
        ctx.beginPath(); ctx.ellipse(0 + armSwing, -9, 3, 3, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fca5a5';
        ctx.beginPath(); ctx.arc(3 + armSwing, -9, 2.5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.ellipse(0 - armSwing, 9, 3, 3, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fca5a5';
        ctx.beginPath(); ctx.arc(3 - armSwing, 9, 2.5, 0, Math.PI*2); ctx.fill();
    } else {
        ctx.beginPath(); ctx.ellipse(2, -9, 3, 3, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(2, 9, 3, 3, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fca5a5';
        ctx.save();
        ctx.translate(10, 0); 
        
        if (p.weapon === 'pistol') {
            ctx.fillStyle = '#374151'; 
            ctx.fillRect(-2, -1.5, 10, 3);
            ctx.fillStyle = '#fca5a5'; 
            ctx.beginPath(); ctx.arc(0, 2, 2.5, 0, Math.PI*2); ctx.fill(); 
        } else if (p.weapon === 'uzi') {
            ctx.fillStyle = '#111';
            ctx.fillRect(-2, -2, 12, 4);
            ctx.fillStyle = '#fca5a5';
            ctx.beginPath(); ctx.arc(0, 3, 2.5, 0, Math.PI*2); ctx.fill(); 
            ctx.beginPath(); ctx.arc(6, -2, 2.5, 0, Math.PI*2); ctx.fill(); 
        } else if (p.weapon === 'shotgun' || p.weapon === 'sniper' || p.weapon === 'rocket') {
             ctx.fillStyle = '#1f2937';
             const len = p.weapon === 'sniper' ? 24 : 18;
             const width = p.weapon === 'rocket' ? 6 : 3;
             ctx.fillRect(-4, -width/2, len, width);
             ctx.fillStyle = '#fca5a5';
             ctx.beginPath(); ctx.arc(0, 3, 2.5, 0, Math.PI*2); ctx.fill();
             ctx.beginPath(); ctx.arc(10, -1, 2.5, 0, Math.PI*2); ctx.fill();
        }

        ctx.restore();
    }

    ctx.restore();
};

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
                } else if (tile === TileType.SIDEWALK || tile === TileType.FOOTPATH) {
                    ctx.fillStyle = textures['sidewalk'] || COLORS.sidewalk;
                    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    ctx.strokeStyle = '#57534e'; ctx.lineWidth = 1; ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
                    if (tile === TileType.FOOTPATH) {
                        // slightly lighter for visibility
                        ctx.fillStyle = 'rgba(255,255,255,0.05)';
                        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    }
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

                } else if (tile === TileType.BUILDING || tile === TileType.HOSPITAL || tile === TileType.POLICE_STATION || tile === TileType.SKYSCRAPER || tile === TileType.SHOP || tile === TileType.MALL || tile === TileType.CONTAINER || tile === TileType.PAINT_SHOP || tile === TileType.AIRPORT_TERMINAL || tile === TileType.HANGAR) {
                     // Ground Occlusion Patch
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
