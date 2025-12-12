
import { 
    Vehicle, Pedestrian, Bullet, Particle, Vector2, TileType, EntityType, Drop 
} from '../types';
import { 
    TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, PLAYER_SIZE, CAR_SIZE, CAR_MODELS, 
    ACCELERATION_WALK, MAX_SPEED_WALK, MAX_SPEED_SPRINT, BULLET_SPEED, BULLET_LIFETIME, 
    PEDESTRIAN_SPEED, PEDESTRIAN_RUN_SPEED, PANIC_DISTANCE, PHYSICS, WEAPON_STATS,
    STAMINA_REGEN_DELAY, STAMINA_REGEN_RATE
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
    lastDamageTaken: number; // Timestamp for health regen
    lastWantedTime: number; // Timestamp for wanted level decay
}

// Helper: Check if a point is inside a rotated vehicle
export const checkPointInVehicle = (x: number, y: number, v: Vehicle, buffer: number = 0): boolean => {
    const dx = x - v.pos.x;
    const dy = y - v.pos.y;
    
    const angle = -(v.angle + Math.PI/2);
    const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
    const localY = dx * Math.sin(angle) + dy * Math.cos(angle);
    
    const halfW = (v.size.x / 2) + buffer;
    const halfL = (v.size.y / 2) + buffer;
    
    return Math.abs(localX) < halfW && Math.abs(localY) < halfL;
};

export const spawnParticle = (state: MutableGameState, pos: Vector2, type: Particle['type'], count: number = 1, options?: { color?: string, speed?: number, spread?: number, size?: number }) => {
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
            life: Math.random() * 30 + 30,
            maxLife: 60,
            color: options?.color || '#fff',
            size: options?.size || (Math.random() * 3 + 1),
            type
        });
    }
};

