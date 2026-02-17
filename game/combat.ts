
import { MutableGameState, Vector2, Pedestrian, Bullet } from '../types';
import { WEAPON_STATS, BULLET_SPEED, BULLET_LIFETIME, PANIC_DISTANCE } from '../constants';
import { audioManager } from '../services/audioService';
import { spawnParticle } from './particles';
import { isPoliceNearby, spawnDrops } from './gamePlayUtils';

export const createExplosion = (state: MutableGameState, pos: Vector2, radius: number) => {
    spawnParticle(state, pos, 'explosion', 20, { color: '#f59e0b', speed: 4, size: 8 });
    spawnParticle(state, pos, 'smoke', 15, { color: '#4b5563', speed: 2, size: 6 });
    audioManager.playExplosion();
    
    // Damage Player?
    if (!state.cheats.godMode) {
        const pDist = Math.sqrt((state.player.pos.x - pos.x)**2 + (state.player.pos.y - pos.y)**2);
        if (pDist < radius) {
             state.player.health -= 200 * (1 - pDist/radius);
             state.lastDamageTaken = state.timeTicker;
        }
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
             // God Mode Vehicle check
             if (state.cheats.vehicleGodMode && v.driverId === 'player') return;

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
    const wClass = weaponStats.class;
    
    audioManager.playShoot(source.weapon);

    // Cheat: One Hit Kill
    const isOneHitKill = (source.id === 'player' && state.cheats.oneHitKill);

    if (wClass === 'melee') {
         source.state = 'punching';
         source.actionTimer = 15;

         const hitBoxCenter = {
             x: source.pos.x + Math.cos(source.angle) * 20,
             y: source.pos.y + Math.sin(source.angle) * 20
         };
         
         if (source.id !== 'player') {
             // Enemy punching player
             if (!state.cheats.godMode) {
                 const dist = Math.sqrt((state.player.pos.x - hitBoxCenter.x)**2 + (state.player.pos.y - hitBoxCenter.y)**2);
                 if (dist < 20) {
                     const damage = (source.role === 'police' || source.role === 'army') ? 10 : weaponStats.damage;
                     state.player.health -= damage;
                     state.lastDamageTaken = state.timeTicker;
                     spawnParticle(state, state.player.pos, 'blood', 2, { color: '#7f1d1d', speed: 1.5 });
                     audioManager.playPedHit();
                 }
             }
         }

         state.pedestrians.forEach(p => {
             if (p.id === source.id || p.state === 'dead') return;
             const dist = Math.sqrt((p.pos.x - hitBoxCenter.x)**2 + (p.pos.y - hitBoxCenter.y)**2);
             if (dist < 20) {
                 const damage = isOneHitKill ? 9999 : weaponStats.damage;
                 p.health -= damage;
                 p.velocity.x += Math.cos(source.angle) * 3; 
                 p.velocity.y += Math.sin(source.angle) * 3;
                 
                 spawnParticle(state, p.pos, 'blood', 2, { color: '#7f1d1d', speed: 1.5 });
                 audioManager.playPedHit();
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
    
    if (wClass === 'rocket') {
        type = 'rocket';
        explosionRadius = (weaponStats as any).explosionRadius || 80;
    } else if (wClass === 'flame') {
        type = 'fire';
    }

    let damage = (source.role === 'police' || source.role === 'army') ? 10 : weaponStats.damage;
    if (isOneHitKill) damage = 9999;

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
    
    if (wClass !== 'flame') {
        spawnParticle(state, source.pos, 'muzzle', 3, { color: '#fff', speed: 0.5, spread: 2 });
    }
    
    if (source.id === 'player' && wClass !== 'flame') {
         if (isPoliceNearby(state, source.pos)) {
            state.wantedLevel = Math.min(state.wantedLevel + 1, 5);
            state.lastWantedTime = state.timeTicker;
         }
    }
    
    state.pedestrians.forEach(p => {
        if (p.state === 'dead' || p.role === 'police' || p.role === 'army') return;
        const dist = Math.sqrt((p.pos.x - source.pos.x)**2 + (p.pos.y - source.pos.y)**2);
        if (dist < PANIC_DISTANCE) {
            p.state = 'fleeing';
            p.actionTimer = 180;
        }
    });
};
