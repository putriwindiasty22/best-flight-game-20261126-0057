// Screenshot scenes behind ?shot=start|play|end. Each one plays the real rules
// forward from a fresh world for a fixed number of seconds, steered by a simple
// autopilot, so the frame is what a short game really looks like and the same
// seed always gives the same frame.
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, createState, update } from './world.js';
import { nextRing } from './rings.js';
import { overRunway } from './plane.js';
import { VALLEY } from './config.js';

const SAMPLE = 1 / 60;
const PLAY_SECONDS = 97;
const END_LIMIT_SECONDS = 600;

/**
 * The autopilot: pitch toward the next ring (or the runway, once the rings are
 * done), bank to hold heading 090, and manage the throttle — cruise out, idle
 * and flare for the landing.
 */
function autopilot(state) {
  const plane = state.plane;
  const input = {
    held: new Set(),
    pressed: new Set(),
    mouseX: 0.5,
    mouseY: 0.5,
    mouseActive: false,
    clicked: false,
  };
  const ring = nextRing(state.rings);
  let targetAltitude;
  let targetThrottle = 0.68;
  if (ring) {
    targetAltitude = ring.altitude;
  } else if (plane.x < VALLEY.runwayStart - 500) {
    targetAltitude = 170;
  } else {
    // Final approach: descend to the strip and bleed speed off.
    targetAltitude = VALLEY.runwayAltitude + 12;
    targetThrottle = plane.x > VALLEY.runwayStart - 250 ? 0.12 : 0.3;
  }
  const error = targetAltitude - plane.altitude;
  input.mouseY = 0.5 - Math.max(-1, Math.min(1, error / 60)) * 0.42;
  const headingError = ((90 - plane.heading + 540) % 360) - 180;
  input.mouseX = 0.5 + Math.max(-1, Math.min(1, headingError / 40)) * 0.3;
  input.mouseActive = true;
  // Throttle toward the target by faking held keys through the world's own path:
  // the world reads input.held, so set the matching codes directly.
  if (plane.throttle < targetThrottle - 0.03) input.held.add('ShiftLeft');
  if (plane.throttle > targetThrottle + 0.03) input.held.add('ControlLeft');
  if (!ring && plane.x > VALLEY.runwayStart - 350 && plane.speed > 34) input.held.add('Space');
  return input;
}

/** Step the world forward `seconds` under the autopilot, starting on the title screen. */
function flyFor(state, seconds) {
  let elapsed = 0;
  while (elapsed < seconds) {
    if (state.screen === SCREEN_TITLE) {
      const start = { held: new Set(), pressed: new Set(['Enter']), mouseX: 0.5, mouseY: 0.5, mouseActive: false, clicked: false };
      update(state, start, SAMPLE);
    } else if (state.screen === SCREEN_PLAY) {
      update(state, autopilot(state), SAMPLE);
    } else {
      break;
    }
    elapsed += SAMPLE;
  }
  return state;
}

/** Build the state for one named shot. Returns the state to render. */
export function shotState(name, seed) {
  const state = createState();
  if (name === 'start') {
    // Title screen over the valley, the Kestrel parked on the strip, instruments lit.
    state.screen = SCREEN_TITLE;
    state.plane.x = VALLEY.runwayStart + 120;
    state.plane.altitude = VALLEY.runwayAltitude + 2;
    state.plane.speed = 0;
    state.plane.throttle = 0.3;
    return state;
  }
  if (name === 'play') {
    flyFor(state, PLAY_SECONDS);
    return state;
  }
  // end: fly the whole course and land, however long it takes.
  let elapsed = 0;
  while (elapsed < END_LIMIT_SECONDS) {
    if (state.screen === SCREEN_TITLE) {
      const start = { held: new Set(), pressed: new Set(['Enter']), mouseX: 0.5, mouseY: 0.5, mouseActive: false, clicked: false };
      update(state, start, SAMPLE);
    } else if (state.screen === SCREEN_PLAY) {
      update(state, autopilot(state), SAMPLE);
    } else {
      break;
    }
    elapsed += SAMPLE;
  }
  return state;
}

export { SCREEN_OVER };
