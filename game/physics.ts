
import { 
    TileType, 
} from '../types';
import { 
    TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, PLAYER_SIZE, CAR_MODELS, 
    ACCELERATION_WALK, MAX_SPEED_WALK, MAX_SPEED_SPRINT, 
    PEDESTRIAN_SPEED, PEDESTRIAN_RUN_SPEED, PHYSICS, WEAPON_STATS,
    STAMINA_REGEN_DELAY, STAMINA_REGEN_RATE
} from '../constants';
import { isSolid, getTileAt } from '../utils/gameUtils';

import { MutableGameState } from './gameState';
import { getVehicleCorners, checkMapCollision, checkPointInVehicle, isPoliceNearby } from './collision';
import { spawnParticle } from './particles';
import { handleCombat, createExplosion, spawnDrops } from './combat';
import { respawnVehicle, isDrivable } from './vehicleLogic';

// Re-export for GameCanvas usage
export { MutableGameState, checkPointInVehicle, spawnParticle, isPoliceNearby };

export const updatePhysics = (state: MutableGameState, keys: Set<string>) => {
    state.timeTicker++;

    // Health Regeneration
    if (state.player.health > 0 && state.player.health < state.player.maxHealth) {
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

    // Death Logic
    if (state.player.health <= 0) {
        state.player.health = 100;
        state.player.stamina = state.player.maxStamina; 
        state.player.state = 'idle';
        state.player.pos = { ...state.hospitalPos };
        state.player.vehicleId = null;
        state.wantedLevel = 0;
        state.lastDamageTaken = state.timeTicker; 
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

    // ------------------------------------------------------------------
    // PEDESTRIAN AI & PHYSICS
    // ------------------------------------------------------------------
    state.pedestrians.forEach(p => {
        if (p.state === 'dead') return;

        let moveSpeed = 0;
        
        // 1. Detect Threats (Cars)
        let threat = null;
        for (const v of state.vehicles) {
             if (Math.abs(v.speed) > 5) { // Only fast cars
                 const dist = Math.sqrt((p.pos.x - v.pos.x)**2 + (p.pos.y - v.pos.y)**2);
                 if (dist < 120) {
                     const dx = p.pos.x - v.pos.x;
                     const dy = p.pos.y - v.pos.y;
                     const vx = Math.cos(v.angle);
                     const vy = Math.sin(v.angle);
                     
                     // Dot product: is car moving towards ped?
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
             p.actionTimer = 60; // Flee for 1s
             const carAngle = threat.angle;
             const dx = p.pos.x - threat.pos.x;
             const dy = p.pos.y - threat.pos.y;
             const cross = Math.cos(carAngle) * dy - Math.sin(carAngle) * dx;
             const dodgeDir = cross > 0 ? carAngle + Math.PI/2 : carAngle - Math.PI/2;
             
             p.angle = dodgeDir;
             moveSpeed = PEDESTRIAN_RUN_SPEED * 1.5; // Sprint dodge
        } 
        else if (p.role === 'police' && state.wantedLevel > 0) {
             // POLICE BEHAVIOR
             const playerPos = state.player.pos;
             const dist = Math.sqrt((p.pos.x - playerPos.x)**2 + (p.pos.y - playerPos.y)**2);
             
             if (dist < 600) { // Detection range
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
                           p.actionTimer = 60 + Math.random() * 30; // Police fire rate
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
             // WANDER
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

        // Apply Movement
        p.velocity.x = Math.cos(p.angle) * moveSpeed;
        p.velocity.y = Math.sin(p.angle) * moveSpeed;

        const nextX = p.pos.x + p.velocity.x;
        const nextY = p.pos.y + p.velocity.y;

        // Wall Collision
        if (!isSolid(getTileAt(state.map, nextX, nextY))) {
             p.pos.x = nextX;
             p.pos.y = nextY;
        } else {
             p.actionTimer = 0;
             p.angle += Math.PI; 
        }
    });

    // Drops Physics
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

    // Particles
    state.particles.forEach(p => {
        p.pos.x += p.velocity.x; p.pos.y += p.velocity.y; p.life--;
    });
    state.particles = state.particles.filter(p => p.life > 0);

    // Bullets (Movement & Collision)
    state.bullets.forEach(b => {
        b.pos.x += b.velocity.x;
        b.pos.y += b.velocity.y;
        b.timeLeft--;

        // 1. Vehicle Collisions
        for (const v of state.vehicles) {
             if (checkPointInVehicle(b.pos.x, b.pos.y, v, 0)) {
                 b.timeLeft = 0;
                 v.health -= b.damage;
                 spawnParticle(state, b.pos, 'spark', 3, { color: '#fbbf24', speed: 2 });
                 if (b.ownerId === 'player' && (v.model === 'police' || v.model === 'swat')) {
                      state.wantedLevel = Math.min(state.wantedLevel + 1, 5);
                      state.lastWantedTime = state.timeTicker;
                 }
                 break;
             }
        }
        if (b.timeLeft <= 0) return;

        // 2. Pedestrian Collisions (NPCs)
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

        // 3. Player Collision
        if (b.ownerId !== 'player' && state.player.health > 0) {
             const dist = Math.sqrt((state.player.pos.x - b.pos.x)**2 + (state.player.pos.y - b.pos.y)**2);
             if (dist < 12) {
                 b.timeLeft = 0;
                 state.player.health -= b.damage;
                 state.lastDamageTaken = state.timeTicker;
                 spawnParticle(state, b.pos, 'blood', 4, { color: '#7f1d1d', speed: 2 });
                 return;
             }
        }

        // 4. Wall Collisions
        if (isSolid(getTileAt(state.map, b.pos.x, b.pos.y))) {
             b.timeLeft = 0;
             spawnParticle(state, b.pos, 'smoke', 2, { color: '#9ca3af', speed: 1 });
        }
    });
    state.bullets = state.bullets.filter(b => b.timeLeft > 0);

    // Vehicles (NPC Control)
    state.vehicles.forEach(car => {
        // Vehicle Health Logic
        const maxHealth = (CAR_MODELS[car.model] as any)?.health || 100;
        const hpPct = car.health / maxHealth;
        const hoodX = car.pos.x + Math.cos(car.angle) * (car.size.y/2 - 5);
        const hoodY = car.pos.y + Math.sin(car.angle) * (car.size.y/2 - 5);

        // 50% HP: Minor Damage (Cracks / Dents)
        if (hpPct <= 0.50) {
            if (!car.damage.windows[0]) car.damage.windows[0] = true; // Crack windshield
        }

        // 20% HP: Major Damage (Smoke, Tires)
        if (hpPct <= 0.20) {
            if (!car.damage.windows[1]) car.damage.windows[1] = true; // Crack rear
            
            // Chance to pop a tire if not already popped
            if (state.timeTicker % 60 === 0 && Math.random() < 0.4) {
                const unpoppedIndices = car.damage.tires.map((p, i) => p ? -1 : i).filter(i => i !== -1);
                if (unpoppedIndices.length > 0) {
                    const idx = unpoppedIndices[Math.floor(Math.random() * unpoppedIndices.length)];
                    car.damage.tires[idx] = true;
                    spawnParticle(state, car.pos, 'debris', 3, { color: '#111', speed: 2, size: 2 });
                }
            }

            // Heavy Smoke (Dark Gray)
            if (state.timeTicker % 5 === 0) {
                spawnParticle(state, {x: hoodX, y: hoodY}, 'smoke', 1, { 
                    color: '#374151', // Dark Gray
                    speed: 0.8, spread: 8, size: Math.random() * 6 + 4, life: 80
                });
            }
        } 
        // 40% HP to 20% HP: Light Smoke
        else if (hpPct <= 0.40) {
             if (state.timeTicker % 10 === 0) {
                spawnParticle(state, {x: hoodX, y: hoodY}, 'smoke', 1, { 
                    color: '#9ca3af', // Light Gray
                    speed: 0.5, spread: 4, size: Math.random() * 4 + 2, life: 60
                });
             }
        }

        // 10% HP: Critical (Fire + Black Smoke)
        if (hpPct <= 0.10) {
             // Fire
             if (state.timeTicker % 8 === 0) {
                spawnParticle(state, {x: hoodX, y: hoodY}, 'fire', 1, { color: '#ef4444', speed: 0.5, size: 6 });
                spawnParticle(state, {x: hoodX, y: hoodY}, 'fire', 1, { color: '#f59e0b', speed: 0.6, size: 4 });
             }
             // Black Smoke
             if (state.timeTicker % 4 === 0) {
                 spawnParticle(state, {x: hoodX, y: hoodY}, 'smoke', 1, { 
                    color: '#000000', 
                    speed: 1.2, spread: 10, size: Math.random() * 8 + 6, life: 100
                });
             }
        }

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
                if (distFwd > 0 && distFwd < sensorDist && distSide < 20) {
                     brake = true; break;
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
                respawnVehicle(state, car);
            } else if (tile === TileType.ROAD_H) {
                const isEast = Math.abs(car.angle) < Math.PI/2;
                const targetAngle = isEast ? 0 : Math.PI;
                car.angle = targetAngle; 
                const laneY = tileY * TILE_SIZE + (isEast ? TILE_SIZE * 0.75 : TILE_SIZE * 0.25);
                car.pos.y += (laneY - car.pos.y) * 0.2; 
                car.pos.x += Math.cos(car.angle) * car.speed;
            } else if (tile === TileType.ROAD_V) {
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
                     if (exits.length > 0) {
                        // Simple randomness, improve with pathing later if needed
                        newAngle = exits[Math.floor(Math.random() * exits.length)];
                     } else {
                         newAngle += Math.PI;
                     }
                     car.angle = newAngle;

                     const laneOffset = TILE_SIZE * 0.25;
                     let checkAngle = newAngle % (Math.PI * 2);
                     if (checkAngle < 0) checkAngle += Math.PI * 2;
                     
                     if (Math.abs(checkAngle - 0) < 0.1 || Math.abs(checkAngle - 2*Math.PI) < 0.1) {
                         car.pos.y += laneOffset; 
                     } else if (Math.abs(checkAngle - Math.PI) < 0.1) {
                         car.pos.y -= laneOffset;
                     } else if (Math.abs(checkAngle - Math.PI/2) < 0.1) {
                         car.pos.x -= laneOffset; 
                     } else if (Math.abs(checkAngle - 1.5*Math.PI) < 0.1) {
                         car.pos.x += laneOffset;
                     }
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
            if ((car.stuckTimer || 0) > 300) respawnVehicle(state, car);
        }

        // Damage Logic (Death)
        if (car.health <= 0) {
            createExplosion(state, car.pos, 80);
            if (state.player.vehicleId === car.id) {
                state.player.health = 0;
            }
            respawnVehicle(state, car);
        }
    });

    // Player Vehicle Physics
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
                drag *= (1 - poppedTires * 0.05);
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

            if (!checkMapCollision(car, state.map, {x: nextX, y: nextY})) {
                car.pos.x = nextX;
                car.pos.y = nextY;
            } else {
                const impactForce = Math.abs(car.speed);
                car.velocity.x *= -0.5;
                car.velocity.y *= -0.5;
                car.speed *= -0.5; 
                if (impactForce > 4) car.health -= impactForce * 5;
            }

            state.player.pos.x = car.pos.x;
            state.player.pos.y = car.pos.y;
            state.player.angle = car.angle;
        }
    } else {
        // Player Walking Logic
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
                if (isSprinting) {
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
                carCollision = true; break;
            }
        }

        if (!touchingSolid && !carCollision) {
            state.player.pos.x = nextX; state.player.pos.y = nextY;
        }
    }

    // Vehicle-Vehicle Global Collision Resolution
    for (let i = 0; i < state.vehicles.length; i++) {
        for (let j = i + 1; j < state.vehicles.length; j++) {
            const v1 = state.vehicles[i];
            const v2 = state.vehicles[j];
            
            const distSq = (v1.pos.x - v2.pos.x)**2 + (v1.pos.y - v2.pos.y)**2;
            const rSum = (v1.size.y + v2.size.y) / 1.5; 
            if (distSq < rSum * rSum) {
                const c1 = getVehicleCorners(v1);
                const c2 = getVehicleCorners(v2);

                const c1_in_v2 = c1.some(c => checkPointInVehicle(c.x, c.y, v2));
                const c2_in_v1 = c2.some(c => checkPointInVehicle(c.x, c.y, v1));

                if (c1_in_v2 || c2_in_v1) {
                    const angle = Math.atan2(v2.pos.y - v1.pos.y, v2.pos.x - v1.pos.x);
                    const overlap = 2;
                    const pushX = Math.cos(angle) * overlap;
                    const pushY = Math.sin(angle) * overlap;

                    v1.pos.x -= pushX;
                    v1.pos.y -= pushY;
                    v2.pos.x += pushX;
                    v2.pos.y += pushY;
                    
                    const v1v = Math.sqrt(v1.velocity.x**2 + v1.velocity.y**2);
                    const v2v = Math.sqrt(v2.velocity.x**2 + v2.velocity.y**2);
                    
                    if (v1v > 0.1 || v2v > 0.1) {
                         const totalV = v1v + v2v;
                         spawnParticle(state, {x: (v1.pos.x+v2.pos.x)/2, y: (v1.pos.y+v2.pos.y)/2}, 'spark', 1, { color: '#fbbf24', speed: 2 });
                         
                         v1.speed *= -0.4;
                         v2.speed *= -0.4;
                         v1.velocity.x *= -0.4; v1.velocity.y *= -0.4;
                         v2.velocity.x *= -0.4; v2.velocity.y *= -0.4;
                         
                         v1.health -= totalV;
                         v2.health -= totalV;
                    }
                }
            }
        }
    }

    // Global Vehicle-Pedestrian Collision (Runover)
    state.vehicles.forEach(car => {
        if (Math.abs(car.speed) < 1) return;
        state.pedestrians.forEach(p => {
            if (p.state === 'dead' || p.vehicleId === car.id) return;
            if (checkPointInVehicle(p.pos.x, p.pos.y, car, 2)) {
                const impactSpeed = Math.abs(car.speed);
                const angleToPed = Math.atan2(p.pos.y - car.pos.y, p.pos.x - car.pos.x);
                p.pos.x += Math.cos(angleToPed) * 5; p.pos.y += Math.sin(angleToPed) * 5;
                if (impactSpeed > 2) {
                    const damage = impactSpeed * 15;
                    p.health -= damage;
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
