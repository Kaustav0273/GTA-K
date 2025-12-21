
import React, { useRef, useState, useEffect } from 'react';

interface MobileControlsProps {
    isDriving: boolean;
    controlStyle: 'DPAD' | 'JOYSTICK';
}

// Helper to dispatch keyboard events
const simulateKey = (code: string, type: 'keydown' | 'keyup') => {
    window.dispatchEvent(new KeyboardEvent(type, { code }));
};

const handlePointerDown = (e: React.PointerEvent, code: string) => {
    e.preventDefault();
    e.stopPropagation();
    simulateKey(code, 'keydown');
};

const handlePointerUp = (e: React.PointerEvent, code: string) => {
    e.preventDefault();
    e.stopPropagation();
    simulateKey(code, 'keyup');
};

const ControlButton = ({ code, icon, className, color = 'bg-gray-800/50', label }: { code: string, icon?: string, className?: string, color?: string, label?: string }) => (
    <button
        className={`rounded-2xl border-2 border-white/30 backdrop-blur-md flex items-center justify-center active:scale-95 active:bg-white/20 transition-all select-none touch-none shadow-lg ${color} ${className}`}
        onPointerDown={(e) => handlePointerDown(e, code)}
        onPointerUp={(e) => handlePointerUp(e, code)}
        onPointerLeave={(e) => handlePointerUp(e, code)}
        style={{ WebkitTapHighlightColor: 'transparent' }}
    >
        {icon && <i className={`fas ${icon} text-white/90 drop-shadow-md`}></i>}
        {label && <span className="text-white font-gta text-xs drop-shadow-md">{label}</span>}
    </button>
);

