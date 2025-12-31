
import React, { useState, useEffect } from 'react';
import { generateMission } from '../services/geminiService';
import { GameState, Mission, GameSettings, EntityType } from '../types';
import { CAR_MODELS, CAR_COLORS, CAR_SIZE } from '../constants';

// Helper Components defined first to avoid ReferenceErrors
const AppIcon = ({ icon, color, label, onClick }: { icon: string, color: string, label?: string, onClick?: () => void }) => (
    <button onClick={onClick} className="flex flex-col items-center gap-1 group active:scale-90 transition-transform w-full">
        <div className={`w-14 h-14 ${color} rounded-[14px] flex items-center justify-center shadow-md text-white`}>
            <i className={`fas ${icon} text-2xl drop-shadow-sm`}></i>
        </div>
        {label && <span className="text-[10px] font-medium text-white/90 group-hover:text-white">{label}</span>}
    </button>
);

const Toggle = ({ enabled, onToggle }: { enabled: boolean, onToggle: () => void }) => (
    <button 
        onClick={onToggle}
        className={`w-11 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out ${enabled ? 'bg-green-500' : 'bg-gray-300'}`}
    >
        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
    </button>
);

interface PhoneProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  onAcceptMission: (mission: Mission) => void;
  settings: GameSettings;
  onUpdateSettings: React.Dispatch<React.SetStateAction<GameSettings>>;
  onUpdateGameState: (updates: Partial<GameState>) => void;
}

const CHEAT_LIST = [
    { code: "9876543210", desc: "Full Health" },
    { code: "8008135700", desc: "God Mode (Toggle)" },
    { code: "1122334455", desc: "Infinite Stamina" },
    { code: "5550001111", desc: "Clear Wanted Level" },
    { code: "6660009999", desc: "Max Wanted Level" },
    { code: "4044040404", desc: "Instant Respawn" },
    { code: "7007007007", desc: "Infinite Ammo" },
    { code: "9090909090", desc: "No Reload" },
    { code: "1313131313", desc: "One-Hit Kill" },
    { code: "4445556666", desc: "Spawn Random Car" },
    { code: "9998887777", desc: "Spawn Supercar" },
    { code: "8880008880", desc: "Spawn Tank" },
    { code: "1212121212", desc: "Vehicle Invincible" },
    { code: "2323232323", desc: "Vehicle Boost" },
    { code: "112233445566778899", desc: "Add Money $500" }
];

