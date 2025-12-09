
import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, COLORS } from "../constants";
import { TileType } from "../types";

export const generateMap = (): number[][] => {
  const map: number[][] = [];
  const centerX = MAP_WIDTH / 2;
  const centerY = MAP_HEIGHT / 2;

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
             const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
             const rand = Math.random();
             
             // Park Logic (10% chance generally)
             if (rand > 0.9) {
                 row.push(TileType.GRASS);
             } else {
                 // Zoning
                 if (dist < 12) {
                     // Downtown: Skyscrapers
                     row.push(TileType.SKYSCRAPER);
                 } else if (dist < 22 && rand > 0.4) {
                     // Commercial Ring: Shops
                     row.push(TileType.SHOP);
                 } else {
                     // Suburbs: Standard Buildings
                     row.push(TileType.BUILDING);
                 }
             }
        }
      }
    }
    map.push(row);
  }

  // Force Spawn Hospital (Top Left area)
  if (MAP_WIDTH > 10 && MAP_HEIGHT > 10) {
      for(let y=2; y<=4; y++) {
          for(let x=2; x<=4; x++) {
              map[y][x] = TileType.HOSPITAL;
          }
      }

      // Police Station (Bottom Right area)
      const startX = 44;
      const startY = 44;
      
      for(let y=startY; y<=startY+2; y++) {
          for(let x=startX; x<=startX+2; x++) {
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
    return tile === TileType.BUILDING || 
           tile === TileType.WATER || 
           tile === TileType.HOSPITAL || 
           tile === TileType.POLICE_STATION ||
           tile === TileType.SKYSCRAPER || 
           tile === TileType.SHOP;
}

export const createNoiseTexture = (color: string, alpha: number = 0.1, density: number = 0.5) => {
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