const spawnDrops = (state: MutableGameState, p: Pedestrian) => {
    // Cash Drop: $50 - $5000
    const cash = Math.floor(Math.random() * 4951) + 50;
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
    
    // Damage Player?
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
    
    state.wantedLevel = Math.min(state.wantedLevel + 2, 5);
    state.lastWantedTime = state.timeTicker;
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
                         state.wantedLevel = Math.min(state.wantedLevel + 1, 5);
                         state.lastWantedTime = state.timeTicker;
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
    
    if (source.id === 'player' && Math.random() > 0.8 && source.weapon !== 'flame') {
         state.wantedLevel = Math.min(state.wantedLevel + 1, 5);
         state.lastWantedTime = state.timeTicker;
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

const respawnVehicle = (state: MutableGameState, car: Vehicle) => {
    let spawned = false;
    let attempts = 0;
    
    while (!spawned && attempts < 20) {
        attempts++;
        const tx = Math.floor(Math.random() * MAP_WIDTH);
        const ty = Math.floor(Math.random() * MAP_HEIGHT);
        const tile = getTileAt(state.map, tx * TILE_SIZE, ty * TILE_SIZE);

        if (tile === TileType.ROAD_H || tile === TileType.ROAD_V) {
            const px = tx * TILE_SIZE + TILE_SIZE/2;
            const py = ty * TILE_SIZE + TILE_SIZE/2;
            
            // Check Camera distance to avoid popping in view
            if (px > state.camera.x - 200 && px < state.camera.x + window.innerWidth + 200 &&
                py > state.camera.y - 200 && py < state.camera.y + window.innerHeight + 200) {
                continue;
            }
            
            let overlap = false;
            for(const v of state.vehicles) {
                if (Math.abs(v.pos.x - px) < 100 && Math.abs(v.pos.y - py) < 100) {
                    overlap = true;
                    break;
                }
            }
            if (overlap) continue;

            car.pos.x = px;
            car.pos.y = py;
            car.speed = 0;
            car.stuckTimer = 0;
            const modelData = CAR_MODELS[car.model];
            car.health = modelData ? (modelData as any).health || 100 : 100;
            car.damage = { tires: [false,false,false,false], windows: [false,false] };

            if (tile === TileType.ROAD_H) {
                const dir = Math.random() > 0.5 ? 0 : Math.PI;
                car.angle = dir;
                car.targetAngle = dir;
                car.pos.y = ty * TILE_SIZE + (dir === 0 ? TILE_SIZE * 0.75 : TILE_SIZE * 0.25);
            } else {
                const dir = Math.random() > 0.5 ? Math.PI/2 : 3*Math.PI/2;
                car.angle = dir;
                car.targetAngle = dir;
                car.pos.x = tx * TILE_SIZE + (dir === Math.PI/2 ? TILE_SIZE * 0.25 : TILE_SIZE * 0.75);
            }
            spawned = true;
        }
    }
    
    if (!spawned) {
         car.pos.x = state.hospitalPos.x;
         car.pos.y = state.hospitalPos.y;
         car.speed = 0;
         car.stuckTimer = 0;
    }
};

const isDrivable = (tile: number) => tile === TileType.ROAD_H || tile === TileType.ROAD_V || tile === TileType.ROAD_CROSS;

export const updatePhysics = (state: MutableGameState, keys: Set<string>) => {
    state.timeTicker++;

    // Health Regeneration: 1% per second after 10 seconds of no damage
    if (state.player.health > 0 && state.player.health < state.player.maxHealth) {
        if (state.timeTicker - state.lastDamageTaken > 600) { // 600 frames = 10s
             const healAmount = state.player.maxHealth * 0.01 / 60; // 1% per sec distributed over 60 frames
             state.player.health = Math.min(state.player.maxHealth, state.player.health + healAmount);
        }
    }

    // Wanted Level Decay: Decrease by 1 star after 20 seconds of no wanted increase
    if (state.wantedLevel > 0) {
        if (state.timeTicker - state.lastWantedTime > 1200) { // 1200 frames = 20s
            state.wantedLevel--;
            state.lastWantedTime = state.timeTicker; // Reset timer to count down for next star
        }
    }

    if (state.player.health <= 0) {
        state.player.health = 100;
        state.player.stamina = state.player.maxStamina; // Reset stamina
        state.player.state = 'idle';
        state.player.pos = { ...state.hospitalPos };
        state.player.vehicleId = null;
        state.wantedLevel = 0;
        state.lastDamageTaken = state.timeTicker; // Reset regen timer
        state.money = Math.max(0, state.money - 500);
        state.pedestrians.forEach(p => {
            if(p.role === 'police') {
                p.state = 'walking';
                p.actionTimer = 100;
            }
        });
        return;
    }

    if (state.isWeaponWheelOpen) {
        if (Math.random() > 0.1) return; 
    }

    // Drops Physics & Pickup
    state.drops.forEach(d => {
       const dx = state.player.pos.x - d.pos.x;
       const dy = state.player.pos.y - d.pos.y;
       const dist = Math.sqrt(dx*dx + dy*dy);
       
       // Magnet Effect
       if (dist < 30) {
           d.pos.x += dx * 0.1;
           d.pos.y += dy * 0.1;
       }

       // Pickup
       if (dist < 10) {
           d.life = 0; // Remove
           if (d.type === 'cash' && d.value) {
               state.money += d.value;
               spawnParticle(state, d.pos, 'spark', 5, { color: '#4ade80', speed: 1.5, size: 2 });
           } else if (d.type === 'weapon' && d.weapon) {
               state.player.weapon = d.weapon; // Auto-equip
               spawnParticle(state, d.pos, 'spark', 5, { color: '#fbbf24', speed: 1.5, size: 2 });
           }
       }
    });
    state.drops = state.drops.filter(d => d.life-- > 0);

    // Particles
    state.particles.forEach(p => {
        p.pos.x += p.velocity.x;
        p.pos.y += p.velocity.y;
        p.life--;
    });
    state.particles = state.particles.filter(p => p.life > 0);

    // Vehicles
    state.vehicles.forEach(car => {
        // ------------------------------------------------------------------
        // NPC VEHICLE AI (Rail System)
        // ------------------------------------------------------------------
        if (car.driverId === 'npc') {
            const tileX = Math.floor(car.pos.x / TILE_SIZE);
            const tileY = Math.floor(car.pos.y / TILE_SIZE);
            const tile = getTileAt(state.map, car.pos.x, car.pos.y);

            // 1. BRAKING (Sensor Logic)
            let brake = false;
            const fwdX = Math.cos(car.angle);
            const fwdY = Math.sin(car.angle);
            const sensorDist = 120 + car.speed * 10;
            
            for(const other of state.vehicles) {
                if (other.id === car.id) continue;
                const dx = other.pos.x - car.pos.x;
                const dy = other.pos.y - car.pos.y;
                const distFwd = dx * fwdX + dy * fwdY;
                const distSide = Math.abs(dx * -fwdY + dy * fwdX);
                // Simple cone check
                if (distFwd > 0 && distFwd < sensorDist && distSide < 20) {
                     brake = true;
                     break;
                }
            }
            if (!brake && !state.player.vehicleId) {
                const dx = state.player.pos.x - car.pos.x;
                const dy = state.player.pos.y - car.pos.y;
                const distFwd = dx * fwdX + dy * fwdY;
                const distSide = Math.abs(dx * -fwdY + dy * fwdX);
                if (distFwd > 0 && distFwd < sensorDist && distSide < 20) brake = true;
            }

            // Speed Control
            if (brake) car.speed *= 0.8;
            else if (car.speed < car.maxSpeed * 0.7) car.speed += car.acceleration;

            // 2. RAIL MOVEMENT
            if (!isDrivable(tile)) {
                // We are off road. Reset.
                respawnVehicle(state, car);
            } else if (tile === TileType.ROAD_H) {
                // Horizontal Rail: Lock Y, Lock Angle to 0 or PI
                const isEast = Math.abs(car.angle) < Math.PI/2;
                const targetAngle = isEast ? 0 : Math.PI;
                car.angle = targetAngle; // Force Angle
                
                // Force Lane Y
                const laneY = tileY * TILE_SIZE + (isEast ? TILE_SIZE * 0.75 : TILE_SIZE * 0.25);
                car.pos.y += (laneY - car.pos.y) * 0.2; // Snap 20% per frame
                
                // Move X
                car.pos.x += Math.cos(car.angle) * car.speed;
            } else if (tile === TileType.ROAD_V) {
                // Vertical Rail: Lock X, Lock Angle to PI/2 or 3PI/2
                const isSouth = car.angle > 0 && car.angle < Math.PI;
                const targetAngle = isSouth ? Math.PI/2 : 3*Math.PI/2;
                car.angle = targetAngle; // Force Angle

                // Force Lane X
                const laneX = tileX * TILE_SIZE + (isSouth ? TILE_SIZE * 0.25 : TILE_SIZE * 0.75);
                car.pos.x += (laneX - car.pos.x) * 0.2; // Snap 20% per frame

                // Move Y
                car.pos.y += Math.sin(car.angle) * car.speed;
            } else if (tile === TileType.ROAD_CROSS) {
                // Intersection Node
                const centerX = tileX * TILE_SIZE + TILE_SIZE/2;
                const centerY = tileY * TILE_SIZE + TILE_SIZE/2;
                const toCenterX = centerX - car.pos.x;
                const toCenterY = centerY - car.pos.y;
                const dist = Math.sqrt(toCenterX**2 + toCenterY**2);
                
                // Dot product to check if we are approaching the center (positive) or leaving it (negative)
                const dot = toCenterX * Math.cos(car.angle) + toCenterY * Math.sin(car.angle);
                
                // Only snap if we are close AND moving towards the center.
                // This prevents the infinite loop where the car snaps, turns, but stays at dist < threshold.
                if (dist < car.speed + 5 && dot > 0) {
                     // We hit the center node. Snap and Turn.
                     car.pos.x = centerX;
                     car.pos.y = centerY;
                     
                     const exits: number[] = [];
                     // Check neighbors
                     if (isDrivable(getTileAt(state.map, (tileX+1)*TILE_SIZE, tileY*TILE_SIZE))) exits.push(0);
                     if (isDrivable(getTileAt(state.map, (tileX-1)*TILE_SIZE, tileY*TILE_SIZE))) exits.push(Math.PI);
                     if (isDrivable(getTileAt(state.map, tileX*TILE_SIZE, (tileY+1)*TILE_SIZE))) exits.push(Math.PI/2);
                     if (isDrivable(getTileAt(state.map, tileX*TILE_SIZE, (tileY-1)*TILE_SIZE))) exits.push(3*Math.PI/2);
                     
                     // Prefer straight
                     const currentDir = car.angle;
                     // Normalize angle
                     let normDir = currentDir;
                     while (normDir < 0) normDir += Math.PI*2;
                     normDir = normDir % (Math.PI*2);

                     const straight = exits.find(e => {
                         let normE = e;
                         while (normE < 0) normE += Math.PI*2;
                         return Math.abs(normE - normDir) < 0.1;
                     });
                     
                     let newAngle = car.angle;
                     // 60% chance to go straight if available
                     if (straight !== undefined && Math.random() > 0.4) {
                         newAngle = straight;
                     } else if (exits.length > 0) {
                         // Pick random valid exit
                         newAngle = exits[Math.floor(Math.random() * exits.length)];
                     } else {
                         // Dead end? Turn around
                         newAngle += Math.PI;
                     }
                     car.angle = newAngle;

                     // IMMEDIATE LANE OFFSET
                     // Shift car to the correct lane side immediately to look natural and enter next tile correctly.
                     const laneOffset = TILE_SIZE * 0.25;
                     if (Math.abs(newAngle - 0) < 0.1) car.pos.y += laneOffset;      // East -> South Lane
                     else if (Math.abs(newAngle - Math.PI) < 0.1) car.pos.y -= laneOffset; // West -> North Lane
                     else if (Math.abs(newAngle - Math.PI/2) < 0.1) car.pos.x -= laneOffset; // South -> West Lane
                     else if (Math.abs(newAngle - 3*Math.PI/2) < 0.1) car.pos.x += laneOffset; // North -> East Lane

                } else {
                    // Drive straight (leaving intersection or approaching it)
                    car.pos.x += Math.cos(car.angle) * car.speed;
                    car.pos.y += Math.sin(car.angle) * car.speed;
                }
            } else {
                // Unknown state (should be caught by !isDrivable), but just in case
                car.speed = 0;
            }

            // Sync target angle (for consistency if needed elsewhere)
            car.targetAngle = car.angle;
            
            // Stuck detection
            if (car.speed < 0.5 && !brake) car.stuckTimer = (car.stuckTimer || 0) + 1;
            else car.stuckTimer = 0;
            if ((car.stuckTimer || 0) > 300) respawnVehicle(state, car);
        }

        // Damage & Destruction Logic
        const maxHealth = (CAR_MODELS[car.model] as any)?.health || 100;
        const healthRatio = car.health / maxHealth;

        if (healthRatio < 0.5) {
             if (Math.random() > 0.8) spawnParticle(state, car.pos, 'smoke', 1, { color: 'rgba(100,100,100,0.5)', speed: 0.5, size: 2 + Math.random() * 2 });
             if (!car.damage.windows[0] && Math.random() > 0.995) car.damage.windows[0] = true;
        }
        
        if (healthRatio < 0.25) {
             if (Math.random() > 0.7) spawnParticle(state, car.pos, 'smoke', 1, { color: 'rgba(50,50,50,0.7)', speed: 0.8, size: 3 + Math.random() * 3 });
             if (Math.random() > 0.9) spawnParticle(state, car.pos, 'fire', 1, { speed: 0.5, size: 2 });
             if (Math.random() > 0.99) {
                 const tire = Math.floor(Math.random() * 4);
                 if (!car.damage.tires[tire]) car.damage.tires[tire] = true;
             }
        }

        if (car.health <= 0) {
            createExplosion(state, car.pos, 80);
            
            // Handle Player inside
            if (state.player.vehicleId === car.id) {
                state.player.health = 0;
                // Force ejection/death handled at start of updatePhysics next frame
            }
            
            respawnVehicle(state, car);
        }
    });

    // Player Vehicle
    if (state.player.state === 'driving' && state.player.vehicleId) {
        const car = state.vehicles.find(v => v.id === state.player.vehicleId);
        if (car) {
            const tile = getTileAt(state.map, car.pos.x, car.pos.y);
            const isOffRoad = tile === TileType.GRASS;
            let drag = isOffRoad ? PHYSICS.SURFACE_FRICTION.GRASS : PHYSICS.SURFACE_FRICTION.ROAD;
            let grip = isOffRoad ? PHYSICS.SURFACE_GRIP.GRASS : PHYSICS.SURFACE_GRIP.ROAD;
            
            const poppedTires = car.damage.tires.filter(t => t).length;
            if (poppedTires > 0) {
                grip *= (1 - poppedTires * 0.15);
                drag *= (1 - poppedTires * 0.05); // Reduce retention to increase drag (0.96 -> smaller)
            }

            const isGas = (keys.has('KeyW') || keys.has('ArrowUp')) && !state.isWeaponWheelOpen;
            const isBrake = (keys.has('KeyS') || keys.has('ArrowDown')) && !state.isWeaponWheelOpen;
            const isLeft = (keys.has('KeyA') || keys.has('ArrowLeft')) && !state.isWeaponWheelOpen;
            const isRight = (keys.has('KeyD') || keys.has('ArrowRight')) && !state.isWeaponWheelOpen;
            const isHandbrake = keys.has('Space') && !state.isWeaponWheelOpen;

            if (isHandbrake) grip = PHYSICS.SURFACE_GRIP.DRIFT;

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
            
            if (Math.abs(vFwd) > 3 && poppedTires > 0) {
                car.angle += (Math.random() - 0.5) * 0.05 * poppedTires;
                if (Math.random() < 0.2 * poppedTires) {
                     const offset = Math.random() > 0.5 ? 10 : -10;
                     const sparkPos = {
                         x: car.pos.x + Math.cos(car.angle + Math.PI/2) * offset,
                         y: car.pos.y + Math.sin(car.angle + Math.PI/2) * offset
                     };
                     spawnParticle(state, sparkPos, 'spark', 1, { color: '#fbbf24', speed: 2 });
                }
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
            
            const currentMaxSpeed = car.maxSpeed * (1 - poppedTires * 0.1);
            const currentSpeed = Math.sqrt(car.velocity.x**2 + car.velocity.y**2);
            if (currentSpeed > currentMaxSpeed) {
                const ratio = currentMaxSpeed / currentSpeed;
                car.velocity.x *= ratio;
                car.velocity.y *= ratio;
            }
            
            car.speed = vFwd;
            const nextX = car.pos.x + car.velocity.x;
            const nextY = car.pos.y + car.velocity.y;

            if (!isSolid(getTileAt(state.map, nextX, nextY))) {
                car.pos.x = nextX;
                car.pos.y = nextY;
            } else {
                const impactForce = Math.abs(car.speed);
                car.velocity.x *= -0.5;
                car.velocity.y *= -0.5;
                if (impactForce > 4) {
                     car.health -= impactForce * 1.5;
                     if (impactForce > 8) {
                         if (Math.random() > 0.6) car.damage.windows[0] = true; 
                         if (Math.random() > 0.6) car.damage.windows[1] = true;
                         spawnParticle(state, car.pos, 'debris', 3, { color: '#e5e7eb', speed: 2 });
                     }
                }
            }

            // Entity Collisions
            
            // 1. Pedestrians
            state.pedestrians.forEach(p => {
                if (p.state === 'dead' || p.vehicleId) return;
                
                if (checkPointInVehicle(p.pos.x, p.pos.y, car, 2)) {
                    const impactSpeed = Math.abs(car.speed);
                    
                    // Push out
                    const angleToPed = Math.atan2(p.pos.y - car.pos.y, p.pos.x - car.pos.x);
                    p.pos.x += Math.cos(angleToPed) * 5;
                    p.pos.y += Math.sin(angleToPed) * 5;

                    if (impactSpeed > 2) {
                        const damage = impactSpeed * 15;
                        p.health -= damage;
                        spawnParticle(state, p.pos, 'blood', 4, { color: '#7f1d1d', speed: 2 });
                        
                        // Knockback
                        p.velocity.x += Math.cos(car.angle) * impactSpeed;
                        p.velocity.y += Math.sin(car.angle) * impactSpeed;

                        if (p.health <= 0) {
                            p.state = 'dead';
                            spawnDrops(state, p);
                            state.wantedLevel = Math.min(state.wantedLevel + 1, 5);
                            state.lastWantedTime = state.timeTicker;
                        } else {
                            p.state = 'fleeing';
                            p.actionTimer = 120;
                        }
                    }
                }
            });

            // 2. Other Vehicles
            state.vehicles.forEach(other => {
                if (other.id === car.id) return;
                
                const dist = Math.sqrt((car.pos.x - other.pos.x)**2 + (car.pos.y - other.pos.y)**2);
                if (dist < 40) { 
                    // Elastic Bounce
                    const angle = Math.atan2(other.pos.y - car.pos.y, other.pos.x - car.pos.x);
                    const overlap = 40 - dist;
                    
                    const pushX = Math.cos(angle) * overlap * 0.5;
                    const pushY = Math.sin(angle) * overlap * 0.5;
                    
                    car.pos.x -= pushX;
                    car.pos.y -= pushY;
                    other.pos.x += pushX;
                    other.pos.y += pushY;
                    
                    const impact = Math.abs(car.speed) + Math.abs(other.speed);
                    if (impact > 2) {
                        car.speed *= -0.5;
                        other.speed *= -0.5;
                        
                        car.health -= impact * 2;
                        other.health -= impact * 2;
                        
                        spawnParticle(state, {x: (car.pos.x+other.pos.x)/2, y: (car.pos.y+other.pos.y)/2}, 'spark', 3, { color: '#fbbf24', speed: 3 });
                        spawnParticle(state, {x: (car.pos.x+other.pos.x)/2, y: (car.pos.y+other.pos.y)/2}, 'debris', 2, { color: '#9ca3af', speed: 2 });
                    }
                }
            });

            state.player.pos.x = car.pos.x;
            state.player.pos.y = car.pos.y;
            state.player.angle = car.angle;
            
            // While driving, stamina regenerates slowly if timer allows
            if (state.player.stamina < state.player.maxStamina) {
                 if (state.player.staminaRechargeDelay > 0) state.player.staminaRechargeDelay--;
                 else state.player.stamina += STAMINA_REGEN_RATE;
            }

        }
    } else {
        // Walking / Sprinting Logic
        if (!state.isWeaponWheelOpen) {
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

                // Stamina Logic
                if (isSprinting) {
                    state.player.stamina = Math.max(0, state.player.stamina - 1);
                    state.player.staminaRechargeDelay = STAMINA_REGEN_DELAY;
                }
            } else {
                if (state.player.state !== 'punching') state.player.state = 'idle';
            }
            
            // Limit speed
            const speed = Math.sqrt(state.player.velocity.x ** 2 + state.player.velocity.y ** 2);
            if (speed > currentMaxSpeed) {
                const ratio = currentMaxSpeed / speed;
                state.player.velocity.x *= ratio;
                state.player.velocity.y *= ratio;
            }
        }
        
        // Regenerate Stamina
        if (state.player.stamina < state.player.maxStamina) {
             if (state.player.staminaRechargeDelay > 0) {
                 state.player.staminaRechargeDelay--;
             } else {
                 state.player.stamina = Math.min(state.player.maxStamina, state.player.stamina + STAMINA_REGEN_RATE);
             }
        }

        if (state.player.state === 'punching') {
            if (state.player.actionTimer && state.player.actionTimer > 0) state.player.actionTimer--;
            else state.player.state = 'idle';
        }

        const shootKey = keys.has('Space');
        const weaponStats = WEAPON_STATS[state.player.weapon];
        if (shootKey && !state.isWeaponWheelOpen) {
            if (state.lastShotTime <= 0) {
                handleCombat(state, state.player);
                state.lastShotTime = weaponStats.fireRate;
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
        for(const v of state.vehicles) {
            if (Math.abs(v.pos.x - nextX) > 50 || Math.abs(v.pos.y - nextY) > 50) continue;
            if (checkPointInVehicle(nextX, nextY, v, PLAYER_SIZE.x/2)) {
                carCollision = true;
                break;
            }
        }

        if (!touchingSolid && !carCollision) {
            state.player.pos.x = nextX;
            state.player.pos.y = nextY;
        }
    }

    // Bullets
    state.bullets.forEach(b => {
        b.pos.x += b.velocity.x;
        b.pos.y += b.velocity.y;
        b.timeLeft--;
        if (b.type === 'rocket' && Math.random() > 0.5) spawnParticle(state, b.pos, 'smoke', 1, { color: '#ccc', speed: 0.5, size: 2 });
    });
    
    state.bullets = state.bullets.filter(b => {
        if (b.timeLeft <= 0) {
            if (b.type === 'rocket' && b.explosionRadius) createExplosion(state, b.pos, b.explosionRadius);
            return false;
        }
        if (isSolid(getTileAt(state.map, b.pos.x, b.pos.y))) {
            if (b.type === 'rocket' && b.explosionRadius) createExplosion(state, b.pos, b.explosionRadius);
            else if (b.type === 'standard') spawnParticle(state, b.pos, 'smoke', 3, { color: '#ccc', speed: 1 });
            return false;
        }

        let hit = false;
        if (b.ownerId !== 'player') {
            const dist = Math.sqrt((state.player.pos.x - b.pos.x)**2 + (state.player.pos.y - b.pos.y)**2);
            if (dist < 15) {
                state.player.health -= b.damage;
                state.lastDamageTaken = state.timeTicker;
                spawnParticle(state, state.player.pos, 'blood', 6, { color: '#7f1d1d', speed: 2, spread: 3 });
                hit = true;
            }
        }

        state.pedestrians.forEach(p => {
            if (p.state === 'dead' || p.id === b.ownerId) return;
            const dist = Math.sqrt((p.pos.x - b.pos.x)**2 + (p.pos.y - b.pos.y)**2);
            if (dist < 15) {
                if (b.type === 'rocket' && b.explosionRadius) { createExplosion(state, b.pos, b.explosionRadius); hit = true; }
                else {
                    p.health -= b.damage;
                    if (b.type !== 'fire') spawnParticle(state, p.pos, 'blood', 6, { color: '#7f1d1d', speed: 2, spread: 3 });
                    if (p.health <= 0) {
                        p.state = 'dead';
                        spawnDrops(state, p);
                        if (b.ownerId === 'player') {
                            state.wantedLevel = Math.min(state.wantedLevel + 1, 5);
                            state.lastWantedTime = state.timeTicker;
                        }
                    } else {
                        if (p.role !== 'police') { p.state = 'fleeing'; p.actionTimer = 180; }
                    }
                    if (b.type !== 'fire') hit = true;
                }
            }
        });
        if (hit) return false;
        
        state.vehicles.forEach(v => {
            const dist = Math.sqrt((v.pos.x - b.pos.x)**2 + (v.pos.y - b.pos.y)**2);
            if (dist < 25) {
                 if (b.type === 'rocket' && b.explosionRadius) { createExplosion(state, b.pos, b.explosionRadius); hit = true; }
                 else {
                     v.health -= 5;
                     if (b.type !== 'fire') { spawnParticle(state, b.pos, 'spark', 4, { color: '#fbbf24', speed: 3 }); hit = true; }
                     if (b.type === 'standard') {
                         // Simple tire damage logic override for performance
                         if (Math.random() > 0.9) v.damage.tires[Math.floor(Math.random()*4)] = true;
                     }
                 }
            }
        });
        if (hit) return false;
        return true;
    });

    // AI & Police Logic
    state.pedestrians.forEach(p => {
        if (p.state === 'dead') return;
        if (p.actionTimer && p.actionTimer > 0) p.actionTimer--;
        else {
             if (p.state === 'fleeing') { p.state = 'walking'; p.actionTimer = 100; }
             else if (p.state === 'shooting') { p.state = 'chasing'; p.actionTimer = 60; }
             else if (Math.random() > 0.95) { p.angle += (Math.random()-0.5); p.actionTimer = 50; }
        }
        
        if (p.role === 'police' && state.wantedLevel > 0) {
             const dx = state.player.pos.x - p.pos.x;
             const dy = state.player.pos.y - p.pos.y;
             const dist = Math.sqrt(dx*dx + dy*dy);
             p.angle = Math.atan2(dy, dx);
             
             if (dist < 300) {
                 if (dist < 150) {
                     if (Math.random() > 0.92) {
                         handleCombat(state, p);
                         p.state = 'shooting';
                         p.actionTimer = 30;
                     } else {
                         p.state = 'idle';
                     }
                 } else {
                     p.state = 'chasing';
                 }
             } else {
                 p.state = 'chasing';
             }
        }

        if (p.state === 'fleeing' || p.state === 'walking' || p.state === 'chasing') {
            let spd = p.state === 'fleeing' ? PEDESTRIAN_RUN_SPEED : PEDESTRIAN_SPEED;
            if (p.state === 'chasing') spd = PEDESTRIAN_RUN_SPEED * 0.85; 

            p.velocity.x = Math.cos(p.angle) * spd;
            p.velocity.y = Math.sin(p.angle) * spd;
            
            const nextX = p.pos.x + p.velocity.x;
            const nextY = p.pos.y + p.velocity.y;
            if (!isSolid(getTileAt(state.map, nextX, nextY))) {
                p.pos.x = nextX;
                p.pos.y = nextY;
            } else {
                p.angle += Math.PI + (Math.random() - 0.5);
            }
        }
    });

    const targetCamX = state.player.pos.x - window.innerWidth / 2;
    const targetCamY = state.player.pos.y - window.innerHeight / 2;
    state.camera.x += (targetCamX - state.camera.x) * 0.1;
    state.camera.y += (targetCamY - state.camera.y) * 0.1;
}
