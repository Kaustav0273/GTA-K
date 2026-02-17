
import { MutableGameState, Vector2, Pedestrian } from '../types';

// Helper: Check if police are nearby to witness a crime
export const isPoliceNearby = (state: MutableGameState, pos: Vector2, range: number = 600): boolean => {
    // If wanted level is already high, they are "always" watching via dispatch
    if (state.wantedLevel >= 3) return true;

    for (const p of state.pedestrians) {
        if ((p.role === 'police' || p.role === 'army') && p.state !== 'dead') {
            const dist = Math.sqrt((p.pos.x - pos.x) ** 2 + (p.pos.y - pos.y) ** 2);
            if (dist < range) return true;
        }
    }
    // Also check police vehicles
    for (const v of state.vehicles) {
        if (['police', 'swat', 'tank', 'barracks'].includes(v.model) && v.driverId === 'npc') {
             const dist = Math.sqrt((v.pos.x - pos.x) ** 2 + (v.pos.y - pos.y) ** 2);
             if (dist < range) return true;
        }
    }
    return false;
};

export const spawnDrops = (state: MutableGameState, p: Pedestrian) => {
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

    // Police/Army Weapons
    if (p.role === 'police' || p.role === 'army') {
        const dropWeapon = Math.random();
        if (dropWeapon < 0.4) { 
             state.drops.push({
                id: `d-w-p-${Date.now()}-${Math.random()}`,
                pos: { x: p.pos.x + (Math.random()-0.5)*20, y: p.pos.y + (Math.random()-0.5)*20 },
                type: 'weapon',
                weapon: p.role === 'army' ? 'uzi' : 'pistol',
                life: 1800
            });
        }
    }
};
