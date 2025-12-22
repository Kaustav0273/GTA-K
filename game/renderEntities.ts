
import { Vehicle, Pedestrian, Drop } from '../types';
import { CAR_MODELS } from '../constants';

export const drawDrop = (ctx: CanvasRenderingContext2D, drop: Drop) => {
    ctx.save();
    ctx.translate(drop.pos.x, drop.pos.y);
    const float = Math.sin(Date.now() / 200) * 2;
    ctx.translate(0, float);

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

export const drawVehicle = (ctx: CanvasRenderingContext2D, v: Vehicle) => {
    ctx.save();
    ctx.translate(v.pos.x, v.pos.y);
    ctx.rotate(v.angle);
    
    const length = v.size.y;
    const width = v.size.x;
    const modelData = CAR_MODELS[v.model];
    const maxHealth = (modelData as any)?.health || 100;
    const hpPct = v.health / maxHealth;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(-length/2 + 2, -width/2 + 2, length, width);

    // Wheels
    const drawWheel = (index: number, cx: number, cy: number) => {
        const isPopped = v.damage.tires[index];
        if (isPopped) {
            // Flat tire look: blacker, wider, thinner
            ctx.fillStyle = '#0a0a0a'; 
            ctx.fillRect(cx - 1, cy + 1, 8, 1);
        } else {
            ctx.fillStyle = '#171717';
            ctx.fillRect(cx, cy, 6, 2);
        }
    };
    drawWheel(0, length/2 - 8, -width/2 - 1);
    drawWheel(1, length/2 - 8, width/2 - 1);
    drawWheel(2, -length/2 + 4, -width/2 - 1);
    drawWheel(3, -length/2 + 4, width/2 - 1);

    // Body
    ctx.fillStyle = v.color;
    ctx.beginPath();
    ctx.roundRect(-length/2, -width/2, length, width, 4);
    ctx.fill();

    // Body Damage Overlay (Dents/Scratches)
    if (hpPct < 0.5) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        
        // Random dents based on ID so they stay static
        const hash = v.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        
        // Hood Dent
        if (hash % 2 === 0) {
            ctx.beginPath();
            ctx.moveTo(length/2 - 5, -5);
            ctx.lineTo(length/2 - 15, 0);
            ctx.lineTo(length/2 - 5, 5);
            ctx.fill();
        }
        
        // Side Scrape
        if (hpPct < 0.3) {
             ctx.beginPath();
             ctx.moveTo(0, width/2);
             ctx.lineTo(10, width/2 - 3);
             ctx.lineTo(-10, width/2 - 3);
             ctx.fill();
        }
        
        // Rear Smash
        if (hpPct < 0.2) {
             ctx.beginPath();
             ctx.arc(-length/2 + 2, 0, 6, 0, Math.PI * 2);
             ctx.fill();
        }
    }

    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(-length/2 + 2, -width/4, length - 4, width/2);

    if (v.model !== 'supercar') {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(length/2 - 1, -width/2 + 1, 2, width - 2);
        ctx.fillRect(-length/2 - 1, -width/2 + 1, 2, width - 2);
    }

    if (v.model === 'pickup') {
         ctx.fillStyle = '#0f172a'; 
         ctx.fillRect(-length/2 + 2, -width/2 + 2, length/3, width - 4);
         ctx.fillStyle = '#334155';
         ctx.fillRect(-length/2 + 2, -width/2 + 2, length/3, 2);
         ctx.fillRect(-length/2 + 2, width/2 - 4, length/3, 2);
         ctx.fillRect(-length/2 + 2, -width/2 + 2, 2, width - 4);
    }

    // Roof
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

    ctx.fillStyle = '#1f2937'; 
    if (v.model === 'pickup' || v.model === 'truck') {
         ctx.fillRect(roofOffset - roofL/2 - 1, -roofW/2 - 1, roofL + 2, roofW + 2);
    } else {
         ctx.fillRect(-roofL/2 - 1, -roofW/2 - 1, roofL + 2, roofW + 2);
    }

    // Helper to draw spiderweb crack
    const drawCrack = (cx: number, cy: number, w: number, h: number) => {
         ctx.strokeStyle = 'rgba(255,255,255,0.6)';
         ctx.lineWidth = 0.5;
         ctx.beginPath();
         // Main Cracks
         ctx.moveTo(cx, cy); ctx.lineTo(cx - w/2 + 1, cy - h/2 + 1);
         ctx.moveTo(cx, cy); ctx.lineTo(cx + w/2 - 1, cy + h/2 - 1);
         ctx.moveTo(cx, cy); ctx.lineTo(cx + w/2 - 2, cy - h/2 + 2);
         // Webbing
         ctx.moveTo(cx - 1, cy - 1); ctx.lineTo(cx + 1, cy + 1);
         ctx.stroke();
    };

    const windshieldColor = v.damage.windows[0] ? '#94a3b8' : '#38bdf8'; 
    const rearWindowColor = v.damage.windows[1] ? '#94a3b8' : '#38bdf8';
    
    // Windshield
    ctx.fillStyle = windshieldColor;
    let winX = 0, winY = -roofW/2 + 1, winW = 4, winH = roofW - 2;
    if (v.model === 'truck' || v.model === 'pickup' || v.model === 'van' || v.model === 'ambulance' || v.model === 'swat' || v.model === 'firetruck') {
         winX = roofOffset + roofL/2 - 3; winW = 3;
    } else if (v.model === 'bus') {
         winX = length/2 - 6; winW = 4; winH = width - 4; winY = -width/2 + 2;
    } else {
         winX = roofL/2 - 4;
    }
    ctx.fillRect(winX, winY, winW, winH);
    if (v.damage.windows[0]) drawCrack(winX + winW/2, winY + winH/2, winW, winH);

    // Rear Window
    if (v.model !== 'truck' && v.model !== 'pickup' && v.model !== 'van' && v.model !== 'ambulance' && v.model !== 'swat' && v.model !== 'firetruck' && v.model !== 'bus') {
        ctx.fillStyle = rearWindowColor;
        ctx.fillRect(-roofL/2, -roofW/2 + 1, 3, roofW - 2);
        if (v.damage.windows[1]) drawCrack(-roofL/2 + 1.5, 0, 3, roofW - 2);
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
        ctx.moveTo(mirrorX, -width/2);
        ctx.lineTo(mirrorX + 2, -width/2 - 3);
        ctx.lineTo(mirrorX - 2, -width/2 - 3);
        ctx.fill();
        ctx.moveTo(mirrorX, width/2);
        ctx.lineTo(mirrorX + 2, width/2 + 3);
        ctx.lineTo(mirrorX - 2, width/2 + 3);
        ctx.fill();
    }
    
    ctx.fillStyle = '#fef08a'; 
    if (hpPct < 0.2 && v.damage.windows[0]) ctx.fillStyle = '#713f12'; 
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 6;
    ctx.fillRect(length/2 - 1, -width/2 + 2, 1, 5);
    ctx.fillRect(length/2 - 1, width/2 - 7, 1, 5);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-length/2, -width/2 + 2, 1, 5);
    ctx.fillRect(-length/2, width/2 - 7, 1, 5);
    
    if (v.model === 'supercar') {
        ctx.fillStyle = v.color;
        ctx.fillRect(-length/2 + 2, -width/2, 4, width);
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
    
    ctx.restore();
};

export const drawCharacter = (ctx: CanvasRenderingContext2D, p: Pedestrian) => {
    ctx.save();
    ctx.translate(p.pos.x, p.pos.y);
    ctx.rotate(p.angle);
    
    const isMoving = p.velocity.x !== 0 || p.velocity.y !== 0;
    const walkCycle = isMoving ? Math.sin(Date.now() / 100) * 5 : 0;
    
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 8, 0, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = '#1c1917'; 
    ctx.beginPath(); ctx.ellipse(3 + walkCycle, -5, 4, 2.5, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(3 - walkCycle, 5, 4, 2.5, 0, 0, Math.PI*2); ctx.fill();

    ctx.fillStyle = p.color; 
    ctx.beginPath();
    ctx.roundRect(-4, -8, 10, 16, 4);
    ctx.fill();

    ctx.fillStyle = '#fca5a5'; 
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
    
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
