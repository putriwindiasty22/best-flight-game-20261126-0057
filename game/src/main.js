// Ember Valley Run — bootstrap. Sizes the canvas to the window, runs the fixed
// step loop, and renders one deterministic frame when ?shot=start|play|end is
// given (the screenshot scenes in shots.js).
import { VIEW } from './config.js';
import { attachInput, createInput, endFrame } from './input.js';
import { createRenderer, render } from './render.js';
import { shotState } from './shots.js';
import { createState, update } from './world.js';
import { ensureAudio } from './sound.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') ?? '1') || 1;

function resize() {
  const scale = Math.min(window.innerWidth / VIEW.width, window.innerHeight / VIEW.height);
  canvas.width = Math.round(VIEW.width * scale);
  canvas.height = Math.round(VIEW.height * scale);
  canvas.style.width = `${canvas.width}px`;
  canvas.style.height = `${canvas.height}px`;
}

function announce(state) {
  const plane = state.plane;
  const agl = Math.max(0, Math.round(plane.altitude - 42));
  status.textContent = state.screen === 'play'
    ? `Flying. Altitude ${Math.round(plane.altitude * 3.28)} feet, speed ${Math.round(plane.speed * 1.94)} knots, heading ${Math.round(plane.heading)}, rings ${state.ringsCleared} of ${state.ringsTotal}, score ${state.score}.`
    : state.screen === 'over' && state.result
      ? `${state.result.kind === 'landed' ? 'Mission complete' : state.result.kind === 'landed-early' ? 'Landed early' : 'Crashed'}. ${state.result.detail} Score ${state.score}.`
      : 'Ember Valley Run. Press Enter or click to fly.';
  void agl;
}

if (shot) {
  // Screenshot mode: one deterministic frame, no animation loop.
  resize();
  const state = shotState(shot, seed);
  const renderer = createRenderer();
  const time = shot === 'start' ? 1.2 : shot === 'play' ? 97 : 240;
  ctx.save();
  ctx.scale(canvas.width / VIEW.width, canvas.height / VIEW.height);
  render(ctx, VIEW.width, VIEW.height, state, time, renderer);
  ctx.restore();
  announce(state);
  document.title = `Ember Valley Run — ${shot}`;
} else {
  const input = createInput();
  attachInput(input, canvas);
  const state = createState();
  const renderer = createRenderer();
  let last = performance.now();
  let accumulator = 0;
  const STEP = 1 / 60;
  let announcedAt = 0;

  window.addEventListener('pointerdown', ensureAudio, { once: true });
  window.addEventListener('keydown', ensureAudio, { once: true });

  function frame(now) {
    const elapsed = Math.min(0.1, (now - last) / 1000);
    last = now;
    accumulator += elapsed;
    while (accumulator >= STEP) {
      update(state, input, STEP);
      endFrame(input);
      accumulator -= STEP;
    }
    resize();
    ctx.save();
    ctx.scale(canvas.width / VIEW.width, canvas.height / VIEW.height);
    render(ctx, VIEW.width, VIEW.height, state, now / 1000, renderer);
    ctx.restore();
    if (now - announcedAt > 2000) {
      announcedAt = now;
      announce(state);
    }
    requestAnimationFrame(frame);
  }
  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(frame);
}
