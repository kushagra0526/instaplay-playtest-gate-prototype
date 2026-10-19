// Headless playtest gate for single-file HTML5 games.
// node harness/playtest.js game.html [more.html ...]   -> JSON per game: checker findings + two baselines
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const puppeteer = require('puppeteer-core');

const SHIM = fs.readFileSync(path.join(__dirname, 'shim.js'), 'utf8');
const EDGE = process.env.BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter', 'r', 'a', 'd', 'w', 's'];

// a monkey player: first a "start" press at 200 ms, then random presses/taps with random hold times
function monkey(seed, ms, kinds) {
  const r = rng(seed), ev = [];
  const press = (t, kind, hold) => {
    if (kind === 'key') { const key = KEYS[Math.floor(r() * KEYS.length)]; ev.push({ t, kind, key, down: true }, { t: t + hold, kind, key, down: false }); }
    else { const x = [0.15, 0.5, 0.85][Math.floor(r() * 3)] + (r() - 0.5) * 0.1, y = 0.3 + r() * 0.5; ev.push({ t, kind, x, y, down: true }, { t: t + hold, kind, x, y, down: false }); }
  };
  for (const k of kinds) ev.push(k === 'key' ? { t: 200, kind: 'key', key: ' ', down: true } : { t: 200, kind: 'tap', x: 0.5, y: 0.5, down: true },
    k === 'key' ? { t: 280, kind: 'key', key: ' ', down: false } : { t: 280, kind: 'tap', x: 0.5, y: 0.5, down: false });
  for (let t = 500; t < ms; t += 150 + r() * 550) press(t, kinds[Math.floor(r() * kinds.length)], 80 + r() * 520);
  return ev;
}
const START = [{ t: 200, kind: 'key', key: ' ', down: true }, { t: 280, kind: 'key', key: ' ', down: false },
  { t: 200, kind: 'tap', x: 0.5, y: 0.5, down: true }, { t: 280, kind: 'tap', x: 0.5, y: 0.5, down: false }];
const FPS_T = [1000, 1400, 1800];  // compare 30 fps at t with 60 fps at t and at 200 + (t - 200) / 2
const HALF = FPS_T.map((t) => 200 + (t - 200) / 2);

const PLANS = {
  idle: { fps: 60, ms: 20000, sampleMs: 100, events: [], thumbs: [3000] },
  kb1: { fps: 60, ms: 30000, sampleMs: 100, events: monkey(11, 30000, ['key']) },
  kb2: { fps: 60, ms: 30000, sampleMs: 100, events: monkey(11, 30000, ['key']) },
  touch: { fps: 60, ms: 30000, sampleMs: 100, events: monkey(12, 30000, ['tap']) },
  f60: { fps: 60, ms: 2000, sampleMs: 100, events: START, thumbs: [...FPS_T, ...HALF] },
  f30: { fps: 30, ms: 2000, sampleMs: 100, events: START, thumbs: FPS_T },
  mixed: { fps: 60, ms: 60000, sampleMs: 100, events: monkey(13, 60000, ['key', 'tap']), pauseOnOver: 2500 },
};

async function runPlan(browser, file, plan) {
  const page = await browser.newPage();
  await page.setViewport({ width: 420, height: 720 });
  await page.evaluateOnNewDocument(SHIM);
  await page.goto(pathToFileURL(path.resolve(file)).href, { waitUntil: 'load' });
  const out = await page.evaluate((p) => window.__H.run(p), plan);
  await page.close();
  return out;
}

const same = (a, b, upTo) => a.samples.every((s, i) => s.t > upTo || !b.samples[i] || s.h === b.samples[i].h);
const firstDiff = (a, b) => { const i = a.samples.findIndex((s, j) => b.samples[j] && s.h !== b.samples[j].h); return i < 0 ? null : a.samples[i].t; };
const mad = (x, y) => x.reduce((s, v, i) => s + Math.abs(v - y[i]), 0) / x.length;
const uniform = (th) => th.every((v) => v === th[0]);

// longest stretch of identical frames after the first change, during which inputs were still being sent
function stuck(run) {
  const S = run.samples; let changed = false, best = null, start = 0;
  for (let i = 1; i < S.length; i++) {
    if (S[i].h !== S[i - 1].h) { changed = true; start = i; continue; }
    if (!changed) continue;
    const len = S[i].t - S[start].t;
    const inputs = run.sent.filter((t) => t >= S[start].t && t <= S[i].t).length;
    if (len >= 6000 && inputs >= 4 && (!best || len > best.len)) best = { from: S[start].t, len, inputs };
  }
  return best;
}

