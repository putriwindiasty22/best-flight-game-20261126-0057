// Game state: title, flying, paused, landed and crashed. This file owns the
// rules — rings, fuel, landing, crashing and scoring — and the per-frame update.
import { FUEL, PLANE, RING_POINTS, SCORE, VALLEY } from './config.js';
import { isHeld, wasPressed } from './input.js';
import { altitudeAgl, createPlane, overRunway, stepPlane } from './plane.js';
import { checkRings, createRings, nextRing, ringsCleared, stepRings } from './rings.js';
import { playCrash, playLand, playRingChime, playWarning, setMuted, updateEngineHum } from './sound.js';
import { terrainHeight } from './terrain.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

export function createState() {
  const plane = createPlane();
  const rings = createRings();
  return {
    screen: SCREEN_TITLE,
    plane,
    rings,
    ringsTotal: rings.length,
    ringsCleared: 0,
    score: 0,
    time: 0,
    result: null,
    toast: null,
    lowFuelWarned: false,
    pullUpWarnedAt: -10,
    startedAt: 0,
    muted: false,
  };
}

function showToast(state, text, colour) {
  state.toast = { text, colour, timeLeft: 2.2 };
}

function finishRun(state, kind, detail) {
  state.screen = SCREEN_OVER;
  const plane = state.plane;
  const fuelBonus = Math.round(plane.fuel) * SCORE.fuelBonusPerPercent;
  const timeBonus = Math.max(0, Math.round(360 - state.time)) * SCORE.timeBonusPerSecond;
  let bonus = 0;
  if (kind === 'landed') {
    bonus = SCORE.landingBonus + fuelBonus + timeBonus;
    playLand();
  } else {
    playCrash();
  }
  state.score += bonus;
  state.result = {
    kind,
    detail,
    bonus,
    fuelBonus,
    timeBonus,
    rings: state.ringsCleared,
    time: state.time,
    score: state.score,
  };
}

export function restart(state) {
  const wasMuted = state.muted;
  const fresh = createState();
  fresh.screen = SCREEN_PLAY;
  fresh.startedAt = state.time;
  fresh.muted = wasMuted;
  Object.assign(state, fresh);
}

export function update(state, input, dt) {
  if (state.toast) state.toast.timeLeft -= dt;
  if (state.screen === SCREEN_TITLE) {
    if (wasPressed(input, 'start') || input.clicked) {
      state.screen = SCREEN_PLAY;
      playRingChime();
    }
    return;
  }
  if (state.screen === SCREEN_OVER) {
    if (wasPressed(input, 'restart') || input.clicked) restart(state);
    return;
  }
  if (state.screen === SCREEN_PAUSED) {
    if (wasPressed(input, 'pause') || input.clicked) state.screen = SCREEN_PLAY;
    return;
  }

  // Flying.
  if (wasPressed(input, 'pause')) {
    state.screen = SCREEN_PAUSED;
    return;
  }
  if (wasPressed(input, 'mute')) {
    state.muted = !state.muted;
    setMuted(state.muted);
    showToast(state, state.muted ? 'SOUND OFF' : 'SOUND ON', '#eaf6ff');
  }
  state.time += dt;
  const plane = state.plane;

  // Steering: keys win; the mouse steers when it has moved and no key is held.
  let pitchInput = 0;
  let bankInput = 0;
  if (isHeld(input, 'pitchUp')) pitchInput += 1;
  if (isHeld(input, 'pitchDown')) pitchInput -= 1;
  if (isHeld(input, 'bankLeft')) bankInput -= 1;
  if (isHeld(input, 'bankRight')) bankInput += 1;
  if (pitchInput === 0 && bankInput === 0 && input.mouseActive) {
    pitchInput = (0.5 - input.mouseY) * 2.4;
    bankInput = (input.mouseX - 0.5) * 2.2;
  }
  if (isHeld(input, 'throttleUp')) plane.throttle = Math.min(1, plane.throttle + dt * 0.5);
  if (isHeld(input, 'throttleDown')) plane.throttle = Math.max(0, plane.throttle - dt * 0.6);

  const previousX = plane.x;
  stepPlane(plane, { pitch: pitchInput, bank: bankInput, throttle: 0, brake: isHeld(input, 'brake') }, dt);
  stepRings(state.rings, dt);

  const flown = checkRings(state.rings, plane, previousX);
  if (flown) {
    state.ringsCleared = ringsCleared(state.rings);
    state.score += RING_POINTS;
    plane.fuel = Math.min(100, plane.fuel + FUEL.ringBonus);
    showToast(state, `RING ${flown.index + 1} — +${RING_POINTS} PTS  ·  FUEL +${FUEL.ringBonus}%`, '#7be382');
    playRingChime();
  }

  const agl = altitudeAgl(plane);
  if (agl < 45 && plane.verticalSpeed < -2 && state.time - state.pullUpWarnedAt > 3) {
    state.pullUpWarnedAt = state.time;
    showToast(state, 'PULL UP — TERRAIN', '#ff5a3c');
    playWarning();
  }
  if (plane.fuel < 25 && !state.lowFuelWarned) {
    state.lowFuelWarned = true;
    showToast(state, 'LOW FUEL — FLY THE RUNWAY', '#ff5a3c');
    playWarning();
  }

  // Landing: slow, gentle and over the runway strip.
  if (overRunway(plane) && agl <= 2) {
    if (plane.speed <= PLANE.landingSpeed + 8 && plane.verticalSpeed >= -4.5) {
      if (state.ringsCleared === state.ringsTotal) {
        finishRun(state, 'landed', 'All eight rings flown, wheels down on the Ember Valley strip.');
      } else {
        finishRun(state, 'landed-early', `Landed early with ${state.ringsCleared} of ${state.ringsTotal} rings — the valley still waits.`);
      }
      return;
    }
    finishRun(state, 'crashed', 'Too fast, too hard — the Kestrel came down on the runway and broke up.');
    return;
  }
  // Terrain strike anywhere else.
  if (agl <= 0) {
    finishRun(state, 'crashed', `Terrain strike at ${Math.round(plane.x)} m down the valley.`);
    return;
  }
  // Ran out of valley without landing.
  if (plane.x >= VALLEY.runwayEnd) {
    finishRun(state, 'crashed', 'Overshot the runway and ran out of valley.');
  }
  updateEngineHum(plane.throttle, state.screen === SCREEN_PLAY);
}

export function hudState(state) {
  return {
    plane: state.plane,
    ringsCleared: state.ringsCleared,
    ringsTotal: state.ringsTotal,
    score: state.score,
    screen: state.screen,
    nextRing: nextRing(state.rings),
  };
}
