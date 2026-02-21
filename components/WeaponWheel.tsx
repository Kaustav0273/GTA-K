
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
    { label: 'Melee', icon: 'fa-hand-fist', class: 'melee', weapons: ['fist', 'bat', 'knife', 'crowbar', 'katana', 'machete', 'sledgehammer'] },
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

    const currentGroupIndex = WEAPON_GROUPS.findIndex(g => g.weapons.includes(currentWeapon));

    useEffect(() => {
        if (isOpen) setHoveredIndex(null);
    }, [isOpen]);

    // --- Calculate selection slice based on mouse/touch ---
    const calculateSelectionIndex = (clientX: number, clientY: number) => {
        if (!wheelRef.current) return null;
        const rect = wheelRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = clientX - centerX;
        const dy = clientY - centerY;

        // Optional deadzone near center to prevent jitter
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 30) return null;

        let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
        if (angle < 0) angle += 360;

        const count = WEAPON_GROUPS.length;
        const sliceAngle = 360 / count;

        const index = Math.floor(((angle + sliceAngle / 2) % 360) / sliceAngle);
        return index >= 0 && index < count ? index : null;
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const index = calculateSelectionIndex(e.clientX, e.clientY);
        if (index !== null && index !== hoveredIndex) {
            setHoveredIndex(index);
            audioManager.playUI('hover');
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 0) return;
        const touch = e.touches[0];
        const index = calculateSelectionIndex(touch.clientX, touch.clientY);
        if (index !== null && index !== hoveredIndex) {
            setHoveredIndex(index);
            audioManager.playUI('hover');
        }
    };

    const handleSelect = (index: number) => {
        const group = WEAPON_GROUPS[index];
        let nextWeapon = group.weapons[0];
        if (group.weapons.includes(currentWeapon)) {
            const currentIdxInGroup = group.weapons.indexOf(currentWeapon);
            nextWeapon = group.weapons[(currentIdxInGroup + 1) % group.weapons.length];
        }
        onSelectWeapon(nextWeapon);
        audioManager.playUI('click');
    };

    const handleClick = (e: React.MouseEvent) => {
        // Close if clicked outside wheel
        if (e.currentTarget === e.target) {
            onClose?.();
            return;
        }
        const index = calculateSelectionIndex(e.clientX, e.clientY);
        if (index !== null) handleSelect(index);
    };

    const handleTouchEnd = () => {
        if (hoveredIndex !== null) handleSelect(hoveredIndex);
    };

    // --- Display stats ---
    const getDisplayStats = () => {
        let weaponId: WeaponType = currentWeapon;
        if (hoveredIndex !== null) {
            const group = WEAPON_GROUPS[hoveredIndex];
            weaponId = group.weapons.includes(currentWeapon) ? currentWeapon : group.weapons[0];
        }

        const stats = WEAPON_STATS[weaponId];

        const dmgPct = Math.min(100, stats.damage);
        const shotsPerSec = 60 / (stats.fireRate || 60);
        const ratePct = Math.min(100, (shotsPerSec / 15) * 100);
        const spread = (stats as any).spread ?? 0;
        const accuracyPct = Math.max(0, (1 - spread / 0.3) * 100);

        return {
            name: stats.label,
            class: stats.class.toUpperCase(),
            dmg: dmgPct,
            rate: ratePct,
            acc: accuracyPct,
            isCurrent: weaponId === currentWeapon,
            groupIndex: hoveredIndex !== null ? hoveredIndex : currentGroupIndex,
        };
    };

    if (!isOpen) return null;

    const displayStats = getDisplayStats();
    const radius = 140;
    const count = WEAPON_GROUPS.length;

    return (
        <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in touch-none"
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={handleClick}
        >
            <div
                ref={wheelRef}
                className="relative w-96 h-96 rounded-full bg-zinc-900/95 border-[6px] border-zinc-700 shadow-[0_0_60px_rgba(0,0,0,0.9)] cursor-pointer overflow-hidden"
            >
                {/* Center Info Panel */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-30 w-56 h-56 bg-zinc-950 rounded-full border-4 border-zinc-700 shadow-inner">
                    <div className="text-zinc-500 text-[10px] font-mono tracking-widest uppercase mb-1">
                        {displayStats.class}
                    </div>
                    <h2
                        className={`text-2xl md:text-3xl font-gta uppercase tracking-wider mb-4 text-center leading-none px-2 ${
                            displayStats.isCurrent ? 'text-white' : 'text-zinc-300'
                        }`}
                    >
                        {displayStats.name}
                    </h2>

                    {/* Stat Bars */}
                    <div className="w-32 space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-zinc-500 w-8 text-right">DMG</span>
                            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
                                <div
                                    className="h-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] transition-all duration-200"
                                    style={{ width: `${displayStats.dmg}%` }}
                                ></div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-zinc-500 w-8 text-right">SPD</span>
                            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
                                <div
                                    className="h-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)] transition-all duration-200"
                                    style={{ width: `${displayStats.rate}%` }}
                                ></div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-zinc-500 w-8 text-right">ACC</span>
                            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
                                <div
                                    className="h-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)] transition-all duration-200"
                                    style={{ width: `${displayStats.acc}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    {hoveredIndex !== null &&
                        WEAPON_GROUPS[hoveredIndex].weapons.includes(currentWeapon) &&
                        WEAPON_GROUPS[hoveredIndex].weapons.length > 1 && (
                            <div className="absolute bottom-6 text-[9px] text-zinc-400 font-mono animate-pulse">
                                [ CLICK TO CYCLE ]
                            </div>
                        )}
                </div>

                {/* Weapon Icons */}
                {WEAPON_GROUPS.map((group, index) => {
                    const rect = wheelRef.current?.getBoundingClientRect();
                    const centerX = rect ? rect.width / 2 : 192;
                    const centerY = rect ? rect.height / 2 : 192;

                    const angleRad = ((index * (360 / count) - 90) * Math.PI) / 180;
                    const x = centerX + radius * Math.cos(angleRad);
                    const y = centerY + radius * Math.sin(angleRad);

                    const isGroupActive = group.weapons.includes(currentWeapon);
                    const isHovered = hoveredIndex === index;

                    return (
                        <div
                            key={group.label}
                            className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 flex flex-col items-center justify-center pointer-events-none z-40
                            ${isGroupActive ? 'scale-125 text-white' : 'scale-90 text-zinc-600'}
                            ${isHovered ? 'scale-125 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]' : ''}`}
                            style={{ left: x, top: y }}
                        >
                            <i className={`fas ${group.icon} text-4xl drop-shadow-md`}></i>
                            {isGroupActive && group.weapons.length > 1 && (
                                <div className="flex gap-1 mt-1">
                                    {group.weapons.map(w => (
                                        <div
                                            key={w}
                                            className={`w-1.5 h-1.5 rounded-full shadow-sm ${
                                                w === currentWeapon ? 'bg-yellow-400' : 'bg-zinc-600'
                                            }`}
                                        ></div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Visual Dividers */}
                <div className="absolute inset-0 pointer-events-none rounded-full opacity-30">
                    {WEAPON_GROUPS.map((_, index) => {
                        const rotation = index * (360 / count) - 90 + 360 / count / 2;
                        return (
                            <div
                                key={index}
                                className="absolute top-1/2 left-1/2 w-[200px] h-[2px] bg-zinc-600 origin-left"
                                style={{ transform: `rotate(${rotation}deg)` }}
                            ></div>
                        );
                    })}
                </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-10 flex gap-4 text-white/80 font-gta text-sm tracking-wide bg-black/80 px-6 py-2 rounded-full backdrop-blur border border-zinc-700 hidden md:flex">
                <span>
                    <b className="text-yellow-400">MOUSE</b> SELECT
                </span>
                <span className="text-zinc-500">|</span>
                <span>
                    <b className="text-yellow-400">CLICK</b> EQUIP
                </span>
                <span className="text-zinc-500">|</span>
                <span>
                    <b className="text-yellow-400">TAB</b> CLOSE
                </span>
            </div>
        </div>
    );
};

export default WeaponWheel;
