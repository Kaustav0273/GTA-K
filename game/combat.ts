
import { MutableGameState } from './gameState';
import { Pedestrian, Bullet, Vector2 } from '../types';
import { WEAPON_STATS, BULLET_SPEED, BULLET_LIFETIME, PANIC_DISTANCE } from '../constants';
import { spawnParticle } from './particles';
import { isPoliceNearby } from './collision';

const spawnDrops = (state: MutableGameState, p: Pedestrian) => {
    // Money Drop Logic with Weighted Probability
    const rand = Math.random();
    let cash = 0;
    
    if (rand < 0.8) {
        // 80% Chance: 1 - 50
        cash = Math.floor(Math.random() * 50) + 1;
    } else if (rand < 0.9) {
        // 10% Chance: 51 - 500
        cash = Math.floor(Math.random() * 450) + 51;
    } else if (rand < 0.98) {
        // 8% Chance: 501 - 2500
        cash = Math.floor(Math.random() * 2000) + 501;
    } else {
        // 2% Chance: 2501 - 5000
        cash = Math.floor(Math.random() * 2500) + 2501;
    }

    state.drops.push({
        id: `d-c-${Date.now()}-${Math.random()}`,
        pos: { x: p.pos.x + (Math.random()-0.5)*10, y: p.pos.y + (Math.random()-0.5)*10 },
        type: 'cash',
        value: cash,
        life: 1800 // 30 seconds
    });

    // Police Weapons
    if (p.role === 'police') {
        if (Math.random() < 0.5) { // 50% chance pistol
             state.drops.push({
                id: `d-w-p-${Date.now()}-${Math.random()}`,
                pos: { x: p.pos.x + (Math.random()-0.5)*20, y: p.pos.y + (Math.random()-0.5)*20 },
                type: 'weapon',
                weapon: 'pistol',
                life: 1800
            });
        }
        if (Math.random() < 0.25) { // 25% chance uzi
             state.drops.push({
                id: `d-w-u-${Date.now()}-${Math.random()}`,
                pos: { x: p.pos.x + (Math.random()-0.5)*20, y: p.pos.y + (Math.random()-0.5)*20 },
                type: 'weapon',
                weapon: 'uzi',
                life: 1800
            });
        }
    }
};

export const createExplosion = (state: MutableGameState, pos: Vector2, radius: number) => {
    spawnParticle(state, pos, 'explosion', 20, { color: '#f59e0b', speed: 4, size: 8 });
    spawnParticle(state, pos, 'smoke', 15, { color: '#4b5563', speed: 2, size: 6 });
    
    // Damage Player
    const pDist = Math.sqrt((state.player.pos.x - pos.x)**2 + (state.player.pos.y - pos.y)**2);
    if (pDist < radius) {
         state.player.health -= 200 * (1 - pDist/radius);
         state.lastDamageTaken = state.timeTicker;
    }

    // Damage Peds
    state.pedestrians.forEach(p => {
         if (p.state === 'dead') return;
         const dist = Math.sqrt((p.pos.x - pos.x)**2 + (p.pos.y - pos.y)**2);
         if (dist < radius) {
             p.health -= 200 * (1 - dist/radius);
             const angle = Math.atan2(p.pos.y - pos.y, p.pos.x - pos.x);
             p.velocity.x += Math.cos(angle) * 10;
             p.velocity.y += Math.sin(angle) * 10;
             
             if (p.health <= 0) {
                 p.state = 'dead';
                 spawnDrops(state, p);
             } else {
                 p.state = 'fleeing';
             }
         }
    });

    // Damage Vehicles
    state.vehicles.forEach(v => {
         const dist = Math.sqrt((v.pos.x - pos.x)**2 + (v.pos.y - pos.y)**2);
         if (dist < radius + 20) {
             v.health -= 100 * (1 - dist/(radius+20));
             v.damage.windows = [true, true];
             v.damage.tires = [true, true, true, true];
             const angle = Math.atan2(v.pos.y - pos.y, v.pos.x - pos.x);
             v.velocity.x += Math.cos(angle) * 5;
             v.velocity.y += Math.sin(angle) * 5;
         }
    });
    
    if (isPoliceNearby(state, pos)) {
        state.wantedLevel = Math.min(state.wantedLevel + 2, 5);
        state.lastWantedTime = state.timeTicker;
    }
};

