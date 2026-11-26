// Seeded randomness: the valley, clouds, trees and towns are the same every run
// for a given seed, so screenshots and replays are reproducible.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth 1-D value noise from a seeded table, for ridges and hills. */
export function makeNoise(seed) {
  const rand = mulberry32(seed);
  const table = new Float64Array(256);
  for (let i = 0; i < 256; i += 1) table[i] = rand() * 2 - 1;
  const fade = (t) => t * t * (3 - 2 * t);
  return function noise(x) {
    const xi = Math.floor(x);
    const xf = x - xi;
    const a = table[((xi % 256) + 256) % 256];
    const b = table[(((xi + 1) % 256) + 256) % 256];
    return a + (b - a) * fade(xf);
  };
}

export function clamp(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Smoothstep easing, for blending terrain shelves into the valley floor. */
export function smoothstep(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

export function wrapAngle(degrees) {
  let d = degrees % 360;
  if (d < 0) d += 360;
  return d;
}
