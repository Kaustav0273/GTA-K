
import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, COLORS } from "../constants";
import { TileType } from "../types";

export const generateMap = (): number[][] => {
  const map: number[][] = [];
  
  // 1. Initialize with Water (Island Base)
  for (let y = 0; y < MAP_HEIGHT; y++) {
    map.push(new Array(MAP_WIDTH).fill(TileType.WATER));
  }

  // Helper to safely set tiles within bounds
  const safeSet = (x: number, y: number, type: TileType) => {
      if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
          map[y][x] = type;
      }
  }

  // Helper to fill a rectangle
  const fillRect = (x: number, y: number, w: number, h: number, type: TileType) => {
      for(let iy = y; iy < y + h; iy++) {
          for(let ix = x; ix < x + w; ix++) {
              safeSet(ix, iy, type);
          }
      }
  }

  // --- ZONING ---
  
  // 1. Hillside Heights (NW) - Grass & Mansions
  fillRect(2, 2, 18, 18, TileType.GRASS);
  for(let y=3; y<18; y+=2) {
      for(let x=3; x<18; x+=2) {
          if(Math.random() > 0.6) safeSet(x, y, TileType.BUILDING);
      }
  }

  // 2. Downtown (Top Center) - Financial District
  fillRect(20, 2, 15, 18, TileType.SIDEWALK);
  for(let y=3; y<19; y++) {
      for(let x=21; x<34; x++) {
          if((x+y)%2 === 0 && Math.random() > 0.3) safeSet(x, y, TileType.SKYSCRAPER);
      }
  }

  // 3. Neon Coast (Right/East)
  fillRect(35, 2, 13, 28, TileType.SIDEWALK);
  for(let y=3; y<28; y++) {
      for(let x=36; x<47; x++) {
          if(Math.random() > 0.6) safeSet(x, y, TileType.SHOP);
          else if(Math.random() > 0.9) safeSet(x, y, TileType.SKYSCRAPER);
      }
  }

  // 4. Redline (Mid Left)
  fillRect(2, 20, 18, 12, TileType.SIDEWALK);
  for(let y=21; y<31; y++) {
      for(let x=3; x<19; x++) {
          if(Math.random() > 0.4) safeSet(x, y, TileType.BUILDING);
      }
  }

  // 5. Rust Quarter (Center)
  fillRect(20, 20, 15, 15, TileType.SIDEWALK);
  for(let y=21; y<34; y++) {
      for(let x=21; x<34; x++) {
          if(Math.random() > 0.5) safeSet(x, y, Math.random() > 0.5 ? TileType.BUILDING : TileType.SHOP);
      }
  }

  // 6. Port Authority
  fillRect(2, 32, 18, 16, TileType.SIDEWALK);
  fillRect(2, 36, 10, 3, TileType.WATER); 
  fillRect(2, 43, 10, 3, TileType.WATER);

  // Ships
  const spawnShip = (x: number, y: number, w: number, h: number) => {
      fillRect(x, y, w, h, TileType.SHIP_DECK);
      for(let cy = y + 1; cy < y + h - 1; cy++) {
          for(let cx = x + 1; cx < x + w - 1; cx++) {
              if (Math.random() > 0.3) safeSet(cx, cy, TileType.CONTAINER);
          }
      }
  }
  spawnShip(4, 37, 6, 1); 
  spawnShip(3, 44, 8, 1); 

  // Container Yard
  for(let y=33; y<46; y++) {
      for(let x=12; x<19; x++) {
          if(x % 3 !== 0 && y % 3 !== 0) {
               safeSet(x, y, TileType.CONTAINER);
          }
      }
  }

  // 7. Industrial Zone
  fillRect(35, 30, 13, 18, TileType.SIDEWALK);
  for(let y=31; y<47; y++) {
      for(let x=36; x<47; x++) {
          if(Math.random() > 0.5) safeSet(x, y, TileType.BUILDING);
      }
  }

  // --- ROADS ---
  const drawRoad = (x: number, y: number, horizontal: boolean) => {
      safeSet(x, y, horizontal ? TileType.ROAD_H : TileType.ROAD_V);
  };

  // Highway Loop
  for(let x=5; x<45; x++) drawRoad(x, 5, true);
  for(let x=5; x<45; x++) drawRoad(x, 45, true);
  for(let y=5; y<46; y++) drawRoad(5, y, false);
  for(let y=5; y<46; y++) drawRoad(45, y, false);

  // Arterials
  for(let x=5; x<45; x++) drawRoad(x, 20, true);
  for(let x=5; x<45; x++) drawRoad(x, 35, true);
  for(let y=5; y<46; y++) drawRoad(20, y, false);
  for(let y=5; y<46; y++) drawRoad(35, y, false);

  // --- SPECIAL LOCATIONS ---
  
  // Hospital - Next to Top Highway (y=5)
  // Placing at y=6 ensures it is directly adjacent to the road.
  fillRect(22, 6, 3, 3, TileType.HOSPITAL);
  
  // Police Station - Next to Arterial (y=20)
  fillRect(32, 17, 3, 3, TileType.POLICE_STATION);

  // Clanker's Lab
  safeSet(27, 27, TileType.SHOP); 
  
  // --- FIX INTERSECTIONS ---
  for(let y=1; y<MAP_HEIGHT-1; y++) {
      for(let x=1; x<MAP_WIDTH-1; x++) {
          if(map[y][x] === TileType.ROAD_H || map[y][x] === TileType.ROAD_V) {
              const u = map[y-1][x];
              const d = map[y+1][x];
              const l = map[y][x-1];
              const r = map[y][x+1];
              const isRoad = (t: number) => t === TileType.ROAD_H || t === TileType.ROAD_V || t === TileType.ROAD_CROSS;
              if ((isRoad(u) || isRoad(d)) && (isRoad(l) || isRoad(r))) {
                  map[y][x] = TileType.ROAD_CROSS;
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
    if (!map || map.length === 0) return TileType.WATER;
    const tx = Math.floor(x / TILE_SIZE);
    const ty = Math.floor(y / TILE_SIZE);
    if (ty < 0 || ty >= map.length) return TileType.WATER;
    if (tx < 0 || tx >= map[0].length) return TileType.WATER;
    return map[ty][tx] ?? TileType.WATER;
}

export const isSolid = (tile: number): boolean => {
    return tile === TileType.BUILDING || 
           tile === TileType.WATER || 
           tile === TileType.HOSPITAL || 
           tile === TileType.POLICE_STATION ||
           tile === TileType.SKYSCRAPER || 
           tile === TileType.SHOP ||
           tile === TileType.CONTAINER;
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