const Phone: React.FC<PhoneProps> = ({ isOpen, onClose, gameState, onAcceptMission, settings, onUpdateSettings, onUpdateGameState }) => {
  const [activeApp, setActiveApp] = useState<'home' | 'missions' | 'settings' | 'dialer' | 'camera' | 'music' | 'cheats'>('home');
  const [isLocked, setIsLocked] = useState(true);
  const [loading, setLoading] = useState(false);
  const [generatedMission, setGeneratedMission] = useState<Mission | null>(null);
  const [dialOutput, setDialOutput] = useState("");
  const [dialStatus, setDialStatus] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Clock Update
  useEffect(() => {
      const interval = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isOpen) {
        const t = setTimeout(() => {
            setIsLocked(true);
            setActiveApp('home');
            setGeneratedMission(null);
            setDialOutput("");
            setDialStatus(null);
        }, 300);
        return () => clearTimeout(t);
    }
  }, [isOpen]);

  const handleGenerateMission = async () => {
    setLoading(true);
    const mission = await generateMission(gameState.player.pos, gameState.wantedLevel, gameState.money);
    setGeneratedMission(mission);
    setLoading(false);
  };

  const handleDial = (key: string) => {
      if (dialOutput.length < 18) setDialOutput(prev => prev + key);
  };

  const handleDelete = () => {
      setDialOutput(prev => prev.slice(0, -1));
      setDialStatus(null);
  };

  const spawnVehicle = (modelKey: keyof typeof CAR_MODELS) => {
      const model = CAR_MODELS[modelKey];
      const spawnX = gameState.player.pos.x + Math.cos(gameState.player.angle) * 100;
      const spawnY = gameState.player.pos.y + Math.sin(gameState.player.angle) * 100;
      
      const newVehicle = {
          id: `cheat-${Date.now()}`,
          type: EntityType.VEHICLE,
          pos: { x: spawnX, y: spawnY },
          size: (model as any).size || { x: CAR_SIZE.x, y: CAR_SIZE.y },
          angle: gameState.player.angle,
          velocity: { x: 0, y: 0 },
          color: model.color,
          driverId: null,
          model: modelKey,
          speed: 0,
          maxSpeed: model.maxSpeed,
          acceleration: model.acceleration,
          handling: model.handling,
          health: model.health,
          damage: { tires: [false, false, false, false], windows: [false, false] },
          deformation: { fl: 0, fr: 0, bl: 0, br: 0 },
          stuckTimer: 0,
          targetAngle: gameState.player.angle
      } as any; // Cast to avoid TS strictness on union types if any

      onUpdateGameState({ vehicles: [...gameState.vehicles, newVehicle] });
  };

  const handleCall = () => {
      let statusMsg = "Busy Line...";
      let clearDial = true;

      switch (dialOutput) {
          case "911":
              statusMsg = "Police Dispatched";
              onUpdateGameState({ wantedLevel: Math.min(5, gameState.wantedLevel + 2) });
              break;
          case "112233445566778899": // Money
              statusMsg = "Cheat: $500 Added";
              onUpdateGameState({ money: gameState.money + 500 });
              break;
          case "9876543210": // Full Health
              statusMsg = "Cheat: Health Restored";
              onUpdateGameState({ 
                  player: { ...gameState.player, health: gameState.player.maxHealth } 
              });
              break;
          case "8008135700": // God Mode
              const godModeState = !gameState.cheats.godMode;
              statusMsg = godModeState ? "Cheat: God Mode ON" : "Cheat: God Mode OFF";
              onUpdateGameState({ 
                  cheats: { ...gameState.cheats, godMode: godModeState },
                  // Also heal if enabling
                  player: godModeState ? { ...gameState.player, health: gameState.player.maxHealth } : gameState.player
              });
              break;
          case "1122334455": // Infinite Stamina
              const stamState = !gameState.cheats.infiniteStamina;
              statusMsg = stamState ? "Cheat: Inf Stamina ON" : "Cheat: Inf Stamina OFF";
              onUpdateGameState({ 
                  cheats: { ...gameState.cheats, infiniteStamina: stamState },
                  player: stamState ? { ...gameState.player, stamina: gameState.player.maxStamina } : gameState.player
              });
              break;
          case "5550001111": // Clear Wanted
              statusMsg = "Cheat: Wanted Cleared";
              onUpdateGameState({ wantedLevel: 0 });
              break;
          case "6660009999": // Max Wanted
              statusMsg = "Cheat: Wanted Maxed";
              onUpdateGameState({ wantedLevel: 5 });
              break;
          case "4044040404": // Instant Respawn
              if (gameState.isWasted) {
                  statusMsg = "Cheat: Respawning...";
                  onUpdateGameState({ wastedStartTime: gameState.timeTicker - 200 }); // Fast forward timer
              } else {
                  statusMsg = "Cheat: Not Wasted";
              }
              break;
          case "7007007007": // Infinite Ammo
              const ammoState = !gameState.cheats.infiniteAmmo;
              statusMsg = ammoState ? "Cheat: Inf Ammo ON" : "Cheat: Inf Ammo OFF";
              onUpdateGameState({ cheats: { ...gameState.cheats, infiniteAmmo: ammoState } });
              break;
          case "9090909090": // No Reload
              const reloadState = !gameState.cheats.noReload;
              statusMsg = reloadState ? "Cheat: No Reload ON" : "Cheat: No Reload OFF";
              onUpdateGameState({ cheats: { ...gameState.cheats, noReload: reloadState } });
              break;
          case "1313131313": // One Hit Kill
              const ohkState = !gameState.cheats.oneHitKill;
              statusMsg = ohkState ? "Cheat: 1-Hit Kill ON" : "Cheat: 1-Hit Kill OFF";
              onUpdateGameState({ cheats: { ...gameState.cheats, oneHitKill: ohkState } });
              break;
          case "4445556666": // Spawn Random Car
              const keys = Object.keys(CAR_MODELS).filter(k => k !== 'plane' && k !== 'jet' && k !== 'tank');
              const randomKey = keys[Math.floor(Math.random() * keys.length)] as keyof typeof CAR_MODELS;
              spawnVehicle(randomKey);
              statusMsg = `Cheat: Spawned ${randomKey}`;
              break;
          case "9998887777": // Spawn Supercar
              spawnVehicle('supercar');
              statusMsg = "Cheat: Spawned Supercar";
              break;
          case "8880008880": // Spawn Tank
              spawnVehicle('tank');
              statusMsg = "Cheat: Spawned Tank";
              break;
          case "1212121212": // Vehicle Invincible
              const vGodState = !gameState.cheats.vehicleGodMode;
              statusMsg = vGodState ? "Cheat: Car God ON" : "Cheat: Car God OFF";
              onUpdateGameState({ cheats: { ...gameState.cheats, vehicleGodMode: vGodState } });
              break;
          case "2323232323": // Vehicle Boost
              if (gameState.player.vehicleId) {
                  const v = gameState.vehicles.find(v => v.id === gameState.player.vehicleId);
                  if (v) {
                      const boost = 50; // Big push
                      const bx = Math.cos(v.angle) * boost;
                      const by = Math.sin(v.angle) * boost;
                      // We need to update the specific vehicle in the array
                      const updatedVehicles = gameState.vehicles.map(veh => 
                          veh.id === v.id ? { ...veh, velocity: { x: veh.velocity.x + bx, y: veh.velocity.y + by } } : veh
                      );
                      onUpdateGameState({ vehicles: updatedVehicles });
                      statusMsg = "Cheat: Boosted!";
                  } else {
                      statusMsg = "Cheat: Not in car";
                  }
              } else {
                  statusMsg = "Cheat: Not in car";
              }
              break;
          case "123456789987654321": // Cheat List
              setActiveApp('cheats');
              clearDial = true;
              statusMsg = null;
              break;
          default:
              if (dialOutput.length > 0) {
                  statusMsg = "Unknown Number";
              } else {
                  statusMsg = null;
                  clearDial = false;
              }
              break;
      }
      
      setDialStatus(statusMsg);
      
      // Reset call status after delay
      setTimeout(() => {
          if (clearDial) setDialOutput("");
          setDialStatus(null);
      }, 3000);
  };

  if (!isOpen) return null;

  const formatTime = (date: Date) => {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatDate = (date: Date) => {
      return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  };

  return (
    <div 
        className={`
            z-[60] flex flex-col overflow-hidden shadow-2xl transition-all duration-300 
            bg-black border-[6px] border-gray-900 rounded-[36px]
            
            /* Mobile: Fixed Center */
            fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
            w-[300px] h-[600px] max-h-[85vh]
            
            /* Desktop: Absolute Bottom Right */
            md:absolute md:top-auto md:left-auto md:translate-x-0 md:translate-y-0
            md:bottom-10 md:right-20 md:w-[320px] md:h-[640px] md:max-h-none
            ring-4 ring-black/50
        `}
    >
      {/* Notch & Bezel */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-black rounded-b-xl z-30 pointer-events-none"></div>
      <div className="absolute inset-0 rounded-[30px] border border-white/5 pointer-events-none z-40"></div>

      {/* Screen Content */}
      <div className="flex-1 bg-black text-white relative overflow-hidden h-full">
        
        {/* Wallpaper Layer */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-500 to-indigo-800 z-0">
            {/* Pattern Overlay */}
            <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
        </div>

        {/* Status Bar */}
        <div className="absolute top-0 left-0 right-0 h-8 flex justify-between items-center px-5 pt-1 z-20 text-[10px] font-semibold text-white shadow-sm">
            <span>{formatTime(currentTime)}</span>
            <div className="flex gap-1.5">
                <i className="fas fa-signal"></i>
                <i className="fas fa-wifi"></i>
                <i className="fas fa-battery-full"></i>
            </div>
        </div>

        {/* --- LOCK SCREEN --- */}
        {isLocked && (
            <div 
                className="absolute inset-0 z-20 flex flex-col items-center pt-24 pb-8 backdrop-blur-sm bg-black/10 cursor-pointer"
                onClick={() => setIsLocked(false)}
            >
                <div className="flex flex-col items-center drop-shadow-md">
                    <i className="fas fa-lock text-white/70 mb-4 text-xl"></i>
                    <h1 className="text-6xl font-light tracking-tighter text-white">{formatTime(currentTime)}</h1>
                    <p className="text-white/80 mt-1 text-sm font-medium">{formatDate(currentTime)}</p>
                </div>

                <div className="mt-auto flex flex-col items-center animate-bounce-slow">
                    <div className="w-12 h-1 bg-white/50 rounded-full mb-2"></div>
                    <span className="text-xs text-white/50 font-medium tracking-wide">Swipe up to unlock</span>
                </div>
            </div>
        )}

        {/* --- MAIN APP VIEW --- */}
        {!isLocked && (
            <div className="relative z-10 w-full h-full flex flex-col">
                
                {/* Back / Home Nav Area (Top Left if inside app) */}
                {activeApp !== 'home' && (
                    <div className="absolute top-10 left-4 z-30">
                        <button 
                            onClick={() => setActiveApp('home')} 
                            className="w-8 h-8 flex items-center justify-center bg-white/20 backdrop-blur-md rounded-full hover:bg-white/30 text-white shadow-lg active:scale-95 transition-transform"
                        >
                            <i className="fas fa-chevron-left text-sm"></i>
                        </button>
                    </div>
                )}

                {/* --- HOME SCREEN --- */}
                {activeApp === 'home' && (
                    <div className="flex-1 flex flex-col p-4 pt-16 animate-fade-in">
                        {/* App Grid */}
                        <div className="grid grid-cols-4 gap-x-4 gap-y-6">
                            <AppIcon icon="fa-phone" color="bg-green-600" label="Phone" onClick={() => setActiveApp('dialer')} />
                            <AppIcon icon="fa-crosshairs" color="bg-green-500" label="Jobs" onClick={() => setActiveApp('missions')} />
                            <AppIcon icon="fa-cog" color="bg-gray-500" label="Settings" onClick={() => setActiveApp('settings')} />
                            <AppIcon icon="fa-map" color="bg-blue-500" label="Maps" />
                            <AppIcon icon="fa-camera" color="bg-yellow-500" label="Camera" />
                            <AppIcon icon="fa-cloud" color="bg-sky-400" label="Weather" />
                            <AppIcon icon="fa-wallet" color="bg-indigo-500" label="Wallet" />
                        </div>

                        {/* Dock */}
                        <div className="mt-auto mb-2 bg-white/10 backdrop-blur-xl rounded-3xl p-3 flex justify-around items-center mx-1">
                            <AppIcon icon="fa-phone" color="bg-green-600" onClick={() => setActiveApp('dialer')} />
                            <AppIcon icon="fa-globe" color="bg-blue-600" />
                            <AppIcon icon="fa-comment" color="bg-green-500" />
                            <AppIcon icon="fa-music" color="bg-red-500" />
                        </div>
                    </div>
                )}

                {/* --- MISSIONS APP --- */}
                {activeApp === 'missions' && (
                    <div className="flex flex-col h-full bg-zinc-900 animate-slide-in-right">
                        <div className="bg-zinc-800 p-4 pt-12 pb-3 shadow-md flex items-center justify-center">
                            <h2 className="font-bold text-lg text-white">Underworld Jobs</h2>
                        </div>
                        
                        <div className="flex-1 p-4 overflow-y-auto">
                            {!generatedMission && !loading && (
                                <div className="flex flex-col items-center justify-center h-64 text-center">
                                    <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                                        <i className="fas fa-briefcase text-3xl text-zinc-500"></i>
                                    </div>
                                    <p className="text-sm text-zinc-400 mb-6 px-4">Ready to make some serious cash? Connect to the network.</p>
                                    <button 
                                        onClick={handleGenerateMission}
                                        className="bg-green-600 hover:bg-green-500 text-white w-full py-3 rounded-xl font-bold shadow-lg transition-colors"
                                    >
                                        Find Job
                                    </button>
                                </div>
                            )}

                            {loading && (
                                <div className="flex flex-col items-center justify-center h-64">
                                    <i className="fas fa-circle-notch fa-spin text-3xl text-green-500 mb-4"></i>
                                    <p className="text-sm text-zinc-400 animate-pulse">Decrypting secure channel...</p>
                                </div>
                            )}

                            {generatedMission && (
                                <div className="bg-zinc-800 p-4 rounded-2xl border border-zinc-700 shadow-lg animate-fade-in">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-yellow-400 font-bold text-lg leading-tight">{generatedMission.title}</h3>
                                        <span className="text-xs bg-green-900/50 text-green-400 px-2 py-1 rounded font-mono">${generatedMission.reward}</span>
                                    </div>
                                    <p className="text-sm text-zinc-300 mb-4 leading-relaxed">{generatedMission.description}</p>
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        <button 
                                            onClick={() => {
                                                onAcceptMission(generatedMission);
                                                onClose();
                                            }}
                                            className="bg-green-600 py-2.5 rounded-xl font-bold text-sm hover:bg-green-500 active:scale-95 transition-transform"
                                        >
                                            Accept
                                        </button>
                                        <button 
                                            onClick={() => setGeneratedMission(null)}
                                            className="bg-red-600/80 py-2.5 rounded-xl font-bold text-sm hover:bg-red-500/80 active:scale-95 transition-transform"
                                        >
                                            Decline
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- DIALER APP --- */}
                {activeApp === 'dialer' && (
                    <div className="flex flex-col h-full bg-black text-white animate-fade-in">
                        {/* Display */}
                        <div className="flex-1 flex flex-col justify-end items-center pb-8 pt-20 px-6">
                            {dialStatus && <div className="text-sm text-gray-400 mb-2">{dialStatus}</div>}
                            <div className="text-2xl font-light tracking-wider break-all w-full text-center min-h-[3rem]">
                                {dialOutput}
                            </div>
                            <div className="h-6 text-blue-500 text-xs mt-2 cursor-pointer hover:underline" onClick={handleDelete}>
                                {dialOutput.length > 0 ? "Add to Contacts" : ""}
                            </div>
                        </div>

                        {/* Keypad */}
                        <div className="pb-8 px-8">
                            <div className="grid grid-cols-3 gap-x-6 gap-y-4 mb-6">
                                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((key) => (
                                    <button 
                                        key={key}
                                        onClick={() => handleDial(key)}
                                        className="w-16 h-16 rounded-full bg-zinc-800 hover:bg-zinc-700 flex flex-col items-center justify-center active:bg-zinc-600 transition-colors mx-auto"
                                    >
                                        <span className="text-2xl font-light">{key}</span>
                                        {['1','*','#'].includes(key) ? null : <span className="text-[8px] text-zinc-500 font-bold tracking-widest uppercase">
                                            {key === '2' ? 'ABC' : key === '3' ? 'DEF' : key === '4' ? 'GHI' : key === '5' ? 'JKL' : key === '6' ? 'MNO' : key === '7' ? 'PQRS' : key === '8' ? 'TUV' : key === '9' ? 'WXYZ' : key === '0' ? '+' : ''}
                                        </span>}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="flex justify-center items-center gap-8 px-4">
                                <div className="w-16"></div> {/* Spacer */}
                                <button 
                                    onClick={handleCall}
                                    className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                                >
                                    <i className="fas fa-phone text-2xl"></i>
                                </button>
                                <div className="w-16 flex justify-center">
                                    {dialOutput.length > 0 && (
                                        <button onClick={handleDelete} className="text-zinc-400 hover:text-white p-2">
                                            <i className="fas fa-backspace text-2xl"></i>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- SETTINGS APP --- */}
                {activeApp === 'settings' && (
                    <div className="flex flex-col h-full bg-gray-50 text-black animate-slide-in-right">
                        <div className="bg-white p-4 pt-12 pb-3 shadow-sm border-b flex items-center gap-3">
                            <h2 className="font-bold text-xl">Settings</h2>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-6">
                            
                            {/* Section: Audio */}
                            <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Audio</h3>
                                <div>
                                    <label className="flex justify-between text-sm font-medium mb-1">
                                        SFX Volume <span className="text-gray-500">{settings.sfxVolume}</span>
                                    </label>
                                    <input 
                                        type="range" min="0" max="10" 
                                        value={settings.sfxVolume}
                                        onChange={(e) => onUpdateSettings(s => ({...s, sfxVolume: parseInt(e.target.value)}))}
                                        className="w-full accent-blue-500 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                                <div>
                                    <label className="flex justify-between text-sm font-medium mb-1">
                                        Music Volume <span className="text-gray-500">{settings.musicVolume}</span>
                                    </label>
                                    <input 
                                        type="range" min="0" max="10" 
                                        value={settings.musicVolume}
                                        onChange={(e) => onUpdateSettings(s => ({...s, musicVolume: parseInt(e.target.value)}))}
                                        className="w-full accent-blue-500 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                            </div>

                            {/* Section: Display */}
                            <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Display & Graphics</h3>
                                
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Retro Filter</span>
                                    <Toggle 
                                        enabled={settings.retroFilter} 
                                        onToggle={() => onUpdateSettings(s => ({...s, retroFilter: !s.retroFilter}))} 
                                    />
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Frame Limiter (30fps)</span>
                                    <Toggle 
                                        enabled={settings.frameLimiter} 
                                        onToggle={() => onUpdateSettings(s => ({...s, frameLimiter: !s.frameLimiter}))} 
                                    />
                                </div>

                                <div>
                                    <span className="text-sm font-medium block mb-2">Draw Distance</span>
                                    <div className="flex bg-gray-100 rounded-lg p-1">
                                        {['LOW', 'MED', 'HIGH', 'ULTRA'].map((level) => (
                                            <button
                                                key={level}
                                                onClick={() => onUpdateSettings(s => ({...s, drawDistance: level as any}))}
                                                className={`flex-1 text-[10px] py-1.5 rounded-md font-bold transition-all ${settings.drawDistance === level ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}
                                            >
                                                {level}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Section: Gameplay */}
                            <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Gameplay</h3>
                                
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Touch Controls</span>
                                    <Toggle 
                                        enabled={settings.showTouchControls} 
                                        onToggle={() => onUpdateSettings(s => ({...s, showTouchControls: !s.showTouchControls}))} 
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Touch Steering</span>
                                    <button 
                                        onClick={() => onUpdateSettings(s => ({...s, mobileControlStyle: s.mobileControlStyle === 'DPAD' ? 'JOYSTICK' : 'DPAD'}))}
                                        className="text-xs font-bold text-blue-500 bg-blue-50 px-3 py-1 rounded-full uppercase"
                                    >
                                        {settings.mobileControlStyle}
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                )}

                {/* --- CHEATS APP --- */}
                {activeApp === 'cheats' && (
                    <div className="flex flex-col h-full bg-black text-green-500 font-mono animate-fade-in">
                        <div className="bg-green-900/20 p-4 pt-12 pb-3 border-b border-green-500/50 flex items-center justify-center relative">
                            <h2 className="font-bold text-lg tracking-widest text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]">HACK_TOOL_V6</h2>
                            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-green-500 to-transparent"></div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-green-800 scrollbar-track-black">
                            <div className="text-[10px] text-green-600 mb-2 text-center opacity-70">
                                -- SECURE CONNECTION ESTABLISHED --
                            </div>
                            
                            {CHEAT_LIST.map((cheat, i) => (
                                <div key={i} className="group border border-green-900/50 bg-green-900/10 p-2.5 rounded hover:bg-green-900/30 transition-all cursor-default relative overflow-hidden">
                                    {/* Scanline effect on hover */}
                                    <div className="absolute inset-0 bg-green-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none"></div>
                                    
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="font-bold text-xs text-green-300 group-hover:text-white transition-colors uppercase tracking-tight">{cheat.desc}</div>
                                        <i className="fas fa-terminal text-[10px] text-green-700"></i>
                                    </div>
                                    <div className="font-mono text-sm tracking-wider text-green-500/80 group-hover:text-green-400 select-all selection:bg-green-900 selection:text-white">
                                        {cheat.code}
                                    </div>
                                </div>
                            ))}
                            
                            <div className="h-8"></div>
                        </div>
                    </div>
                )}

            </div>
        )}

      </div>

      {/* Home Indicator */}
      <div 
          className="absolute bottom-1.5 left-1/2 transform -translate-x-1/2 w-32 h-1.5 bg-white/40 rounded-full z-50 cursor-pointer hover:bg-white/60 active:scale-95 transition-all"
          onClick={() => {
              if (activeApp !== 'home') setActiveApp('home');
              else if (!isLocked) onClose(); // Second tap closes phone
          }}
      ></div>
    </div>
  );
};

export default Phone;
