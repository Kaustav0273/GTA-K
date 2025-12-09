
import { Vehicle, Pedestrian, TileType, Drop } from '../types';
import { MutableGameState } from './physics';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, COLORS } from '../constants';
import { getTileAt, isSolid } from '../utils/gameUtils'; // Added import for helper

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
    
    // Float animation
    const float = Math.sin(Date.now() / 200) * 2;
    ctx.translate(0, float);

    if (drop.type === 'cash') {
        // Green Bill Stack
        ctx.fillStyle = '#22c55e'; // Green
        ctx.strokeStyle = '#14532d'; // Dark Green
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
        // Weapon Icon
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 5;
        
        if (drop.weapon === 'pistol') {
            ctx.fillStyle = '#9ca3af'; // Gray
            ctx.beginPath(); 
            ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.lineTo(5, -2); ctx.lineTo(-2, -2); ctx.lineTo(-2, -4); ctx.lineTo(-5, -4); 
            ctx.fill();
        } else if (drop.weapon === 'uzi') {
            ctx.fillStyle = '#4b5563'; // Dark Gray
            ctx.beginPath();
            ctx.rect(-6, -2, 12, 4); ctx.fill(); // Body
            ctx.rect(-2, 2, 2, 3); ctx.fill(); // Mag
        }
    }
    
    ctx.restore();
};

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

    // Light Glow (Simulated height: renders on top of everything)
    drawLightGlow(ctx, lampX, lampY, 45, 'rgba(253, 224, 71, 0.25)');
};

export const drawTrafficLight = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    // We draw a wire-hung traffic light system for the intersection
    // 4 lights facing inward
    
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

    // Draw 4 lights offset from center
    const offsets = [
        { dx: -10, dy: -10, color: 0 }, // Top Left
        { dx: 10, dy: -10, color: 1 },  // Top Right
        { dx: 10, dy: 10, color: 2 },   // Bottom Right
        { dx: -10, dy: 10, color: 0 },  // Bottom Left
    ];

    const time = Date.now() / 2000;
    const cycle = Math.floor(time) % 3; // 0 Green, 1 Yellow, 2 Red
    
    offsets.forEach((off, i) => {
        const lx = cx + off.dx;
        const ly = cy + off.dy;
        
        // Housing
        ctx.fillStyle = '#000';
        ctx.fillRect(lx - 3, ly - 3, 6, 6);
        
        // Light Color (Simple cycle: Green -> Yellow -> Red)
        // Offset cycles for different sides? No, simple sync for visual flair
        let lightColor = '#ef4444'; // Red default
        if (i % 2 === 0) {
            // N/S
            lightColor = cycle === 0 ? '#22c55e' : (cycle === 1 ? '#eab308' : '#ef4444');
        } else {
            // E/W (Opposite phase roughly)
            lightColor = cycle === 0 ? '#ef4444' : (cycle === 1 ? '#ef4444' : '#22c55e');
        }
        
        ctx.fillStyle = lightColor;
        ctx.shadowColor = lightColor;
        ctx.shadowBlur = 4;
        ctx.beginPath(); ctx.arc(lx, ly, 1.5, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
    });
};

