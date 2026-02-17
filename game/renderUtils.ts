
// --- SHADOW CONSTANTS ---
// Sun Direction: Top-Left to Bottom-Right
export const SHADOW_OFFSET_X = 0.5; 
export const SHADOW_OFFSET_Y = 0.5; 
export const SHADOW_COLOR = 'rgba(0, 0, 0, 0.35)'; // Slightly more transparent for realism

// Helper to draw light glow
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
}

// Polyfill helper for roundRect
export const drawRoundRectPath = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    // Explicitly cast to any to avoid TypeScript errors if the method is missing in the interface definition
    if (typeof (ctx as any).roundRect === 'function') {
        (ctx as any).roundRect(x, y, w, h, r);
    } else {
        ctx.rect(x, y, w, h);
    }
};
