
import React, { useRef, useEffect, useCallback } from 'react';
import { 
    GameState, Pedestrian, Vehicle, EntityType, Vector2, TileType, Bullet, Particle, WeaponType 
} from '../types';
import { 
    MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, PLAYER_SIZE, CAR_SIZE, COLORS,
    CAR_MODELS, ACCELERATION_WALK, MAX_SPEED_WALK, 
    BULLET_SPEED, BULLET_LIFETIME, PEDESTRIAN_SPEED, PEDESTRIAN_TEXTING_SPEED, PEDESTRIAN_RUN_SPEED, PANIC_DISTANCE,
    PHYSICS, WEAPON_STATS
} from '../constants';
import { generateMap, isSolid, getTileAt } from '../utils/gameUtils';

interface GameCanvasProps {
    onGameStateUpdate: (state: GameState) => void;
    onPhoneToggle: (isOpen: boolean) => void;
    isPhoneOpen: boolean;
    activeMission: any;
    onWeaponWheelToggle: (isOpen: boolean) => void;
    isWeaponWheelOpen: boolean;
    activeWeapon: WeaponType;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ 
    onGameStateUpdate, isPhoneOpen, activeMission, 
    onWeaponWheelToggle, isWeaponWheelOpen, activeWeapon 
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);
    const keysPressed = useRef<Set<string>>(new Set());
    
    // Procedural Textures
    const groundTexturesRef = useRef<{ [key: string]: CanvasPattern | null }>({});
    
    // Game State Refs
    const mapRef = useRef<number[][]>([]);
    const hospitalPosRef = useRef<Vector2>({ x: 0, y: 0 }); // Store hospital location for respawn

    const playerRef = useRef<Pedestrian>({
        id: 'player',
        type: EntityType.PLAYER,
        role: 'civilian',
        pos: { x: TILE_SIZE * 5, y: TILE_SIZE * 5 },
        size: PLAYER_SIZE,
        angle: 0,
        velocity: { x: 0, y: 0 },
        color: COLORS.player,
        health: 100,
        maxHealth: 100,
        armor: 0,
        state: 'idle',
        vehicleId: null,
        weapon: 'fist'
    });
    const vehiclesRef = useRef<Vehicle[]>([]);
    const pedestriansRef = useRef<Pedestrian[]>([]);
    const bulletsRef = useRef<Bullet[]>([]);
    const particlesRef = useRef<Particle[]>([]);
    const lastShotTimeRef = useRef(0);
    const timeOfDayRef = useRef(12); // Permanently Noon
    const timeTickerRef = useRef(0);

    const cameraRef = useRef<Vector2>({ x: 0, y: 0 });
    const moneyRef = useRef(0);
    const wantedRef = useRef(0);
    
    // Sync weapon
    useEffect(() => {
        playerRef.current.weapon = activeWeapon;
    }, [activeWeapon]);

    // Generate Textures Helper
    const createNoiseTexture = (color: string, alpha: number = 0.1, density: number = 0.5) => {
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.fillStyle = color;
        ctx.fillRect(0, 0, size, size);

        for (let i = 0; i < size * size * density; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            ctx.fillStyle = `rgba(0,0,0,${Math.random() * alpha})`;
            ctx.fillRect(x, y, 1, 1);
            if (Math.random() > 0.5) {
                ctx.fillStyle = `rgba(255,255,255,${Math.random() * (alpha/2)})`;
                ctx.fillRect(x, y, 1, 1);
            }
        }
        return canvas;
    };

    // Helper: Check if a point is inside a rotated vehicle
    const checkPointInVehicle = (x: number, y: number, v: Vehicle, buffer: number = 0): boolean => {
        // Translate point to vehicle's local space
        const dx = x - v.pos.x;
        const dy = y - v.pos.y;
        
        const angle = -(v.angle + Math.PI/2);
        const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
        const localY = dx * Math.sin(angle) + dy * Math.cos(angle);
        
        const halfW = (v.size.x / 2) + buffer;
        const halfL = (v.size.y / 2) + buffer;
        
        return Math.abs(localX) < halfW && Math.abs(localY) < halfL;
    };

    // Initialize Game & Assets
    useEffect(() => {
        // Generate Map
        mapRef.current = generateMap();

        // Find Hospital and calculate safe respawn point
        let foundHospital = false;
        for(let y=0; y<MAP_HEIGHT; y++) {
            for(let x=0; x<MAP_WIDTH; x++) {
                if(mapRef.current[y][x] === TileType.HOSPITAL) {
                    // Check neighbors for a safe sidewalk tile
                    const neighbors = [
                        {dx: 0, dy: 1}, {dx: 0, dy: -1}, {dx: 1, dy: 0}, {dx: -1, dy: 0},
                        {dx: 2, dy: 0}, {dx: -2, dy: 0}, {dx: 0, dy: 2}, {dx: 0, dy: -2},
                        {dx: 1, dy: 1}, {dx: -1, dy: -1}, {dx: 1, dy: -1}, {dx: -1, dy: 1}
                    ];
                    
                    for(const n of neighbors) {
                        const nx = x + n.dx;
                        const ny = y + n.dy;
                        if(getTileAt(mapRef.current, nx, ny) === TileType.SIDEWALK) {
                             hospitalPosRef.current = { 
                                 x: nx * TILE_SIZE + TILE_SIZE/2, 
                                 y: ny * TILE_SIZE + TILE_SIZE/2 
                             };
                             foundHospital = true;
                             break;
                        }
                    }
                }
                if (foundHospital) break;
            }
            if (foundHospital) break;
        }
        // Fallback if no sidewalk found near hospital
        if (!foundHospital) hospitalPosRef.current = { x: TILE_SIZE * 6, y: TILE_SIZE * 6 };

        // Create Textures
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            const grassCanvas = createNoiseTexture(COLORS.grass, 0.15, 0.8);
            const roadCanvas = createNoiseTexture(COLORS.road, 0.1, 0.9);
            const sidewalkCanvas = createNoiseTexture(COLORS.sidewalk, 0.05, 0.3);
            const roofCanvas = createNoiseTexture('#4b5563', 0.15, 0.8); // Gravel roof
            
            if (grassCanvas) groundTexturesRef.current['grass'] = ctx.createPattern(grassCanvas, 'repeat');
            if (roadCanvas) groundTexturesRef.current['road'] = ctx.createPattern(roadCanvas, 'repeat');
            if (sidewalkCanvas) groundTexturesRef.current['sidewalk'] = ctx.createPattern(sidewalkCanvas, 'repeat');
            if (roofCanvas) groundTexturesRef.current['roof'] = ctx.createPattern(roofCanvas, 'repeat');
        }

        // Spawn Vehicles
        const cars: Vehicle[] = [];
        const modelKeys = Object.keys(CAR_MODELS) as Array<keyof typeof CAR_MODELS>;
        
        // 1. Spawn Traffic (On Roads)
        let trafficCount = 35;
        let attempts = 0;
        while (trafficCount > 0 && attempts < 500) {
            attempts++;
            const x = Math.floor(Math.random() * MAP_WIDTH);
            const y = Math.floor(Math.random() * MAP_HEIGHT);
            const tile = getTileAt(mapRef.current, x * TILE_SIZE, y * TILE_SIZE);
            
            if (tile === TileType.ROAD_H || tile === TileType.ROAD_V || tile === TileType.ROAD_CROSS) {
                // Determine orientation based on Right Hand Traffic
                let angle = 0;
                let posX = x * TILE_SIZE + TILE_SIZE/2;
                let posY = y * TILE_SIZE + TILE_SIZE/2;

                if (tile === TileType.ROAD_H) {
                    if (Math.random() > 0.5) {
                        angle = 0; // East (Right)
                        posY = y * TILE_SIZE + TILE_SIZE * 0.75; // Bottom lane
                    } else {
                        angle = Math.PI; // West (Left)
                        posY = y * TILE_SIZE + TILE_SIZE * 0.25; // Top lane
                    }
                } else if (tile === TileType.ROAD_V) {
                    if (Math.random() > 0.5) {
                        angle = Math.PI / 2; // South (Down)
                        posX = x * TILE_SIZE + TILE_SIZE * 0.25; // Left lane
                    } else {
                        angle = 3 * Math.PI / 2; // North (Up)
                        posX = x * TILE_SIZE + TILE_SIZE * 0.75; // Right lane
                    }
                } else {
                     angle = Math.floor(Math.random() * 4) * (Math.PI/2);
                }

                // Check overlap with existing cars
                let overlap = false;
                for (const existing of cars) {
                    const dist = Math.sqrt((existing.pos.x - posX)**2 + (existing.pos.y - posY)**2);
                    if (dist < 80) { overlap = true; break; }
                }
                if (overlap) continue;

                const modelKey = modelKeys[Math.floor(Math.random() * modelKeys.length)];
                const model = CAR_MODELS[modelKey];
                
                cars.push({
                    id: `traffic-${trafficCount}`,
                    type: EntityType.VEHICLE,
                    pos: { x: posX, y: posY },
                    size: (model as any).size || { x: CAR_SIZE.x, y: CAR_SIZE.y },
                    angle: angle,
                    velocity: { x: 0, y: 0 },
                    color: model.color,
                    driverId: 'npc', // AI Driver
                    model: modelKey,
                    speed: 0,
                    maxSpeed: model.maxSpeed,
                    acceleration: model.acceleration,
                    handling: model.handling,
                    health: model.health,
                    damage: { tires: [false, false, false, false], windows: [false, false] },
                    stuckTimer: 0
                });
                trafficCount--;
            }
        }

        // 2. Spawn Parked Cars (Off-Road)
        let parkedCount = 15;
        attempts = 0;
        while (parkedCount > 0 && attempts < 1000) {
            attempts++;
            const x = Math.floor(Math.random() * MAP_WIDTH) * TILE_SIZE + TILE_SIZE / 2;
            const y = Math.floor(Math.random() * MAP_HEIGHT) * TILE_SIZE + TILE_SIZE / 2;
            const tile = getTileAt(mapRef.current, x, y);

            if (!isSolid(tile) && tile !== TileType.ROAD_H && tile !== TileType.ROAD_V && tile !== TileType.ROAD_CROSS) {
                 // Check overlap
                 let overlap = false;
                 for (const existing of cars) {
                     const dist = Math.sqrt((existing.pos.x - x)**2 + (existing.pos.y - y)**2);
                     if (dist < 60) { overlap = true; break; }
                 }
                 if (overlap) continue;

                 const modelKey = modelKeys[Math.floor(Math.random() * modelKeys.length)];
                 const model = CAR_MODELS[modelKey];
                 cars.push({
                    id: `parked-${parkedCount}`,
                    type: EntityType.VEHICLE,
                    pos: { x, y },
                    size: (model as any).size || { x: CAR_SIZE.x, y: CAR_SIZE.y },
                    angle: Math.random() * Math.PI * 2,
                    velocity: { x: 0, y: 0 },
                    color: model.color,
                    driverId: null, // Parked
                    model: modelKey,
                    speed: 0,
                    maxSpeed: model.maxSpeed,
                    acceleration: model.acceleration,
                    handling: model.handling,
                    health: model.health,
                    damage: { tires: [false, false, false, false], windows: [false, false] },
                    stuckTimer: 0
                });
                parkedCount--;
            }
        }
        vehiclesRef.current = cars;

        // Spawn Pedestrians (Civilians and Police)
        const peds: Pedestrian[] = [];
        let pedsToSpawn = 50;
        
        // Spawn 5 Cops initially
        for(let i=0; i<5; i++) {
            let x, y, tile;
            do {
                x = Math.floor(Math.random() * MAP_WIDTH) * TILE_SIZE + TILE_SIZE / 2;
                y = Math.floor(Math.random() * MAP_HEIGHT) * TILE_SIZE + TILE_SIZE / 2;
                tile = getTileAt(mapRef.current, x, y);
            } while (tile !== TileType.SIDEWALK);
            
            peds.push({
                id: `cop-${i}`,
                type: EntityType.PEDESTRIAN,
                role: 'police',
                pos: { x, y },
                size: PLAYER_SIZE,
                angle: Math.random() * Math.PI * 2,
                velocity: { x: 0, y: 0 },
                color: '#1e3a8a', // Blue uniform
                health: 150, // Cops have armor/more health
                maxHealth: 150,
                armor: 50,
                vehicleId: null,
                weapon: 'pistol',
                actionTimer: Math.random() * 200,
                state: 'walking'
            });
            pedsToSpawn--;
        }

        while (pedsToSpawn > 0) {
            let x, y, tile;
            do {
                x = Math.floor(Math.random() * MAP_WIDTH) * TILE_SIZE + TILE_SIZE / 2;
                y = Math.floor(Math.random() * MAP_HEIGHT) * TILE_SIZE + TILE_SIZE / 2;
                tile = getTileAt(mapRef.current, x, y);
            } while (tile !== TileType.SIDEWALK);

            const basePed = {
                id: `ped-${pedsToSpawn}`,
                type: EntityType.PEDESTRIAN,
                role: 'civilian',
                pos: { x, y },
                size: PLAYER_SIZE,
                angle: Math.random() * Math.PI * 2,
                velocity: { x: 0, y: 0 },
                color: Math.random() > 0.5 ? '#9ca3af' : '#4b5563',
                health: 100,
                maxHealth: 100,
                armor: 0,
                vehicleId: null,
                weapon: 'fist',
                actionTimer: Math.random() * 200,
                state: 'walking'
            } as Pedestrian;

            if (Math.random() < 0.2 && pedsToSpawn > 1) {
                const partner = { ...basePed, id: `ped-${pedsToSpawn-1}`, pos: { x: x + 15, y: y + 5 } };
                basePed.state = 'chatting';
                basePed.chatPartnerId = partner.id;
                partner.state = 'chatting';
                partner.chatPartnerId = basePed.id;
                peds.push(basePed);
                peds.push(partner);
                pedsToSpawn -= 2;
            } else {
                peds.push(basePed);
                pedsToSpawn--;
            }
        }
        pedestriansRef.current = peds;

        const handleKeyDown = (e: KeyboardEvent) => {
            keysPressed.current.add(e.code);
            if (e.code === 'KeyM') moneyRef.current += 100;
            if (e.code === 'KeyF') handleInteraction();
            if (e.code === 'Tab') {
                e.preventDefault();
                onWeaponWheelToggle(true);
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            keysPressed.current.delete(e.code);
            if (e.code === 'Tab') {
                e.preventDefault();
                onWeaponWheelToggle(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        requestRef.current = requestAnimationFrame(gameLoop);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- PARTICLE SYSTEM ---
    const spawnParticle = (pos: Vector2, type: Particle['type'], count: number = 1, options?: { color?: string, speed?: number, spread?: number, size?: number }) => {
        // Performance Cap
        if (particlesRef.current.length > 200) {
            particlesRef.current.splice(0, count);
        }

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (options?.speed || 1) * Math.random();
            const spread = options?.spread || 0;
            particlesRef.current.push({
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

    const handleInteraction = () => {
        const player = playerRef.current;
        const vehicles = vehiclesRef.current;

        if (player.vehicleId) {
            const vehicle = vehicles.find(v => v.id === player.vehicleId);
            if (vehicle) {
                vehicle.driverId = null; // Parked
                player.vehicleId = null;
                player.state = 'idle';
                // Place player on sidewalk or safe spot if possible
                player.pos.x += Math.cos(vehicle.angle + Math.PI/2) * 40;
                player.pos.y += Math.sin(vehicle.angle + Math.PI/2) * 40;
            }
        } else {
            let nearestCar: Vehicle | null = null;
            let minDist = 60;
            vehicles.forEach(v => {
                const dist = Math.sqrt((v.pos.x - player.pos.x)**2 + (v.pos.y - player.pos.y)**2);
                if (dist < minDist) { nearestCar = v; minDist = dist; }
            });

            if (nearestCar) {
                const v = nearestCar as Vehicle;
                v.driverId = player.id;
                player.vehicleId = v.id;
                player.state = 'driving';
                player.pos = { ...v.pos };
                wantedRef.current = Math.min(wantedRef.current + 1, 5);
                spawnParticle(v.pos, 'smoke', 5, { color: '#555', speed: 1, spread: 20 });
            }
        }
    };

    const createExplosion = (pos: Vector2, radius: number) => {
        // Visuals
        spawnParticle(pos, 'explosion', 20, { color: '#f59e0b', speed: 4, size: 8 });
        spawnParticle(pos, 'smoke', 15, { color: '#4b5563', speed: 2, size: 6 });
        
        // Damage Peds
        pedestriansRef.current.forEach(p => {
             if (p.state === 'dead') return;
             const dist = Math.sqrt((p.pos.x - pos.x)**2 + (p.pos.y - pos.y)**2);
             if (dist < radius) {
                 p.health -= 200 * (1 - dist/radius);
                 // Pushback
                 const angle = Math.atan2(p.pos.y - pos.y, p.pos.x - pos.x);
                 p.velocity.x += Math.cos(angle) * 10;
                 p.velocity.y += Math.sin(angle) * 10;
                 
                 if (p.health <= 0) {
                     p.state = 'dead';
                 } else {
                     p.state = 'fleeing';
                 }
             }
        });

        // Damage Vehicles
        vehiclesRef.current.forEach(v => {
             const dist = Math.sqrt((v.pos.x - pos.x)**2 + (v.pos.y - pos.y)**2);
             if (dist < radius + 20) {
                 v.health -= 100 * (1 - dist/(radius+20));
                 v.damage.windows = [true, true];
                 v.damage.tires = [true, true, true, true]; // Blow all tires close to explosion
                 // Pushback
                 const angle = Math.atan2(v.pos.y - pos.y, v.pos.x - pos.x);
                 v.velocity.x += Math.cos(angle) * 5;
                 v.velocity.y += Math.sin(angle) * 5;
             }
        });
        
        wantedRef.current = Math.min(wantedRef.current + 2, 5);
    };

    const handleCombat = (source: Pedestrian) => {
        const weaponStats = WEAPON_STATS[source.weapon];
        
        if (source.weapon === 'fist') {
             // Set state for animation
             source.state = 'punching';
             source.actionTimer = 15; // Frames for animation

             const hitBoxCenter = {
                 x: source.pos.x + Math.cos(source.angle) * 20,
                 y: source.pos.y + Math.sin(source.angle) * 20
             };
             
             // Police/Enemies attack player
             if (source.id !== 'player') {
                 const player = playerRef.current;
                 const dist = Math.sqrt((player.pos.x - hitBoxCenter.x)**2 + (player.pos.y - hitBoxCenter.y)**2);
                 if (dist < 20) {
                     // Police Punch Nerf
                     const damage = source.role === 'police' ? 10 : weaponStats.damage;
                     player.health -= damage;
                     spawnParticle(player.pos, 'blood', 2, { color: '#7f1d1d', speed: 1.5 });
                 }
             }

             // Player attacks others
             pedestriansRef.current.forEach(p => {
                 if (p.id === source.id || p.state === 'dead') return;
                 const dist = Math.sqrt((p.pos.x - hitBoxCenter.x)**2 + (p.pos.y - hitBoxCenter.y)**2);
                 if (dist < 20) {
                     p.health -= weaponStats.damage;
                     // Knockback
                     p.velocity.x += Math.cos(source.angle) * 3; 
                     p.velocity.y += Math.sin(source.angle) * 3;
                     
                     spawnParticle(p.pos, 'blood', 2, { color: '#7f1d1d', speed: 1.5 });
                     if (p.health <= 0) {
                         p.state = 'dead';
                         if (source.id === 'player') wantedRef.current = Math.min(wantedRef.current + 1, 5);
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

        // Damage Override for Police
        const damage = source.role === 'police' ? 10 : weaponStats.damage;

        for (let i=0; i < bulletCount; i++) {
            const spreadAngle = (Math.random() - 0.5) * spread;
            const finalAngle = source.angle + spreadAngle;

            const startX = source.pos.x + Math.cos(source.angle) * 20;
            const startY = source.pos.y + Math.sin(source.angle) * 20;
            
            bulletsRef.current.push({
                id: `b-${Date.now()}-${i}-${Math.random()}`,
                pos: { x: startX, y: startY },
                velocity: {
                    x: Math.cos(finalAngle) * speed,
                    y: Math.sin(finalAngle) * speed
                },
                ownerId: source.id,
                damage: damage, // Use nerfed damage if police
                timeLeft: type === 'fire' ? 20 : BULLET_LIFETIME,
                type: type,
                explosionRadius: explosionRadius
            });
        }
        
        if (source.weapon !== 'flame') {
            spawnParticle(source.pos, 'muzzle', 3, { color: '#fff', speed: 0.5, spread: 2 });
        }
        
        if (source.id === 'player' && Math.random() > 0.8 && source.weapon !== 'flame') {
             wantedRef.current = Math.min(wantedRef.current + 1, 5);
        }
        
        pedestriansRef.current.forEach(p => {
            if (p.state === 'dead' || p.role === 'police') return;
            const dist = Math.sqrt((p.pos.x - source.pos.x)**2 + (p.pos.y - source.pos.y)**2);
            if (dist < PANIC_DISTANCE) {
                p.state = 'fleeing';
                p.actionTimer = 180;
            }
        });
    };

    const handlePlayerDeath = () => {
        // Respawn Logic
        const player = playerRef.current;
        player.health = 100;
        player.state = 'idle';
        player.pos = { ...hospitalPosRef.current };
        player.vehicleId = null;
        wantedRef.current = 0;
        moneyRef.current = Math.max(0, moneyRef.current - 500); // Hospital bill
        
        // Show Wasted message (for now via alert or just visual reset)
        // Reset nearby police aggression
        pedestriansRef.current.forEach(p => {
            if(p.role === 'police') {
                p.state = 'walking';
                p.actionTimer = 100;
            }
        });
    };

    // Helper to respawn vehicles that are stuck or out of bounds
    const respawnVehicle = (car: Vehicle) => {
        let spawned = false;
        let attempts = 0;
        
        // Try to find a valid spawn point on a road
        while (!spawned && attempts < 20) {
            attempts++;
            const tx = Math.floor(Math.random() * MAP_WIDTH);
            const ty = Math.floor(Math.random() * MAP_HEIGHT);
            const tile = getTileAt(mapRef.current, tx * TILE_SIZE, ty * TILE_SIZE);

            // Spawn only on straight roads to avoid complexity at intersections initially
            if (tile === TileType.ROAD_H || tile === TileType.ROAD_V) {
                const px = tx * TILE_SIZE + TILE_SIZE/2;
                const py = ty * TILE_SIZE + TILE_SIZE/2;

                // Ensure it's not too close to the player (pop-in prevention)
                const cam = cameraRef.current;
                const viewW = window.innerWidth;
                const viewH = window.innerHeight;
                
                // If within view + padding, skip
                if (px > cam.x - 200 && px < cam.x + viewW + 200 &&
                    py > cam.y - 200 && py < cam.y + viewH + 200) {
                    continue;
                }
                
                // Check overlap with existing vehicles
                let overlap = false;
                for(const v of vehiclesRef.current) {
                    if (Math.abs(v.pos.x - px) < 100 && Math.abs(v.pos.y - py) < 100) {
                        overlap = true;
                        break;
                    }
                }
                if (overlap) continue;

                // Valid spawn
                car.pos.x = px;
                car.pos.y = py;
                car.speed = 0;
                car.stuckTimer = 0;
                
                // Restore health
                const modelData = CAR_MODELS[car.model];
                car.health = modelData ? (modelData as any).health || 100 : 100;
                car.damage = { tires: [false,false,false,false], windows: [false,false] };

                // Orient correctly
                if (tile === TileType.ROAD_H) {
                    const dir = Math.random() > 0.5 ? 0 : Math.PI;
                    car.angle = dir;
                    // Lane offset
                    car.pos.y = ty * TILE_SIZE + (dir === 0 ? TILE_SIZE * 0.75 : TILE_SIZE * 0.25);
                } else {
                    const dir = Math.random() > 0.5 ? Math.PI/2 : 3*Math.PI/2;
                    car.angle = dir;
                    // Lane offset
                    car.pos.x = tx * TILE_SIZE + (dir === Math.PI/2 ? TILE_SIZE * 0.25 : TILE_SIZE * 0.75);
                }
                
                spawned = true;
            }
        }
        
        // Fallback: Hospital parking if fails
        if (!spawned) {
             car.pos.x = hospitalPosRef.current.x;
             car.pos.y = hospitalPosRef.current.y;
             car.speed = 0;
             car.stuckTimer = 0;
        }
    };

    const updatePhysics = () => {
        const player = playerRef.current;
        const vehicles = vehiclesRef.current;
        const keys = keysPressed.current;
        const map = mapRef.current;
        
        timeTickerRef.current++;

        if (player.health <= 0) {
            handlePlayerDeath();
            return;
        }

        if (isWeaponWheelOpen) {
            if (Math.random() > 0.1) return; 
        }

        particlesRef.current.forEach(p => {
            p.pos.x += p.velocity.x;
            p.pos.y += p.velocity.y;
            p.life--;
        });
        particlesRef.current = particlesRef.current.filter(p => p.life > 0);

        // Vehicle Physics
        vehiclesRef.current.forEach(car => {
            if (car.driverId === 'npc') {
                // --- AI TRAFFIC LOGIC ---
                let brake = false;

                // 1. Intelligent Sensors (Raycasting with Box Projection)
                const rayLen = 80 + Math.abs(car.speed) * 15; // Dynamic stopping distance
                
                // Check other cars in front
                for(const other of vehicles) {
                    if (other.id === car.id) continue;
                    
                    const dx = other.pos.x - car.pos.x;
                    const dy = other.pos.y - car.pos.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);

                    if (dist < rayLen) {
                         // Project other car onto our forward vector
                         const forwardDist = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
                         // Project other car onto our side vector
                         const sideDist = Math.abs(dx * Math.sin(car.angle) - dy * Math.cos(car.angle));

                         // Logic: If car is in front AND in our lane (sideDist small)
                         if (forwardDist > 0 && forwardDist < rayLen) {
                             // Allow slight overlap for lane adjacency, but brake if they block our lane
                             // Threshold: Half our width + Half their width + slight buffer
                             const widthThreshold = (car.size.x + other.size.x) / 2 * 0.9;
                             
                             if (sideDist < widthThreshold) {
                                 brake = true;
                                 break;
                             }
                         }
                    }
                }

                // Check Player in front
                if (!brake && !player.vehicleId) {
                     const dx = player.pos.x - car.pos.x;
                     const dy = player.pos.y - car.pos.y;
                     const forwardDist = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
                     const sideDist = Math.abs(dx * Math.sin(car.angle) - dy * Math.cos(car.angle));

                     if (forwardDist > 0 && forwardDist < rayLen) {
                         if (sideDist < (car.size.x + PLAYER_SIZE.x)/2 + 4) {
                             brake = true;
                         }
                     }
                }

                // 2. Navigation & Intersection Logic
                const tileX = Math.floor(car.pos.x / TILE_SIZE);
                const tileY = Math.floor(car.pos.y / TILE_SIZE);
                const tile = getTileAt(map, car.pos.x, car.pos.y);

                // Turning Logic
                let targetAngle = car.angle;

                if (tile === TileType.ROAD_CROSS) {
                    const centerX = tileX * TILE_SIZE + TILE_SIZE/2;
                    const centerY = tileY * TILE_SIZE + TILE_SIZE/2;
                    const distToCenter = Math.sqrt((car.pos.x - centerX)**2 + (car.pos.y - centerY)**2);

                    if (distToCenter < 12) {
                        // Pick random direction
                        const dirs = [0, Math.PI/2, Math.PI, 3*Math.PI/2];
                        const r = Math.random();
                        if (r < 0.2) targetAngle += Math.PI/2; // Left
                        else if (r < 0.4) targetAngle -= Math.PI/2; // Right
                        // else Straight
                        
                        // Snap to grid direction
                        car.angle = Math.round(targetAngle / (Math.PI/2)) * (Math.PI/2);
                        // Push slightly out of center to prevent re-triggering immediately
                        car.pos.x += Math.cos(car.angle) * 12;
                        car.pos.y += Math.sin(car.angle) * 12;
                    }
                } 

                // Lane Centering (Right Hand Traffic)
                const normA = (car.angle + 2*Math.PI) % (2*Math.PI);
                let targetX = car.pos.x;
                let targetY = car.pos.y;
                let steerX = 0; 
                let steerY = 0;
                
                if (normA < 0.1 || normA > 6.2) { // East
                    targetY = tileY * TILE_SIZE + TILE_SIZE * 0.75;
                    steerY = (targetY - car.pos.y) * 0.05;
                } else if (Math.abs(normA - Math.PI) < 0.1) { // West
                    targetY = tileY * TILE_SIZE + TILE_SIZE * 0.25;
                    steerY = (targetY - car.pos.y) * 0.05;
                } else if (Math.abs(normA - Math.PI/2) < 0.1) { // South
                    targetX = tileX * TILE_SIZE + TILE_SIZE * 0.25;
                    steerX = (targetX - car.pos.x) * 0.05;
                } else if (Math.abs(normA - 3*Math.PI/2) < 0.1) { // North
                    targetX = tileX * TILE_SIZE + TILE_SIZE * 0.75;
                    steerX = (targetX - car.pos.x) * 0.05;
                }
                
                // Apply Movement
                if (brake) {
                    car.speed *= 0.85; // Stronger braking
                } else {
                    if (car.speed < 6) car.speed += 0.2; // Traffic max speed
                }

                // Stuck Detection
                if (Math.abs(car.speed) < 0.5 && !brake) {
                    // If we aren't braking for a car but speed is low, we might be stuck on geometry
                    car.stuckTimer = (car.stuckTimer || 0) + 1;
                } else if (Math.abs(car.speed) < 0.5 && brake) {
                    // Waiting in traffic
                    car.stuckTimer = (car.stuckTimer || 0) + 1;
                } else {
                    car.stuckTimer = 0;
                }

                // Respawn if stuck for too long (approx 5 seconds)
                if ((car.stuckTimer || 0) > 300) {
                     respawnVehicle(car);
                }
                
                const nextX = car.pos.x + Math.cos(car.angle) * car.speed + steerX;
                const nextY = car.pos.y + Math.sin(car.angle) * car.speed + steerY;

                // --- AI BOUNDARY LOGIC ---
                // If approaching the water edge, make a U-turn or change direction
                // This prevents driving into the void
                const mapW = MAP_WIDTH * TILE_SIZE;
                const mapH = MAP_HEIGHT * TILE_SIZE;
                const margin = TILE_SIZE;

                let turned = false;
                
                // Check Bounds
                if (nextX < margin && Math.cos(car.angle) < 0) {
                     car.angle = 0; // Face Right
                     car.stuckTimer = 0; // Reset stuck timer
                     turned = true;
                } else if (nextX > mapW - margin && Math.cos(car.angle) > 0) {
                     car.angle = Math.PI; // Face Left
                     car.stuckTimer = 0;
                     turned = true;
                } else if (nextY < margin && Math.sin(car.angle) < 0) {
                     car.angle = Math.PI / 2; // Face Down
                     car.stuckTimer = 0;
                     turned = true;
                } else if (nextY > mapH - margin && Math.sin(car.angle) > 0) {
                     car.angle = 3 * Math.PI / 2; // Face Up
                     car.stuckTimer = 0;
                     turned = true;
                }

                if (!turned) {
                    car.pos.x = nextX;
                    car.pos.y = nextY;
                }
            }
        });

        // Player Vehicle Physics
        if (player.state === 'driving' && player.vehicleId) {
            const car = vehicles.find(v => v.id === player.vehicleId);
            if (car) {
                const tile = getTileAt(map, car.pos.x, car.pos.y);
                const isOffRoad = tile === TileType.GRASS;
                let drag = isOffRoad ? PHYSICS.SURFACE_FRICTION.GRASS : PHYSICS.SURFACE_FRICTION.ROAD;
                let grip = isOffRoad ? PHYSICS.SURFACE_GRIP.GRASS : PHYSICS.SURFACE_GRIP.ROAD;
                
                // Damage Effects on Physics
                const poppedTires = car.damage.tires.filter(t => t).length;
                if (poppedTires > 0) {
                    grip *= (1 - poppedTires * 0.15); // Lose 15% grip per tire
                    drag *= (1 + poppedTires * 0.1);  // Increase drag
                }

                const isGas = (keys.has('KeyW') || keys.has('ArrowUp')) && !isWeaponWheelOpen;
                const isBrake = (keys.has('KeyS') || keys.has('ArrowDown')) && !isWeaponWheelOpen;
                const isLeft = (keys.has('KeyA') || keys.has('ArrowLeft')) && !isWeaponWheelOpen;
                const isRight = (keys.has('KeyD') || keys.has('ArrowRight')) && !isWeaponWheelOpen;
                const isHandbrake = keys.has('Space') && !isWeaponWheelOpen;

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

                // Re-calculate after engine force
                vFwd = car.velocity.x * cos + car.velocity.y * sin;
                vLat = -car.velocity.x * sin + car.velocity.y * cos;

                if (Math.abs(vFwd) > 0.1) {
                    const dir = vFwd > 0 ? 1 : -1;
                    const steerFactor = Math.min(Math.abs(vFwd) / 3, 1);
                    if (isLeft) car.angle -= car.handling * dir * steerFactor;
                    if (isRight) car.angle += car.handling * dir * steerFactor;
                }
                
                // Wobble effect for popped tires
                if (Math.abs(vFwd) > 3 && poppedTires > 0) {
                    car.angle += (Math.random() - 0.5) * 0.05 * poppedTires;
                    // Spark particles
                    if (Math.random() < 0.2 * poppedTires) {
                         const offset = Math.random() > 0.5 ? 10 : -10;
                         const sparkPos = {
                             x: car.pos.x + Math.cos(car.angle + Math.PI/2) * offset,
                             y: car.pos.y + Math.sin(car.angle + Math.PI/2) * offset
                         };
                         spawnParticle(sparkPos, 'spark', 1, { color: '#fbbf24', speed: 2 });
                    }
                }

                vFwd *= drag;
                vLat *= (1 - grip);
                
                // Drift smoke
                if (Math.abs(vLat) > 2.0 && isOffRoad === false) {
                     spawnParticle(car.pos, 'smoke', 1, { color: 'rgba(200,200,200,0.1)', speed: 0.2 });
                }

                const nCos = Math.cos(car.angle);
                const nSin = Math.sin(car.angle);
                car.velocity.x = vFwd * nCos - vLat * nSin;
                car.velocity.y = vFwd * nSin + vLat * nCos;
                
                // Max Speed reduced by damage
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

                if (!isSolid(getTileAt(mapRef.current, nextX, nextY))) {
                    car.pos.x = nextX;
                    car.pos.y = nextY;
                } else {
                    // Collision Physics
                    const impactForce = Math.abs(car.speed);
                    car.velocity.x *= -0.5;
                    car.velocity.y *= -0.5;
                    
                    if (impactForce > 4) {
                         car.health -= impactForce * 1.5;
                         
                         // Damage windows on high impact
                         if (impactForce > 8) {
                             if (Math.random() > 0.6) car.damage.windows[0] = true; // Front
                             if (Math.random() > 0.6) car.damage.windows[1] = true; // Rear
                             spawnParticle(car.pos, 'debris', 3, { color: '#e5e7eb', speed: 2 });
                         }
                    }
                }

                player.pos.x = car.pos.x;
                player.pos.y = car.pos.y;
                player.angle = car.angle;
            }
        } else {
            // Player Walking
            if (!isWeaponWheelOpen) {
                let dx = 0;
                let dy = 0;
                if (keys.has('KeyW') || keys.has('ArrowUp')) dy = -1;
                if (keys.has('KeyS') || keys.has('ArrowDown')) dy = 1;
                if (keys.has('KeyA') || keys.has('ArrowLeft')) dx = -1;
                if (keys.has('KeyD') || keys.has('ArrowRight')) dx = 1;

                if (dx !== 0 || dy !== 0) {
                    const angle = Math.atan2(dy, dx);
                    player.velocity.x += Math.cos(angle) * ACCELERATION_WALK;
                    player.velocity.y += Math.sin(angle) * ACCELERATION_WALK;
                    player.angle = angle;
                    
                    if (player.state !== 'punching') player.state = 'walking';
                } else {
                    if (player.state !== 'punching') player.state = 'idle';
                }
            }

            // Handle Punching State Timer
            if (player.state === 'punching') {
                if (player.actionTimer && player.actionTimer > 0) {
                    player.actionTimer--;
                } else {
                    player.state = 'idle';
                }
            }

            const shootKey = keys.has('Space');
            const weaponStats = WEAPON_STATS[player.weapon];
            if (shootKey && !isWeaponWheelOpen) {
                if (lastShotTimeRef.current <= 0) {
                    handleCombat(player);
                    lastShotTimeRef.current = weaponStats.fireRate;
                }
            }
            if (lastShotTimeRef.current > 0) lastShotTimeRef.current--;

            const speed = Math.sqrt(player.velocity.x ** 2 + player.velocity.y ** 2);
            if (speed > MAX_SPEED_WALK) {
                const ratio = MAX_SPEED_WALK / speed;
                player.velocity.x *= ratio;
                player.velocity.y *= ratio;
            }

            player.velocity.x *= 0.8;
            player.velocity.y *= 0.8;

            const nextX = player.pos.x + player.velocity.x;
            const nextY = player.pos.y + player.velocity.y;

            const wallCollision = isSolid(getTileAt(mapRef.current, nextX, nextY));
            
            // Player-Vehicle Collision
            let carCollision = false;
            for(const v of vehiclesRef.current) {
                // Quick bounding circle check first
                if (Math.abs(v.pos.x - nextX) > 50 || Math.abs(v.pos.y - nextY) > 50) continue;
                
                if (checkPointInVehicle(nextX, nextY, v, PLAYER_SIZE.x/2)) {
                    carCollision = true;
                    break;
                }
            }

            if (!wallCollision && !carCollision) {
                player.pos.x = nextX;
                player.pos.y = nextY;
            }
        }

        // Bullets
        bulletsRef.current.forEach(b => {
            b.pos.x += b.velocity.x;
            b.pos.y += b.velocity.y;
            b.timeLeft--;
            
            // Rocket Smoke Trail
            if (b.type === 'rocket' && Math.random() > 0.5) {
                spawnParticle(b.pos, 'smoke', 1, { color: '#ccc', speed: 0.5, size: 2 });
            }
        });
        bulletsRef.current = bulletsRef.current.filter(b => {
            if (b.timeLeft <= 0) {
                // Rocket explodes on timeout if not hit
                if (b.type === 'rocket' && b.explosionRadius) createExplosion(b.pos, b.explosionRadius);
                return false;
            }

            if (isSolid(getTileAt(map, b.pos.x, b.pos.y))) {
                if (b.type === 'rocket' && b.explosionRadius) {
                    createExplosion(b.pos, b.explosionRadius);
                } else if (b.type === 'standard') {
                    spawnParticle(b.pos, 'smoke', 3, { color: '#ccc', speed: 1 });
                }
                // Fire passes through walls slightly visually but logic stops here
                return false;
            }

            let hit = false;
            
            // Check Hit Player
            if (b.ownerId !== 'player') {
                const dist = Math.sqrt((player.pos.x - b.pos.x)**2 + (player.pos.y - b.pos.y)**2);
                if (dist < 15) {
                    player.health -= b.damage;
                    spawnParticle(player.pos, 'blood', 6, { color: '#7f1d1d', speed: 2, spread: 3 });
                    hit = true;
                }
            }

            // Check Hit Peds
            pedestriansRef.current.forEach(p => {
                if (p.state === 'dead' || p.id === b.ownerId) return;
                const dist = Math.sqrt((p.pos.x - b.pos.x)**2 + (p.pos.y - b.pos.y)**2);
                if (dist < 15) {
                    if (b.type === 'rocket' && b.explosionRadius) {
                        createExplosion(b.pos, b.explosionRadius);
                        hit = true;
                    } else {
                        p.health -= b.damage;
                        if (b.type !== 'fire') spawnParticle(p.pos, 'blood', 6, { color: '#7f1d1d', speed: 2, spread: 3 });
                        
                        if (p.health <= 0) {
                            p.state = 'dead';
                            if (b.ownerId === 'player') wantedRef.current = Math.min(wantedRef.current + 1, 5);
                        } else {
                            if (p.role !== 'police') {
                                p.state = 'fleeing';
                                p.actionTimer = 180;
                            }
                        }
                        // Fire pierces, others don't
                        if (b.type !== 'fire') hit = true;
                    }
                }
            });
            if (hit) return false;
            
            vehiclesRef.current.forEach(v => {
                const dist = Math.sqrt((v.pos.x - b.pos.x)**2 + (v.pos.y - b.pos.y)**2);
                if (dist < 25) { // Hitbox check
                     if (b.type === 'rocket' && b.explosionRadius) {
                         createExplosion(b.pos, b.explosionRadius);
                         hit = true;
                     } else {
                         v.health -= 5;
                         if (b.type !== 'fire') {
                            spawnParticle(b.pos, 'spark', 4, { color: '#fbbf24', speed: 3 });
                            hit = true;
                         }

                         // Standard bullet damage components logic...
                         if (b.type === 'standard') {
                            // ... existing logic for tires/windows ...
                             const dx = b.pos.x - v.pos.x;
                             const dy = b.pos.y - v.pos.y;
                             const spriteAngle = v.angle + Math.PI/2;
                             const sx = dx * Math.cos(-spriteAngle) - dy * Math.sin(-spriteAngle);
                             const sy = dx * Math.sin(-spriteAngle) + dy * Math.cos(-spriteAngle);
                             
                             const halfLen = v.size.y / 2;
                             const halfWidth = v.size.x / 2;
                             
                             if (Math.abs(sx) > halfWidth * 0.6) {
                                 if (sy < -halfLen * 0.5) v.damage.tires[0] = true;
                                 else if (sy < 0) v.damage.tires[0] = true;
                                 else if (sy > halfLen * 0.5) v.damage.tires[2] = true;
                                 else v.damage.tires[2] = true;
                                 
                                 if (sx < 0 && sy < 0) v.damage.tires[0] = true;
                                 if (sx > 0 && sy < 0) v.damage.tires[1] = true;
                                 if (sx < 0 && sy > 0) v.damage.tires[2] = true;
                                 if (sx > 0 && sy > 0) v.damage.tires[3] = true;
                             }
                         }
                     }
                }
            });
            if (hit) return false;
            return true;
        });

        // AI & Police Logic
        pedestriansRef.current.forEach(p => {
            if (p.state === 'dead') return;
            if (p.actionTimer && p.actionTimer > 0) p.actionTimer--;
            else {
                 if (p.state === 'fleeing') { p.state = 'walking'; p.actionTimer = 100; }
                 else if (p.state === 'shooting') { p.state = 'chasing'; p.actionTimer = 60; }
                 else if (Math.random() > 0.95) { p.angle += (Math.random()-0.5); p.actionTimer = 50; }
            }
            
            // Police Chase Logic
            if (p.role === 'police' && wantedRef.current > 0) {
                 const dx = player.pos.x - p.pos.x;
                 const dy = player.pos.y - p.pos.y;
                 const dist = Math.sqrt(dx*dx + dy*dy);
                 
                 // Turn towards player
                 p.angle = Math.atan2(dy, dx);
                 
                 if (dist < 300) {
                     // In Range
                     if (dist < 150) {
                         // Shoot
                         if (Math.random() > 0.92) {
                             handleCombat(p);
                             p.state = 'shooting';
                             p.actionTimer = 30;
                         } else {
                             p.state = 'idle'; // Hold position to shoot
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
                if (p.state === 'chasing') spd = PEDESTRIAN_RUN_SPEED * 0.85; // Cops run slightly slower than sprint to allow escape

                p.velocity.x = Math.cos(p.angle) * spd;
                p.velocity.y = Math.sin(p.angle) * spd;
                
                const nextX = p.pos.x + p.velocity.x;
                const nextY = p.pos.y + p.velocity.y;
                if (!isSolid(getTileAt(map, nextX, nextY))) {
                    p.pos.x = nextX;
                    p.pos.y = nextY;
                } else {
                    p.angle += Math.PI + (Math.random() - 0.5);
                }
            }
        });

        // Camera Follow
        const targetCamX = player.pos.x - window.innerWidth / 2;
        const targetCamY = player.pos.y - window.innerHeight / 2;
        cameraRef.current.x += (targetCamX - cameraRef.current.x) * 0.1;
        cameraRef.current.y += (targetCamY - cameraRef.current.y) * 0.1;

        if (timeTickerRef.current % 10 === 0) {
             onGameStateUpdate({
                player: playerRef.current,
                vehicles: vehiclesRef.current,
                pedestrians: pedestriansRef.current,
                bullets: bulletsRef.current,
                particles: particlesRef.current,
                map: mapRef.current,
                camera: cameraRef.current,
                money: moneyRef.current,
                wantedLevel: wantedRef.current,
                mission: activeMission,
                isPhoneOpen,
                paused: false,
                timeOfDay: timeOfDayRef.current
            });
        }
    };

    // --- DRAWING ENGINE ---
    
    const drawBuilding = (ctx: CanvasRenderingContext2D, x: number, y: number, tileType: TileType) => {
        const height = tileType === TileType.HOSPITAL || tileType === TileType.POLICE_STATION ? 70 : 50; 
        const w = TILE_SIZE;
        const h = TILE_SIZE;

        // Base wall color
        let wallColor = '#262626';
        let roofColor = '#3f3f46'; // Zinc-700
        
        if (tileType === TileType.HOSPITAL) {
            wallColor = '#d1d5db';   // Gray-300
            roofColor = '#f3f4f6';      // Gray-100
        } else if (tileType === TileType.POLICE_STATION) {
            wallColor = '#1e3a8a'; // Blue-900
            roofColor = '#334155';      // Slate-700
        }

        // Shadow cast
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(x + 10, y + 10, w, h);

        // -- Walls (Extrusion) --
        // Gradient for depth
        const wallGrad = ctx.createLinearGradient(x, y + h, x, y + h + height);
        wallGrad.addColorStop(0, '#000000');
        wallGrad.addColorStop(1, wallColor);
        ctx.fillStyle = wallGrad;
        ctx.fillRect(x, y + h, w, height);

        // Wall Details (Windows)
        // Draw rows of windows to simulate stories
        if (tileType !== TileType.GRASS) {
             const windowColor = tileType === TileType.HOSPITAL ? '#38bdf8' : '#1e293b';
             const stories = Math.floor(height / 15);
             const cols = Math.floor(w / 12);
             
             ctx.fillStyle = windowColor;
             for (let s=0; s < stories; s++) {
                 for (let c=0; c < cols; c++) {
                     // Don't draw every window, make it look organic
                     if ((x + y + s + c) % 7 !== 0) { 
                        const wy = y + h + 5 + s * 14;
                        const wx = x + 4 + c * 10;
                        if (wx + 6 < x + w) {
                            ctx.fillRect(wx, wy, 6, 8);
                        }
                     }
                 }
             }
        }

        // -- Roof --
        ctx.fillStyle = roofColor;
        ctx.fillRect(x, y, w, h);
        
        // Roof Noise/Texture
        ctx.fillStyle = 'rgba(0,0,0,0.05)';
        if ((x+y) % 2 === 0) ctx.fillRect(x, y, w, h/2);
        
        // Roof Border (Parapet)
        ctx.strokeStyle = '#525252';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);

        // -- Rooftop Clutter (Deterministic based on position) --
        const seed = x * 13 + y * 7;
        const hasAC = seed % 3 === 0;
        const hasVent = seed % 5 === 0;
        const hasPipe = seed % 4 === 0;
        
        // Special Roof Markers
        if (tileType === TileType.HOSPITAL) {
            const centerX = x + w/2;
            const centerY = y + h/2;
            
            // H for Helipad
            ctx.fillStyle = '#ef4444';
            ctx.beginPath(); ctx.arc(centerX, centerY, 20, 0, Math.PI * 2); ctx.fill();
            
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(centerX, centerY, 16, 0, Math.PI * 2); ctx.stroke();

            ctx.fillStyle = '#fff';
            ctx.font = '900 20px sans-serif'; 
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('H', centerX, centerY + 1);

        } else if (tileType === TileType.POLICE_STATION) {
            // Police Helipad / Siren lights
            const centerX = x + w/2;
            const centerY = y + h/2;

            ctx.strokeStyle = '#fbbf24'; 
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(centerX, centerY, 20, 0, Math.PI * 2); ctx.stroke();
            
            ctx.fillStyle = '#fbbf24';
            ctx.font = '900 20px sans-serif'; 
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('P', centerX, centerY + 1);

            // Blinking lights on corners
            const time = Date.now() / 200;
            const blinkBlue = Math.floor(time) % 2 === 0 ? '#3b82f6' : '#1d4ed8';
            const blinkRed = Math.floor(time) % 2 !== 0 ? '#ef4444' : '#991b1b';

            ctx.fillStyle = blinkBlue;
            ctx.fillRect(x, y, 6, 6);
            ctx.fillStyle = blinkRed;
            ctx.fillRect(x + w - 6, y, 6, 6);
            ctx.fillStyle = blinkRed;
            ctx.fillRect(x, y + h - 6, 6, 6);
            ctx.fillStyle = blinkBlue;
            ctx.fillRect(x + w - 6, y + h - 6, 6, 6);
            
        } else {
            // General Clutter
            if (hasAC) {
                const acX = x + 8 + (seed % 20);
                const acY = y + 8 + (seed % 20);
                // Box
                ctx.fillStyle = '#d4d4d8';
                ctx.fillRect(acX, acY, 14, 14);
                // Fan
                ctx.fillStyle = '#525252';
                ctx.beginPath(); ctx.arc(acX + 7, acY + 7, 5, 0, Math.PI*2); ctx.fill();
            }
            if (hasVent) {
                 const vX = x + w - 16;
                 const vY = y + 10;
                 ctx.fillStyle = '#737373';
                 ctx.fillRect(vX, vY, 8, 8);
                 ctx.fillStyle = '#171717';
                 ctx.fillRect(vX+2, vY+2, 4, 4);
            }
            if (hasPipe) {
                ctx.strokeStyle = '#525252';
                ctx.lineWidth = 2;
                ctx.beginPath(); 
                ctx.moveTo(x + 5, y + 5);
                ctx.lineTo(x + 5, y + h - 10);
                ctx.lineTo(x + w - 10, y + h - 10);
                ctx.stroke();
            }
        }
    };

    const drawRoad = (ctx: CanvasRenderingContext2D, x: number, y: number, type: number) => {
        // Base asphalt texture
        ctx.fillStyle = groundTexturesRef.current['road'] || COLORS.road;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        
        // Markings
        ctx.lineWidth = 4;
        
        if (type === TileType.ROAD_H) {
             // Double Yellow
             ctx.strokeStyle = '#d97706'; // Amber-600
             ctx.beginPath();
             ctx.moveTo(x, y + TILE_SIZE/2 - 3);
             ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE/2 - 3);
             ctx.stroke();
             ctx.beginPath();
             ctx.moveTo(x, y + TILE_SIZE/2 + 3);
             ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE/2 + 3);
             ctx.stroke();
             // White Edges
             ctx.strokeStyle = '#a8a29e';
             ctx.lineWidth = 2;
             ctx.beginPath(); ctx.moveTo(x, y+4); ctx.lineTo(x+TILE_SIZE, y+4); ctx.stroke();
             ctx.beginPath(); ctx.moveTo(x, y+60); ctx.lineTo(x+TILE_SIZE, y+60); ctx.stroke();
        } else if (type === TileType.ROAD_V) {
             // Double Yellow
             ctx.strokeStyle = '#d97706';
             ctx.lineWidth = 4;
             ctx.beginPath();
             ctx.moveTo(x + TILE_SIZE/2 - 3, y);
             ctx.lineTo(x + TILE_SIZE/2 - 3, y + TILE_SIZE);
             ctx.stroke();
             ctx.beginPath();
             ctx.moveTo(x + TILE_SIZE/2 + 3, y);
             ctx.lineTo(x + TILE_SIZE/2 + 3, y + TILE_SIZE);
             ctx.stroke();
             // White Edges
             ctx.strokeStyle = '#a8a29e';
             ctx.lineWidth = 2;
             ctx.beginPath(); ctx.moveTo(x+4, y); ctx.lineTo(x+4, y+TILE_SIZE); ctx.stroke();
             ctx.beginPath(); ctx.moveTo(x+60, y); ctx.lineTo(x+60, y+TILE_SIZE); ctx.stroke();
        } else if (type === TileType.ROAD_CROSS) {
            // Crosswalk
            ctx.fillStyle = '#a8a29e';
            for (let i = 4; i < TILE_SIZE; i += 12) {
                ctx.fillRect(x + i, y + 2, 6, 16); // Top
                ctx.fillRect(x + i, y + 46, 6, 16); // Bottom
                ctx.fillRect(x + 2, y + i, 16, 6); // Left
                ctx.fillRect(x + 46, y + i, 16, 6); // Right
            }
        }
    };

    const drawVehicle = (ctx: CanvasRenderingContext2D, v: Vehicle) => {
        ctx.save();
        ctx.translate(v.pos.x, v.pos.y);
        ctx.rotate(v.angle + Math.PI/2); // Fixed rotation alignment

        const halfW = v.size.x / 2;
        const halfL = v.size.y / 2;

        // --- Shadow ---
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 4;

        // --- Tires ---
        // Draw tires first so they are under the body
        // But with shadow enabled, we might want them separate or just let the body shadow cover them.
        // Actually, let's draw tires without shadowBlur to keep them crisp
        const wheelW = 5;
        const wheelL = 12;
        const axleFront = -halfL * 0.65;
        const axleRear = halfL * 0.65;
        const wheelInset = halfW - 2;

        const drawWheel = (x: number, y: number, isPopped: boolean) => {
            ctx.fillStyle = isPopped ? '#1f2937' : '#09090b';
            ctx.fillRect(x - wheelW/2, y - wheelL/2, wheelW, wheelL);
            // Rim
            if (!isPopped) {
                ctx.fillStyle = '#525252'; 
                ctx.fillRect(x - 1, y - 2, 2, 4);
            }
        };

        // Draw wheels (temporarily disable shadow for wheels)
        ctx.shadowColor = 'transparent';
        drawWheel(-wheelInset, axleFront, v.damage.tires[0]); // FL
        drawWheel(wheelInset, axleFront, v.damage.tires[1]);  // FR
        drawWheel(-wheelInset, axleRear, v.damage.tires[2]);  // RL
        drawWheel(wheelInset, axleRear, v.damage.tires[3]);   // RR

        // Re-enable shadow for Body
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        
        // --- Body Gradient (Metallic Effect) ---
        // Create a gradient that simulates a cylinder reflecting light (dark edges, light center)
        const bodyGrad = ctx.createLinearGradient(-halfW, 0, halfW, 0);
        bodyGrad.addColorStop(0, '#000000'); // Dark Edge
        bodyGrad.addColorStop(0.15, v.color); // Base Color
        bodyGrad.addColorStop(0.5, '#ffffffaa'); // Specular Highlight (Simulated reflection)
        bodyGrad.addColorStop(0.85, v.color); // Base Color
        bodyGrad.addColorStop(1, '#000000'); // Dark Edge

        ctx.fillStyle = bodyGrad;

        // Draw Chassis based on model
        if (v.model === 'truck' || v.model === 'van' || v.model === 'ambulance') {
             ctx.beginPath(); ctx.roundRect(-halfW, -halfL, v.size.x, v.size.y, 3); ctx.fill();
        } else if (v.model === 'sport' || v.model === 'muscle') {
             // Tapered Nose
             ctx.beginPath();
             ctx.moveTo(-halfW, axleRear + 5);
             ctx.lineTo(-halfW, -halfL + 8);
             ctx.quadraticCurveTo(0, -halfL - 5, halfW, -halfL + 8);
             ctx.lineTo(halfW, axleRear + 5);
             ctx.lineTo(halfW - 2, halfL);
             ctx.lineTo(-halfW + 2, halfL);
             ctx.closePath();
             ctx.fill();
        } else {
             ctx.beginPath(); ctx.roundRect(-halfW, -halfL, v.size.x, v.size.y, 4); ctx.fill();
        }

        ctx.shadowBlur = 0; // Disable shadow for internal details
        ctx.shadowOffsetX = 0; 
        ctx.shadowOffsetY = 0;

        // --- Cabin / Roof ---
        const cabinWidth = v.size.x - 6;
        const cabinLen = v.size.y * 0.55;
        const cabinY = -v.size.y * 0.1; // Centered-ish

        // Windshields (Dark Glass)
        ctx.fillStyle = '#0f172a';
        ctx.beginPath(); 
        ctx.roundRect(-cabinWidth/2, cabinY - cabinLen/2, cabinWidth, cabinLen, 4); 
        ctx.fill();

        // Roof Top (Painted)
        // Usually slightly smaller than glass area to leave "windshields" exposed
        const roofLen = cabinLen * 0.7;
        const roofGrad = ctx.createLinearGradient(-halfW, 0, halfW, 0);
        roofGrad.addColorStop(0, v.color); 
        roofGrad.addColorStop(0.5, '#ffffff88'); 
        roofGrad.addColorStop(1, v.color);
        
        ctx.fillStyle = roofGrad;
        
        if (v.model === 'truck') {
            // Truck bed area
            ctx.fillStyle = '#262626'; // Dark bed liner
            ctx.fillRect(-halfW + 2, 0, v.size.x - 4, v.size.y/2 - 2);
            // Cab roof
            ctx.fillStyle = roofGrad;
            ctx.fillRect(-halfW + 2, -halfL + 5, v.size.x - 4, v.size.y * 0.35);
        } else {
            // Standard Roof
            ctx.beginPath(); 
            ctx.roundRect(-cabinWidth/2 + 2, cabinY - roofLen/2, cabinWidth - 4, roofLen, 2); 
            ctx.fill();
        }

        // --- Glass Reflections ---
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        // Front Windshield Glint
        ctx.beginPath();
        ctx.moveTo(cabinWidth/2, cabinY - cabinLen/2);
        ctx.lineTo(cabinWidth/2 - 10, cabinY - cabinLen/2);
        ctx.lineTo(cabinWidth/2, cabinY - cabinLen/2 + 10);
        ctx.fill();
        
        // Rear Glint
        ctx.beginPath();
        ctx.moveTo(-cabinWidth/2, cabinY + cabinLen/2);
        ctx.lineTo(-cabinWidth/2 + 10, cabinY + cabinLen/2);
        ctx.lineTo(-cabinWidth/2, cabinY + cabinLen/2 - 10);
        ctx.fill();


        // --- Details ---
        // Headlights (Bloom)
        ctx.shadowColor = '#fde047';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(-halfW + 3, -halfL, 5, 2);
        ctx.fillRect(halfW - 8, -halfL, 5, 2);
        ctx.shadowBlur = 0;

        // Taillights (Bloom)
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-halfW + 3, halfL - 2, 5, 2);
        ctx.fillRect(halfW - 8, halfL - 2, 5, 2);
        ctx.shadowBlur = 0;

        // Spoilers
        if (v.model === 'sport' || v.model === 'muscle') {
            ctx.fillStyle = '#000'; // Carbon
            ctx.fillRect(-halfW, halfL - 6, v.size.x, 4);
        }

        // Mirrors
        ctx.fillStyle = v.color;
        ctx.beginPath(); ctx.arc(-halfW - 1, cabinY - cabinLen/3, 2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(halfW + 1, cabinY - cabinLen/3, 2, 0, Math.PI*2); ctx.fill();

        // Special Markings
        if (v.model === 'taxi') {
             ctx.fillStyle = '#000'; // Sign bg
             ctx.fillRect(-5, -6, 10, 4);
             ctx.fillStyle = '#fbbf24'; // Yellow
             ctx.fillRect(-2, -5, 4, 2);
        } else if (v.model === 'police') {
            // White Doors
            ctx.fillStyle = '#fff';
            ctx.fillRect(-halfW + 1, -5, halfW * 2 - 2, 20); // Side markings approximation
            
            // Lightbar
            const blink = Math.floor(Date.now() / 150) % 2 === 0;
            ctx.shadowBlur = 15;
            ctx.shadowColor = blink ? '#ef4444' : '#3b82f6';
            ctx.fillStyle = blink ? '#ef4444' : '#3b82f6'; // Red
            ctx.fillRect(-10, -5, 8, 4);
            
            ctx.shadowColor = blink ? '#3b82f6' : '#ef4444';
            ctx.fillStyle = blink ? '#3b82f6' : '#ef4444'; // Blue
            ctx.fillRect(2, -5, 8, 4);
            ctx.shadowBlur = 0;
        }

        // Damage Cracks
        if (v.damage.windows[0]) {
            ctx.strokeStyle = 'rgba(255,255,255,0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath(); 
            ctx.moveTo(0, cabinY - cabinLen/2 + 2); 
            ctx.lineTo(-4, cabinY - cabinLen/2 + 8); 
            ctx.lineTo(3, cabinY - cabinLen/2 + 5); 
            ctx.stroke();
        }

        ctx.restore();
    };

    const drawCharacter = (ctx: CanvasRenderingContext2D, p: Pedestrian) => {
        ctx.save();
        ctx.translate(p.pos.x, p.pos.y);
        ctx.rotate(p.angle);

        // Walking Animation (Legs)
        if (p.state === 'walking' || p.state === 'fleeing' || p.state === 'chasing') {
            const time = Date.now() / 100;
            const legOffset = Math.sin(time) * 4;
            ctx.fillStyle = p.role === 'police' ? '#172554' : '#444'; // Police wear dark blue pants
            // Left foot
            ctx.beginPath(); ctx.roundRect(0, -6 + legOffset, 10, 4, 2); ctx.fill();
            // Right foot
            ctx.beginPath(); ctx.roundRect(0, 2 - legOffset, 10, 4, 2); ctx.fill();
        } else {
            // Idle feet
            ctx.fillStyle = p.role === 'police' ? '#172554' : '#444';
            ctx.beginPath(); ctx.roundRect(0, -6, 10, 4, 2); ctx.fill();
            ctx.beginPath(); ctx.roundRect(0, 2, 10, 4, 2); ctx.fill();
        }

        // Body
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.roundRect(-5, -7, 12, 14, 4); ctx.fill();
        
        // Police Badge
        if (p.role === 'police') {
             ctx.fillStyle = '#fbbf24';
             ctx.beginPath(); ctx.arc(2, -3, 2, 0, Math.PI*2); ctx.fill();
        }

        // Head
        ctx.fillStyle = '#fca5a5'; // Skin
        ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
        
        // Police Hat
        if (p.role === 'police') {
            ctx.fillStyle = '#1e3a8a';
            ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#172554'; // Visor
            ctx.fillRect(3, -5, 3, 10);
        } else {
            // Hair (Black dot)
            ctx.fillStyle = '#222';
            ctx.beginPath(); ctx.arc(-1, 0, 4, 0, Math.PI * 2); ctx.fill();
        }

        // Arms
        ctx.fillStyle = p.role === 'police' ? '#1e3a8a' : '#fca5a5'; // Long sleeves for cops
        
        let punchOffset = 0;
        if (p.state === 'punching') {
            // Simple ease-out-in animation for punch
            const t = (p.actionTimer || 0) / 15; // 1 to 0
            // Sine wave to go out and back: 0 -> 1 -> 0
            punchOffset = Math.sin(t * Math.PI) * 12; 
        }

        // Left Arm (Normal)
        ctx.beginPath(); ctx.roundRect(2, -8, 8, 3, 2); ctx.fill();
        // Right Arm (Punching/Shooting)
        ctx.beginPath(); ctx.roundRect(2 + punchOffset, 5, 8, 3, 2); ctx.fill();

        // Hand skin for cops if long sleeves
        if (p.role === 'police') {
            ctx.fillStyle = '#fca5a5';
            ctx.beginPath(); ctx.arc(10, -6, 2.5, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(10 + punchOffset, 6, 2.5, 0, Math.PI*2); ctx.fill();
        }

        // Weapon
        if (p.weapon !== 'fist') {
            ctx.fillStyle = '#111';
            // Simple gun shape
            if (p.weapon === 'rocket') {
                 // RPG shape
                 ctx.fillStyle = '#3f6212';
                 ctx.fillRect(6, -1, 16, 4);
                 ctx.fillStyle = '#57534e';
                 ctx.fillRect(20, -2, 6, 6); // Warhead
            } else if (p.weapon === 'flame') {
                 // Flamethrower
                 ctx.fillStyle = '#ea580c';
                 ctx.fillRect(6, 0, 14, 3);
                 ctx.fillStyle = '#333';
                 ctx.fillRect(8, 3, 2, 4); // Tube
            } else {
                ctx.fillRect(8, 2, 12, 2); 
                if (p.weapon === 'uzi' || p.weapon === 'shotgun') {
                    ctx.fillRect(8, 4, 4, 4); // Grip
                }
            }
        }

        ctx.restore();
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
        const cam = cameraRef.current;
        const map = mapRef.current;
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        
        // Permanent Day Mode
        const darkness = 0;
        const isNight = false;

        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.translate(-Math.floor(cam.x), -Math.floor(cam.y)); // Pixel snap

        const startCol = Math.floor(cam.x / TILE_SIZE);
        const endCol = startCol + (width / TILE_SIZE) + 1;
        const startRow = Math.floor(cam.y / TILE_SIZE);
        const endRow = startRow + (height / TILE_SIZE) + 1;

        // LAYER 1: GROUND
        for (let y = startRow; y <= endRow; y++) {
            for (let x = startCol; x <= endCol; x++) {
                if (y >= 0 && y < MAP_HEIGHT && x >= 0 && x < MAP_WIDTH) {
                    const tile = map[y][x];
                    const px = x * TILE_SIZE;
                    const py = y * TILE_SIZE;
                    
                    if (tile === TileType.GRASS) {
                        ctx.fillStyle = groundTexturesRef.current['grass'] || COLORS.grass;
                        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                        // Procedural Trees
                        const seed = (x * 123 + y * 456);
                        if (seed % 7 === 0) {
                            // Tree Shadow
                            ctx.fillStyle = 'rgba(0,0,0,0.4)';
                            ctx.beginPath(); ctx.arc(px + 35, py + 35, 18, 0, Math.PI*2); ctx.fill();
                            // Tree Top
                            ctx.fillStyle = '#14532d'; // Darker green
                            ctx.beginPath(); ctx.arc(px + 32, py + 32, 16, 0, Math.PI*2); ctx.fill();
                            ctx.fillStyle = '#166534'; // Lighter center
                            ctx.beginPath(); ctx.arc(px + 32, py + 32, 10, 0, Math.PI*2); ctx.fill();
                        }
                    } else if (tile === TileType.SIDEWALK) {
                        ctx.fillStyle = groundTexturesRef.current['sidewalk'] || COLORS.sidewalk;
                        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                        // Curb border
                        ctx.strokeStyle = '#57534e';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
                        // Streetlight base check (corners)
                        if (x % 5 === 0 && y % 5 === 0) {
                             ctx.fillStyle = '#222';
                             ctx.beginPath(); ctx.arc(px+TILE_SIZE, py+TILE_SIZE, 3, 0, Math.PI*2); ctx.fill();
                        }
                    } else if (tile === TileType.BUILDING || tile === TileType.HOSPITAL || tile === TileType.POLICE_STATION) {
                         // Ground under building
                         ctx.fillStyle = '#222';
                         ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    } else if (tile === TileType.WATER) {
                        ctx.fillStyle = COLORS.water;
                        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                        // Animated Waves
                        ctx.fillStyle = 'rgba(255,255,255,0.1)';
                        const offset = (Date.now() / 50) % 20;
                        ctx.beginPath();
                        ctx.arc(px + 20 + offset, py + 20, 5, 0, Math.PI*2);
                        ctx.fill();
                    } else {
                        drawRoad(ctx, px, py, tile);
                    }
                }
            }
        }
        
        // LAYER 3: ENTITIES
        // Dead bodies
        pedestriansRef.current.forEach(p => {
             if (p.state === 'dead') {
                 ctx.save();
                 ctx.translate(p.pos.x, p.pos.y);
                 // Blood pool
                 ctx.fillStyle = '#7f1d1d';
                 ctx.globalAlpha = 0.8;
                 ctx.beginPath(); ctx.ellipse(0, 0, 15, 12, Math.random(), 0, Math.PI*2); ctx.fill();
                 ctx.globalAlpha = 1;
                 // Body
                 ctx.rotate(p.angle);
                 ctx.fillStyle = p.color;
                 ctx.fillRect(-8,-4,16,8);
                 ctx.restore();
             }
        });

        // Vehicles
        vehiclesRef.current.forEach(v => {
             drawVehicle(ctx, v);
        });

        // Living Peds
        pedestriansRef.current.forEach(p => {
            if (p.state !== 'dead') drawCharacter(ctx, p);
        });

        // Player (if not driving)
        if (!playerRef.current.vehicleId) {
            drawCharacter(ctx, playerRef.current);
        }

        // Bullets (Glowing)
        bulletsRef.current.forEach(b => {
            if (b.type === 'rocket') {
                 ctx.fillStyle = '#57534e';
                 ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, 3, 0, Math.PI*2); ctx.fill();
            } else if (b.type === 'fire') {
                 // Already handled by particles essentially, but we draw core heat
                 ctx.fillStyle = 'rgba(255, 100, 0, 0.3)';
                 ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, 4, 0, Math.PI*2); ctx.fill();
            } else {
                ctx.shadowColor = '#fbbf24';
                ctx.shadowBlur = 10;
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, 2, 0, Math.PI*2); ctx.fill();
                ctx.shadowBlur = 0;
                // Trail
                ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
                ctx.beginPath(); ctx.moveTo(b.pos.x, b.pos.y); 
                ctx.lineTo(b.pos.x - b.velocity.x, b.pos.y - b.velocity.y);
                ctx.stroke();
            }
        });

        // Particles
        particlesRef.current.forEach(p => {
             ctx.globalAlpha = p.life / p.maxLife;
             ctx.fillStyle = p.color;
             ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.size, 0, Math.PI*2); ctx.fill();
             ctx.globalAlpha = 1;
        });

        // LAYER 4: BUILDINGS & ROOFS (Pseudo 3D)
        for (let y = startRow; y <= endRow; y++) {
            for (let x = startCol; x <= endCol; x++) {
                if (y >= 0 && y < MAP_HEIGHT && x >= 0 && x < MAP_WIDTH) {
                    const tile = map[y][x];
                    if (tile === TileType.BUILDING || tile === TileType.HOSPITAL || tile === TileType.POLICE_STATION) {
                        drawBuilding(ctx, x * TILE_SIZE, y * TILE_SIZE, tile);
                    }
                }
            }
        }

        ctx.restore();
    };

    const gameLoop = useCallback((time: number) => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;
        updatePhysics();
        draw(ctx);
        requestRef.current = requestAnimationFrame(gameLoop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isWeaponWheelOpen, activeWeapon]);

    // Resize Handler
    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current) {
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <canvas 
            ref={canvasRef} 
            className="block w-full h-full"
        />
    );
};

export default GameCanvas;
