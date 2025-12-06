import React, { useState, useEffect, useRef } from 'react';
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
    <div className="absolute bottom-4 right-20 w-72 h-[500px] bg-black rounded-[30px] border-8 border-gray-800 shadow-2xl overflow-hidden z-50 transform transition-transform duration-300 origin-bottom-right scale-100 flex flex-col">
      {/* Notch */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-black rounded-b-xl z-20"></div>

      {/* Screen */}
      <div className="flex-1 bg-gradient-to-br from-purple-900 to-blue-900 text-white p-4 pt-8 relative overflow-y-auto">
        
        {/* Back Button */}
        {app !== 'home' && (
             <button onClick={() => setApp('home')} className="absolute top-8 left-4 z-30">
                <i className="fas fa-chevron-left text-white"></i>
             </button>
        )}

        {app === 'home' && (
          <div className="grid grid-cols-3 gap-4 mt-12">
            <button onClick={() => setApp('missions')} className="flex flex-col items-center gap-1 group">
              <div className="w-14 h-14 bg-green-500 rounded-xl flex items-center justify-center shadow-lg group-active:scale-95 transition-transform">
                <i className="fas fa-crosshairs text-2xl"></i>
              </div>
              <span className="text-xs">Jobs</span>
            </button>
            <button className="flex flex-col items-center gap-1 group">
              <div className="w-14 h-14 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg group-active:scale-95 transition-transform">
                <i className="fas fa-map text-2xl"></i>
              </div>
              <span className="text-xs">Maps</span>
            </button>
            <button className="flex flex-col items-center gap-1 group">
              <div className="w-14 h-14 bg-red-500 rounded-xl flex items-center justify-center shadow-lg group-active:scale-95 transition-transform">
                <i className="fas fa-music text-2xl"></i>
              </div>
              <span className="text-xs">Music</span>
            </button>
             <button className="flex flex-col items-center gap-1 group">
              <div className="w-14 h-14 bg-gray-500 rounded-xl flex items-center justify-center shadow-lg group-active:scale-95 transition-transform">
                <i className="fas fa-cog text-2xl"></i>
              </div>
              <span className="text-xs">Settings</span>
            </button>
          </div>
        )}

        {app === 'missions' && (
          <div className="flex flex-col h-full">
            <h2 className="text-xl font-bold mb-4">Underworld Jobs</h2>
            
            {!generatedMission && !loading && (
                 <div className="flex flex-col items-center justify-center h-40">
                    <p className="text-center text-sm text-gray-300 mb-4">Need cash? I can find you work.</p>
                    <button 
                        onClick={handleGenerateMission}
                        className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-full font-bold shadow-lg transition-colors"
                    >
                        Find Job
                    </button>
                 </div>
            )}

            {loading && (
                <div className="flex flex-col items-center justify-center h-40">
                    <i className="fas fa-spinner fa-spin text-3xl mb-2"></i>
                    <p className="text-xs animate-pulse">Contacting the Fixer...</p>
                </div>
            )}

            {generatedMission && (
                <div className="bg-gray-800/80 p-4 rounded-xl border border-white/10 animate-fade-in">
                    <h3 className="text-yellow-400 font-bold text-lg mb-1">{generatedMission.title}</h3>
                    <p className="text-xs text-gray-300 mb-3 leading-relaxed">{generatedMission.description}</p>
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-green-400 font-bold">${generatedMission.reward}</span>
                        <span className="text-xs bg-red-900/50 px-2 py-1 rounded text-red-200">High Risk</span>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => {
                                onAcceptMission(generatedMission);
                                onClose();
                            }}
                            className="flex-1 bg-green-600 py-2 rounded-lg font-bold text-sm hover:bg-green-500"
                        >
                            Accept
                        </button>
                        <button 
                            onClick={() => setGeneratedMission(null)}
                            className="flex-1 bg-red-600 py-2 rounded-lg font-bold text-sm hover:bg-red-500"
                        >
                            Decline
                        </button>
                    </div>
                </div>
            )}
          </div>
        )}
      </div>

      {/* Home Bar */}
      <div className="h-1 bg-white/20 w-1/3 mx-auto mb-2 rounded-full"></div>
    </div>
  );
};

export default Phone;
