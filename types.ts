
export enum EntityType {
  PLAYER = 'PLAYER',
  PEDESTRIAN = 'PEDESTRIAN',
  VEHICLE = 'VEHICLE',
  BUILDING = 'BUILDING',
  ROAD = 'ROAD',
  GRASS = 'GRASS',
  WATER = 'WATER'
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  type: EntityType;
  pos: Vector2;
  size: Vector2; // Width, Height
  angle: number; // Rotation in radians
  velocity: Vector2;
  color: string;
}

export interface Vehicle extends Entity {
  type: EntityType.VEHICLE;
  driverId: string | null; // ID of the entity driving, or null
  model: 'sedan' | 'sport' | 'truck' | 'taxi' | 'police' | 'muscle' | 'van' | 'limo' | 'ambulance' | 'supercar' | 'compact' | 'suv' | 'pickup' | 'swat' | 'firetruck' | 'bus' | 'plane' | 'jet' | 'tank' | 'barracks' | 'bike' | 'scooter' | 'dirtbike' | 'superbike';
  speed: number;
  maxSpeed: number;
  acceleration: number;
  handling: number; // Turn speed
  health: number;
  damage: {
      tires: [boolean, boolean, boolean, boolean]; // FL, FR, RL, RR
      windows: [boolean, boolean]; // Front, Rear
  };
  deformation: {
      fl: number; // Front Left
      fr: number; // Front Right
      bl: number; // Back Left
      br: number; // Back Right
  };
  stuckTimer?: number; // Frames stuck at 0 speed
  targetAngle: number;
  lastPaintTime?: number; // Debounce for paint shop
}

export type WeaponType = 
  | 'fist'
  // Pistols
  | 'pistol' | 'street_hawk' | 'silver_fang' | 'night_viper' | 'pulse_9x' | 'iron_whisper' | 'neon_ace'
  // SMGs
  | 'uzi' | 'rapid_wolf' | 'urban_ripper' | 'vortex_smg' | 'shadow_spray' | 'bullet_hive' | 'turbo_stinger'
  // Shotguns
  | 'shotgun' | 'doom_breaker' | 'thunder_judge' | 'skull_shatter' | 'iron_boom' | 'road_cleaner' | 'hell_bison'
  // Snipers
  | 'sniper' | 'silent_eclipse' | 'longshot_zero' | 'phantom_eye' | 'widow_maker_x' | 'frost_piercer' | 'dark_horizon'
  // RPGs
  | 'rocket' | 'dragon_roar' | 'sky_eraser' | 'titan_fall' | 'blast_serpent' | 'nova_cannon' | 'earth_splitter'
  // Flamethrowers
  | 'flame' | 'inferno_kiss' | 'fire_leviathan' | 'ember_storm' | 'heat_reaper' | 'blaze_hydra' | 'pyro_lord';

export interface Pedestrian extends Entity {
  type: EntityType.PEDESTRIAN | EntityType.PLAYER;
  role: 'civilian' | 'police' | 'army'; // New field
  vehicleId: string | null; // ID of vehicle they are in, or null
  health: number;
  maxHealth: number;
  armor: number; // 0-100
  stamina: number; // Current stamina frames
  maxStamina: number; // Max stamina frames
  staminaRechargeDelay: number; // Frames until recharge starts
  state: 'idle' | 'walking' | 'driving' | 'running' | 'fleeing' | 'dead' | 'texting' | 'chatting' | 'punching' | 'chasing' | 'shooting' | 'entering_vehicle' | 'exiting_vehicle' | 'walking_to_car';
  target?: Vector2; // For AI movement
  weapon: WeaponType;
  actionTimer?: number; // Time until next state change
  chatPartnerId?: string; // ID of the pedestrian they are chatting with
  targetVehicleId?: string | null; // For entering animation
}

export interface Bullet {
  id: string;
  pos: Vector2;
  velocity: Vector2;
  ownerId: string; // 'player' or other
  damage: number;
  timeLeft: number; // frames
  type: 'standard' | 'rocket' | 'fire';
  explosionRadius?: number;
}

export interface Particle {
  id: string;
  pos: Vector2;
  velocity: Vector2;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'smoke' | 'blood' | 'spark' | 'muzzle' | 'debris' | 'fire' | 'explosion';
}

export interface Drop {
  id: string;
  pos: Vector2;
  type: 'cash' | 'weapon';
  value?: number;
  weapon?: WeaponType;
  life: number;
}

export interface Cheats {
  godMode: boolean;
  infiniteStamina: boolean;
  infiniteAmmo: boolean;
  noReload: boolean;
  oneHitKill: boolean;
  vehicleGodMode: boolean;
}

export interface Safehouse {
  id: string;
  tile: Vector2; // Grid coordinates
  owned: boolean;
  price: number;
}

export interface GameState {
  player: Pedestrian;
  vehicles: Vehicle[];
  pedestrians: Pedestrian[];
  bullets: Bullet[];
  particles: Particle[];
  drops: Drop[];
  map: number[][]; // Grid representation
  camera: Vector2;
  money: number;
  wantedLevel: number;
  mission: Mission | null;
  isPhoneOpen: boolean;
  activeShop: 'none' | 'main'; // New field for shop UI
  paused: boolean;
  timeOfDay: number; // 0 - 24
  timeTicker: number;
  isWasted: boolean;
  wastedStartTime: number;
  cheats: Cheats;
  safehouses: Safehouse[];
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  reward: number;
  active: boolean;
  completed: boolean;
  objectiveText: string;
}

export enum TileType {
  GRASS = 0,
  ROAD_V = 1,
  ROAD_H = 2,
  ROAD_CROSS = 3,
  BUILDING = 4,
  WATER = 5,
  SIDEWALK = 6,
  HOSPITAL = 7,
  POLICE_STATION = 8,
  SKYSCRAPER = 9,
  SHOP = 10,
  CONTAINER = 11,
  SHIP_DECK = 12,
  SAND = 13,
  WALL = 14,
  PAINT_SHOP = 15,
  RUNWAY = 16,
  AIRPORT_TERMINAL = 17,
  HANGAR = 18,
  TARMAC = 19,
  FOOTPATH = 20,
  MALL = 21,
  CONSTRUCTION = 22,
  FOOTBALL_FIELD = 23,
  TRAIN_STATION = 24,
  RAIL = 25,
  RAIL_CROSSING = 26,
  // MILITARY ADDITIONS
  MILITARY_GROUND = 27,
  FENCE_H = 28,
  FENCE_V = 29,
  BUNKER = 30,
  WATCHTOWER = 31,
  HELIPAD = 32,
  // NEW BUILDING TYPES
  WAREHOUSE = 33,
  FACTORY = 34,
  TENEMENT = 35,
  PROJECTS = 36,
  SAFEHOUSE = 37
}

export interface GameSettings {
  sfxVolume: number; // 0-10
  musicVolume: number; // 0-10
  drawDistance: 'LOW' | 'MED' | 'HIGH' | 'ULTRA';
  trafficDensity: 'LOW' | 'MED' | 'HIGH';
  retroFilter: boolean;
  frameLimiter: boolean;
  mouseSensitivity: number; // 0-100
  mobileControlStyle: 'DPAD' | 'JOYSTICK';
  isFullScreen: boolean;
  showTouchControls: boolean; // Toggle for touch controls
}
