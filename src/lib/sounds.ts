/**
 * Sound Manager for Chess Game
 * Handles playing move, capture, check, and game-end sounds.
 * Uses Web Audio API for low-latency playback.
 */

type SoundType = 'move' | 'capture' | 'check' | 'checkmate' | 'gameStart' | 'illegal';

class SoundManager {
    private audioContext: AudioContext | null = null;
    private sounds: Map<SoundType, AudioBuffer> = new Map();
    private enabled: boolean = true;

    /** Initialize the audio context (must be called after user interaction) */
    async init() {
        if (this.audioContext) return;

        try {
            this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            await this.generateSounds();
        } catch (e) {
            console.warn('Audio not available:', e);
        }
    }

    /** Generate synthetic chess sounds */
    private async generateSounds() {
        if (!this.audioContext) return;

        // Move sound - short click/tap
        this.sounds.set('move', this.createToneBuffer(800, 0.08, 'sine', 0.3));
        // Capture sound - slightly louder, lower
        this.sounds.set('capture', this.createToneBuffer(400, 0.15, 'triangle', 0.5));
        // Check sound - alert tone
        this.sounds.set('check', this.createToneBuffer(600, 0.2, 'square', 0.25));
        // Checkmate sound - dramatic
        this.sounds.set('checkmate', this.createChordBuffer([523, 659, 784], 0.5, 0.4));
        // Game start
        this.sounds.set('gameStart', this.createToneBuffer(440, 0.15, 'sine', 0.3));
        // Illegal move
        this.sounds.set('illegal', this.createToneBuffer(200, 0.2, 'sawtooth', 0.15));
    }

    private createToneBuffer(
        frequency: number,
        duration: number,
        type: OscillatorType,
        volume: number
    ): AudioBuffer {
        const ctx = this.audioContext!;
        const sampleRate = ctx.sampleRate;
        const length = Math.floor(sampleRate * duration);
        const buffer = ctx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            let sample = 0;

            switch (type) {
                case 'sine':
                    sample = Math.sin(2 * Math.PI * frequency * t);
                    break;
                case 'triangle':
                    sample = 2 * Math.abs(2 * (t * frequency - Math.floor(t * frequency + 0.5))) - 1;
                    break;
                case 'square':
                    sample = Math.sin(2 * Math.PI * frequency * t) > 0 ? 1 : -1;
                    break;
                case 'sawtooth':
                    sample = 2 * (t * frequency - Math.floor(t * frequency + 0.5));
                    break;
            }

            // Apply envelope (fade out)
            const envelope = 1 - (i / length);
            data[i] = sample * volume * envelope * envelope;
        }

        return buffer;
    }

    private createChordBuffer(frequencies: number[], duration: number, volume: number): AudioBuffer {
        const ctx = this.audioContext!;
        const sampleRate = ctx.sampleRate;
        const length = Math.floor(sampleRate * duration);
        const buffer = ctx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            let sample = 0;

            for (const freq of frequencies) {
                sample += Math.sin(2 * Math.PI * freq * t);
            }
            sample /= frequencies.length;

            const envelope = 1 - (i / length);
            data[i] = sample * volume * envelope;
        }

        return buffer;
    }

    /** Play a sound effect */
    play(type: SoundType) {
        if (!this.enabled || !this.audioContext) return;

        const buffer = this.sounds.get(type);
        if (!buffer) return;

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        source.start(0);
    }

    /** Toggle sound on/off */
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    get isEnabled() {
        return this.enabled;
    }
}

// Singleton instance
export const soundManager = new SoundManager();
