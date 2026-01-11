

export const TILE_SIZE = 128;
export const MAP_WIDTH = 160; 
export const MAP_HEIGHT = 160; 

export const MAX_TRAFFIC = 75; 

export const PLAYER_SIZE = { x: 14, y: 14 };
export const CAR_SIZE = { x: 24, y: 56 }; 

export const COLORS = {
  grass: '#365314', // Deep organic green
  road: '#1c1917', // Dark asphalt
  sidewalk: '#78716c', // Stone grey
  water: '#1e3a8a', // Deep ocean blue
  buildingSide: '#404040',
  buildingRoof: '#525252',
  player: '#ffffff',
  pedestrian: '#a3a3a3',
  deadPedestrian: '#7f1d1d', // Dark red
  bullet: '#fbbf24', // Amber gold
  uiPrimary: '#4ade80', // Green
  uiDanger: '#ef4444', // Red
  uiWarning: '#fbbf24', // Yellow
};

export const CAR_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', 
  '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#ffffff', 
  '#94a3b8', '#000000', '#78350f', '#facc15', '#a3e635'
];

// Physics
export const FRICTION = 0.92;
export const ACCELERATION_WALK = 0.5;
export const MAX_SPEED_WALK = 2;
export const MAX_SPEED_SPRINT = 3;
export const ROTATION_SPEED_WALK = 0.15;

// Stamina (60 FPS assumption)
export const STAMINA_MAX = 600; // 10 seconds
export const STAMINA_REGEN_DELAY = 300; // 5 seconds
export const STAMINA_REGEN_RATE = 600 / 900; // Fully regen (600) in 15 seconds (900 frames)

// Vehicle Physics
export const PHYSICS = {
  SURFACE_FRICTION: {
      ROAD: 0.96, // Less rolling resistance (coasting)
      GRASS: 0.90
  },
  SURFACE_GRIP: {
      ROAD: 0.94, // High grip (sharp turns)
      GRASS: 0.85, // Moderate grip offroad
      DRIFT: 0.60  // Handbrake grip
  }
};

// Combat
export const BULLET_SPEED = 25; // Faster bullets for snappier feel
export const BULLET_LIFETIME = 60; // 1 second approx
export const FIRE_RATE = 15; // Frames between shots (Global default, overridden by weapon stats)
export const PEDESTRIAN_SPEED = 1.5;
export const PEDESTRIAN_TEXTING_SPEED = 0.8;
export const PEDESTRIAN_RUN_SPEED = 3.5;
export const PANIC_DISTANCE = 400; // Pixel radius for hearing gunshots

