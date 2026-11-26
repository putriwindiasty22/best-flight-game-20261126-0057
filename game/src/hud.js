// The cockpit instruments: altitude, speed, heading, fuel, the compass strip,
// the artificial horizon and the throttle lever — all drawn, lit, and live.
import { PALETTE, VALLEY } from './config.js';
import { clamp } from './random.js';

const KNOTS = 1.94384;
const FEET = 3.28084;

export function formatHeading(heading) {
  return String(Math.round(heading)).padStart(3, '0');
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.hudPanel;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(234, 246, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function readout(ctx, x, y, label, value, unit, accent) {
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillText(label, x, y);
  ctx.fillStyle = accent ?? PALETTE.hud;
  ctx.font = '700 26px system-ui, sans-serif';
  ctx.fillText(value, x, y + 28);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '600 11px system-ui, sans-serif';
  const valueWidth = ctx.measureText(value).width;
  ctx.fillText(unit, x + valueWidth + 6, y + 28);
}

export function drawCompass(ctx, width, heading) {
  const cy = 30;
  ctx.fillStyle = PALETTE.hudPanel;
  ctx.fillRect(0, 0, width, 52);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, 52);
  ctx.clip();
  const centre = width / 2;
  const pxPerDegree = 3.2;
  for (let d = -60; d <= 60; d += 5) {
    const hdg = (Math.round(heading) + d + 360) % 360;
    const x = centre + d * pxPerDegree;
    const major = hdg % 30 === 0;
    ctx.strokeStyle = major ? PALETTE.hud : 'rgba(234, 246, 255, 0.4)';
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, major ? 16 : 22);
    ctx.lineTo(x, 30);
    ctx.stroke();
    if (major) {
      ctx.fillStyle = PALETTE.hud;
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      const label = hdg === 0 ? 'N' : hdg === 90 ? 'E' : hdg === 180 ? 'S' : hdg === 270 ? 'W' : String(hdg).padStart(3, '0');
      ctx.fillText(label, x, 44);
    }
  }
  ctx.restore();
  // Fixed lubber line and the live heading readout.
  ctx.fillStyle = PALETTE.ring;
  ctx.beginPath();
  ctx.moveTo(centre - 6, 4);
  ctx.lineTo(centre + 6, 4);
  ctx.lineTo(centre, 13);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.hud;
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(formatHeading(heading) + '°', centre, 64);
}

export function drawHud(ctx, width, height, state) {
  const plane = state.plane;
  drawCompass(ctx, width, plane.heading);

  panel(ctx, 16, 72, 300, 66);
  readout(ctx, 30, 92, 'ALTITUDE', String(Math.round(plane.altitude * FEET)), 'FT');
  readout(ctx, 128, 92, 'AIRSPEED', String(Math.round(plane.speed * KNOTS)), 'KT');
  readout(ctx, 226, 92, 'HEADING', formatHeading(plane.heading), '°');

  // Fuel, rings and score, top right.
  panel(ctx, width - 316, 72, 300, 88);
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillText('FUEL', width - 302, 92);
  const fuelW = 150;
  const fuelLow = plane.fuel < 25;
  ctx.fillStyle = 'rgba(234, 246, 255, 0.2)';
  ctx.beginPath();
  ctx.roundRect(width - 302, 100, fuelW, 12, 6);
  ctx.fill();
  ctx.fillStyle = fuelLow ? PALETTE.warn : plane.fuel < 50 ? PALETTE.ring : PALETTE.good;
  ctx.beginPath();
  ctx.roundRect(width - 302, 100, fuelW * clamp(plane.fuel / 100, 0, 1), 12, 6);
  ctx.fill();
  ctx.fillStyle = PALETTE.hud;
  ctx.font = '700 15px system-ui, sans-serif';
  ctx.fillText(`${Math.round(plane.fuel)}%`, width - 144, 112);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillText('RINGS', width - 302, 132);
  ctx.fillStyle = PALETTE.hud;
  ctx.font = '700 15px system-ui, sans-serif';
  ctx.fillText(`${state.ringsCleared} / ${state.ringsTotal}`, width - 252, 132);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillText('SCORE', width - 178, 132);
  ctx.fillStyle = PALETTE.hud;
  ctx.font = '700 15px system-ui, sans-serif';
  ctx.fillText(String(state.score), width - 122, 132);
  // How far to the next ring (or the runway, once the rings are done).
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '600 11px system-ui, sans-serif';
  const target = state.nextRing;
  const targetText = target
    ? `NEXT RING ${Math.max(0, Math.round(target.x - state.plane.x))} m`
    : `RUNWAY ${Math.max(0, Math.round(VALLEY.runwayStart - state.plane.x))} m`;
  ctx.fillText(targetText, width - 302, 154);

  drawHorizon(ctx, 86, height - 86, 62, plane);
  drawThrottle(ctx, width - 66, height - 150, 96, plane);

  // Distance to the runway, once the rings are done.
  if (state.ringsCleared === state.ringsTotal && state.screen === 'play') {
    const remaining = Math.max(0, VALLEY.runwayStart - plane.x);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.hud;
    ctx.font = '700 16px system-ui, sans-serif';
    ctx.fillText(`RUNWAY ${Math.round(remaining)} m — SLOW DOWN AND LAND`, width / 2, height - 24);
  }
}

