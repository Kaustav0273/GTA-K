

import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, COLORS } from "../constants";
import { TileType } from "../types";

// Helper to identify road tiles
const isRoad = (t: number) => t === TileType.ROAD_H || t === TileType.ROAD_V || t === TileType.ROAD_CROSS || t === TileType.RAIL_CROSSING;

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

  // Helper to check if we can pave over (Build Roads)
  // UPDATED: Now allows paving over WATER to create bridges!
  const canPave = (x: number, y: number) => {
      if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return false;
      const t = map[y][x];
      // Protected Tiles (Do not pave over)
      if (
          t === TileType.BUILDING || t === TileType.SKYSCRAPER || 
          t === TileType.SHOP || t === TileType.MALL || 
          t === TileType.HOSPITAL || t === TileType.POLICE_STATION || 
          t === TileType.TRAIN_STATION || t === TileType.HANGAR || 
          t === TileType.AIRPORT_TERMINAL || t === TileType.CONTAINER || 
          t === TileType.SHIP_DECK || t === TileType.RUNWAY ||
          t === TileType.TARMAC || 
          t === TileType.FOOTBALL_FIELD || t === TileType.WALL ||
          t === TileType.PAINT_SHOP || t === TileType.RAIL || t === TileType.RAIL_CROSSING ||
          t === TileType.CONSTRUCTION || 
          t === TileType.MILITARY_GROUND || t === TileType.FENCE_H || t === TileType.FENCE_V || 
          t === TileType.BUNKER || t === TileType.WATCHTOWER || t === TileType.HELIPAD ||
          t === TileType.WAREHOUSE || t === TileType.FACTORY || 
          t === TileType.TENEMENT || t === TileType.PROJECTS
      ) {
          return false;
      }
      return true; 
  };

  const drawRoad = (x: number, y: number, horizontal: boolean) => {
      if (canPave(x, y)) {
          safeSet(x, y, horizontal ? TileType.ROAD_H : TileType.ROAD_V);
      }
  };

  // Shift constant to move original map down
  const SHIFT_Y = 30;

  // ==========================================
  // PHASE 0: NEW NORTH AREAS (y=0 to y=30)
  // ==========================================

  // North West - Pine Hills (Residential/Suburbs)
  fillRect(4, 4, 34, 26, TileType.GRASS);
  
  // North East - Uptown / Little Tokyo
  fillRect(42, 4, 34, 26, TileType.SIDEWALK);
  
  // NEW: Eastern Suburbs (Filling the gap between City and Airport)
  fillRect(78, 4, 16, 26, TileType.GRASS); 
  
  // CONSTRUCTION SITE (Moved to avoid roads: Gap between x=58/72 and y=15/24)
  fillRect(60, 16, 11, 7, TileType.CONSTRUCTION);

  // Central Park Lake Area
  fillRect(38, 10, 4, 15, TileType.WATER); 

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

  // === PORT AUTHORITY (EXPANDED) ===
  const portY = 32 + SHIFT_Y;
  // Main concrete base
  fillRect(2, portY, 32, 28, TileType.SIDEWALK);
  
  // Water Inlets (Slips)
  fillRect(2, portY + 4, 12, 4, TileType.WATER);
  fillRect(2, portY + 14, 12, 4, TileType.WATER);
  
  // Piers (Decks sticking out into water/inlets)
  fillRect(14, portY + 2, 6, 8, TileType.SHIP_DECK); // Pier 1
  fillRect(14, portY + 12, 6, 8, TileType.SHIP_DECK); // Pier 2
  
  // Large Southern Dock
  fillRect(4, portY + 22, 20, 6, TileType.SHIP_DECK);
  
  // Container Yard Zones (Markers for later)
  // Logic handled in Phase 6 building placement

  // Neon Coast / Industrial (Original Zone)
  const neonX = 35;
  const neonW = 23; 
  fillRect(neonX, 2 + SHIFT_Y, neonW, 46, TileType.SIDEWALK);

  // NEW: "Sunnyvale" Strip (Connecting Industrial to Airport)
  fillRect(neonX + neonW, 2 + SHIFT_Y, 32, 46, TileType.GRASS);

  // ==========================================
  // PHASE 2: EXTENDED SOUTH TERRAIN & OUTER RIM
  // ==========================================
  
  // South Side - New Terrain Extension (y=80 to 115)
  fillRect(4, 80, 112, 35, TileType.GRASS);
  
  // EXTENSION FOR 160x160: Far East and Deep South
  
  // Extend South (y=115 to 155)
  fillRect(4, 115, 152, 40, TileType.GRASS);
  
  // Extend East (x=116 to 155)
  fillRect(116, 4, 40, 151, TileType.GRASS);
  
  // TRAIN STATION COMPLEX (Moved to x=73, y=66 to fit gap between roads x72/90 and y65/Rail74)
  const stationX = 73;
  const stationY = 66;
  const stationW = 16;
  const stationH = 8;
  
  fillRect(stationX, stationY, stationW, stationH, TileType.TRAIN_STATION);
  
  // SOCCER FIELD (Moved to x=73, y=96 to fit gap between roads y95/105 and x72/88)
  // Adjusted width to 14 to ensure it clears x=88 road (73+14=87)
  fillRect(73, 96, 14, 8, TileType.FOOTBALL_FIELD);

  // === AIRPORT (EXPANDED) ===
  const airportX = 92; // Moved slightly left to maximize space
  const airportWidth = 44; // Doubled width
  const airportHeight = 56;
  const airportY = 2 + SHIFT_Y;

  // Base Tarmac
  fillRect(airportX, airportY, airportWidth, airportHeight, TileType.TARMAC);
  
  // Terminal Area (Left Side)
  fillRect(airportX, airportY, 8, airportHeight, TileType.SIDEWALK);
  
  // Grass Islands between runways
  fillRect(airportX + 20, airportY + 4, 6, airportHeight - 8, TileType.GRASS);
  
  // Connecting Taxiways (DRAWN BEFORE RUNWAYS TO PREVENT SPLIT)
  fillRect(airportX + 8, airportY + 10, 26, 2, TileType.TARMAC); // Top Cross
  fillRect(airportX + 8, airportY + 30, 26, 2, TileType.TARMAC); // Mid Cross
  fillRect(airportX + 8, airportY + 50, 26, 2, TileType.TARMAC); // Bot Cross

  // Runway 1 (Left Inner) - Drawn last to stay continuous
  fillRect(airportX + 12, airportY + 4, 4, airportHeight - 8, TileType.RUNWAY);
  
  // Runway 2 (Right Outer) - Drawn last to stay continuous
  fillRect(airportX + 30, airportY + 4, 4, airportHeight - 8, TileType.RUNWAY);


  // ==========================================
  // PHASE 3: ROADS (REFACTORED FOR BETTER CONNECTIVITY)
  // ==========================================

  const roadLimitX = 156; // Updated for wider map
  const bottomLoopY = 155; // Updated for taller map

  // --- HORIZONTAL ROADS ---
  
  // 1. North Highway Loop (Top Edge)
  for(let x=4; x<roadLimitX; x++) drawRoad(x, 4, true);

  // 1b. North Suburbs Loop
  for(let x=4; x<roadLimitX; x++) drawRoad(x, 9, true);
  
  // 2. North Arterials
  for(let x=4; x<roadLimitX; x++) drawRoad(x, 15, true); 

  // 2b. North-Mid Transition (Crucial Connector)
  for(let x=4; x<roadLimitX; x++) drawRoad(x, 24, true); 

  // 3. Original City Grid Restoration
  for(let x=5; x<airportX; x++) {
      drawRoad(x, 2 + SHIFT_Y + 7, true);  // y=39
      drawRoad(x, 20 + SHIFT_Y, true);     // y=50
      drawRoad(x, 35 + SHIFT_Y, true);     // y=65
      drawRoad(x, 28 + SHIFT_Y, true);     // y=58
  }
  
  // 5. South Arterial (New Main Road)
  for(let x=5; x<roadLimitX; x++) drawRoad(x, 85, true);
  for(let x=5; x<roadLimitX; x++) drawRoad(x, 95, true);
  for(let x=5; x<roadLimitX; x++) drawRoad(x, 105, true);
  
  // 5b. Deep South Roads (New)
  for(let x=5; x<roadLimitX; x++) drawRoad(x, 125, true);
  for(let x=5; x<roadLimitX; x++) drawRoad(x, 140, true);

  // 6. Bottom Highway Loop
  for(let x=5; x<roadLimitX; x++) drawRoad(x, bottomLoopY, true);


  // --- VERTICAL ROADS (Main Arteries) ---
  
  // 1. Far West Loop
  for(let y=4; y<=bottomLoopY; y++) drawRoad(5, y, false); 
  
  // 2. Pine Hills Inner
  for(let y=4; y<=bottomLoopY; y++) drawRoad(12, y, false);

  // 3. Pine Hills / West Side Main (x=20)
  for(let y=4; y<=bottomLoopY; y++) drawRoad(20, y, false); 

  // 4. Downtown Grid
  for(let y=4; y<=bottomLoopY; y++) drawRoad(33, y, false);

  // 5. Industrial / Neon Coast (x=46)
  for(let y=4; y<=bottomLoopY; y++) drawRoad(neonX + 11, y, false);

  // 6. Central Ave (x=58)
  for(let y=4; y<=bottomLoopY; y++) drawRoad(58, y, false); 

  // 7. East of Central
  for(let y=4; y<=bottomLoopY; y++) drawRoad(72, y, false);

  // 8. Sunnyvale / East Side Main (x=90) - Updated to hug airport
  for(let y=4; y<=bottomLoopY; y++) drawRoad(88, y, false);
  
  // 9. Airport Frontage (Left side of airport)
  for(let y=4; y<=bottomLoopY; y++) drawRoad(airportX - 2, y, false);

  // 10. Deep East (Right side of airport)
  for(let y=4; y<=bottomLoopY; y++) drawRoad(airportX + airportWidth + 2, y, false);
  
  // 10b. Far East Expansion Roads
  for(let y=4; y<=bottomLoopY; y++) drawRoad(145, y, false);

  // 11. Far East Loop
  for(let y=4; y<=bottomLoopY; y++) drawRoad(roadLimitX - 1, y, false);


  // ==========================================
  // PHASE 4: RAILWAY NETWORK
  // ==========================================
  
  // Function to draw rail segment safely
  const drawRail = (x: number, y: number) => {
      if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return;
      const t = map[y][x];
      // If road, make crossing. If water/grass/sidewalk, make rail.
      if (t === TileType.ROAD_V || t === TileType.ROAD_H || t === TileType.ROAD_CROSS) {
          map[y][x] = TileType.RAIL_CROSSING;
      } else {
          // Do not overwrite key infrastructure
          if (
              t !== TileType.BUILDING && 
              t !== TileType.HOSPITAL && 
              t !== TileType.POLICE_STATION && 
              t !== TileType.MALL && 
              t !== TileType.TRAIN_STATION &&
              t !== TileType.CONSTRUCTION && // Protect Construction
              t !== TileType.RUNWAY && // Protect Airport
              t !== TileType.TARMAC && 
              t !== TileType.AIRPORT_TERMINAL &&
              t !== TileType.HANGAR &&
              t !== TileType.MILITARY_GROUND &&
              t !== TileType.BUNKER &&
              t !== TileType.WAREHOUSE && t !== TileType.FACTORY && 
              t !== TileType.TENEMENT && t !== TileType.PROJECTS
          ) {
              map[y][x] = TileType.RAIL;
          }
      }
  };

  // Rail Loop Coordinates
  // Start at Station (73, 66) -> Go Right to Outer East (145) -> Go Up to Top (2) -> Go Left to Outer West (2) -> Go Down to Bottom (148) -> Go Right to connect
  
  const railLoop = [
      { x: 2, y: 2, w: 148, h: 2 }, // Top Horiz
      { x: 148, y: 2, w: 2, h: 148 }, // Right Vert
      { x: 2, y: 148, w: 148, h: 2 }, // Bottom Horiz
      { x: 2, y: 2, w: 2, h: 148 }, // Left Vert
  ];
  
  // Inner City Loop connection (Station is at 73, 66)
  // Connect Station West to Main Line
  // Connect Station East to Main Line
  const railY = stationY + stationH; // 74
  
  // Draw Grand Outer Loop
  // Top
  for(let x=2; x<150; x++) { drawRail(x, 2); drawRail(x, 3); }
  // Right
  for(let y=2; y<150; y++) { drawRail(149, y); drawRail(150, y); }
  // Bottom
  for(let x=2; x<150; x++) { drawRail(x, 149); drawRail(x, 150); }
  // Left
  for(let y=2; y<150; y++) { drawRail(2, y); drawRail(3, y); }
  
  // --- CROSS-CITY CONNECTOR (REROUTED AROUND AIRPORT) ---
  // Starts Left Outer (x=3) goes East to Station (x=73), then to Airport area
  
  // 1. West to Station to Airport Approach (x=4 to x=88)
  for(let x=4; x<=88; x++) {
      drawRail(x, railY);
      drawRail(x, railY+1);
  }

  // 2. Airport Bypass (Jog DOWN)
  // At x=88, track is at y=74. Airport extends to y=88.
  // We divert down to y=90 to pass under it.
  for(let y=railY; y<=90; y++) {
      drawRail(88, y);
      drawRail(89, y);
  }

  // 3. Airport Underpass (Horizontal East)
  for(let x=88; x<149; x++) {
      drawRail(x, 90);
      drawRail(x, 91);
  }
  
  // --- NORTH-SOUTH SPINE (REROUTED AROUND CONSTRUCTION) ---
  // Spine X = 63. Construction is at x=60-70, y=16-22.
  
  // 1. Top to Approaching Construction (y=4 to y=12)
  for(let y=4; y<=12; y++) {
      drawRail(63, y);
      drawRail(64, y);
  }

  // 2. Construction Bypass (Jog LEFT)
  // Divert west to x=56
  for(let x=56; x<=64; x++) {
      drawRail(x, 12);
      drawRail(x, 13);
  }

  // 3. Construction Bypass (Vertical Down)
  // Go down at x=56 from y=12 to y=26 (clearing construction bottom y=22)
  for(let y=12; y<=26; y++) {
      drawRail(56, y);
      drawRail(57, y);
  }

  // 4. Return to Main Line (Jog RIGHT)
  for(let x=56; x<=64; x++) {
      drawRail(x, 26);
      drawRail(x, 27);
  }

  // 5. Continue South (y=26 to 149)
  for(let y=26; y<149; y++) {
      drawRail(63, y);
      drawRail(64, y);
  }

  // Platform Connectors at Station
  fillRect(stationX + 2, stationY + stationH, 2, 1, TileType.SIDEWALK);
  fillRect(stationX + stationW - 4, stationY + stationH, 2, 1, TileType.SIDEWALK);


  // ==========================================
  // PHASE 5: FOOTPATHS
  // ==========================================
  const footpathCandidates: {x: number, y: number}[] = [];
  
  for(let y=1; y<MAP_HEIGHT-1; y++) {
      for(let x=1; x<MAP_WIDTH-1; x++) {
          if (isRoad(map[y][x])) {
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
  footpathCandidates.forEach(c => {
      const t = map[c.y][c.x];
      if (t === TileType.GRASS || t === TileType.SIDEWALK) {
        map[c.y][c.x] = TileType.FOOTPATH;
      }
  });


  // ==========================================
  // PHASE 6: BUILDINGS & OBJECTS
  // ==========================================
  
  // Place Mall FIRST
  const mallX = 74;
  const mallY = 16;
  const mallW = 15;
  const mallH = 7;

  fillRect(mallX, mallY, mallW, mallH, TileType.TARMAC);
  fillRect(mallX + 1, mallY + 1, mallW - 2, mallH - 2, TileType.MALL);
  safeSet(mallX + 1, mallY + 1, TileType.BUILDING); 
  safeSet(mallX + mallW - 2, mallY + 1, TileType.BUILDING); 
  safeSet(mallX + 1, mallY + mallH - 2, TileType.BUILDING); 
  safeSet(mallX + mallW - 2, mallY + mallH - 2, TileType.BUILDING); 
  fillRect(mallX + 6, mallY + mallH - 1, 3, 1, TileType.SIDEWALK);


  const canBuild = (x: number, y: number) => {
      if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return false;
      const t = map[y][x];
      // Can only build on land - EXCLUDING FOOTPATHS and RAILS
      // This is the key fix: We do NOT include TileType.RAIL here.
      // So buildings will never spawn on rails.
      return t === TileType.GRASS || t === TileType.SIDEWALK;
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
      for(let x=44; x<114; x++) {
          if (x > 90) continue; // Airport
          if(canBuild(x,y) && (x+y)%3 === 0 && Math.random() > 0.2) safeSet(x, y, TileType.SKYSCRAPER);
      }
  }
  
  // Eastside Suburbs
  for(let y=6; y<28; y+=3) {
      for(let x=78; x<90; x+=3) {
          if(canBuild(x,y) && Math.random() > 0.3) safeSet(x, y, TileType.BUILDING);
      }
  }

  // --- ORIGINAL BUILDINGS (Shifted) ---
  // Hillside Heights
  for(let y=3 + SHIFT_Y; y<18 + SHIFT_Y; y+=2) {
      for(let x=3; x<18; x+=2) {
          if(canBuild(x,y) && Math.random() > 0.6) safeSet(x, y, TileType.BUILDING);
      }
  }

  // Downtown
  for(let y=3 + SHIFT_Y; y<19 + SHIFT_Y; y++) {
      for(let x=21; x<33; x++) {
          if(canBuild(x,y) && (x+y)%2 === 0 && Math.random() > 0.3) safeSet(x, y, TileType.SKYSCRAPER);
      }
  }

  // Redline
  for(let y=21 + SHIFT_Y; y<31 + SHIFT_Y; y++) {
      for(let x=3; x<19; x++) {
          if(canBuild(x,y) && Math.random() > 0.4) safeSet(x, y, TileType.BUILDING);
      }
  }

  // Rust Quarter
  for(let y=21 + SHIFT_Y; y<34 + SHIFT_Y; y++) {
      for(let x=21; x<33; x++) {
          if(canBuild(x,y) && Math.random() > 0.5) safeSet(x, y, Math.random() > 0.5 ? TileType.BUILDING : TileType.SHOP);
      }
  }

  // PORT AUTHORITY BUILDINGS
  // Containers in the yard - FORCED 2-TILE PLACEMENT WITH GAPS
  // We use cx+=3 or check neighbor to ensure no contiguous containers causing render glitches.
  for(let cy = portY + 2; cy < portY + 26; cy+=2) { 
      for(let cx = 4; cx < 30; cx++) {
          // Check for space for 2 tiles side-by-side
          if (cx + 1 < 30 && map[cy][cx] === TileType.SIDEWALK && map[cy][cx+1] === TileType.SIDEWALK) {
              
              // CRITICAL FIX: Ensure previous tile is NOT a container to prevent contiguous runs
              // This fixes "invisible containers" caused by renderer merging logic failure
              if (cx > 0 && map[cy][cx-1] === TileType.CONTAINER) continue;

              // 40% chance to place a container pair
              if (Math.random() > 0.4) {
                  safeSet(cx, cy, TileType.CONTAINER);
                  safeSet(cx+1, cy, TileType.CONTAINER);
                  // We effectively filled next tile, next loop iter handles logic, but since we check cx-1, it will skip properly.
              }
          }
      }
  }
  
  // Neon Coast (REMOVED RANDOM CONTAINERS)
  for(let y=2 + SHIFT_Y; y<48 + SHIFT_Y; y++) {
      for(let x=neonX; x<neonX+neonW; x++) {
           if (canBuild(x,y)) {
               if (Math.random() > 0.1) {
                    const rand = Math.random();
                    if (rand > 0.6) safeSet(x, y, TileType.SHOP);
                    // Removed Container Option
                    else safeSet(x, y, TileType.BUILDING);
               }
           }
      }
  }
  
  // Sunnyvale
  for(let y=2 + SHIFT_Y; y<74; y+=3) { 
      for(let x=neonX + neonW + 2; x<airportX; x+=3) {
           if (canBuild(x,y) && Math.random() > 0.3) {
               safeSet(x, y, TileType.BUILDING);
           }
      }
  }
  
  // South Side Industrial / Residential (REMOVED RANDOM CONTAINERS)
  // Replaced generic BUILDING with FACTORY and WAREHOUSE
  for(let y=78; y<150; y+=3) { // Extended Y range
      for(let x=6; x<150; x+=3) { // Extended X range
          
          // EXCLUDE AIRPORT AREA FROM BUILDING SPAWN
          if (x >= airportX && x < airportX + airportWidth && y >= airportY && y < airportY + airportHeight) continue;
          
          // EXCLUDE MILITARY BASE AREA FROM RANDOM SPAWN (Approximation: X>100, Y>110)
          if (x > 100 && y > 110) continue;

          if (canBuild(x,y) && Math.random() > 0.35) {
              const rand = Math.random();
              if (rand > 0.7) safeSet(x, y, TileType.SHOP);
              else if (rand > 0.4) safeSet(x, y, TileType.FACTORY);
              else safeSet(x, y, TileType.WAREHOUSE);
          }
      }
  }
  
  // Far East Expansion Buildings
  // Replaced generic BUILDING with TENEMENT and PROJECTS
  for(let y=6; y<150; y+=3) {
      for(let x=146; x<160; x+=3) {
           // EXCLUDE MILITARY BASE AREA
           if (x > 100 && y > 110) continue;
           
          if (canBuild(x,y) && Math.random() > 0.4) {
              const rand = Math.random();
              if (rand > 0.7) safeSet(x, y, TileType.PROJECTS);
              else safeSet(x, y, TileType.TENEMENT);
          }
      }
  }

  // Airport Terminals/Hangars (Expanded)
  // Main Terminals (Vertical row on left)
  for(let y=airportY + 6; y < airportY + 50; y+=12) {
      fillRect(airportX + 2, y, 5, 10, TileType.AIRPORT_TERMINAL);
  }
  
  // Hangars (Right side)
  for(let y=airportY + 6; y < airportY + 50; y+=14) {
      fillRect(airportX + airportWidth - 6, y, 5, 8, TileType.HANGAR);
  }

  // ==========================================
  // PHASE 8: MILITARY BASE (FORT KNOX STYLE)
  // ==========================================
  // Location: Bottom Right Corner (Deep South / East)
  const baseX = 105;
  const baseY = 115;
  const baseW = 35;
  const baseH = 35;

  // 1. Base Ground (Concrete/Dirt Mix)
  fillRect(baseX, baseY, baseW, baseH, TileType.MILITARY_GROUND);

  // 2. Perimeter Fence
  // Top
  for(let x=baseX; x<baseX+baseW; x++) safeSet(x, baseY, TileType.FENCE_H);
  // Bottom
  for(let x=baseX; x<baseX+baseW; x++) safeSet(x, baseY+baseH-1, TileType.FENCE_H);
  // Left
  for(let y=baseY; y<baseY+baseH; y++) safeSet(baseX, y, TileType.FENCE_V);
  // Right
  for(let y=baseY; y<baseY+baseH; y++) safeSet(baseX+baseW-1, y, TileType.FENCE_V);

  // 3. Entrance (Top-Left connection to road at X=105 is tricky, let's make entrance at top left side)
  // Clear fence at (baseX, baseY + 10)
  safeSet(baseX, baseY + 10, TileType.MILITARY_GROUND);
  safeSet(baseX, baseY + 11, TileType.MILITARY_GROUND);
  // Connect a road out to the main grid (Main road is at x=88 or x=125, y=125)
  // Let's connect to x=105 road if it exists? No, x=88 is closest vertical main.
  // Draw access road from base entrance (x=105, y=125) to West (x=88)
  for(let x=88; x<=105; x++) drawRoad(x, baseY + 10, true);

  // 4. Bunkers & Hangars
  // Large Bunkers (South side)
  fillRect(baseX + 5, baseY + baseH - 10, 8, 6, TileType.BUNKER);
  fillRect(baseX + 20, baseY + baseH - 10, 8, 6, TileType.BUNKER);
  
  // Helipads (Center)
  fillRect(baseX + 15, baseY + 15, 6, 6, TileType.HELIPAD);

  // Watchtowers (Corners)
  safeSet(baseX + 1, baseY + 1, TileType.WATCHTOWER);
  safeSet(baseX + baseW - 2, baseY + 1, TileType.WATCHTOWER);
  safeSet(baseX + 1, baseY + baseH - 2, TileType.WATCHTOWER);
  safeSet(baseX + baseW - 2, baseY + baseH - 2, TileType.WATCHTOWER);

  // Interior Roads
  for(let x=baseX + 2; x<baseX + baseW - 2; x++) safeSet(x, baseY + 10, TileType.ROAD_H); // Main Hz
  for(let y=baseY + 2; y<baseY + baseH - 2; y++) safeSet(baseX + 10, y, TileType.ROAD_V); // Main Vt


  // ==========================================
  // PHASE 9: SPECIAL LOCATIONS & CLEANUP
  // ==========================================
  
  // Hospital
  fillRect(21, 6 + SHIFT_Y, 3, 3, TileType.HOSPITAL);
  
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
              const isR = (t: number) => t === TileType.ROAD_H || t === TileType.ROAD_V || t === TileType.ROAD_CROSS || t === TileType.RAIL_CROSSING;
              
              if ((isR(u) || isR(d)) && (isR(l) || isR(r))) {
                  if (map[y][x] !== TileType.RAIL_CROSSING) {
                      map[y][x] = TileType.ROAD_CROSS;
                  }
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
           tile === TileType.HANGAR ||
           tile === TileType.TRAIN_STATION ||
           tile === TileType.WALL ||
           tile === TileType.FENCE_H ||
           tile === TileType.FENCE_V ||
           tile === TileType.BUNKER ||
           tile === TileType.WATCHTOWER ||
           tile === TileType.WAREHOUSE || 
           tile === TileType.FACTORY ||
           tile === TileType.TENEMENT || 
           tile === TileType.PROJECTS;
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
