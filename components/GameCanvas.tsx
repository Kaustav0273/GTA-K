
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
}

const GameCanvas: React.FC<GameCanvasProps> = ({ 
    onGameStateUpdate, isPhoneOpen, activeMission, 
    onWeaponWheelToggle, isWeaponWheelOpen, activeWeapon,
    settings, paused, initialGameState
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
            timeTicker: (initialGameState as any).timeTicker || 0,
            hospitalPos: (initialGameState as any).hospitalPos || { x: 0, y: 0 },
            isWeaponWheelOpen: false,
            lastDamageTaken: (initialGameState as any).lastDamageTaken || 0,
            lastWantedTime: (initialGameState as any).lastWantedTime || 0
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
            lastWantedTime: 0
        }
    );

    // Sync Props
    useEffect(() => {
        gameStateRef.current.player.weapon = activeWeapon;
        gameStateRef.current.isWeaponWheelOpen = isWeaponWheelOpen;
    }, [activeWeapon, isWeaponWheelOpen]);

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
                        const neighbors = [
                            {dx: 0, dy: -1}, {dx: 0, dy: 1}, {dx: -1, dy: 0}, {dx: 1, dy: 0}
                        ];
                        
                        for(const n of neighbors) {
                            const nx = x + n.dx;
                            const ny = y + n.dy;
                            
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
            let trafficCount = 35;
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

                    const modelKey = modelKeys[Math.floor(Math.random() * modelKeys.length)];
                    const model = CAR_MODELS[modelKey];
                    const randomColor = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
                    
                    state.vehicles.push({
                        id: `traffic-${trafficCount}`, type: EntityType.VEHICLE, pos: { x: posX, y: posY },
                        size: (model as any).size || { x: CAR_SIZE.x, y: CAR_SIZE.y }, angle, velocity: { x: 0, y: 0 },
                        color: randomColor, driverId: 'npc', model: modelKey, speed: 0, maxSpeed: model.maxSpeed,
                        acceleration: model.acceleration, handling: model.handling, health: model.health,
                        damage: { tires: [false, false, false, false], windows: [false, false] }, stuckTimer: 0, targetAngle: angle
                    });
                    trafficCount--;
                }
            }

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
                } while (getTileAt(state.map, x, y) !== TileType.SIDEWALK);

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
        
        updatePhysics(gameStateRef.current, keysPressed.current);
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
