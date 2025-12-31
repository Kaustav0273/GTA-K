

export const TILE_SIZE = 128;
export const MAP_WIDTH = 160; // Increased from 120
export const MAP_HEIGHT = 160; // Increased from 120

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

export const WEAPON_STATS = {
    fist: { damage: 10, range: 20, fireRate: 30, automatic: false, color: 'transparent' },
    pistol: { damage: 35, range: 400, fireRate: 20, automatic: false, spread: 0.05, bulletSpeed: 25, count: 1 },
    uzi: { damage: 15, range: 300, fireRate: 5, automatic: true, spread: 0.15, bulletSpeed: 28, count: 1 },
    shotgun: { damage: 20, range: 250, fireRate: 45, automatic: false, spread: 0.25, bulletSpeed: 22, count: 6 },
    sniper: { damage: 150, range: 800, fireRate: 70, automatic: false, spread: 0.01, bulletSpeed: 45, count: 1 },
    rocket: { damage: 200, range: 600, fireRate: 90, automatic: false, spread: 0.05, bulletSpeed: 12, count: 1, explosionRadius: 100 },
    flame: { damage: 3, range: 120, fireRate: 3, automatic: true, spread: 0.35, bulletSpeed: 7, count: 3 }
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
  
  // Air
  plane: { color: '#ffffff', maxSpeed: 30, acceleration: 0.15, handling: 0.02, health: 500, size: { x: 90, y: 80 } },
  jet: { color: '#94a3b8', maxSpeed: 45, acceleration: 0.3, handling: 0.015, health: 350, size: { x: 60, y: 70 } },
  
  // Military
  tank: { color: '#3f6212', maxSpeed: 6, acceleration: 0.05, handling: 0.02, health: 1500, size: { x: 38, y: 72 } },
  barracks: { color: '#4d5c42', maxSpeed: 8, acceleration: 0.08, handling: 0.02, health: 800, size: { x: 34, y: 70 } }
};
