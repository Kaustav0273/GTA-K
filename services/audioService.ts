
import { GameSettings } from '../types';

class AudioService {
    ctx: AudioContext | null = null;
    sfxVolume: number = 0.5;
    musicVolume: number = 0.5;
    
    // Engine Loop Components
    engineOsc: OscillatorNode | null = null;
    engineMod: OscillatorNode | null = null;
    engineGain: GainNode | null = null;
    engineFilter: BiquadFilterNode | null = null;
    engineModGain: GainNode | null = null;
    
    currentVehicleId: string | null = null;
    
    // iOS Silent Switch Unlock Flag
    unlocked: boolean = false;

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        
        if (!this.unlocked) {
            this.unlockAudio();
        }
    }

    unlockAudio() {
        // Fix for iOS Silent Switch: playing an HTML5 audio element forces the audio session to "Playback"
        // This allows Web Audio API to play even if the physical ringer switch is set to Silent.
        const audio = new Audio();
        // Tiny silent wav file (1x1 pixel equivalent for audio)
        audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAABkYXRhAAAAAA==';
        
        // We need to handle the promise to avoid unhandled rejection errors
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                // Once it starts playing, we can pause it immediately. The session is now "active".
                audio.pause();
                audio.currentTime = 0;
                this.unlocked = true;
            }).catch(() => {
                // Auto-play was prevented. This is expected if not called during a user interaction.
                // We will try again next init() call.
            });
        }
    }

    setVolume(settings: GameSettings) {
        this.sfxVolume = settings.sfxVolume / 10;
        this.musicVolume = settings.musicVolume / 10;
        // Update engine volume immediately if running
        if (this.engineGain && this.ctx) {
             this.engineGain.gain.setTargetAtTime(this.sfxVolume * 0.1, this.ctx.currentTime, 0.1);
        }
    }

    // Helper: Create a noise buffer
    createNoiseBuffer() {
        if (!this.ctx) return null;
        const bufferSize = this.ctx.sampleRate * 2; // 2 seconds
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    playShoot(weapon: string) {
        if (!this.ctx || this.sfxVolume <= 0) return;
        const t = this.ctx.currentTime;
        
        // 1. Noise Component (The "Bang")
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer();
        const noiseFilter = this.ctx.createBiquadFilter();
        const noiseGain = this.ctx.createGain();
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);

        // 2. Tonal Component (The "Punch")
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);

        const isSilenced = weapon === 'iron_whisper' || weapon === 'silent_eclipse';
        
        if (isSilenced) {
            // Silenced: High frequency "pfft"
            noiseFilter.type = 'highpass';
            noiseFilter.frequency.value = 2000;
            
            noiseGain.gain.setValueAtTime(this.sfxVolume * 0.2, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
            
            noise.start(t);
            noise.stop(t + 0.1);
            return;
        }

        if (weapon.includes('pistol')) {
            // Sharp Crack + Light Kick
            noiseFilter.type = 'lowpass';
            noiseFilter.frequency.setValueAtTime(2500, t);
            
            noiseGain.gain.setValueAtTime(this.sfxVolume * 0.6, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(150, t);
            osc.frequency.exponentialRampToValueAtTime(60, t + 0.05);
            oscGain.gain.setValueAtTime(this.sfxVolume * 0.3, t);
            oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

            noise.start(t); noise.stop(t + 0.15);
            osc.start(t); osc.stop(t + 0.05);

        } else if (weapon.includes('smg') || weapon === 'uzi') {
            // Tighter, faster crack
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.setValueAtTime(2000, t);
            
            noiseGain.gain.setValueAtTime(this.sfxVolume * 0.5, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
            
            noise.start(t); noise.stop(t + 0.1);

        } else if (weapon.includes('shotgun')) {
            // Boom + Heavy Kick
            noiseFilter.type = 'lowpass';
            noiseFilter.frequency.setValueAtTime(800, t);
            
            noiseGain.gain.setValueAtTime(this.sfxVolume * 0.8, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
            
            osc.type = 'square';
            osc.frequency.setValueAtTime(80, t);
            osc.frequency.exponentialRampToValueAtTime(20, t + 0.15);
            oscGain.gain.setValueAtTime(this.sfxVolume * 0.5, t);
            oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

            noise.start(t); noise.stop(t + 0.4);
            osc.start(t); osc.stop(t + 0.15);

        } else if (weapon.includes('sniper')) {
             // Echoey Crack (Bullet barrier break)
             noiseFilter.type = 'highpass';
             noiseFilter.frequency.setValueAtTime(1200, t);
             
             noiseGain.gain.setValueAtTime(this.sfxVolume * 0.7, t);
             noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.5); // Long tail
             
             osc.type = 'sawtooth';
             osc.frequency.setValueAtTime(600, t);
             osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
             oscGain.gain.setValueAtTime(this.sfxVolume * 0.2, t);
             oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

             noise.start(t); noise.stop(t + 0.5);
             osc.start(t); osc.stop(t + 0.1);

        } else if (weapon.includes('rocket')) {
             // Whoosh + Pop
             noiseFilter.type = 'lowpass';
             noiseFilter.frequency.setValueAtTime(600, t);
             noiseGain.gain.setValueAtTime(this.sfxVolume * 0.5, t);
             noiseGain.gain.linearRampToValueAtTime(0, t + 0.6);
             noise.start(t); noise.stop(t + 0.6);
             
        } else if (weapon.includes('flame')) {
             noiseFilter.type = 'lowpass';
             noiseFilter.frequency.value = 300;
             noiseGain.gain.setValueAtTime(this.sfxVolume * 0.3, t);
             noiseGain.gain.linearRampToValueAtTime(0, t + 0.2);
             noise.start(t); noise.stop(t + 0.2);
        } else {
            // Melee (Fist/Bat)
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.value = 400;
            noiseGain.gain.setValueAtTime(this.sfxVolume * 0.4, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
            noise.start(t); noise.stop(t + 0.15);
        }
    }

    playExplosion() {
        if (!this.ctx || this.sfxVolume <= 0) return;
        const t = this.ctx.currentTime;
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer();
        
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        
        // Deep Rumble
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, t);
        filter.frequency.linearRampToValueAtTime(50, t + 1.5);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        
        gain.gain.setValueAtTime(this.sfxVolume * 1.0, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 1.5);
        
        noise.start(t);
        noise.stop(t + 1.5);
    }

    playImpact(heavy: boolean = false) {
        if (!this.ctx || this.sfxVolume <= 0) return;
        const t = this.ctx.currentTime;
        
        // Use Noise for impact (crunch) instead of just tone
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer();
        const noiseFilter = this.ctx.createBiquadFilter();
        const noiseGain = this.ctx.createGain();
        
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.value = heavy ? 400 : 800;
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        
        noiseGain.gain.setValueAtTime(this.sfxVolume * (heavy ? 0.6 : 0.3), t);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, t + (heavy ? 0.2 : 0.1));
        
        noise.start(t);
        noise.stop(t + 0.2);
    }

    playPedHit() {
        if (!this.ctx || this.sfxVolume <= 0) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        // Softer impact
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
        
        gain.gain.setValueAtTime(this.sfxVolume * 0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        
        osc.start(t);
        osc.stop(t + 0.1);
    }

    playUI(type: 'click' | 'hover' | 'back' | 'success' | 'error' | 'open') {
        if (!this.ctx || this.sfxVolume <= 0) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'sine';
        const vol = this.sfxVolume * 0.4;

        if (type === 'click' || type === 'open') {
            osc.frequency.setValueAtTime(type === 'open' ? 500 : 600, t);
            osc.frequency.exponentialRampToValueAtTime(300, t + 0.1);
            gain.gain.setValueAtTime(vol, t);
            gain.gain.linearRampToValueAtTime(0, t + 0.1);
            osc.start(t);
            osc.stop(t + 0.1);
        } else if (type === 'hover') {
            osc.frequency.setValueAtTime(400, t);
            gain.gain.setValueAtTime(vol * 0.2, t);
            gain.gain.linearRampToValueAtTime(0, t + 0.05);
            osc.start(t);
            osc.stop(t + 0.05);
        } else if (type === 'back') {
            osc.frequency.setValueAtTime(300, t);
            osc.frequency.exponentialRampToValueAtTime(200, t + 0.1);
            gain.gain.setValueAtTime(vol, t);
            gain.gain.linearRampToValueAtTime(0, t + 0.1);
            osc.start(t);
            osc.stop(t + 0.1);
        } else if (type === 'success') {
            osc.frequency.setValueAtTime(400, t);
            osc.frequency.setValueAtTime(600, t + 0.1);
            gain.gain.setValueAtTime(vol, t);
            gain.gain.setValueAtTime(vol, t + 0.1);
            gain.gain.linearRampToValueAtTime(0, t + 0.3);
            osc.start(t);
            osc.stop(t + 0.3);
        } else if (type === 'error') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, t);
            gain.gain.setValueAtTime(vol, t);
            gain.gain.linearRampToValueAtTime(0, t + 0.2);
            osc.start(t);
            osc.stop(t + 0.2);
        }
    }

    updateEngine(speed: number, maxSpeed: number, model: string, vehicleId: string) {
        if (!this.ctx || this.sfxVolume <= 0) return;
        
        // Start engine loop if not running or vehicle changed
        if (this.currentVehicleId !== vehicleId) {
            this.stopEngine();
            this.currentVehicleId = vehicleId;
            
            // Setup FM Synthesis Graph:
            // [Modulator Osc] --(Gain)--> [Carrier Osc Freq]
            // [Carrier Osc] --(Filter)--> [Main Gain] --> Out
            
            this.engineOsc = this.ctx.createOscillator(); // Carrier
            this.engineMod = this.ctx.createOscillator(); // Modulator (Texture)
            this.engineFilter = this.ctx.createBiquadFilter();
            this.engineGain = this.ctx.createGain();
            this.engineModGain = this.ctx.createGain();

            // Carrier Chain
            this.engineOsc.connect(this.engineFilter);
            this.engineFilter.connect(this.engineGain);
            this.engineGain.connect(this.ctx.destination);
            
            // Modulation Chain
            this.engineMod.connect(this.engineModGain);
            this.engineModGain.connect(this.engineOsc.frequency);

            // Settings
            const isSport = model === 'sport' || model === 'supercar' || model === 'jet';
            const isHeavy = model === 'truck' || model === 'bus' || model === 'tank' || model === 'barracks';

            this.engineOsc.type = isSport ? 'sawtooth' : 'triangle'; // Sawtooth is buzzier, Triangle is mellower
            this.engineMod.type = 'square'; // Square mod adds "chug"
            this.engineFilter.type = 'lowpass';

            this.engineOsc.start();
            this.engineMod.start();
        }

        if (this.engineOsc && this.engineGain && this.engineFilter && this.engineMod && this.engineModGain) {
            const t = this.ctx.currentTime;
            const speedRatio = Math.abs(speed) / (maxSpeed || 15);
            
            const isSport = model === 'sport' || model === 'supercar' || model === 'jet';
            const isHeavy = model === 'truck' || model === 'bus' || model === 'tank' || model === 'barracks';

            // Frequency Range (Pitch)
            // Lowered significantly to avoid siren effect.
            // Heavy: 30Hz -> 80Hz
            // Sport: 50Hz -> 150Hz
            // Normal: 40Hz -> 120Hz
            let baseFreq = 40;
            let topFreq = 120;
            
            if (isHeavy) { baseFreq = 30; topFreq = 80; }
            if (isSport) { baseFreq = 50; topFreq = 150; }

            const targetFreq = baseFreq + (speedRatio * (topFreq - baseFreq));

            // Modulator Frequency (The "Rumble" rate)
            // Faster rumble at higher RPM
            const modRate = targetFreq * 0.5; 
            
            // Modulation Depth (How "rough" the sound is)
            // Smoother at high RPM
            const modDepth = isHeavy ? 30 : (20 * (1 - speedRatio * 0.5));

            // Filter Cutoff (Brightness)
            // Opens up with speed
            const filterFreq = isSport ? (200 + speedRatio * 800) : (100 + speedRatio * 400);

            // Apply updates
            this.engineOsc.frequency.setTargetAtTime(targetFreq, t, 0.1);
            this.engineMod.frequency.setTargetAtTime(modRate, t, 0.1);
            this.engineModGain.gain.setTargetAtTime(modDepth, t, 0.1);
            this.engineFilter.frequency.setTargetAtTime(filterFreq, t, 0.1);
            
            // Volume
            const vol = this.sfxVolume * 0.15;
            this.engineGain.gain.setTargetAtTime(vol, t, 0.1);
        }
    }

    stopEngine() {
        const t = this.ctx?.currentTime || 0;
        if (this.engineOsc) {
            try { this.engineOsc.stop(t); } catch(e) {}
            this.engineOsc.disconnect();
            this.engineOsc = null;
        }
        if (this.engineMod) {
            try { this.engineMod.stop(t); } catch(e) {}
            this.engineMod.disconnect();
            this.engineMod = null;
        }
        if (this.engineGain) {
            this.engineGain.disconnect();
            this.engineGain = null;
        }
        if (this.engineFilter) {
            this.engineFilter.disconnect();
            this.engineFilter = null;
        }
        if (this.engineModGain) {
            this.engineModGain.disconnect();
            this.engineModGain = null;
        }
        this.currentVehicleId = null;
    }
}

export const audioManager = new AudioService();
