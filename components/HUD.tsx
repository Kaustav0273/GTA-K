
import React from 'react';
import { GameState } from '../types';
import Radar from './Radar';
import { CAR_MODELS, WEAPON_STATS } from '../constants';

interface HUDProps {
  gameState: GameState;
  onPhoneClick: () => void;
  onRadarClick?: () => void;
  onWeaponClick?: () => void;
  showTouchControls: boolean;
}

const HUD: React.FC<HUDProps> = ({ gameState, onPhoneClick, onRadarClick, onWeaponClick, showTouchControls }) => {
  const { player, wantedLevel, money, mission, vehicles } = gameState;

  // Calculate Health Colors
  const healthPercent = (player.health / player.maxHealth) * 100;
  let healthColor = 'bg-green-500';
  if (healthPercent < 50) healthColor = 'bg-yellow-500';
  if (healthPercent < 20) healthColor = 'bg-red-600 animate-pulse';

  const armorPercent = player.armor || 0;
  
  // Calculate Stamina
  const staminaPercent = (player.stamina / (player.maxStamina || 1)) * 100;

  // Calculate Vehicle Health
  let vehicleHealthPercent = 0;
  let showVehicleHealth = false;
  let vehicleBarColor = 'bg-slate-200';

  if (player.vehicleId) {
      const vehicle = vehicles.find(v => v.id === player.vehicleId);
      if (vehicle) {
          const modelData = CAR_MODELS[vehicle.model];
          const maxHealth = modelData ? (modelData as any).health : 100;
          vehicleHealthPercent = (vehicle.health / maxHealth) * 100;
          showVehicleHealth = true;
          
          if (vehicleHealthPercent < 25) vehicleBarColor = 'bg-red-500 animate-pulse';
          else if (vehicleHealthPercent < 50) vehicleBarColor = 'bg-slate-400';
      }
  }

  // Positioning Logic based on Touch Controls
  const radarPositionClass = showTouchControls 
      ? 'top-4 left-4' 
      : 'top-4 left-4 md:top-auto md:bottom-4 md:left-4';

  const buttonsPositionClass = showTouchControls
      ? 'bottom-64 right-4'
      : 'bottom-64 right-4 md:bottom-4 md:right-4';

  const missionInfoPositionClass = showTouchControls
      ? 'top-4 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-40' // Shift right to avoid top-left radar on mobile layout if needed, or center
      : 'top-4 left-1/2 -translate-x-1/2 md:top-4 md:left-4 md:translate-x-0';

  const wClass = WEAPON_STATS[player.weapon].class;
  let weaponIcon = 'fa-hand-fist';
  if (wClass === 'pistol') weaponIcon = 'fa-gun';
  else if (wClass === 'smg') weaponIcon = 'fa-bolt';
  else if (wClass === 'shotgun') weaponIcon = 'fa-skull';
  else if (wClass === 'sniper') weaponIcon = 'fa-crosshairs';
  else if (wClass === 'rocket') weaponIcon = 'fa-rocket';
  else if (wClass === 'flame') weaponIcon = 'fa-fire';

  return (
    <div className="absolute inset-0 pointer-events-none font-gta text-white select-none overflow-hidden">
      
      {/* 1. TOP RIGHT: Money & Wanted (Always here) */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-2 z-10">
            <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
                <i
                key={i}
                className={`fas fa-star text-xl md:text-2xl drop-shadow-md ${
                    i < wantedLevel ? 'text-white animate-pulse' : 'text-gray-600/50'
                }`}
                />
            ))}
            </div>
            <div className="text-3xl md:text-4xl text-green-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
            ${money.toLocaleString()}
            </div>
      </div>

      {/* 2. RADAR & BARS */}
      <div 
        className={`absolute pointer-events-auto cursor-pointer transition-all duration-300 ${radarPositionClass}`}
        onClick={onRadarClick}
      >
             {/* Bars */}
             <div className="mb-1 md:mb-2 w-32 md:w-56 flex flex-col gap-1">
                
                {/* Vehicle Health Bar */}
                {showVehicleHealth && (
                    <div className="w-full h-2 md:h-3 bg-black/60 rounded overflow-hidden border border-gray-600 shadow-sm relative">
                        {/* Optional Icon Overlay */}
                        <div className="absolute top-0 left-0 bottom-0 w-4 md:w-6 bg-black/20 z-10 flex items-center justify-center">
                            <i className="fas fa-car text-[8px] md:text-[10px] text-black/50"></i>
                        </div>
                        <div className={`h-full ${vehicleBarColor} transition-all duration-300`} style={{ width: `${Math.max(0, vehicleHealthPercent)}%` }}></div>
                    </div>
                )}

                {/* Health */}
                <div className="w-full h-2 md:h-3 bg-black/60 rounded overflow-hidden border border-gray-600">
                    <div className={`h-full ${healthColor} transition-all duration-300`} style={{ width: `${Math.max(0, healthPercent)}%` }}></div>
                </div>
                {/* Armor */}
                {armorPercent > 0 && (
                    <div className="w-full h-1.5 md:h-2 bg-black/60 rounded overflow-hidden border border-gray-600">
                        <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${armorPercent}%` }}></div>
                    </div>
                )}
                {/* Stamina */}
                 <div className="w-full h-1.5 md:h-2 bg-black/60 rounded overflow-hidden border border-gray-600">
                    <div className="h-full bg-yellow-500 transition-all duration-300" style={{ width: `${Math.max(0, staminaPercent)}%` }}></div>
                </div>
             </div>

            {/* Minimap */}
            <div className="w-32 h-24 md:w-56 md:h-36 bg-black/80 border-2 md:border-4 border-gray-600 rounded-lg shadow-2xl overflow-hidden relative group hover:border-gray-400 transition-colors">
                <Radar gameState={gameState} />
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
            </div>
      </div>

      {/* 3. MISSION INFO */}
      <div className={`absolute transition-all duration-300 w-64 items-center md:w-auto md:max-w-md md:items-start flex flex-col gap-2 z-0 ${missionInfoPositionClass}`}>
            {mission && mission.active && (
                <div className="bg-black/50 p-2 md:p-3 border-l-4 border-yellow-400 backdrop-blur-sm shadow-lg pointer-events-auto">
                    <h3 className="text-yellow-400 text-sm md:text-lg leading-tight drop-shadow-sm">{mission.title}</h3>
                    <p className="text-xs md:text-sm font-sans normal-case text-white/90 drop-shadow-sm">{mission.objectiveText}</p>
                </div>
            )}
      </div>

      {/* 4. CONTROLS HINT (Desktop Only - Hide if touch controls on) */}
      {!showTouchControls && (
          <div className="hidden md:block absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-xs font-sans text-center">
                <div className="flex gap-4 bg-black/40 px-4 py-1 rounded-full backdrop-blur-sm border border-white/5">
                    <span><b className="text-white">WASD</b> Move</span>
                    <span><b className="text-white">SHIFT</b> Sprint</span>
                    <span><b className="text-white">F</b> Car</span>
                    <span><b className="text-white">TAB</b> Weapon</span>
                    <span><b className="text-white">SPACE</b> Action</span>
                </div>
          </div>
      )}

      {/* 5. PHONE & WEAPON TOGGLES */}
      <div className={`absolute pointer-events-auto flex gap-4 items-end z-50 transition-all duration-300 ${buttonsPositionClass}`}>
            {/* Weapon Icon */}
            <div className="flex flex-col items-center group">
                 <div 
                    className="w-12 h-12 md:w-16 md:h-16 bg-gray-900 rounded-full border-2 md:border-4 border-gray-700 flex items-center justify-center mb-1 shadow-lg relative cursor-pointer active:scale-95 transition-transform"
                    onClick={onWeaponClick}
                 >
                    <i className={`fas ${weaponIcon} text-xl md:text-3xl text-gray-400`}></i>
                    <div className="absolute -bottom-1 -right-1 bg-gray-800 text-[10px] md:text-xs px-1 rounded border border-gray-600">
                        {wClass === 'melee' ? 'INF' : '999'}
                    </div>
                 </div>
                 {/* Only show label if no touch controls or if screen is small */}
                 <span className={`text-[10px] text-white/50 bg-black/50 px-1 rounded backdrop-blur-sm ${showTouchControls ? 'md:hidden' : 'md:hidden'}`}>WEAPON</span>
            </div>
            
            {/* Phone Button */}
            <button 
                onClick={onPhoneClick}
                className="w-10 h-16 md:w-14 md:h-24 bg-black border-2 md:border-4 border-gray-800 rounded-lg hover:border-blue-500 transition-colors flex flex-col items-center justify-center group shadow-xl active:scale-95"
            >
                <div className="w-8 h-12 md:w-10 md:h-16 bg-blue-500/20 group-hover:bg-blue-400/30 rounded flex items-center justify-center">
                    <i className="fas fa-mobile-alt text-lg md:text-2xl text-blue-200"></i>
                </div>
            </button>
      </div>

    </div>
  );
};

export default HUD;
