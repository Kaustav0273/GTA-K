
import { Vehicle, Vector2 } from '../types';
import { isSolid, getTileAt } from '../utils/gameUtils';
import { MutableGameState } from './gameState';

// Get Corners of the vehicle OBB
export const getVehicleCorners = (v: Vehicle, posOverride?: Vector2) => {
    const pos = posOverride || v.pos;
    const cos = Math.cos(v.angle);
    const sin = Math.sin(v.angle);
    const hl = v.size.y / 2; // Half Length
    const hw = v.size.x / 2; // Half Width

    const t = (lx: number, ly: number) => ({
        x: pos.x + (lx * cos - ly * sin),
        y: pos.y + (lx * sin + ly * cos)
    });

    return [
        t(hl, -hw), // Front Right
        t(hl, hw),  // Front Left
        t(-hl, hw), // Rear Left
        t(-hl, -hw) // Rear Right
    ];
};

// Check if any corner of the vehicle is inside a solid tile
export const checkMapCollision = (v: Vehicle, map: number[][], nextPos: Vector2): boolean => {
    const corners = getVehicleCorners(v, nextPos);
    for (const c of corners) {
        if (isSolid(getTileAt(map, c.x, c.y))) return true;
    }
    return false;
};

// Check if a point is inside a rotated vehicle
export const checkPointInVehicle = (x: number, y: number, v: Vehicle, buffer: number = 0): boolean => {
    const dx = x - v.pos.x;
    const dy = y - v.pos.y;
    
    // Rotate point by -v.angle to bring it into local vehicle space
    const cos = Math.cos(-v.angle);
    const sin = Math.sin(-v.angle);
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;
    
    const halfLen = (v.size.y / 2) + buffer;
    const halfWid = (v.size.x / 2) + buffer;
    
    return Math.abs(localX) < halfLen && Math.abs(localY) < halfWid;
};

// Helper: Check if police are nearby to witness a crime
export const isPoliceNearby = (state: MutableGameState, pos: Vector2, range: number = 600): boolean => {
    for (const p of state.pedestrians) {
        if (p.role === 'police' && p.state !== 'dead') {
            const dist = Math.sqrt((p.pos.x - pos.x) ** 2 + (p.pos.y - pos.y) ** 2);
            if (dist < range) return true;
        }
    }
    return false;
};
