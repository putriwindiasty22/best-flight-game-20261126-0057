// Ember Valley Run — entrypoint for the best-flight-game-20261126-0057 competition.
//
// The game itself lives in game/ next to this file: a browser-playable flight
// game called Ember Valley Run. You pilot the Kestrel, a small prop plane, along
// a valley course — thread it through 8 glowing sky rings, keep an eye on speed
// and altitude, then bring it down gently onto the runway for a scored landing.
// Everything runs offline from static files (game/index.html plus its modules),
// so no network or server is needed to play it.
//
// What this script does, step by step:
//   1. Sanity-check the payload: game/index.html must exist, and screenshots/
//      must hold between 1 and 4 images (the first by name becomes the cover).
//   2. Copy game/ and screenshots/ into the output directory
//      (/output inside the grader, or $MAKEFUN_OUTPUT_DIR when testing locally).
//   3. Write dossier.json there via the vendored make.fun helper, which applies
//      the scorer's caps and assembles the summary the judge reads.
//
// Run it locally with:
//   MAKEFUN_OUTPUT_DIR=/tmp/flight-out2 node main.ts
// and serve the game for a quick look with `node serve.ts` (http://localhost:8080).

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Scorer caps for this competition, matching reference/gate.json. The text cap
// trims the dossier bytes; the rest are hard refusals (too many or too large
// screenshots, too many or too large game files, or an over-long game path).
const DOSSIER_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

const MAX_SCREENSHOTS = DOSSIER_LIMITS.screenshots.max;

// Walk a directory tree and tally every file plus its bytes, so the run
// summary reports the real size of the game payload instead of a top-level guess.
function tallyTree(dir: string): { files: number; bytes: number } {
  let files = 0;
  let bytes = 0;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const info = statSync(full);
    if (info.isDirectory()) {
      const sub = tallyTree(full);
      files += sub.files;
      bytes += sub.bytes;
    } else {
      files += 1;
      bytes += info.size;
    }
  }
  return { files, bytes };
}

function fail(message: string): never {
  throw new Error(`Ember Valley Run entrypoint: ${message}`);
}

// Folder this file lives in, and where the finished bundle goes.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// --- Checks before anything is copied ---------------------------------------

const gameEntry = join(repoRoot, 'game', 'index.html');
if (!existsSync(gameEntry)) {
  fail('game/index.html is missing — the game cannot be handed in without it.');
}

const shotsDir = join(repoRoot, 'screenshots');
let shotNames: string[] = [];
if (existsSync(shotsDir)) {
  shotNames = readdirSync(shotsDir).filter((name) =>
    statSync(join(shotsDir, name)).isFile(),
  );
}
if (shotNames.length === 0) {
  fail('screenshots/ is empty — add at least one PNG or JPEG of the game.');
}
if (shotNames.length > MAX_SCREENSHOTS) {
  fail(
    `found ${shotNames.length} screenshots but the scorer allows at most ${MAX_SCREENSHOTS} — remove the extras.`,
  );
}

// --- Copy the payload ---------------------------------------------------------

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });

const outShotsDir = join(outputDir, 'screenshots');
mkdirSync(outShotsDir, { recursive: true });
cpSync(shotsDir, outShotsDir, { recursive: true });

// --- Dossier ------------------------------------------------------------------

const dossierText = buildDossier(outputDir, DOSSIER_LIMITS);
writeFileSync(join(outputDir, 'dossier.json'), dossierText);

// --- Short summary so a run's result is visible at a glance ------------------

const gameTotals = tallyTree(join(outputDir, 'game'));
const shotTotals = tallyTree(outShotsDir);
console.log(
  `Ember Valley Run handed in: game/ has ${gameTotals.files} file(s) ` +
    `(${gameTotals.bytes} bytes), ${shotNames.length} screenshot(s) ` +
    `(${shotTotals.bytes} bytes, cover is ${shotNames[0]}), ` +
    `dossier.json written (${dossierText.length} bytes) to ${outputDir}.`,
);
