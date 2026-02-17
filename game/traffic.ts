
import { MutableGameState, EntityType } from '../types';
import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, CAR_MODELS, CAR_SIZE, CAR_COLORS } from '../constants';
import { getTileAt } from '../utils/gameUtils';
import { TileType } from '../types';

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
        
        if (tile === TileType.ROAD_H || tile === TileType.ROAD_V || tile === TileType.RAIL_CROSSING) {
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

export const isDrivable = (tile: number) => tile === TileType.ROAD_H || tile === TileType.ROAD_V || tile === TileType.ROAD_CROSS || tile === TileType.RAIL_CROSSING || tile === TileType.MILITARY_GROUND;
