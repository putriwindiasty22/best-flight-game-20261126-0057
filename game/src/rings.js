// The ring course: eight glowing sky rings down the valley, then the runway.
// A ring is flown when the Kestrel passes its x with its altitude inside the ring.
import { PALETTE, RING_COURSE, RING_RADIUS } from './config.js';

export function createRings() {
  return RING_COURSE.map((ring, index) => ({
    ...ring,
    index,
    radius: RING_RADIUS,
    passed: false,
    missed: false,
    flash: 0,
  }));
}

export function nextRing(rings) {
  return rings.find((ring) => !ring.passed && !ring.missed) ?? null;
}

export function ringsCleared(rings) {
  return rings.filter((ring) => ring.passed).length;
}

/** Score a ring as the plane crosses its x; returns the ring flown, if any. */
export function checkRings(rings, plane, previousX) {
  for (const ring of rings) {
    if (ring.passed || ring.missed) continue;
    if (previousX < ring.x && plane.x >= ring.x) {
      if (Math.abs(plane.altitude - ring.altitude) <= ring.radius) {
        ring.passed = true;
        ring.flash = 1;
        return ring;
      }
      ring.missed = true;
    }
  }
  return null;
}

export function stepRings(rings, dt) {
  for (const ring of rings) {
    if (ring.flash > 0) ring.flash = Math.max(0, ring.flash - dt * 1.6);
  }
}

export function drawRings(ctx, rings, cameraX, pixelsPerMetre, groundY, time) {
  const target = nextRing(rings);
  for (const ring of rings) {
    const px = (ring.x - cameraX) * pixelsPerMetre;
    if (px < -140 || px > 1420) continue;
    const py = groundY - (ring.altitude - 42) * pixelsPerMetre;
    const radius = ring.radius * pixelsPerMetre;
    const isTarget = target === ring;
    ctx.save();
    ctx.translate(px, py);
    // A ring seen at a slant reads as an ellipse.
    ctx.scale(0.42, 1);
    const pulse = isTarget ? 0.75 + 0.25 * Math.sin(time * 4) : 0.55;
    ctx.lineWidth = isTarget ? 7 : 5;
    ctx.strokeStyle = ring.passed
      ? 'rgba(123, 227, 130, 0.9)'
      : ring.missed
        ? 'rgba(120, 130, 140, 0.55)'
        : `rgba(255, 194, 51, ${pulse})`;
    ctx.shadowColor = ring.passed ? 'rgba(123, 227, 130, 0.8)' : 'rgba(255, 194, 51, 0.8)';
    ctx.shadowBlur = isTarget ? 26 : 12;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(0, 0, radius - 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    if (isTarget) {
      ctx.fillStyle = '#fff3cf';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`RING ${ring.index + 1} / ${rings.length}`, px, py - radius - 14);
      // A chevron pointing the way to the next ring.
      const bob = Math.sin(time * 4) * 5;
      ctx.fillStyle = 'rgba(255, 194, 51, 0.9)';
      ctx.beginPath();
      ctx.moveTo(px + 66 + bob, py - 8);
      ctx.lineTo(px + 82 + bob, py);
      ctx.lineTo(px + 66 + bob, py + 8);
      ctx.closePath();
      ctx.fill();
    }
    if (ring.flash > 0) {
      ctx.fillStyle = `rgba(123, 227, 130, ${ring.flash * 0.5})`;
      ctx.beginPath();
      ctx.arc(px, py, radius * (1.6 - ring.flash * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