export const WEAPON_STATS: Record<string, any> = {
    fist: { class: 'melee', damage: 10, range: 20, fireRate: 30, automatic: false, color: 'transparent' },
    
    // --- PISTOLS ---
    pistol:        { class: 'pistol', damage: 35, range: 400, fireRate: 20, automatic: false, spread: 0.05, bulletSpeed: 25, count: 1, label: "Pistol" },
    street_hawk:   { class: 'pistol', damage: 40, range: 450, fireRate: 18, automatic: false, spread: 0.04, bulletSpeed: 28, count: 1, label: "Street Hawk" },
    silver_fang:   { class: 'pistol', damage: 55, range: 350, fireRate: 25, automatic: false, spread: 0.06, bulletSpeed: 26, count: 1, label: "Silver Fang" },
    night_viper:   { class: 'pistol', damage: 30, range: 400, fireRate: 15, automatic: true,  spread: 0.08, bulletSpeed: 25, count: 1, label: "Night Viper" },
    pulse_9x:      { class: 'pistol', damage: 25, range: 380, fireRate: 10, automatic: true,  spread: 0.10, bulletSpeed: 24, count: 1, label: "Pulse 9X" },
    iron_whisper:  { class: 'pistol', damage: 45, range: 500, fireRate: 30, automatic: false, spread: 0.02, bulletSpeed: 30, count: 1, label: "Iron Whisper" },
    neon_ace:      { class: 'pistol', damage: 38, range: 420, fireRate: 12, automatic: false, spread: 0.05, bulletSpeed: 28, count: 1, label: "Neon Ace" },

    // --- SMGS ---
    uzi:           { class: 'smg', damage: 15, range: 300, fireRate: 5, automatic: true, spread: 0.15, bulletSpeed: 28, count: 1, label: "Micro SMG" },
    rapid_wolf:    { class: 'smg', damage: 18, range: 320, fireRate: 4, automatic: true, spread: 0.18, bulletSpeed: 30, count: 1, label: "Rapid Wolf" },
    urban_ripper:  { class: 'smg', damage: 20, range: 280, fireRate: 6, automatic: true, spread: 0.20, bulletSpeed: 26, count: 1, label: "Urban Ripper" },
    vortex_smg:    { class: 'smg', damage: 14, range: 350, fireRate: 3, automatic: true, spread: 0.12, bulletSpeed: 32, count: 1, label: "Vortex SMG" },
    shadow_spray:  { class: 'smg', damage: 12, range: 250, fireRate: 2, automatic: true, spread: 0.25, bulletSpeed: 25, count: 1, label: "Shadow Spray" },
    bullet_hive:   { class: 'smg', damage: 16, range: 300, fireRate: 3, automatic: true, spread: 0.15, bulletSpeed: 28, count: 1, label: "Bullet Hive" },
    turbo_stinger: { class: 'smg', damage: 13, range: 310, fireRate: 2, automatic: true, spread: 0.14, bulletSpeed: 35, count: 1, label: "Turbo Stinger" },

    // --- SHOTGUNS ---
    shotgun:       { class: 'shotgun', damage: 20, range: 250, fireRate: 45, automatic: false, spread: 0.25, bulletSpeed: 22, count: 6, label: "Shotgun" },
    doom_breaker:  { class: 'shotgun', damage: 30, range: 200, fireRate: 60, automatic: false, spread: 0.30, bulletSpeed: 20, count: 8, label: "Doom Breaker" },
    thunder_judge: { class: 'shotgun', damage: 18, range: 280, fireRate: 25, automatic: true,  spread: 0.20, bulletSpeed: 24, count: 5, label: "Thunder Judge" },
    skull_shatter: { class: 'shotgun', damage: 25, range: 220, fireRate: 50, automatic: false, spread: 0.28, bulletSpeed: 22, count: 7, label: "Skull Shatter" },
    iron_boom:     { class: 'shotgun', damage: 40, range: 180, fireRate: 70, automatic: false, spread: 0.35, bulletSpeed: 18, count: 10, label: "Iron Boom" },
    road_cleaner:  { class: 'shotgun', damage: 15, range: 300, fireRate: 20, automatic: true,  spread: 0.15, bulletSpeed: 25, count: 4, label: "Road Cleaner" },
    hell_bison:    { class: 'shotgun', damage: 22, range: 240, fireRate: 40, automatic: false, spread: 0.22, bulletSpeed: 23, count: 6, label: "Hell Bison" },

    // --- SNIPERS ---
    sniper:        { class: 'sniper', damage: 150, range: 800, fireRate: 70, automatic: false, spread: 0.01, bulletSpeed: 45, count: 1, label: "Sniper Rifle" },
    silent_eclipse:{ class: 'sniper', damage: 130, range: 750, fireRate: 60, automatic: false, spread: 0.00, bulletSpeed: 48, count: 1, label: "Silent Eclipse" },
    longshot_zero: { class: 'sniper', damage: 180, range: 1000, fireRate: 90, automatic: false, spread: 0.00, bulletSpeed: 55, count: 1, label: "Longshot Zero" },
    phantom_eye:   { class: 'sniper', damage: 140, range: 850, fireRate: 65, automatic: false, spread: 0.01, bulletSpeed: 46, count: 1, label: "Phantom Eye" },
    widow_maker_x: { class: 'sniper', damage: 200, range: 900, fireRate: 100, automatic: false, spread: 0.00, bulletSpeed: 50, count: 1, label: "Widow Maker X" },
    frost_piercer: { class: 'sniper', damage: 120, range: 700, fireRate: 40, automatic: true,  spread: 0.03, bulletSpeed: 42, count: 1, label: "Frost Piercer" },
    dark_horizon:  { class: 'sniper', damage: 160, range: 950, fireRate: 80, automatic: false, spread: 0.00, bulletSpeed: 52, count: 1, label: "Dark Horizon" },

    // --- RPGS ---
    rocket:        { class: 'rocket', damage: 200, range: 600, fireRate: 90, automatic: false, spread: 0.05, bulletSpeed: 12, count: 1, explosionRadius: 100, label: "RPG" },
    dragon_roar:   { class: 'rocket', damage: 250, range: 650, fireRate: 100, automatic: false, spread: 0.04, bulletSpeed: 14, count: 1, explosionRadius: 120, label: "Dragon Roar" },
    sky_eraser:    { class: 'rocket', damage: 180, range: 800, fireRate: 80, automatic: false, spread: 0.02, bulletSpeed: 18, count: 1, explosionRadius: 90,  label: "Sky Eraser" },
    titan_fall:    { class: 'rocket', damage: 300, range: 500, fireRate: 120, automatic: false, spread: 0.08, bulletSpeed: 10, count: 1, explosionRadius: 150, label: "Titan Fall" },
    blast_serpent: { class: 'rocket', damage: 150, range: 550, fireRate: 40, automatic: true,  spread: 0.10, bulletSpeed: 15, count: 1, explosionRadius: 60,  label: "Blast Serpent" },
    nova_cannon:   { class: 'rocket', damage: 400, range: 400, fireRate: 150, automatic: false, spread: 0.05, bulletSpeed: 8,  count: 1, explosionRadius: 200, label: "Nova Cannon" },
    earth_splitter:{ class: 'rocket', damage: 220, range: 600, fireRate: 90, automatic: false, spread: 0.05, bulletSpeed: 12, count: 2, explosionRadius: 100, label: "Earth Splitter" },

    // --- FLAMETHROWERS ---
    flame:         { class: 'flame', damage: 3, range: 120, fireRate: 3, automatic: true, spread: 0.35, bulletSpeed: 7, count: 3, label: "Flamethrower" },
    inferno_kiss:  { class: 'flame', damage: 4, range: 100, fireRate: 2, automatic: true, spread: 0.40, bulletSpeed: 6, count: 4, label: "Inferno Kiss" },
    fire_leviathan:{ class: 'flame', damage: 5, range: 150, fireRate: 4, automatic: true, spread: 0.30, bulletSpeed: 8, count: 3, label: "Fire Leviathan" },
    ember_storm:   { class: 'flame', damage: 2, range: 130, fireRate: 1, automatic: true, spread: 0.50, bulletSpeed: 7, count: 5, label: "Ember Storm" },
    heat_reaper:   { class: 'flame', damage: 6, range: 110, fireRate: 3, automatic: true, spread: 0.25, bulletSpeed: 7, count: 2, label: "Heat Reaper" },
    blaze_hydra:   { class: 'flame', damage: 3, range: 140, fireRate: 3, automatic: true, spread: 0.60, bulletSpeed: 6, count: 6, label: "Blaze Hydra" },
    pyro_lord:     { class: 'flame', damage: 8, range: 160, fireRate: 5, automatic: true, spread: 0.20, bulletSpeed: 9, count: 3, label: "Pyro Lord" },
};

