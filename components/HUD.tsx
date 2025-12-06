
import React from 'react';
import { GameState } from '../types';
import Radar from './Radar';

interface HUDProps {
  gameState: GameState;
  onPhoneClick: () => void;
}

const HUD: React.FC<HUDProps> = ({ gameState, onPhoneClick }) => {
  const { player, wantedLevel, money, mission } = gameState;

  // Calculate Health Colors
  const healthPercent = (player.health / player.maxHealth) * 100;
  let healthColor = 'bg-green-500';
  if (healthPercent < 50) healthColor = 'bg-yellow-500';
  if (healthPercent < 20) healthColor = 'bg-red-600 animate-pulse';

  const armorPercent = player.armor || 0;

  return (
    <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between font-gta text-white">
      {/* Top Right: Wanted Level & Money */}
      <div className="flex justify-between items-start">
         {/* Top Left: Mission Info */}
        <div className="flex flex-col gap-2 max-w-md">
            {mission && mission.active && (
                <div className="bg-black/50 p-3 border-l-4 border-yellow-400 backdrop-blur-sm">
                    <h3 className="text-yellow-400 text-lg">{mission.title}</h3>
                    <p className="text-sm font-sans normal-case">{mission.objectiveText}</p>
                </div>
            )}
        </div>

        <div className="flex flex-col items-end gap-2">
            <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
                <i
                key={i}
                className={`fas fa-star text-2xl drop-shadow-md ${
                    i < wantedLevel ? 'text-white animate-pulse' : 'text-gray-600/50'
                }`}
                />
            ))}
            </div>
            <div className="text-4xl text-green-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
            ${money.toLocaleString()}
            </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="flex justify-between items-end">
        {/* Radar / Minimap Container */}
        <div className="relative">
             {/* Health & Armor Bars (Above Radar) */}
             <div className="mb-2 w-56 flex flex-col gap-1">
                {/* Health */}
                <div className="w-full h-3 bg-black/60 rounded overflow-hidden border border-gray-600">
                    <div 
                        className={`h-full ${healthColor} transition-all duration-300`} 
                        style={{ width: `${Math.max(0, healthPercent)}%` }}
                    ></div>
                </div>
                {/* Armor (Only show if > 0) */}
                {armorPercent > 0 && (
                    <div className="w-full h-2 bg-black/60 rounded overflow-hidden border border-gray-600">
                        <div 
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${armorPercent}%` }}
                        ></div>
                    </div>
                )}
             </div>

            <div className="w-56 h-36 bg-black/80 border-4 border-gray-600 rounded-lg shadow-2xl overflow-hidden relative">
                <Radar gameState={gameState} />
                {/* Gloss Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
            </div>
        </div>

        {/* Controls Hint */}
        <div className="hidden md:block text-white/60 text-xs font-sans text-center mb-2">
            <div className="flex gap-4">
                <span><b className="text-white">WASD</b> Move</span>
                <span><b className="text-white">F</b> Car</span>
                <span><b className="text-white">TAB</b> Weapon</span>
                <span><b className="text-white">SPACE</b> Action</span>
            </div>
        </div>

        {/* Phone & Weapon */}
        <div className="flex gap-4 pointer-events-auto items-end">
            <div className="flex flex-col items-center">
                 <div className="w-16 h-16 bg-gray-900 rounded-full border-4 border-gray-700 flex items-center justify-center mb-2 shadow-lg relative">
                    <i className={`fas ${
                        player.weapon === 'pistol' ? 'fa-gun' : 
                        player.weapon === 'uzi' ? 'fa-person-rifle' : 
                        player.weapon === 'shotgun' ? 'fa-skull' : 
                        'fa-hand-fist'
                    } text-3xl text-gray-400`}></i>
                    <div className="absolute -bottom-1 -right-1 bg-gray-800 text-xs px-1 rounded border border-gray-600">
                        {player.weapon === 'fist' ? 'INF' : '999'}
                    </div>
                 </div>
            </div>
            <button 
                onClick={onPhoneClick}
                className="w-14 h-24 bg-black border-4 border-gray-800 rounded-lg hover:border-blue-500 transition-colors flex flex-col items-center justify-center group shadow-xl"
            >
                <div className="w-10 h-16 bg-blue-500/20 group-hover:bg-blue-400/30 rounded flex items-center justify-center">
                    <i className="fas fa-mobile-alt text-2xl text-blue-200"></i>
                </div>
            </button>
        </div>
      </div>
    </div>
  );
};

export default HUD;
