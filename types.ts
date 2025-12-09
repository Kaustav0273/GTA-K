
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
  model: 'sedan' | 'sport' | 'truck' | 'taxi' | 'police' | 'muscle' | 'van' | 'limo' | 'ambulance';
  speed: number;
  maxSpeed: number;
  acceleration: number;
  handling: number; // Turn speed
  health: number;
  damage: {
      tires: [boolean, boolean, boolean, boolean]; // FL, FR, RL, RR
      windows: [boolean, boolean]; // Front, Rear
  };
  stuckTimer?: number; // Frames stuck at 0 speed
  targetAngle: number;
}

export type WeaponType = 'fist' | 'pistol' | 'uzi' | 'shotgun' | 'sniper' | 'rocket' | 'flame';

export interface Pedestrian extends Entity {
  type: EntityType.PEDESTRIAN | EntityType.PLAYER;
  role: 'civilian' | 'police'; // New field
  vehicleId: string | null; // ID of vehicle they are in, or null
  health: number;
  maxHealth: number;
  armor: number; // 0-100
  state: 'idle' | 'walking' | 'driving' | 'running' | 'fleeing' | 'dead' | 'texting' | 'chatting' | 'punching' | 'chasing' | 'shooting';
  target?: Vector2; // For AI movement
  weapon: WeaponType;
  actionTimer?: number; // Time until next state change
  chatPartnerId?: string; // ID of the pedestrian they are chatting with
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
  paused: boolean;
  timeOfDay: number; // 0 - 24
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
  SHOP = 10
}
