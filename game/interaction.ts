
import { MutableGameState, Vehicle } from '../types';
import { isSolid, getTileAt } from '../utils/gameUtils';
import { MAX_SPEED_WALK } from '../constants';
import { spawnParticle } from './particles';
import { audioManager } from '../services/audioService';
import { isPoliceNearby } from './gamePlayUtils';

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