export const handleCombat = (state: MutableGameState, source: Pedestrian) => {
    const weaponStats = WEAPON_STATS[source.weapon];
    
    if (source.weapon === 'fist') {
         source.state = 'punching';
         source.actionTimer = 15;

         const hitBoxCenter = {
             x: source.pos.x + Math.cos(source.angle) * 20,
             y: source.pos.y + Math.sin(source.angle) * 20
         };
         
         if (source.id !== 'player') {
             const dist = Math.sqrt((state.player.pos.x - hitBoxCenter.x)**2 + (state.player.pos.y - hitBoxCenter.y)**2);
             if (dist < 20) {
                 const damage = source.role === 'police' ? 10 : weaponStats.damage;
                 state.player.health -= damage;
                 state.lastDamageTaken = state.timeTicker;
                 spawnParticle(state, state.player.pos, 'blood', 2, { color: '#7f1d1d', speed: 1.5 });
             }
         }

         state.pedestrians.forEach(p => {
             if (p.id === source.id || p.state === 'dead') return;
             const dist = Math.sqrt((p.pos.x - hitBoxCenter.x)**2 + (p.pos.y - hitBoxCenter.y)**2);
             if (dist < 20) {
                 p.health -= weaponStats.damage;
                 p.velocity.x += Math.cos(source.angle) * 3; 
                 p.velocity.y += Math.sin(source.angle) * 3;
                 
                 spawnParticle(state, p.pos, 'blood', 2, { color: '#7f1d1d', speed: 1.5 });
                 if (p.health <= 0) {
                     p.state = 'dead';
                     spawnDrops(state, p);
                     if (source.id === 'player') {
                         if (isPoliceNearby(state, p.pos)) {
                            state.wantedLevel = Math.min(state.wantedLevel + 1, 5);
                            state.lastWantedTime = state.timeTicker;
                         }
                     }
                 } else {
                     p.state = 'fleeing';
                     p.actionTimer = 180;
                 }
             }
         });
         return;
    }

    const bulletCount = (weaponStats as any).count || 1;
    const speed = (weaponStats as any).bulletSpeed || BULLET_SPEED;
    const spread = (weaponStats as any).spread || 0;
    let type: Bullet['type'] = 'standard';
    let explosionRadius = 0;
    
    if (source.weapon === 'rocket') {
        type = 'rocket';
        explosionRadius = (weaponStats as any).explosionRadius || 80;
    } else if (source.weapon === 'flame') {
        type = 'fire';
    }

    const damage = source.role === 'police' ? 10 : weaponStats.damage;

    for (let i=0; i < bulletCount; i++) {
        const spreadAngle = (Math.random() - 0.5) * spread;
        const finalAngle = source.angle + spreadAngle;

        const startX = source.pos.x + Math.cos(source.angle) * 20;
        const startY = source.pos.y + Math.sin(source.angle) * 20;
        
        state.bullets.push({
            id: `b-${Date.now()}-${i}-${Math.random()}`,
            pos: { x: startX, y: startY },
            velocity: {
                x: Math.cos(finalAngle) * speed,
                y: Math.sin(finalAngle) * speed
            },
            ownerId: source.id,
            damage: damage,
            timeLeft: type === 'fire' ? 20 : BULLET_LIFETIME,
            type: type,
            explosionRadius: explosionRadius
        });
    }
    
    if (source.weapon !== 'flame') {
        spawnParticle(state, source.pos, 'muzzle', 3, { color: '#fff', speed: 0.5, spread: 2 });
    }
    
    if (source.id === 'player' && source.weapon !== 'flame') {
         if (isPoliceNearby(state, source.pos)) {
            state.wantedLevel = Math.min(state.wantedLevel + 1, 5);
            state.lastWantedTime = state.timeTicker;
         }
    }
    
    state.pedestrians.forEach(p => {
        if (p.state === 'dead' || p.role === 'police') return;
        const dist = Math.sqrt((p.pos.x - source.pos.x)**2 + (p.pos.y - source.pos.y)**2);
        if (dist < PANIC_DISTANCE) {
            p.state = 'fleeing';
            p.actionTimer = 180;
        }
    });
};

// Also export spawnDrops so physics.ts logic can use it if needed (though mostly handled in combat now)
export { spawnDrops }; 
