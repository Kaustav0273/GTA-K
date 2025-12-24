
import React, { useRef, useEffect } from 'react';

interface Particle {
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    char: string;
    color: string;
    size: number;
}

const SplashScreen: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set dimensions
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles: Particle[] = [];
        const gap = 5; // Resolution of sampling (lower = more particles)
        const chars = "KAUSTAVGAMES0123456789XYZ";
        
        // 1. Create Offscreen Canvas to render the target text
        const offCanvas = document.createElement('canvas');
        offCanvas.width = canvas.width;
        offCanvas.height = canvas.height;
        const offCtx = offCanvas.getContext('2d');
        if (!offCtx) return;

        // 2. Draw Target Text
        // Responsive font size
        const fontSizeK = Math.min(canvas.width / 6, 120); 
        const fontSizeG = fontSizeK * 0.6;

        offCtx.textAlign = 'center';
        offCtx.textBaseline = 'middle';
        
        // Draw "KAUSTAV" (Top)
        offCtx.fillStyle = '#ffffff';
        offCtx.font = `900 ${fontSizeK}px "Arial Black", sans-serif`;
        offCtx.fillText("KAUSTAV", canvas.width / 2, canvas.height / 2 - fontSizeK * 0.5);
        
        // Draw "GAMES" (Bottom)
        offCtx.fillStyle = '#eab308'; // Yellow-500
        offCtx.font = `900 ${fontSizeG}px "Arial Black", sans-serif`;
        offCtx.fillText("GAMES", canvas.width / 2, canvas.height / 2 + fontSizeK * 0.6);

        // 3. Sample pixels to create particles
        const imageData = offCtx.getImageData(0, 0, canvas.width, canvas.height).data;
        
        for (let y = 0; y < canvas.height; y += gap) {
            for (let x = 0; x < canvas.width; x += gap) {
                const index = (y * canvas.width + x) * 4;
                const alpha = imageData[index + 3];
                const red = imageData[index];
                
                if (alpha > 128) {
                    const char = chars[Math.floor(Math.random() * chars.length)];
                    // Random starting positions scattered all over the screen
                    const startX = Math.random() * canvas.width;
                    const startY = Math.random() * canvas.height;
                    
                    particles.push({
                        x: startX,
                        y: startY,
                        targetX: x,
                        targetY: y,
                        char: char,
                        color: red > 200 ? '#eab308' : '#ffffff', // Detect color from offscreen render
                        size: Math.random() * 6 + 6 // Random size 6-12px
                    });
                }
            }
        }

        let frame = 0;
        let animationFrameId: number;

        // 4. Animation Loop
        const render = () => {
            frame++;
            
            // Clear screen
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw Particles
            ctx.font = 'bold 10px monospace';
            
            particles.forEach(p => {
                // Delay start of assembly slightly
                if (frame > 60) {
                    const dx = p.targetX - p.x;
                    const dy = p.targetY - p.y;
                    // Ease function
                    p.x += dx * 0.08;
                    p.y += dy * 0.08;
                } else {
                    // Drift randomly before assembling
                    p.x += (Math.random() - 0.5) * 2;
                    p.y += (Math.random() - 0.5) * 2;
                }

                ctx.fillStyle = p.color;
                // Once assembled, maybe draw squares or actual small letters? 
                // The prompt says "letters arranged themselves"
                ctx.fillText(p.char, p.x, p.y);
            });

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas 
            ref={canvasRef} 
            className="fixed inset-0 z-[100] bg-black touch-none"
        />
    );
};

export default SplashScreen;
