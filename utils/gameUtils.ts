
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
  // Green area in top-left
  fillRect(2, 2, 18, 18, TileType.GRASS);
  for(let y=3; y<18; y+=2) {
      for(let x=3; x<18; x+=2) {
          // Sparse mansions
          if(Math.random() > 0.6) safeSet(x, y, TileType.BUILDING);
      }
  }

  // 2. Downtown (Top Center) - Financial District
  // Concrete base with Skyscrapers
  fillRect(20, 2, 15, 18, TileType.SIDEWALK);
  for(let y=3; y<19; y++) {
      for(let x=21; x<34; x++) {
          // Grid layout skyscrapers
          if((x+y)%2 === 0 && Math.random() > 0.3) safeSet(x, y, TileType.SKYSCRAPER);
      }
  }

  // 3. Neon Coast (Right/East) - Nightlife
  // Shops and high-rises
  fillRect(35, 2, 13, 28, TileType.SIDEWALK);
  for(let y=3; y<28; y++) {
      for(let x=36; x<47; x++) {
          if(Math.random() > 0.6) safeSet(x, y, TileType.SHOP);
          else if(Math.random() > 0.9) safeSet(x, y, TileType.SKYSCRAPER);
      }
  }

  // 4. Redline (Mid Left) - Gang Territory
  // Dense low-rise buildings
  fillRect(2, 20, 18, 12, TileType.SIDEWALK);
  for(let y=21; y<31; y++) {
      for(let x=3; x<19; x++) {
          if(Math.random() > 0.4) safeSet(x, y, TileType.BUILDING);
      }
  }

  // 5. Rust Quarter (Center) - Abandoned Factories
  // Using SHOP tile for industrial look (vents/awnings) mixed with buildings
  fillRect(20, 20, 15, 15, TileType.SIDEWALK);
  for(let y=21; y<34; y++) {
      for(let x=21; x<34; x++) {
          if(Math.random() > 0.5) safeSet(x, y, Math.random() > 0.5 ? TileType.BUILDING : TileType.SHOP);
      }
  }

  // 6. Port Authority (Bottom Left) - Ships & Containers
  // Main concrete dock area
  fillRect(2, 32, 18, 16, TileType.SIDEWALK);
  
  // Cutout for water/piers to create "fingers"
  // Finger 1 (Top)
  fillRect(2, 36, 10, 3, TileType.WATER); 
  // Finger 2 (Bottom)
  fillRect(2, 43, 10, 3, TileType.WATER);

  // Generate Ships in the water cutouts
  const spawnShip = (x: number, y: number, w: number, h: number) => {
      // Ship Hull/Deck
      fillRect(x, y, w, h, TileType.SHIP_DECK);
      // Cargo on Deck
      for(let cy = y + 1; cy < y + h - 1; cy++) {
          for(let cx = x + 1; cx < x + w - 1; cx++) {
              if (Math.random() > 0.3) safeSet(cx, cy, TileType.CONTAINER);
          }
      }
  }
  // Ship 1 (Top Dock)
  spawnShip(4, 37, 6, 1); // Small barge
  // Ship 2 (Bottom Dock) - Larger
  spawnShip(3, 44, 8, 1); 

  // Container Yard (On the main dock concrete)
  for(let y=33; y<46; y++) {
      for(let x=12; x<19; x++) {
          // Leave some aisles for driving (every 3rd row/col)
          if(x % 3 !== 0 && y % 3 !== 0) {
               // Random stacks
               safeSet(x, y, TileType.CONTAINER);
          }
      }
  }


  // 7. Industrial Zone (Bottom Right) - Factories & Yards
  fillRect(35, 30, 13, 18, TileType.SIDEWALK);
  for(let y=31; y<47; y++) {
      for(let x=36; x<47; x++) {
          // Dense large buildings
          if(Math.random() > 0.5) safeSet(x, y, TileType.BUILDING);
      }
  }

  // --- ROADS (The "Vice Divide" Highway System) ---
  
  const drawRoad = (x: number, y: number, horizontal: boolean) => {
      safeSet(x, y, horizontal ? TileType.ROAD_H : TileType.ROAD_V);
  };

  // Outer Highway Loop
  // Top
  for(let x=5; x<45; x++) drawRoad(x, 5, true);
  // Bottom
  for(let x=5; x<45; x++) drawRoad(x, 45, true);
  // Left
  for(let y=5; y<46; y++) drawRoad(5, y, false);
  // Right
  for(let y=5; y<46; y++) drawRoad(45, y, false);

  // Arterial Roads (Divides Districts)
  
  // Horizontal Split 1 (Separates Hillside/Downtown from Redline/Rust)
  for(let x=5; x<45; x++) drawRoad(x, 20, true);
  
  // Horizontal Split 2 (Separates Redline/Rust from Docks/Industrial)
  for(let x=5; x<45; x++) drawRoad(x, 35, true);

  // Vertical Split 1 (Separates West districts from Center)
  for(let y=5; y<46; y++) drawRoad(20, y, false);
  
  // Vertical Split 2 (Separates Center from East districts)
  for(let y=5; y<46; y++) drawRoad(35, y, false);

  // --- FIX INTERSECTIONS ---
  for(let y=1; y<MAP_HEIGHT-1; y++) {
      for(let x=1; x<MAP_WIDTH-1; x++) {
          if(map[y][x] === TileType.ROAD_H || map[y][x] === TileType.ROAD_V) {
              const u = map[y-1][x];
              const d = map[y+1][x];
              const l = map[y][x-1];
              const r = map[y][x+1];
              
              const isRoad = (t: number) => t === TileType.ROAD_H || t === TileType.ROAD_V || t === TileType.ROAD_CROSS;
              
              // If connected on multiple axes, it's an intersection
              if ((isRoad(u) || isRoad(d)) && (isRoad(l) || isRoad(r))) {
                  map[y][x] = TileType.ROAD_CROSS;
              }
          }
      }
  }

  // --- SPECIAL LOCATIONS ---
  
  // Hospital (Located in Downtown near highway for easy access)
  safeSet(22, 15, TileType.HOSPITAL);
  safeSet(23, 15, TileType.HOSPITAL);
  
  // Police Station (Located near Rust Quarter/Downtown border)
  safeSet(25, 18, TileType.POLICE_STATION);
  safeSet(26, 18, TileType.POLICE_STATION);

  // Clanker's Lab (Hidden in Rust Quarter)
  safeSet(27, 27, TileType.SHOP); 

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
