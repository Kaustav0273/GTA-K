
import React, { useRef, useEffect, useCallback } from 'react';
import { 
    GameState, Pedestrian, Vehicle, EntityType, Vector2, TileType, WeaponType, GameSettings 
} from '../types';
import { 
    MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, PLAYER_SIZE, CAR_SIZE, CAR_MODELS, STAMINA_MAX, COLORS, CAR_COLORS
} from '../constants';
import { generateMap, getTileAt, createNoiseTexture, isSolid } from '../utils/gameUtils';
import { MutableGameState, updatePhysics, checkPointInVehicle, spawnParticle, isPoliceNearby, playerInteract } from '../game/physics';
import { renderGame } from '../game/renderer';

interface GameCanvasProps {
    onGameStateUpdate: (state: GameState) => void;
    onPhoneToggle: (isOpen: boolean) => void;
    isPhoneOpen: boolean;
    activeMission: any;
    onWeaponWheelToggle: (isOpen: boolean) => void;
    isWeaponWheelOpen: boolean;
    activeWeapon: WeaponType;
    settings: GameSettings;
    paused: boolean;
    initialGameState: GameState;
    syncGameState?: GameState;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ 
    onGameStateUpdate, isPhoneOpen, activeMission, 
    onWeaponWheelToggle, isWeaponWheelOpen, activeWeapon,
    settings, paused, initialGameState, syncGameState
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);
    const keysPressed = useRef<Set<string>>(new Set());
    const groundTexturesRef = useRef<{ [key: string]: CanvasPattern | null }>({});
    const lastFrameTimeRef = useRef<number>(0);
    
    // Refs to access latest props in gameLoop without closure staleness
    const propsRef = useRef({ isPhoneOpen, activeMission, settings, paused });
    useEffect(() => {
        propsRef.current = { isPhoneOpen, activeMission, settings, paused };
    }, [isPhoneOpen, activeMission, settings, paused]);
    
    // Mutable Game State Container
    // Initialize with props if available (Load Game), otherwise defaults
    const gameStateRef = useRef<MutableGameState>(
        (initialGameState && initialGameState.map && initialGameState.map.length > 0) 
        ? {
            ...initialGameState,
            // Ensure runtime properties that might be missing from JSON save are present
            lastShotTime: 0,
            timeTicker: initialGameState.timeTicker || 0,
            hospitalPos: (initialGameState as any).hospitalPos || { x: 0, y: 0 },
            isWeaponWheelOpen: false,
            lastDamageTaken: (initialGameState as any).lastDamageTaken || 0,
            lastWantedTime: (initialGameState as any).lastWantedTime || 0,
            activeShop: (initialGameState as any).activeShop || 'none',
            isWasted: false,
            wastedStartTime: 0
        }
        : {
            player: {
                id: 'player', type: EntityType.PLAYER, role: 'civilian',
                pos: { x: TILE_SIZE * 5, y: TILE_SIZE * 5 },
                size: PLAYER_SIZE, angle: 0, velocity: { x: 0, y: 0 },
                color: COLORS.player, health: 100, maxHealth: 100, armor: 0,
                stamina: STAMINA_MAX, maxStamina: STAMINA_MAX, staminaRechargeDelay: 0,
                state: 'idle', vehicleId: null, weapon: 'fist'
            },
            vehicles: [],
            pedestrians: [],
            bullets: [],
            particles: [],
            drops: [],
            map: [],
            camera: { x: 0, y: 0 },
            money: 50,
            wantedLevel: 0,
            timeOfDay: 12,
            lastShotTime: 0,
            timeTicker: 0,
            hospitalPos: { x: 0, y: 0 },
            isWeaponWheelOpen: false,
            lastDamageTaken: 0,
            lastWantedTime: 0,
            activeShop: 'none',
            isWasted: false,
            wastedStartTime: 0
        }
    );

    // Sync Props
    useEffect(() => {
        gameStateRef.current.player.weapon = activeWeapon;
        gameStateRef.current.isWeaponWheelOpen = isWeaponWheelOpen;
    }, [activeWeapon, isWeaponWheelOpen]);

    // Sync State Logic (Fix for Garage Re-entry Loop)
    // When GameCanvas resumes (unpaused), we sync the updated state from App (which has exit velocity/cooldowns)
    useEffect(() => {
        if (!paused && syncGameState) {
            const internal = gameStateRef.current;
            
            // Sync critical parts modified by UI (like CarShop)
            internal.money = syncGameState.money;
            internal.activeShop = 'none'; // Force clear shop state internally
            
            // Sync Vehicles (car upgrades, colors, and critically: push velocity & cooldown)
            // We match by ID to preserve object identity if needed, or just replace array if totally managed externally
            // Replacing is safer for sync
            internal.vehicles = syncGameState.vehicles.map(v => ({...v}));
            
            // Sync Player Weapon just in case
            internal.player.weapon = syncGameState.player.weapon;
        }
    }, [paused, syncGameState]);

    // Initialization
    useEffect(() => {
        const state = gameStateRef.current;
        
        // If map is empty, generate new game world
        if (!state.map || state.map.length === 0) {
            state.map = generateMap();

            // Find Hospital and a valid spawn point on the ROAD in front of it
            let foundHospital = false;
            
            for(let y=0; y<MAP_HEIGHT; y++) {
                for(let x=0; x<MAP_WIDTH; x++) {
                    if(state.map[y][x] === TileType.HOSPITAL) {
                        // Scan a wider area (3 block radius) for a road
                        for(let dy=-3; dy<=3; dy++) {
                            for(let dx=-3; dx<=3; dx++) {
                                const nx = x + dx;
                                const ny = y + dy;
                                
                                if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT) {
                                    const tile = state.map[ny][nx];
                                    if (tile === TileType.ROAD_H || tile === TileType.ROAD_V || tile === TileType.ROAD_CROSS) {
                                        state.hospitalPos = { 
                                            x: nx * TILE_SIZE + TILE_SIZE/2, 
                                            y: ny * TILE_SIZE + TILE_SIZE/2 
                                        };
                                        foundHospital = true; 
                                        break;
                                    }
                                }
                            }
                            if(foundHospital) break;
                        }
                    }
                    if (foundHospital) break;
                }
                if (foundHospital) break;
            }
            
            if (!foundHospital) {
                console.warn("Could not find road spawn for hospital. Defaulting.");
                state.hospitalPos = { x: TILE_SIZE * 5, y: TILE_SIZE * 5 };
            }

            // Set Player to Hospital Spawn immediately
            state.player.pos = { ...state.hospitalPos };

            // Spawn Vehicles
            const modelKeys = Object.keys(CAR_MODELS) as Array<keyof typeof CAR_MODELS>;
            const regularModels = modelKeys.filter(k => k !== 'plane' && k !== 'jet');

            // Determine initial traffic count based on settings provided in props (or default if not available yet in this scope)
            // Using settings passed to component which should be initial value on mount.
            let maxTraffic = 50;
            if (settings.trafficDensity === 'LOW') maxTraffic = 25;
            else if (settings.trafficDensity === 'HIGH') maxTraffic = 75;

            // Use calculated maxTraffic for initial pool
            let trafficCount = maxTraffic;
            let attempts = 0;
            
            while (trafficCount > 0 && attempts < 500) {
                attempts++;
                const x = Math.floor(Math.random() * MAP_WIDTH);
                const y = Math.floor(Math.random() * MAP_HEIGHT);
                const tile = getTileAt(state.map, x * TILE_SIZE, y * TILE_SIZE);
                
                if (tile === TileType.ROAD_H || tile === TileType.ROAD_V || tile === TileType.ROAD_CROSS) {
                    let angle = 0;
                    let posX = x * TILE_SIZE + TILE_SIZE/2;
                    let posY = y * TILE_SIZE + TILE_SIZE/2;

                    if (tile === TileType.ROAD_H) {
                        const dir = Math.random() > 0.5;
                        angle = dir ? 0 : Math.PI;
                        posY = y * TILE_SIZE + (dir ? TILE_SIZE * 0.75 : TILE_SIZE * 0.25);
                    } else if (tile === TileType.ROAD_V) {
                        const dir = Math.random() > 0.5; // True = South, False = North
                        angle = dir ? Math.PI/2 : 3*Math.PI/2;
                        posX = x * TILE_SIZE + (dir ? TILE_SIZE * 0.25 : TILE_SIZE * 0.75);
                    } else {
                        angle = Math.floor(Math.random() * 4) * (Math.PI/2);
                    }

                    let overlap = false;
                    for (const existing of state.vehicles) {
                        if (Math.sqrt((existing.pos.x - posX)**2 + (existing.pos.y - posY)**2) < 80) { overlap = true; break; }
                    }
                    if (overlap) continue;

                    const modelKey = regularModels[Math.floor(Math.random() * regularModels.length)];
                    const model = CAR_MODELS[modelKey];
                    
                    let vehicleColor = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
                    if (['police', 'ambulance', 'swat', 'firetruck', 'taxi'].includes(modelKey)) {
                        vehicleColor = model.color;
                    } else if (modelKey === 'limo') {
                        vehicleColor = Math.random() > 0.5 ? '#000000' : '#ffffff';
                    }
                    
                    state.vehicles.push({
                        id: `traffic-${trafficCount}`, type: EntityType.VEHICLE, pos: { x: posX, y: posY },
                        size: (model as any).size || { x: CAR_SIZE.x, y: CAR_SIZE.y }, angle, velocity: { x: 0, y: 0 },
                        color: vehicleColor, driverId: 'npc', model: modelKey, speed: 0, maxSpeed: model.maxSpeed,
                        acceleration: model.acceleration, handling: model.handling, health: model.health,
                        damage: { tires: [false, false, false, false], windows: [false, false] }, 
                        deformation: { fl: 0, fr: 0, bl: 0, br: 0 },
                        stuckTimer: 0, targetAngle: angle
                    });
                    trafficCount--;
                }
            }
            
            // SPAWN PLANES AT AIRPORT (Right side Tarmac area)
            // Airport shifted to x=94. Tarmac parking area around x=98.
            const planeSpawns = [
                {x: 98, y: 45, model: 'plane'}, 
                {x: 98, y: 52, model: 'jet'},   
                {x: 98, y: 60, model: 'plane'}, 
            ];
            
            planeSpawns.forEach((spawn, idx) => {
                 const modelKey = spawn.model as keyof typeof CAR_MODELS;
                 const model = CAR_MODELS[modelKey];
                 state.vehicles.push({
                    id: `plane-${idx}`, type: EntityType.VEHICLE, 
                    pos: { x: spawn.x * TILE_SIZE + TILE_SIZE/2, y: spawn.y * TILE_SIZE + TILE_SIZE/2 },
                    size: (model as any).size, 
                    angle: Math.PI / 2, // Facing Down (South)
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
                    deformation: { fl: 0, fr: 0, bl: 0, br: 0 },
                    targetAngle: Math.PI / 2
                 });
            });

            // Spawn Pedestrians
            for(let i=0; i<5; i++) {
                // Police Spawns
                let x, y;
                do {
                    x = Math.floor(Math.random() * MAP_WIDTH) * TILE_SIZE + TILE_SIZE / 2;
                    y = Math.floor(Math.random() * MAP_HEIGHT) * TILE_SIZE + TILE_SIZE / 2;
                } while (getTileAt(state.map, x, y) !== TileType.SIDEWALK);
                
                state.pedestrians.push({
                    id: `cop-${i}`, type: EntityType.PEDESTRIAN, role: 'police', pos: { x, y }, size: PLAYER_SIZE,
                    angle: Math.random() * Math.PI * 2, velocity: { x: 0, y: 0 }, color: '#1e3a8a', health: 150, maxHealth: 150,
                    armor: 50, stamina: STAMINA_MAX, maxStamina: STAMINA_MAX, staminaRechargeDelay: 0,
                    vehicleId: null, weapon: 'pistol', actionTimer: Math.random() * 200, state: 'walking'
                });
            }
            
            let pedsToSpawn = 50;
            while (pedsToSpawn > 0) {
                let x, y;
                do {
                    x = Math.floor(Math.random() * MAP_WIDTH) * TILE_SIZE + TILE_SIZE / 2;
                    y = Math.floor(Math.random() * MAP_HEIGHT) * TILE_SIZE + TILE_SIZE / 2;
                } while (getTileAt(state.map, x, y) !== TileType.SIDEWALK && getTileAt(state.map, x, y) !== TileType.AIRPORT_TERMINAL);

                const basePed = {
                    id: `ped-${pedsToSpawn}`, type: EntityType.PEDESTRIAN, role: 'civilian', pos: { x, y }, size: PLAYER_SIZE,
                    angle: Math.random() * Math.PI * 2, velocity: { x: 0, y: 0 },
                    color: Math.random() > 0.5 ? '#9ca3af' : '#4b5563', health: 100, maxHealth: 100, armor: 0,
                    stamina: STAMINA_MAX, maxStamina: STAMINA_MAX, staminaRechargeDelay: 0,
                    vehicleId: null, weapon: 'fist', actionTimer: Math.random() * 200, state: 'walking'
                } as Pedestrian;
                state.pedestrians.push(basePed);
                pedsToSpawn--;
            }
        }

        // Textures
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            const grassCanvas = createNoiseTexture(COLORS.grass, 0.15, 0.8);
            const roadCanvas = createNoiseTexture(COLORS.road, 0.1, 0.9);
            const sidewalkCanvas = createNoiseTexture(COLORS.sidewalk, 0.05, 0.3);
            const roofCanvas = createNoiseTexture('#4b5563', 0.15, 0.8);
            
            if (grassCanvas) groundTexturesRef.current['grass'] = ctx.createPattern(grassCanvas, 'repeat');
            if (roadCanvas) groundTexturesRef.current['road'] = ctx.createPattern(roadCanvas, 'repeat');
            if (sidewalkCanvas) groundTexturesRef.current['sidewalk'] = ctx.createPattern(sidewalkCanvas, 'repeat');
            if (roofCanvas) groundTexturesRef.current['roof'] = ctx.createPattern(roofCanvas, 'repeat');
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            keysPressed.current.add(e.code);
            if (e.code === 'KeyM') state.money += 100;
            if (e.code === 'KeyF') playerInteract(state);
            if (e.code === 'Tab') { e.preventDefault(); onWeaponWheelToggle(true); }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            keysPressed.current.delete(e.code);
            if (e.code === 'Tab') { e.preventDefault(); onWeaponWheelToggle(false); }
        };

        // Mouse Support
        const handleMouseDown = (e: MouseEvent) => {
            if (e.button === 0) { // Left Click acts as Space (Shoot/Action)
                keysPressed.current.add('Space');
            }
        };
        const handleMouseUp = (e: MouseEvent) => {
            if (e.button === 0) {
                keysPressed.current.delete('Space');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);
        
        requestRef.current = requestAnimationFrame(gameLoop);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const gameLoop = useCallback((time: number) => {
        requestRef.current = requestAnimationFrame(gameLoop);
        
        const { paused, settings } = propsRef.current;
        if (paused) return;

        // Frame Limiter Logic
        if (settings.frameLimiter) {
            const targetFPS = 30;
            const frameInterval = 1000 / targetFPS;
            const elapsed = time - lastFrameTimeRef.current;

            if (elapsed < frameInterval) return;
            lastFrameTimeRef.current = time - (elapsed % frameInterval);
        } else {
            lastFrameTimeRef.current = time;
        }

        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;
        
        // Dynamic Traffic Limit
        let maxTraffic = 50;
        if (settings.trafficDensity === 'LOW') maxTraffic = 25;
        else if (settings.trafficDensity === 'HIGH') maxTraffic = 75;

        updatePhysics(gameStateRef.current, keysPressed.current, maxTraffic);
        renderGame(ctx, gameStateRef.current, groundTexturesRef.current, settings);

        // Sync to React State for HUD (throttled)
        if (gameStateRef.current.timeTicker % 10 === 0) {
            onGameStateUpdate({ 
                ...gameStateRef.current,
                mission: propsRef.current.activeMission,
                isPhoneOpen: propsRef.current.isPhoneOpen,
                paused: false
            });
        }
    }, [onGameStateUpdate]);

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

    return <canvas ref={canvasRef} className="block w-full h-full" />;
};

export default GameCanvas;
