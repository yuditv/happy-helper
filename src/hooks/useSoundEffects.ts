import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "sound-effects-muted";

// Audio context for generating sounds programmatically
let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

// Generate a short click sound
const playClickSound = (isMuted: boolean) => {
  if (isMuted) return;
  
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05);
    
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.05);
  } catch (e) {
    // Silently fail if audio context is not available
  }
};

// Generate a hover sound
const playHoverSound = (isMuted: boolean) => {
  if (isMuted) return;
  
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(600, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(0.03, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.03);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.03);
  } catch (e) {
    // Silently fail
  }
};

// Generate a success sound
const playSuccessSound = (isMuted: boolean) => {
  if (isMuted) return;
  
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
    oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
    
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  } catch (e) {
    // Silently fail
  }
};

export function useSoundEffects() {
  const [isMuted, setIsMuted] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "true";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isMuted));
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const playClick = useCallback(() => {
    playClickSound(isMuted);
  }, [isMuted]);

  const playHover = useCallback(() => {
    playHoverSound(isMuted);
  }, [isMuted]);

  const playSuccess = useCallback(() => {
    playSuccessSound(isMuted);
  }, [isMuted]);

  return {
    isMuted,
    toggleMute,
    playClick,
    playHover,
    playSuccess,
  };
}

// Global click sound handler
export function initGlobalClickSound() {
  const isMuted = localStorage.getItem(STORAGE_KEY) === "true";
  
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === "BUTTON" ||
      target.closest("button") ||
      target.getAttribute("role") === "button" ||
      target.closest('[role="button"]') ||
      target.closest('[role="menuitem"]') ||
      target.closest('[role="tab"]')
    ) {
      const currentMuted = localStorage.getItem(STORAGE_KEY) === "true";
      playClickSound(currentMuted);
    }
  });
}
