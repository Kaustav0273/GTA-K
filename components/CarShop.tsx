
import React, { useState } from 'react';
import { GameState, Vehicle } from '../types';
import { CAR_MODELS, CAR_COLORS } from '../constants';

interface CarShopProps {
    gameState: GameState;
    onUpdate: (updates: Partial<GameState>) => void;
    onClose: () => void;
}

const CarShop: React.FC<CarShopProps> = ({ gameState, onUpdate, onClose }) => {
    const { player, vehicles, money, timeTicker } = gameState;
    const vehicle = vehicles.find(v => v.id === player.vehicleId);
    
    const [selectedColor, setSelectedColor] = useState<string | null>(null);

    if (!vehicle) return null;

    const modelData = CAR_MODELS[vehicle.model];
    const maxHealth = (modelData as any).health || 100;
    const healthPct = Math.round((vehicle.health / maxHealth) * 100);
    const repairCost = 100 + Math.floor((1 - healthPct/100) * 200); // 100 base + damage cost
    const resprayCost = 200;
    const tuneCost = 500;

    const handleRepair = () => {
        if (money < repairCost) return;
        
        onUpdate({
            money: money - repairCost,
            vehicles: vehicles.map(v => v.id === vehicle.id ? {
                ...v,
                health: maxHealth,
                damage: { tires: [false,false,false,false], windows: [false,false] },
                deformation: { fl: 0, fr: 0, bl: 0, br: 0 }
            } : v)
        });
    };

    const handleRespray = (color: string) => {
        if (money < resprayCost) return;
        
        onUpdate({
            money: money - resprayCost,
            vehicles: vehicles.map(v => v.id === vehicle.id ? { ...v, color } : v),
            wantedLevel: 0 // Respray clears wanted level
        });
        setSelectedColor(color);
    };

    const handleTune = () => {
        if (money < tuneCost) return;
        
        onUpdate({
            money: money - tuneCost,
            vehicles: vehicles.map(v => v.id === vehicle.id ? {
                ...v,
                maxSpeed: v.maxSpeed * 1.2,
                acceleration: v.acceleration * 1.2
            } : v)
        });
    };

    // Eject car backwards and apply cooldown
    const handleExit = () => {
        // Find vehicle again to get latest state
        const currentVehicle = vehicles.find(v => v.id === player.vehicleId);
        if (currentVehicle) {
            const backX = -Math.cos(currentVehicle.angle) * 15; // Push backward
            const backY = -Math.sin(currentVehicle.angle) * 15;
            
            onUpdate({
                vehicles: vehicles.map(v => v.id === currentVehicle.id ? {
                    ...v,
                    velocity: { x: backX, y: backY },
                    lastPaintTime: timeTicker // Reset cooldown timestamp (approx 5s buffer: 300 ticks)
                } : v),
                activeShop: 'none'
            });
        } else {
            // Fallback
            onClose();
        }
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in overflow-hidden">
            <div className="w-full max-w-4xl bg-zinc-900 border-4 border-yellow-500 rounded-lg shadow-2xl overflow-hidden flex flex-col h-full max-h-full md:h-auto md:max-h-[90vh]">
                
                {/* Header */}
                <div className="bg-yellow-500 p-3 md:p-4 flex justify-between items-center shrink-0">
                    <h1 className="font-gta text-2xl md:text-3xl text-black uppercase tracking-widest drop-shadow-sm">
                        PAY 'N' SPRAY
                    </h1>
                    <div className="text-black font-mono font-bold text-lg md:text-xl">
                        ${money.toLocaleString()}
                    </div>
                </div>

                {/* Content Container - Scrollable */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
                    {/* Landscape Layout: Grid adapts to available width. sm:grid-cols-2 ensures mobile landscape splits view. */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8 h-full">
                        
                        {/* LEFT COLUMN: Vehicle Info */}
                        <div className="flex flex-col items-center justify-center bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                            <h2 className="text-white font-gta text-2xl md:text-3xl uppercase mb-4 text-center">{vehicle.model}</h2>
                            
                            <div className="w-48 h-24 md:w-64 md:h-32 bg-zinc-800 rounded-lg border-2 border-zinc-600 flex items-center justify-center relative overflow-hidden mb-4 shadow-inner">
                                {/* Car Preview */}
                                <div className="w-3/4 h-1/2 rounded shadow-lg transform rotate-3 transition-colors duration-300" style={{ backgroundColor: selectedColor || vehicle.color }}></div>
                                <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-transparent to-white/5 pointer-events-none"></div>
                            </div>

                            <div className="w-full max-w-xs space-y-2">
                                <div className="flex justify-between text-xs text-zinc-400 font-mono">
                                    <span>CONDITION</span>
                                    <span>{healthPct}%</span>
                                </div>
                                <div className="w-full h-2 bg-zinc-700 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full ${healthPct < 30 ? 'bg-red-500' : 'bg-green-500'} transition-all duration-500`} 
                                        style={{ width: `${healthPct}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Actions */}
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-4 shrink-0">
                                {/* REPAIR */}
                                <button 
                                    onClick={handleRepair}
                                    disabled={healthPct >= 100 || money < repairCost}
                                    className={`p-3 rounded border transition-all flex flex-col items-center justify-center gap-1
                                        ${healthPct >= 100 ? 'bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed' : 
                                          money < repairCost ? 'bg-zinc-800 border-red-900/50 text-red-400 cursor-not-allowed' : 
                                          'bg-zinc-800 border-zinc-600 hover:border-green-400 hover:bg-zinc-700 text-white shadow-md active:scale-95'}
                                    `}
                                >
                                    <span className="font-bold text-sm">REPAIR</span>
                                    <span className={`font-mono text-xs ${healthPct >= 100 ? 'opacity-0' : 'text-green-400'}`}>${repairCost}</span>
                                </button>

                                {/* TUNE */}
                                <button 
                                    onClick={handleTune}
                                    disabled={money < tuneCost}
                                    className={`p-3 rounded border transition-all flex flex-col items-center justify-center gap-1
                                        ${money < tuneCost ? 'bg-zinc-800 border-red-900/50 text-red-400 cursor-not-allowed' : 'bg-zinc-800 border-zinc-600 hover:border-blue-400 hover:bg-zinc-700 text-white shadow-md active:scale-95'}
                                    `}
                                >
                                    <span className="font-bold text-sm">TUNE</span>
                                    <span className="text-green-400 font-mono text-xs">${tuneCost}</span>
                                </button>
                            </div>

                            {/* RESPRAY */}
                            <div className="bg-zinc-800 p-3 rounded border border-zinc-700 shrink-0">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-white font-bold text-sm">RESPRAY</h3>
                                    <span className="text-green-400 font-mono text-xs">${resprayCost}</span>
                                </div>
                                <div className="grid grid-cols-8 gap-2">
                                    {CAR_COLORS.map((c, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleRespray(c)}
                                            disabled={money < resprayCost}
                                            className={`w-full aspect-square rounded-full border-2 transition-transform hover:scale-110 active:scale-90
                                                ${vehicle.color === c ? 'border-white scale-110 shadow-[0_0_8px_white]' : 'border-transparent'}
                                                ${money < resprayCost ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                            `}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-3 md:p-4 bg-zinc-950 border-t border-zinc-800 flex justify-end shrink-0">
                    <button 
                        onClick={handleExit}
                        className="flex items-center gap-2 text-white hover:text-yellow-400 transition-colors font-gta text-lg md:text-xl uppercase active:scale-95"
                    >
                        EXIT GARAGE <i className="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CarShop;
