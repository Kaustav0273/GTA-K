
import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, COLORS } from "../constants";
import { TileType } from "../types";

export const generateMap = (): number[][] => {
  const map: number[][] = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    const row: number[] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      // Border Enforcement: Water around the edges
      if (x === 0 || x === MAP_WIDTH - 1 || y === 0 || y === MAP_HEIGHT - 1) {
          row.push(TileType.WATER);
          continue;
      }

      // Basic procedural generation
      // Create a grid of roads
      const isRoadX = x % 6 === 0;
      const isRoadY = y % 6 === 0;

      if (isRoadX && isRoadY) {
        row.push(TileType.ROAD_CROSS);
      } else if (isRoadX) {
        row.push(TileType.ROAD_V);
      } else if (isRoadY) {
        row.push(TileType.ROAD_H);
      } else {
        // Blocks between roads
        // Add padding for sidewalks
        if (x % 6 === 1 || x % 6 === 5 || y % 6 === 1 || y % 6 === 5) {
            row.push(TileType.SIDEWALK);
        } else {
             // 10% chance of park/grass in the middle of blocks, otherwise building
            row.push(Math.random() > 0.9 ? TileType.GRASS : TileType.BUILDING);
        }
      }
    }
    map.push(row);
  }

  // Force Spawn Hospital (Top Left area)
  // We need a 2x2 or 3x3 block ideally, but we'll just set a block of tiles
  // Position around 4,4 (inside a block)
  if (MAP_WIDTH > 10 && MAP_HEIGHT > 10) {
      // Hospital - Aligned to block (2,2) to (4,4) which corresponds to block starting at 0
      // Block 0: Roads at 0 and 6. Interior: 2,3,4.
      for(let y=2; y<=4; y++) {
          for(let x=2; x<=4; x++) {
              map[y][x] = TileType.HOSPITAL;
          }
      }

      // Police Station (Bottom Right area)
      // Align to the last full block before edge
      // Last road at 48. Previous road at 42.
      // Block interior is 44, 45, 46.
      const startX = 44;
      const startY = 44;
      
      for(let y=startY; y<=startY+2; y++) {
          for(let x=startX; x<=startX+2; x++) {
              // Ensure we are within bounds
              if (y < MAP_HEIGHT && x < MAP_WIDTH) {
                  map[y][x] = TileType.POLICE_STATION;
              }
          }
      }
  }

  return map;
};

// AABB Collision
export const checkCollision = (rect1: any, rect2: any) => {
  return (
    rect1.x < rect2.x + rect2.w &&
    rect1.x + rect1.w > rect2.x &&
    rect1.y < rect2.y + rect2.h &&
    rect1.y + rect1.h > rect2.y
  );
};

export const getTileAt = (map: number[][], x: number, y: number): number => {
    // Safety check for empty or invalid map
    if (!map || map.length === 0) return TileType.WATER;

    const tx = Math.floor(x / TILE_SIZE);
    const ty = Math.floor(y / TILE_SIZE);
    
    // Bounds check using actual map dimensions
    if (ty < 0 || ty >= map.length) return TileType.WATER;
    if (tx < 0 || tx >= map[0].length) return TileType.WATER;
    
    // Safe access
    return map[ty][tx] ?? TileType.WATER;
}

export const isSolid = (tile: number): boolean => {
    return tile === TileType.BUILDING || tile === TileType.WATER || tile === TileType.HOSPITAL || tile === TileType.POLICE_STATION;
}