export const CAR_MODELS = {
  sedan: { color: '#2563eb', maxSpeed: 11, acceleration: 0.20, handling: 0.04, health: 200 },
  sport: { color: '#dc2626', maxSpeed: 16, acceleration: 0.35, handling: 0.05, health: 160 },
  truck: { color: '#713f12', maxSpeed: 8, acceleration: 0.10, handling: 0.025, health: 300, size: { x: 32, y: 64 } },
  taxi: { color: '#f59e0b', maxSpeed: 10, acceleration: 0.22, handling: 0.045, health: 200 },
  police: { color: '#0f172a', maxSpeed: 14, acceleration: 0.28, handling: 0.045, health: 240 },
  muscle: { color: '#ea580c', maxSpeed: 14, acceleration: 0.30, handling: 0.03, health: 220 },
  van: { color: '#64748b', maxSpeed: 7, acceleration: 0.10, handling: 0.025, health: 280, size: { x: 32, y: 64 } },
  limo: { color: '#000000', maxSpeed: 9, acceleration: 0.12, handling: 0.015, health: 260, size: { x: 30, y: 90 } },
  ambulance: { color: '#ffffff', maxSpeed: 10, acceleration: 0.15, handling: 0.025, health: 320, size: { x: 34, y: 70 } },
  
  // New Models
  supercar: { color: '#8b5cf6', maxSpeed: 18, acceleration: 0.45, handling: 0.06, health: 140, size: { x: 26, y: 56 } },
  compact: { color: '#06b6d4', maxSpeed: 9, acceleration: 0.25, handling: 0.05, health: 120, size: { x: 22, y: 44 } },
  suv: { color: '#166534', maxSpeed: 9, acceleration: 0.15, handling: 0.03, health: 280, size: { x: 30, y: 66 } },
  pickup: { color: '#78350f', maxSpeed: 9, acceleration: 0.14, handling: 0.025, health: 260, size: { x: 30, y: 68 } },
  swat: { color: '#111827', maxSpeed: 10, acceleration: 0.12, handling: 0.02, health: 600, size: { x: 34, y: 70 } },
  firetruck: { color: '#b91c1c', maxSpeed: 8, acceleration: 0.08, handling: 0.015, health: 800, size: { x: 36, y: 90 } },
  bus: { color: '#0ea5e9', maxSpeed: 6, acceleration: 0.06, handling: 0.01, health: 700, size: { x: 36, y: 100 } },
  
  // Bikes
  bike: { color: '#ef4444', maxSpeed: 11, acceleration: 0.25, handling: 0.08, health: 80, size: { x: 12, y: 34 } },
  scooter: { color: '#cbd5e1', maxSpeed: 8, acceleration: 0.18, handling: 0.1, health: 60, size: { x: 12, y: 30 } },
  dirtbike: { color: '#16a34a', maxSpeed: 13, acceleration: 0.35, handling: 0.07, health: 90, size: { x: 14, y: 36 } },
  superbike: { color: '#3b82f6', maxSpeed: 22, acceleration: 0.55, handling: 0.05, health: 100, size: { x: 14, y: 38 } },

  // Air
  plane: { color: '#ffffff', maxSpeed: 30, acceleration: 0.15, handling: 0.02, health: 500, size: { x: 90, y: 80 } },
  jet: { color: '#94a3b8', maxSpeed: 45, acceleration: 0.3, handling: 0.015, health: 350, size: { x: 60, y: 70 } },
  
  // Military
  tank: { color: '#3f6212', maxSpeed: 6, acceleration: 0.05, handling: 0.02, health: 1500, size: { x: 38, y: 72 } },
  barracks: { color: '#4d5c42', maxSpeed: 8, acceleration: 0.08, handling: 0.02, health: 800, size: { x: 34, y: 70 } }
};

export const SAFEHOUSE_DEFS = [
    { id: 'starter_home', tile: { x: 8, y: 8 }, price: 0 },
    { id: 'downtown_apt', tile: { x: 25, y: 15 }, price: 5000 },
    { id: 'luxury_condo', tile: { x: 45, y: 25 }, price: 15000 },
    { id: 'beach_house', tile: { x: 12, y: 40 }, price: 25000 },
];
