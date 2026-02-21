
import { TileType } from '../types';
import type { MutableGameState } from '../types';
import { 
    TILE_SIZE, PLAYER_SIZE, CAR_MODELS, 
    ACCELERATION_WALK, MAX_SPEED_WALK, MAX_SPEED_SPRINT, 
    PEDESTRIAN_SPEED, PEDESTRIAN_RUN_SPEED, PANIC_DISTANCE, PHYSICS, WEAPON_STATS,
    STAMINA_REGEN_DELAY, STAMINA_REGEN_RATE
} from '../constants';
import { isSolid, getTileAt, getTrafficLightState } from '../utils/gameUtils';
import { audioManager } from '../services/audioService';

// Imported Logic
import { checkMapCollisionDetails, checkPointInVehicle, getVehicleCorners } from './collision';
import { spawnParticle } from './particles';
import { isPoliceNearby, spawnDrops, spawnPedestrians } from './gamePlayUtils';
import { createExplosion, handleCombat } from './combat';
import { spawnTraffic, isDrivable, getNextTrafficDirection } from './traffic';
import { playerInteract } from './interaction';

// Re-export for compatibility with other components
export { checkPointInVehicle, spawnParticle, isPoliceNearby, playerInteract, MutableGameState };

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
                state.wantedLevel = 5;
                state.lastWantedTime = state.timeTicker;
            }
        }
    }

    // DEATH / WASTED LOGIC
    if (state.player.health <= 0 && !state.isWasted) {
        state.isWasted = true;
        state.wastedStartTime = state.timeTicker;
        state.player.state = 'dead';
        return;
    }

    if (state.isWasted) {
        if (state.timeTicker - state.wastedStartTime > 180) {
             state.isWasted = false;
             state.player.health = 100;
             state.player.stamina = state.player.maxStamina; 
             state.player.state = 'idle';
             state.player.pos = { ...state.hospitalPos };
             state.player.vehicleId = null;
             state.wantedLevel = 0;
             state.lastDamageTaken = state.timeTicker; 
             state.money = Math.max(0, state.money - 500);
             
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
                audioManager.playUI('success');
                if (isPoliceNearby(state, v.pos)) {
                    // Check if already reported stolen
                    if (!v.theftReported) {
                        state.wantedLevel = Math.min(state.wantedLevel + 1, 5);
                        state.lastWantedTime = state.timeTicker;
                        v.theftReported = true; // Mark as stolen
                    }
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

    // PEDESTRIAN AI & PHYSICS
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

    // Despawn distant pedestrians to allow respawning near player
    if (state.timeTicker % 30 === 0) {
        state.pedestrians = state.pedestrians.filter(p => {
            const dx = p.pos.x - state.player.pos.x;
            const dy = p.pos.y - state.player.pos.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            return dist < 1600; // Keep if within range
        });
    }

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
               audioManager.playUI('success');
           } else if (d.type === 'weapon' && d.weapon) {
               state.player.weapon = d.weapon; 
               spawnParticle(state, d.pos, 'spark', 5, { color: '#fbbf24', speed: 1.5, size: 2 });
               audioManager.playUI('success');
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
                 
                 // LOCALIZED DAMAGE CALCULATION
                 // Transform bullet pos to vehicle local space
                 const vdx = b.pos.x - v.pos.x;
                 const vdy = b.pos.y - v.pos.y;
                 const cos = Math.cos(-v.angle);
                 const sin = Math.sin(-v.angle);
                 const lx = vdx * cos - vdy * sin; // Length axis (Front is +)
                 const ly = vdx * sin + vdy * cos; // Width axis (Right is +)

                 const halfLen = v.size.y / 2;
                 const halfWid = v.size.x / 2;
                 
                 // --- Tire Hit Logic ---
                 // Approx locations: FL(+, -), FR(+, +), RL(-, -), RR(-, +)
                 // Tire visual center from renderer: +/- (halfLen - 8), +/- (halfWid + 1)
                 const tireX = halfLen - 8;
                 const tireY = halfWid; 
                 const tRad = 12; // Hit radius

                 let tireHit = -1;
                 if (Math.abs(lx - tireX) < tRad && Math.abs(ly - (-tireY)) < tRad) tireHit = 0; // FL
                 else if (Math.abs(lx - tireX) < tRad && Math.abs(ly - tireY) < tRad) tireHit = 1; // FR
                 else if (Math.abs(lx - (-tireX+4)) < tRad && Math.abs(ly - (-tireY)) < tRad) tireHit = 2; // RL
                 else if (Math.abs(lx - (-tireX+4)) < tRad && Math.abs(ly - tireY) < tRad) tireHit = 3; // RR

                 if (tireHit !== -1 && !v.damage.tires[tireHit]) {
                     if (!state.cheats.vehicleGodMode || v.driverId !== 'player') {
                         v.damage.tires[tireHit] = true;
                         spawnParticle(state, b.pos, 'debris', 5, { color: '#111', speed: 2 });
                         spawnParticle(state, b.pos, 'smoke', 3, { color: '#ccc', speed: 1 });
                     }
                 }

                 // --- Window Hit Logic ---
                 // Front: Near +length/4
                 // Rear: Near -length/4
                 let windowHit = -1;
                 if (lx > 0 && lx < halfLen * 0.7 && Math.abs(ly) < halfWid * 0.9) windowHit = 0;
                 else if (lx < 0 && lx > -halfLen * 0.7 && Math.abs(ly) < halfWid * 0.9) windowHit = 1;

                 if (windowHit !== -1 && !v.damage.windows[windowHit]) {
                     if (!state.cheats.vehicleGodMode || v.driverId !== 'player') {
                         v.damage.windows[windowHit] = true;
                         spawnParticle(state, b.pos, 'debris', 5, { color: '#88ccff', speed: 3, size: 1 }); // Glass shards
                     }
                 }

                 // Vehicle God Mode Check
                 if (state.cheats.vehicleGodMode && v.driverId === 'player') {
                     spawnParticle(state, b.pos, 'spark', 3, { color: '#4ade80', speed: 2 });
                 } else {
                     v.health -= b.damage;
                     spawnParticle(state, b.pos, 'spark', 3, { color: '#fbbf24', speed: 2 });
                 }
                 audioManager.playImpact(true);
                 
                 if (b.ownerId === 'player' && (v.model === 'police' || v.model === 'swat' || v.model === 'tank' || v.model === 'barracks')) {
                      // Apply shooting cooldown logic
                      const timeSinceLast = state.timeTicker - (state.lastShootingWantedTime || 0);
                      if (timeSinceLast > 3600) {
                          state.wantedLevel = Math.min(state.wantedLevel + 1, 5);
                          state.lastWantedTime = state.timeTicker;
                          state.lastShootingWantedTime = state.timeTicker;
                      }
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
                 audioManager.playPedHit();
                 if (p.health <= 0) {
                     p.state = 'dead';
                     spawnDrops(state, p);
                     if (b.ownerId === 'player') {
                         if (isPoliceNearby(state, p.pos)) {
                              // Apply shooting cooldown logic
                              const timeSinceLast = state.timeTicker - (state.lastShootingWantedTime || 0);
                              if (timeSinceLast > 3600) {
                                  state.wantedLevel = Math.min(state.wantedLevel + 1, 5);
                                  state.lastWantedTime = state.timeTicker;
                                  state.lastShootingWantedTime = state.timeTicker;
                              }
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
                     audioManager.playPedHit();
                 }
                 return;
             }
        }
        if (isSolid(getTileAt(state.map, b.pos.x, b.pos.y))) {
             b.timeLeft = 0;
             spawnParticle(state, b.pos, 'smoke', 2, { color: '#9ca3af', speed: 1 });
             audioManager.playImpact(false);
        }
    });
    state.bullets = state.bullets.filter(b => b.timeLeft > 0);

    for (let i = state.vehicles.length - 1; i >= 0; i--) {
        const car = state.vehicles[i];
        
        // Driving on flat tires (Sparks)
        if (Math.abs(car.speed) > 2) {
            const hl = car.size.y / 2;
            const hw = car.size.x / 2;
            const cos = Math.cos(car.angle);
            const sin = Math.sin(car.angle);
            const t = (lx: number, ly: number) => ({
                x: car.pos.x + (lx * cos - ly * sin),
                y: car.pos.y + (lx * sin + ly * cos)
            });
            
            // FL, FR, RL, RR
            const tireOffsets = [
                {x: hl - 8, y: -hw}, {x: hl - 8, y: hw},
                {x: -hl + 4, y: -hw}, {x: -hl + 4, y: hw}
            ];
            
            car.damage.tires.forEach((isFlat, idx) => {
                if (isFlat && Math.random() > 0.8) {
                    const pos = t(tireOffsets[idx].x, tireOffsets[idx].y);
                    spawnParticle(state, pos, 'spark', 1, { color: '#fbbf24', speed: 1, size: 1, life: 15 });
                }
            });
        }

        // Continuous Smoke/Fire
        if (car.model !== 'tank' && car.model !== 'jet') {
            const modelData = CAR_MODELS[car.model];
            const maxH = (modelData as any).health || 100;
            
            if (car.health < maxH * 0.3 && state.timeTicker % 5 === 0) {
                const cos = Math.cos(car.angle);
                const sin = Math.sin(car.angle);
                const engineX = car.pos.x + cos * (car.size.y/2);
                const engineY = car.pos.y + sin * (car.size.y/2);
                spawnParticle(state, {x: engineX, y: engineY}, 'smoke', 1, { color: '#555', speed: 0.5, life: 60, size: 4 });
            }
            if (car.health < maxH * 0.15 && state.timeTicker % 3 === 0) {
                const cos = Math.cos(car.angle);
                const sin = Math.sin(car.angle);
                const engineX = car.pos.x + cos * (car.size.y/2);
                const engineY = car.pos.y + sin * (car.size.y/2);
                spawnParticle(state, {x: engineX, y: engineY}, 'fire', 1, { color: '#ef4444', speed: 0.5, life: 40, size: 3 });
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
            
            // --- POLICE CHASE LOGIC ---
            const isPolice = ['police', 'swat', 'tank', 'barracks', 'fbi'].includes(car.model);
            const isChasing = (isPolice && state.wantedLevel > 0);

            let brake = false;
            const fwdX = Math.cos(car.angle);
            const fwdY = Math.sin(car.angle);
            const sensorDist = isChasing ? 200 : (140 + car.speed * 15);
            const sensorWidth = 36;
            
            // 1. Vehicle Collision Avoidance
            for(const other of state.vehicles) {
                if (other.id === car.id) continue;
                const dx = other.pos.x - car.pos.x;
                const dy = other.pos.y - car.pos.y;
                const distFwd = dx * fwdX + dy * fwdY;
                const distSide = Math.abs(dx * -fwdY + dy * fwdX);
                
                if (isChasing && other.driverId === 'player') continue;

                if (distFwd > -30 && distFwd < sensorDist && distSide < sensorWidth) {
                     brake = true;
                     break;
                }
            }
            if (!brake && !state.player.vehicleId && !isChasing) {
                const dx = state.player.pos.x - car.pos.x;
                const dy = state.player.pos.y - car.pos.y;
                const distFwd = dx * fwdX + dy * fwdY;
                const distSide = Math.abs(dx * -fwdY + dy * fwdX);
                if (distFwd > 0 && distFwd < sensorDist && distSide < sensorWidth) brake = true;
            }

            // 2. Traffic Light Logic
            if (!brake && !isChasing) {
                const lookAheadDist = 80;
                const checkX = car.pos.x + fwdX * lookAheadDist;
                const checkY = car.pos.y + fwdY * lookAheadDist;
                const aheadTile = getTileAt(state.map, checkX, checkY);
                
                if (aheadTile === TileType.ROAD_CROSS && tile !== TileType.ROAD_CROSS) {
                    const lightState = getTrafficLightState(state.timeTicker, checkX, checkY);
                    const isHorizontal = Math.abs(fwdX) > 0.7;
                    const myLight = isHorizontal ? lightState.ew : lightState.ns;
                    if (myLight !== 'GREEN') brake = true;
                }
            }

            if (brake) {
                car.speed *= 0.9;
                if (car.speed < 0.1) car.speed = 0;
            } else {
                const chaseBoost = isChasing ? 1.1 : 1.0; 
                const maxChaseSpeed = car.maxSpeed * (isChasing ? 1.05 : 0.7); 
                if (car.speed < maxChaseSpeed) car.speed += car.acceleration * chaseBoost;
            }

            if (isChasing) {
                 // --- CHASE STEERING ---
                 const dx = state.player.pos.x - car.pos.x;
                 const dy = state.player.pos.y - car.pos.y;
                 const distToPlayer = Math.sqrt(dx*dx + dy*dy);
                 
                 const targetAngle = Math.atan2(dy, dx);
                 
                 let diff = targetAngle - car.angle;
                 while (diff <= -Math.PI) diff += Math.PI * 2;
                 while (diff > Math.PI) diff -= Math.PI * 2;
                 
                 const turnSpeed = car.handling * (distToPlayer < 300 ? 2.0 : 1.0); 
                 if (Math.abs(diff) < turnSpeed) car.angle = targetAngle;
                 else car.angle += Math.sign(diff) * turnSpeed;
                 
                 const nextX = car.pos.x + Math.cos(car.angle) * car.speed;
                 const nextY = car.pos.y + Math.sin(car.angle) * car.speed;
                 
                 const corners = getVehicleCorners(car, {x: nextX, y: nextY});
                 let hitSolid = false;
                 let hitCornerIdx = -1;
                 for (let i = 0; i < corners.length; i++) {
                    if (isSolid(getTileAt(state.map, corners[i].x, corners[i].y))) {
                        hitSolid = true; 
                        hitCornerIdx = i;
                        break;
                    }
                 }
                 
                 if (!hitSolid) { car.pos.x = nextX; car.pos.y = nextY; } 
                 else { 
                     car.speed *= -0.5; 
                     car.stuckTimer = (car.stuckTimer || 0) + 20; 
                     // ADDED: NPC hitting wall sparks
                     if (hitCornerIdx !== -1 && Math.abs(car.speed) > 2) {
                         spawnParticle(state, corners[hitCornerIdx], 'spark', 2, {color: '#fbbf24', speed: 2});
                     }
                 }

            } else {
                // --- STANDARD MOVEMENT ---
                if (!isDrivable(tile)) {
                    if ((car.model === 'tank' || car.model === 'barracks') && (tile === TileType.MILITARY_GROUND || tile === TileType.BUNKER)) {
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
                    
                    if (dist < car.speed + 12 && dot > 0) { 
                         car.pos.x = centerX;
                         car.pos.y = centerY;
                         // DELEGATE TO TRAFFIC.TS
                         car.angle = getNextTrafficDirection(state.map, tileX, tileY, car.angle);
                    } else {
                        car.pos.x += Math.cos(car.angle) * car.speed;
                        car.pos.y += Math.sin(car.angle) * car.speed;
                    }
                } else {
                    car.speed = 0;
                }
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
                    state.player.vehicleId = null;
                    state.player.state = 'idle';
                    state.player.pos.x += 50; 
                }
            }
            state.vehicles.splice(i, 1);
            continue;
        }
    }

    if (state.timeTicker % 10 === 0) {
        spawnTraffic(state, maxTraffic);
        spawnPedestrians(state, 60); // Target 60 active pedestrians
    }

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
                     audioManager.playShoot('rocket');
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

            const collidingCorners = checkMapCollisionDetails(car, state.map, {x: nextX, y: nextY});

            if (collidingCorners.length === 0) {
                car.pos.x = nextX;
                car.pos.y = nextY;
            } else {
                const impactSpeed = Math.abs(car.speed);
                car.velocity.x *= -0.3;
                car.velocity.y *= -0.3;
                car.speed *= -0.3; 
                
                if (impactSpeed > 2) {
                    audioManager.playImpact(impactSpeed > 5);
                    
                    const cornerCoords = getVehicleCorners(car, {x: nextX, y: nextY});

                    if (car.model !== 'tank') {
                        const damage = impactSpeed * 8;
                        if (!state.cheats.vehicleGodMode) {
                            car.health -= damage;
                        }
                        
                        const def = Math.min(impactSpeed * 0.8, 15);
                        collidingCorners.forEach(i => {
                             if(i===0) car.deformation.fl += def;
                             if(i===1) car.deformation.fr += def;
                             if(i===2) car.deformation.bl += def;
                             if(i===3) car.deformation.br += def;
                             
                             // Add sparks at impact corner
                             spawnParticle(state, cornerCoords[i], 'spark', Math.max(2, Math.floor(impactSpeed/2)), { speed: 2 + Math.random(), color: '#fbbf24', spread: 5 });
                             spawnParticle(state, cornerCoords[i], 'smoke', 1, { speed: 0.5, color: '#9ca3af' });
                        });

                        if ((collidingCorners.includes(0) || collidingCorners.includes(1)) && impactSpeed > 6) car.damage.windows[0] = true;
                        if ((collidingCorners.includes(2) || collidingCorners.includes(3)) && impactSpeed > 6) car.damage.windows[1] = true;

                        spawnParticle(state, car.pos, 'debris', 4, { speed: 3, color: car.color });
                    } else {
                        collidingCorners.forEach(i => {
                             spawnParticle(state, cornerCoords[i], 'spark', 2, { speed: 2, color: '#fbbf24' });
                             spawnParticle(state, cornerCoords[i], 'smoke', 2, { speed: 1, color: '#57534e' });
                        });
                    }
                }
            }

            state.player.pos.x = car.pos.x;
            state.player.pos.y = car.pos.y;
            state.player.angle = car.angle;
        }
    } else {
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
            
            // Aiming Logic: Player rotates towards mouse target when shooting
            const aimDx = state.aimTarget.x - state.player.pos.x;
            const aimDy = state.aimTarget.y - state.player.pos.y;
            state.player.angle = Math.atan2(aimDy, aimDx);

            if (state.lastShotTime <= 0) {
                handleCombat(state, state.player);
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
                         // Spawn particles at specific corners of contact
                         c1_hits.forEach(idx => {
                             spawnParticle(state, c1[idx], 'spark', 2, { color: '#fbbf24', speed: 2, spread: 5 });
                             spawnParticle(state, c1[idx], 'debris', 1, { color: v1.color, speed: 2 });
                         });
                         c2_hits.forEach(idx => {
                             spawnParticle(state, c2[idx], 'spark', 2, { color: '#fbbf24', speed: 2, spread: 5 });
                             spawnParticle(state, c2[idx], 'debris', 1, { color: v2.color, speed: 2 });
                         });

                         v1.speed *= -0.4; v2.speed *= -0.4;
                         v1.velocity.x *= -0.4; v1.velocity.y *= -0.4;
                         v2.velocity.x *= -0.4; v2.velocity.y *= -0.4;
                         
                         if (totalV > 4) {
                             audioManager.playImpact(totalV > 8);
                             const damage = Math.min(totalV * 0.5, 10);
                             
                             if (!state.cheats.vehicleGodMode || v1.driverId !== 'player') {
                                if(v1.model !== 'tank') v1.health -= damage * (v2.model==='tank'?5:1);
                             }
                             if (!state.cheats.vehicleGodMode || v2.driverId !== 'player') {
                                if(v2.model !== 'tank') v2.health -= damage * (v1.model==='tank'?5:1);
                             }
                             
                             if (!v1.deformation) v1.deformation = { fl: 0, fr: 0, bl: 0, br: 0 };
                             if (!v2.deformation) v2.deformation = { fl: 0, fr: 0, bl: 0, br: 0 };
                             
                             const applyDeformation = (v: any, hits: number[]) => {
                                 hits.forEach(idx => {
                                     const deformAmount = Math.min(damage, 10); // Cap deformation per hit to prevent inversion
                                     if(idx===0) v.deformation.fl = Math.min(v.deformation.fl + deformAmount, 20);
                                     if(idx===1) v.deformation.fr = Math.min(v.deformation.fr + deformAmount, 20);
                                     if(idx===2) v.deformation.bl = Math.min(v.deformation.bl + deformAmount, 20);
                                     if(idx===3) v.deformation.br = Math.min(v.deformation.br + deformAmount, 20);
                                 });
                             };

                             applyDeformation(v1, c1_hits);
                             applyDeformation(v2, c2_hits);
                             
                             spawnParticle(state, {x: (v1.pos.x+v2.pos.x)/2, y: (v1.pos.y+v2.pos.y)/2}, 'debris', 3, {color: '#888', speed: 2});
                         }
                    }
                }
            }
        }
    }

    const targetCamX = state.player.pos.x - window.innerWidth / 2;
    const targetCamY = state.player.pos.y - window.innerHeight / 2;
    state.camera.x += (targetCamX - state.camera.x) * 0.1;
    state.camera.y += (targetCamY - state.camera.y) * 0.1;
}