export const drawBuilding = (ctx: CanvasRenderingContext2D, x: number, y: number, tileType: TileType, textures: any) => {
    // Generate Building Properties based on TileType and Random Seed
    const w = TILE_SIZE;
    const seed = x * 13 + y * 7;
    const centerX = x + w/2;
    const centerY = y + w/2; // w=h for tile

    let height = 50;
    let baseColor = '#262626';
    let roofColor = '#3f3f46';
    let windowColor = '#1e293b'; // Default dark windows

    if (tileType === TileType.SKYSCRAPER) {
        height = 100 + (seed % 60); // Taller: 100 - 160
        // Glassy Corporate Look
        baseColor = (seed % 2 === 0) ? '#0f172a' : '#1e3a8a'; // Slate-900 or Blue-900
        roofColor = '#020617';
        windowColor = '#38bdf8'; // Bright blue reflections
    } else if (tileType === TileType.SHOP) {
        height = 35 + (seed % 15); // Shorter: 35 - 50
        // Vibrant Shop Colors
        const shopColors = ['#991b1b', '#065f46', '#1e40af', '#854d0e'];
        baseColor = shopColors[seed % shopColors.length];
        roofColor = '#404040';
        windowColor = '#fef08a'; // Lit up windows (Yellow)
    } else if (tileType === TileType.BUILDING) {
        height = 40 + (seed % 20); // Standard: 40 - 60
        // Residential Brick/Concrete
        const resColors = ['#57534e', '#44403c', '#78716c', '#292524'];
        baseColor = resColors[seed % resColors.length];
        roofColor = '#1c1917';
    } else if (tileType === TileType.HOSPITAL) {
        height = 70;
        baseColor = '#d1d5db'; // Light Grey
        roofColor = '#f3f4f6';
        windowColor = '#bae6fd';
    } else if (tileType === TileType.POLICE_STATION) {
        height = 70;
        baseColor = '#1e3a8a'; // Dark Blue
        roofColor = '#334155';
    }

    // Perspective: Standard Oblique Top-Down (Negative Y is Up/North)
    // We draw the roof shifted UP (North) so the base is at the correct tile location.
    // Base Footprint: (x, y) to (x+w, y+w)
    // Roof Footprint: (x, y - height) to (x+w, y+w - height)
    
    // -- Ground Shadow --
    // Subtle shadow around base
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x - 2, y - 2, w + 4, w + 4);

    // -- South Wall (Front Face) --
    // Connects bottom of Roof (y + w - height) to bottom of Base (y + w)
    const wallHeight = height; 
    // The visual top of the south wall is at (y + w - height)
    // The visual bottom is at (y + w)
    
    const wallGrad = ctx.createLinearGradient(x, y + w - height, x, y + w);
    wallGrad.addColorStop(0, roofColor); // Top is darker/roof color
    wallGrad.addColorStop(1, baseColor); // Bottom is base color
    ctx.fillStyle = wallGrad;
    ctx.fillRect(x, y + w - height, w, height);

    // -- Windows on South Wall --
    const stories = Math.floor(height / 15);
    const cols = Math.floor(w / 12);
    ctx.fillStyle = windowColor;
    
    if (tileType === TileType.SKYSCRAPER) {
        // Vertical glass strips
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        for(let c=0; c<cols; c++) {
            ctx.fillRect(x + 4 + c * 10, y + w - height, 6, height - 2);
        }
    } else {
        // Standard Grid
        for (let s=0; s < stories; s++) {
             for (let c=0; c < cols; c++) {
                 // Randomize lit windows for residential/shops
                 if ((x + y + s + c) % 7 !== 0) { 
                    const wy = y + w - height + 5 + s * 14; // Start from top of wall
                    const wx = x + 4 + c * 10;
                    if (wx + 6 < x + w && wy + 8 < y + w) ctx.fillRect(wx, wy, 6, 8);
                 }
             }
        }
    }

    // -- Roof --
    // Drawn at (x, y - height)
    const roofY = y - height;
    
    ctx.fillStyle = roofColor;
    if (tileType === TileType.BUILDING && textures['roof']) ctx.fillStyle = textures['roof'];
    ctx.fillRect(x, roofY, w, w);
    
    // Roof Border
    ctx.strokeStyle = '#171717';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, roofY, w, w);

    // -- Roof Details --
    const roofCY = roofY + w/2;
    
    if (tileType === TileType.HOSPITAL) {
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
    } else if (tileType === TileType.SHOP) {
        // Awnings - drawn at bottom of wall (y + w) roughly? No, usually over the door/window
        // Let's draw awning at bottom of the wall (just above ground)
        const awningColor = (seed % 2 === 0) ? '#ef4444' : '#22c55e';
        const awningY = y + w - 6; // Just above ground
        
        ctx.fillStyle = awningColor;
        // Striped awning
        for(let i=0; i<w; i+=8) {
            ctx.fillStyle = (i/8)%2===0 ? awningColor : '#e5e7eb';
            // Extend out slightly (South)
            ctx.fillRect(x + i, awningY, 8, 8);
        }
        
        // Roof vent
        ctx.fillStyle = '#262626';
        ctx.fillRect(x + 10, roofY + 10, w - 20, w - 20);
    } else if (tileType === TileType.SKYSCRAPER) {
        // Helipad randomly
        if (seed % 5 === 0) {
           ctx.fillStyle = '#222';
           ctx.beginPath(); ctx.arc(centerX, roofCY, 18, 0, Math.PI*2); ctx.fill();
           ctx.strokeStyle = '#eab308'; ctx.lineWidth = 2;
           ctx.beginPath(); ctx.arc(centerX, roofCY, 14, 0, Math.PI*2); ctx.stroke();
           ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = '#eab308'; ctx.textAlign = 'center'; ctx.fillText('H', centerX, roofCY+4);
        } else {
           // Antenna
           ctx.strokeStyle = '#525252'; ctx.lineWidth = 2;
           ctx.beginPath(); ctx.moveTo(centerX, roofCY); ctx.lineTo(centerX, roofCY - 15); ctx.stroke();
           ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(centerX, roofCY - 15, 2, 0, Math.PI*2); ctx.fill(); 
        }
    } else {
        // Standard Building Details
        const hasAC = seed % 3 === 0;
        const hasVent = seed % 5 === 0;
        const hasPipe = seed % 4 === 0;
        if (hasAC) {
            const acX = x + 8 + (seed % 20);
            const acY = roofY + 8 + (seed % 20);
            ctx.fillStyle = '#d4d4d8';
            ctx.fillRect(acX, acY, 14, 14);
            ctx.fillStyle = '#525252';
            ctx.beginPath(); ctx.arc(acX + 7, acY + 7, 5, 0, Math.PI*2); ctx.fill();
        }
        if (hasVent) {
             const vX = x + w - 16;
             const vY = roofY + 10;
             ctx.fillStyle = '#737373';
             ctx.fillRect(vX, vY, 8, 8);
             ctx.fillStyle = '#171717';
             ctx.fillRect(vX+2, vY+2, 4, 4);
        }
        if (hasPipe) {
            ctx.strokeStyle = '#525252';
            ctx.lineWidth = 2;
            ctx.beginPath(); 
            ctx.moveTo(x + 5, roofY + 5);
            ctx.lineTo(x + 5, roofY + w - 10);
            ctx.lineTo(x + w - 10, roofY + w - 10);
            ctx.stroke();
        }
    }
};

