
import React, { useState, useEffect } from 'react';
import { generateMission } from '../services/geminiService';
import { GameState, Mission } from '../types';

interface PhoneProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  onAcceptMission: (mission: Mission) => void;
}

const Phone: React.FC<PhoneProps> = ({ isOpen, onClose, gameState, onAcceptMission }) => {
  const [app, setApp] = useState<'home' | 'missions' | 'settings'>('home');
  const [loading, setLoading] = useState(false);
  const [generatedMission, setGeneratedMission] = useState<Mission | null>(null);

  useEffect(() => {
    if (!isOpen) {
        setApp('home');
        setGeneratedMission(null);
    }
  }, [isOpen]);

  const handleGenerateMission = async () => {
    setLoading(true);
    const mission = await generateMission(gameState.player.pos, gameState.wantedLevel, gameState.money);
    setGeneratedMission(mission);
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    // Overlay for Mobile to catch clicks outside? No, GTA phone usually doesn't block game fully, but for UI simplicity let's keep it clean.
    // Using Fixed positioning for mobile centering, Absolute for desktop corner.
    <div 
        className={`
            z-[60] flex flex-col overflow-hidden shadow-2xl transition-all duration-300 
            bg-black border-4 md:border-8 border-gray-800 rounded-[24px] md:rounded-[30px]
            
            /* Mobile: Fixed Center */
            fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
            w-[280px] h-[500px] max-h-[85vh]
            
            /* Desktop: Absolute Bottom Right */
            md:absolute md:top-auto md:left-auto md:translate-x-0 md:translate-y-0
            md:bottom-10 md:right-20 md:w-72 md:h-[500px] md:max-h-none
        `}
    >
      {/* Notch */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 md:w-32 h-5 md:h-6 bg-black rounded-b-xl z-20"></div>

      {/* Screen */}
      <div className="flex-1 bg-gradient-to-br from-purple-900 to-blue-900 text-white p-4 pt-10 relative overflow-y-auto no-scrollbar">
        
        {/* Status Bar Fake */}
        <div className="absolute top-1 right-3 text-[10px] text-white/70 font-mono">
            12:42 PM
        </div>

        {/* Back Button */}
        {app !== 'home' && (
             <button onClick={() => setApp('home')} className="absolute top-10 left-4 z-30 w-8 h-8 flex items-center justify-center bg-black/20 rounded-full hover:bg-black/40">
                <i className="fas fa-chevron-left text-white text-sm"></i>
             </button>
        )}

        {app === 'home' && (
          <div className="grid grid-cols-3 gap-4 mt-8 animate-fade-in-up">
            <button onClick={() => setApp('missions')} className="flex flex-col items-center gap-1 group">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-green-500 rounded-xl flex items-center justify-center shadow-lg group-active:scale-95 transition-transform">
                <i className="fas fa-crosshairs text-xl md:text-2xl"></i>
              </div>
              <span className="text-[10px] md:text-xs text-white/90">Jobs</span>
            </button>
            <button className="flex flex-col items-center gap-1 group">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg group-active:scale-95 transition-transform">
                <i className="fas fa-map text-xl md:text-2xl"></i>
              </div>
              <span className="text-[10px] md:text-xs text-white/90">Maps</span>
            </button>
            <button className="flex flex-col items-center gap-1 group">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-red-500 rounded-xl flex items-center justify-center shadow-lg group-active:scale-95 transition-transform">
                <i className="fas fa-music text-xl md:text-2xl"></i>
              </div>
              <span className="text-[10px] md:text-xs text-white/90">Music</span>
            </button>
             <button className="flex flex-col items-center gap-1 group">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-gray-500 rounded-xl flex items-center justify-center shadow-lg group-active:scale-95 transition-transform">
                <i className="fas fa-cog text-xl md:text-2xl"></i>
              </div>
              <span className="text-[10px] md:text-xs text-white/90">Settings</span>
            </button>
          </div>
        )}

        {app === 'missions' && (
          <div className="flex flex-col h-full animate-fade-in">
            <h2 className="text-lg md:text-xl font-bold mb-4 mt-2">Underworld Jobs</h2>
            
            {!generatedMission && !loading && (
                 <div className="flex flex-col items-center justify-center h-40">
                    <p className="text-center text-xs md:text-sm text-gray-300 mb-4 px-4">Need cash? I can find you work.</p>
                    <button 
                        onClick={handleGenerateMission}
                        className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-full font-bold shadow-lg transition-colors text-sm"
                    >
                        Find Job
                    </button>
                 </div>
            )}

            {loading && (
                <div className="flex flex-col items-center justify-center h-40">
                    <i className="fas fa-spinner fa-spin text-2xl md:text-3xl mb-2"></i>
                    <p className="text-xs animate-pulse">Contacting the Fixer...</p>
                </div>
            )}

            {generatedMission && (
                <div className="bg-gray-800/80 p-3 md:p-4 rounded-xl border border-white/10 animate-fade-in text-sm">
                    <h3 className="text-yellow-400 font-bold text-base mb-1">{generatedMission.title}</h3>
                    <p className="text-xs text-gray-300 mb-3 leading-relaxed max-h-32 overflow-y-auto">{generatedMission.description}</p>
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-green-400 font-bold">${generatedMission.reward}</span>
                        <span className="text-[10px] bg-red-900/50 px-2 py-1 rounded text-red-200">High Risk</span>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => {
                                onAcceptMission(generatedMission);
                                onClose();
                            }}
                            className="flex-1 bg-green-600 py-2 rounded-lg font-bold text-xs hover:bg-green-500"
                        >
                            Accept
                        </button>
                        <button 
                            onClick={() => setGeneratedMission(null)}
                            className="flex-1 bg-red-600 py-2 rounded-lg font-bold text-xs hover:bg-red-500"
                        >
                            Decline
                        </button>
                    </div>
                </div>
            )}
          </div>
        )}
      </div>

      {/* Home Bar / Close Button Area */}
      <div 
          className="h-6 w-full flex items-center justify-center cursor-pointer hover:bg-white/5"
          onClick={onClose}
      >
          <div className="h-1 bg-white/30 w-1/3 rounded-full"></div>
      </div>
    </div>
  );
};

export default Phone;
