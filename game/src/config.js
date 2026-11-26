// Ember Valley Run — a ridge-runner flight game. Tunable numbers live here and
// nowhere else, so balancing the flight model is a one-file change.
export const VIEW = { width: 1280, height: 720 };

export const VALLEY = {
  lengthMetres: 12000,
  runwayStart: 11100,
  runwayEnd: 12000,
  runwayAltitude: 42,
  startAltitude: 150,
  startSpeed: 48,
};

export const PLANE = {
  // Speeds are metres per second; the HUD shows knots.
  minSpeed: 22,
  maxSpeed: 88,
  cruiseThrottle: 0.68,
  climbRate: 9.5,
  sinkRate: 7.0,
  dragOnTurn: 6,
  brakeStrength: 26,
  landingSpeed: 30,
  flareAltitude: 14,
};

export const FUEL = {
  start: 100,
  drainPerSecond: 0.16,
  drainPerThrottle: 0.22,
  ringBonus: 4,
};

export const RING_COURSE = [
  { x: 1500, altitude: 210 },
  { x: 2800, altitude: 260 },
  { x: 4100, altitude: 180 },
  { x: 5400, altitude: 300 },
  { x: 6600, altitude: 220 },
  { x: 7900, altitude: 330 },
  { x: 9200, altitude: 240 },
  { x: 10400, altitude: 190 },
];
export const RING_RADIUS = 26;
export const RING_POINTS = 100;

export const SCORE = {
  landingBonus: 500,
  fuelBonusPerPercent: 4,
  timeBonusPerSecond: 2,
};

export const PALETTE = {
  skyTop: '#2f6fb4',
  skyMid: '#7db3dd',
  skyLow: '#d9e9f2',
  sun: '#ffd97a',
  farRidge: '#8fa8c8',
  nearRidge: '#5d7d9e',
  hill: '#4f7a4a',
  hillDark: '#3c5f39',
  pine: '#2c5230',
  river: '#4f9fd8',
  townRoof: '#b0563a',
  townWall: '#e8dcc3',
  runway: '#3a3f46',
  runwayLine: '#f5f0dc',
  planeBody: '#e8543f',
  planeWing: '#f2f0e8',
  planeTrim: '#26324a',
  ring: '#ffc233',
  ringGlow: 'rgba(255, 194, 51, 0.35)',
  hud: '#eaf6ff',
  hudDim: 'rgba(234, 246, 255, 0.65)',
  hudPanel: 'rgba(10, 26, 44, 0.55)',
  warn: '#ff5a3c',
  good: '#7be382',
};
