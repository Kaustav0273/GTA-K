

import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, COLORS } from "../constants";
import { TileType } from "../types";

// Helper to identify road tiles
const isRoad = (t: number) => t === TileType.ROAD_H || t === TileType.ROAD_V || t === TileType.ROAD_CROSS;

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

  // ==========================================
  // PHASE 1: BASE TERRAIN ZONING (No Buildings yet)
  // ==========================================
  
  // Hillside Heights (NW)
  fillRect(2, 2, 18, 18, TileType.GRASS);

  // Downtown (Top Center)
  fillRect(20, 2, 14, 18, TileType.SIDEWALK);

  // Redline (Mid Left)
  fillRect(2, 20, 18, 12, TileType.SIDEWALK);

  // Rust Quarter (Center)
  fillRect(20, 20, 14, 15, TileType.SIDEWALK);

  // Port Authority (Bottom Left)
  fillRect(2, 32, 18, 16, TileType.SIDEWALK);
  fillRect(2, 36, 10, 3, TileType.WATER); 
  fillRect(2, 43, 10, 3, TileType.WATER);
  // Ships Decks (Base)
  fillRect(4, 37, 6, 1, TileType.SHIP_DECK);
  fillRect(3, 44, 8, 1, TileType.SHIP_DECK);

  // Neon Coast / Industrial (Restored Zone)
  const neonX = 35;
  const neonW = 23; 
  fillRect(neonX, 2, neonW, 46, TileType.SIDEWALK);

  // Airport (Right Side)
  const airportX = 58;
  const airportWidth = 20;
  // Base: Tarmac
  fillRect(airportX, 2, airportWidth, 46, TileType.TARMAC);
  
  // Airport Frontage Area (Sidewalks for Terminals)
  // We paint a strip of sidewalk at the airport entrance (x=58..60)
  // This ensures footpaths generate correctly between the frontage road and terminals.
  fillRect(airportX, 2, 3, 46, TileType.SIDEWALK);

  // Runway - Shortened to fit INSIDE the highway loop (y=5 to y=45)
  // Starts at y=7, Ends at y=44 (Height 37)
  fillRect(airportX + 14, 7, 3, 37, TileType.RUNWAY);
  
  // Taxiways
  fillRect(airportX + 8, 10, 6, 2, TileType.TARMAC);
  fillRect(airportX + 8, 36, 6, 2, TileType.TARMAC);


  // ==========================================
  // PHASE 2: ROADS
  // ==========================================
  const drawRoad = (x: number, y: number, horizontal: boolean) => {
      safeSet(x, y, horizontal ? TileType.ROAD_H : TileType.ROAD_V);
  };

  // Highway Loop
  const roadLimitX = airportX + 18; 
  for(let x=5; x<roadLimitX; x++) drawRoad(x, 5, true); // Top
  for(let x=5; x<roadLimitX; x++) drawRoad(x, 45, true); // Bottom
  for(let y=5; y<46; y++) drawRoad(5, y, false); // Left
  for(let y=5; y<46; y++) drawRoad(roadLimitX - 1, y, false); // Right

  // Arterials (Left Side)
  for(let x=5; x<35; x++) drawRoad(x, 20, true);
  for(let x=5; x<35; x++) drawRoad(x, 35, true);
  for(let y=5; y<46; y++) drawRoad(20, y, false);

  // Arterials (Connecting Neon Coast)
  for(let x=35; x<airportX; x++) {
      if (x !== neonX + 11) { 
        drawRoad(x, 20, true);
        drawRoad(x, 35, true);
      }
  }
  
  // Neon Coast Vertical Road
  for(let y=2; y<48; y++) {
      drawRoad(neonX + 11, y, false);
  }

  // Airport Frontage Road (Vertical)
  // Connects Top Highway (y=5) to Bottom Highway (y=45)
  // Located at x=58, seamlessly connecting with Neon Coast arterials
  for(let y=5; y<46; y++) {
      drawRoad(airportX, y, false);
  }


  // ==========================================
  // PHASE 3: FOOTPATHS
  // ==========================================
  // Place footpath on GRASS or SIDEWALK adjacent to roads
  const footpathCandidates: {x: number, y: number}[] = [];
  
  for(let y=1; y<MAP_HEIGHT-1; y++) {
      for(let x=1; x<MAP_WIDTH-1; x++) {
          if (isRoad(map[y][x])) {
              // Check 4 neighbors
              const neighbors = [{x:x+1, y:y}, {x:x-1, y:y}, {x:x, y:y+1}, {x:x, y:y-1}];
              neighbors.forEach(n => {
                  const t = map[n.y][n.x];
                  if (t === TileType.GRASS || t === TileType.SIDEWALK) {
                      footpathCandidates.push(n);
                  }
              });
          }
      }
  }
  // Apply footpaths
  footpathCandidates.forEach(c => {
      map[c.y][c.x] = TileType.FOOTPATH;
  });


  // ==========================================
  // PHASE 4: BUILDINGS & OBJECTS
  // ==========================================
  
  // Helper to check if we can build
  const canBuild = (x: number, y: number) => {
      if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return false;
      const t = map[y][x];
      return t !== TileType.ROAD_H && t !== TileType.ROAD_V && t !== TileType.ROAD_CROSS && t !== TileType.FOOTPATH && t !== TileType.WATER && t !== TileType.RUNWAY && t !== TileType.TARMAC && t !== TileType.SHIP_DECK;
  };

  // 1. Hillside Heights (NW)
  for(let y=3; y<18; y+=2) {
      for(let x=3; x<18; x+=2) {
          if(canBuild(x,y) && Math.random() > 0.6) safeSet(x, y, TileType.BUILDING);
      }
  }

  // 2. Downtown
  for(let y=3; y<19; y++) {
      for(let x=21; x<33; x++) {
          if(canBuild(x,y) && (x+y)%2 === 0 && Math.random() > 0.3) safeSet(x, y, TileType.SKYSCRAPER);
      }
  }

  // 3. Redline
  for(let y=21; y<31; y++) {
      for(let x=3; x<19; x++) {
          if(canBuild(x,y) && Math.random() > 0.4) safeSet(x, y, TileType.BUILDING);
      }
  }

  // 4. Rust Quarter
  for(let y=21; y<34; y++) {
      for(let x=21; x<33; x++) {
          if(canBuild(x,y) && Math.random() > 0.5) safeSet(x, y, Math.random() > 0.5 ? TileType.BUILDING : TileType.SHOP);
      }
  }

  // Ships Cargo
  for(let cy = 38; cy < 38; cy++) { // Ship 1
      for(let cx = 5; cx < 9; cx++) {
          if (Math.random() > 0.3) safeSet(cx, cy, TileType.CONTAINER);
      }
  }
  
  // Container Yard
  for(let y=33; y<46; y++) {
      for(let x=12; x<19; x++) {
          if(canBuild(x,y) && x % 3 !== 0 && y % 3 !== 0) {
               safeSet(x, y, TileType.CONTAINER);
          }
      }
  }

  // Neon Coast / Industrial (Restored Zone)
  for(let y=2; y<48; y++) {
      for(let x=neonX; x<neonX+neonW; x++) {
           if (canBuild(x,y)) {
               // High Density Building Generation
               if (Math.random() > 0.1) {
                    const rand = Math.random();
                    let type = TileType.BUILDING;
                    
                    if (rand > 0.6) {
                        type = TileType.SHOP;
                    } else if (rand > 0.4) {
                        type = TileType.CONTAINER;
                    } else {
                        type = TileType.BUILDING;
                    }
                    safeSet(x, y, type);
               }
           }
      }
  }

  // Airport Terminals/Hangars
  // Terminals at x=60. With Road at 58 and Footpath at 59, this aligns perfectly.
  fillRect(airportX + 2, 15, 4, 10, TileType.AIRPORT_TERMINAL);
  fillRect(airportX + 2, 28, 4, 10, TileType.AIRPORT_TERMINAL);
  
  // Hangars
  // Moved Top Hangar down to y=9 to avoid overlap with Top Highway at y=5
  fillRect(airportX + 2, 9, 4, 5, TileType.HANGAR);
  // Bottom Hangar at y=40 fits (ends at 44, before road at 45)
  fillRect(airportX + 2, 40, 4, 5, TileType.HANGAR);


  // ==========================================
  // PHASE 5: SPECIAL LOCATIONS & FIXES
  // ==========================================
  
  // Hospital
  fillRect(22, 6, 3, 3, TileType.HOSPITAL);
  
  // Police Station
  fillRect(28, 17, 3, 3, TileType.POLICE_STATION);

  // Pay 'n' Spray
  // Moved to (21, 25) to be adjacent to vertical road at x=20
  safeSet(21, 25, TileType.PAINT_SHOP); 
  
  // Fix Road Intersections
  for(let y=1; y<MAP_HEIGHT-1; y++) {
      for(let x=1; x<MAP_WIDTH-1; x++) {
          if(map[y][x] === TileType.ROAD_H || map[y][x] === TileType.ROAD_V) {
              const u = map[y-1][x];
              const d = map[y+1][x];
              const l = map[y][x-1];
              const r = map[y][x+1];
              const isR = (t: number) => t === TileType.ROAD_H || t === TileType.ROAD_V || t === TileType.ROAD_CROSS;
              if ((isR(u) || isR(d)) && (isR(l) || isR(r))) {
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
           tile === TileType.CONTAINER ||
           tile === TileType.AIRPORT_TERMINAL ||
           tile === TileType.HANGAR;
           // PAINT_SHOP is NOT solid to allow entry
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
