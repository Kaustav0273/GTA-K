
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
        return 65; 
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
    } else if (tileType === TileType.TRAIN_STATION) {
        return 90; // High roof
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

export const drawBuilding = (ctx: CanvasRenderingContext2D, x: number, y: number, tileType: TileType, textures: any, opacity: number = 1, widthOverride?: number) => {
    const w = widthOverride || TILE_SIZE;
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
    } else if (tileType === TileType.TRAIN_STATION) {
        baseColor = '#57534e'; // Stone-600
        roofColor = '#44403c'; // Stone-700
        windowColor = '#7dd3fc'; // Sky Blue Light
    }

    // -- Ground Occlusion Patch --
    ctx.fillStyle = '#000';
    ctx.fillRect(x, y, w, TILE_SIZE); // Keep TILE_SIZE for Y occlusion if single row, but typically square base

    // -- South Wall (Front Face) --
    if (tileType !== TileType.PAINT_SHOP) {
        const wallGrad = ctx.createLinearGradient(x, y + TILE_SIZE - height, x, y + TILE_SIZE);
        wallGrad.addColorStop(0, roofColor); 
        wallGrad.addColorStop(1, '#000'); 
        ctx.fillStyle = wallGrad;
        ctx.fillRect(x, y + TILE_SIZE - height, w, height);
    } else {
        // Garage Pillars
        ctx.fillStyle = baseColor;
        ctx.fillRect(x, y + TILE_SIZE - height, 10, height);
        ctx.fillRect(x + w - 10, y + TILE_SIZE - height, 10, height);
        // Dark interior
        ctx.fillStyle = '#121212';
        ctx.fillRect(x + 10, y + TILE_SIZE - height, w - 20, height);
    }

    // -- Windows / Details --
    if (tileType === TileType.AIRPORT_TERMINAL) {
        // Big Glass Panes
        ctx.fillStyle = windowColor;
        const paneW = 16;
        for (let i = 4; i < w - 4; i += paneW + 4) {
            ctx.fillRect(x + i, y + TILE_SIZE - height + 4, paneW, height - 8);
        }
    } else if (tileType === TileType.HANGAR) {
        // Hangar Door lines
        ctx.fillStyle = '#475569';
        for(let i=0; i<w; i+=8) {
             ctx.fillRect(x + i, y + TILE_SIZE - height, 2, height);
        }
    } else if (tileType === TileType.MALL) {
        // Mall Entrance / Glass Facade
        ctx.fillStyle = windowColor;
        // Large glass section
        ctx.fillRect(x + 10, y + TILE_SIZE - height + 10, w - 20, height - 20);
    } else if (tileType === TileType.CONTAINER) {
        // Corrugated effect
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        for(let i=0; i<w; i+=8) {
            ctx.fillRect(x + i, y + TILE_SIZE - height, 2, height);
        }
        // Door outline on right end
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(x + w - 4, y + TILE_SIZE - height + 2, 2, height - 4);
    } else if (tileType === TileType.TRAIN_STATION) {
        // Grand Arches
        ctx.fillStyle = windowColor;
        // Three large arches
        const archW = w / 3;
        for(let i=0; i<3; i++) {
            ctx.beginPath();
            ctx.ellipse(x + archW*i + archW/2, y + TILE_SIZE - height/2, archW/3, height/3, 0, Math.PI, 0);
            ctx.fill();
        }
    } else if (tileType !== TileType.PAINT_SHOP && tileType !== TileType.SKYSCRAPER) {
        const stories = Math.floor(height / 15);
        const cols = Math.floor(w / 12);
        ctx.fillStyle = windowColor;
        for (let s=0; s < stories; s++) {
            for (let c=0; c < cols; c++) {
                if ((x + y + s + c) % 7 !== 0) { 
                    const wy = y + TILE_SIZE - height + 5 + s * 14; 
                    const wx = x + 4 + c * 10;
                    if (wx + 6 < x + w && wy + 8 < y + TILE_SIZE) ctx.fillRect(wx, wy, 6, 8);
                }
            }
        }
    } else if (tileType === TileType.SKYSCRAPER) {
         ctx.fillStyle = 'rgba(255,255,255,0.1)';
         const cols = Math.floor(w / 12);
         for(let c=0; c<cols; c++) {
            ctx.fillRect(x + 4 + c * 10, y + TILE_SIZE - height, 6, height - 2);
         }
    }

    // -- Roof --
    const roofY = y - height;
    ctx.fillStyle = roofColor;
    if (tileType === TileType.BUILDING && textures['roof']) ctx.fillStyle = textures['roof'];
    
    if (tileType === TileType.HANGAR || tileType === TileType.TRAIN_STATION) {
        // Rounded Roof Effect via gradient
        const grd = ctx.createLinearGradient(x, roofY, x + w, roofY);
        if (tileType === TileType.TRAIN_STATION) {
            grd.addColorStop(0, '#44403c');
            grd.addColorStop(0.5, '#78716c'); // Glassy/Metallic center
            grd.addColorStop(1, '#44403c');
        } else {
            grd.addColorStop(0, '#475569');
            grd.addColorStop(0.5, '#cbd5e1');
            grd.addColorStop(1, '#475569');
        }
        ctx.fillStyle = grd;
    }
    
    ctx.fillRect(x, roofY, w, TILE_SIZE);
    
    // Roof Border
    ctx.strokeStyle = '#171717';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, roofY, w, TILE_SIZE);

    // -- Roof Details --
    const roofCY = roofY + TILE_SIZE/2;
    
    if (tileType === TileType.AIRPORT_TERMINAL) {
        ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, roofY); ctx.lineTo(x+w, roofY+TILE_SIZE); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x+w, roofY); ctx.lineTo(x, roofY+TILE_SIZE); ctx.stroke();
        
        ctx.fillStyle = '#0ea5e9';
        ctx.fillRect(x + w/2 - 10, roofY + TILE_SIZE/2 - 5, 20, 10);
    } else if (tileType === TileType.HANGAR) {
        // Ribs
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        for(let i=10; i<w; i+=20) {
            ctx.fillRect(x + i, roofY, 4, TILE_SIZE);
        }
    } else if (tileType === TileType.TRAIN_STATION) {
        // Glass Skylights strips
        ctx.fillStyle = '#bae6fd';
        for(let i=10; i<w; i+=20) {
            ctx.fillRect(x + i, roofY, 10, TILE_SIZE);
        }
        // Clock Tower at front center
        ctx.fillStyle = '#57534e';
        const towerH = 30;
        ctx.fillRect(x + w/2 - 10, roofY + TILE_SIZE - 10, 20, 10); // Base on roof
        // Draw separate tall rect? Just fake it on top
        ctx.fillRect(x + w/2 - 8, roofY + TILE_SIZE - 10 - towerH, 16, towerH);
        
        // Clock Face
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(x+w/2, roofY + TILE_SIZE - 10 - towerH + 8, 6, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x+w/2, roofY + TILE_SIZE - 10 - towerH + 8); ctx.lineTo(x+w/2, roofY + TILE_SIZE - 10 - towerH + 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x+w/2, roofY + TILE_SIZE - 10 - towerH + 8); ctx.lineTo(x+w/2 + 3, roofY + TILE_SIZE - 10 - towerH + 8); ctx.stroke();

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
        ctx.fillStyle = blinkRed; ctx.fillRect(x, roofY + TILE_SIZE - 6, 6, 6);
        ctx.fillStyle = blinkBlue; ctx.fillRect(x + w - 6, roofY + TILE_SIZE - 6, 6, 6);
    } else if (tileType === TileType.MALL) {
        // Skylights for Mall
        ctx.fillStyle = '#38bdf8'; // Glass
        // Random skylights based on seed to break uniformity
        if (seed % 3 === 0) {
            ctx.fillRect(x + 10, roofY + 10, w - 20, TILE_SIZE - 20); // Big central
        } else {
            ctx.fillRect(x + 5, roofY + 5, w/2 - 10, TILE_SIZE - 10);
            ctx.fillRect(x + w/2 + 5, roofY + 5, w/2 - 10, TILE_SIZE - 10);
        }
    } else if (tileType === TileType.SHOP) {
        const awningColor = (seed % 2 === 0) ? '#ef4444' : '#22c55e';
        const awningY = y + TILE_SIZE - 50; 
        
        ctx.fillStyle = awningColor;
        for(let i=0; i<w; i+=8) {
            ctx.fillStyle = (i/8)%2===0 ? awningColor : '#e5e7eb';
            ctx.fillRect(x + i, awningY, 8, 12);
        }
        ctx.fillStyle = '#262626';
        ctx.fillRect(x + 10, roofY + 10, w - 20, TILE_SIZE - 20);
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
        if (hasRoadLeft && hasRoadRight) {
             ctx.fillStyle = '#fff';
             ctx.fillRect(x + center - 4, y + 20, 8, TILE_SIZE - 40);
        }
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
        ctx.moveTo(x, y + center); ctx.lineTo(x + TILE_SIZE, y + center); ctx.stroke(); ctx.setLineDash([]);
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
        ctx.moveTo(x + center, y); ctx.lineTo(x + center, y + TILE_SIZE); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#d4d4d8';
        if (!hasRoadLeft) ctx.fillRect(x, y, 4, TILE_SIZE);
        if (!hasRoadRight) ctx.fillRect(x + TILE_SIZE - 4, y, 4, TILE_SIZE);
    } else if (type === TileType.ROAD_CROSS || type === TileType.RAIL_CROSSING) {
         if (type === TileType.RAIL_CROSSING) {
             // DETECT RAIL DIRECTION
             const isRailV = (gridY > 0 && (map[gridY-1][gridX] === TileType.RAIL || map[gridY-1][gridX] === TileType.RAIL_CROSSING)) ||
                             (gridY < MAP_HEIGHT-1 && (map[gridY+1][gridX] === TileType.RAIL || map[gridY+1][gridX] === TileType.RAIL_CROSSING));
             
             // Draw Rails (Metallic)
             const drawCrossingRail = (bx: number, by: number, ex: number, ey: number) => {
                 // Base
                 ctx.strokeStyle = '#27272a'; ctx.lineWidth = 6; ctx.lineCap = 'butt';
                 ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
                 // Top
                 ctx.strokeStyle = '#d4d4d8'; ctx.lineWidth = 2;
                 ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
             };

             if (isRailV) {
                 drawCrossingRail(x + 36, y, x + 36, y + TILE_SIZE);
                 drawCrossingRail(x + 92, y, x + 92, y + TILE_SIZE);
                 // Boom Gate Safety Lines
                 ctx.fillStyle = '#fbbf24'; ctx.fillRect(x + 20, y + 10, 2, TILE_SIZE - 20); ctx.fillRect(x + TILE_SIZE - 22, y + 10, 2, TILE_SIZE - 20);
             } else {
                 drawCrossingRail(x, y + 36, x + TILE_SIZE, y + 36);
                 drawCrossingRail(x, y + 92, x + TILE_SIZE, y + 92);
                 // Boom Gate Safety Lines
                 ctx.fillStyle = '#fbbf24'; ctx.fillRect(x + 10, y + 20, TILE_SIZE - 20, 2); ctx.fillRect(x + 10, y + TILE_SIZE - 22, TILE_SIZE - 20, 2);
             }
         } else {
             ctx.fillStyle = '#fff';
             const cwW = 12; const cwL = TILE_SIZE - 10;
             ctx.fillRect(x + 5, y + 4, cwL, cwW); ctx.fillRect(x + 5, y + TILE_SIZE - 16, cwL, cwW);
             ctx.fillRect(x + 4, y + 5, cwW, cwL); ctx.fillRect(x + TILE_SIZE - 16, y + 5, cwW, cwL);
         }
    }
};

