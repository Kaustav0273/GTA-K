
import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import HUD from './components/HUD';
import Phone from './components/Phone';
import WeaponWheel from './components/WeaponWheel';
import MapMenu from './components/MapMenu';
import MobileControls from './components/MobileControls';
import CarShop from './components/CarShop';
import SplashScreen from './components/SplashScreen';
import { GameState, Mission, EntityType, WeaponType, GameSettings } from './types';
import { COLORS, STAMINA_MAX, PLAYER_SIZE } from './constants';
import { audioManager } from './services/audioService';

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [isPhoneOpen, setIsPhoneOpen] = useState(false);
  const [isWeaponWheelOpen, setIsWeaponWheelOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [hasSaveGame, setHasSaveGame] = useState(false);
  
  // Settings State initialized lazily
  const [settings, setSettings] = useState<GameSettings>(() => {
      const isClient = typeof window !== 'undefined' && typeof navigator !== 'undefined';
      
      // Robust Touch Detection
      const hasTouch = isClient && (
          navigator.maxTouchPoints > 0 || 
          (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) ||
          'ontouchstart' in window
      );

      // Only default to Fullscreen for small mobile devices, not touch laptops
      const isSmallScreen = isClient && window.innerWidth < 768;

      return {
          sfxVolume: 8,
          musicVolume: 6,
          drawDistance: 'ULTRA',
          trafficDensity: 'MED',
          retroFilter: true,
          frameLimiter: false,
          mouseSensitivity: 50,
          mobileControlStyle: 'DPAD',
          isFullScreen: isSmallScreen, // Only force FS on mobile
          showTouchControls: hasTouch // Default ON for any touch device (Phone, Tablet, Laptop)
      };
  });

  // Splash Screen Timer - Increased to 5s to allow particle animation to finish
  useEffect(() => {
      const timer = setTimeout(() => {
          setShowSplash(false);
      }, 5000);
      return () => clearTimeout(timer);
  }, []);

  const defaultGameState: GameState = {
    player: {
        id: 'player', 
        type: EntityType.PLAYER, 
        pos: { x: 0, y: 0 }, 
        size: PLAYER_SIZE, 
        angle: 0, 
        velocity: { x: 0, y: 0 }, 
        color: COLORS.player, 
        health: 100, 
        maxHealth: 100, 
        armor: 0, 
        stamina: STAMINA_MAX, 
        maxStamina: STAMINA_MAX,
        staminaRechargeDelay: 0,
        state: 'idle', 
        vehicleId: null, 
        weapon: 'fist', 
        role: 'civilian'
    },
    vehicles: [],
    pedestrians: [],
    bullets: [],
    particles: [],
    drops: [],
    map: [],
    camera: { x: 0, y: 0 },
    money: 50,
    wantedLevel: 0,
    mission: null,
    isPhoneOpen: false,
    activeShop: 'none',
    paused: false,
    timeOfDay: 12,
    timeTicker: 0,
    isWasted: false,
    wastedStartTime: 0,
    cheats: {
        godMode: false,
        infiniteStamina: false,
        infiniteAmmo: false,
        noReload: false,
        oneHitKill: false,
        vehicleGodMode: false
    }
  };

  const [gameState, setGameState] = useState<GameState>(defaultGameState);

  // Check for save game on mount
  useEffect(() => {
      const saved = localStorage.getItem('vice_divide_save');
      if (saved) setHasSaveGame(true);
  }, []);

  const handlePhoneToggle = () => {
      audioManager.playUI('click');
      setIsPhoneOpen(!isPhoneOpen);
  }
  
  const handleAcceptMission = (mission: Mission) => {
    setGameState(prev => ({ ...prev, mission }));
    setIsPhoneOpen(false);
  };
  
  const handleWeaponSelect = (weapon: WeaponType) => {
      setGameState(prev => ({
          ...prev,
          player: { ...prev.player, weapon }
      }));
  };

  const handleSaveGame = () => {
      try {
          // We save the current gameState. 
          // Note: map array is large but usually fits in localStorage (50x50 ints is small).
          localStorage.setItem('vice_divide_save', JSON.stringify(gameState));
          setHasSaveGame(true);
          audioManager.playUI('success');
          alert("GAME SAVED");
      } catch (e) {
          console.error("Save failed", e);
          audioManager.playUI('error');
          alert("Save Failed: Storage Full?");
      }
  };

  const handleLoadGame = () => {
      try {
          const saved = localStorage.getItem('vice_divide_save');
          if (saved) {
              const parsed = JSON.parse(saved);
              
              // Ensure cheats exist for legacy saves
              if (!parsed.cheats) {
                  parsed.cheats = {
                        godMode: false,
                        infiniteStamina: false,
                        infiniteAmmo: false,
                        noReload: false,
                        oneHitKill: false,
                        vehicleGodMode: false
                  };
              }

              setGameState(parsed);
              enterGame();
          }
      } catch (e) {
          console.error("Load failed", e);
          audioManager.playUI('error');
          alert("Failed to load save file.");
      }
  };

  // Helper to trigger full screen if enabled
  const enterGame = () => {
      audioManager.init();
      audioManager.playUI('success');
      if (settings.isFullScreen) {
          if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(err => {
                  console.warn(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
              });
          }
      }
      setGameStarted(true);
  };

  // Settings Handlers
  const toggleDrawDistance = () => {
      audioManager.playUI('click');
      const levels: GameSettings['drawDistance'][] = ['LOW', 'MED', 'HIGH', 'ULTRA'];
      const currentIdx = levels.indexOf(settings.drawDistance);
      setSettings(prev => ({ ...prev, drawDistance: levels[(currentIdx + 1) % levels.length] }));
  };

  const toggleTrafficDensity = () => {
      audioManager.playUI('click');
      const levels: GameSettings['trafficDensity'][] = ['LOW', 'MED', 'HIGH'];
      const currentIdx = levels.indexOf(settings.trafficDensity);
      setSettings(prev => ({ ...prev, trafficDensity: levels[(currentIdx + 1) % levels.length] }));
  };

  const toggleControlStyle = () => {
      audioManager.playUI('click');
      setSettings(prev => ({ ...prev, mobileControlStyle: prev.mobileControlStyle === 'DPAD' ? 'JOYSTICK' : 'DPAD' }));
  };

  const toggleFullScreenSetting = () => {
      audioManager.playUI('click');
      setSettings(prev => {
          const newState = !prev.isFullScreen;
          if (newState) {
              if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen().catch(err => console.warn(err));
              }
          } else {
              if (document.fullscreenElement) {
                  document.exitFullscreen().catch(err => console.warn(err));
              }
          }
          return { ...prev, isFullScreen: newState };
      });
  };

  const toggleTouchControls = () => {
      audioManager.playUI('click');
      setSettings(prev => ({ ...prev, showTouchControls: !prev.showTouchControls }));
  };

  const handleUpdateGameState = (updates: Partial<GameState>) => {
      setGameState(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className="w-full h-screen bg-zinc-900 relative overflow-hidden select-none">
      
      {/* Animated Splash Screen */}
      <div 
        className={`fixed inset-0 z-[100] transition-opacity duration-1000 ease-in-out pointer-events-none ${showSplash ? 'opacity-100' : 'opacity-0'}`}
      >
          {showSplash && <SplashScreen />}
      </div>

      {/* Start Screen */}
      {!gameStarted && (
        <div className={`absolute inset-0 z-50 bg-zinc-900 flex overflow-hidden transition-opacity duration-1000 ${!showSplash ? 'opacity-100' : 'opacity-0'}`}>
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
                {!showSettings && (
                    <div className="flex flex-col items-start drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)] mt-8 md:mt-0">
                        <div className="bg-white px-4 py-1 transform -rotate-2 mb-4 shadow-lg border-2 border-black inline-block">
                            <span className="font-gta text-black text-xl md:text-2xl tracking-widest">VICE DIVIDE</span>
                        </div>
                        <h1 className="font-gta text-8xl md:text-[11rem] text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 leading-[0.8] tracking-tight filter drop-shadow-[5px_5px_0_#000]">
                            GTA K
                        </h1>
                        <div className="flex items-center gap-4 mt-6 ml-4">
                            <span className="font-gta text-3xl text-pink-500 tracking-widest drop-shadow-[2px_2px_0_#000]">BETA</span>
                            <div className="h-1.5 w-16 bg-pink-500 shadow-[2px_2px_0_#000]"></div>
                            <span className="font-gta text-3xl text-white tracking-widest drop-shadow-[2px_2px_0_#000]">V6</span>
                        </div>
                    </div>
                )}
                {showSettings && (
                    <div className="mt-8">
                         <h1 className="font-gta text-6xl text-white drop-shadow-[4px_4px_0_rgba(0,0,0,1)]">SETTINGS</h1>
                    </div>
                )}

                {/* Menu Section */}
                <div className="flex flex-col items-start gap-2 mt-auto mb-8 md:mb-12 pl-4">
                    {!showSettings ? (
                        <>
                            <button 
                                onClick={() => {
                                    setGameState(defaultGameState); // Reset to default for new game
                                    enterGame();
                                }}
                                onMouseEnter={() => audioManager.playUI('hover')}
                                className="group flex items-center gap-6 focus:outline-none transition-transform hover:translate-x-4 duration-300"
                            >
                                <span className="font-gta text-6xl md:text-8xl text-white group-hover:text-yellow-400 transition-colors drop-shadow-[4px_4px_0_rgba(0,0,0,1)] tracking-wide">
                                    START GAME
                                </span>
                            </button>

                            {hasSaveGame && (
                                <button 
                                    onClick={handleLoadGame}
                                    onMouseEnter={() => audioManager.playUI('hover')}
                                    className="group flex items-center gap-6 focus:outline-none transition-transform hover:translate-x-4 duration-300"
                                >
                                    <span className="font-gta text-5xl md:text-7xl text-gray-300 group-hover:text-green-400 transition-colors drop-shadow-[3px_3px_0_rgba(0,0,0,1)] tracking-wide">
                                        LOAD GAME
                                    </span>
                                </button>
                            )}
                            
                            <button 
                                onClick={() => { setShowSettings(true); audioManager.playUI('click'); }}
                                onMouseEnter={() => audioManager.playUI('hover')}
                                className="group flex items-center gap-6 focus:outline-none transition-transform hover:translate-x-4 duration-300"
                            >
                                <span className="font-gta text-4xl md:text-6xl text-gray-300 group-hover:text-pink-400 transition-colors drop-shadow-[3px_3px_0_rgba(0,0,0,1)] tracking-wide">
                                    OPTIONS
                                </span>
                            </button>
                            
                            <button 
                                className="group flex items-center gap-6 focus:outline-none transition-transform hover:translate-x-4 duration-300 opacity-70 hover:opacity-100"
                                onMouseEnter={() => audioManager.playUI('hover')}
                            >
                                <span className="font-gta text-4xl md:text-6xl text-gray-300 group-hover:text-blue-400 transition-colors drop-shadow-[3px_3px_0_rgba(0,0,0,1)] tracking-wide">
                                    QUIT
                                </span>
                            </button>
                        </>
                    ) : (
                        <div className="w-full md:w-[600px] bg-black/80 p-8 border-l-8 border-yellow-400 backdrop-blur-md shadow-2xl animate-fade-in-up overflow-y-auto max-h-[80vh]">
                            <div className="space-y-6 font-mono text-white text-lg">
                                {/* Audio */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">SFX VOLUME</span>
                                        <div className="flex gap-1">
                                            {[...Array(10)].map((_, i) => (
                                                <button 
                                                    key={i} 
                                                    onClick={() => setSettings(s => ({...s, sfxVolume: i + 1}))}
                                                    className={`w-3 h-6 cursor-pointer hover:opacity-80 transition-opacity ${i < settings.sfxVolume ? 'bg-green-500' : 'bg-gray-800'}`}
                                                ></button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">MUSIC VOLUME</span>
                                        <div className="flex gap-1">
                                            {[...Array(10)].map((_, i) => (
                                                <button 
                                                    key={i} 
                                                    onClick={() => setSettings(s => ({...s, musicVolume: i + 1}))}
                                                    className={`w-3 h-6 cursor-pointer hover:opacity-80 transition-opacity ${i < settings.musicVolume ? 'bg-green-500' : 'bg-gray-800'}`}
                                                ></button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-white/20 my-4"></div>

                                {/* Display */}
                                <div className="space-y-2">
                                     <button onClick={toggleDrawDistance} className="w-full flex justify-between items-center group cursor-pointer hover:bg-white/5 p-1 rounded">
                                        <span className="text-gray-400 group-hover:text-white">DRAW DISTANCE</span>
                                        <span className="text-yellow-400 font-bold">{settings.drawDistance}</span>
                                    </button>
                                     <button onClick={toggleTrafficDensity} className="w-full flex justify-between items-center group cursor-pointer hover:bg-white/5 p-1 rounded">
                                        <span className="text-gray-400 group-hover:text-white">TRAFFIC DENSITY</span>
                                        <span className="text-yellow-400 font-bold">{settings.trafficDensity}</span>
                                    </button>
                                     <button onClick={() => { setSettings(s => ({...s, retroFilter: !s.retroFilter})); audioManager.playUI('click'); }} className="w-full flex justify-between items-center group cursor-pointer hover:bg-white/5 p-1 rounded">
                                        <span className="text-gray-400 group-hover:text-white">RETRO FILTER</span>
                                        <span className={`${settings.retroFilter ? 'text-green-400' : 'text-red-500'} font-bold`}>{settings.retroFilter ? 'ON' : 'OFF'}</span>
                                    </button>
                                     <button onClick={() => { setSettings(s => ({...s, frameLimiter: !s.frameLimiter})); audioManager.playUI('click'); }} className="w-full flex justify-between items-center group cursor-pointer hover:bg-white/5 p-1 rounded">
                                        <span className="text-gray-400 group-hover:text-white">FRAME LIMITER (30 FPS)</span>
                                        <span className={`${settings.frameLimiter ? 'text-green-400' : 'text-red-500'} font-bold`}>{settings.frameLimiter ? 'ON' : 'OFF'}</span>
                                    </button>
                                     {/* Full Screen Option */}
                                     <button onClick={toggleFullScreenSetting} className="w-full flex justify-between items-center group cursor-pointer hover:bg-white/5 p-1 rounded">
                                        <span className="text-gray-400 group-hover:text-white">FULL SCREEN</span>
                                        <span className={`${settings.isFullScreen ? 'text-green-400' : 'text-red-500'} font-bold`}>{settings.isFullScreen ? 'ON' : 'OFF'}</span>
                                    </button>
                                </div>

                                <div className="h-px bg-white/20 my-4"></div>
                                
                                {/* Controls */}
                                <div className="space-y-2">
                                     <button onClick={toggleTouchControls} className="w-full flex justify-between items-center group cursor-pointer hover:bg-white/5 p-1 rounded">
                                        <span className="text-gray-400 group-hover:text-white">SHOW TOUCH CONTROLS</span>
                                        <span className={`${settings.showTouchControls ? 'text-green-400' : 'text-red-500'} font-bold`}>{settings.showTouchControls ? 'ON' : 'OFF'}</span>
                                    </button>
                                     <button onClick={toggleControlStyle} className="w-full flex justify-between items-center group cursor-pointer hover:bg-white/5 p-1 rounded">
                                        <span className="text-gray-400 group-hover:text-white">TOUCH STEERING</span>
                                        <span className="text-yellow-400 font-bold">{settings.mobileControlStyle}</span>
                                    </button>
                                </div>

                                <div className="h-px bg-white/20 my-4 md:hidden"></div>

                                {/* Controls Sensitivity */}
                                <div className="flex justify-between items-center group">
                                    <span className="text-gray-400 group-hover:text-white">MOUSE SENSITIVITY</span>
                                    <div className="w-32 h-6 flex items-center bg-gray-700/50 rounded-full overflow-hidden relative cursor-pointer"
                                         onClick={(e) => {
                                             const rect = e.currentTarget.getBoundingClientRect();
                                             const x = e.clientX - rect.left;
                                             const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
                                             setSettings(s => ({...s, mouseSensitivity: pct}));
                                         }}
                                    >
                                        <div className="h-full bg-blue-500 pointer-events-none" style={{width: `${settings.mouseSensitivity}%`}}></div>
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={() => { setShowSettings(false); audioManager.playUI('back'); }}
                                className="mt-10 font-gta text-4xl text-white hover:text-yellow-400 transition-colors flex items-center gap-4"
                            >
                                <i className="fas fa-arrow-left text-2xl"></i> BACK
                            </button>
                        </div>
                    )}
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
            onGameStateUpdate={handleUpdateGameState} 
            onPhoneToggle={handlePhoneToggle} 
            isPhoneOpen={isPhoneOpen}
            activeMission={gameState.mission}
            onWeaponWheelToggle={setIsWeaponWheelOpen}
            isWeaponWheelOpen={isWeaponWheelOpen}
            activeWeapon={gameState.player.weapon}
            settings={settings}
            paused={showMap || gameState.activeShop !== 'none'}
            initialGameState={gameState}
            syncGameState={gameState}
          />
      )}

      {/* Retro Scanlines Overlay - Controlled by Settings */}
      {settings.retroFilter && <div className="scanlines pointer-events-none"></div>}

      {/* UI Layer */}
      {gameStarted && !isWeaponWheelOpen && !showMap && gameState.activeShop === 'none' && !gameState.isWasted && (
        <HUD 
            gameState={gameState} 
            onPhoneClick={handlePhoneToggle}
            onRadarClick={() => { setShowMap(true); audioManager.playUI('open'); }}
            onWeaponClick={() => { setIsWeaponWheelOpen(true); audioManager.playUI('open'); }}
            showTouchControls={settings.showTouchControls}
        />
      )}
      
      {/* WASTED OVERLAY */}
      {gameState.isWasted && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-red-900/40 backdrop-grayscale-[0.8] backdrop-sepia-[0.5] backdrop-blur-[2px] transition-all duration-1000 animate-fade-in pointer-events-none overflow-hidden">
              {/* Animated Background Strip */}
              <div className="absolute inset-0 bg-black/20" style={{backgroundImage: 'linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000)', backgroundSize: '60px 60px', backgroundPosition: '0 0, 30px 30px', opacity: 0.1}}></div>
              
              <div className="relative transform scale-110 animate-bounce-short">
                  <h1 className="font-gta text-6xl md:text-9xl text-white drop-shadow-[4px_4px_0_#000] tracking-widest relative z-10 stroke-black text-stroke-2">
                      WASTED
                  </h1>
                  <h1 className="font-gta text-6xl md:text-9xl text-red-600 absolute top-0 left-0 blur-sm z-0 animate-pulse">
                      WASTED
                  </h1>
              </div>
              
              {/* Subtext */}
              <div className="absolute bottom-10 md:bottom-20 text-white/80 font-mono text-sm md:text-xl bg-black/60 px-6 py-2 rounded">
                  You flatlined. Cost: $500
              </div>
          </div>
      )}
      
      {/* Mobile Controls Overlay - Now visible based on explicit setting, not screen size */}
      {gameStarted && !isPhoneOpen && !isWeaponWheelOpen && !showMap && gameState.activeShop === 'none' && !gameState.isWasted && settings.showTouchControls && (
          <MobileControls 
            isDriving={!!gameState.player.vehicleId} 
            controlStyle={settings.mobileControlStyle}
          />
      )}

      {/* Phone Layer */}
      {gameStarted && (
          <Phone 
            isOpen={isPhoneOpen} 
            onClose={() => { setIsPhoneOpen(false); audioManager.playUI('back'); }}
            gameState={gameState}
            onAcceptMission={handleAcceptMission}
            settings={settings}
            onUpdateSettings={setSettings}
            onUpdateGameState={handleUpdateGameState}
          />
      )}
      
      {/* Weapon Wheel Overlay */}
      {gameStarted && (
          <WeaponWheel 
            isOpen={isWeaponWheelOpen}
            currentWeapon={gameState.player.weapon}
            onSelectWeapon={handleWeaponSelect}
            onClose={() => setIsWeaponWheelOpen(false)}
          />
      )}

      {/* Map Menu Overlay */}
      {showMap && (
          <MapMenu 
            gameState={gameState}
            onResume={() => { setShowMap(false); audioManager.playUI('back'); }}
            onQuit={() => { setShowMap(false); setGameStarted(false); audioManager.playUI('back'); }}
            onOptions={() => { setShowMap(false); setGameStarted(false); setShowSettings(true); audioManager.playUI('click'); }}
            onSave={handleSaveGame}
          />
      )}

      {/* Car Shop Overlay */}
      {gameState.activeShop === 'main' && (
          <CarShop 
            gameState={gameState}
            onUpdate={handleUpdateGameState}
            onClose={() => setGameState(prev => ({...prev, activeShop: 'none'}))}
          />
      )}
    </div>
  );
};

export default App;
