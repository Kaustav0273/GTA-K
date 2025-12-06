
import React, { useState } from 'react';
import GameCanvas from './components/GameCanvas';
import HUD from './components/HUD';
import Phone from './components/Phone';
import WeaponWheel from './components/WeaponWheel';
import { GameState, Mission, Pedestrian, EntityType, WeaponType } from './types';
import { COLORS } from './constants';

const App: React.FC = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [isPhoneOpen, setIsPhoneOpen] = useState(false);
  const [isWeaponWheelOpen, setIsWeaponWheelOpen] = useState(false);
  
  const [gameState, setGameState] = useState<GameState>({
    player: {
        id: 'player', type: EntityType.PLAYER, pos: { x: 0, y: 0 }, size: { x: 0, y: 0 }, angle: 0, velocity: { x: 0, y: 0 }, color: COLORS.player, health: 100, maxHealth: 100, armor: 0, state: 'idle', vehicleId: null, weapon: 'fist', role: 'civilian'
    },
    vehicles: [],
    pedestrians: [],
    bullets: [],
    particles: [],
    map: [],
    camera: { x: 0, y: 0 },
    money: 50,
    wantedLevel: 0,
    mission: null,
    isPhoneOpen: false,
    paused: false,
    timeOfDay: 12
  });

  const handlePhoneToggle = () => setIsPhoneOpen(!isPhoneOpen);
  
  const handleAcceptMission = (mission: Mission) => {
    setGameState(prev => ({ ...prev, mission }));
    setIsPhoneOpen(false);
  };
  
  const handleWeaponSelect = (weapon: WeaponType) => {
      // GameCanvas syncs via props, so we just update the local state that gets passed down
      setGameState(prev => ({
          ...prev,
          player: { ...prev.player, weapon }
      }));
  };

  return (
    <div className="w-full h-screen bg-zinc-900 relative overflow-hidden select-none">
      
      {/* Start Screen */}
      {!gameStarted && (
        <div className="absolute inset-0 z-50 bg-zinc-900 flex overflow-hidden">
            {/* Background Panels (GTA Loading Style) */}
            <div className="absolute inset-0 z-0 grid grid-cols-12 grid-rows-2 h-full w-full pointer-events-none opacity-50">
                {/* Top Left - Purple/City */}
                <div className="col-span-5 row-span-1 bg-gradient-to-br from-indigo-900 to-purple-800 border-r-4 border-b-4 border-black relative overflow-hidden">
                    <div className="absolute inset-0 bg-black/10"></div>
                    <i className="fas fa-city text-[12rem] absolute -bottom-10 -left-10 text-black/30 transform rotate-6"></i>
                </div>
                
                {/* Top Right - Orange/Car */}
                <div className="col-span-7 row-span-1 bg-gradient-to-l from-orange-800 to-red-900 border-b-4 border-black relative overflow-hidden">
                    <i className="fas fa-car-side text-[14rem] absolute top-1/2 right-10 transform -translate-y-1/2 text-black/30"></i>
                    <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-l from-black/40 to-transparent"></div>
                </div>

                {/* Bottom Left - Green/Money */}
                <div className="col-span-8 row-span-1 bg-gradient-to-tr from-green-900 to-emerald-800 border-r-4 border-black relative overflow-hidden">
                     <i className="fas fa-money-bill-wave text-[10rem] absolute -bottom-4 left-10 text-black/20 transform -rotate-12"></i>
                     <i className="fas fa-hand-holding-dollar text-[8rem] absolute top-4 right-20 text-black/20 transform rotate-12"></i>
                </div>
                
                {/* Bottom Right - Blue/Police */}
                <div className="col-span-4 row-span-1 bg-gradient-to-br from-slate-900 to-blue-900 border-black relative overflow-hidden">
                     <i className="fas fa-helicopter text-[9rem] absolute top-10 -right-10 text-black/30 transform -rotate-12"></i>
                     <div className="absolute inset-0 bg-blue-500/10 mix-blend-overlay"></div>
                </div>
            </div>

            {/* Content Container */}
            <div className="relative z-10 w-full h-full flex flex-col justify-between p-8 md:p-16">
                
                {/* Header / Logo Section */}
                <div className="flex flex-col items-start drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)] mt-8 md:mt-0">
                    <div className="bg-white px-4 py-1 transform -rotate-2 mb-4 shadow-lg border-2 border-black inline-block">
                        <span className="font-gta text-black text-xl md:text-2xl tracking-widest">REACT CITY STORIES</span>
                    </div>
                    <h1 className="font-gta text-8xl md:text-[11rem] text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 leading-[0.8] tracking-tight filter drop-shadow-[5px_5px_0_#000]">
                        GTA K
                    </h1>
                    <div className="flex items-center gap-4 mt-6 ml-4">
                        <span className="font-gta text-3xl text-pink-500 tracking-widest drop-shadow-[2px_2px_0_#000]">BETA</span>
                        <div className="h-1.5 w-16 bg-pink-500 shadow-[2px_2px_0_#000]"></div>
                        <span className="font-gta text-3xl text-white tracking-widest drop-shadow-[2px_2px_0_#000]">V5</span>
                    </div>
                </div>

                {/* Menu Section */}
                <div className="flex flex-col items-start gap-2 mt-auto mb-8 md:mb-12 pl-4">
                    <button 
                        onClick={() => setGameStarted(true)}
                        className="group flex items-center gap-6 focus:outline-none transition-transform hover:translate-x-4 duration-300"
                    >
                        <span className="font-gta text-6xl md:text-8xl text-white group-hover:text-yellow-400 transition-colors drop-shadow-[4px_4px_0_rgba(0,0,0,1)] tracking-wide">
                            START GAME
                        </span>
                    </button>
                    
                    <button className="group flex items-center gap-6 focus:outline-none transition-transform hover:translate-x-4 duration-300 opacity-70 hover:opacity-100">
                        <span className="font-gta text-4xl md:text-6xl text-gray-300 group-hover:text-pink-400 transition-colors drop-shadow-[3px_3px_0_rgba(0,0,0,1)] tracking-wide">
                            OPTIONS
                        </span>
                    </button>
                    
                    <button className="group flex items-center gap-6 focus:outline-none transition-transform hover:translate-x-4 duration-300 opacity-70 hover:opacity-100">
                        <span className="font-gta text-4xl md:text-6xl text-gray-300 group-hover:text-blue-400 transition-colors drop-shadow-[3px_3px_0_rgba(0,0,0,1)] tracking-wide">
                            QUIT
                        </span>
                    </button>
                </div>

                {/* Footer / Controls Hint */}
                <div className="absolute bottom-6 right-6 text-right hidden md:block">
                    <div className="font-mono text-xs text-white/60 bg-black/60 p-4 rounded-lg backdrop-blur-sm border border-white/10 shadow-2xl">
                        <p className="mb-2 text-yellow-400 font-bold border-b border-white/20 pb-1">CONTROLS</p>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-left">
                            <span>WASD</span> <span className="text-gray-400">Move</span>
                            <span>F</span> <span className="text-gray-400">Enter/Exit Car</span>
                            <span>SPACE</span> <span className="text-gray-400">Shoot / Handbrake</span>
                            <span>TAB</span> <span className="text-gray-400">Weapon Wheel</span>
                            <span>M</span> <span className="text-gray-400">Add Cash</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Game Layer */}
      {gameStarted && (
          <GameCanvas 
            onGameStateUpdate={setGameState} 
            onPhoneToggle={setIsPhoneOpen} 
            isPhoneOpen={isPhoneOpen}
            activeMission={gameState.mission}
            onWeaponWheelToggle={setIsWeaponWheelOpen}
            isWeaponWheelOpen={isWeaponWheelOpen}
            activeWeapon={gameState.player.weapon}
          />
      )}

      {/* Retro Scanlines Overlay - Always visible for vibe */}
      <div className="scanlines pointer-events-none"></div>

      {/* UI Layer */}
      {gameStarted && !isWeaponWheelOpen && (
        <HUD 
            gameState={gameState} 
            onPhoneClick={handlePhoneToggle} 
        />
      )}

      {/* Phone Layer */}
      {gameStarted && (
          <Phone 
            isOpen={isPhoneOpen} 
            onClose={() => setIsPhoneOpen(false)} 
            gameState={gameState}
            onAcceptMission={handleAcceptMission}
          />
      )}
      
      {/* Weapon Wheel Overlay */}
      {gameStarted && (
          <WeaponWheel 
            isOpen={isWeaponWheelOpen}
            currentWeapon={gameState.player.weapon}
            onSelectWeapon={handleWeaponSelect}
          />
      )}
    </div>
  );
};

export default App;
