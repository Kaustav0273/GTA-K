
import { 
    Vehicle, Pedestrian, Bullet, Particle, Vector2, TileType, EntityType, Drop, Cheats 
} from '../types';
import { 
    TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, PLAYER_SIZE, CAR_SIZE, CAR_MODELS, 
    ACCELERATION_WALK, MAX_SPEED_WALK, MAX_SPEED_SPRINT, BULLET_SPEED, BULLET_LIFETIME, 
    PEDESTRIAN_SPEED, PEDESTRIAN_RUN_SPEED, PANIC_DISTANCE, PHYSICS, WEAPON_STATS,
    STAMINA_REGEN_DELAY, STAMINA_REGEN_RATE, CAR_COLORS
} from '../constants';
import { isSolid, getTileAt } from '../utils/gameUtils';

export interface MutableGameState {
    player: Pedestrian;
    vehicles: Vehicle[];
    pedestrians: Pedestrian[];
    bullets: Bullet[];
    particles: Particle[];
    drops: Drop[];
    map: number[][];
    camera: Vector2;
    money: number;
    wantedLevel: number;
    timeOfDay: number;
    lastShotTime: number;
    timeTicker: number;
    hospitalPos: Vector2;
    isWeaponWheelOpen: boolean;
    activeShop: 'none' | 'main';
    lastDamageTaken: number; // Timestamp for health regen
    lastWantedTime: number; // Timestamp for wanted level decay
    isWasted: boolean;
    wastedStartTime: number;
    cheats: Cheats;
}

// Get Corners of the vehicle OBB
// Returns corners in order: [FrontLeft, FrontRight, RearLeft, RearRight]
const getVehicleCorners = (v: Vehicle, posOverride?: Vector2) => {
    const pos = posOverride || v.pos;
    const cos = Math.cos(v.angle);
    const sin = Math.sin(v.angle);
    const hl = v.size.y / 2; // Half Length
    const hw = v.size.x / 2; // Half Width

    // Helper to rotate and translate
    const t = (lx: number, ly: number) => ({
        x: pos.x + (lx * cos - ly * sin),
        y: pos.y + (lx * sin + ly * cos)
    });

    // 0: FL (+X, -Y), 1: FR (+X, +Y), 2: RL (-X, -Y), 3: RR (-X, +Y)
    return [
        t(hl, -hw), // Front Left
        t(hl, hw),  // Front Right
        t(-hl, -hw),// Rear Left
        t(-hl, hw)  // Rear Right
    ];
};

// Check if any corner of the vehicle is inside a solid tile
// Returns array of indices of colliding corners
const checkMapCollisionDetails = (v: Vehicle, map: number[][], nextPos: Vector2): number[] => {
    const corners = getVehicleCorners(v, nextPos);
    const hits: number[] = [];
    for (let i = 0; i < corners.length; i++) {
        if (isSolid(getTileAt(map, corners[i].x, corners[i].y))) {
            hits.push(i);
        }
    }
    return hits;
};

// Updated: Check if a point is inside a rotated vehicle (Aligned with Renderer)
export const checkPointInVehicle = (x: number, y: number, v: Vehicle, buffer: number = 0): boolean => {
    const dx = x - v.pos.x;
    const dy = y - v.pos.y;
    
    // Rotate point by -v.angle to bring it into local vehicle space (aligned with X/Y axes)
    const cos = Math.cos(-v.angle);
    const sin = Math.sin(-v.angle);
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;
    
    // Size Y is Length, Size X is Width
    const halfLen = (v.size.y / 2) + buffer;
    const halfWid = (v.size.x / 2) + buffer;
    
    return Math.abs(localX) < halfLen && Math.abs(localY) < halfWid;
};

// Helper: Check if police are nearby to witness a crime
export const isPoliceNearby = (state: MutableGameState, pos: Vector2, range: number = 600): boolean => {
    for (const p of state.pedestrians) {
        if ((p.role === 'police' || p.role === 'army') && p.state !== 'dead') {
            const dist = Math.sqrt((p.pos.x - pos.x) ** 2 + (p.pos.y - pos.y) ** 2);
            if (dist < range) return true;
        }
    }
    return false;
};

export const spawnParticle = (state: MutableGameState, pos: Vector2, type: Particle['type'], count: number = 1, options?: { color?: string, speed?: number, spread?: number, size?: number, life?: number }) => {
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

export const createExplosion = (state: MutableGameState, pos: Vector2, radius: number) => {
    spawnParticle(state, pos, 'explosion', 20, { color: '#f59e0b', speed: 4, size: 8 });
    spawnParticle(state, pos, 'smoke', 15, { color: '#4b5563', speed: 2, size: 6 });
    
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
    
    // Cheat: One Hit Kill
    const isOneHitKill = (source.id === 'player' && state.cheats.oneHitKill);

    if (source.weapon === 'fist') {
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
        if (p.state === 'dead' || p.role === 'police' || p.role === 'army') return;
        const dist = Math.sqrt((p.pos.x - source.pos.x)**2 + (p.pos.y - source.pos.y)**2);
        if (dist < PANIC_DISTANCE) {
            p.state = 'fleeing';
            p.actionTimer = 180;
        }
    });
};