const drawRoad = (ctx: CanvasRenderingContext2D, x: number, y: number, type: TileType, textures: any) => {
    ctx.fillStyle = textures['road'] || COLORS.road;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    
    // Road Markings
    ctx.strokeStyle = '#eab308'; // Yellow-500
    ctx.lineWidth = 2;
    const center = TILE_SIZE / 2;

    if (type === TileType.ROAD_H) {
        ctx.beginPath();
        ctx.setLineDash([10, 10]);
        ctx.moveTo(x, y + center);
        ctx.lineTo(x + TILE_SIZE, y + center);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Sidewalk edges
        ctx.fillStyle = '#d4d4d8';
        ctx.fillRect(x, y, TILE_SIZE, 4);
        ctx.fillRect(x, y + TILE_SIZE - 4, TILE_SIZE, 4);

    } else if (type === TileType.ROAD_V) {
        ctx.beginPath();
        ctx.setLineDash([10, 10]);
        ctx.moveTo(x + center, y);
        ctx.lineTo(x + center, y + TILE_SIZE);
        ctx.stroke();
        ctx.setLineDash([]);

        // Sidewalk edges
        ctx.fillStyle = '#d4d4d8';
        ctx.fillRect(x, y, 4, TILE_SIZE);
        ctx.fillRect(x + TILE_SIZE - 4, y, 4, TILE_SIZE);

    } else if (type === TileType.ROAD_CROSS) {
         // Intersection - Crosswalks
         ctx.fillStyle = '#fff';
         const cwW = 12;
         const cwL = TILE_SIZE - 10;
         
         // Top
         ctx.fillRect(x + 5, y + 4, cwL, cwW);
         // Bottom
         ctx.fillRect(x + 5, y + TILE_SIZE - 16, cwL, cwW);
         // Left
         ctx.fillRect(x + 4, y + 5, cwW, cwL);
         // Right
         ctx.fillRect(x + TILE_SIZE - 16, y + 5, cwW, cwL);
    }
};

