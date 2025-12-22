
import { TileType } from '../types';

export const getBuildingHeight = (tileType: TileType, px: number, py: number): number => {
    const seed = px * 13 + py * 7;
    if (tileType === TileType.SKYSCRAPER) {
        return 100 + (seed % 60);
    } else if (tileType === TileType.SHOP) {
        return 35 + (seed % 15);
    } else if (tileType === TileType.BUILDING) {
        return 40 + (seed % 20);
    } else if (tileType === TileType.HOSPITAL) {
        return 70;
    } else if (tileType === TileType.POLICE_STATION) {
        return 70;
    } else if (tileType === TileType.CONTAINER) {
        return 25 + (seed % 2) * 25; 
    }
    return 50;
};

export const drawLightGlow = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) => {
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
};
