/**
 * Procedural Wind Tunnel Aeroacoustics Audio Synthesis Engine
 *
 * Simulates the physical soundscape of an industrial high-speed automotive wind tunnel:
 * 1. Deep sub-audible and low-frequency turbulent air displacement (Pink noise + Low-pass filter)
 * 2. High-speed boundary layer / shear layer air rushing hiss (Pink noise + Variable-Q Band-pass filter)
 * 3. Axial fan drive & turbomachinery blade-pass whine (Oscillator + Band-pass resonator)
 * 4. Micro-turbulent gusting LFO modulation
 *
 * Dynamically scales acoustic pitch and sound pressure levels based on airspeed (velocityKmH).
 */

class WindTunnelAudioEngine {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  // Noise sources & filters
  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  // Low rumble
  private lowFilter: BiquadFilterNode | null = null;
  private lowGain: GainNode | null = null;

  // Mid/high rushing hiss
  private midFilter: BiquadFilterNode | null = null;
  private midGain: GainNode | null = null;

  // Turbomachinery fan blade-pass whine
  private turbineOsc: OscillatorNode | null = null;
  private turbineFilter: BiquadFilterNode | null = null;
  private turbineGain: GainNode | null = null;

  // Turbulence LFO
  private lfoOsc: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;

  private isRunning: boolean = false;
  private isInitialized: boolean = false;

  private currentVelocityKmH: number = 140;
  private currentTurbulence: number = 1.2;
  private currentVolume: number = 0.65;
  private isEnabled: boolean = false;

