
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

  // Shift constant to move original map down
  const SHIFT_Y = 30;

  // ==========================================
  // PHASE 0: NEW NORTH AREAS (y=0 to y=30)
  // ==========================================

  // North West - Pine Hills (Residential/Suburbs)
  fillRect(4, 4, 34, 26, TileType.GRASS);
  
  // North East - Uptown / Little Tokyo
  fillRect(42, 4, 34, 26, TileType.SIDEWALK);
  
  // Central Park Lake Area
  fillRect(38, 10, 4, 15, TileType.WATER); // Lake separation

  // ==========================================
  // PHASE 1: BASE TERRAIN ZONING (Original Map Shifted)
  // ==========================================
  
  // Hillside Heights (NW)
  fillRect(2, 2 + SHIFT_Y, 18, 18, TileType.GRASS);

  // Downtown (Top Center)
  fillRect(20, 2 + SHIFT_Y, 14, 18, TileType.SIDEWALK);

  // Redline (Mid Left)
  fillRect(2, 20 + SHIFT_Y, 18, 12, TileType.SIDEWALK);

  // Rust Quarter (Center)
  fillRect(20, 20 + SHIFT_Y, 14, 15, TileType.SIDEWALK);

  // Port Authority (Bottom Left)
  fillRect(2, 32 + SHIFT_Y, 18, 16, TileType.SIDEWALK);
  fillRect(2, 36 + SHIFT_Y, 10, 3, TileType.WATER); 
  fillRect(2, 43 + SHIFT_Y, 10, 3, TileType.WATER);
  // Ships Decks (Base)
  fillRect(4, 37 + SHIFT_Y, 6, 1, TileType.SHIP_DECK);
  fillRect(3, 44 + SHIFT_Y, 8, 1, TileType.SHIP_DECK);

  // Neon Coast / Industrial (Restored Zone)
  const neonX = 35;
  const neonW = 23; 
  fillRect(neonX, 2 + SHIFT_Y, neonW, 46, TileType.SIDEWALK);

  // Airport (Right Side)
  const airportX = 58;
  const airportWidth = 20;
  // Base: Tarmac
  fillRect(airportX, 2 + SHIFT_Y, airportWidth, 46, TileType.TARMAC);
  
  // Airport Frontage Area (Sidewalks for Terminals)
  fillRect(airportX, 2 + SHIFT_Y, 3, 46, TileType.SIDEWALK);

  // Runway
  fillRect(airportX + 14, 7 + SHIFT_Y, 3, 37, TileType.RUNWAY);
  
  // Taxiways
  fillRect(airportX + 8, 10 + SHIFT_Y, 6, 2, TileType.TARMAC);
  fillRect(airportX + 8, 36 + SHIFT_Y, 6, 2, TileType.TARMAC);


  // ==========================================
  // PHASE 2: ROADS
  // ==========================================
  const drawRoad = (x: number, y: number, horizontal: boolean) => {
      safeSet(x, y, horizontal ? TileType.ROAD_H : TileType.ROAD_V);
  };

  // --- NEW NORTH ROADS ---
  // North Highway Loop (Top of Map)
  for(let x=4; x<76; x++) drawRoad(x, 4, true);

  // North Arterials
  for(let x=4; x<38; x++) drawRoad(x, 15, true); // Mid Pine Hills
  for(let x=42; x<76; x++) drawRoad(x, 15, true); // Mid Uptown
  
  for(let y=4; y<35; y++) drawRoad(20, y, false); // Pine Hills Vertical
  
  // FIXED: Uptown Vertical now aligned with Airport Road (x=58)
  for(let y=4; y<=35; y++) drawRoad(58, y, false); 
  
  // --- CONNECTIONS (North to South) ---
  // Connect Left Loop
  for(let y=4; y<5 + SHIFT_Y; y++) drawRoad(5, y, false);
  
  // Connect Right Loop (FIXED: Alignment to 75, not 76)
  for(let y=4; y<5 + SHIFT_Y; y++) drawRoad(75, y, false); 
  
  // Connect Neon Coast Vertical
  for(let y=4; y<2 + SHIFT_Y; y++) drawRoad(neonX + 11, y, false);

  // --- ORIGINAL ROADS (Shifted) ---
  const roadLimitX = airportX + 18; 
  // Highway Loop
  for(let x=5; x<roadLimitX; x++) drawRoad(x, 5 + SHIFT_Y, true); // Old Top
  for(let x=5; x<roadLimitX; x++) drawRoad(x, 45 + SHIFT_Y, true); // Old Bottom
  for(let y=5 + SHIFT_Y; y<46 + SHIFT_Y; y++) drawRoad(5, y, false); // Left
  for(let y=5 + SHIFT_Y; y<46 + SHIFT_Y; y++) drawRoad(roadLimitX - 1, y, false); // Right (x=75)

  // Arterials (Left Side)
  for(let x=5; x<35; x++) drawRoad(x, 20 + SHIFT_Y, true);
  for(let x=5; x<35; x++) drawRoad(x, 35 + SHIFT_Y, true);
  for(let y=5 + SHIFT_Y; y<46 + SHIFT_Y; y++) drawRoad(20, y, false);

  // Arterials (Connecting Neon Coast)
  for(let x=35; x<airportX; x++) {
      if (x !== neonX + 11) { 
        drawRoad(x, 20 + SHIFT_Y, true);
        drawRoad(x, 35 + SHIFT_Y, true);
      }
  }
  
  // Neon Coast Vertical Road
  for(let y=2 + SHIFT_Y; y<48 + SHIFT_Y; y++) {
      drawRoad(neonX + 11, y, false);
  }

  // Airport Frontage Road
  for(let y=5 + SHIFT_Y; y<46 + SHIFT_Y; y++) {
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
  
  const canBuild = (x: number, y: number) => {
      if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return false;
      const t = map[y][x];
      return t !== TileType.ROAD_H && t !== TileType.ROAD_V && t !== TileType.ROAD_CROSS && t !== TileType.FOOTPATH && t !== TileType.WATER && t !== TileType.RUNWAY && t !== TileType.TARMAC && t !== TileType.SHIP_DECK && t !== TileType.SHOP && t !== TileType.MALL;
  };

  // --- NEW NORTH BUILDINGS ---
  // Pine Hills Mansions
  for(let y=6; y<28; y+=3) {
      for(let x=6; x<34; x+=3) {
          if(canBuild(x,y) && Math.random() > 0.4) safeSet(x, y, TileType.BUILDING);
      }
  }
  // Uptown Skyscrapers
  for(let y=6; y<28; y++) {
      for(let x=44; x<74; x++) {
          // EXCLUDE MALL AREA (Top Right)
          if (x >= 60 && y < 16) continue;

          if(canBuild(x,y) && (x+y)%3 === 0 && Math.random() > 0.2) safeSet(x, y, TileType.SKYSCRAPER);
      }
  }

  // MALL GENERATION (Top Right)
  // Adjusted to fit between x=58 and x=75 roads
  const mallX = 60; // Shifted left to avoid cutting right road
  const mallY = 5;
  const mallW = 14; // Reduced width
  
  // Parking
  fillRect(mallX, mallY, mallW, 9, TileType.TARMAC);
  
  // Main Building Structure - USING NEW MALL TILE
  fillRect(mallX + 1, mallY + 1, mallW - 2, 7, TileType.MALL);
  
  // Internal details (Anchors - kept as standard building for now or could be MALL)
  // Let's keep specific anchor points as generic buildings to break texture, or make them Mall too?
  // Using generic building gives nice contrast.
  safeSet(mallX + 1, mallY + 1, TileType.BUILDING); 
  safeSet(mallX + mallW - 2, mallY + 1, TileType.BUILDING); 
  safeSet(mallX + 1, mallY + 7, TileType.BUILDING); 
  safeSet(mallX + mallW - 2, mallY + 7, TileType.BUILDING); 
  
  // Atrium / Open Air Center
  fillRect(mallX + 5, mallY + 3, 4, 3, TileType.SIDEWALK);
  // Mall Entrance Path
  fillRect(mallX + 6, mallY + 8, 2, 2, TileType.SIDEWALK);


  // --- ORIGINAL BUILDINGS (Shifted) ---
  // 1. Hillside Heights (NW)
  for(let y=3 + SHIFT_Y; y<18 + SHIFT_Y; y+=2) {
      for(let x=3; x<18; x+=2) {
          if(canBuild(x,y) && Math.random() > 0.6) safeSet(x, y, TileType.BUILDING);
      }
  }

  // 2. Downtown
  for(let y=3 + SHIFT_Y; y<19 + SHIFT_Y; y++) {
      for(let x=21; x<33; x++) {
          if(canBuild(x,y) && (x+y)%2 === 0 && Math.random() > 0.3) safeSet(x, y, TileType.SKYSCRAPER);
      }
  }

  // 3. Redline
  for(let y=21 + SHIFT_Y; y<31 + SHIFT_Y; y++) {
      for(let x=3; x<19; x++) {
          if(canBuild(x,y) && Math.random() > 0.4) safeSet(x, y, TileType.BUILDING);
      }
  }

  // 4. Rust Quarter
  for(let y=21 + SHIFT_Y; y<34 + SHIFT_Y; y++) {
      for(let x=21; x<33; x++) {
          if(canBuild(x,y) && Math.random() > 0.5) safeSet(x, y, Math.random() > 0.5 ? TileType.BUILDING : TileType.SHOP);
      }
  }

  // Ships Cargo
  for(let cy = 38 + SHIFT_Y; cy < 38 + SHIFT_Y; cy++) { 
      for(let cx = 5; cx < 9; cx++) {
          if (Math.random() > 0.3) safeSet(cx, cy, TileType.CONTAINER);
      }
  }
  
  // Container Yard
  for(let y=33 + SHIFT_Y; y<46 + SHIFT_Y; y++) {
      for(let x=12; x<19; x++) {
          if(canBuild(x,y) && x % 3 !== 0 && y % 3 !== 0) {
               safeSet(x, y, TileType.CONTAINER);
          }
      }
  }

  // Neon Coast
  for(let y=2 + SHIFT_Y; y<48 + SHIFT_Y; y++) {
      for(let x=neonX; x<neonX+neonW; x++) {
           if (canBuild(x,y)) {
               if (Math.random() > 0.1) {
                    const rand = Math.random();
                    let type = TileType.BUILDING;
                    if (rand > 0.6) type = TileType.SHOP;
                    else if (rand > 0.4) type = TileType.CONTAINER;
                    else type = TileType.BUILDING;
                    safeSet(x, y, type);
               }
           }
      }
  }

  // Airport Terminals/Hangars
  fillRect(airportX + 2, 15 + SHIFT_Y, 4, 10, TileType.AIRPORT_TERMINAL);
  fillRect(airportX + 2, 28 + SHIFT_Y, 4, 10, TileType.AIRPORT_TERMINAL);
  
  // Hangars
  fillRect(airportX + 2, 9 + SHIFT_Y, 4, 5, TileType.HANGAR);
  fillRect(airportX + 2, 40 + SHIFT_Y, 4, 5, TileType.HANGAR);


  // ==========================================
  // PHASE 5: SPECIAL LOCATIONS
  // ==========================================
  
  // Hospital
  fillRect(22, 6 + SHIFT_Y, 3, 3, TileType.HOSPITAL);
  
  // Police Station
  fillRect(28, 17 + SHIFT_Y, 3, 3, TileType.POLICE_STATION);

  // Pay 'n' Spray
  safeSet(21, 25 + SHIFT_Y, TileType.PAINT_SHOP); 
  
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
           tile === TileType.MALL ||
           tile === TileType.CONTAINER ||
           tile === TileType.AIRPORT_TERMINAL ||
           tile === TileType.HANGAR;
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
