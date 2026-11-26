// Ember Valley: the ground the Kestrel flies over. Terrain height is a fixed
// function of distance down the valley, so the same seed always builds the same
// ridges, river, pine forest, lakeside town and runway.
import { PALETTE, VALLEY } from './config.js';
import { clamp, lerp, makeNoise, mulberry32, smoothstep } from './random.js';

const NOISE = makeNoise(20261126);

export function terrainHeight(x) {
  // The runway strip itself is flat at the runway altitude, with a smooth
  // 400 m blend in from the valley floor before it.
  if (x >= VALLEY.runwayStart) return VALLEY.runwayAltitude;
  if (x > VALLEY.runwayStart - 400) {
    const t = (x - (VALLEY.runwayStart - 400)) / 400;
    return lerp(rawHeight(x), VALLEY.runwayAltitude, smoothstep(t));
  }
  // A flat shelf at the valley mouth, so the Kestrel never starts underground.
  if (x < 500) {
    const t = x / 500;
    return lerp(95, rawHeight(x), smoothstep(t));
  }
  return rawHeight(x);
}

function rawHeight(x) {
  const rolling = 95 + 70 * NOISE(x * 0.0011) + 42 * NOISE(x * 0.0031 + 40);
  // The river cuts a low channel through the middle of the valley.
  const river = 58 * Math.exp(-Math.pow((x - 5300) / 260, 2));
  // A flat shelf for the lakeside town before the runway.
  const town = x > 9600 && x < 10800 ? -38 * Math.sin(((x - 9600) / 1200) * Math.PI) : 0;
  return Math.max(28, rolling - river + town);
}

function makeScatter(seed, count, xMin, xMax, yOf) {
  const rand = mulberry32(seed);
  const items = [];
  for (let i = 0; i < count; i += 1) {
    const x = xMin + rand() * (xMax - xMin);
    items.push({ x, s: 0.6 + rand() * 0.9, y: yOf(x) });
  }
  return items;
}

export function buildValley() {
  const pines = makeScatter(77, 260, 0, VALLEY.runwayStart - 200, (x) => terrainHeight(x));
  const townHouses = makeScatter(913, 26, 9650, 10750, (x) => terrainHeight(x));
  const clouds = makeScatter(411, 26, -400, VALLEY.lengthMetres + 800, () => 0).map((c) => ({
    ...c,
    y: 430 + ((c.s * 997) % 130),
    drift: 2 + c.s * 4,
  }));
  return { pines, townHouses, clouds };
}

export function drawSky(ctx, width, height, time, cameraX) {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(0.55, PALETTE.skyMid);
  sky.addColorStop(1, PALETTE.skyLow);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
  // Low sun, fixed in the sky ahead of the plane.
  const sunX = width * 0.78;
  const sunY = height * 0.2;
  const glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 130);
  glow.addColorStop(0, 'rgba(255, 217, 122, 0.95)');
  glow.addColorStop(0.35, 'rgba(255, 217, 122, 0.35)');
  glow.addColorStop(1, 'rgba(255, 217, 122, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 140, sunY - 140, 280, 280);
  ctx.fillStyle = PALETTE.sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
  ctx.fill();
  // Two far ridge layers, parallaxed against the camera.
  drawRidge(ctx, width, height, cameraX * 0.08, 0.42, PALETTE.farRidge, 150, time);
  drawRidge(ctx, width, height, cameraX * 0.18, 0.55, PALETTE.nearRidge, 110, time + 60);
}

function drawRidge(ctx, width, height, offset, baseY, colour, amplitude, phase) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(0, height);
  for (let px = 0; px <= width; px += 16) {
    const worldX = px + offset + phase * 40;
    const y = height * baseY + Math.sin(worldX * 0.004) * amplitude * 0.4
      + Math.sin(worldX * 0.0013 + 2) * amplitude * 0.6;
    ctx.lineTo(px, y);
  }
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fill();
}

