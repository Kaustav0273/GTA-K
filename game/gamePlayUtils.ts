
import { MutableGameState, Vector2, Pedestrian, EntityType, TileType } from '../types';
import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, PLAYER_SIZE, STAMINA_MAX } from '../constants';
import { getTileAt } from '../utils/gameUtils';

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

    if (!state.drops) state.drops = [];
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
             if (!state.drops) state.drops = [];
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

export const spawnPedestrians = (state: MutableGameState, targetCount: number = 60) => {
    // 1. Count active living pedestrians
    const activePeds = state.pedestrians.filter(p => p.state !== 'dead').length;
    if (activePeds >= targetCount) return;

    // 2. Limit spawns per tick to prevent stutter
    const spawnsThisTick = 3; 
    let spawned = 0;
    let attempts = 0;

    const minR = 800; // Just offscreen for 1920 width approx
    const maxR = 1400;

    while (spawned < spawnsThisTick && attempts < 15) {
        attempts++;
        
        const angle = Math.random() * Math.PI * 2;
        const dist = minR + Math.random() * (maxR - minR);
        
        const x = state.player.pos.x + Math.cos(angle) * dist;
        const y = state.player.pos.y + Math.sin(angle) * dist;

        if (x < 0 || x >= MAP_WIDTH * TILE_SIZE || y < 0 || y >= MAP_HEIGHT * TILE_SIZE) continue;

        const tile = getTileAt(state.map, x, y);
        
        // Spawn Conditions
        // Primarily sidewalks, footpaths. Occasional grass.
        // Also allow military ground for army spawns.
        const isMilitary = tile === TileType.MILITARY_GROUND || tile === TileType.BUNKER || tile === TileType.HELIPAD;
        const isValid = tile === TileType.SIDEWALK || tile === TileType.FOOTPATH || tile === TileType.AIRPORT_TERMINAL || (tile === TileType.GRASS && Math.random() > 0.8) || isMilitary;
        
        if (isValid) {
            // Role Determination based on location
            let role: 'civilian' | 'police' | 'army' = 'civilian';
            let weapon: any = 'fist';
            let health = 100;
            let color = Math.random() > 0.5 ? '#9ca3af' : '#4b5563';

            if (isMilitary) {
                role = 'army';
                color = '#3f6212';
                weapon = 'uzi';
                health = 200;
            } else if (Math.random() < 0.05) { // 5% chance of cop on streets
                role = 'police';
                color = '#1e3a8a';
                weapon = 'pistol';
                health = 150;
            }

            let fear = 0;
            let curiosity = 0;
            let aggression = 0;

            if (role === 'civilian') {
                fear = 0.3 + Math.random() * 0.7; // 0.3 - 1.0
                curiosity = Math.random();
                aggression = Math.random() * 0.3; // Mostly peaceful
            } else if (role === 'police') {
                fear = Math.random() * 0.3;
                curiosity = 0.5;
                aggression = 0.7 + Math.random() * 0.3;
            } else if (role === 'army') {
                fear = 0;
                curiosity = 0.2;
                aggression = 1.0;
            }

            if (!state.pedestrians) state.pedestrians = [];
            state.pedestrians.push({
                id: `npc-${state.timeTicker}-${Math.random()}`,
                type: EntityType.PEDESTRIAN,
                role,
                pos: { x, y },
                size: PLAYER_SIZE,
                angle: Math.random() * Math.PI * 2,
                velocity: { x: 0, y: 0 },
                color,
                health,
                maxHealth: health,
                armor: role === 'civilian' ? 0 : 50,
                stamina: STAMINA_MAX,
                maxStamina: STAMINA_MAX,
                staminaRechargeDelay: 0,
                vehicleId: null,
                weapon,
                state: 'walking',
                actionTimer: Math.random() * 200,
                fear,
                curiosity,
                aggression
            });
            spawned++;
        }
    }
};
