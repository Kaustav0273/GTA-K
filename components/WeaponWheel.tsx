
import React, { useState, useEffect, useRef } from 'react';
import { WeaponType } from '../types';
import { WEAPON_STATS } from '../constants';
import { audioManager } from '../services/audioService';

interface WeaponWheelProps {
    isOpen: boolean;
    currentWeapon: WeaponType;
    onSelectWeapon: (weapon: WeaponType) => void;
    onClose?: () => void;
}

// Group weapons by class for the UI
const WEAPON_GROUPS: { label: string; icon: string; class: string; weapons: WeaponType[] }[] = [
    { label: 'Unarmed', icon: 'fa-hand-fist', class: 'melee', weapons: ['fist'] },
    { label: 'Pistol', icon: 'fa-gun', class: 'pistol', weapons: ['pistol', 'street_hawk', 'silver_fang', 'night_viper', 'pulse_9x', 'iron_whisper', 'neon_ace'] },
    { label: 'SMG', icon: 'fa-bolt', class: 'smg', weapons: ['uzi', 'rapid_wolf', 'urban_ripper', 'vortex_smg', 'shadow_spray', 'bullet_hive', 'turbo_stinger'] },
    { label: 'Shotgun', icon: 'fa-skull', class: 'shotgun', weapons: ['shotgun', 'doom_breaker', 'thunder_judge', 'skull_shatter', 'iron_boom', 'road_cleaner', 'hell_bison'] },
    { label: 'Sniper', icon: 'fa-crosshairs', class: 'sniper', weapons: ['sniper', 'silent_eclipse', 'longshot_zero', 'phantom_eye', 'widow_maker_x', 'frost_piercer', 'dark_horizon'] },
    { label: 'Heavy', icon: 'fa-rocket', class: 'rocket', weapons: ['rocket', 'dragon_roar', 'sky_eraser', 'titan_fall', 'blast_serpent', 'nova_cannon', 'earth_splitter'] },
    { label: 'Special', icon: 'fa-fire', class: 'flame', weapons: ['flame', 'inferno_kiss', 'fire_leviathan', 'ember_storm', 'heat_reaper', 'blaze_hydra', 'pyro_lord'] },
];

