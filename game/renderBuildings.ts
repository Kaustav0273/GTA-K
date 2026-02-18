
import { TileType } from '../types';
import { TILE_SIZE } from '../constants';
import { SHADOW_OFFSET_X, SHADOW_OFFSET_Y, SHADOW_COLOR } from './renderUtils';

// Helper to calculate building height
export const getBuildingHeight = (tileType: TileType, px: number, py: number): number => {
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
        return 90;
    } else if (tileType === TileType.BUNKER) {
        return 35;
    } else if (tileType === TileType.WATCHTOWER) {
        return 120; // Very tall
    } else if (tileType === TileType.WAREHOUSE) {
        return 30; // Low, flat
    } else if (tileType === TileType.FACTORY) {
        return 50; // Medium
    } else if (tileType === TileType.TENEMENT) {
        return 80; // Tall-ish
    } else if (tileType === TileType.PROJECTS) {
        return 110; // Tall
    } else if (tileType === TileType.BANK) {
        return 75;
    }
    return 50;
};

// Projected Building Shadow
const drawBuildingShadow = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, height: number) => {
    const shadowX = height * SHADOW_OFFSET_X;
    const shadowY = height * SHADOW_OFFSET_Y;

    ctx.save();
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
        windowColor = '#0ea5e9'; 
    } else if (tileType === TileType.HANGAR) {
        baseColor = '#64748b';
        roofColor = '#94a3b8'; 
    } else if (tileType === TileType.TRAIN_STATION) {
        baseColor = '#57534e'; 
        roofColor = '#44403c'; 
        windowColor = '#7dd3fc'; 
    } else if (tileType === TileType.BUNKER) {
        baseColor = '#4d5c42'; // Camo Green
        roofColor = '#3f4f3a';
    } else if (tileType === TileType.WATCHTOWER) {
        baseColor = '#404040';
        roofColor = '#171717';
    } else if (tileType === TileType.WAREHOUSE) {
        baseColor = '#374151'; // Gray-700
        roofColor = '#4b5563'; // Gray-600 with corrugated texture
        windowColor = '#1f2937'; // Dark, small windows
    } else if (tileType === TileType.FACTORY) {
        baseColor = '#7f1d1d'; // Brick Red (Dark)
        roofColor = '#1f2937'; // Dark roof
    } else if (tileType === TileType.TENEMENT) {
        baseColor = '#9f1239'; // Rose-900 (Red Brick)
        roofColor = '#171717'; // Tar roof
    } else if (tileType === TileType.PROJECTS) {
        baseColor = '#525252'; // Neutral-600
        roofColor = '#a3a3a3'; // Lighter roof
        windowColor = '#000';
    } else if (tileType === TileType.BANK) {
        baseColor = '#d4d4d8'; // Zinc-300
        roofColor = '#71717a'; // Zinc-500
        windowColor = '#065f46'; // Emerald-800
    }

    // -- Ground Occlusion Patch --
    ctx.fillStyle = '#000';
    ctx.fillRect(x, y, w, TILE_SIZE); 

    // -- South Wall (Front Face) --
    if (tileType !== TileType.PAINT_SHOP && tileType !== TileType.WATCHTOWER) {
        const wallGrad = ctx.createLinearGradient(x, y + TILE_SIZE - height, x, y + TILE_SIZE);
        wallGrad.addColorStop(0, roofColor); 
        wallGrad.addColorStop(1, '#000'); 
        ctx.fillStyle = wallGrad;
        ctx.fillRect(x, y + TILE_SIZE - height, w, height);
    } else if (tileType === TileType.WATCHTOWER) {
        // Lattice work
        ctx.fillStyle = baseColor;
        ctx.fillRect(x + 2, y + TILE_SIZE - height, 4, height); // Leg 1
        ctx.fillRect(x + w - 6, y + TILE_SIZE - height, 4, height); // Leg 2
        // Cross braces
        ctx.strokeStyle = baseColor; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x+2, y+TILE_SIZE); ctx.lineTo(x+w-6, y+TILE_SIZE-height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x+w-6, y+TILE_SIZE); ctx.lineTo(x+2, y+TILE_SIZE-height); ctx.stroke();
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
        ctx.fillStyle = windowColor;
        const paneW = 16;
        for (let i = 4; i < w - 4; i += paneW + 4) {
            ctx.fillRect(x + i, y + TILE_SIZE - height + 4, paneW, height - 8);
        }
    } else if (tileType === TileType.HANGAR) {
        ctx.fillStyle = '#475569';
        for(let i=0; i<w; i+=8) {
             ctx.fillRect(x + i, y + TILE_SIZE - height, 2, height);
        }
    } else if (tileType === TileType.BUNKER) {
        // Bunker entrance (dark slot)
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(x + w/2, y + TILE_SIZE, 10, Math.PI, 0); ctx.fill();
    } else if (tileType === TileType.WAREHOUSE) {
        // Horizontal corrugated lines
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        for(let i=y + TILE_SIZE - height; i<y + TILE_SIZE; i+=5) {
            ctx.fillRect(x, i, w, 2);
        }
        // Small high windows
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x + 10, y + TILE_SIZE - height + 5, w - 20, 5);
    } else if (tileType === TileType.FACTORY) {
        // Industrial windows (tall narrow)
        ctx.fillStyle = '#1f2937';
        for(let i=10; i<w-10; i+=15) {
            ctx.fillRect(x + i, y + TILE_SIZE - height + 10, 8, height - 20);
        }
    } else if (tileType === TileType.TENEMENT) {
        // Fire Escape
        ctx.strokeStyle = '#171717'; ctx.lineWidth = 2;
        const escapeX = x + w - 15;
        ctx.beginPath();
        ctx.moveTo(escapeX, y + TILE_SIZE - height); ctx.lineTo(escapeX, y + TILE_SIZE);
        ctx.moveTo(escapeX + 10, y + TILE_SIZE - height); ctx.lineTo(escapeX + 10, y + TILE_SIZE);
        ctx.stroke();
        // Crossbars
        for(let i=y + TILE_SIZE - height + 10; i<y + TILE_SIZE; i+=15) {
            ctx.fillStyle = '#171717'; ctx.fillRect(escapeX, i, 10, 3);
        }
        // Windows
        ctx.fillStyle = '#1f2937';
        for(let r=0; r<4; r++) {
            for(let c=0; c<3; c++) {
                ctx.fillRect(x + 8 + c * 20, y + TILE_SIZE - height + 10 + r * 20, 12, 12);
            }
        }
    } else if (tileType === TileType.PROJECTS) {
        // Grid of small uniform windows
        ctx.fillStyle = '#000';
        const rows = 6;
        const cols = 4;
        for(let r=0; r<rows; r++) {
            for(let c=0; c<cols; c++) {
                if ((x+y+r+c)%10 !== 0) // Random lit windows logic can be applied here
                    ctx.fillRect(x + 8 + c * 24, y + TILE_SIZE - height + 8 + r * 16, 12, 10);
            }
        }
    } else if (tileType === TileType.BANK) {
        // Columns
        ctx.fillStyle = '#f4f4f5'; // Zinc-100
        const colW = 6;
        const gap = (w - 10) / 4;
        for(let i=0; i<4; i++) {
            ctx.fillRect(x + 5 + i*gap, y + TILE_SIZE - height, colW, height);
        }
        // Pediment / Header
        ctx.fillStyle = '#a1a1aa';
        ctx.fillRect(x, y + TILE_SIZE - height, w, 10);
    } else if (tileType !== TileType.PAINT_SHOP && tileType !== TileType.SKYSCRAPER && tileType !== TileType.WATCHTOWER) {
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
    
    if (tileType === TileType.HANGAR || tileType === TileType.TRAIN_STATION || tileType === TileType.BUNKER) {
        // Rounded Roof Effect via gradient
        const grd = ctx.createLinearGradient(x, roofY, x + w, roofY);
        if (tileType === TileType.TRAIN_STATION) {
            grd.addColorStop(0, '#44403c'); grd.addColorStop(0.5, '#78716c'); grd.addColorStop(1, '#44403c');
        } else if (tileType === TileType.BUNKER) {
            grd.addColorStop(0, '#3f4f3a'); grd.addColorStop(0.5, '#5d7554'); grd.addColorStop(1, '#3f4f3a');
        } else {
            grd.addColorStop(0, '#475569'); grd.addColorStop(0.5, '#cbd5e1'); grd.addColorStop(1, '#475569');
        }
        ctx.fillStyle = grd;
    } else if (tileType === TileType.WAREHOUSE) {
        // Corrugated roof texture - emulating repeating pattern manually for simplicity
        ctx.fillStyle = '#4b5563';
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
        ctx.fillStyle = '#0ea5e9'; ctx.fillRect(x + w/2 - 10, roofY + TILE_SIZE/2 - 5, 20, 10);
    } else if (tileType === TileType.HANGAR) {
        ctx.fillStyle = 'rgba(0,0,0,0.1)'; for(let i=10; i<w; i+=20) ctx.fillRect(x + i, roofY, 4, TILE_SIZE);
    } else if (tileType === TileType.WATCHTOWER) {
        ctx.fillStyle = '#111'; ctx.fillRect(x+2, roofY+2, w-4, TILE_SIZE-4);
        // Spotlight
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(centerX, roofCY, 5, 0, Math.PI*2); ctx.fill();
        // Rotating Searchlight
        const angle = Date.now() / 500;
        ctx.save(); ctx.translate(centerX, roofCY); ctx.rotate(angle);
        ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(200, -30); ctx.lineTo(200, 30); ctx.fill();
        ctx.restore();
    } else if (tileType === TileType.BUNKER) {
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(x + 10, roofY + 10, w - 20, TILE_SIZE - 20); // Vent hatch
    } else if (tileType === TileType.WAREHOUSE) {
        // Vents on roof
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(x + 10, roofY + 10, 10, 10);
        ctx.fillRect(x + w - 20, roofY + TILE_SIZE - 20, 10, 10);
        // Corrugated lines on roof
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        for(let i=0; i<TILE_SIZE; i+=4) ctx.fillRect(x, roofY + i, w, 1);
    } else if (tileType === TileType.FACTORY) {
        // Smokestack
        ctx.fillStyle = '#292524';
        ctx.beginPath(); ctx.arc(centerX - 10, roofCY - 10, 8, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(centerX - 10, roofCY - 10, 4, 0, Math.PI*2); ctx.fill();
        // Smoke particle simulation is heavy, so static for now
        ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.beginPath(); ctx.arc(centerX, roofCY-20, 12, 0, Math.PI*2); ctx.fill();
    } else if (tileType === TileType.TENEMENT) {
        // Water tower
        ctx.fillStyle = '#78350f'; // Wood color
        ctx.fillRect(x + 5, roofY + 5, 20, 20);
        ctx.fillStyle = '#451a03'; // Roof of tower
        ctx.beginPath(); ctx.moveTo(x+5, roofY+5); ctx.lineTo(x+25, roofY+5); ctx.lineTo(x+15, roofY-5); ctx.fill();
    } else if (tileType === TileType.PROJECTS) {
        // AC Units
        ctx.fillStyle = '#d4d4d8';
        for(let i=0; i<5; i++) {
            const rx = x + Math.random() * (w-10);
            const ry = roofY + Math.random() * (TILE_SIZE-10);
            ctx.fillRect(rx, ry, 6, 6);
        }
    } else if (tileType === TileType.BANK) {
        // Dollar Sign
        ctx.fillStyle = '#166534';
        ctx.beginPath(); ctx.arc(centerX, roofCY, 16, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#4ade80';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 24px monospace';
        ctx.fillText('$', centerX, roofCY + 2);
    }

    ctx.restore();
};
