'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { windTunnelAudio } from '@/lib/audio/windTunnelAudio';

/**
 * Headless controller component that binds reactive Zustand state to the
 * procedural WindTunnelAudioEngine synthesizer.
 */
export function WindTunnelAudioPlayer() {
  const {
    velocityKmH,
    turbulence,
    windAudioEnabled,
    windAudioVolume,
  } = useAppStore();

  useEffect(() => {
    windTunnelAudio.updateParameters(velocityKmH, turbulence, windAudioVolume, windAudioEnabled);
  }, [velocityKmH, turbulence, windAudioEnabled, windAudioVolume]);

  useEffect(() => {
    return () => {
      windTunnelAudio.dispose();
    };
  }, []);

  return null;
}
