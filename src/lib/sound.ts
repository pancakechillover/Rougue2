// Simple Web Audio API sound generator for UI interactions

let audioCtx: AudioContext | null = null;
let pageTurnAudio: HTMLAudioElement | null = null;

export const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  if (!pageTurnAudio) {
    pageTurnAudio = new Audio('/page-flip.mp3');
  }
};

type SoundType = 'success' | 'reward' | 'gacha' | 'redeem' | 'click' | 'levelUp' | 'pageTurn' | 'pop' | 'error' | 'calculate';

export const playSound = (type: SoundType, volume: number = 0.5, enabled: boolean = true) => {
  if (!enabled || volume <= 0) return;
  
  initAudio();

  // Attempt to resume context if it's suspended (common in browsers until user gesture)
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  if (type === 'pageTurn') {
    if (pageTurnAudio) {
      pageTurnAudio.currentTime = 0;
      pageTurnAudio.volume = Math.max(0, Math.min(1, volume));
      pageTurnAudio.play().catch(e => {
        if (e.name === 'NotAllowedError') {
          console.debug('Audio play blocked by browser policy');
        } else {
          console.debug('Audio play failed:', e);
        }
      });
    }
    return;
  }

  if (!audioCtx) return;

  // Master volume
  const v = Math.max(0, Math.min(1, volume));

  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  switch (type) {
    case 'calculate': // A soft magical chime for efficiency calculation
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, t); // high pitch
      osc.frequency.setValueAtTime(1600, t + 0.1);
      osc.frequency.setValueAtTime(2400, t + 0.2);
      
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(v * 0.15, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      
      osc.start(t);
      osc.stop(t + 0.4);
      break;
    case 'pop':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.05);
      gain.gain.setValueAtTime(v * 0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
      osc.start(t);
      osc.stop(t + 0.05);
      break;
    case 'error':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.linearRampToValueAtTime(100, t + 0.15);
      gain.gain.setValueAtTime(v * 0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
      osc.start(t);
      osc.stop(t + 0.15);
      break;
    case 'click':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.05);
      gain.gain.setValueAtTime(v * 0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
      osc.start(t);
      osc.stop(t + 0.05);
      break;

    case 'redeem':
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.exponentialRampToValueAtTime(800, t + 0.1);
      gain.gain.setValueAtTime(v * 0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      osc.start(t);
      osc.stop(t + 0.1);
      break;

    case 'success': // Dungeon complete
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, t); // A4
      osc.frequency.setValueAtTime(554.37, t + 0.1); // C#5
      osc.frequency.setValueAtTime(659.25, t + 0.2); // E5
      osc.frequency.setValueAtTime(880, t + 0.3); // A5
      
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(v * 0.15, t + 0.05);
      gain.gain.setValueAtTime(v * 0.15, t + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
      
      osc.start(t);
      osc.stop(t + 0.6);
      break;

    case 'reward': // Get reward
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, t); // C5
      osc.frequency.setValueAtTime(659.25, t + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, t + 0.2); // G5
      
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(v * 0.3, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      
      osc.start(t);
      osc.stop(t + 0.4);
      break;

    case 'gacha': // Draw gacha
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.3);
      
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(v * 0.2, t + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      
      osc.start(t);
      osc.stop(t + 0.4);
      break;

    case 'levelUp':
      osc.type = 'square';
      osc.frequency.setValueAtTime(523.25, t); // C5
      osc.frequency.setValueAtTime(659.25, t + 0.15); // E5
      osc.frequency.setValueAtTime(783.99, t + 0.3); // G5
      osc.frequency.setValueAtTime(1046.50, t + 0.45); // C6
      
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(v * 0.2, t + 0.05);
      gain.gain.setValueAtTime(v * 0.2, t + 0.45);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
      
      osc.start(t);
      osc.stop(t + 0.8);
      break;
  }
};
