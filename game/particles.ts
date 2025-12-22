
import { MutableGameState } from './gameState';
import { Particle, Vector2 } from '../types';

export const spawnParticle = (
    state: MutableGameState, 
    pos: Vector2, 
    type: Particle['type'], 
    count: number = 1, 
    options?: { color?: string, speed?: number, spread?: number, size?: number, life?: number }
) => {
    if (state.particles.length > 200) {
        state.particles.splice(0, count);
    }
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (options?.speed || 1) * Math.random();
        const spread = options?.spread || 0;
        state.particles.push({
            id: `p-${Date.now()}-${Math.random()}`,
            pos: { 
                x: pos.x + (Math.random() - 0.5) * spread, 
                y: pos.y + (Math.random() - 0.5) * spread 
            },
            velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
            life: options?.life || (Math.random() * 30 + 30),
            maxLife: 60,
            color: options?.color || '#fff',
            size: options?.size || (Math.random() * 3 + 1),
            type
        });
    }
};
