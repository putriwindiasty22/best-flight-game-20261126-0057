// The Kestrel: a small single-prop valley runner. This file owns the flight
// model (throttle, pitch, bank, speed, fuel) and the drawing of the aircraft.
import { FUEL, PALETTE, PLANE, VALLEY } from './config.js';
import { clamp, wrapAngle } from './random.js';
import { terrainHeight } from './terrain.js';

export function createPlane() {
  return {
    x: 0,
    altitude: VALLEY.startAltitude,
    speed: VALLEY.startSpeed,
    pitch: 0,
    bank: 0,
    heading: 90,
    throttle: PLANE.cruiseThrottle,
    fuel: FUEL.start,
    propAngle: 0,
    verticalSpeed: 0,
  };
}

/**
 * One fixed step of the flight model. `steer` is { pitch: -1..1, bank: -1..1,
 * throttle: -1..1, brake: boolean } where pitch +1 climbs and bank +1 turns right.
 */
export function stepPlane(plane, steer, dt) {
  const targetSpeed = PLANE.minSpeed + plane.throttle * (PLANE.maxSpeed - PLANE.minSpeed);
  plane.speed += (targetSpeed - plane.speed) * (1 - Math.exp(-dt * 0.55));
  if (steer.brake) plane.speed = Math.max(PLANE.minSpeed, plane.speed - PLANE.brakeStrength * dt);
  if (Math.abs(steer.bank) > 0.05) {
    plane.speed = Math.max(PLANE.minSpeed, plane.speed - PLANE.dragOnTurn * dt * Math.abs(steer.bank));
  }

  plane.pitch = clamp(plane.pitch + steer.pitch * 34 * dt, -38, 34);
  plane.pitch += (0 - plane.pitch) * (1 - Math.exp(-dt * 1.4)) * 0.35;
  plane.bank = clamp(plane.bank + steer.bank * 60 * dt, -52, 52);
  plane.bank += (0 - plane.bank) * (1 - Math.exp(-dt * 1.6));
  // Banking turns the aircraft: full bank swings the heading about 14°/s.
  plane.heading = wrapAngle(plane.heading + (plane.bank / 52) * 14 * dt);

  const climb = Math.sin((plane.pitch * Math.PI) / 180) * plane.speed;
  const lift = plane.speed >= PLANE.minSpeed + 4 ? 1 : plane.speed / (PLANE.minSpeed + 4);
  plane.verticalSpeed = clamp(climb * lift - (1 - lift) * PLANE.sinkRate, -PLANE.sinkRate * 1.6, PLANE.climbRate);
  plane.altitude = Math.max(0, plane.altitude + plane.verticalSpeed * dt);
  plane.x += plane.speed * dt;
  plane.propAngle += dt * (6 + plane.throttle * 26);

  if (plane.fuel > 0) {
    plane.fuel = Math.max(
      0,
      plane.fuel - (FUEL.drainPerSecond + FUEL.drainPerThrottle * plane.throttle) * dt,
    );
    if (plane.fuel <= 0) plane.throttle = 0;
  }
}

export function altitudeAgl(plane) {
  return plane.altitude - terrainHeight(plane.x);
}

export function overRunway(plane) {
  return plane.x >= VALLEY.runwayStart && plane.x <= VALLEY.runwayEnd;
}

export function drawPlane(ctx, px, py, plane, time) {
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate((-plane.bank * Math.PI) / 180 * 0.28);
  ctx.rotate((-plane.pitch * Math.PI) / 180 * 0.35);
  // Far wing.
  ctx.fillStyle = PALETTE.planeWing;
  ctx.beginPath();
  ctx.moveTo(-6, 2);
  ctx.lineTo(16, 16);
  ctx.lineTo(26, 12);
  ctx.lineTo(6, -4);
  ctx.closePath();
  ctx.fill();
  // Tail.
  ctx.fillStyle = PALETTE.planeTrim;
  ctx.beginPath();
  ctx.moveTo(-34, -2);
  ctx.lineTo(-50, -16);
  ctx.lineTo(-44, -2);
  ctx.lineTo(-50, 6);
  ctx.lineTo(-34, 4);
  ctx.closePath();
  ctx.fill();
  // Fuselage.
  const body = ctx.createLinearGradient(0, -12, 0, 10);
  body.addColorStop(0, '#f0705c');
  body.addColorStop(0.55, PALETTE.planeBody);
  body.addColorStop(1, '#b23a28');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(44, 0);
  ctx.quadraticCurveTo(30, -11, 2, -11);
  ctx.quadraticCurveTo(-30, -11, -40, -2);
  ctx.quadraticCurveTo(-42, 4, -30, 7);
  ctx.quadraticCurveTo(0, 10, 28, 7);
  ctx.quadraticCurveTo(40, 5, 44, 0);
  ctx.closePath();
  ctx.fill();
  // Canopy, lit from inside.
  ctx.fillStyle = '#bfe6ff';
  ctx.beginPath();
  ctx.moveTo(20, -9);
  ctx.quadraticCurveTo(26, -16, 12, -16);
  ctx.quadraticCurveTo(2, -16, 0, -9);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(10, -15);
  ctx.lineTo(14, -9);
  ctx.stroke();
  // Near wing.
  ctx.fillStyle = '#f7f4ea';
  ctx.beginPath();
  ctx.moveTo(-2, 4);
  ctx.lineTo(18, 22);
  ctx.lineTo(30, 18);
  ctx.lineTo(10, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = PALETTE.planeTrim;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Spinning propeller.
  const prop = plane.propAngle;
  ctx.strokeStyle = 'rgba(38, 50, 74, 0.85)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(44 + Math.cos(prop) * 20, Math.sin(prop) * 20);
  ctx.lineTo(44 - Math.cos(prop) * 20, -Math.sin(prop) * 20);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(44, 0, 20, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(38, 50, 74, 0.18)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#26324a';
  ctx.beginPath();
  ctx.arc(44, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();
  // Navigation lights: red on the left wingtip, green on the right.
  const blink = Math.sin(time * 5) > 0;
  if (blink) {
    ctx.fillStyle = '#ff3b30';
    ctx.beginPath();
    ctx.arc(-46, -8, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#39d353';
    ctx.beginPath();
    ctx.arc(28, 18, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
