
import { Vehicle, Pedestrian, Drop } from '../types';
import { CAR_MODELS, WEAPON_STATS } from '../constants';
import { SHADOW_COLOR, SHADOW_OFFSET_X, SHADOW_OFFSET_Y, drawRoundRectPath } from './renderUtils';

export const drawDrop = (ctx: CanvasRenderingContext2D, drop: Drop) => {
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
        const wClass = drop.weapon ? WEAPON_STATS[drop.weapon].class : 'pistol';
        if (wClass === 'pistol') {
            ctx.fillStyle = '#9ca3af';
            ctx.beginPath(); 
            ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.lineTo(5, -2); ctx.lineTo(-2, -2); ctx.lineTo(-2, -4); ctx.lineTo(-5, -4); 
            ctx.fill();
        } else if (wClass === 'smg' || wClass === 'shotgun') {
            ctx.fillStyle = '#4b5563';
            ctx.beginPath();
            ctx.rect(-6, -2, 12, 4); ctx.fill(); 
            ctx.rect(-2, 2, 2, 3); ctx.fill();
        }
    }
    ctx.restore();
};

export const drawVehicle = (ctx: CanvasRenderingContext2D, v: Vehicle) => {
    const length = v.size.y;
    const width = v.size.x;
    const isBike = ['bike', 'scooter', 'dirtbike', 'superbike'].includes(v.model);
    
    let zHeight = 0;
    if ((v.model === 'plane' || v.model === 'jet') && Math.abs(v.speed) > 15) {
        zHeight = (Math.abs(v.speed) - 15) * 4;
    }
    // Draw Shadow
    ctx.save();
    const shadowDist = 15 + zHeight;
    const shadowWorldX = v.pos.x + shadowDist * SHADOW_OFFSET_X;
    const shadowWorldY = v.pos.y + shadowDist * SHADOW_OFFSET_Y;
    ctx.translate(shadowWorldX, shadowWorldY); ctx.rotate(v.angle); ctx.fillStyle = SHADOW_COLOR;
    ctx.beginPath();
    if (v.model === 'plane' || v.model === 'jet') { 
        drawRoundRectPath(ctx, -length/2, -width/6, length, width/3, 6); ctx.fill();
        ctx.fillRect(-length/6, -width/2, length/3, width); ctx.fillRect(-length/2, -width/4, length/6, width/2); 
    } 
    else if (v.model === 'tank') { ctx.fillRect(-length/2, -width/2, length, width); ctx.beginPath(); ctx.arc(0, 0, width/2, 0, Math.PI*2); ctx.fill(); ctx.fillRect(0, -2, length*0.8, 4); }
    else if (isBike) { 
        if (v.model === 'bike' || v.model === 'dirtbike') {
             drawRoundRectPath(ctx, -length/2, -width/3, length, width*0.66, 4); 
        } else {
             drawRoundRectPath(ctx, -length/2, -width/2, length, width, 4);
        }
        ctx.fill(); 
    }
    else { drawRoundRectPath(ctx, -length/2, -width/2, length, width, 6); ctx.fill(); }
    ctx.fill(); ctx.restore();

    ctx.save();
    ctx.translate(v.pos.x, v.pos.y); ctx.rotate(v.angle);
    if (zHeight > 0) { const scale = 1 + (zHeight / 200); ctx.scale(scale, scale); }
    const modelData = CAR_MODELS[v.model];
    const maxHealth = (modelData as any)?.health || 100;
    const hpPct = v.health / maxHealth;

    // TANK RENDERING
    if (v.model === 'tank') {
        // Treads
        ctx.fillStyle = '#171717';
        ctx.fillRect(-length/2, -width/2, length, width/4);
        ctx.fillRect(-length/2, width/4, length, width/4);
        // Body
        ctx.fillStyle = v.color;
        ctx.fillRect(-length/2 + 2, -width/4, length - 4, width/2);
        // Turret Base
        ctx.fillStyle = '#2f3e26'; // Darker camo
        ctx.beginPath(); ctx.arc(-5, 0, width/3, 0, Math.PI*2); ctx.fill();
        // Barrel
        // For simplicity, lock turret to front unless shooting.
        ctx.fillStyle = '#2f3e26';
        ctx.fillRect(0, -3, length * 0.6, 6);
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(length * 0.6, 0, 3, 0, Math.PI*2); ctx.fill();
        // Hatch
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-5, -5, 4, 0, Math.PI*2); ctx.fill();
    }
    else if (v.model === 'barracks') {
        // Military Truck (Open Back)
        ctx.fillStyle = v.color;
        ctx.fillRect(-length/2, -width/2, length, width);
        // Cab
        ctx.fillStyle = '#3f4f3a';
        ctx.fillRect(length/4, -width/2, length/4, width);
        // Windshield
        ctx.fillStyle = v.damage.windows[0] ? '#e5e7eb' : '#38bdf8';
        ctx.fillRect(length/2 - 6, -width/2 + 2, 4, width - 4);
        // Canvas Cover (Back)
        ctx.fillStyle = '#5d7554'; // Canvas Green
        ctx.fillRect(-length/2 + 2, -width/2 + 2, length * 0.7, width - 4);
        // Ribs
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        for(let i=0; i<length*0.7; i+=8) ctx.fillRect(-length/2 + 2 + i, -width/2 + 2, 2, width - 4);
    }
    else if (v.model === 'plane' || v.model === 'jet') {
        const isJet = v.model === 'jet';
        const fuselageW = width / 3;
        ctx.fillStyle = v.color;
        ctx.beginPath();
        if (isJet) {
            ctx.moveTo(length/6, -fuselageW/2); ctx.lineTo(-length/2, -width/2); ctx.lineTo(-length/6, -fuselageW/2);
            ctx.lineTo(-length/6, fuselageW/2); ctx.lineTo(-length/2, width/2); ctx.lineTo(length/6, fuselageW/2);
        } else {
            drawRoundRectPath(ctx, -length/6, -width/2, length/3, width, 2);
        }
        ctx.fill();
        ctx.fillStyle = isJet ? '#94a3b8' : '#ffffff';
        ctx.beginPath(); drawRoundRectPath(ctx, -length/2, -fuselageW/2, length, fuselageW, 10); ctx.fill();
        ctx.fillStyle = '#0ea5e9'; 
        ctx.beginPath(); drawRoundRectPath(ctx, length/4, -fuselageW/3, length/5, fuselageW/1.5, 3); ctx.fill();
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
    } 
    else if (isBike) {
        const isScooter = v.model === 'scooter';
        const isDirt = v.model === 'dirtbike';
        const isSuper = v.model === 'superbike';
        const isBicycle = v.model === 'bike';

        // Tire settings
        const tireColor = '#171717';
        let fWheelL = 8, fWheelW = 2; // Default (Bicycle)
        let rWheelL = 8, rWheelW = 2;
        
        if (isScooter) { fWheelL = 6; fWheelW = 3; rWheelL = 6; rWheelW = 3; }
        if (isDirt) { fWheelL = 9; fWheelW = 3; rWheelL = 9; rWheelW = 4; }
        if (isSuper) { fWheelL = 8; fWheelW = 4; rWheelL = 9; rWheelW = 5; }

        // Draw Tires
        ctx.fillStyle = tireColor;
        // Front
        ctx.fillRect(length/2 - fWheelL, -fWheelW/2, fWheelL, fWheelW);
        // Rear
        ctx.fillRect(-length/2, -rWheelW/2, rWheelL, rWheelW);

        // Body Specifics
        ctx.fillStyle = v.color;

        if (isBicycle) {
            // Frame (Diamond)
            ctx.strokeStyle = v.color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-length/2 + 4, 0); ctx.lineTo(-length/4, 0); // Rear fork
            ctx.lineTo(0, 0); // Seat tube base
            ctx.lineTo(length/3, 0); // Down tube
            ctx.stroke();
            
            // Handlebar
            ctx.fillStyle = '#9ca3af';
            ctx.fillRect(length/3 - 1, -5, 2, 10);
            
            // Seat
            ctx.fillStyle = '#111';
            ctx.beginPath(); ctx.ellipse(-length/4, 0, 3, 2, 0, 0, Math.PI*2); ctx.fill();
        } 
        else if (isScooter) {
            // Body (Rear)
            ctx.fillRect(-length/2 + 2, -width/2 + 2, length/3, width - 4);
            // Floorboard (Darker)
            ctx.fillStyle = '#333';
            ctx.fillRect(-length/6, -width/3, length/2, width*0.66);
            // Front Shield
            ctx.fillStyle = v.color;
            ctx.beginPath();
            ctx.arc(length/2 - 6, 0, width/2 - 1, -Math.PI/2, Math.PI/2);
            ctx.fill();
            // Seat
            ctx.fillStyle = '#a16207'; // Tan/Leather
            ctx.fillRect(-length/2 + 4, -width/3, 8, width*0.66);
            // Handlebar
            ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(length/2 - 6, -width/2 + 2); ctx.lineTo(length/2 - 6, width/2 - 2); ctx.stroke();
        }
        else if (isDirt) {
            // Rear Fender (Pointy)
            ctx.beginPath();
            ctx.moveTo(-length/2 - 4, 0); ctx.lineTo(-length/3, -width/3); ctx.lineTo(-length/3, width/3);
            ctx.fill();
            // Tank / Body
            ctx.fillRect(-length/4, -width/4, length/2, width/2);
            // Front Fender
            ctx.beginPath();
            ctx.moveTo(length/2 + 4, 0); ctx.lineTo(length/3, -width/4); ctx.lineTo(length/3, width/4);
            ctx.fill();
            // Seat
            ctx.fillStyle = '#111';
            ctx.fillRect(-length/3, -width/4 + 1, 14, width/2 - 2);
            // Handlebars
            ctx.strokeStyle = '#d4d4d8'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(length/3, -width/2 - 2); ctx.lineTo(length/3, width/2 + 2); ctx.stroke();
        }
        else if (isSuper) {
            // Full Fairing Body (Teardrop)
            ctx.beginPath();
            ctx.moveTo(length/2 + 4, 0); // Nose
            ctx.bezierCurveTo(length/3, -width/2 - 2, -length/3, -width/2, -length/2 + 4, 0); // Top Side
            ctx.bezierCurveTo(-length/3, width/2, length/3, width/2 + 2, length/2 + 4, 0); // Bottom Side
            ctx.fill();
            
            // Windshield
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath(); ctx.arc(length/2 - 4, 0, 4, -Math.PI/2, Math.PI/2); ctx.fill();
            
            // Seat
            ctx.fillStyle = '#111';
            ctx.fillRect(-length/3, -width/3, 10, width * 0.66);
            
            // Exhaust
            ctx.fillStyle = '#9ca3af';
            ctx.fillRect(-length/2 + 2, width/2, 6, 2);
        }

        // Headlight
        if (!isBicycle) {
            ctx.fillStyle = '#fef08a';
            ctx.shadowColor = '#fef08a'; ctx.shadowBlur = 5;
            ctx.beginPath(); ctx.arc(length/2 - (isDirt ? 4 : 2), 0, 2, 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Taillight
        if (!isBicycle) {
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(-length/2 + (isDirt ? -2 : 0), -1.5, 2, 3);
        }

        // Driver Rendering
        if (v.driverId) {
             const isPlayer = v.driverId === 'player';
             
             // Determine Handlebar Position based on bike type
             let handleX = length/3;
             if (isSuper) handleX = length/3 - 2;
             if (isScooter) handleX = length/2 - 6;
             
             // Body
             ctx.fillStyle = isPlayer ? '#fff' : '#1f2937';
             // Leaned forward for Superbike/Dirtbike
             const bodyX = (isSuper || isDirt) ? -2 : -4;
             ctx.beginPath(); ctx.ellipse(bodyX, 0, 5, 6, 0, 0, Math.PI*2); ctx.fill();
             
             // Head/Helmet
             if (isPlayer) {
                 ctx.fillStyle = '#fca5a5'; ctx.beginPath(); ctx.arc(bodyX, 0, 3.5, 0, Math.PI*2); ctx.fill();
                 ctx.fillStyle = '#451a03'; ctx.beginPath(); ctx.arc(bodyX-1, 0, 3.5, 0, Math.PI*2); ctx.fill();
             } else {
                 ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(bodyX, 0, 4, 0, Math.PI*2); ctx.fill(); // Helmet
                 ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(bodyX+1, 0, 2, 0, Math.PI*2); ctx.fill(); // Visor
             }
             
             // Arms
             ctx.strokeStyle = isPlayer ? '#fca5a5' : '#1f2937'; 
             ctx.lineWidth = 1.5;
             ctx.beginPath();
             ctx.moveTo(bodyX, -3); ctx.lineTo(handleX, -width/2 + (isBicycle ? 4 : 0));
             ctx.moveTo(bodyX, 3); ctx.lineTo(handleX, width/2 - (isBicycle ? 4 : 0));
             ctx.stroke();
        }
    }
    else {
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

        if (v.damage.windows[0]) {
            ctx.strokeStyle = 'rgba(255,255,255,0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            let wsX = 0;
            if (v.model === 'truck' || v.model === 'pickup' || v.model === 'van' || v.model === 'ambulance' || v.model === 'swat' || v.model === 'firetruck') wsX = roofOffset + roofL/2 - 2;
            else if (v.model === 'bus') wsX = length/2 - 4 - maxFrontDef;
            else wsX = roofL/2 - 2;
            
            ctx.moveTo(wsX, -roofW/4); ctx.lineTo(wsX + 2, 0); ctx.lineTo(wsX, roofW/4);
            ctx.stroke();
        }

        if (v.model !== 'truck' && v.model !== 'pickup' && v.model !== 'van' && v.model !== 'ambulance' && v.model !== 'swat' && v.model !== 'firetruck' && v.model !== 'bus') {
            ctx.fillStyle = rearWindowColor; ctx.fillRect(-roofL/2, -roofW/2 + 1, 3, roofW - 2);
            if (v.damage.windows[1]) {
                ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; ctx.beginPath();
                ctx.moveTo(-roofL/2 + 1, -roofW/4); ctx.lineTo(-roofL/2 + 3, 0); ctx.lineTo(-roofL/2 + 1, roofW/4);
                ctx.stroke();
            }
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

export const drawCharacter = (ctx: CanvasRenderingContext2D, p: Pedestrian) => {
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
    ctx.fillStyle = p.color; ctx.beginPath(); drawRoundRectPath(ctx, -4, -8, 10, 16, 4); ctx.fill();
    ctx.fillStyle = '#fca5a5'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
    if (p.role === 'police') { ctx.fillStyle = '#1e3a8a'; ctx.beginPath(); ctx.ellipse(-1, 0, 5.5, 5.5, 0, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(3, 0, 3, 5, 0, -Math.PI/2, Math.PI/2); ctx.fill(); } 
    else if (p.role === 'army') { ctx.fillStyle = '#3f6212'; ctx.beginPath(); ctx.ellipse(-1, 0, 5.5, 5.5, 0, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#2f3e26'; ctx.beginPath(); ctx.ellipse(3, 0, 3, 5, 0, -Math.PI/2, Math.PI/2); ctx.fill(); }
    else { const hairColor = p.id.length % 2 === 0 ? '#451a03' : '#000000'; ctx.fillStyle = hairColor; ctx.beginPath(); ctx.arc(-1, 0, 5, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = p.color; 
    
    const wClass = WEAPON_STATS[p.weapon].class;

    if (wClass === 'melee') {
        const armSwing = isMoving ? Math.cos(Date.now() / 100) * 3 : 0;
        ctx.beginPath(); ctx.ellipse(0 + armSwing, -9, 3, 3, 0, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#fca5a5'; ctx.beginPath(); ctx.arc(3 + armSwing, -9, 2.5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.ellipse(0 - armSwing, 9, 3, 3, 0, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#fca5a5'; ctx.beginPath(); ctx.arc(3 - armSwing, 9, 2.5, 0, Math.PI*2); ctx.fill();
    } else {
        ctx.beginPath(); ctx.ellipse(2, -9, 3, 3, 0, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.ellipse(2, 9, 3, 3, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fca5a5'; ctx.save(); ctx.translate(10, 0); 
        
        if (wClass === 'pistol') { 
            ctx.fillStyle = '#374151'; ctx.fillRect(-2, -1.5, 10, 3); 
            ctx.fillStyle = '#fca5a5'; ctx.beginPath(); ctx.arc(0, 2, 2.5, 0, Math.PI*2); ctx.fill(); 
        } 
        else if (wClass === 'smg') { 
            ctx.fillStyle = '#111'; ctx.fillRect(-2, -2, 12, 4); 
            ctx.fillStyle = '#fca5a5'; ctx.beginPath(); ctx.arc(0, 3, 2.5, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(6, -2, 2.5, 0, Math.PI*2); ctx.fill(); 
        } 
        else if (wClass === 'shotgun' || wClass === 'sniper' || wClass === 'rocket' || wClass === 'flame') { 
            ctx.fillStyle = '#1f2937'; 
            const len = wClass === 'sniper' ? 24 : 18; 
            const width = wClass === 'rocket' ? 6 : 3; 
            ctx.fillRect(-4, -width/2, len, width); 
            ctx.fillStyle = '#fca5a5'; ctx.beginPath(); ctx.arc(0, 3, 2.5, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(10, -1, 2.5, 0, Math.PI*2); ctx.fill(); 
        }
        ctx.restore();
    }
    ctx.restore();
};
