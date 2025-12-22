
import { MutableGameState } from './gameState';
import { Vehicle, TileType } from '../types';
import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, CAR_MODELS } from '../constants';
import { getTileAt } from '../utils/gameUtils';

export const respawnVehicle = (state: MutableGameState, car: Vehicle) => {
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
            car.damage = { tires: [false, false, false, false], windows: [false, false] };

            if (tile === TileType.ROAD_H) {
                const dir = Math.random() > 0.5 ? 0 : Math.PI;
                car.angle = dir;
                car.targetAngle = dir;
                car.pos.y = ty * TILE_SIZE + (dir === 0 ? TILE_SIZE * 0.75 : TILE_SIZE * 0.25);
            } else {
                // Vertical Road
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

export const isDrivable = (tile: number) => tile === TileType.ROAD_H || tile === TileType.ROAD_V || tile === TileType.ROAD_CROSS;