  /**
   * Generates a 4-second seamless pink noise buffer using Voss-McCartney algorithm.
   */
  private generatePinkNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    }
    return buffer;
  }

  /**
   * Lazily initialize Web Audio graph on first user interaction.
   */
  public async init(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (this.isInitialized && this.audioCtx) {
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }
      return true;
    }

    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return false;

      this.audioCtx = new AudioCtxClass();
      const ctx = this.audioCtx;

      // Master output gain
      this.masterGain = ctx.createGain();
      this.masterGain.gain.setValueAtTime(0, ctx.currentTime);
      this.masterGain.connect(ctx.destination);

      // Generate pink noise loop buffer
      this.noiseBuffer = this.generatePinkNoiseBuffer(ctx);
      this.noiseSource = ctx.createBufferSource();
      this.noiseSource.buffer = this.noiseBuffer;
      this.noiseSource.loop = true;

      // 1. Low Rumble Channel (Sub-bass and air mass displacement)
      this.lowFilter = ctx.createBiquadFilter();
      this.lowFilter.type = 'lowpass';
      this.lowFilter.frequency.setValueAtTime(250, ctx.currentTime);
      this.lowFilter.Q.setValueAtTime(1.2, ctx.currentTime);

      this.lowGain = ctx.createGain();
      this.lowGain.gain.setValueAtTime(0.3, ctx.currentTime);

      // Connect noise -> low filter -> low gain -> master
      this.noiseSource.connect(this.lowFilter);
      this.lowFilter.connect(this.lowGain);
      this.lowGain.connect(this.masterGain);

      // 2. Mid/High Shear Flow Hiss (Boundary layer air friction & jet nozzle hiss)
      this.midFilter = ctx.createBiquadFilter();
      this.midFilter.type = 'bandpass';
      this.midFilter.frequency.setValueAtTime(800, ctx.currentTime);
      this.midFilter.Q.setValueAtTime(1.4, ctx.currentTime);

      this.midGain = ctx.createGain();
      this.midGain.gain.setValueAtTime(0.2, ctx.currentTime);

      // Connect noise -> mid filter -> mid gain -> master
      this.noiseSource.connect(this.midFilter);
      this.midFilter.connect(this.midGain);
      this.midGain.connect(this.masterGain);

      // 3. Turbomachinery Fan Blade-Pass Frequency Whine
      this.turbineOsc = ctx.createOscillator();
      this.turbineOsc.type = 'triangle';
      this.turbineOsc.frequency.setValueAtTime(240, ctx.currentTime);

      this.turbineFilter = ctx.createBiquadFilter();
      this.turbineFilter.type = 'bandpass';
      this.turbineFilter.frequency.setValueAtTime(240, ctx.currentTime);
      this.turbineFilter.Q.setValueAtTime(3.5, ctx.currentTime);

      this.turbineGain = ctx.createGain();
      this.turbineGain.gain.setValueAtTime(0.05, ctx.currentTime);

      this.turbineOsc.connect(this.turbineFilter);
      this.turbineFilter.connect(this.turbineGain);
      this.turbineGain.connect(this.masterGain);

      // 4. Turbulence LFO (Creates subtle chaotic air buffeting)
      this.lfoOsc = ctx.createOscillator();
      this.lfoOsc.type = 'sine';
      this.lfoOsc.frequency.setValueAtTime(1.8, ctx.currentTime);

      this.lfoGain = ctx.createGain();
      this.lfoGain.gain.setValueAtTime(45, ctx.currentTime);

      this.lfoOsc.connect(this.lfoGain);
      this.lfoGain.connect(this.midFilter.frequency); // Modulate mid filter frequency slightly

      // Start sound sources
      this.noiseSource.start(0);
      this.turbineOsc.start(0);
      this.lfoOsc.start(0);

      this.isInitialized = true;
      this.isRunning = true;

      // Apply initial state
      this.applyAeroParameters();

      return true;
    } catch (err) {
      console.warn('Failed to initialize Wind Tunnel Audio Context:', err);
      return false;
    }
  }

  /**
   * Applies velocity, turbulence, and volume calculations to all audio synthesis nodes.
   */
  private applyAeroParameters() {
    if (!this.audioCtx || !this.isInitialized) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const timeConstant = 0.12; // Smooth 120ms time constant for artifact-free transitions

    // Normalized airspeed (20 km/h = 0.067, 140 km/h = 0.467, 300 km/h = 1.0)
    const vNorm = Math.min(1.2, Math.max(0.06, this.currentVelocityKmH / 300));
    const turbNorm = Math.min(2.0, Math.max(0.2, this.currentTurbulence / 1.0));

    // Calculate Target Master Gain:
    // When enabled, scale smoothly with dynamic pressure (v^1.3)
    const dynamicPressureGain = 0.18 + 0.82 * Math.pow(vNorm, 1.25);
    const targetMasterGain = this.isEnabled ? this.currentVolume * dynamicPressureGain : 0.0001;

    this.masterGain?.gain.setTargetAtTime(targetMasterGain, now, timeConstant);

    // 1. Low Rumble Filter Cutoff (Pitch shifts upward with airspeed)
    // 20 km/h: ~90 Hz, 140 km/h: ~340 Hz, 300 km/h: ~950 Hz
    const targetLowCutoff = 80 + Math.pow(vNorm, 1.35) * 880;
    this.lowFilter?.frequency.setTargetAtTime(targetLowCutoff, now, timeConstant);

    // Low rumble amplitude: deep and dominant at high air speeds
    const targetLowGain = 0.18 + 0.45 * Math.pow(vNorm, 1.15);
    this.lowGain?.gain.setTargetAtTime(targetLowGain, now, timeConstant);

    // 2. Mid/High Rushing Hiss Filter Center Frequency (High-pitch shearing air)
    // 20 km/h: ~250 Hz, 140 km/h: ~780 Hz, 300 km/h: ~2100 Hz
    const targetMidFreq = 220 + Math.pow(vNorm, 1.38) * 1950;
    this.midFilter?.frequency.setTargetAtTime(targetMidFreq, now, timeConstant);

    // Mid hiss amplitude: sharpens and increases drastically at high velocity
    const targetMidGain = 0.08 + 0.42 * Math.pow(vNorm, 1.45);
    this.midGain?.gain.setTargetAtTime(targetMidGain, now, timeConstant);

    // 3. Turbomachinery Fan Blade-Pass Frequency Whine
    // 20 km/h: ~65 Hz, 140 km/h: ~260 Hz, 300 km/h: ~680 Hz
    const targetFanPitch = 55 + Math.pow(vNorm, 1.18) * 620;
    this.turbineOsc?.frequency.setTargetAtTime(targetFanPitch, now, timeConstant);
    this.turbineFilter?.frequency.setTargetAtTime(targetFanPitch, now, timeConstant);

    // Fan whine volume: distinct but tasteful background resonance
    const targetFanGain = 0.02 + 0.07 * vNorm;
    this.turbineGain?.gain.setTargetAtTime(targetFanGain, now, timeConstant);

    // 4. Turbulence Gust LFO Modulation
    const targetLfoFreq = 1.2 + turbNorm * 1.6 * (0.8 + 0.4 * vNorm);
    this.lfoOsc?.frequency.setTargetAtTime(targetLfoFreq, now, timeConstant);

    const targetLfoDepth = (25 + 75 * turbNorm) * vNorm;
    this.lfoGain?.gain.setTargetAtTime(targetLfoDepth, now, timeConstant);
  }

  /**
   * Dynamically updates aerodynamic parameters from the store/slider events.
   */
  public updateParameters(velocityKmH: number, turbulence: number, volume: number, enabled: boolean) {
    this.currentVelocityKmH = velocityKmH;
    this.currentTurbulence = turbulence;
    this.currentVolume = volume;
    this.isEnabled = enabled;

    if (enabled && !this.isInitialized) {
      this.init();
    } else if (this.isInitialized) {
      if (enabled && this.audioCtx?.state === 'suspended') {
        this.audioCtx.resume();
      }
      this.applyAeroParameters();
    }
  }

  /**
   * Disposes of the audio engine graph when tearing down.
   */
  public dispose() {
    if (this.audioCtx) {
      try {
        this.masterGain?.gain.setValueAtTime(0, this.audioCtx.currentTime);
        this.noiseSource?.stop();
        this.turbineOsc?.stop();
        this.lfoOsc?.stop();
        this.audioCtx.close();
      } catch (e) {
        // Ignored during cleanup
      }
      this.audioCtx = null;
      this.isInitialized = false;
      this.isRunning = false;
    }
  }
}

// Global Singleton Instance
export const windTunnelAudio = new WindTunnelAudioEngine();
