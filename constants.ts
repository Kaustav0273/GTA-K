
export const TILE_SIZE = 64;
export const MAP_WIDTH = 50; // In tiles
export const MAP_HEIGHT = 50; // In tiles

export const PLAYER_SIZE = { x: 14, y: 14 };
export const CAR_SIZE = { x: 24, y: 56 }; // Reduced width from 28 to 24 for better lane clearance

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

// Physics
export const FRICTION = 0.92;
export const ACCELERATION_WALK = 0.5;
export const MAX_SPEED_WALK = 4;
export const ROTATION_SPEED_WALK = 0.15;

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
  sedan: { color: '#2563eb', maxSpeed: 14, acceleration: 0.25, handling: 0.05, health: 100 },
  sport: { color: '#dc2626', maxSpeed: 22, acceleration: 0.45, handling: 0.07, health: 80 },
  truck: { color: '#713f12', maxSpeed: 10, acceleration: 0.15, handling: 0.035, health: 150, size: { x: 32, y: 64 } },
  taxi: { color: '#f59e0b', maxSpeed: 13, acceleration: 0.28, handling: 0.055, health: 100 },
  police: { color: '#0f172a', maxSpeed: 18, acceleration: 0.35, handling: 0.06, health: 120 }, // Dark slate
  muscle: { color: '#ea580c', maxSpeed: 19, acceleration: 0.40, handling: 0.04, health: 110 }, // Orange
  van: { color: '#64748b', maxSpeed: 9, acceleration: 0.12, handling: 0.03, health: 140, size: { x: 32, y: 64 } },
  limo: { color: '#000000', maxSpeed: 12, acceleration: 0.15, handling: 0.02, health: 130, size: { x: 30, y: 90 } },
  ambulance: { color: '#ffffff', maxSpeed: 13, acceleration: 0.20, handling: 0.03, health: 160, size: { x: 34, y: 70 } }
};
