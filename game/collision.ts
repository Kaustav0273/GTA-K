
import { Vehicle, Vector2 } from '../types';
import { isSolid, getTileAt } from '../utils/gameUtils';

// Get Corners of the vehicle OBB
// Returns corners in order: [FrontLeft, FrontRight, RearLeft, RearRight]
export const getVehicleCorners = (v: Vehicle, posOverride?: Vector2) => {
    const pos = posOverride || v.pos;
    const cos = Math.cos(v.angle);
    const sin = Math.sin(v.angle);
    const hl = v.size.y / 2; // Half Length
    const hw = v.size.x / 2; // Half Width

    // Helper to rotate and translate
    const t = (lx: number, ly: number) => ({
        x: pos.x + (lx * cos - ly * sin),
        y: pos.y + (lx * sin + ly * cos)
    });

    // 0: FL (+X, -Y), 1: FR (+X, +Y), 2: RL (-X, -Y), 3: RR (-X, +Y)
    return [
        t(hl, -hw), // Front Left
        t(hl, hw),  // Front Right
        t(-hl, -hw),// Rear Left
        t(-hl, hw)  // Rear Right
    ];
};

// Check if any corner of the vehicle is inside a solid tile
// Returns array of indices of colliding corners
export const checkMapCollisionDetails = (v: Vehicle, map: number[][], nextPos: Vector2): number[] => {
    const corners = getVehicleCorners(v, nextPos);
    const hits: number[] = [];
    for (let i = 0; i < corners.length; i++) {
        if (isSolid(getTileAt(map, corners[i].x, corners[i].y))) {
            hits.push(i);
        }
    }
    return hits;
};

// Updated: Check if a point is inside a rotated vehicle (Aligned with Renderer)
export const checkPointInVehicle = (x: number, y: number, v: Vehicle, buffer: number = 0): boolean => {
    const dx = x - v.pos.x;
    const dy = y - v.pos.y;
    
    // Rotate point by -v.angle to bring it into local vehicle space (aligned with X/Y axes)
    const cos = Math.cos(-v.angle);
    const sin = Math.sin(-v.angle);
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;
    
    // Size Y is Length, Size X is Width
    const halfLen = (v.size.y / 2) + buffer;
    const halfWid = (v.size.x / 2) + buffer;
    
    return Math.abs(localX) < halfLen && Math.abs(localY) < halfWid;
};