const drawVehicle = (ctx: CanvasRenderingContext2D, v: Vehicle) => {
    const length = v.size.y;
    const width = v.size.x;
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
    if (v.model === 'plane' || v.model === 'jet') {
         ctx.roundRect(-length/2, -width/6, length, width/3, 6);
         ctx.fillRect(-length/6, -width/2, length/3, width);
         ctx.fillRect(-length/2, -width/4, length/6, width/2);
    } else {
         ctx.roundRect(-length/2, -width/2, length, width, 6);
    }
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(v.pos.x, v.pos.y);
    ctx.rotate(v.angle);
    if (zHeight > 0) { const scale = 1 + (zHeight / 200); ctx.scale(scale, scale); }
    const modelData = CAR_MODELS[v.model];
    const maxHealth = (modelData as any)?.health || 100;
    const hpPct = v.health / maxHealth;

    if (v.model === 'plane' || v.model === 'jet') {
        const isJet = v.model === 'jet';
        const fuselageW = width / 3;
        ctx.fillStyle = v.color;
        ctx.beginPath();
        if (isJet) {
            ctx.moveTo(length/6, -fuselageW/2); ctx.lineTo(-length/2, -width/2); ctx.lineTo(-length/6, -fuselageW/2);
            ctx.lineTo(-length/6, fuselageW/2); ctx.lineTo(-length/2, width/2); ctx.lineTo(length/6, fuselageW/2);
        } else {
            ctx.roundRect(-length/6, -width/2, length/3, width, 2);
        }
        ctx.fill();
        ctx.fillStyle = isJet ? '#94a3b8' : '#ffffff';
        ctx.beginPath(); ctx.roundRect(-length/2, -fuselageW/2, length, fuselageW, 10); ctx.fill();
        ctx.fillStyle = '#0ea5e9'; 
        ctx.beginPath(); ctx.roundRect(length/4, -fuselageW/3, length/5, fuselageW/1.5, 3); ctx.fill();
        ctx.fillStyle = v.color;
        ctx.beginPath();
        ctx.moveTo(-length/2 + 5, -fuselageW/2); ctx.lineTo(-length/2 - 10, -width/3);
        ctx.lineTo(-length/2 - 10, width/3); ctx.lineTo(-length/2 + 5, fuselageW/2);
        ctx.fill();
        if (!isJet) {
            const propAngle = (Date.now() / 50) % (Math.PI*2);
            ctx.save(); ctx.translate(length/2, 0); ctx.rotate(propAngle);
            ctx.fillStyle = '#111'; ctx.fillRect(-2, -25, 4, 50); ctx.fillRect(-25, -2, 50, 4);
            ctx.restore();
        } else {
            if (v.speed > 5) { ctx.fillStyle = 'rgba(239, 68, 68, 0.6)'; ctx.beginPath(); ctx.arc(-length/2 - 5, 0, 8, 0, Math.PI*2); ctx.fill(); }
        }
    } else {
        const drawWheel = (index: number, cx: number, cy: number) => {
            const isPopped = v.damage.tires[index];
            if (isPopped) { ctx.fillStyle = '#171717'; ctx.fillRect(cx, cy + 1, 6, 1); } 
            else { ctx.fillStyle = '#171717'; ctx.fillRect(cx, cy, 6, 2); }
        };
        drawWheel(0, length/2 - 8, -width/2 - 1); drawWheel(1, length/2 - 8, width/2 - 1);
        drawWheel(2, -length/2 + 4, -width/2 - 1); drawWheel(3, -length/2 + 4, width/2 - 1);

        ctx.fillStyle = v.color;
        ctx.beginPath();
        const def = v.deformation || { fl: 0, fr: 0, bl: 0, br: 0 };
        const flX = length/2 - def.fl; const flY = -width/2 + (def.fl * 0.3);
        const frX = length/2 - def.fr; const frY = width/2 - (def.fr * 0.3);
        const brX = -length/2 + def.br; const brY = width/2 - (def.br * 0.3);
        const blX = -length/2 + def.bl; const blY = -width/2 + (def.bl * 0.3);
        ctx.moveTo(flX, flY); ctx.lineTo(frX, frY); ctx.lineTo(brX, brY); ctx.lineTo(blX, blY);
        ctx.closePath(); ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        const safeL = (frX - brX) * 0.9;
        ctx.fillRect(-safeL/2, -width/4, safeL, width/2);

        if (v.model !== 'supercar') {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            if (def.fr < 3 && def.fl < 3) ctx.fillRect(length/2 - 1 - Math.max(def.fr, def.fl), -width/2 + 1, 2, width - 2);
            if (def.br < 3 && def.bl < 3) ctx.fillRect(-length/2 - 1 + Math.max(def.br, def.bl), -width/2 + 1, 2, width - 2);
        }
        if (v.model === 'pickup') {
            ctx.fillStyle = '#0f172a'; ctx.fillRect(-length/2 + 2 + def.bl, -width/2 + 2, length/3, width - 4);
            ctx.fillStyle = '#334155'; ctx.fillRect(-length/2 + 2 + def.bl, -width/2 + 2, length/3, 2);
            ctx.fillRect(-length/2 + 2 + def.br, width/2 - 4, length/3, 2); ctx.fillRect(-length/2 + 2 + Math.max(def.bl, def.br), -width/2 + 2, 2, width - 4);
        }

        let roofL = length - 20; let roofW = width - 4; let roofOffset = 0; 
        if (v.model === 'truck' || v.model === 'pickup' || v.model === 'van' || v.model === 'ambulance' || v.model === 'swat' || v.model === 'firetruck') { roofL = length * 0.4; roofOffset = length * 0.2; } 
        else if (v.model === 'supercar') { roofL = length * 0.5; roofW = width - 6; } else if (v.model === 'bus') { roofL = length - 10; } else if (v.model === 'compact') { roofL = length - 14; }
        const maxFrontDef = Math.max(def.fl, def.fr); const maxRearDef = Math.max(def.bl, def.br);
        if (maxFrontDef > 5) { roofL -= 2; roofOffset -= 2; } if (maxRearDef > 5) { roofL -= 2; roofOffset += 2; }

        ctx.fillStyle = '#1f2937'; 
        if (v.model === 'pickup' || v.model === 'truck') ctx.fillRect(roofOffset - roofL/2 - 1, -roofW/2 - 1, roofL + 2, roofW + 2);
        else ctx.fillRect(-roofL/2 - 1, -roofW/2 - 1, roofL + 2, roofW + 2);

        const windshieldColor = v.damage.windows[0] ? '#e5e7eb' : '#38bdf8'; 
        const rearWindowColor = v.damage.windows[1] ? '#e5e7eb' : '#38bdf8';
        ctx.fillStyle = windshieldColor;
        if (v.model === 'truck' || v.model === 'pickup' || v.model === 'van' || v.model === 'ambulance' || v.model === 'swat' || v.model === 'firetruck') ctx.fillRect(roofOffset + roofL/2 - 3, -roofW/2 + 1, 3, roofW - 2);
        else if (v.model === 'bus') ctx.fillRect(length/2 - 6 - maxFrontDef, -width/2 + 2, 4, width - 4);
        else ctx.fillRect(roofL/2 - 4, -roofW/2 + 1, 4, roofW - 2);

        if (v.model !== 'truck' && v.model !== 'pickup' && v.model !== 'van' && v.model !== 'ambulance' && v.model !== 'swat' && v.model !== 'firetruck' && v.model !== 'bus') {
            ctx.fillStyle = rearWindowColor; ctx.fillRect(-roofL/2, -roofW/2 + 1, 3, roofW - 2);
        }

        ctx.fillStyle = v.color;
        let rtL = roofL - 6; let rtW = roofW - 2; let rtX = 0;
        if (v.model === 'pickup' || v.model === 'truck' || v.model === 'van' || v.model === 'ambulance' || v.model === 'swat' || v.model === 'firetruck') { rtL = roofL - 6; rtX = roofOffset - 1; } 
        else if (v.model === 'supercar') { rtL = roofL - 8; } else if (v.model === 'bus') { rtL = length - 16; } else { rtL = roofL - 8; }
        ctx.fillRect(rtX - rtL/2, -rtW/2, rtL, rtW);

        if (hpPct < 0.5) {
            ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.moveTo(length/2 - 10, -width/2 + 4);
            ctx.lineTo(length/2 - 5, -width/2 + 8); ctx.lineTo(length/2 - 12, -width/2 + 10); ctx.fill();
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(5, 5); ctx.lineTo(2, 6); ctx.fill();
        }
        if (hpPct < 0.2) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(-length/2 + 2, -5, 8, 10); ctx.fillRect(length/2 - 12, -4, 10, 8); }
        
        ctx.fillStyle = v.color;
        if (v.model !== 'bus' && v.model !== 'firetruck') {
            const mirrorX = (v.model === 'pickup' || v.model === 'truck' || v.model === 'van' || v.model === 'ambulance') ? roofOffset + roofL/2 - 2 : roofL/2 - 2;
            ctx.beginPath(); ctx.moveTo(mirrorX, -width/2 + (def.fl > 0 ? def.fl*0.5 : 0));
            ctx.lineTo(mirrorX + 2, -width/2 - 3 + (def.fl > 0 ? def.fl*0.5 : 0)); ctx.lineTo(mirrorX - 2, -width/2 - 3 + (def.fl > 0 ? def.fl*0.5 : 0)); ctx.fill();
            ctx.beginPath(); ctx.moveTo(mirrorX, width/2 - (def.fr > 0 ? def.fr*0.5 : 0));
            ctx.lineTo(mirrorX + 2, width/2 + 3 - (def.fr > 0 ? def.fr*0.5 : 0)); ctx.lineTo(mirrorX - 2, width/2 + 3 - (def.fr > 0 ? def.fr*0.5 : 0)); ctx.fill();
        }
        
        ctx.fillStyle = '#fef08a'; if (hpPct < 0.2 && v.damage.windows[0]) ctx.fillStyle = '#713f12'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 6;
        ctx.fillRect(length/2 - 1 - def.fl, -width/2 + 2 + (def.fl*0.2), 1, 5); ctx.fillRect(length/2 - 1 - def.fr, width/2 - 7 - (def.fr*0.2), 1, 5); ctx.shadowBlur = 0;
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-length/2 + def.bl, -width/2 + 2 + (def.bl*0.2), 1, 5); ctx.fillRect(-length/2 + def.br, width/2 - 7 - (def.br*0.2), 1, 5);
        
        if (v.model === 'supercar') {
            ctx.fillStyle = v.color; ctx.fillRect(-length/2 + 2 + maxRearDef, -width/2, 4, width);
            ctx.fillStyle = '#171717'; for(let i=0; i<3; i++) ctx.fillRect(-length/2 + 8 + i*3, -width/4, 2, width/2);
        } else if (v.model === 'police' || v.model === 'swat' || v.model === 'ambulance' || v.model === 'firetruck') {
            const time = Date.now() / 150; const blink = Math.floor(time) % 2;
            const color1 = blink ? '#2563eb' : '#dc2626'; const color2 = blink ? '#dc2626' : '#2563eb';
            ctx.shadowColor = color1; ctx.shadowBlur = 10; ctx.fillStyle = color1;
            if (v.model === 'ambulance' || v.model === 'swat') { ctx.fillRect(roofOffset, -width/2 + 2, 4, 4); ctx.shadowColor = color2; ctx.fillStyle = color2; ctx.fillRect(roofOffset, width/2 - 6, 4, 4); } 
            else if (v.model === 'firetruck') { ctx.fillRect(roofOffset + 10, -width/2 + 2, 4, 4); ctx.shadowColor = color2; ctx.fillStyle = color2; ctx.fillRect(roofOffset + 10, width/2 - 6, 4, 4); ctx.fillStyle = '#cbd5e1'; ctx.fillRect(-length/2 + 5, -5, length - 20, 10); ctx.fillStyle = '#64748b'; for(let i=0; i<length-20; i+=4) ctx.fillRect(-length/2 + 5 + i, -4, 1, 8); } 
            else { ctx.fillRect(-2, -width/2 + 6, 4, width - 12); } ctx.shadowBlur = 0;
        } else if (v.model === 'taxi') {
            ctx.fillStyle = '#facc15'; ctx.shadowColor = '#facc15'; ctx.shadowBlur = 5; ctx.fillRect(-3, -6, 6, 12);
            ctx.fillStyle = '#000'; ctx.fillRect(-3, -6, 2, 2); ctx.fillRect(-1, -6, 2, 2); ctx.fillRect(1, -6, 2, 2); ctx.fillRect(-2, -4, 2, 2); ctx.fillRect(0, -4, 2, 2); ctx.fillRect(2, -4, 2, 2); ctx.shadowBlur = 0;
        } else if (v.model === 'bus') {
            ctx.fillStyle = '#9ca3af'; const wins = 6; const spacing = (length - 20) / wins;
            for(let i=0; i<wins; i++) { ctx.fillRect(-length/2 + 10 + i * spacing, -width/2 + 1, spacing - 2, 2); ctx.fillRect(-length/2 + 10 + i * spacing, width/2 - 3, spacing - 2, 2); }
        }
    }
    ctx.restore();
};

