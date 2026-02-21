
import React, { useState, useEffect, useRef } from 'react';
import { generateMission } from '../services/geminiService';
import { GameState, Mission, GameSettings, EntityType } from '../types';
import { CAR_MODELS, CAR_COLORS, CAR_SIZE } from '../constants';
import { audioManager } from '../services/audioService';
import Radar from './Radar';
import CasinoApp from './CasinoApp';

// Helper Components defined first to avoid ReferenceErrors
const AppIcon = ({ icon, color, label, onClick }: { icon: string, color: string, label?: string, onClick?: () => void }) => (
    <button onClick={onClick} className="flex flex-col items-center gap-1 group active:scale-90 transition-transform w-full">
        <div className={`w-14 h-14 ${color} rounded-[14px] flex items-center justify-center shadow-md text-white transition-all duration-300 group-hover:shadow-lg`}>
            <i className={`fas ${icon} text-2xl drop-shadow-sm`}></i>
        </div>
        {label && <span className="text-[10px] font-medium text-white/90 group-hover:text-white">{label}</span>}
    </button>
);

const Toggle = ({ enabled, onToggle }: { enabled: boolean, onToggle: () => void }) => (
    <button 
        onClick={() => { onToggle(); audioManager.playUI('click'); }}
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

const TRACKS = [
    { id: 'neon', title: 'Neon Drive', artist: 'Synther', icon: 'fa-car', color: 'bg-purple-600' },
    { id: '8bit', title: '8-Bit Heist', artist: 'Pixel Punks', icon: 'fa-gamepad', color: 'bg-yellow-500' },
    { id: 'ambient', title: 'City Ambient', artist: 'Night Owl', icon: 'fa-cloud-moon', color: 'bg-blue-600' },
];

const Phone: React.FC<PhoneProps> = ({ isOpen, onClose, gameState, onAcceptMission, settings, onUpdateSettings, onUpdateGameState }) => {
  const [activeApp, setActiveApp] = useState<'home' | 'missions' | 'settings' | 'dialer' | 'music' | 'cheats' | 'map' | 'weather' | 'wallet' | 'browser' | 'casino'>('home');
  const [isLocked, setIsLocked] = useState(true);
  const [loading, setLoading] = useState(false);
  const [generatedMission, setGeneratedMission] = useState<Mission | null>(null);
  const [dialOutput, setDialOutput] = useState("");
  const [dialStatus, setDialStatus] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Music State
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Browser State
  const [browserUrl, setBrowserUrl] = useState("");
  const [browserSrc, setBrowserSrc] = useState<string | null>(null);
  
  // Track last active app for smooth exit animations
  const [lastApp, setLastApp] = useState<string | null>(null);

  // Mobile Scaling State
  const [scale, setScale] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  // Sync music state with AudioService
  useEffect(() => {
      if (isOpen) {
          setCurrentTrack(audioManager.currentTrackId);
          setIsPlaying(audioManager.isMusicPlaying);
      }
  }, [isOpen]);

  // Clock Update
  useEffect(() => {
      const interval = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(interval);
  }, []);

  // Update lastApp when activeApp changes to something that isn't home
  useEffect(() => {
      if (activeApp !== 'home') {
          setLastApp(activeApp);
      }
  }, [activeApp]);

  // Responsive Scaling Logic
  useEffect(() => {
      const handleResize = () => {
          const w = window.innerWidth;
          const h = window.innerHeight;
          const mobile = w < 768; // Tailwind md breakpoint
          setIsMobile(mobile);

          if (mobile) {
              // Reference Size: 320x640
              // Constraints: 85vh height, 90vw width
              const maxH = h * 0.85;
              const maxW = w * 0.90;
              
              const scaleH = maxH / 640;
              const scaleW = maxW / 320;
              
              // Use the smaller scale to fit both constraints
              setScale(Math.min(1, scaleH, scaleW));
          } else {
              setScale(1);
          }
      };

      window.addEventListener('resize', handleResize);
      handleResize(); // Init
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isOpen) {
        const t = setTimeout(() => {
            setIsLocked(true);
            setActiveApp('home');
            setLastApp(null);
            setGeneratedMission(null);
            setDialOutput("");
            setDialStatus(null);
            setBrowserSrc(null);
            setBrowserUrl("");
        }, 300);
        return () => clearTimeout(t);
    }
  }, [isOpen]);

  const handleAppOpen = (app: typeof activeApp) => {
      audioManager.playUI('click');
      setActiveApp(app);
  }

  const handleGenerateMission = async () => {
    audioManager.playUI('click');
    setLoading(true);
    const mission = await generateMission(gameState.player.pos, gameState.wantedLevel, gameState.money);
    setGeneratedMission(mission);
    setLoading(false);
    if(mission) audioManager.playUI('success');
  };

  const handleDial = (key: string) => {
      audioManager.playUI('hover'); // Small blip
      if (dialOutput.length < 18) setDialOutput(prev => prev + key);
  };

  const handleDelete = () => {
      audioManager.playUI('back');
      setDialOutput(prev => prev.slice(0, -1));
      setDialStatus(null);
  };

  // Music Controls
  const handlePlayTrack = (trackId: string) => {
      audioManager.playMusic(trackId);
      setCurrentTrack(trackId);
      setIsPlaying(true);
      audioManager.playUI('click');
  };

  const handleTogglePlay = () => {
      audioManager.toggleMusic();
      setIsPlaying(audioManager.isMusicPlaying);
      audioManager.playUI('click');
  };

  const handleNextTrack = () => {
      const idx = TRACKS.findIndex(t => t.id === currentTrack);
      const next = TRACKS[(idx + 1) % TRACKS.length];
      handlePlayTrack(next.id);
  };

  const handlePrevTrack = () => {
      const idx = TRACKS.findIndex(t => t.id === currentTrack);
      const prev = TRACKS[(idx - 1 + TRACKS.length) % TRACKS.length];
      handlePlayTrack(prev.id);
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
      } as any; 

      onUpdateGameState({ vehicles: [...gameState.vehicles, newVehicle] });
  };

  const handleCall = () => {
      audioManager.playUI('click');
      let statusMsg = "Busy Line...";
      let clearDial = true;
      let success = false;

      switch (dialOutput) {
          case "911":
              statusMsg = "Police Dispatched";
              onUpdateGameState({ wantedLevel: Math.min(5, gameState.wantedLevel + 2) });
              success = true;
              break;
          case "112233445566778899": // Money
              statusMsg = "Cheat: $500 Added";
              onUpdateGameState({ money: gameState.money + 500 });
              success = true;
              break;
          case "9876543210": // Full Health
              statusMsg = "Cheat: Health Restored";
              onUpdateGameState({ 
                  player: { ...gameState.player, health: gameState.player.maxHealth } 
              });
              success = true;
              break;
          case "8008135700": // God Mode
              const godModeState = !gameState.cheats.godMode;
              statusMsg = godModeState ? "Cheat: God Mode ON" : "Cheat: God Mode OFF";
              onUpdateGameState({ 
                  cheats: { ...gameState.cheats, godMode: godModeState },
                  player: godModeState ? { ...gameState.player, health: gameState.player.maxHealth } : gameState.player
              });
              success = true;
              break;
          case "1122334455": // Infinite Stamina
              const stamState = !gameState.cheats.infiniteStamina;
              statusMsg = stamState ? "Cheat: Inf Stamina ON" : "Cheat: Inf Stamina OFF";
              onUpdateGameState({ 
                  cheats: { ...gameState.cheats, infiniteStamina: stamState },
                  player: stamState ? { ...gameState.player, stamina: gameState.player.maxStamina } : gameState.player
              });
              success = true;
              break;
          case "5550001111": // Clear Wanted
              statusMsg = "Cheat: Wanted Cleared";
              onUpdateGameState({ wantedLevel: 0 });
              success = true;
              break;
          case "6660009999": // Max Wanted
              statusMsg = "Cheat: Wanted Maxed";
              onUpdateGameState({ wantedLevel: 5 });
              success = true;
              break;
          case "4044040404": // Instant Respawn
              if (gameState.isWasted) {
                  statusMsg = "Cheat: Respawning...";
                  onUpdateGameState({ wastedStartTime: gameState.timeTicker - 200 }); 
                  success = true;
              } else {
                  statusMsg = "Cheat: Not Wasted";
                  success = false;
              }
              break;
          case "7007007007": // Infinite Ammo
              const ammoState = !gameState.cheats.infiniteAmmo;
              statusMsg = ammoState ? "Cheat: Inf Ammo ON" : "Cheat: Inf Ammo OFF";
              onUpdateGameState({ cheats: { ...gameState.cheats, infiniteAmmo: ammoState } });
              success = true;
              break;
          case "9090909090": // No Reload
              const reloadState = !gameState.cheats.noReload;
              statusMsg = reloadState ? "Cheat: No Reload ON" : "Cheat: No Reload OFF";
              onUpdateGameState({ cheats: { ...gameState.cheats, noReload: reloadState } });
              success = true;
              break;
          case "1313131313": // One Hit Kill
              const ohkState = !gameState.cheats.oneHitKill;
              statusMsg = ohkState ? "Cheat: 1-Hit Kill ON" : "Cheat: 1-Hit Kill OFF";
              onUpdateGameState({ cheats: { ...gameState.cheats, oneHitKill: ohkState } });
              success = true;
              break;
          case "4445556666": // Spawn Random Car
              const keys = Object.keys(CAR_MODELS).filter(k => k !== 'plane' && k !== 'jet' && k !== 'tank');
              const randomKey = keys[Math.floor(Math.random() * keys.length)] as keyof typeof CAR_MODELS;
              spawnVehicle(randomKey);
              statusMsg = `Cheat: Spawned ${randomKey}`;
              success = true;
              break;
          case "9998887777": // Spawn Supercar
              spawnVehicle('supercar');
              statusMsg = "Cheat: Spawned Supercar";
              success = true;
              break;
          case "8880008880": // Spawn Tank
              spawnVehicle('tank');
              statusMsg = "Cheat: Spawned Tank";
              success = true;
              break;
          case "1212121212": // Vehicle Invincible
              const vGodState = !gameState.cheats.vehicleGodMode;
              statusMsg = vGodState ? "Cheat: Car God ON" : "Cheat: Car God OFF";
              onUpdateGameState({ cheats: { ...gameState.cheats, vehicleGodMode: vGodState } });
              success = true;
              break;
          case "2323232323": // Vehicle Boost
              if (gameState.player.vehicleId) {
                  const v = gameState.vehicles.find(v => v.id === gameState.player.vehicleId);
                  if (v) {
                      const boost = 50; 
                      const bx = Math.cos(v.angle) * boost;
                      const by = Math.sin(v.angle) * boost;
                      const updatedVehicles = gameState.vehicles.map(veh => 
                          veh.id === v.id ? { ...veh, velocity: { x: veh.velocity.x + bx, y: veh.velocity.y + by } } : veh
                      );
                      onUpdateGameState({ vehicles: updatedVehicles });
                      statusMsg = "Cheat: Boosted!";
                      success = true;
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
              success = true;
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
      if (success) audioManager.playUI('success');
      else if (statusMsg) audioManager.playUI('error');

      setTimeout(() => {
          if (clearDial) setDialOutput("");
          setDialStatus(null);
      }, 3000);
  };

  const handleBrowserGo = () => {
      let url = browserUrl.trim();
      if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
      }
      if (url) {
          setBrowserSrc(url);
          audioManager.playUI('click');
      }
  };

  if (!isOpen) return null;

  const formatTime = (date: Date) => {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatDate = (date: Date) => {
      return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  };

  // Mobile transformation style
  const mobileStyle: React.CSSProperties = isMobile ? {
      transform: `translate(-50%, -50%) scale(${scale})`,
      transformOrigin: 'center center'
  } : {};

  // Logic for the app overlay
  const showOverlay = activeApp !== 'home';
  const overlayApp = showOverlay ? activeApp : lastApp;

  return (
    <div 
        style={mobileStyle}
        className={`
            z-[60] flex flex-col overflow-hidden shadow-2xl transition-all duration-300 
            bg-black border-[6px] border-gray-900 rounded-[36px]
            w-[320px] h-[640px]
            fixed top-1/2 left-1/2 
            ${!isMobile ? '' : '-translate-x-1/2 -translate-y-1/2'} 
            md:absolute md:top-auto md:left-auto md:translate-x-0 md:translate-y-0
            md:bottom-10 md:right-20 md:transform-none md:max-h-none
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
                className="absolute inset-0 z-50 flex flex-col items-center pt-24 pb-8 backdrop-blur-sm bg-black/10 cursor-pointer animate-fade-in"
                onClick={() => { setIsLocked(false); audioManager.playUI('open'); }}
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

        {/* --- UNLOCKED INTERFACE --- */}
        {!isLocked && (
            <div className="relative z-10 w-full h-full">
                
                {/* --- HOME SCREEN LAYER (Underneath) --- */}
                {/* When an app is open, we scale down the home screen slightly and dim it for a depth effect */}
                <div className={`absolute inset-0 flex flex-col transition-all duration-300 ease-out ${showOverlay ? 'scale-90 opacity-0' : 'scale-100 opacity-100'}`}>
                    <div className="flex-1 flex flex-col p-4 pt-16">
                        {/* App Grid */}
                        <div className="grid grid-cols-4 gap-x-4 gap-y-6">
                            <AppIcon icon="fa-phone" color="bg-green-600" label="Phone" onClick={() => handleAppOpen('dialer')} />
                            <AppIcon icon="fa-crosshairs" color="bg-green-500" label="Jobs" onClick={() => handleAppOpen('missions')} />
                            <AppIcon icon="fa-cog" color="bg-gray-500" label="Settings" onClick={() => handleAppOpen('settings')} />
                            <AppIcon icon="fa-map" color="bg-blue-500" label="Maps" onClick={() => handleAppOpen('map')} />
                            <AppIcon icon="fa-camera" color="bg-yellow-500" label="Camera" onClick={() => audioManager.playUI('error')} />
                            <AppIcon icon="fa-cloud" color="bg-sky-400" label="Weather" onClick={() => handleAppOpen('weather')} />
                            <AppIcon icon="fa-wallet" color="bg-indigo-500" label="Wallet" onClick={() => handleAppOpen('wallet')} />
                            <AppIcon icon="fa-music" color="bg-red-500" label="Music" onClick={() => handleAppOpen('music')} />
                            <AppIcon icon="fa-dice" color="bg-yellow-600" label="Casino" onClick={() => handleAppOpen('casino')} />
                        </div>

                        {/* Dock */}
                        <div className="mt-auto mb-2 bg-white/10 backdrop-blur-xl rounded-3xl p-3 flex justify-around items-center mx-1">
                            <AppIcon icon="fa-phone" color="bg-green-600" onClick={() => handleAppOpen('dialer')} />
                            <AppIcon icon="fa-globe" color="bg-blue-600" onClick={() => handleAppOpen('browser')} />
                            <AppIcon icon="fa-comment" color="bg-green-500" onClick={() => audioManager.playUI('error')} />
                            <AppIcon icon="fa-music" color="bg-red-500" onClick={() => handleAppOpen('music')} />
                        </div>
                    </div>
                </div>

                {/* --- APP OVERLAY LAYER (Slides Up) --- */}
                <div className={`absolute inset-0 z-20 flex flex-col transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1) ${showOverlay ? 'translate-y-0' : 'translate-y-full'}`}>
                    
                    {/* Back Button (Only visible if app is open AND not Casino as it has internal nav) */}
                    {overlayApp !== 'casino' && (
                        <div className="absolute top-10 left-4 z-50">
                            <button 
                                onClick={() => { setActiveApp('home'); audioManager.playUI('back'); }}
                                className="w-8 h-8 flex items-center justify-center bg-white/20 backdrop-blur-md rounded-full hover:bg-white/30 text-white shadow-lg active:scale-95 transition-transform"
                            >
                                <i className="fas fa-chevron-down text-sm"></i>
                            </button>
                        </div>
                    )}

                    {/* Content Container */}
                    <div className="w-full h-full overflow-hidden rounded-[30px]">
                        
                        {/* --- CASINO APP --- */}
                        {overlayApp === 'casino' && (
                            <CasinoApp 
                                money={gameState.money} 
                                onUpdateMoney={(amt) => onUpdateGameState({ money: amt })}
                                onClose={() => { setActiveApp('home'); audioManager.playUI('back'); }}
                            />
                        )}

                        {/* --- BROWSER APP --- */}
                        {overlayApp === 'browser' && (
                            <div className="flex flex-col h-full bg-white text-black">
                                {/* Browser Header */}
                                <div className="bg-gray-100 p-2 border-b flex items-center gap-2 pt-10 pb-2">
                                    <button onClick={() => { setBrowserSrc(null); setBrowserUrl(""); }} className="text-gray-500 hover:text-blue-500 px-2">
                                        <i className="fas fa-home"></i>
                                    </button>
                                    <form 
                                        onSubmit={(e) => { e.preventDefault(); handleBrowserGo(); }} 
                                        className="flex-1"
                                    >
                                        <input 
                                            type="text" 
                                            value={browserUrl}
                                            onChange={(e) => setBrowserUrl(e.target.value)}
                                            className="w-full bg-gray-200 rounded-full px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-sans"
                                            placeholder="Search or type URL"
                                        />
                                    </form>
                                    <button onClick={handleBrowserGo} className="text-blue-500 hover:text-blue-600 px-2">
                                        <i className="fas fa-arrow-right"></i>
                                    </button>
                                </div>

                                {/* Browser Content */}
                                <div className="flex-1 bg-white relative overflow-hidden">
                                    {browserSrc ? (
                                        <iframe 
                                            src={browserSrc} 
                                            className="w-full h-full border-0" 
                                            title="Eyefind Browser"
                                            sandbox="allow-scripts allow-same-origin allow-forms"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4 animate-fade-in">
                                            <div className="text-4xl font-bold text-blue-600 font-gta tracking-widest drop-shadow-sm">Eyefind</div>
                                            <div className="text-gray-400 text-sm">The search engine that sees all.</div>
                                            
                                            <div className="w-full max-w-[240px] mt-8">
                                                <div className="text-[10px] text-gray-400 mb-2 font-bold text-left uppercase tracking-wider">Top Sites</div>
                                                <button 
                                                    onClick={() => { 
                                                        const url = "https://en.wikipedia.org/wiki/Grand_Theft_Auto";
                                                        setBrowserUrl(url); 
                                                        setBrowserSrc(url);
                                                        audioManager.playUI('click');
                                                    }} 
                                                    className="w-full text-left bg-gray-50 border border-gray-200 p-3 rounded-xl mb-3 text-sm hover:bg-gray-100 transition-colors flex items-center gap-3 shadow-sm group"
                                                >
                                                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-black group-hover:bg-white transition-colors">
                                                        <i className="fab fa-wikipedia-w"></i>
                                                    </div>
                                                    <span className="font-medium text-gray-700">Wikipedia (GTA)</span>
                                                </button>
                                                
                                                <button 
                                                    onClick={() => { 
                                                        const url = "https://www.bing.com";
                                                        setBrowserUrl(url); 
                                                        setBrowserSrc(url);
                                                        audioManager.playUI('click');
                                                    }} 
                                                    className="w-full text-left bg-gray-50 border border-gray-200 p-3 rounded-xl mb-3 text-sm hover:bg-gray-100 transition-colors flex items-center gap-3 shadow-sm group"
                                                >
                                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 group-hover:bg-white transition-colors">
                                                        <i className="fas fa-search"></i>
                                                    </div>
                                                    <span className="font-medium text-gray-700">Bing Search</span>
                                                </button>

                                                <button 
                                                    onClick={() => { 
                                                        const url = "https://www.openstreetmap.org";
                                                        setBrowserUrl(url); 
                                                        setBrowserSrc(url);
                                                        audioManager.playUI('click');
                                                    }} 
                                                    className="w-full text-left bg-gray-50 border border-gray-200 p-3 rounded-xl mb-3 text-sm hover:bg-gray-100 transition-colors flex items-center gap-3 shadow-sm group"
                                                >
                                                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 group-hover:bg-white transition-colors">
                                                        <i className="fas fa-map"></i>
                                                    </div>
                                                    <span className="font-medium text-gray-700">OpenStreetMap</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* --- MAP APP --- */}
                        {overlayApp === 'map' && (
                            <div className="flex flex-col h-full bg-zinc-900 relative">
                                <Radar gameState={gameState} zoomLevel={0.03} className="w-full h-full object-cover" />
                                <div className="absolute top-12 right-4 bg-black/60 px-3 py-1 rounded text-xs font-mono backdrop-blur-sm pointer-events-none">
                                    <i className="fas fa-location-arrow mr-1"></i> GPS ACTIVE
                                </div>
                            </div>
                        )}

                        {/* --- MUSIC APP --- */}
                        {overlayApp === 'music' && (
                            <div className="flex flex-col h-full bg-zinc-900 text-white relative">
                                {/* Header */}
                                <div className="pt-12 pb-4 px-6 bg-gradient-to-b from-zinc-800 to-zinc-900 shadow-md z-10">
                                    <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                                        <i className="fas fa-headphones-simple text-green-500"></i> Vibez Music
                                    </h2>
                                </div>

                                {/* Track List */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">Your Library</h3>
                                    {TRACKS.map(track => {
                                        const isActive = currentTrack === track.id;
                                        return (
                                            <button 
                                                key={track.id}
                                                onClick={() => handlePlayTrack(track.id)}
                                                className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${isActive ? 'bg-zinc-800 ring-1 ring-green-500/50' : 'hover:bg-zinc-800/50'}`}
                                            >
                                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center shadow-lg ${track.color} relative overflow-hidden`}>
                                                    <i className={`fas ${track.icon} text-xl text-white/90 relative z-10`}></i>
                                                    {/* Animated bars if playing this track */}
                                                    {isActive && isPlaying && (
                                                        <div className="absolute inset-0 flex items-end justify-center gap-0.5 pb-1 opacity-50">
                                                            <div className="w-1 bg-white animate-bounce-slow" style={{height: '60%', animationDuration: '0.4s'}}></div>
                                                            <div className="w-1 bg-white animate-bounce-slow" style={{height: '90%', animationDuration: '0.5s'}}></div>
                                                            <div className="w-1 bg-white animate-bounce-slow" style={{height: '70%', animationDuration: '0.3s'}}></div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 text-left">
                                                    <div className={`font-bold text-sm ${isActive ? 'text-green-400' : 'text-white'}`}>{track.title}</div>
                                                    <div className="text-xs text-zinc-400">{track.artist}</div>
                                                </div>
                                                {isActive && (
                                                    <div className="text-green-500">
                                                        <i className={`fas ${isPlaying ? 'fa-volume-high' : 'fa-volume-off'}`}></i>
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Now Playing / Controls */}
                                <div className="bg-zinc-800 p-4 border-t border-zinc-700/50 pb-8">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="text-xs text-zinc-400">{isPlaying ? 'NOW PLAYING' : 'PAUSED'}</div>
                                        <div className="text-xs text-zinc-400 font-mono">2:30</div>
                                    </div>
                                    
                                    {/* Progress Bar (Fake) */}
                                    <div className="w-full h-1 bg-zinc-700 rounded-full mb-6 overflow-hidden">
                                        <div className={`h-full bg-green-500 rounded-full ${isPlaying ? 'animate-progress' : 'w-1/3'}`} style={{animationDuration: '10s'}}></div>
                                    </div>

                                    {/* Buttons */}
                                    <div className="flex justify-center items-center gap-8">
                                        <button onClick={handlePrevTrack} className="text-zinc-400 hover:text-white transition-colors">
                                            <i className="fas fa-backward-step text-xl"></i>
                                        </button>
                                        <button 
                                            onClick={handleTogglePlay}
                                            className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-all shadow-lg"
                                        >
                                            <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play pl-1'} text-2xl`}></i>
                                        </button>
                                        <button onClick={handleNextTrack} className="text-zinc-400 hover:text-white transition-colors">
                                            <i className="fas fa-forward-step text-xl"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* --- WEATHER APP --- */}
                        {overlayApp === 'weather' && (
                            <div className="flex flex-col h-full bg-gradient-to-b from-sky-400 to-sky-700 text-white p-6 pt-20">
                                <div className="flex flex-col items-center mb-8">
                                    <h2 className="text-3xl font-light mb-1">React City</h2>
                                    <span className="text-sm opacity-80 font-medium">Partly Cloudy</span>
                                    <div className="text-8xl font-thin mt-4 drop-shadow-md">72°</div>
                                    <div className="flex gap-4 mt-2 text-sm opacity-90">
                                        <span>H:84°</span>
                                        <span>L:65°</span>
                                    </div>
                                </div>

                                <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm">
                                    <div className="text-xs uppercase opacity-70 mb-3 border-b border-white/20 pb-2">Hourly Forecast</div>
                                    <div className="flex justify-between text-sm">
                                        {['Now', '1PM', '2PM', '3PM', '4PM'].map((t, i) => (
                                            <div key={i} className="flex flex-col items-center gap-2">
                                                <span className="opacity-90">{t}</span>
                                                <i className={`fas ${i===2 ? 'fa-cloud-sun' : i===4 ? 'fa-cloud' : 'fa-sun'} text-yellow-300`}></i>
                                                <span className="font-bold">{72+i}°</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm mt-4 flex-1">
                                    <div className="text-xs uppercase opacity-70 mb-3 border-b border-white/20 pb-2">5-Day Forecast</div>
                                    <div className="flex flex-col gap-3">
                                        {['Today', 'Mon', 'Tue', 'Wed', 'Thu'].map((day, i) => (
                                            <div key={i} className="flex justify-between items-center text-sm font-medium">
                                                <span className="w-10">{day}</span>
                                                <i className={`fas ${i%2===0 ? 'fa-sun text-yellow-300' : 'fa-cloud-sun text-gray-200'}`}></i>
                                                <div className="flex gap-2 w-20 justify-end">
                                                    <span className="opacity-60">65°</span>
                                                    <span>82°</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* --- WALLET APP --- */}
                        {overlayApp === 'wallet' && (
                            <div className="flex flex-col h-full bg-slate-900 text-white">
                                <div className="bg-slate-800 p-6 pt-20 pb-8 rounded-b-[40px] shadow-2xl relative z-10">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <div className="text-slate-400 text-sm font-medium mb-1">Total Balance</div>
                                            <div className="text-4xl font-bold tracking-tight">${gameState.money.toLocaleString()}</div>
                                        </div>
                                        <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                            <i className="fas fa-wallet text-white"></i>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button className="flex-1 bg-indigo-600 hover:bg-indigo-500 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-lg shadow-indigo-900/20">Send</button>
                                        <button className="flex-1 bg-slate-700 hover:bg-slate-600 py-2.5 rounded-xl font-medium text-sm transition-colors">Request</button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6">
                                    <h3 className="font-bold text-slate-300 mb-4 text-sm uppercase tracking-wider">Recent Transactions</h3>
                                    <div className="space-y-4">
                                        {[
                                            { title: "Pay 'n' Spray", date: "Today", amount: -200, icon: "fa-spray-can", color: "bg-yellow-500" },
                                            { title: "Mission Reward", date: "Yesterday", amount: 1500, icon: "fa-briefcase", color: "bg-green-500" },
                                            { title: "Hospital Bill", date: "Yesterday", amount: -500, icon: "fa-heart-pulse", color: "bg-red-500" },
                                            { title: "Ammunation", date: "2 days ago", amount: -850, icon: "fa-gun", color: "bg-gray-500" },
                                            { title: "Street Cab", date: "3 days ago", amount: -25, icon: "fa-taxi", color: "bg-yellow-400" },
                                        ].map((tx, i) => (
                                            <div key={i} className="flex items-center gap-4 group">
                                                <div className={`w-10 h-10 ${tx.color} rounded-full flex items-center justify-center text-black shadow-sm group-hover:scale-110 transition-transform`}>
                                                    <i className={`fas ${tx.icon} text-sm`}></i>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-bold text-sm text-slate-200">{tx.title}</div>
                                                    <div className="text-xs text-slate-500 font-medium">{tx.date}</div>
                                                </div>
                                                <div className={`font-bold font-mono text-sm ${tx.amount > 0 ? 'text-green-400' : 'text-slate-200'}`}>
                                                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* --- MISSIONS APP --- */}
                        {overlayApp === 'missions' && (
                            <div className="flex flex-col h-full bg-zinc-900">
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
                                                        audioManager.playUI('success');
                                                        onClose();
                                                    }}
                                                    className="bg-green-600 py-2.5 rounded-xl font-bold text-sm hover:bg-green-500 active:scale-95 transition-transform"
                                                >
                                                    Accept
                                                </button>
                                                <button 
                                                    onClick={() => { setGeneratedMission(null); audioManager.playUI('back'); }}
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
                        {overlayApp === 'dialer' && (
                            <div className="flex flex-col h-full bg-black text-white">
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
                        {overlayApp === 'settings' && (
                            <div className="flex flex-col h-full bg-gray-50 text-black">
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
                                                        onClick={() => { onUpdateSettings(s => ({...s, drawDistance: level as any})); audioManager.playUI('click'); }}
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
                                                onClick={() => { onUpdateSettings(s => ({...s, mobileControlStyle: s.mobileControlStyle === 'DPAD' ? 'JOYSTICK' : 'DPAD'})); audioManager.playUI('click'); }}
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
                        {overlayApp === 'cheats' && (
                            <div className="flex flex-col h-full bg-black text-green-500 font-mono">
                                <div className="bg-green-900/20 p-4 pt-12 pb-3 border-b border-green-500/50 flex items-center justify-center relative">
                                    <h2 className="font-bold text-lg tracking-widest text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]">HACK_TOOL_V6</h2>
                                    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-green-500 to-transparent"></div>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {CHEAT_LIST.map((cheat, i) => (
                                        <div key={i} className="group border border-green-800 bg-green-950/30 p-3 rounded hover:bg-green-900/50 transition-colors cursor-pointer"
                                             onClick={() => {
                                                 setDialOutput(cheat.code);
                                                 setActiveApp('dialer');
                                                 audioManager.playUI('click');
                                             }}
                                        >
                                            <div className="text-xs text-green-300 opacity-70 mb-1">Code: {cheat.code}</div>
                                            <div className="font-bold text-green-400 group-hover:text-green-200">{cheat.desc}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default Phone;