const Joystick = ({ isDriving }: { isDriving: boolean }) => {
    const joystickContainerRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());

    const handleTouch = (clientX: number, clientY: number, end: boolean = false) => {
        if (!joystickContainerRef.current) return;
        
        if (end) {
            setPosition({ x: 0, y: 0 });
            // Release all keys
            activeKeys.forEach(k => simulateKey(k, 'keyup'));
            setActiveKeys(new Set());
            return;
        }

        const rect = joystickContainerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Calculate vector
        let dx = clientX - centerX;
        let dy = clientY - centerY;
        
        // Cap distance
        const maxDist = rect.width / 2;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist > maxDist) {
            const ratio = maxDist / dist;
            dx *= ratio;
            dy *= ratio;
        }
        
        setPosition({ x: dx, y: dy });

        // Calculate Direction for Keys
        // Threshold for activation
        const threshold = 20;
        const newKeys = new Set<string>();

        if (isDriving) {
            // Driving: Map Joystick X to A/D
            if (dx < -threshold) newKeys.add('KeyA');
            if (dx > threshold) newKeys.add('KeyD');
        } else {
            // Walking: Map Joystick to WASD
            if (dy < -threshold) newKeys.add('KeyW');
            if (dy > threshold) newKeys.add('KeyS');
            if (dx < -threshold) newKeys.add('KeyA');
            if (dx > threshold) newKeys.add('KeyD');
        }

        // Diff Keys
        activeKeys.forEach(k => {
            if (!newKeys.has(k)) simulateKey(k, 'keyup');
        });
        newKeys.forEach(k => {
            if (!activeKeys.has(k)) simulateKey(k, 'keydown');
        });
        setActiveKeys(newKeys);
    };

    return (
        <div 
            ref={joystickContainerRef}
            className="w-40 h-40 bg-black/30 rounded-full border-2 border-white/20 backdrop-blur-sm relative touch-none"
            onTouchStart={(e) => handleTouch(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchMove={(e) => handleTouch(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchEnd={() => handleTouch(0, 0, true)}
            onMouseDown={(e) => handleTouch(e.clientX, e.clientY)} // Debug on PC
            onMouseMove={(e) => e.buttons === 1 && handleTouch(e.clientX, e.clientY)}
            onMouseUp={() => handleTouch(0, 0, true)}
            onMouseLeave={() => handleTouch(0, 0, true)}
        >
            <div 
                className="absolute w-16 h-16 bg-white/50 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{ 
                    transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))` 
                }}
            >
                {/* Inner texture */}
                <div className="w-12 h-12 rounded-full border border-black/20 absolute top-2 left-2"></div>
            </div>
        </div>
    );
};

const MobileControls: React.FC<MobileControlsProps> = ({ isDriving, controlStyle }) => {
    return (
        <div className="absolute inset-0 pointer-events-none z-40 md:hidden select-none">
            {/* Left Controls - Movement / Steering */}
            <div className="absolute bottom-6 left-6 w-48 h-48 pointer-events-auto flex items-end justify-start">
                 {controlStyle === 'JOYSTICK' ? (
                     <Joystick isDriving={isDriving} />
                 ) : (
                     <div className="relative w-full h-full">
                         {isDriving ? (
                            // Driving D-PAD (Left/Right)
                            <>
                                <ControlButton code="KeyA" icon="fa-chevron-left" className="absolute left-0 top-1/2 -translate-y-1/2 w-20 h-20" />
                                <ControlButton code="KeyD" icon="fa-chevron-right" className="absolute left-24 top-1/2 -translate-y-1/2 w-20 h-20" />
                            </>
                         ) : (
                            // Walking D-PAD
                            <>
                                <ControlButton code="KeyW" icon="fa-chevron-up" className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16" />
                                <ControlButton code="KeyS" icon="fa-chevron-down" className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-16" />
                                <ControlButton code="KeyA" icon="fa-chevron-left" className="absolute left-0 top-1/2 -translate-y-1/2 w-16 h-16" />
                                <ControlButton code="KeyD" icon="fa-chevron-right" className="absolute right-0 top-1/2 -translate-y-1/2 w-16 h-16" />
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-white/10 rounded-full pointer-events-none"></div>
                            </>
                         )}
                     </div>
                 )}
            </div>

            {/* Right Controls - Actions / Pedals */}
            <div className="absolute bottom-6 right-6 w-64 h-64 pointer-events-auto">
                 <div className="relative w-full h-full">
                      {isDriving ? (
                          <>
                            {/* Exit Car */}
                            <ControlButton code="KeyF" icon="fa-person-through-window" className="absolute top-0 right-2 w-12 h-12 bg-blue-600/50" />
                            
                            {/* Handbrake */}
                            <ControlButton code="Space" icon="fa-ban" className="absolute top-16 right-24 w-14 h-14 bg-red-800/50" />

                            {/* Pedals */}
                            {/* Brake - Wide, lower left */}
                            <ControlButton code="KeyS" label="" className="absolute bottom-0 right-28 w-20 h-16 bg-gray-600/80 rounded-lg border-b-4 border-black/50 active:border-b-0 active:translate-y-1" />
                            
                            {/* Gas - Tall, far right */}
                            <ControlButton code="KeyW" label="" className="absolute bottom-0 right-0 w-20 h-32 bg-gray-600/80 rounded-lg border-b-4 border-black/50 active:border-b-0 active:translate-y-1" />
                            
                            {/* Pedal Labels (Visual) */}
                            <div className="absolute bottom-4 right-32 pointer-events-none text-white/50 text-xs font-bold">BRAKE</div>
                            <div className="absolute bottom-4 right-6 pointer-events-none text-white/50 text-xs font-bold">GAS</div>
                          </>
                      ) : (
                          <>
                            {/* Sprint */}
                            <ControlButton code="ShiftLeft" icon="fa-running" className="absolute bottom-32 right-0 w-16 h-16 bg-yellow-600/50" />
                            
                            {/* Enter/Exit Car */}
                            <ControlButton code="KeyF" icon="fa-car" className="absolute top-0 right-0 w-14 h-14 bg-blue-600/50" />
                            
                            {/* Action / Punch / Shoot */}
                            <ControlButton code="Space" icon="fa-hand-fist" className="absolute bottom-0 right-0 w-24 h-24 bg-red-600/50 text-3xl" />
                          </>
                      )}
                 </div>
            </div>
        </div>
    );
};

export default MobileControls;