const drawVehicle = (ctx: CanvasRenderingContext2D, v: Vehicle) => {
    ctx.save();
    ctx.translate(v.pos.x, v.pos.y);
    ctx.rotate(v.angle);
    
    const length = v.size.y;
    const width = v.size.x;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(-length/2 + 2, -width/2 + 2, length, width);

    // Body
    ctx.fillStyle = v.color;
    // Rounded rect for car body
    ctx.beginPath();
    ctx.roundRect(-length/2, -width/2, length, width, 4);
    ctx.fill();

    // Roof / Windshield Area
    const roofL = length - 20;
    const roofW = width - 4;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(-roofL/2, -roofW/2, roofL, roofW);

    // Windshield (Front is Right side for angle 0?)
    // Assuming 0 rad is Right (East), and velocity is +X.
    ctx.fillStyle = v.damage.windows[0] ? '#9ca3af' : '#7dd3fc';
    ctx.fillRect(roofL/2 - 4, -roofW/2 + 1, 4, roofW - 2);

    // Rear Window
    ctx.fillStyle = v.damage.windows[1] ? '#9ca3af' : '#7dd3fc';
    ctx.fillRect(-roofL/2, -roofW/2 + 1, 4, roofW - 2);
    
    // Headlights (Front Right)
    ctx.fillStyle = '#fef08a';
    ctx.shadowColor = '#fef08a'; ctx.shadowBlur = 8;
    ctx.fillRect(length/2 - 2, -width/2 + 1, 2, 4);
    ctx.fillRect(length/2 - 2, width/2 - 5, 2, 4);
    ctx.shadowBlur = 0;

    // Taillights (Rear Left)
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-length/2, -width/2 + 1, 2, 4);
    ctx.fillRect(-length/2, width/2 - 5, 2, 4);
    
    // Special Models
    if (v.model === 'police') {
        // Lightbar
        const time = Date.now() / 150;
        const blink = Math.floor(time) % 2;
        ctx.fillStyle = blink ? '#2563eb' : '#dc2626';
        ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 10;
        ctx.fillRect(-2, -width/2 + 4, 4, width - 8);
        ctx.shadowBlur = 0;
    }
    
    ctx.restore();
};

