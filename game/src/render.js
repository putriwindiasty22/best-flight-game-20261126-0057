// Scene composition: sky, clouds, ridges, terrain, rings, the Kestrel, then the
// instruments and the title / pause / end screens. One frame is one call.
import { PALETTE, VALLEY } from './config.js';
import { SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, hudState } from './world.js';
import { drawBanner, drawHud, drawToast } from './hud.js';
import { drawPlane } from './plane.js';
import { drawRings } from './rings.js';
import { buildValley, drawClouds, drawSky, drawTerrain, terrainHeight } from './terrain.js';

const PIXELS_PER_METRE = 0.9;

export function createRenderer() {
  return { valley: buildValley() };
}

export function render(ctx, width, height, state, time, renderer) {
  const plane = state.plane;
  const planeScreenX = width * 0.36;
  const cameraX = Math.max(-60, plane.x - planeScreenX / PIXELS_PER_METRE);
  // The ground line sits so the runway altitude reads at the same screen height
  // wherever the plane is: the horizon follows the plane's altitude.
  const groundY = height * 0.86 - (plane.altitude - VALLEY.runwayAltitude) * PIXELS_PER_METRE * 0.55;
  const planeScreenY = groundY - (plane.altitude - VALLEY.runwayAltitude) * PIXELS_PER_METRE;

  drawSky(ctx, width, height, time, cameraX);
  drawClouds(ctx, width, height, renderer.valley.clouds, cameraX, time, PIXELS_PER_METRE);
  drawTerrain(ctx, width, height, cameraX, PIXELS_PER_METRE, groundY, renderer.valley);
  drawRings(ctx, state.rings, cameraX, PIXELS_PER_METRE, groundY, time);
  drawPlane(ctx, planeScreenX, planeScreenY, plane, time);

  if (state.screen === SCREEN_PLAY || state.screen === SCREEN_PAUSED) {
    drawHud(ctx, width, height, hudState(state));
    drawToast(ctx, width, state.toast);
  }
  if (state.screen === SCREEN_TITLE) drawTitle(ctx, width, height, state);
  if (state.screen === SCREEN_PAUSED) {
    ctx.fillStyle = 'rgba(8, 18, 32, 0.45)';
    ctx.fillRect(0, 0, width, height);
    drawBanner(ctx, width, height, [
      { text: 'PAUSED', font: '700 44px system-ui, sans-serif' },
      { text: 'P or click to keep flying', font: '600 18px system-ui, sans-serif', gap: 34 },
    ]);
  }
  if (state.screen === SCREEN_OVER) drawOver(ctx, width, height, state);
}

function drawTitle(ctx, width, height, state) {
  ctx.fillStyle = 'rgba(8, 18, 32, 0.35)';
  ctx.fillRect(0, 0, width, height);
  drawBanner(ctx, width, height, [
    { text: 'EMBER VALLEY RUN', font: '800 54px system-ui, sans-serif', colour: '#fff3cf' },
    { text: 'Fly the Kestrel down the valley — eight rings, one runway, one tank of fuel.', font: '600 19px system-ui, sans-serif', gap: 40 },
    { text: '↑ ↓ pitch  ·  ← → bank  ·  SHIFT throttle  ·  SPACE airbrake  ·  mouse steers too', font: '600 16px system-ui, sans-serif', colour: PALETTE.hudDim, gap: 30 },
    { text: 'Land slow and gentle on the runway after the last ring.', font: '600 16px system-ui, sans-serif', colour: PALETTE.hudDim, gap: 30 },
  ]);
  const blink = Math.sin(performance.now() / 350) > 0;
  if (blink) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.fillText('PRESS ENTER OR CLICK TO FLY', width / 2, height * 0.62);
  }
  drawHud(ctx, width, height, hudState(state));
}

function drawOver(ctx, width, height, state) {
  const result = state.result;
  const landed = result.kind === 'landed';
  const early = result.kind === 'landed-early';
  ctx.fillStyle = 'rgba(8, 18, 32, 0.5)';
  ctx.fillRect(0, 0, width, height);
  const title = landed ? 'MISSION COMPLETE' : early ? 'LANDED EARLY' : 'CRASHED';
  const colour = landed ? '#7be382' : early ? '#ffc233' : '#ff5a3c';
  const lines = [
    { text: title, font: '800 48px system-ui, sans-serif', colour },
    { text: result.detail, font: '600 18px system-ui, sans-serif', gap: 40 },
    {
      text: `Rings ${result.rings} / 8   ·   Time ${Math.round(result.time)} s   ·   Score ${result.score}`,
      font: '700 20px system-ui, sans-serif',
      gap: 34,
    },
  ];
  if (landed) {
    lines.push({
      text: `Landing bonus ${result.bonus}  (wheels-down ${500} + fuel ${result.fuelBonus} + time ${result.timeBonus})`,
      font: '600 16px system-ui, sans-serif',
      colour: PALETTE.hudDim,
      gap: 30,
    });
  }
  lines.push({
    text: 'Press R or click to fly again',
    font: '700 20px system-ui, sans-serif',
    colour: '#ffffff',
    gap: 44,
  });
  drawBanner(ctx, width, height, lines);
  drawHud(ctx, width, height, hudState(state));
}