export function drawClouds(ctx, width, height, clouds, cameraX, time, pixelsPerMetre) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  for (const cloud of clouds) {
    const screenX = ((cloud.x - cameraX * 0.35 + time * cloud.drift) % (VALLEY.lengthMetres + 1600) + VALLEY.lengthMetres + 1600) % (VALLEY.lengthMetres + 1600);
    const px = (screenX / (VALLEY.lengthMetres + 1600)) * (width + 400) - 200;
    const py = height * 0.12 + (cloud.y - 430) * 0.5;
    const s = 26 * cloud.s;
    ctx.beginPath();
    ctx.ellipse(px, py, s * 1.7, s * 0.62, 0, 0, Math.PI * 2);
    ctx.ellipse(px - s, py + s * 0.18, s, s * 0.5, 0, 0, Math.PI * 2);
    ctx.ellipse(px + s, py + s * 0.18, s * 1.1, s * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawTerrain(ctx, width, height, cameraX, pixelsPerMetre, groundY, valley) {
  const step = 8;
  ctx.beginPath();
  ctx.moveTo(-4, height + 4);
  for (let px = -4; px <= width + 4; px += step) {
    const worldX = cameraX + (px / pixelsPerMetre);
    const y = groundY - (terrainHeight(worldX) - VALLEY.runwayAltitude) * pixelsPerMetre;
    ctx.lineTo(px, y);
  }
  ctx.lineTo(width + 4, height + 4);
  ctx.closePath();
  const ground = ctx.createLinearGradient(0, groundY - 260, 0, height);
  ground.addColorStop(0, PALETTE.hill);
  ground.addColorStop(1, PALETTE.hillDark);
  ctx.fillStyle = ground;
  ctx.fill();

  // The river: a bright band where the channel dips.
  const riverStart = 5300 - 260;
  const riverEnd = 5300 + 260;
  if (cameraX < riverEnd && cameraX + width / pixelsPerMetre > riverStart) {
    ctx.fillStyle = PALETTE.river;
    ctx.beginPath();
    for (let px = 0; px <= width; px += step) {
      const worldX = cameraX + px / pixelsPerMetre;
      const y = groundY - (terrainHeight(worldX) - VALLEY.runwayAltitude) * pixelsPerMetre;
      if (px === 0) ctx.moveTo(px, y);
      else ctx.lineTo(px, y);
    }
    for (let px = width; px >= 0; px -= step) {
      const worldX = cameraX + px / pixelsPerMetre;
      const y = groundY - (terrainHeight(worldX) - VALLEY.runwayAltitude) * pixelsPerMetre + 16;
      ctx.lineTo(px, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  drawPines(ctx, cameraX, pixelsPerMetre, groundY, valley.pines);
  drawTown(ctx, cameraX, pixelsPerMetre, groundY, valley.townHouses);
  drawRunway(ctx, cameraX, pixelsPerMetre, groundY, width);
}

function drawPines(ctx, cameraX, pixelsPerMetre, groundY, pines) {
  ctx.fillStyle = PALETTE.pine;
  for (const pine of pines) {
    const px = (pine.x - cameraX) * pixelsPerMetre;
    if (px < -30 || px > 1330) continue;
    const h = 26 * pine.s;
    const baseY = groundY - (pine.y - VALLEY.runwayAltitude) * pixelsPerMetre;
    ctx.beginPath();
    ctx.moveTo(px, baseY - h);
    ctx.lineTo(px - h * 0.32, baseY);
    ctx.lineTo(px + h * 0.32, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(px - 1.5, baseY - 2, 3, 4);
  }
}

function drawTown(ctx, cameraX, pixelsPerMetre, groundY, houses) {
  for (const house of houses) {
    const px = (house.x - cameraX) * pixelsPerMetre;
    if (px < -60 || px > 1340) continue;
    const w = 34 * house.s;
    const h = 22 * house.s;
    const baseY = groundY - (house.y - VALLEY.runwayAltitude) * pixelsPerMetre;
    ctx.fillStyle = PALETTE.townWall;
    ctx.fillRect(px - w / 2, baseY - h, w, h);
    ctx.fillStyle = PALETTE.townRoof;
    ctx.beginPath();
    ctx.moveTo(px - w / 2 - 3, baseY - h);
    ctx.lineTo(px, baseY - h - 11 * house.s);
    ctx.lineTo(px + w / 2 + 3, baseY - h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd97a';
    ctx.fillRect(px - w * 0.28, baseY - h * 0.62, 5, 6);
    ctx.fillRect(px + w * 0.12, baseY - h * 0.62, 5, 6);
  }
}

function drawRunway(ctx, cameraX, pixelsPerMetre, groundY, width) {
  const startPx = (VALLEY.runwayStart - cameraX) * pixelsPerMetre;
  const endPx = (VALLEY.runwayEnd - cameraX) * pixelsPerMetre;
  if (endPx < -40 || startPx > width + 40) return;
  const y = groundY;
  ctx.fillStyle = PALETTE.runway;
  ctx.fillRect(Math.max(0, startPx), y - 4, Math.min(width, endPx) - Math.max(0, startPx), 10);
  // Centreline dashes and threshold bars.
  ctx.fillStyle = PALETTE.runwayLine;
  for (let x = VALLEY.runwayStart + 60; x < VALLEY.runwayEnd - 40; x += 160) {
    const px = (x - cameraX) * pixelsPerMetre;
    if (px < 0 || px > width) continue;
    ctx.fillRect(px, y - 2, 46, 4);
  }
  // Edge lights, alternating white and amber.
  for (let x = VALLEY.runwayStart; x <= VALLEY.runwayEnd; x += 150) {
    const px = (x - cameraX) * pixelsPerMetre;
    if (px < 0 || px > width) continue;
    ctx.fillStyle = (Math.floor(x / 150) % 2 === 0) ? '#ffffff' : '#ffb13c';
    ctx.beginPath();
    ctx.arc(px, y - 8, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Windsock beside the threshold.
  const sockX = (VALLEY.runwayStart + 40 - cameraX) * pixelsPerMetre;
  if (sockX > 0 && sockX < width) {
    ctx.strokeStyle = '#d8d8d8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sockX, y - 4);
    ctx.lineTo(sockX, y - 42);
    ctx.stroke();
    ctx.fillStyle = '#ff7a3c';
    ctx.beginPath();
    ctx.moveTo(sockX, y - 42);
    ctx.lineTo(sockX + 26, y - 36);
    ctx.lineTo(sockX, y - 30);
    ctx.closePath();
    ctx.fill();
  }
}