const drawCharacter = (ctx: CanvasRenderingContext2D, p: Pedestrian) => {
    ctx.save();
    ctx.save();
    ctx.translate(p.pos.x + 8 * SHADOW_OFFSET_X, p.pos.y + 8 * SHADOW_OFFSET_Y);
    ctx.fillStyle = SHADOW_COLOR;
    ctx.beginPath(); ctx.ellipse(0, 0, 7, 7, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    ctx.translate(p.pos.x, p.pos.y); ctx.rotate(p.angle);
    const isMoving = p.velocity.x !== 0 || p.velocity.y !== 0;
    const walkCycle = isMoving ? Math.sin(Date.now() / 100) * 5 : 0;
    ctx.fillStyle = '#1c1917'; ctx.beginPath(); ctx.ellipse(3 + walkCycle, -5, 4, 2.5, 0, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.ellipse(3 - walkCycle, 5, 4, 2.5, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = p.color; ctx.beginPath(); ctx.roundRect(-4, -8, 10, 16, 4); ctx.fill();
    ctx.fillStyle = '#fca5a5'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
    if (p.role === 'police') { ctx.fillStyle = '#1e3a8a'; ctx.beginPath(); ctx.ellipse(-1, 0, 5.5, 5.5, 0, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(3, 0, 3, 5, 0, -Math.PI/2, Math.PI/2); ctx.fill(); } 
    else { const hairColor = p.id.length % 2 === 0 ? '#451a03' : '#000000'; ctx.fillStyle = hairColor; ctx.beginPath(); ctx.arc(-1, 0, 5, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = p.color; 
    if (p.weapon === 'fist') {
        const armSwing = isMoving ? Math.cos(Date.now() / 100) * 3 : 0;
        ctx.beginPath(); ctx.ellipse(0 + armSwing, -9, 3, 3, 0, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#fca5a5'; ctx.beginPath(); ctx.arc(3 + armSwing, -9, 2.5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.ellipse(0 - armSwing, 9, 3, 3, 0, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#fca5a5'; ctx.beginPath(); ctx.arc(3 - armSwing, 9, 2.5, 0, Math.PI*2); ctx.fill();
    } else {
        ctx.beginPath(); ctx.ellipse(2, -9, 3, 3, 0, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.ellipse(2, 9, 3, 3, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fca5a5'; ctx.save(); ctx.translate(10, 0); 
        if (p.weapon === 'pistol') { ctx.fillStyle = '#374151'; ctx.fillRect(-2, -1.5, 10, 3); ctx.fillStyle = '#fca5a5'; ctx.beginPath(); ctx.arc(0, 2, 2.5, 0, Math.PI*2); ctx.fill(); } 
        else if (p.weapon === 'uzi') { ctx.fillStyle = '#111'; ctx.fillRect(-2, -2, 12, 4); ctx.fillStyle = '#fca5a5'; ctx.beginPath(); ctx.arc(0, 3, 2.5, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(6, -2, 2.5, 0, Math.PI*2); ctx.fill(); } 
        else if (p.weapon === 'shotgun' || p.weapon === 'sniper' || p.weapon === 'rocket') { ctx.fillStyle = '#1f2937'; const len = p.weapon === 'sniper' ? 24 : 18; const width = p.weapon === 'rocket' ? 6 : 3; ctx.fillRect(-4, -width/2, len, width); ctx.fillStyle = '#fca5a5'; ctx.beginPath(); ctx.arc(0, 3, 2.5, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(10, -1, 2.5, 0, Math.PI*2); ctx.fill(); }
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
                } else if (tile === TileType.RAIL) {
                    // Ballast (Gravel Base) - Fixed Texture
                    ctx.fillStyle = '#292524'; // Stone-800 (Darker ballast base)
                    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    
                    // Gravel Noise (Fine grit instead of blocks)
                    ctx.fillStyle = '#44403c'; // Stone-700 (Lighter stones)
                    // Deterministic noise based on coordinates to prevent flickering
                    for (let i = 0; i < 32; i++) {
                        const hash = (x * 73856093) ^ (y * 19349663) ^ (i * 83492791);
                        const nx = (hash % TILE_SIZE + TILE_SIZE) % TILE_SIZE;
                        const ny = ((hash >> 8) % TILE_SIZE + TILE_SIZE) % TILE_SIZE;
                        const s = (hash % 3) + 2; // Size 2-4px
                        ctx.fillRect(px + nx, py + ny, s, s);
                    }

                    const gridX = Math.round(px / TILE_SIZE);
                    const gridY = Math.round(py / TILE_SIZE);
                    
                    const isR = (t: number) => t === TileType.RAIL || t === TileType.RAIL_CROSSING || t === TileType.TRAIN_STATION;
                    
                    const hasL = gridX > 0 && isR(state.map[gridY][gridX-1]);
                    const hasR = gridX < MAP_WIDTH - 1 && isR(state.map[gridY][gridX+1]);
                    const hasT = gridY > 0 && isR(state.map[gridY-1][gridX]);
                    const hasB = gridY < MAP_HEIGHT - 1 && isR(state.map[gridY+1][gridX]);
                    
                    const drawRailLine = (bx: number, by: number, ex: number, ey: number, isCurved: boolean = false, cX?: number, cY?: number, radius?: number, startAng?: number, endAng?: number) => {
                        // Rail base (Rusty/Dark)
                        ctx.strokeStyle = '#27272a'; // Zinc-800
                        ctx.lineWidth = 6;
                        ctx.lineCap = 'butt';
                        ctx.beginPath();
                        if(isCurved) { ctx.arc(cX!, cY!, radius!, startAng!, endAng!); }
                        else { ctx.moveTo(bx, by); ctx.lineTo(ex, ey); }
                        ctx.stroke();

                        // Rail top (Shiny Steel)
                        ctx.strokeStyle = '#d4d4d8'; // Zinc-300
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        if(isCurved) { ctx.arc(cX!, cY!, radius!, startAng!, endAng!); }
                        else { ctx.moveTo(bx, by); ctx.lineTo(ex, ey); }
                        ctx.stroke();
                    };

                    const sleeperColor = '#3f2e26'; // Dark Wood

                    // Helpers for drawing straight segments
                    const drawHorz = () => {
                        // Sleepers (Vertical bars)
                        ctx.fillStyle = sleeperColor;
                        for(let i=4; i<TILE_SIZE; i+=16) {
                            ctx.fillRect(px + i, py + 16, 8, TILE_SIZE - 32);
                            // Bolt detail
                            ctx.fillStyle = '#18181b';
                            ctx.fillRect(px + i + 2, py + 38, 4, 4);
                            ctx.fillRect(px + i + 2, py + TILE_SIZE - 42, 4, 4);
                            ctx.fillStyle = sleeperColor;
                        }
                        // Rails
                        drawRailLine(px, py + 36, px + TILE_SIZE, py + 36);
                        drawRailLine(px, py + 92, px + TILE_SIZE, py + 92);
                    };

                    const drawVert = () => {
                        // Sleepers (Horizontal bars)
                        ctx.fillStyle = sleeperColor;
                        for(let i=4; i<TILE_SIZE; i+=16) {
                            ctx.fillRect(px + 16, py + i, TILE_SIZE - 32, 8);
                            // Bolt detail
                            ctx.fillStyle = '#18181b';
                            ctx.fillRect(px + 38, py + i + 2, 4, 4);
                            ctx.fillRect(px + 94, py + i + 2, 4, 4);
                            ctx.fillStyle = sleeperColor;
                        }
                        // Rails
                        drawRailLine(px + 36, py, px + 36, py + TILE_SIZE);
                        drawRailLine(px + 92, py, px + 92, py + TILE_SIZE);
                    };

                    const drawCurve = (cX: number, cY: number, startAng: number, endAng: number) => {
                        ctx.save();
                        ctx.translate(cX, cY);
                        
                        // Sleepers (Radially)
                        const steps = 10;
                        const rInner = 36; 
                        const rOuter = 92; 
                        
                        ctx.fillStyle = sleeperColor;
                        for(let i=0; i<=steps; i++) {
                                const t = i / steps;
                                let angle = startAng + (endAng - startAng) * t;
                                
                                ctx.save();
                                ctx.rotate(angle);
                                ctx.translate((rInner + rOuter)/2, 0); 
                                ctx.fillRect(-(rOuter-rInner)/2 - 10, -4, (rOuter-rInner) + 20, 8); 
                                
                                ctx.fillStyle = '#18181b';
                                ctx.fillRect(-(rOuter-rInner)/2 + 2, -2, 4, 4); 
                                ctx.fillRect((rOuter-rInner)/2 - 6, -2, 4, 4); 
                                ctx.fillStyle = sleeperColor;
                                
                                ctx.restore();
                        }
                        ctx.restore();

                        drawRailLine(0,0,0,0, true, cX, cY, 36, startAng, endAng);
                        drawRailLine(0,0,0,0, true, cX, cY, 92, startAng, endAng);
                    };

                    const drawIntersection = () => {
                            // Draw Grid Sleepers
                            ctx.fillStyle = sleeperColor;
                            for(let i=4; i<TILE_SIZE; i+=16) {
                                ctx.fillRect(px + i, py + 16, 8, TILE_SIZE - 32);
                            }
                            // Rails (Cross)
                            drawRailLine(px, py + 36, px + TILE_SIZE, py + 36);
                            drawRailLine(px, py + 92, px + TILE_SIZE, py + 92);
                            drawRailLine(px + 36, py, px + 36, py + TILE_SIZE);
                            drawRailLine(px + 92, py, px + 92, py + TILE_SIZE);
                    };

                    // --- ORIENTATION LOGIC FIX ---
                    // Prioritize Straight connections (Left+Right OR Top+Bottom) over complex intersection logic
                    // This handles Parallel Tracks correctly by ignoring the perpendicular neighbor
                    
                    const isStraightHorz = hasL && hasR;
                    const isStraightVert = hasT && hasB;
                    
                    let drawn = false;

                    // 1. Full Crossing (Grid) - Only if truly connected 4 ways
                    if (isStraightHorz && isStraightVert) {
                        drawIntersection();
                        drawn = true;
                    } 
                    // 2. Straight Horizontal (Prioritize L-R continuity)
                    else if (isStraightHorz) {
                        drawHorz();
                        drawn = true;
                    }
                    // 3. Straight Vertical (Prioritize T-B continuity)
                    else if (isStraightVert) {
                        drawVert();
                        drawn = true;
                    }
                    // 4. Corners
                    else if (hasL && hasB) { drawCurve(px, py + TILE_SIZE, -Math.PI * 0.5, 0); drawn = true; } // Bottom-Left
                    else if (hasL && hasT) { drawCurve(px, py, 0, Math.PI * 0.5); drawn = true; } // Top-Left
                    else if (hasR && hasB) { drawCurve(px + TILE_SIZE, py + TILE_SIZE, Math.PI, Math.PI * 1.5); drawn = true; } // Bottom-Right
                    else if (hasR && hasT) { drawCurve(px + TILE_SIZE, py, Math.PI, Math.PI * 0.5); drawn = true; } // Top-Right
                    
                    // 5. Dead Ends / Single Connections
                    if (!drawn) {
                        if (hasL || hasR) drawHorz();
                        else if (hasT || hasB) drawVert();
                        else drawHorz(); // Isolated default
                    }
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
                        if (relX > 2 && relX < cW - 2 && relY > 2 && relY < cH - 2) {
                            ctx.fillStyle = '#451a03'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                            if ((relX + relY) % 2 === 0) {
                                ctx.fillStyle = '#d6d3d1'; ctx.fillRect(px + 10, py + 10, TILE_SIZE - 20, TILE_SIZE - 20);
                                ctx.strokeStyle = '#44403c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px + TILE_SIZE/2, py + 10); ctx.lineTo(px + TILE_SIZE/2, py + TILE_SIZE - 10); ctx.moveTo(px + 10, py + TILE_SIZE/2); ctx.lineTo(px + TILE_SIZE - 10, py + TILE_SIZE/2); ctx.stroke();
                            }
                        } else if (!isTop && !isBottom && !isLeft && !isRight) {
                            if (seed % 5 === 0) { ctx.fillStyle = '#b45309'; ctx.fillRect(px + 20, py + 30, 60, 20); ctx.fillStyle = '#d97706'; ctx.fillRect(px + 20, py + 30, 55, 15); } 
                            else if (seed % 7 === 0) { ctx.fillStyle = '#0ea5e9'; ctx.fillRect(px + 30, py + 10, 20, 80); ctx.fillStyle = '#0284c7'; ctx.fillRect(px + 45, py + 10, 5, 80); } 
                            else if (seed % 11 === 0) { ctx.fillStyle = '#1e3a8a'; ctx.fillRect(px + 40, py + 40, 25, 25); ctx.fillStyle = '#fff'; ctx.fillRect(px + 45, py + 45, 15, 15); } 
                            else if (seed % 3 === 0) { ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(px, py + 20); ctx.quadraticCurveTo(px + 60, py + 60, px + TILE_SIZE, py + 40); ctx.stroke(); }
                        }
                        if (relX === 1 && relY === 1) {
                            ctx.fillStyle = '#facc15'; ctx.fillRect(px + 20, py + 20, TILE_SIZE - 40, TILE_SIZE - 40); ctx.strokeStyle = '#a16207'; ctx.lineWidth = 4;
                            ctx.beginPath(); ctx.moveTo(px+20, py+20); ctx.lineTo(px+TILE_SIZE-20, py+TILE_SIZE-20); ctx.moveTo(px+TILE_SIZE-20, py+20); ctx.lineTo(px+20, py+TILE_SIZE-20); ctx.stroke();
                            renderList.push({ y: py, draw: () => { ctx.save(); ctx.translate(px + TILE_SIZE/2, py + TILE_SIZE/2); ctx.rotate(Date.now() / 5000); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(0, -10, 400, 20); ctx.restore(); }});
                        }
                    }
                } else if (tile === TileType.FOOTBALL_FIELD) {
                    const fieldX = 73; const fieldY = 96; const fieldW = 14; const fieldH = 8;
                    const relX = x - fieldX; const relY = y - fieldY;
                    
                    if (relX >= 0 && relX < fieldW && relY >= 0 && relY < fieldH) {
                        // 1. Draw Grass Stripe
                        const stripe = Math.floor(relX / 1) % 2 === 0;
                        ctx.fillStyle = stripe ? '#15803d' : '#16a34a'; // Green-700 / Green-600
                        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

                        // 2. Draw Field Lines using Clipping
                        const lineW = 4;
                        const fieldWorldX = fieldX * TILE_SIZE;
                        const fieldWorldY = fieldY * TILE_SIZE;
                        const fieldWorldW = fieldW * TILE_SIZE;
                        const fieldWorldH = fieldH * TILE_SIZE;
                        const centerX = fieldWorldX + fieldWorldW / 2;
                        const centerY = fieldWorldY + fieldWorldH / 2;

                        ctx.save();
                        // Clip drawing to CURRENT TILE only
                        ctx.beginPath();
                        ctx.rect(px, py, TILE_SIZE, TILE_SIZE);
                        ctx.clip();

                        // Common Line Settings
                        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
                        ctx.lineWidth = lineW;
                        ctx.lineCap = 'butt'; // Crisp corners

                        // A. Outer Border
                        ctx.strokeRect(fieldWorldX + lineW/2, fieldWorldY + lineW/2, fieldWorldW - lineW, fieldWorldH - lineW);

                        // B. Center Line
                        ctx.beginPath();
                        ctx.moveTo(centerX, fieldWorldY);
                        ctx.lineTo(centerX, fieldWorldY + fieldWorldH);
                        ctx.stroke();

                        // C. Center Circle
                        const circleRadius = TILE_SIZE * 1.5;
                        ctx.beginPath();
                        ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
                        ctx.stroke();
                        // Center Spot
                        ctx.fillStyle = 'white';
                        ctx.beginPath();
                        ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
                        ctx.fill();

                        // D. Penalty Areas
                        const penaltyW = TILE_SIZE * 2.5;
                        const penaltyH = TILE_SIZE * 4;
                        const penaltyY = centerY - penaltyH / 2;
                        
                        // Left Penalty Box
                        ctx.strokeRect(fieldWorldX + lineW/2, penaltyY, penaltyW, penaltyH);
                        // Right Penalty Box
                        ctx.strokeRect(fieldWorldX + fieldWorldW - penaltyW - lineW/2, penaltyY, penaltyW, penaltyH);

                        ctx.restore();

                        // 3. Goal Posts (3D Objects in RenderList)
                        // Left Goal
                        if (relX === 0 && relY === 4) {
                            renderList.push({
                                y: py + TILE_SIZE,
                                draw: () => {
                                    const postH = 20; const postW = 6;
                                    ctx.fillStyle = '#fbbf24'; // Yellow posts
                                    // Top Post
                                    ctx.fillRect(px + lineW, py - 10, postW, postH);
                                    // Bottom Post
                                    ctx.fillRect(px + lineW, py + TILE_SIZE - 10, postW, postH);
                                    // Crossbar (approx)
                                    ctx.fillStyle = 'rgba(255,255,255,0.3)';
                                    ctx.fillRect(px + lineW, py, 2, TILE_SIZE); 
                                }
                            });
                        }
                        // Right Goal
                        if (relX === fieldW - 1 && relY === 4) {
                            renderList.push({
                                y: py + TILE_SIZE,
                                draw: () => {
                                    const postH = 20; const postW = 6;
                                    ctx.fillStyle = '#fbbf24'; 
                                    // Top Post
                                    ctx.fillRect(px + TILE_SIZE - lineW - postW, py - 10, postW, postH);
                                    // Bottom Post
                                    ctx.fillRect(px + TILE_SIZE - lineW - postW, py + TILE_SIZE - 10, postW, postH);
                                    // Crossbar
                                    ctx.fillStyle = 'rgba(255,255,255,0.3)';
                                    ctx.fillRect(px + TILE_SIZE - lineW - 2, py, 2, TILE_SIZE);
                                }
                            });
                        }
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
                } else if (tile === TileType.BUILDING || tile === TileType.HOSPITAL || tile === TileType.POLICE_STATION || tile === TileType.SKYSCRAPER || tile === TileType.SHOP || tile === TileType.MALL || tile === TileType.CONTAINER || tile === TileType.PAINT_SHOP || tile === TileType.AIRPORT_TERMINAL || tile === TileType.HANGAR || tile === TileType.TRAIN_STATION) {
                     let drawWidth = TILE_SIZE;
                     let skip = false;

                     // --- CONTAINER MERGING LOGIC ---
                     if (tile === TileType.CONTAINER) {
                         const hasLeft = x > 0 && state.map[y][x-1] === TileType.CONTAINER;
                         const hasRight = x < MAP_WIDTH - 1 && state.map[y][x+1] === TileType.CONTAINER;
                         
                         if (hasLeft) {
                             skip = true;
                         } else if (hasRight) {
                             drawWidth = TILE_SIZE * 2;
                         }
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
                } else if (tile === TileType.SHIP_DECK) {
                    ctx.fillStyle = '#78350f'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE); ctx.fillStyle = 'rgba(0,0,0,0.1)'; for(let i=0; i<TILE_SIZE; i+=8) ctx.fillRect(px+i, py, 1, TILE_SIZE);
                    const below = getTileAt(state.map, px, py + TILE_SIZE); if (below === TileType.WATER) { ctx.fillStyle = '#451a03'; ctx.fillRect(px, py + TILE_SIZE - 4, TILE_SIZE, 4); }
                } else if (tile === TileType.WATER) {
                    ctx.fillStyle = COLORS.water; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE); ctx.fillStyle = 'rgba(255,255,255,0.1)'; const offset = (Date.now() / 50) % 20; ctx.beginPath(); ctx.arc(px + 20 + offset, py + 20, 5, 0, Math.PI*2); ctx.fill();
                } else if (tile === TileType.ROAD_CROSS) {
                    drawRoad(ctx, px, py, tile, textures, state.map, x, y); renderList.push({ y: py + 99999, draw: () => drawTrafficLight(ctx, px, py) });
                } else {
                    drawRoad(ctx, px, py, tile, textures, state.map, x, y);
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