const drawCharacter = (ctx: CanvasRenderingContext2D, p: Pedestrian) => {
    ctx.save();
    ctx.translate(p.pos.x, p.pos.y);
    ctx.rotate(p.angle);
    
    const isMoving = p.velocity.x !== 0 || p.velocity.y !== 0;
    const walkCycle = isMoving ? Math.sin(Date.now() / 100) * 5 : 0;
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 8, 0, 0, Math.PI*2);
    ctx.fill();

    // Feet
    ctx.fillStyle = '#1c1917'; // Black shoes
    // Left Foot
    ctx.beginPath();
    ctx.ellipse(3 + walkCycle, -5, 4, 2.5, 0, 0, Math.PI*2);
    ctx.fill();
    // Right Foot
    ctx.beginPath();
    ctx.ellipse(3 - walkCycle, 5, 4, 2.5, 0, 0, Math.PI*2);
    ctx.fill();

    // Shoulders / Torso
    // Rectangle with rounded corners
    ctx.fillStyle = p.color; // Shirt color
    ctx.beginPath();
    ctx.roundRect(-4, -8, 10, 16, 4);
    ctx.fill();

    // Head
    ctx.fillStyle = '#fca5a5'; // Skin tone
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2); 
    ctx.fill();
    
    // Hair
    if (p.role === 'police') {
        // Police Cap
        ctx.fillStyle = '#1e3a8a'; // Dark Blue
        ctx.beginPath();
        ctx.ellipse(-1, 0, 5.5, 5.5, 0, 0, Math.PI*2);
        ctx.fill();
        // Visor
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.ellipse(3, 0, 3, 5, 0, -Math.PI/2, Math.PI/2);
        ctx.fill();
    } else {
        // Civ Hair (Brown/Black/Blonde randomize based on ID hash maybe? using ID length for now)
        const hairColor = p.id.length % 2 === 0 ? '#451a03' : '#000000';
        ctx.fillStyle = hairColor;
        ctx.beginPath();
        ctx.arc(-1, 0, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    // Arms
    ctx.fillStyle = p.color; // Sleeves match shirt
    
    if (p.weapon === 'fist') {
        // Arms swinging if walking
        const armSwing = isMoving ? Math.cos(Date.now() / 100) * 3 : 0;
        
        // Left Arm
        ctx.beginPath(); ctx.ellipse(0 + armSwing, -9, 3, 3, 0, 0, Math.PI*2); ctx.fill();
        // Hand
        ctx.fillStyle = '#fca5a5';
        ctx.beginPath(); ctx.arc(3 + armSwing, -9, 2.5, 0, Math.PI*2); ctx.fill();

        // Right Arm
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.ellipse(0 - armSwing, 9, 3, 3, 0, 0, Math.PI*2); ctx.fill();
        // Hand
        ctx.fillStyle = '#fca5a5';
        ctx.beginPath(); ctx.arc(3 - armSwing, 9, 2.5, 0, Math.PI*2); ctx.fill();
    } else {
        // Weapon Posture (Arms extended)
        // Arms
        ctx.beginPath(); ctx.ellipse(2, -9, 3, 3, 0, 0, Math.PI*2); ctx.fill(); // Left Shoulder
        ctx.beginPath(); ctx.ellipse(2, 9, 3, 3, 0, 0, Math.PI*2); ctx.fill();  // Right Shoulder
        
        // Hands reaching weapon
        ctx.fillStyle = '#fca5a5';
        
        // Drawing weapon
        ctx.save();
        ctx.translate(10, 0); // Weapon offset
        
        if (p.weapon === 'pistol') {
            ctx.fillStyle = '#374151'; // Gun metal
            ctx.fillRect(-2, -1.5, 10, 3); // Barrel
            ctx.fillStyle = '#fca5a5'; // Right Hand
            ctx.beginPath(); ctx.arc(0, 2, 2.5, 0, Math.PI*2); ctx.fill(); 
        } else if (p.weapon === 'uzi') {
            ctx.fillStyle = '#111';
            ctx.fillRect(-2, -2, 12, 4);
            // Two hands
            ctx.fillStyle = '#fca5a5';
            ctx.beginPath(); ctx.arc(0, 3, 2.5, 0, Math.PI*2); ctx.fill(); // Right
            ctx.beginPath(); ctx.arc(6, -2, 2.5, 0, Math.PI*2); ctx.fill(); // Left
        } else if (p.weapon === 'shotgun' || p.weapon === 'sniper' || p.weapon === 'rocket') {
             ctx.fillStyle = '#1f2937';
             const len = p.weapon === 'sniper' ? 24 : 18;
             const width = p.weapon === 'rocket' ? 6 : 3;
             ctx.fillRect(-4, -width/2, len, width);
             // Two hands
             ctx.fillStyle = '#fca5a5';
             ctx.beginPath(); ctx.arc(0, 3, 2.5, 0, Math.PI*2); ctx.fill(); // Right/Trigger
             ctx.beginPath(); ctx.arc(10, -1, 2.5, 0, Math.PI*2); ctx.fill(); // Left/Barrel
        }

        ctx.restore();
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
                    
                    // Street Light Logic
                    if ((x * 7 + y * 13) % 4 === 0) {
                        let rot = -1;
                        if (getTileAt(state.map, px + TILE_SIZE, py) === TileType.ROAD_V) rot = 0;
                        else if (getTileAt(state.map, px - TILE_SIZE, py) === TileType.ROAD_V) rot = Math.PI;
                        else if (getTileAt(state.map, px, py + TILE_SIZE) === TileType.ROAD_H) rot = Math.PI/2;
                        else if (getTileAt(state.map, px, py - TILE_SIZE) === TileType.ROAD_H) rot = 3*Math.PI/2;
                        
                        if (rot !== -1) {
                             renderList.push({
                                 y: py + 99999, // Hack to ensure it draws over everything like a canopy
                                 draw: () => drawStreetLight(ctx, px + TILE_SIZE/2, py + TILE_SIZE/2, rot)
                             });
                        }
                    }

                } else if (tile === TileType.BUILDING || tile === TileType.HOSPITAL || tile === TileType.POLICE_STATION || tile === TileType.SKYSCRAPER || tile === TileType.SHOP) {
                     ctx.fillStyle = '#171717'; // Base plate (Ground level)
                     ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                     renderList.push({
                        y: py + TILE_SIZE, // Sort by bottom of the building BASE
                        draw: () => drawBuilding(ctx, px, py, tile, textures)
                     });
                } else if (tile === TileType.WATER) {
                    ctx.fillStyle = COLORS.water; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    ctx.fillStyle = 'rgba(255,255,255,0.1)';
                    const offset = (Date.now() / 50) % 20;
                    ctx.beginPath(); ctx.arc(px + 20 + offset, py + 20, 5, 0, Math.PI*2); ctx.fill();
                } else if (tile === TileType.ROAD_CROSS) {
                    drawRoad(ctx, px, py, tile, textures);
                    renderList.push({
                         y: py + 99999,
                         draw: () => drawTrafficLight(ctx, px, py)
                    });
                } else {
                    drawRoad(ctx, px, py, tile, textures);
                }
            }
        }
    }
    
    // LAYER 2: DROPS
    state.drops.forEach(d => {
        renderList.push({
            y: d.pos.y,
            draw: () => drawDrop(ctx, d)
        });
    });

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