const spawnTraffic = (state: MutableGameState, maxTraffic: number) => {
    // Check current traffic count (Exclude planes and player's car if they are driving)
    const trafficCount = state.vehicles.filter(v => v.driverId === 'npc').length;
    if (trafficCount >= maxTraffic) return;

    // Try to spawn nearby
    let spawned = false;
    let attempts = 0;
    const spawnRadius = 1600; // Just outside 1920 width
    const minSpawnRadius = 1000;

    while (!spawned && attempts < 5) {
        attempts++;
        const angle = Math.random() * Math.PI * 2;
        const dist = minSpawnRadius + Math.random() * (spawnRadius - minSpawnRadius);
        
        const spawnX = state.player.pos.x + Math.cos(angle) * dist;
        const spawnY = state.player.pos.y + Math.sin(angle) * dist;
        
        // Bounds check
        if (spawnX < 0 || spawnX >= MAP_WIDTH * TILE_SIZE || spawnY < 0 || spawnY >= MAP_HEIGHT * TILE_SIZE) continue;

        const tile = getTileAt(state.map, spawnX, spawnY);
        
        if (tile === TileType.ROAD_H || tile === TileType.ROAD_V || tile === TileType.RAIL_CROSSING) {
             const modelKeys = Object.keys(CAR_MODELS) as Array<keyof typeof CAR_MODELS>;
             const regularModels = modelKeys.filter(k => k !== 'plane' && k !== 'jet' && k !== 'tank' && k !== 'barracks');
             const modelKey = regularModels[Math.floor(Math.random() * regularModels.length)];
             const model = CAR_MODELS[modelKey];
             let vehicleColor = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
             if (['police', 'ambulance', 'swat', 'firetruck', 'taxi'].includes(modelKey)) {
                 vehicleColor = model.color;
             } else if (modelKey === 'limo') {
                 vehicleColor = Math.random() > 0.5 ? '#000000' : '#ffffff';
             }

             // Snap to lane
             let px = Math.floor(spawnX / TILE_SIZE) * TILE_SIZE + TILE_SIZE/2;
             let py = Math.floor(spawnY / TILE_SIZE) * TILE_SIZE + TILE_SIZE/2;
             let angle = 0;

             if (tile === TileType.ROAD_H) {
                const dir = Math.random() > 0.5;
                angle = dir ? 0 : Math.PI;
                py = Math.floor(spawnY / TILE_SIZE) * TILE_SIZE + (dir ? TILE_SIZE * 0.75 : TILE_SIZE * 0.25);
            } else if (tile === TileType.ROAD_V || tile === TileType.RAIL_CROSSING) {
                const dir = Math.random() > 0.5; 
                angle = dir ? Math.PI/2 : 3*Math.PI/2;
                px = Math.floor(spawnX / TILE_SIZE) * TILE_SIZE + (dir ? TILE_SIZE * 0.25 : TILE_SIZE * 0.75);
            }

            // Overlap check
            let overlap = false;
            for (const v of state.vehicles) {
                 if (Math.abs(v.pos.x - px) < 100 && Math.abs(v.pos.y - py) < 100) { overlap = true; break; }
            }
            if (overlap) continue;

            state.vehicles.push({
                id: `traffic-${Date.now()}-${Math.random()}`,
                type: EntityType.VEHICLE,
                pos: { x: px, y: py },
                size: (model as any).size || { x: CAR_SIZE.x, y: CAR_SIZE.y },
                angle: angle,
                velocity: { x: 0, y: 0 },
                color: vehicleColor,
                driverId: 'npc',
                model: modelKey,
                speed: 0,
                maxSpeed: model.maxSpeed,
                acceleration: model.acceleration,
                handling: model.handling,
                health: model.health,
                damage: { tires: [false, false, false, false], windows: [false, false] },
                deformation: { fl: 0, fr: 0, bl: 0, br: 0 },
                stuckTimer: 0,
                targetAngle: angle
            });
            spawned = true;
        }
    }
}

const isDrivable = (tile: number) => tile === TileType.ROAD_H || tile === TileType.ROAD_V || tile === TileType.ROAD_CROSS || tile === TileType.RAIL_CROSSING || tile === TileType.MILITARY_GROUND;

export const playerInteract = (state: MutableGameState) => {
    const player = state.player;

    // EXITING
    if (player.vehicleId) {
        const vehicle = state.vehicles.find(v => v.id === player.vehicleId);
        if (!vehicle) {
            // Error state, force out
            player.vehicleId = null;
            player.state = 'idle';
            return;
        }

        // Calculate Exit Position
        // Left side default
        const offset = 35; // car width/2 + padding
        let exitAngle = vehicle.angle - Math.PI / 2; // Left
        
        let exitX = vehicle.pos.x + Math.cos(exitAngle) * offset;
        let exitY = vehicle.pos.y + Math.sin(exitAngle) * offset;

        // Check solidity (Smart Exit)
        if (isSolid(getTileAt(state.map, exitX, exitY))) {
            // Try Right side
            exitAngle = vehicle.angle + Math.PI / 2;
            exitX = vehicle.pos.x + Math.cos(exitAngle) * offset;
            exitY = vehicle.pos.y + Math.sin(exitAngle) * offset;
            
            // If right is also blocked? Try Rear.
            if (isSolid(getTileAt(state.map, exitX, exitY))) {
                 exitAngle = vehicle.angle + Math.PI;
                 exitX = vehicle.pos.x + Math.cos(exitAngle) * 45;
                 exitY = vehicle.pos.y + Math.sin(exitAngle) * 45;
            }
        }

        // Start Exit Animation
        player.state = 'exiting_vehicle';
        player.actionTimer = 40; // Total Exit Time (Door Open + Exit + Close)
        player.vehicleId = null; // Detach physics immediately
        vehicle.driverId = null; 
        
        // Pass target vehicle ID to handle door animation in renderer
        player.targetVehicleId = vehicle.id; 
        
        // Setup positions for animation
        player.pos = { ...vehicle.pos }; // Start at center of car
        player.velocity = { x: 0, y: 0 };
        player.angle = exitAngle; // Face exit direction
        player.target = { x: exitX, y: exitY }; // Destination
        
        return;
    }

    // ENTERING
    // Find nearest car
    let nearestCar: Vehicle | null = null;
    let minDist = 60; // Interaction range
    state.vehicles.forEach(v => {
        const dist = Math.sqrt((v.pos.x - player.pos.x)**2 + (v.pos.y - player.pos.y)**2);
        if (dist < minDist) { nearestCar = v; minDist = dist; }
    });

    if (nearestCar) {
        // 1. Calculate Driver Door Position (Left side, slightly forward)
        const doorOffsetSide = (nearestCar.size.x / 2) + 12;
        const doorOffsetFwd = 5; 
        
        const cx = Math.cos(nearestCar.angle);
        const cy = Math.sin(nearestCar.angle);
        
        const localX = doorOffsetFwd;
        const localY = -doorOffsetSide;
        
        const doorX = nearestCar.pos.x + (localX * cx - localY * cy);
        const doorY = nearestCar.pos.y + (localX * cy + localY * cx);

        player.state = 'walking_to_car';
        player.targetVehicleId = nearestCar.id;
        player.target = { x: doorX, y: doorY };
    }
};

