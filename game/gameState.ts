
import { Pedestrian, Vehicle, Bullet, Particle, Drop, Vector2 } from '../types';

export interface MutableGameState {
    player: Pedestrian;
    vehicles: Vehicle[];
    pedestrians: Pedestrian[];
    bullets: Bullet[];
    particles: Particle[];
    drops: Drop[];
    map: number[][];
    camera: Vector2;
    money: number;
    wantedLevel: number;
    timeOfDay: number;
    lastShotTime: number;
    timeTicker: number;
    hospitalPos: Vector2;
    isWeaponWheelOpen: boolean;
    lastDamageTaken: number;
    lastWantedTime: number;
}
