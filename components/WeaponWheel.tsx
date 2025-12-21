
import React, { useState, useEffect, useRef } from 'react';
import { WeaponType } from '../types';

interface WeaponWheelProps {
    isOpen: boolean;
    currentWeapon: WeaponType;
    onSelectWeapon: (weapon: WeaponType) => void;
    onClose?: () => void;
}

const WEAPONS: { id: WeaponType; label: string; icon: string }[] = [
    { id: 'fist', label: 'Unarmed', icon: 'fa-hand-fist' },
    { id: 'pistol', label: 'Pistol', icon: 'fa-gun' },
    { id: 'uzi', label: 'Micro SMG', icon: 'fa-person-rifle' },
    { id: 'shotgun', label: 'Shotgun', icon: 'fa-skull' },
    { id: 'sniper', label: 'Sniper Rifle', icon: 'fa-crosshairs' },
    { id: 'rocket', label: 'RPG', icon: 'fa-rocket' },
    { id: 'flame', label: 'Flamethrower', icon: 'fa-fire' },
];

const WeaponWheel: React.FC<WeaponWheelProps> = ({ isOpen, currentWeapon, onSelectWeapon, onClose }) => {
    const [hoveredWeapon, setHoveredWeapon] = useState<WeaponType | null>(null);
    const wheelRef = useRef<HTMLDivElement>(null);

    // Reset hover when opened
    useEffect(() => {
        if (isOpen) setHoveredWeapon(null);
    }, [isOpen]);

    const calculateSelection = (clientX: number, clientY: number) => {
        if (!wheelRef.current) return null;
        
        const rect = wheelRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const dx = clientX - centerX;
        const dy = clientY - centerY;
        
        // Calculate angle in degrees (0 is Top)
        let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
        if (angle < 0) angle += 360;
        
        // Number of slices
        const count = WEAPONS.length;
        const sliceAngle = 360 / count;
        
        const index = Math.floor(((angle + sliceAngle / 2) % 360) / sliceAngle);
        
        if (index >= 0 && index < count) {
            return WEAPONS[index];
        }
        return null;
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const selection = calculateSelection(e.clientX, e.clientY);
        if (selection && selection.id !== hoveredWeapon) {
            setHoveredWeapon(selection.id);
            onSelectWeapon(selection.id);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            const selection = calculateSelection(touch.clientX, touch.clientY);
            if (selection && selection.id !== hoveredWeapon) {
                setHoveredWeapon(selection.id);
                // For touch, we might wait to select on end, but previewing is good
                // onSelectWeapon(selection.id); 
            }
        }
    };

    const handleTouchEnd = () => {
        if (hoveredWeapon) {
            onSelectWeapon(hoveredWeapon);
            if (onClose) onClose();
        }
    };
    
    // Also support click to close on desktop/touch if they tap a slice
    const handleClick = (e: React.MouseEvent) => {
        // If clicking outside the wheel (but inside the overlay), close
        if (wheelRef.current && !wheelRef.current.contains(e.target as Node)) {
             if (onClose) onClose();
             return;
        }

        const selection = calculateSelection(e.clientX, e.clientY);
        if (selection) {
            onSelectWeapon(selection.id);
            if (onClose) onClose();
        }
    };

    if (!isOpen) return null;

    const count = WEAPONS.length;
    const radius = 120; // Radius of icon placement

    return (
        <div 
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in touch-none"
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={handleClick}
        >
            <div 
                ref={wheelRef}
                className="relative w-96 h-96 rounded-full bg-black/80 border-4 border-gray-600 shadow-[0_0_50px_rgba(0,0,0,0.8)] pointer-events-none"
            >
                {/* Center Info */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-20">
                    <h2 className="text-white font-gta text-2xl uppercase tracking-widest text-shadow-lg">
                        {hoveredWeapon ? WEAPONS.find(w => w.id === hoveredWeapon)?.label : WEAPONS.find(w => w.id === currentWeapon)?.label}
                    </h2>
                </div>

                {/* Weapons */}
                {WEAPONS.map((weapon, index) => {
                    const isSelected = currentWeapon === weapon.id;
                    const isHovered = hoveredWeapon === weapon.id;
                    
                    // Angle for placement (0 is Top)
                    const angleDeg = (index * (360 / count)) - 90;
                    const angleRad = angleDeg * (Math.PI / 180);
                    
                    const x = 192 + radius * Math.cos(angleRad);
                    const y = 192 + radius * Math.sin(angleRad);

                    return (
                        <div 
                            key={weapon.id}
                            className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-150 flex flex-col items-center justify-center
                                ${isSelected ? 'scale-125 text-white' : 'scale-100 text-gray-500'}
                                ${isHovered ? 'scale-125 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]' : ''}
                            `}
                            style={{ left: x, top: y }}
                        >
                            <i className={`fas ${weapon.icon} text-4xl mb-2`}></i>
                        </div>
                    );
                })}
                
                {/* Divider Lines (Visual only) */}
                <div className="absolute inset-0 pointer-events-none rounded-full overflow-hidden opacity-20">
                    {WEAPONS.map((_, index) => {
                        const rotation = index * (360 / count) - 90 + (360 / count / 2);
                        return (
                            <div 
                                key={index}
                                className="absolute top-1/2 left-1/2 w-full h-0.5 bg-white origin-left"
                                style={{ transform: `rotate(${rotation}deg)` }}
                            ></div>
                        );
                    })}
                </div>
            </div>
            
            {/* Instruction */}
            <div className="absolute bottom-10 text-white font-gta text-lg bg-black/50 px-6 py-3 rounded border border-gray-600 hidden md:block">
                MOVE MOUSE TO SELECT
            </div>
            <div className="absolute bottom-20 text-white font-gta text-sm bg-black/50 px-6 py-3 rounded border border-gray-600 md:hidden">
                TAP OR DRAG TO SELECT
            </div>
        </div>
    );
};

export default WeaponWheel;