const WeaponWheel: React.FC<WeaponWheelProps> = ({ isOpen, currentWeapon, onSelectWeapon, onClose }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const wheelRef = useRef<HTMLDivElement>(null);

    // Identify which group the current weapon belongs to
    const currentGroupIndex = WEAPON_GROUPS.findIndex(g => g.weapons.includes(currentWeapon));

    // Reset hover when opened
    useEffect(() => {
        if (isOpen) setHoveredIndex(null);
    }, [isOpen]);

    const calculateSelectionIndex = (clientX: number, clientY: number) => {
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
        const count = WEAPONS_DISPLAY.length;
        const sliceAngle = 360 / count;
        
        const index = Math.floor(((angle + sliceAngle / 2) % 360) / sliceAngle);
        
        if (index >= 0 && index < count) {
            return index;
        }
        return null;
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const index = calculateSelectionIndex(e.clientX, e.clientY);
        if (index !== null && index !== hoveredIndex) {
            setHoveredIndex(index);
            audioManager.playUI('hover');
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            const index = calculateSelectionIndex(touch.clientX, touch.clientY);
            if (index !== null && index !== hoveredIndex) {
                setHoveredIndex(index);
                audioManager.playUI('hover');
            }
        }
    };

    const handleSelect = (index: number) => {
        const group = WEAPON_GROUPS[index];
        // Cycle logic:
        // If current weapon is already in this group, pick the next one in the list.
        // If not, pick the first one (or previously selected if we tracked that, but keeping simple).
        
        let nextWeapon = group.weapons[0];
        
        if (group.weapons.includes(currentWeapon)) {
            const currentIdxInGroup = group.weapons.indexOf(currentWeapon);
            const nextIdxInGroup = (currentIdxInGroup + 1) % group.weapons.length;
            nextWeapon = group.weapons[nextIdxInGroup];
        }
        
        onSelectWeapon(nextWeapon);
        audioManager.playUI('click');
    };

    const handleClick = (e: React.MouseEvent) => {
        if (wheelRef.current && !wheelRef.current.contains(e.target as Node)) {
             if (onClose) onClose();
             return;
        }
        const index = calculateSelectionIndex(e.clientX, e.clientY);
        if (index !== null) {
            handleSelect(index);
        }
    };

    const handleTouchEnd = () => {
        if (hoveredIndex !== null) {
            handleSelect(hoveredIndex);
            // Optional: Close on touch end? Maybe keep open to allow rapid cycling.
            // Let's keep open, user taps outside or button to close.
        }
    };

    if (!isOpen) return null;

    // Use WEAPON_GROUPS for the visual slices
    const WEAPONS_DISPLAY = WEAPON_GROUPS;
    const count = WEAPONS_DISPLAY.length;
    const radius = 120; // Radius of icon placement

    // Helper to get display name of current weapon if it matches hovered group
    const getLabel = () => {
        if (hoveredIndex !== null) {
            const group = WEAPON_GROUPS[hoveredIndex];
            // If we are hovering the group of the CURRENT equipped weapon, show specific name
            // Otherwise show group name
            if (group.weapons.includes(currentWeapon)) {
                return WEAPON_STATS[currentWeapon].label;
            }
            return group.label; // Show category name ("Pistols")
        }
        return WEAPON_STATS[currentWeapon].label;
    };

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
                className="relative w-96 h-96 rounded-full bg-black/80 border-4 border-gray-600 shadow-[0_0_50px_rgba(0,0,0,0.8)] cursor-pointer"
            >
                {/* Center Info */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-20 w-48">
                    <h2 className="text-white font-gta text-xl uppercase tracking-widest text-shadow-lg leading-none mb-1">
                        {getLabel()}
                    </h2>
                    {hoveredIndex !== null && WEAPON_GROUPS[hoveredIndex].weapons.includes(currentWeapon) && (
                        <div className="text-[10px] text-yellow-400 font-mono">CLICK TO CYCLE</div>
                    )}
                </div>

                {/* Weapons */}
                {WEAPONS_DISPLAY.map((group, index) => {
                    const isGroupActive = group.weapons.includes(currentWeapon);
                    const isHovered = hoveredIndex === index;
                    
                    // Angle for placement (0 is Top)
                    const angleDeg = (index * (360 / count)) - 90;
                    const angleRad = angleDeg * (Math.PI / 180);
                    
                    const x = 192 + radius * Math.cos(angleRad);
                    const y = 192 + radius * Math.sin(angleRad);

                    return (
                        <div 
                            key={group.label}
                            className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-150 flex flex-col items-center justify-center pointer-events-none
                                ${isGroupActive ? 'scale-125 text-white' : 'scale-100 text-gray-500'}
                                ${isHovered ? 'scale-125 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]' : ''}
                            `}
                            style={{ left: x, top: y }}
                        >
                            <i className={`fas ${group.icon} text-4xl mb-2`}></i>
                            {isGroupActive && (
                                <div className="flex gap-0.5 mt-1">
                                    {group.weapons.map(w => (
                                        <div key={w} className={`w-1 h-1 rounded-full ${w === currentWeapon ? 'bg-yellow-400' : 'bg-gray-600'}`}></div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
                
                {/* Divider Lines (Visual only) */}
                <div className="absolute inset-0 pointer-events-none rounded-full overflow-hidden opacity-20">
                    {WEAPONS_DISPLAY.map((_, index) => {
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
                CLICK TO EQUIP / CYCLE
            </div>
            <div className="absolute bottom-20 text-white font-gta text-sm bg-black/50 px-6 py-3 rounded border border-gray-600 md:hidden">
                TAP CATEGORY TO CYCLE
            </div>
        </div>
    );
};

export default WeaponWheel;