function check(R) {
  const F = [];
  const add = (code, why) => F.push({ code, why });
  const errs = Object.entries(R).flatMap(([n, r]) => r.errors.map((e) => ({ run: n, ...e })));
  if (errs.length) add('RUNTIME_ERROR', `${errs[0].msg} (run ${errs[0].run}, t=${(errs[0].t / 1000).toFixed(1)} s)`);
  const blank = ['idle', 'kb1', 'touch'].every((n) => R[n].samples.every((s) => s.h === R[n].samples[0].h)) && uniform(R.idle.thumbs[3000]);
  if (blank) { add('BLANK', 'canvas never drew anything visible in idle, keyboard or touch play'); return F; }
  if (same(R.kb1, R.idle, 20000)) add('KEYBOARD_DEAD', 'keyboard play produced exactly the same frames as doing nothing (20 s)');
  if (same(R.touch, R.idle, 20000)) add('TOUCH_DEAD', 'taps produced exactly the same frames as doing nothing (20 s): unplayable on a phone');
  const nd = firstDiff(R.kb1, R.kb2);
  if (nd !== null) add('NONDETERMINISTIC', `same seed + same inputs diverged at t=${(nd / 1000).toFixed(1)} s` + (R.kb1.cryptoCalls ? `; crypto.getRandomValues called ${R.kb1.cryptoCalls}x (not seedable)` : ''));
  const a = R.f30.thumbs, b = R.f60.thumbs;
  const dSame = FPS_T.reduce((s, t) => s + mad(a[t], b[t]), 0) / FPS_T.length;
  const dHalf = FPS_T.reduce((s, t, i) => s + mad(a[t], b[HALF[i]]), 0) / FPS_T.length;
  // thresholds calibrated on dev games only
  if (dSame > 0.4 && dHalf < 0.4 * dSame && dHalf < 0.35) add('FPS_DEPENDENT', `at 30 fps the game at time t looks like the 60 fps game at half the elapsed time (diff ${dHalf.toFixed(1)} vs ${dSame.toFixed(1)}): speed is tied to frame rate`);
  if (!errs.length) {
    const s1 = stuck(R.kb1), s2 = stuck(R.touch);
    if (s1 && s2) add('STUCK', `frames frozen ${(s1.len / 1000).toFixed(1)} s from t=${(s1.from / 1000).toFixed(1)} s with ${s1.inputs} key presses, and ${(s2.len / 1000).toFixed(1)} s with ${s2.inputs} taps; restart/space/tap do nothing`);
  }
  if (R.kb1.contract) {
    const runs = ['kb1', 'touch', 'mixed'];
    const overAt = runs.map((n) => { const s = R[n].samples.find((x) => x.over); return s ? s.t : null; });
    if (overAt.every((t) => t !== null && t - 200 < 600)) add('INSTANT_OVER', `game over ${overAt.map((t) => ((t - 200) / 1000).toFixed(2) + ' s').join(' / ')} after the first input in every run`);
    if (overAt.every((t) => t === null)) add('NO_TERMINATION', 'no game over in 30 + 30 + 60 s of random play: an RL episode never ends');
    for (const n of runs) {
      const S = R[n].samples, i = S.findIndex((x, j) => j && x.over && S[j - 1].over && x.score > S[j - 1].score);
      if (i > 0) { add('SCORE_WHILE_OVER', `score rose ${S[i - 1].score} -> ${S[i].score} on the game-over screen (run ${n}, t=${(S[i].t / 1000).toFixed(1)} s): reward without playing`); break; }
    }
  }
  return F;
}

// baselines: a load-and-screenshot smoke test, and a 30 s keyboard monkey
function baselines(R) {
  const smoke = [];
  const early = R.idle.errors.filter((e) => e.t <= 3000);
  if (early.length) smoke.push({ code: 'RUNTIME_ERROR', why: early[0].msg });
  if (uniform(R.idle.thumbs[3000])) smoke.push({ code: 'BLANK', why: 'blank screenshot at 3 s' });
  const mk = [];
  if (R.kb1.errors.length) mk.push({ code: 'RUNTIME_ERROR', why: R.kb1.errors[0].msg });
  const still = R.kb1.samples.every((s) => s.h === R.kb1.samples[0].h);
  if (still) mk.push({ code: uniform(R.idle.thumbs[3000]) ? 'BLANK' : 'KEYBOARD_DEAD', why: 'no frame changed in 30 s of key presses' });
  return { smoke_test: smoke, keyboard_monkey: mk };
}

async function main(files) {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--hide-scrollbars', '--mute-audio'] });
  const results = [];
  const queue = files.slice();
  const worker = async () => {
    while (queue.length) {
      const file = queue.shift();
      const R = {};
      for (const [name, plan] of Object.entries(PLANS)) R[name] = await runPlan(browser, file, plan);
      results.push({ file, findings: check(R), ...baselines(R) });
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, files.length) }, worker));
  await browser.close();
  results.sort((a, b) => a.file.localeCompare(b.file));
  return results;
}

if (require.main === module) {
  main(process.argv.slice(2)).then((r) => process.stdout.write(JSON.stringify(r, null, 1))).catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { main, check };