export const updatePhysics = (state: MutableGameState, keys: Set<string>, maxTraffic: number) => {
    state.timeTicker++;

    // Health Regeneration
    // God Mode Check
    if (state.cheats.godMode && state.player.health > 0) {
        if (state.player.health < state.player.maxHealth) {
            state.player.health = state.player.maxHealth;
        }
    } else if (state.player.health > 0 && state.player.health < state.player.maxHealth) {
        if (state.timeTicker - state.lastDamageTaken > 600) { 
             const healAmount = state.player.maxHealth * 0.01 / 60; 
             state.player.health = Math.min(state.player.maxHealth, state.player.health + healAmount);
        }
    }

    // Wanted Level Decay
    if (state.wantedLevel > 0) {
        if (state.timeTicker - state.lastWantedTime > 1200) { 
            state.wantedLevel--;
            state.lastWantedTime = state.timeTicker; 
        }
    }

    // RESTRICTED AREA LOGIC
    // If player is on military ground, instant 5 stars
    if (state.player.health > 0) {
        const tile = getTileAt(state.map, state.player.pos.x, state.player.pos.y);
        if (tile === TileType.MILITARY_GROUND || tile === TileType.BUNKER || tile === TileType.HELIPAD) {
            if (state.wantedLevel < 5) {
                // If God Mode active, don't auto-increase wanted level just for being there?
                // Or maybe keep it, god mode just stops damage.
                state.wantedLevel = 5;
                state.lastWantedTime = state.timeTicker;
            }
        }
    }

    // DEATH / WASTED LOGIC
    if (state.player.health <= 0 && !state.isWasted) {
        // Start Wasted Sequence
        state.isWasted = true;
        state.wastedStartTime = state.timeTicker;
        state.player.state = 'dead'; // Trigger dead animation if any
        return;
    }

    if (state.isWasted) {
        // Wait ~3 seconds (180 ticks at 60fps)
        if (state.timeTicker - state.wastedStartTime > 180) {
             // RESPAWN
             state.isWasted = false;
             state.player.health = 100;
             state.player.stamina = state.player.maxStamina; 
             state.player.state = 'idle';
             state.player.pos = { ...state.hospitalPos };
             state.player.vehicleId = null;
             state.wantedLevel = 0;
             state.lastDamageTaken = state.timeTicker; 
             state.money = Math.max(0, state.money - 500);
             
             // Reset Police/Army Aggro
             state.pedestrians.forEach(p => {
                if(p.role === 'police' || p.role === 'army') {
                    p.state = 'walking';
                    p.actionTimer = 100;
                }
             });
        }
        return;
    }

    if (state.isWeaponWheelOpen || state.activeShop !== 'none') {
        return; 
    }

    // PLAYER ANIMATION STATES (BLOCKS CONTROLS)
    if (state.player.state === 'walking_to_car') {
        // CANCEL AUTO-WALK if player presses WASD
        const isMoveKey = keys.has('KeyW') || keys.has('ArrowUp') || 
                          keys.has('KeyS') || keys.has('ArrowDown') || 
                          keys.has('KeyA') || keys.has('ArrowLeft') || 
                          keys.has('KeyD') || keys.has('ArrowRight');
        
        if (isMoveKey) {
            state.player.state = 'idle';
            state.player.targetVehicleId = null;
            state.player.target = undefined;
        } else {
            const target = state.player.target;
            const vehicle = state.vehicles.find(v => v.id === state.player.targetVehicleId);
            
            if (target && vehicle) {
                const dx = target.x - state.player.pos.x;
                const dy = target.y - state.player.pos.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist > 5) {
                    const angle = Math.atan2(dy, dx);
                    state.player.angle = angle;
                    state.player.pos.x += Math.cos(angle) * MAX_SPEED_WALK;
                    state.player.pos.y += Math.sin(angle) * MAX_SPEED_WALK;
                    
                    const doorOffsetSide = (vehicle.size.x / 2) + 12;
                    const doorOffsetFwd = 5;
                    const cx = Math.cos(vehicle.angle);
                    const cy = Math.sin(vehicle.angle);
                    const localX = doorOffsetFwd;
                    const localY = -doorOffsetSide;
                    
                    state.player.target = {
                        x: vehicle.pos.x + (localX * cx - localY * cy),
                        y: vehicle.pos.y + (localX * cy + localY * cx)
                    };
                } else {
                    state.player.state = 'entering_vehicle';
                    state.player.actionTimer = 40; 
                    state.player.angle = vehicle.angle; 
                }
            } else {
                state.player.state = 'idle';
            }
        }
    }
    else if (state.player.state === 'entering_vehicle') {
        if (state.player.actionTimer && state.player.actionTimer > 0) {
            state.player.actionTimer--;
            
            if (state.player.actionTimer < 30 && state.player.actionTimer > 10) {
                const v = state.vehicles.find(v => v.id === state.player.targetVehicleId);
                if (v) {
                    const dx = v.pos.x - state.player.pos.x;
                    const dy = v.pos.y - state.player.pos.y;
                    state.player.pos.x += dx * 0.1;
                    state.player.pos.y += dy * 0.1;
                }
            }
        } else {
            const v = state.vehicles.find(v => v.id === state.player.targetVehicleId);
            if (v) {
                state.player.vehicleId = v.id;
                state.player.state = 'driving';
                v.driverId = state.player.id;
                state.player.pos = { ...v.pos };
                
                spawnParticle(state, v.pos, 'smoke', 5, { color: '#555', speed: 1, spread: 20 });
                if (isPoliceNearby(state, v.pos)) {
                    state.wantedLevel = Math.min(state.wantedLevel + 1, 5);
                    state.lastWantedTime = state.timeTicker;
                }
            } else {
                state.player.state = 'idle';
            }
            state.player.targetVehicleId = null;
        }
    }
    else if (state.player.state === 'exiting_vehicle') {
        if (state.player.actionTimer && state.player.actionTimer > 0) {
            state.player.actionTimer--;
            if (state.player.actionTimer < 30 && state.player.actionTimer > 10) {
                if (state.player.target) {
                    const dx = state.player.target.x - state.player.pos.x;
                    const dy = state.player.target.y - state.player.pos.y;
                    state.player.pos.x += dx * 0.15; 
                    state.player.pos.y += dy * 0.15;
                }
            }
        } else {
            state.player.state = 'idle';
            state.player.target = undefined;
            state.player.targetVehicleId = null;
        }
    }

    // ------------------------------------------------------------------
    // PEDESTRIAN AI & PHYSICS
    // ------------------------------------------------------------------
    state.pedestrians.forEach(p => {
        if (p.state === 'dead') return;

        let moveSpeed = 0;
        
        let threat = null;
        for (const v of state.vehicles) {
             if (Math.abs(v.speed) > 5) {
                 const dist = Math.sqrt((p.pos.x - v.pos.x)**2 + (p.pos.y - v.pos.y)**2);
                 if (dist < 120) {
                     const dx = p.pos.x - v.pos.x;
                     const dy = p.pos.y - v.pos.y;
                     const vx = Math.cos(v.angle);
                     const vy = Math.sin(v.angle);
                     const dot = dx * vx + dy * vy;
                     if (dot > 0) {
                         threat = v;
                         break;
                     }
                 }
             }
        }

        if (threat) {
             p.state = 'fleeing';
             p.actionTimer = 60; 
             const carAngle = threat.angle;
             const dx = p.pos.x - threat.pos.x;
             const dy = p.pos.y - threat.pos.y;
             const cross = Math.cos(carAngle) * dy - Math.sin(carAngle) * dx;
             const dodgeDir = cross > 0 ? carAngle + Math.PI/2 : carAngle - Math.PI/2;
             p.angle = dodgeDir;
             moveSpeed = PEDESTRIAN_RUN_SPEED * 1.5;
        } 
        else if ((p.role === 'police' || p.role === 'army') && state.wantedLevel > 0) {
             const playerPos = state.player.pos;
             const dist = Math.sqrt((p.pos.x - playerPos.x)**2 + (p.pos.y - playerPos.y)**2);
             
             if (dist < 600) { 
                  const angleToPlayer = Math.atan2(playerPos.y - p.pos.y, playerPos.x - p.pos.x);
                  p.angle = angleToPlayer;
                  
                  if (dist > 250) {
                      p.state = 'running';
                      moveSpeed = PEDESTRIAN_RUN_SPEED;
                  } else {
                      p.state = 'shooting';
                      moveSpeed = 0; 
                      
                      if (!p.actionTimer) p.actionTimer = 0;
                      if (p.actionTimer <= 0) {
                           handleCombat(state, p);
                           p.actionTimer = 60 + Math.random() * 30;
                      } else {
                           p.actionTimer--;
                      }
                  }
             } else {
                 p.state = 'walking';
                 moveSpeed = PEDESTRIAN_SPEED;
             }
        } 
        else if (p.state === 'fleeing') {
            if (p.actionTimer && p.actionTimer > 0) {
                p.actionTimer--;
                moveSpeed = PEDESTRIAN_RUN_SPEED;
            } else {
                p.state = 'walking';
                p.actionTimer = 100;
            }
        } 
        else {
             if (!p.actionTimer || p.actionTimer <= 0) {
                 if (Math.random() > 0.4) {
                     p.state = 'walking';
                     if (Math.random() > 0.3) {
                         p.angle = Math.floor(Math.random() * 4) * (Math.PI/2);
                     } else {
                         p.angle = Math.random() * Math.PI * 2;
                     }
                     p.actionTimer = 60 + Math.random() * 120;
                 } else {
                     p.state = 'idle';
                     p.actionTimer = 60 + Math.random() * 60;
                 }
             } else {
                 p.actionTimer--;
             }
             
             if (p.state === 'walking') moveSpeed = PEDESTRIAN_SPEED;
        }

        p.velocity.x = Math.cos(p.angle) * moveSpeed;
        p.velocity.y = Math.sin(p.angle) * moveSpeed;

        const nextX = p.pos.x + p.velocity.x;
        const nextY = p.pos.y + p.velocity.y;

        if (!isSolid(getTileAt(state.map, nextX, nextY))) {
             p.pos.x = nextX;
             p.pos.y = nextY;
        } else {
             p.actionTimer = 0;
             p.angle += Math.PI; 
        }
    });

    state.drops.forEach(d => {
       const dx = state.player.pos.x - d.pos.x;
       const dy = state.player.pos.y - d.pos.y;
       const dist = Math.sqrt(dx*dx + dy*dy);
       if (dist < 30) { d.pos.x += dx * 0.1; d.pos.y += dy * 0.1; }
       if (dist < 10) {
           d.life = 0; 
           if (d.type === 'cash' && d.value) {
               state.money += d.value;
               spawnParticle(state, d.pos, 'spark', 5, { color: '#4ade80', speed: 1.5, size: 2 });
           } else if (d.type === 'weapon' && d.weapon) {
               state.player.weapon = d.weapon; 
               spawnParticle(state, d.pos, 'spark', 5, { color: '#fbbf24', speed: 1.5, size: 2 });
           }
       }
    });
    state.drops = state.drops.filter(d => d.life-- > 0);

    state.particles.forEach(p => {
        p.pos.x += p.velocity.x; p.pos.y += p.velocity.y; p.life--;
    });
    state.particles = state.particles.filter(p => p.life > 0);

    state.bullets.forEach(b => {
        b.pos.x += b.velocity.x;
        b.pos.y += b.velocity.y;
        b.timeLeft--;
        for (const v of state.vehicles) {
             if (checkPointInVehicle(b.pos.x, b.pos.y, v, 0)) {
                 b.timeLeft = 0;
                 // Vehicle God Mode Check
                 if (state.cheats.vehicleGodMode && v.driverId === 'player') {
                     spawnParticle(state, b.pos, 'spark', 3, { color: '#4ade80', speed: 2 }); // Green spark for invulnerable
                 } else {
                     v.health -= b.damage;
                     spawnParticle(state, b.pos, 'spark', 3, { color: '#fbbf24', speed: 2 });
                 }
                 
                 if (b.ownerId === 'player' && (v.model === 'police' || v.model === 'swat' || v.model === 'tank' || v.model === 'barracks')) {
                      state.wantedLevel = Math.min(state.wantedLevel + 1, 5);
                      state.lastWantedTime = state.timeTicker;
                 }
                 break;
             }
        }
        if (b.timeLeft <= 0) return;
        for (const p of state.pedestrians) {
            if (p.state === 'dead' || p.id === b.ownerId) continue;
            const dist = Math.sqrt((p.pos.x - b.pos.x)**2 + (p.pos.y - b.pos.y)**2);
            if (dist < 10) {
                 b.timeLeft = 0;
                 p.health -= b.damage;
                 spawnParticle(state, b.pos, 'blood', 3, { color: '#991b1b', speed: 2 });
                 if (p.health <= 0) {
                     p.state = 'dead';
                     spawnDrops(state, p);
                     if (b.ownerId === 'player') {
                         if (isPoliceNearby(state, p.pos)) {
                              state.wantedLevel = Math.min(state.wantedLevel + 1, 5);
                              state.lastWantedTime = state.timeTicker;
                         }
                     }
                 } else {
                     p.state = 'fleeing';
                 }
                 break;
            }
        }
        if (b.timeLeft <= 0) return;
        if (b.ownerId !== 'player' && state.player.health > 0) {
             const dist = Math.sqrt((state.player.pos.x - b.pos.x)**2 + (state.player.pos.y - b.pos.y)**2);
             if (dist < 12) {
                 b.timeLeft = 0;
                 if (!state.cheats.godMode) {
                     state.player.health -= b.damage;
                     state.lastDamageTaken = state.timeTicker;
                     spawnParticle(state, b.pos, 'blood', 4, { color: '#7f1d1d', speed: 2 });
                 }
                 return;
             }
        }
        if (isSolid(getTileAt(state.map, b.pos.x, b.pos.y))) {
             b.timeLeft = 0;
             spawnParticle(state, b.pos, 'smoke', 2, { color: '#9ca3af', speed: 1 });
        }
    });
    state.bullets = state.bullets.filter(b => b.timeLeft > 0);

    for (let i = state.vehicles.length - 1; i >= 0; i--) {
        const car = state.vehicles[i];
        
        // Continuous Smoke/Fire for damaged vehicles
        if (car.model !== 'tank' && car.model !== 'jet') {
            const modelData = CAR_MODELS[car.model];
            const maxH = (modelData as any).health || 100;
            
            if (car.health < maxH * 0.3 && state.timeTicker % 5 === 0) {
                // Smoke from engine (Front)
                const cos = Math.cos(car.angle);
                const sin = Math.sin(car.angle);
                const engineX = car.pos.x + cos * (car.size.y/2);
                const engineY = car.pos.y + sin * (car.size.y/2);
                spawnParticle(state, {x: engineX, y: engineY}, 'smoke', 1, { 
                    color: '#555', speed: 0.5, life: 60, size: 4 
                });
            }
            if (car.health < maxH * 0.15 && state.timeTicker % 3 === 0) {
                // Fire
                const cos = Math.cos(car.angle);
                const sin = Math.sin(car.angle);
                const engineX = car.pos.x + cos * (car.size.y/2);
                const engineY = car.pos.y + sin * (car.size.y/2);
                spawnParticle(state, {x: engineX, y: engineY}, 'fire', 1, { 
                    color: '#ef4444', speed: 0.5, life: 40, size: 3 
                });
            }
        }

        if (car.driverId !== 'player' && car.model !== 'plane' && car.model !== 'jet' && car.model !== 'tank') {
             const distToPlayer = Math.sqrt((car.pos.x - state.player.pos.x)**2 + (car.pos.y - state.player.pos.y)**2);
             if (distToPlayer > 2000) {
                 state.vehicles.splice(i, 1);
                 continue;
             }
        }
        
        if (car.driverId === 'npc') {
            const tileX = Math.floor(car.pos.x / TILE_SIZE);
            const tileY = Math.floor(car.pos.y / TILE_SIZE);
            const tile = getTileAt(state.map, car.pos.x, car.pos.y);
            
            let brake = false;
            const fwdX = Math.cos(car.angle);
            const fwdY = Math.sin(car.angle);
            const sensorDist = 140 + car.speed * 15;
            const sensorWidth = 36;
            
            for(const other of state.vehicles) {
                if (other.id === car.id) continue;
                const dx = other.pos.x - car.pos.x;
                const dy = other.pos.y - car.pos.y;
                const distFwd = dx * fwdX + dy * fwdY;
                const distSide = Math.abs(dx * -fwdY + dy * fwdX);
                if (distFwd > -30 && distFwd < sensorDist && distSide < sensorWidth) {
                     brake = true;
                     break;
                }
            }
            if (!brake && !state.player.vehicleId) {
                const dx = state.player.pos.x - car.pos.x;
                const dy = state.player.pos.y - car.pos.y;
                const distFwd = dx * fwdX + dy * fwdY;
                const distSide = Math.abs(dx * -fwdY + dy * fwdX);
                if (distFwd > 0 && distFwd < sensorDist && distSide < sensorWidth) brake = true;
            }

            if (brake) {
                car.speed *= 0.9;
                if (car.speed < 0.1) car.speed = 0;
            }
            else if (car.speed < car.maxSpeed * 0.7) car.speed += car.acceleration;

            if (!isDrivable(tile)) {
                // If tank or barracks on military ground, it's fine
                if ((car.model === 'tank' || car.model === 'barracks') && (tile === TileType.MILITARY_GROUND || tile === TileType.BUNKER)) {
                     // Military patrol logic - random turn
                     if (Math.random() > 0.95) car.angle += Math.PI/2;
                } else {
                     state.vehicles.splice(i, 1);
                     continue;
                }
            } else if (tile === TileType.ROAD_H) {
                const isEast = Math.abs(car.angle) < Math.PI/2;
                const targetAngle = isEast ? 0 : Math.PI;
                car.angle = targetAngle; 
                const laneY = tileY * TILE_SIZE + (isEast ? TILE_SIZE * 0.75 : TILE_SIZE * 0.25);
                car.pos.y += (laneY - car.pos.y) * 0.2; 
                car.pos.x += Math.cos(car.angle) * car.speed;
            } else if (tile === TileType.ROAD_V || tile === TileType.RAIL_CROSSING) {
                let normAngle = car.angle % (Math.PI * 2);
                if (normAngle < 0) normAngle += Math.PI * 2;
                const isSouth = normAngle > 0 && normAngle < Math.PI;
                const targetAngle = isSouth ? Math.PI/2 : 3*Math.PI/2;
                car.angle = targetAngle; 
                const laneX = tileX * TILE_SIZE + (isSouth ? TILE_SIZE * 0.25 : TILE_SIZE * 0.75);
                car.pos.x += (laneX - car.pos.x) * 0.2; 
                car.pos.y += Math.sin(car.angle) * car.speed;
            } else if (tile === TileType.ROAD_CROSS) {
                const centerX = tileX * TILE_SIZE + TILE_SIZE/2;
                const centerY = tileY * TILE_SIZE + TILE_SIZE/2;
                const toCenterX = centerX - car.pos.x;
                const toCenterY = centerY - car.pos.y;
                const dist = Math.sqrt(toCenterX**2 + toCenterY**2);
                const dot = toCenterX * Math.cos(car.angle) + toCenterY * Math.sin(car.angle);
                
                if (dist < car.speed + 8 && dot > 0) {
                     car.pos.x = centerX;
                     car.pos.y = centerY;
                     const exits: number[] = [];
                     if (isDrivable(getTileAt(state.map, (tileX+1)*TILE_SIZE, tileY*TILE_SIZE))) exits.push(0);
                     if (isDrivable(getTileAt(state.map, (tileX-1)*TILE_SIZE, tileY*TILE_SIZE))) exits.push(Math.PI);
                     if (isDrivable(getTileAt(state.map, tileX*TILE_SIZE, (tileY+1)*TILE_SIZE))) exits.push(Math.PI/2);
                     if (isDrivable(getTileAt(state.map, tileX*TILE_SIZE, (tileY-1)*TILE_SIZE))) exits.push(3*Math.PI/2);
                     
                     let newAngle = car.angle;
                     if (exits.length > 0) newAngle = exits[Math.floor(Math.random() * exits.length)];
                     else newAngle += Math.PI;
                     car.angle = newAngle;
                } else {
                    car.pos.x += Math.cos(car.angle) * car.speed;
                    car.pos.y += Math.sin(car.angle) * car.speed;
                }
            } else {
                car.speed = 0;
            }
            car.targetAngle = car.angle;
            
            if (car.speed < 0.5 && !brake) car.stuckTimer = (car.stuckTimer || 0) + 1;
            else car.stuckTimer = 0;
            if ((car.stuckTimer || 0) > 300) {
                state.vehicles.splice(i, 1);
                continue;
            }
        }

        if (car.health <= 0) {
            createExplosion(state, car.pos, 80);
            if (state.player.vehicleId === car.id) {
                if (!state.cheats.godMode) {
                    state.player.health = 0;
                } else {
                    // Eject player if car explodes in god mode
                    state.player.vehicleId = null;
                    state.player.state = 'idle';
                    state.player.pos.x += 50; // offset slightly
                }
            }
            state.vehicles.splice(i, 1);
            continue;
        }
    }

    if (state.timeTicker % 10 === 0) spawnTraffic(state, maxTraffic);

    // Player Vehicle Physics
    if (state.player.state === 'driving' && state.player.vehicleId) {
        const car = state.vehicles.find(v => v.id === state.player.vehicleId);
        if (car) {
            const tile = getTileAt(state.map, car.pos.x, car.pos.y);
            const isOffRoad = tile === TileType.GRASS || tile === TileType.MILITARY_GROUND;
            let drag = isOffRoad ? PHYSICS.SURFACE_FRICTION.GRASS : PHYSICS.SURFACE_FRICTION.ROAD;
            let grip = isOffRoad ? PHYSICS.SURFACE_GRIP.GRASS : PHYSICS.SURFACE_GRIP.ROAD;
            
            if (tile === TileType.PAINT_SHOP) {
                 if ((state.timeTicker - (car.lastPaintTime || 0)) > 180) {
                     if (Math.abs(car.speed) < 3 && state.activeShop === 'none') {
                         car.speed = 0;
                         car.velocity = {x: 0, y: 0};
                         state.activeShop = 'main';
                     }
                 }
            }
            
            const poppedTires = car.damage.tires.filter(t => t).length;
            if (poppedTires > 0) {
                grip *= (1 - poppedTires * 0.15);
                drag *= (1 - poppedTires * 0.05);
            }

            const isGas = (keys.has('KeyW') || keys.has('ArrowUp')) && !state.isWeaponWheelOpen && state.activeShop === 'none';
            const isBrake = (keys.has('KeyS') || keys.has('ArrowDown')) && !state.isWeaponWheelOpen && state.activeShop === 'none';
            const isLeft = (keys.has('KeyA') || keys.has('ArrowLeft')) && !state.isWeaponWheelOpen && state.activeShop === 'none';
            const isRight = (keys.has('KeyD') || keys.has('ArrowRight')) && !state.isWeaponWheelOpen && state.activeShop === 'none';
            const isHandbrake = keys.has('Space') && !state.isWeaponWheelOpen && state.activeShop === 'none';

            if (isHandbrake && car.model === 'tank') {
                 if (state.lastShotTime <= 0) {
                     // Create a tank shell
                     const shellSpeed = 40;
                     const muzzleX = car.pos.x + Math.cos(car.angle) * 45;
                     const muzzleY = car.pos.y + Math.sin(car.angle) * 45;
                     state.bullets.push({
                        id: `tank-shell-${Date.now()}`,
                        pos: { x: muzzleX, y: muzzleY },
                        velocity: { x: Math.cos(car.angle) * shellSpeed, y: Math.sin(car.angle) * shellSpeed },
                        ownerId: 'player',
                        damage: 200,
                        timeLeft: 60,
                        type: 'rocket',
                        explosionRadius: 150
                     });
                     spawnParticle(state, {x: muzzleX, y: muzzleY}, 'explosion', 5, {size: 4, life: 10});
                     
                     // Fast reload if cheat enabled
                     state.lastShotTime = state.cheats.noReload ? 5 : 60; 
                 }
            } else if (isHandbrake) {
                grip = PHYSICS.SURFACE_GRIP.DRIFT;
            }

            const cos = Math.cos(car.angle);
            const sin = Math.sin(car.angle);
            let vFwd = car.velocity.x * cos + car.velocity.y * sin;
            let vLat = -car.velocity.x * sin + car.velocity.y * cos;
            let accel = 0;
            
            if (isGas) accel += car.acceleration;
            if (isBrake) vFwd > 0.5 ? accel -= car.acceleration * 2.5 : accel -= car.acceleration;

            car.velocity.x += Math.cos(car.angle) * accel;
            car.velocity.y += Math.sin(car.angle) * accel;

            vFwd = car.velocity.x * cos + car.velocity.y * sin;
            vLat = -car.velocity.x * sin + car.velocity.y * cos;

            if (Math.abs(vFwd) > 0.1) {
                const dir = vFwd > 0 ? 1 : -1;
                const steerFactor = Math.min(Math.abs(vFwd) / 3, 1);
                if (isLeft) car.angle -= car.handling * dir * steerFactor;
                if (isRight) car.angle += car.handling * dir * steerFactor;
            }

            vFwd *= drag;
            vLat *= (1 - grip);
            
            if (Math.abs(vLat) > 2.0 && isOffRoad === false) {
                 spawnParticle(state, car.pos, 'smoke', 1, { color: 'rgba(200,200,200,0.1)', speed: 0.2 });
            }

            const nCos = Math.cos(car.angle);
            const nSin = Math.sin(car.angle);
            car.velocity.x = vFwd * nCos - vLat * nSin;
            car.velocity.y = vFwd * nSin + vLat * nCos;
            
            car.speed = vFwd;
            const nextX = car.pos.x + car.velocity.x;
            const nextY = car.pos.y + car.velocity.y;

            // Updated Map Collision to create directional damage
            const collidingCorners = checkMapCollisionDetails(car, state.map, {x: nextX, y: nextY});

            if (collidingCorners.length === 0) {
                car.pos.x = nextX;
                car.pos.y = nextY;
            } else {
                const impactSpeed = Math.abs(car.speed);
                // Bounce with high damping
                car.velocity.x *= -0.3;
                car.velocity.y *= -0.3;
                car.speed *= -0.3; 
                
                if (impactSpeed > 2) {
                    if (car.model !== 'tank') {
                        const damage = impactSpeed * 8;
                        if (!state.cheats.vehicleGodMode) {
                            car.health -= damage;
                        }
                        
                        // Directional Deformation
                        const def = Math.min(impactSpeed * 0.8, 15);
                        collidingCorners.forEach(i => {
                             if(i===0) car.deformation.fl += def;
                             if(i===1) car.deformation.fr += def;
                             if(i===2) car.deformation.bl += def;
                             if(i===3) car.deformation.br += def;
                        });

                        // Break Windows
                        if ((collidingCorners.includes(0) || collidingCorners.includes(1)) && impactSpeed > 6) car.damage.windows[0] = true;
                        if ((collidingCorners.includes(2) || collidingCorners.includes(3)) && impactSpeed > 6) car.damage.windows[1] = true;

                        spawnParticle(state, car.pos, 'spark', 5, { speed: 2, color: '#fff' });
                        spawnParticle(state, car.pos, 'debris', 4, { speed: 3, color: car.color });
                    }
                }
            }

            state.player.pos.x = car.pos.x;
            state.player.pos.y = car.pos.y;
            state.player.angle = car.angle;
        }
    } else {
        // Player Walking Logic
        if (!state.isWeaponWheelOpen && state.activeShop === 'none' && state.player.state !== 'entering_vehicle' && state.player.state !== 'exiting_vehicle' && state.player.state !== 'walking_to_car') {
            let dx = 0, dy = 0;
            if (keys.has('KeyW') || keys.has('ArrowUp')) dy = -1;
            if (keys.has('KeyS') || keys.has('ArrowDown')) dy = 1;
            if (keys.has('KeyA') || keys.has('ArrowLeft')) dx = -1;
            if (keys.has('KeyD') || keys.has('ArrowRight')) dx = 1;

            const isSprinting = (keys.has('ShiftLeft') || keys.has('ShiftRight')) && state.player.stamina > 0;
            const currentMaxSpeed = isSprinting ? MAX_SPEED_SPRINT : MAX_SPEED_WALK;
            const acceleration = isSprinting ? ACCELERATION_WALK * 2.5 : ACCELERATION_WALK;

            if (dx !== 0 || dy !== 0) {
                const angle = Math.atan2(dy, dx);
                state.player.velocity.x += Math.cos(angle) * acceleration;
                state.player.velocity.y += Math.sin(angle) * acceleration;
                state.player.angle = angle;
                if (state.player.state !== 'punching') {
                    state.player.state = isSprinting ? 'running' : 'walking';
                }
                if (isSprinting && !state.cheats.infiniteStamina) {
                    state.player.stamina = Math.max(0, state.player.stamina - 1);
                    state.player.staminaRechargeDelay = STAMINA_REGEN_DELAY;
                }
            } else {
                if (state.player.state !== 'punching') state.player.state = 'idle';
            }
            
            const speed = Math.sqrt(state.player.velocity.x ** 2 + state.player.velocity.y ** 2);
            if (speed > currentMaxSpeed) {
                const ratio = currentMaxSpeed / speed;
                state.player.velocity.x *= ratio;
                state.player.velocity.y *= ratio;
            }
        }
        
        if (state.player.stamina < state.player.maxStamina) {
             if (state.player.staminaRechargeDelay > 0) state.player.staminaRechargeDelay--;
             else state.player.stamina = Math.min(state.player.maxStamina, state.player.stamina + STAMINA_REGEN_RATE);
        }

        if (state.player.state === 'punching') {
            if (state.player.actionTimer && state.player.actionTimer > 0) state.player.actionTimer--;
            else state.player.state = 'idle';
        }

        const shootKey = keys.has('Space');
        const weaponStats = WEAPON_STATS[state.player.weapon];
        if (shootKey && !state.isWeaponWheelOpen && state.activeShop === 'none' && state.player.state !== 'entering_vehicle' && state.player.state !== 'exiting_vehicle' && state.player.state !== 'walking_to_car') {
            if (state.lastShotTime <= 0) {
                handleCombat(state, state.player);
                // Cheat: No Reload / Rapid Fire
                state.lastShotTime = state.cheats.noReload ? 5 : weaponStats.fireRate;
            }
        }
        if (state.lastShotTime > 0) state.lastShotTime--;

        state.player.velocity.x *= 0.9;
        state.player.velocity.y *= 0.9;

        const nextX = state.player.pos.x + state.player.velocity.x;
        const nextY = state.player.pos.y + state.player.velocity.y;
        
        const r = PLAYER_SIZE.x / 2;
        const touchingSolid = 
            isSolid(getTileAt(state.map, nextX + r, nextY)) ||
            isSolid(getTileAt(state.map, nextX - r, nextY)) ||
            isSolid(getTileAt(state.map, nextX, nextY + r)) ||
            isSolid(getTileAt(state.map, nextX, nextY - r));

        let carCollision = false;
        const targetV = state.player.targetVehicleId;
        
        for(const v of state.vehicles) {
            if (v.id === targetV) continue; 
            if (Math.abs(v.pos.x - nextX) > 50 || Math.abs(v.pos.y - nextY) > 50) continue;
            if (checkPointInVehicle(nextX, nextY, v, PLAYER_SIZE.x/2)) {
                carCollision = true; break;
            }
        }

        if (!touchingSolid && !carCollision) {
            state.player.pos.x = nextX; state.player.pos.y = nextY;
        }
    }

    // Vehicle-Vehicle Collision
    for (let i = 0; i < state.vehicles.length; i++) {
        for (let j = i + 1; j < state.vehicles.length; j++) {
            const v1 = state.vehicles[i];
            const v2 = state.vehicles[j];
            const distSq = (v1.pos.x - v2.pos.x)**2 + (v1.pos.y - v2.pos.y)**2;
            const rSum = (v1.size.y + v2.size.y) / 1.5;
            
            if (distSq < rSum * rSum) {
                const c1 = getVehicleCorners(v1); // [FL, FR, RL, RR]
                const c2 = getVehicleCorners(v2);

                const c1_hits = c1.map((c, idx) => checkPointInVehicle(c.x, c.y, v2) ? idx : -1).filter(idx => idx !== -1);
                const c2_hits = c2.map((c, idx) => checkPointInVehicle(c.x, c.y, v1) ? idx : -1).filter(idx => idx !== -1);

                if (c1_hits.length > 0 || c2_hits.length > 0) {
                    const angle = Math.atan2(v2.pos.y - v1.pos.y, v2.pos.x - v1.pos.x);
                    const overlap = 2;
                    const pushX = Math.cos(angle) * overlap;
                    const pushY = Math.sin(angle) * overlap;
                    v1.pos.x -= pushX; v1.pos.y -= pushY;
                    v2.pos.x += pushX; v2.pos.y += pushY;
                    
                    const v1v = Math.sqrt(v1.velocity.x**2 + v1.velocity.y**2);
                    const v2v = Math.sqrt(v2.velocity.x**2 + v2.velocity.y**2);
                    const totalV = v1v + v2v;

                    if (v1v > 0.1 || v2v > 0.1) {
                         spawnParticle(state, {x: (v1.pos.x+v2.pos.x)/2, y: (v1.pos.y+v2.pos.y)/2}, 'spark', 1, { color: '#fbbf24', speed: 2 });
                         v1.speed *= -0.4; v2.speed *= -0.4;
                         v1.velocity.x *= -0.4; v1.velocity.y *= -0.4;
                         v2.velocity.x *= -0.4; v2.velocity.y *= -0.4;
                         
                         // Damage & Deformation
                         if (totalV > 4) {
                             const damage = Math.min(totalV * 0.5, 10);
                             
                             if (!state.cheats.vehicleGodMode || v1.driverId !== 'player') {
                                if(v1.model !== 'tank') v1.health -= damage * (v2.model==='tank'?5:1);
                             }
                             if (!state.cheats.vehicleGodMode || v2.driverId !== 'player') {
                                if(v2.model !== 'tank') v2.health -= damage * (v1.model==='tank'?5:1);
                             }
                             
                             if (!v1.deformation) v1.deformation = { fl: 0, fr: 0, bl: 0, br: 0 };
                             if (!v2.deformation) v2.deformation = { fl: 0, fr: 0, bl: 0, br: 0 };
                             
                             // Apply Deform to colliding parts
                             c1_hits.forEach(idx => {
                                 if(idx===0) v1.deformation.fl += damage;
                                 if(idx===1) v1.deformation.fr += damage;
                                 if(idx===2) v1.deformation.bl += damage;
                                 if(idx===3) v1.deformation.br += damage;
                             });
                             
                             c2_hits.forEach(idx => {
                                 if(idx===0) v2.deformation.fl += damage;
                                 if(idx===1) v2.deformation.fr += damage;
                                 if(idx===2) v2.deformation.bl += damage;
                                 if(idx===3) v2.deformation.br += damage;
                             });
                             
                             spawnParticle(state, {x: (v1.pos.x+v2.pos.x)/2, y: (v1.pos.y+v2.pos.y)/2}, 'debris', 3, {color: '#888', speed: 2});
                         }
                    }
                }
            }
        }
    }

    // Vehicle-Pedestrian Collision
    state.vehicles.forEach(car => {
        if (Math.abs(car.speed) < 1) return;
        state.pedestrians.forEach(p => {
            if (p.state === 'dead' || p.vehicleId === car.id) return;
            if (p.id === 'player' && state.player.targetVehicleId === car.id) return;
            if (checkPointInVehicle(p.pos.x, p.pos.y, car, 2)) {
                const impactSpeed = Math.abs(car.speed);
                const angleToPed = Math.atan2(p.pos.y - car.pos.y, p.pos.x - car.pos.x);
                p.pos.x += Math.cos(angleToPed) * 5; p.pos.y += Math.sin(angleToPed) * 5;
                if (impactSpeed > 2) {
                    const damage = impactSpeed * 15;
                    
                    if (p.id === 'player' && state.cheats.godMode) {
                        // No damage
                    } else {
                        p.health -= damage;
                    }

                    spawnParticle(state, p.pos, 'blood', 4, { color: '#7f1d1d', speed: 2 });
                    p.velocity.x += Math.cos(car.angle) * impactSpeed; p.velocity.y += Math.sin(car.angle) * impactSpeed;
                    if (p.health <= 0) {
                        p.state = 'dead'; spawnDrops(state, p);
                        if (car.driverId === 'player') {
                            if (isPoliceNearby(state, p.pos)) {
                                state.wantedLevel = Math.min(state.wantedLevel + 1, 5);
                                state.lastWantedTime = state.timeTicker;
                            }
                        }
                    } else {
                        p.state = 'fleeing'; p.actionTimer = 120;
                        p.angle = Math.atan2(p.pos.y - car.pos.y, p.pos.x - car.pos.x);
                    }
                }
            }
        });
    });

    const targetCamX = state.player.pos.x - window.innerWidth / 2;
    const targetCamY = state.player.pos.y - window.innerHeight / 2;
    state.camera.x += (targetCamX - state.camera.x) * 0.1;
    state.camera.y += (targetCamY - state.camera.y) * 0.1;
}
