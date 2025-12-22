
import { TileType } from '../types';
import { TILE_SIZE } from '../constants';
import { getBuildingHeight } from './renderHelpers';

export const drawBuilding = (ctx: CanvasRenderingContext2D, x: number, y: number, tileType: TileType, textures: any, opacity: number = 1) => {
    ctx.save();
    if (opacity < 1) ctx.globalAlpha = opacity;

    const w = TILE_SIZE;
    const seed = x * 13 + y * 7;
    const centerX = x + w/2;
    const centerY = y + w/2; 

    const height = getBuildingHeight(tileType, x, y);
    
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
    }
    
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x - 2, y - 2, w + 4, w + 4);

    const wallGrad = ctx.createLinearGradient(x, y + w - height, x, y + w);
    wallGrad.addColorStop(0, roofColor); 
    wallGrad.addColorStop(1, '#000');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(x, y + w - height, w, height);

    const stories = Math.floor(height / 15);
    const cols = Math.floor(w / 12);
    ctx.fillStyle = windowColor;
    
    if (tileType === TileType.CONTAINER) {
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        for(let i=0; i<w; i+=4) {
            ctx.fillRect(x + i, y + w - height, 2, height);
        }
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = 'bold 8px monospace';
        ctx.fillText((seed % 1000).toString(), x + 4, y + w - height/2);
    } else if (tileType === TileType.SKYSCRAPER) {
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        for(let c=0; c<cols; c++) {
            ctx.fillRect(x + 4 + c * 10, y + w - height, 6, height - 2);
        }
    } else {
        for (let s=0; s < stories; s++) {
             for (let c=0; c < cols; c++) {
                 if ((x + y + s + c) % 7 !== 0) { 
                    const wy = y + w - height + 5 + s * 14; 
                    const wx = x + 4 + c * 10;
                    if (wx + 6 < x + w && wy + 8 < y + w) ctx.fillRect(wx, wy, 6, 8);
                 }
             }
        }
    }

    const roofY = y - height;
    ctx.fillStyle = roofColor;
    if (tileType === TileType.BUILDING && textures['roof']) ctx.fillStyle = textures['roof'];
    ctx.fillRect(x, roofY, w, w);
    
    ctx.strokeStyle = '#171717';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, roofY, w, w);

    if (tileType === TileType.CONTAINER) {
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        for(let i=0; i<w; i+=4) {
            ctx.fillRect(x + i, roofY, 2, w);
        }
        if (height > 30) {
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath(); ctx.moveTo(x, y + w - height/2); ctx.lineTo(x+w, y + w - height/2); ctx.stroke();
        }
    }

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
        const awningColor = (seed % 2 === 0) ? '#ef4444' : '#22c55e';
        const awningY = y + w - 50; 
        
        ctx.fillStyle = awningColor;
        for(let i=0; i<w; i+=8) {
            ctx.fillStyle = (i/8)%2===0 ? awningColor : '#e5e7eb';
            ctx.fillRect(x + i, awningY, 8, 12);
        }
        
        ctx.fillStyle = '#262626';
        ctx.fillRect(x + 10, roofY + 10, w - 20, w - 20);
    } else if (tileType === TileType.SKYSCRAPER) {
        if (seed % 5 === 0) {
           ctx.fillStyle = '#222';
           ctx.beginPath(); ctx.arc(centerX, roofCY, 18, 0, Math.PI*2); ctx.fill();
           ctx.strokeStyle = '#eab308'; ctx.lineWidth = 2;
           ctx.beginPath(); ctx.arc(centerX, roofCY, 14, 0, Math.PI*2); ctx.stroke();
           ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = '#eab308'; ctx.textAlign = 'center'; ctx.fillText('H', centerX, roofCY+4);
        } else {
           ctx.strokeStyle = '#525252'; ctx.lineWidth = 2;
           ctx.beginPath(); ctx.moveTo(centerX, roofCY); ctx.lineTo(centerX, roofCY - 15); ctx.stroke();
           ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(centerX, roofCY - 15, 2, 0, Math.PI*2); ctx.fill(); 
        }
    } else if (tileType !== TileType.CONTAINER) {
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
    
    ctx.restore();
};
