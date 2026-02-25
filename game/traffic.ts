
import { MutableGameState, EntityType, TileType } from '../types';
import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, CAR_MODELS, CAR_SIZE, CAR_COLORS } from '../constants';
import { getTileAt } from '../utils/gameUtils';

export const isDrivable = (tile: number) => tile === TileType.ROAD_H || tile === TileType.ROAD_V || tile === TileType.ROAD_CROSS || tile === TileType.RAIL_CROSSING || tile === TileType.MILITARY_GROUND;

export const getNextTrafficDirection = (map: number[][], gridX: number, gridY: number, currentAngle: number): number => {
    const normalize = (a: number) => {
        let rad = a % (Math.PI * 2);
        if (rad < 0) rad += Math.PI * 2;
        return rad;
    };

    // Snap current angle to nearest cardinal direction
    const currentHeading = Math.round(normalize(currentAngle) / (Math.PI/2)) * (Math.PI/2);
    const uTurnAngle = normalize(currentHeading + Math.PI);

    const exits: number[] = [];
    // Check NESW
    // Note: getTileAt handles boundary checks safely
    if (isDrivable(getTileAt(map, (gridX + 1) * TILE_SIZE, gridY * TILE_SIZE))) exits.push(0); // East
    if (isDrivable(getTileAt(map, (gridX - 1) * TILE_SIZE, gridY * TILE_SIZE))) exits.push(Math.PI); // West
    if (isDrivable(getTileAt(map, gridX * TILE_SIZE, (gridY + 1) * TILE_SIZE))) exits.push(Math.PI / 2); // South
    if (isDrivable(getTileAt(map, gridX * TILE_SIZE, (gridY - 1) * TILE_SIZE))) exits.push(3 * Math.PI / 2); // North

    // Filter U-turns (angle diff approx PI)
    // We use a small epsilon 0.1
    let validExits = exits.filter(e => Math.abs(normalize(e) - uTurnAngle) > 0.1);
    
    // If dead end (only exit is the way we came), allow U-turn
    if (validExits.length === 0 && exits.length > 0) validExits = exits;
    
    if (validExits.length === 0) return currentHeading + Math.PI; // Stuck? Turn around.

    const straightExit = validExits.find(e => Math.abs(normalize(e) - normalize(currentHeading)) < 0.1);
    const turnExits = validExits.filter(e => Math.abs(normalize(e) - normalize(currentHeading)) > 0.1);

    if (straightExit !== undefined && turnExits.length > 0) {
        // 4-way or Intersection with choices
        // 60% Straight, 40% Turn
        if (Math.random() < 0.6) {
            return straightExit;
        } else {
            return turnExits[Math.floor(Math.random() * turnExits.length)];
        }
    } else if (turnExits.length > 0) {
        // Forced turn (T-junction facing wall, or corner)
        // Prioritize turning as it's the only valid option besides U-turn
        return turnExits[Math.floor(Math.random() * turnExits.length)];
    } else if (straightExit !== undefined) {
        // Only straight available (Straight road)
        return straightExit;
    }

    // Fallback: If logic fails (shouldn't if validExits > 0), do U-turn or keep heading
    return validExits.length > 0 ? validExits[0] : currentHeading + Math.PI;
};

export const spawnTraffic = (state: MutableGameState, maxTraffic: number) => {
    // Check current traffic count (Exclude planes and player's car if they are driving)
    const trafficCount = state.vehicles.filter(v => v.driverId === 'npc').length;
    if (trafficCount >= maxTraffic) return;

    // Try to spawn nearby
    let spawned = false;
    let attempts = 0;
    const spawnRadius = 1600; // Just outside 1920 width
    const minSpawnRadius = 1000;

    // Determine what to spawn based on Wanted Level
    // Only spawn police traffic if wanted level >= 3
    let shouldSpawnPolice = false;
    if (state.wantedLevel >= 3) {
        const policeWeight = Math.min(0.8, state.wantedLevel * 0.15); // Scale up to 80% chance
        shouldSpawnPolice = Math.random() < policeWeight;
    }

    while (!spawned && attempts < 5) {
        attempts++;
        const angle = Math.random() * Math.PI * 2;
        const dist = minSpawnRadius + Math.random() * (spawnRadius - minSpawnRadius);
        
        const spawnX = state.player.pos.x + Math.cos(angle) * dist;
        const spawnY = state.player.pos.y + Math.sin(angle) * dist;
        
        // Bounds check
        if (spawnX < 0 || spawnX >= MAP_WIDTH * TILE_SIZE || spawnY < 0 || spawnY >= MAP_HEIGHT * TILE_SIZE) continue;

        const tile = getTileAt(state.map, spawnX, spawnY);
        
        if (isDrivable(tile) && tile !== TileType.ROAD_CROSS) { // Avoid spawning inside intersections
             let modelKey: keyof typeof CAR_MODELS = 'sedan';
             let vehicleColor = '#ffffff';

             if (shouldSpawnPolice) {
                 if (state.wantedLevel >= 5) modelKey = Math.random() > 0.6 ? 'tank' : 'barracks';
                 else if (state.wantedLevel >= 3) modelKey = Math.random() > 0.5 ? 'swat' : 'police';
                 else modelKey = 'police';
                 
                 vehicleColor = CAR_MODELS[modelKey].color;
             } else {
                 const regularModels = Object.keys(CAR_MODELS).filter(k => 
                    k !== 'plane' && k !== 'jet' && k !== 'tank' && k !== 'barracks' && k !== 'police' && k !== 'swat' && k !== 'firetruck' && k !== 'ambulance'
                 ) as Array<keyof typeof CAR_MODELS>;
                 
                 modelKey = regularModels[Math.floor(Math.random() * regularModels.length)];
                 vehicleColor = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
                 if (modelKey === 'limo') vehicleColor = Math.random() > 0.5 ? '#000000' : '#ffffff';
                 else if (modelKey === 'taxi') vehicleColor = CAR_MODELS.taxi.color;
             }

             const model = CAR_MODELS[modelKey];

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

            if (!state.vehicles) state.vehicles = [];
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
                bloodStains: [],
                tireBloodLevels: [0, 0, 0, 0],
                deformation: { fl: 0, fr: 0, bl: 0, br: 0 },
                stuckTimer: 0,
                targetAngle: angle
            });
            spawned = true;
        }
    }
}
