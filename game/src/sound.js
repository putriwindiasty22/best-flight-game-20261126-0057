// Tiny WebAudio sounds, synthesised at run time — no audio files to ship.
// Everything is created lazily on the first user gesture, so a silent page load
// never touches the audio device.
let context = null;
let engineOsc = null;
let engineGain = null;
let muted = false;

/** Silence every sound; M toggles it in play. */
export function setMuted(value) {
  muted = value;
  if (muted && engineOsc) {
    try {
      engineOsc.stop();
    } catch {
      // Already stopped; nothing to silence.
    }
    engineOsc = null;
    engineGain = null;
  }
}

export function isMuted() {
  return muted;
}

export function ensureAudio() {
  try {
    if (!context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      context = new AudioContext();
    }
    if (context.state === 'suspended') void context.resume();
  } catch {
    context = null;
  }
}

function tone(frequency, duration, type, volume, when = 0) {
  if (!context || muted) return;
  try {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, context.currentTime + when);
    gain.gain.linearRampToValueAtTime(volume, context.currentTime + when + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + when + duration);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(context.currentTime + when);
    osc.stop(context.currentTime + when + duration + 0.05);
  } catch {
    // Sound is garnish; a failed beep never breaks the game.
  }
}

export function playRingChime() {
  tone(880, 0.18, 'sine', 0.12);
  tone(1318, 0.28, 'sine', 0.1, 0.07);
}

export function playClick() {
  tone(660, 0.07, 'square', 0.05);
}

export function playCrash() {
  tone(90, 0.5, 'sawtooth', 0.18);
  tone(55, 0.7, 'triangle', 0.15, 0.05);
}

export function playLand() {
  tone(523, 0.2, 'sine', 0.1);
  tone(784, 0.35, 'sine', 0.1, 0.12);
}

export function playWarning() {
  tone(440, 0.12, 'square', 0.06);
}

/** A low engine hum whose pitch follows the throttle. Call every frame. */
export function updateEngineHum(throttle, running) {
  if (!context || muted) {
    if (muted && engineOsc) {
      try {
        engineOsc.stop();
      } catch {
        // Already stopped.
      }
      engineOsc = null;
      engineGain = null;
    }
    return;
  }
  try {
    if (!running) {
      if (engineOsc) {
        engineOsc.stop();
        engineOsc = null;
        engineGain = null;
      }
      return;
    }
    if (!engineOsc) {
      engineOsc = context.createOscillator();
      engineGain = context.createGain();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain.gain.value = 0.0;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(context.destination);
      engineOsc.start();
    }
    engineOsc.frequency.setTargetAtTime(48 + throttle * 55, context.currentTime, 0.1);
    engineGain.gain.setTargetAtTime(0.015 + throttle * 0.02, context.currentTime, 0.1);
  } catch {
    // See above: sound never breaks the game.
  }
}