function drawHorizon(ctx, cx, cy, radius, plane) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = PALETTE.hudPanel;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.rotate((-plane.bank * Math.PI) / 180);
  const pitchOffset = clamp(plane.pitch * 1.6, -radius, radius);
  ctx.fillStyle = '#3f7fc1';
  ctx.fillRect(-radius, -radius + pitchOffset - radius, radius * 2, radius * 2);
  ctx.fillStyle = '#7a5a34';
  ctx.fillRect(-radius, pitchOffset, radius * 2, radius * 2);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-radius, pitchOffset);
  ctx.lineTo(radius, pitchOffset);
  ctx.stroke();
  ctx.restore();
  // Fixed wings of the miniature aircraft.
  ctx.strokeStyle = PALETTE.ring;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.55, 0);
  ctx.lineTo(-radius * 0.15, 0);
  ctx.moveTo(radius * 0.15, 0);
  ctx.lineTo(radius * 0.55, 0);
  ctx.stroke();
  ctx.fillStyle = PALETTE.ring;
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '600 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ATTITUDE', 0, radius + 22);
  ctx.restore();
}

function drawThrottle(ctx, x, y, h, plane) {
  panel(ctx, x - 26, y - 14, 52, h + 44);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '600 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('THR', x, y - 2);
  const trackX = x;
  const trackTop = y + 8;
  const trackH = h - 16;
  ctx.fillStyle = 'rgba(234, 246, 255, 0.2)';
  ctx.fillRect(trackX - 3, trackTop, 6, trackH);
  const knobY = trackTop + trackH * (1 - plane.throttle);
  ctx.fillStyle = PALETTE.ring;
  ctx.beginPath();
  ctx.roundRect(trackX - 12, knobY - 7, 24, 14, 4);
  ctx.fill();
  ctx.fillStyle = PALETTE.hud;
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.fillText(`${Math.round(plane.throttle * 100)}%`, x, y + h + 16);
}

export function drawBanner(ctx, width, height, lines, accent) {
  ctx.textAlign = 'center';
  let y = height * 0.3;
  for (const line of lines) {
    ctx.fillStyle = line.colour ?? accent ?? PALETTE.hud;
    ctx.font = line.font ?? '700 34px system-ui, sans-serif';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 8;
    ctx.fillText(line.text, width / 2, y);
    ctx.shadowBlur = 0;
    y += line.gap ?? 46;
  }
}

export function drawToast(ctx, width, toast) {
  if (!toast || toast.timeLeft <= 0) return;
  const alpha = clamp(toast.timeLeft / 0.6, 0, 1);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.fillStyle = toast.colour ?? PALETTE.good;
  ctx.font = '700 26px system-ui, sans-serif';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 6;
  ctx.fillText(toast.text, width / 2, 176);
  ctx.restore();
}
