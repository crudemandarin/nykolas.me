// Flight Mode: the hero easter egg. Click the NYKO rocket and the page copy fades away; the rocket
// shrinks, deploys a laser pod and is yours to fly. W main engines · A/D RCS turn · S retro ·
// Space fire · Esc land. Asteroids split big → medium → small; meteors are worth a bonus; the UFO
// is shielded and takes offence. Three hull pips, then loss of signal. Best score is kept locally.
// The sky (src/scripts/hero-sky.ts) owns drawing the scene; this module owns the game.
import type { SkyApi, Rock } from './hero-sky';
import hullSvg from '../../public/brand/ui/nyko-ui-hull.svg?raw';
import laserSvg from '../../public/brand/ui/nyko-ui-laser.svg?raw';
import targetSvg from '../../public/brand/ui/nyko-ui-target.svg?raw';
import shieldSvg from '../../public/brand/ui/nyko-ui-shield.svg?raw';
import repairSvg from '../../public/brand/ui/nyko-ui-repair.svg?raw';
import overclockSvg from '../../public/brand/ui/nyko-ui-overclock.svg?raw';
// Wave patches are generated per wave by the brand module (see docs/claude/handoffs/WAVE-PATCH-HANDOFF.md).
import { wavePatch, waveStars, waveTier, waveCode, TOP_TIER } from '../../brand/round-2-iconography/wave-patch';

const TAU = Math.PI * 2;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (k: number) => k * k * (3 - 2 * k);
const pad = (n: number, w: number) => String(Math.max(0, Math.floor(n))).padStart(w, '0');
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

type Bolt = { x: number; y: number; vx: number; vy: number; dead: boolean };
type Part = { x: number; y: number; vx: number; vy: number; age: number; life: number; size: number; color: string; kind: 'spark' | 'shard' | 'puff'; rot: number; vr: number };
type Pop = { x: number; y: number; text: string; age: number; color: string };
type Phase = 'off' | 'enter' | 'fly' | 'dead' | 'exit';
type Kind = 'shield' | 'repair' | 'overclock';
type Pickup = { x: number; y: number; vx: number; vy: number; kind: Kind; age: number; spin: number };

// Tuning.
const THRUST = 560, RETRO = 240, TURN = 10, TURN_DAMP = 4.5, DRAG = 0.45, MAX_SPEED = 620;
// Pickups: how long they float before expiring, and what they do.
const MAGNET_RANGE = 150, MAGNET_PULL = 1100;
// OVERCLOCK_TIME is beam charge in seconds of firing: it only drains while the beam is on.
const PICKUP_LIFE = 14, SHIELD_TIME = 20, OVERCLOCK_TIME = 7, BEAM_DPS = 7, MAX_PICKUPS = 2;
// Canister art: public/brand/nyko-pickup-<kind>.svg (32 viewBox, centred), drawn at 28px.
const PICKUP_SIZE = 28;
const pickupImgs: Partial<Record<Kind, HTMLImageElement>> = {};
function pickupArt(kind: Kind) {
  let img = pickupImgs[kind];
  if (!img) { img = new Image(); img.src = `/brand/nyko-pickup-${kind}.svg`; pickupImgs[kind] = img; }
  return img;
}
const PICKUP_STYLE: Record<Kind, { color: string; label: string }> = {
  shield: { color: '#7CC4FF', label: 'SHIELD' },
  repair: { color: '#3FD69B', label: 'REPAIR' },
  overclock: { color: '#FFB300', label: 'OVERCLOCK' },
};
const BOLT_SPEED = 1150, FIRE_GAP = 0.13, HEAT_PER_SHOT = 0.085;
const ROCK_R = { 3: [26, 32], 2: [15, 19], 1: [8, 11] } as Record<number, [number, number]>;
const ROCK_HP: Record<number, number> = { 3: 3, 2: 2, 1: 1 };
// Waves 1–2 are a warm-up: softer rocks (big 2 hits, medium 1).
const ROCK_HP_EASY: Record<number, number> = { 3: 2, 2: 1, 1: 1 };
const EASY_WAVES = 2;
// Big rocks per wave: 2, 3, 4 for the opening waves, then the full ramp (wave + 2) from wave 4.
const rocksForWave = (w: number) => (w < 4 ? w + 1 : w + 2);
const ROCK_PTS: Record<number, number> = { 3: 20, 2: 50, 1: 100 };
// Hull hit circles along the rocket axis, in rocket units: [x, radius].
const HULL: [number, number][] = [[-150, 44], [-85, 38], [-15, 22], [55, 19], [125, 19], [170, 12]];
const GAME_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ']);
const BEST_KEY = 'nk-flight-best';
// HUD glyphs (round-1 UI family): single currentColor paths on a 24 grid, tinted here.
const glyph = (svg: string) => new Path2D(/\sd="([^"]+)"/.exec(svg)?.[1] ?? '');
const GLYPH = { hull: glyph(hullSvg), laser: glyph(laserSvg), target: glyph(targetSvg), shield: glyph(shieldSvg), repair: glyph(repairSvg), overclock: glyph(overclockSvg) };
// Full-colour art, drawn as images: the game-over plate and the per-wave mission patches.
const ART_LOS = '/brand/nyko-flight-los.svg';
const PATCH_KEY = 'nk-flight-patch', LEGACY_FL01_KEY = 'nk-flight-fl01';
// Patch award beats: tier-up waves (1, 6, 11, 16, 21) get the full award; other waves just add a star.
const AWARD_FULL = { dur: 3.4, size: 112 }, AWARD_SHORT = { dur: 1.2, size: 72 };
// Game-over sticker: the best patch is stamped across the plate's corner just after the plate appears.
const STICKER = { at: 1.3, slam: 0.18, size: 132, tilt: -0.21 };
const isTierUp = (w: number) => waveStars(w) === 1 && waveTier(w) * 5 + 1 === w && waveTier(w) <= TOP_TIER;
// One decoded image per wave, generated on first use and cached for the session.
const patchImgs = new Map<number, HTMLImageElement>();
function patchArt(wave: number): HTMLImageElement {
  let img = patchImgs.get(wave);
  if (!img) {
    img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(wavePatch(wave).color);
    patchImgs.set(wave, img);
  }
  return img;
}
const isReady = (img: HTMLImageElement | null): img is HTMLImageElement => !!img && img.complete && img.naturalWidth > 0;

export interface FlightHooks { onChange(): void; onHitUfo(): void }

export function createFlight(sky: SkyApi, hooks: FlightHooks) {
  const { ctx, hero, ship, rocks, meteors, c } = sky;
  let phase: Phase = 'off', k = 0, rdt = 0;
  const keys = new Set<string>();
  const bolts: Bolt[] = [], parts: Part[] = [], pops: Pop[] = [];
  let score = 0, best = readBest(), newBest = false, wave = 0, hull = 3, invuln = 0;
  let heat = 0, overheat = false, cool = 0, muzzleFlash = 0, rcsClock = 0;
  let gamma = 1, thr = 0, shakeAmt = 0, deadT = 0, nextWaveT = -1, hudA = 0;
  const banner = { text: '', sub: '', t: 0, dur: 0 };
  let from = { x: 0, y: 0, a: 0, s: 0, flame: 1 };
  // Patches: patchT runs the award animation (-1 when idle) for awardWave. runBest = highest patch this run,
  // everBest = highest on this device (0 = none).
  let losArt: HTMLImageElement | null = null;
  let patchT = -1, awardWave = 0, award = AWARD_FULL, runBest = 0, everBest = readEverBest(), stamped = false;
  // Pickups and their effects (seconds remaining; 0 = off). overT is beam charge: it drains only while the
  // beam fires (overclocked + Space held), so an unused overclock keeps until it's spent.
  const pickups: Pickup[] = [];
  let shieldT = 0, overT = 0, beamOn = false, beamUfoCool = 0, repairFlash = 0;
  const beam = { x1: 0, y1: 0, x2: 0, y2: 0 };

  // The best patch on this device, stamped beside the name in the hero copy (a page element, so it sits
  // above the copy and fades out with it during Flight Mode). Re-stamps when a new best lands.
  let heroPatchShown = 0;
  function syncHeroPatch() {
    const h1 = hero.querySelector('.hero-copy h1');
    if (!h1 || everBest <= 0 || everBest === heroPatchShown) return;
    let el = h1.querySelector<HTMLElement>('.hero-patch');
    if (!el) {
      el = document.createElement('span');
      el.className = 'hero-patch';
      el.setAttribute('aria-hidden', 'true'); // decorative; keeps the heading's accessible name clean
      el.innerHTML = '<img alt="" width="112" height="112" decoding="async" /><b></b>';
      h1.appendChild(el);
    }
    const code = waveCode(everBest);
    el.title = `Best Flight Mode patch · ${code}. Click the rocket to fly.`;
    el.querySelector('img')!.src = patchArt(everBest).src;
    el.querySelector('b')!.textContent = `Best · FL-${pad(everBest, 2)}`;
    // Restart the stamp animation.
    el.classList.remove('is-stamping'); void el.offsetWidth; el.classList.add('is-stamping');
    heroPatchShown = everBest;
  }

  // Screen-reader announcements.
  const live = document.createElement('div');
  live.className = 'sr-only'; live.setAttribute('aria-live', 'polite');
  hero.appendChild(live);
  const announce = (msg: string) => { live.textContent = msg; };

  function readEverBest() {
    try {
      const v = Number(localStorage.getItem(PATCH_KEY));
      if (v > 0) return v;
      // Migrate the old FL-01-only flag.
      if (localStorage.getItem(LEGACY_FL01_KEY) === '1') { localStorage.setItem(PATCH_KEY, '1'); return 1; }
    } catch { /* private mode: play on, persist nothing */ }
    return 0;
  }
  function earnPatch(w: number) {
    runBest = w; awardWave = w; patchT = 0;
    award = isTierUp(w) ? AWARD_FULL : AWARD_SHORT;
    if (w > everBest) { everBest = w; try { localStorage.setItem(PATCH_KEY, String(w)); } catch { /* private mode */ } }
    announce(`Mission patch FL-${pad(w, 2)} earned.`);
    return award === AWARD_FULL;
  }
  function readBest() { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; } }
  function saveBest() {
    if (score <= best) return;
    best = score; newBest = true;
    try { localStorage.setItem(BEST_KEY, String(best)); } catch { /* private mode */ }
  }
  const flightScale = () => clamp(0.36 * sky.W() / 1440, 0.3, 0.38);
  const held = (...ks: string[]) => ks.some((x) => keys.has(x));

  // ── Mode changes ──────────────────────────────────────────────
  function enter() {
    if (phase !== 'off') return;
    phase = 'enter'; k = 0;
    if (!losArt) { losArt = new Image(); losArt.src = ART_LOS; for (const k of ['shield', 'repair', 'overclock'] as Kind[]) pickupArt(k); }
    if (everBest > 0) patchArt(everBest); // for the game-over plate
    patchT = -1; runBest = 0;
    from = { x: ship.x, y: ship.y, a: ship.a, s: ship.s, flame: ship.flame };
    ship.vx = Math.cos(ship.a) * 50; ship.vy = Math.sin(ship.a) * 50; ship.w = 0;
    score = 0; wave = 0; hull = 3; heat = 0; overheat = false; newBest = false; invuln = 0; nextWaveT = -1;
    bolts.length = 0; parts.length = 0; pops.length = 0; pickups.length = 0; shieldT = 0; overT = 0; beamOn = false;
    // The little rocks already drifting through the hero become the first targets.
    for (const r of rocks) Object.assign(r, { size: 1, hp: 1, flash: 0 });
    hero.classList.add('is-flight');
    if (hero.getBoundingClientRect().top < 0) hero.scrollIntoView({ block: 'start', behavior: 'smooth' });
    announce('Flight mode. W to thrust, A and D to turn, S to brake, Space to fire, Escape to land.');
    hooks.onChange();
  }

  function exit() {
    if (phase === 'off' || phase === 'exit') return;
    saveBest();
    phase = 'exit'; k = 1;
    from = { x: ship.x, y: ship.y, a: ship.a, s: ship.s, flame: ship.flame };
    ship.alpha = 1; invuln = 0;
    keys.clear(); bolts.length = 0; pickups.length = 0; shieldT = 0; overT = 0; beamOn = false;
    if (document.fullscreenElement === hero) document.exitFullscreen().catch(() => {});
    // Dissolve the field so nothing big is left sitting on the page copy.
    for (const r of rocks) debris(r.x, r.y, r.r, 0.5);
    rocks.length = 0;
    hero.classList.remove('is-flight');
    announce('Landed.');
  }

  function retry() {
    for (const r of rocks) debris(r.x, r.y, r.r, 0.5);
    rocks.length = 0; bolts.length = 0;
    score = 0; wave = 0; hull = 3; heat = 0; overheat = false; newBest = false; nextWaveT = -1;
    patchT = -1; runBest = 0; pickups.length = 0; shieldT = 0; overT = 0; beamOn = false;
    Object.assign(ship, { x: sky.W() * 0.5, y: sky.H() * 0.55, a: -Math.PI / 2, vx: 0, vy: 0, w: 0, alpha: 1 });
    invuln = 2;
    phase = 'fly';
    startWave();
    announce('Retrying.');
  }

  // ── Waves & rocks ─────────────────────────────────────────────
  function makeRock(size: number, x: number, y: number, vx: number, vy: number): Rock {
    const [a, b] = ROCK_R[size], r = rnd(a, b);
    return { x, y, vx, vy, r, rot: rnd(0, TAU), vr: rnd(-1, 1) * (4 - size) * 0.35, pts: sky.newRockShape(r), tag: sky.tag(), size, hp: (wave <= EASY_WAVES ? ROCK_HP_EASY : ROCK_HP)[size], flash: 0 };
  }

  function startWave() {
    wave++;
    patchArt(wave); // decode now so it's ready when the wave is cleared
    const n = rocksForWave(wave), mult = 1 + 0.08 * (wave - 1), W = sky.W(), H = sky.H();
    for (let i = 0; i < n; i++) {
      let x = 0, y = 0;
      for (let tries = 0; tries < 12; tries++) {
        const side = Math.floor(Math.random() * 4);
        x = side === 0 ? -40 : side === 1 ? W + 40 : rnd(0, W);
        y = side === 2 ? -40 : side === 3 ? H + 40 : rnd(0, H);
        if (Math.hypot(x - ship.x, y - ship.y) > 280) break;
      }
      // Aim loosely at the middle of the field.
      const tx = rnd(W * 0.25, W * 0.75), ty = rnd(H * 0.25, H * 0.75), d = Math.hypot(tx - x, ty - y) || 1, sp = rnd(24, 48) * mult;
      rocks.push(makeRock(3, x, y, ((tx - x) / d) * sp, ((ty - y) / d) * sp));
    }
    showBanner(`Wave ${pad(wave, 2)}`, `${n} contacts inbound`, 2.2);
    announce(`Wave ${wave}.`);
  }

  function showBanner(text: string, sub: string, dur: number) { Object.assign(banner, { text, sub, t: 0, dur }); }

  function breakRock(r: Rock, dx: number, dy: number, award = true) {
    const i = rocks.indexOf(r);
    if (i >= 0) rocks.splice(i, 1);
    const size = r.size ?? 1, pts = ROCK_PTS[size];
    if (award) {
      score += pts;
      pops.push({ x: r.x, y: r.y - r.r, text: `+${pts}`, age: 0, color: c.amber });
    }
    debris(r.x, r.y, r.r, 1);
    if (award && size === 3 && Math.random() < 0.1) dropPickup(r.x, r.y);
    if (size > 1) {
      const base = Math.atan2(dy, dx), sp = Math.hypot(r.vx, r.vy) * 1.05 + rnd(28, 52);
      for (const s of [-1, 1]) {
        const a = base + s * rnd(0.45, 1.1);
        rocks.push(makeRock(size - 1, r.x + Math.cos(a) * r.r * 0.4, r.y + Math.sin(a) * r.r * 0.4, Math.cos(a) * sp, Math.sin(a) * sp));
      }
    }
  }

  function stepBeam(dt: number, W: number, H: number) {
    const m = sky.toWorld(sky.muzzle.x, sky.muzzle.y), ca = Math.cos(ship.a), sa = Math.sin(ship.a);
    let end = Math.hypot(W, H) * 1.2, hit: Rock | null = null;
    for (const r of rocks) {
      const rx = r.x - m.x, ry = r.y - m.y, along = rx * ca + ry * sa, off = Math.abs(-rx * sa + ry * ca);
      if (along > 0 && off < r.r) {
        const t = along - Math.sqrt(r.r * r.r - off * off);
        if (t < end) { end = Math.max(0, t); hit = r; }
      }
    }
    beam.x1 = m.x; beam.y1 = m.y; beam.x2 = m.x + ca * end; beam.y2 = m.y + sa * end;
    if (hit) {
      hit.beam = (hit.beam ?? 0) + dt * BEAM_DPS; hit.flash = 0.08;
      if (Math.random() < 0.6) sparks(beam.x2, beam.y2, 2, -ca, -sa);
      while ((hit.beam ?? 0) >= 1 && rocks.includes(hit)) {
        hit.beam! -= 1; hit.hp = (hit.hp ?? 1) - 1;
        if (hit.hp <= 0) breakRock(hit, ca, sa);
      }
    }
    // Meteors anywhere along the live part of the beam are vaporised.
    for (const me of meteors) {
      const rx = me.x - m.x, ry = me.y - m.y, along = rx * ca + ry * sa;
      if (me.age < me.life && along > 0 && along < end && Math.abs(-rx * sa + ry * ca) < 12) shootMeteor(me);
    }
    const u = sky.ufo();
    beamUfoCool -= dt;
    if (u && beamUfoCool <= 0) {
      const rx = u.x - m.x, ry = u.y - m.y, along = rx * ca + ry * sa;
      if (along > 0 && along < end && Math.abs(-rx * sa + ry * ca) < sky.ufoRadius()) { hooks.onHitUfo(); beamUfoCool = 0.4; }
    }
  }

  function shootMeteor(me: { x: number; y: number; vx: number; vy: number; life: number }) {
    me.life = 0; score += 250;
    pops.push({ x: me.x, y: me.y, text: 'METEOR +250', age: 0, color: c.amber });
    sparks(me.x, me.y, 14, me.vx, me.vy);
    if (Math.random() < 0.7) dropPickup(me.x, me.y);
  }

  function hitRock(r: Rock, b: Bolt) {
    r.hp = (r.hp ?? 1) - 1; r.flash = 0.18;
    sparks(b.x, b.y, 6, -b.vx, -b.vy);
    if (r.hp <= 0) breakRock(r, b.vx, b.vy);
  }

  // ── Effects ───────────────────────────────────────────────────
  function sparks(x: number, y: number, n: number, dx = 0, dy = 0, colors = [c.amber, c['flame-core'], c.ember], speed = 260) {
    const base = Math.atan2(dy, dx), aim = dx || dy;
    for (let i = 0; i < n; i++) {
      const a = aim ? base + rnd(-0.9, 0.9) : rnd(0, TAU), sp = rnd(0.3, 1) * speed;
      parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: 0, life: rnd(0.25, 0.6), size: rnd(1, 1.8), color: colors[i % colors.length], kind: 'spark', rot: 0, vr: 0 });
    }
  }
  function debris(x: number, y: number, r: number, amount: number) {
    const n = Math.round((5 + r * 0.5) * amount);
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU), sp = rnd(30, 140);
      parts.push({ x: x + Math.cos(a) * r * 0.5, y: y + Math.sin(a) * r * 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: 0, life: rnd(0.6, 1.3), size: rnd(1.5, 3.5), color: i % 3 ? c['hull-mid'] : c['hull-light'], kind: 'shard', rot: rnd(0, TAU), vr: rnd(-8, 8) });
    }
    sparks(x, y, Math.round(4 * amount), 0, 0, [c.amber, c['flame-core']], 160);
  }
  function rcs(lx: number, ly: number, dirx: number, diry: number) {
    const p = sky.toWorld(lx, ly), ca = Math.cos(ship.a), sa = Math.sin(ship.a);
    const vx = (dirx * ca - diry * sa) * 110 + ship.vx, vy = (dirx * sa + diry * ca) * 110 + ship.vy;
    parts.push({ x: p.x, y: p.y, vx: vx + rnd(-15, 15), vy: vy + rnd(-15, 15), age: 0, life: rnd(0.18, 0.32), size: rnd(1.5, 2.5), color: c['hull-xlight'], kind: 'puff', rot: 0, vr: 0 });
  }

  // ── Pickups ───────────────────────────────────────────────────
  function dropPickup(x: number, y: number, prefer?: Kind) {
    if (phase !== 'fly' || pickups.length >= MAX_PICKUPS) return;
    let kind = prefer;
    if (!kind) {
      // Repairs only when there's damage to repair; otherwise shield or overclock.
      const pool: Kind[] = hull < 3 ? ['repair', 'repair', 'shield', 'overclock'] : ['shield', 'overclock'];
      kind = pool[Math.floor(Math.random() * pool.length)];
    }
    const W = sky.W(), H = sky.H();
    x = clamp(x, 40, W - 40); y = clamp(y, 40, H - 40);
    const a = rnd(0, TAU), sp = rnd(10, 25);
    pickups.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, kind, age: 0, spin: rnd(0, TAU) });
  }

  function collect(p: Pickup) {
    const st = PICKUP_STYLE[p.kind];
    let text = '';
    if (p.kind === 'shield') { shieldT = SHIELD_TIME; text = 'SHIELD ONLINE'; }
    else if (p.kind === 'repair') {
      repairFlash = 1.6;
      if (hull < 3) { hull++; text = 'HULL +1'; } else { score += 500; text = 'HULL FULL · +500'; }
    } else { overT = OVERCLOCK_TIME; heat = 0; overheat = false; text = 'LASER OVERCLOCKED'; }
    // Stack above any pop-up that just appeared nearby, so simultaneous pickups stay readable.
    const near = pops.filter((q) => q.age < 0.4 && Math.abs(q.x - p.x) < 120 && Math.abs(q.y - (p.y - 18)) < 40).length;
    pops.push({ x: p.x, y: p.y - 18 - near * 14, text, age: 0, color: st.color });
    sparks(p.x, p.y, 12, 0, 0, [st.color, '#FFFFFF'], 160);
    announce(text.toLowerCase().replace('·', '.'));
  }

  // The UFO approves of you: it drops a supply crate on its way out.
  function gift(x: number, y: number) {
    if (phase !== 'fly') return;
    dropPickup(x, y);
    pops.push({ x, y: y - 10, text: 'SUPPLY DROP', age: 0, color: c.nominal });
  }

  function hitShip(sx: number, sy: number, rock: Rock | null) {
    if (shieldT > 0) {
      // The shield takes this one.
      shieldT = 0; invuln = 1.0;
      const nx = ship.x - sx, ny = ship.y - sy, d = Math.hypot(nx, ny) || 1;
      ship.vx += (nx / d) * 120; ship.vy += (ny / d) * 120;
      sparks(sx, sy, 16, nx, ny, ['#7CC4FF', '#FFFFFF'], 240);
      if (rock) breakRock(rock, -nx, -ny, false);
      pops.push({ x: ship.x, y: ship.y - 30, text: 'SHIELD ABSORBED', age: 0, color: '#7CC4FF' });
      announce('Shield absorbed the hit.');
      return;
    }
    hull--; invuln = 1.6;
    if (!sky.idle()) shakeAmt = 7;
    const nx = ship.x - sx, ny = ship.y - sy, d = Math.hypot(nx, ny) || 1;
    ship.vx += (nx / d) * 200; ship.vy += (ny / d) * 200;
    sparks(sx, sy, 10, nx, ny, [c.ember, c.amber, c['flame-core']], 220);
    if (rock) breakRock(rock, -nx, -ny, false); // ramming breaks it, but scores nothing
    pops.push({ x: ship.x, y: ship.y - 30, text: hull > 0 ? 'HULL −1' : 'HULL BREACH', age: 0, color: c['ember-text'] });
    if (hull <= 0) explode();
    else announce(`Hull hit. ${hull} remaining.`);
  }

  function explode() {
    phase = 'dead'; deadT = 0; stamped = false;
    sparks(ship.x, ship.y, 46, 0, 0, [c.ember, c.amber, c['flame-core'], c.amber], 340);
    debris(ship.x, ship.y, 40, 1.6);
    ship.alpha = 0; ship.flame = 0; ship.exhaust = 0; ship.vx = 0; ship.vy = 0; ship.w = 0;
    keys.clear();
    if (!sky.idle()) shakeAmt = 14;
    saveBest();
    announce(`Loss of signal. Score ${score}. Press R to retry or Escape to land.`);
  }

  function shoot() {
    const m = sky.toWorld(sky.muzzle.x, sky.muzzle.y), ca = Math.cos(ship.a), sa = Math.sin(ship.a);
    bolts.push({ x: m.x, y: m.y, vx: ca * BOLT_SPEED + ship.vx, vy: sa * BOLT_SPEED + ship.vy, dead: false });
    cool = FIRE_GAP; heat += HEAT_PER_SHOT; muzzleFlash = 0.06;
    ship.vx -= ca * 1.5; ship.vy -= sa * 1.5; // barely-there recoil
    if (heat >= 1) { heat = 1; overheat = true; pops.push({ x: ship.x, y: ship.y - 34, text: 'OVERHEAT', age: 0, color: c['ember-text'] }); }
  }

  // ── Ship (real time) ──────────────────────────────────────────
  function stepShip(dt: number) {
    rdt = dt;
    if (phase === 'off') return;
    const W = sky.W(), H = sky.H();
    hudA = clamp(hudA + (phase === 'exit' ? -dt * 3 : dt * 2.5));

    if (phase === 'enter') {
      k = Math.min(1, k + dt / 0.8);
      const e = ease(k);
      ship.s = lerp(from.s, flightScale(), e);
      ship.x += ship.vx * dt; ship.y += ship.vy * dt;
      ship.flame = lerp(from.flame, 0.25, e); ship.exhaust = lerp(1, 0.3, e);
      ship.lines = 1 - e; ship.traj = 1 - e;
      ship.pod = clamp((k - 0.35) / 0.65);
      gamma = 1;
      if (k >= 1) { phase = 'fly'; thr = 0.25; startWave(); }
      return;
    }

    if (phase === 'exit') {
      k = Math.max(0, k - dt / 1.0);
      const e = ease(k), home = sky.heroPose();
      ship.x = lerp(home.x, from.x, e); ship.y = lerp(home.y, from.y, e);
      ship.a = home.a + wrapAngle(from.a - home.a) * e;
      ship.s = lerp(ship.hs, from.s, e);
      ship.flame = lerp(1, from.flame, e); ship.exhaust = lerp(1, 0.3, e);
      ship.lines = 1 - e; ship.traj = 1 - e; ship.pod = clamp(e * 1.6 - 0.6);
      ship.vx = 0; ship.vy = 0; ship.w = 0; gamma = 1;
      if (k <= 0) {
        phase = 'off';
        Object.assign(ship, { flame: 1, exhaust: 1, lines: 1, traj: 1, pod: 0, alpha: 1 });
        hooks.onChange();
        syncHeroPatch(); // a new best gets stamped as the copy returns
      }
      return;
    }

    if (phase === 'dead') {
      deadT += dt; gamma = 1; beamOn = false;
      // The sticker lands with a small jolt.
      if (!stamped && everBest > 0 && deadT > STICKER.at + STICKER.slam) { stamped = true; if (!sky.idle()) shakeAmt = 5; }
      return;
    }

    // Flying.
    const up = held('w', 'arrowup'), dn = held('s', 'arrowdown'), lt = held('a', 'arrowleft'), rt = held('d', 'arrowright');
    const turn = (rt ? 1 : 0) - (lt ? 1 : 0);
    ship.w += turn * TURN * dt; ship.w *= Math.exp(-TURN_DAMP * dt); ship.a += ship.w * dt;
    const ca = Math.cos(ship.a), sa = Math.sin(ship.a), acc = (up ? THRUST : 0) - (dn ? RETRO : 0);
    ship.vx += ca * acc * dt; ship.vy += sa * acc * dt;
    const drag = Math.exp(-DRAG * dt); ship.vx *= drag; ship.vy *= drag;
    let speed = Math.hypot(ship.vx, ship.vy);
    if (speed > MAX_SPEED) { ship.vx *= MAX_SPEED / speed; ship.vy *= MAX_SPEED / speed; speed = MAX_SPEED; }
    ship.x += ship.vx * dt; ship.y += ship.vy * dt;
    // Wrap at the hero edges just after the centre crosses one side.
    const m = 60 * ship.s;
    if (ship.x < -m) ship.x += W + 2 * m; else if (ship.x > W + m) ship.x -= W + 2 * m;
    if (ship.y < -m) ship.y += H + 2 * m; else if (ship.y > H + m) ship.y -= H + 2 * m;
    // Station keeping: never let it coast to a stop with its centre off screen.
    const inset = 24;
    if (ship.x < inset) ship.vx += 320 * dt; else if (ship.x > W - inset) ship.vx -= 320 * dt;
    if (ship.y < inset) ship.vy += 320 * dt; else if (ship.y > H - inset) ship.vy -= 320 * dt;

    thr += ((up ? 1.3 : dn ? 0.05 : 0.22) - thr) * Math.min(1, dt * 10);
    ship.flame = thr; ship.exhaust = up ? 2.4 : 0.25;
    ship.lines = Math.min(1, speed / MAX_SPEED) * 0.8;
    ship.travel += dt * speed / 260;
    gamma = 1 + 0.6 * Math.pow(speed / MAX_SPEED, 2);

    // RCS puffs: nose and tail fire opposite ways to turn; the nose fires forward to brake.
    rcsClock += dt * 45;
    while (rcsClock >= 1) {
      rcsClock -= 1;
      if (turn) { rcs(160, -14 * turn, 0, -turn); rcs(-150, 30 * turn, 0, turn); }
      if (dn) { rcs(178, -9, 1, -0.3); rcs(178, 9, 1, 0.3); }
    }

    cool -= dt;
    heat = Math.max(0, heat - dt * (overheat ? 0.55 : 0.4));
    if (overheat && heat < 0.3) overheat = false;
    shieldT = Math.max(0, shieldT - dt);
    repairFlash = Math.max(0, repairFlash - dt);
    beamOn = overT > 0 && held(' ');
    if (beamOn) overT = Math.max(0, overT - dt);
    if (overT > 0) { heat = 0; overheat = false; }
    else if (held(' ') && cool <= 0 && !overheat) shoot();
    muzzleFlash = Math.max(0, muzzleFlash - dt);

    invuln = Math.max(0, invuln - dt);
    ship.alpha = invuln > 0 ? (Math.floor(invuln * 16) % 2 ? 0.3 : 1) : 1;
  }

  // ── World (dilated time) ──────────────────────────────────────
  function stepWorld(wdt: number) {
    if (phase === 'off') {
      // Let leftover debris finish after landing.
      for (const p of parts) { p.age += wdt; p.x += p.vx * wdt; p.y += p.vy * wdt; }
      prune(parts, (p) => p.age < p.life);
      return;
    }
    const W = sky.W(), H = sky.H(), dt = rdt;

    for (const r of rocks) {
      r.x += r.vx * wdt; r.y += r.vy * wdt; r.rot += r.vr * wdt; r.flash = Math.max(0, (r.flash ?? 0) - wdt);
      const m = r.r + 14;
      if (r.x < -m) r.x += W + 2 * m; else if (r.x > W + m) r.x -= W + 2 * m;
      if (r.y < -m) r.y += H + 2 * m; else if (r.y > H + m) r.y -= H + 2 * m;
    }

    // Bolts fly in ship time so shooting stays crisp under dilation.
    const ufo = sky.ufo(), ur = sky.ufoRadius();
    // No range limit: a bolt flies until it hits something or leaves the screen (bolts never wrap).
    for (const b of bolts) {
      // Sub-step so fast bolts can't tunnel through small rocks.
      for (let s = 0; s < 3 && !b.dead; s++) {
        b.x += b.vx * dt / 3; b.y += b.vy * dt / 3;
        for (const r of rocks) {
          if ((b.x - r.x) ** 2 + (b.y - r.y) ** 2 < (r.r + 2) ** 2) { hitRock(r, b); b.dead = true; break; }
        }
        if (b.dead) break;
        for (const me of meteors) {
          if (me.age < me.life && Math.hypot(b.x - me.x, b.y - me.y) < 16) {
            shootMeteor(me); b.dead = true;
            break;
          }
        }
        if (b.dead) break;
        if (ufo && Math.hypot(b.x - ufo.x, b.y - ufo.y) < ur) {
          hooks.onHitUfo(); b.dead = true;
          sparks(b.x, b.y, 8, -b.vx, -b.vy, [c.nominal, '#E6FFF2'], 200);
        }
      }
      if (b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) b.dead = true;
    }
    prune(bolts, (b) => !b.dead);

    // Overclocked beam: a ray from the muzzle that stops at the first rock and chews through it.
    if (beamOn && phase === 'fly') stepBeam(dt, W, H);

    // Pickups drift, wrap, blink out when old, and are collected on contact.
    for (const p of pickups) {
      p.age += wdt; p.spin += wdt * 1.4;
      // Magnetism: inside range, pickups are drawn to the ship, harder the closer they get.
      // Runs on ship time so it feels the same under dilation.
      const mx = ship.x - p.x, my = ship.y - p.y, md = Math.hypot(mx, my);
      if (phase === 'fly' && md < MAGNET_RANGE && md > 1) {
        const pull = MAGNET_PULL * (1 - md / MAGNET_RANGE) + 180;
        p.vx += (mx / md) * pull * dt; p.vy += (my / md) * pull * dt;
        const damp = Math.exp(-3 * dt); p.vx *= damp; p.vy *= damp; // no orbiting: settle in
        p.x += p.vx * dt; p.y += p.vy * dt;
      } else { p.x += p.vx * wdt; p.y += p.vy * wdt; }
      if (p.x < -20) p.x += W + 40; else if (p.x > W + 20) p.x -= W + 40;
      if (p.y < -20) p.y += H + 40; else if (p.y > H + 20) p.y -= H + 40;
    }
    if (phase === 'fly') {
      const circles = HULL.map(([x, r]) => ({ ...sky.toWorld(x, 0), r: r * ship.s }));
      for (const p of pickups) {
        if (circles.some((cc) => Math.hypot(p.x - cc.x, p.y - cc.y) < cc.r + 14)) { collect(p); p.age = PICKUP_LIFE; }
      }
    }
    prune(pickups, (p) => p.age < PICKUP_LIFE);

    // Ship collisions.
    if (phase === 'fly' && invuln <= 0) {
      const circles = HULL.map(([x, r]) => ({ ...sky.toWorld(x, 0), r: r * ship.s }));
      outer: for (const rk of rocks) {
        for (const cc of circles) {
          if (Math.hypot(rk.x - cc.x, rk.y - cc.y) < rk.r * 0.85 + cc.r) { hitShip(rk.x, rk.y, rk); break outer; }
        }
      }
      if (phase === 'fly' && invuln <= 0) {
        outer2: for (const me of meteors) {
          for (const cc of circles) {
            if (me.age < me.life && Math.hypot(me.x - cc.x, me.y - cc.y) < cc.r) { me.life = 0; hitShip(me.x, me.y, null); break outer2; }
          }
        }
      }
    }

    for (const p of parts) {
      p.age += wdt; p.x += p.vx * wdt; p.y += p.vy * wdt; p.rot += p.vr * wdt;
      const d = Math.exp(-(p.kind === 'puff' ? 4 : 1.2) * wdt); p.vx *= d; p.vy *= d;
    }
    prune(parts, (p) => p.age < p.life);
    for (const p of pops) { p.age += dt; p.y -= 22 * dt; }
    prune(pops, (p) => p.age < 0.9);

    // Waves.
    if (phase === 'fly' && rocks.length === 0 && nextWaveT < 0) {
      const bonus = 250 * wave;
      score += bonus;
      showBanner(`Wave ${pad(wave, 2)} clear`, `+${bonus} bonus · next wave`, 2.2);
      nextWaveT = 2.4;
      dropPickup(rnd(W * 0.25, W * 0.75), rnd(H * 0.3, H * 0.7), hull < 3 ? 'repair' : undefined);
      if (earnPatch(wave)) nextWaveT = 3.6; // a tier-up patch gets its moment
    }
    if (nextWaveT >= 0 && phase === 'fly') { nextWaveT -= dt; if (nextWaveT < 0) { nextWaveT = -1; startWave(); } }
    banner.t += dt;
    if (patchT >= 0) { patchT += dt; if (patchT > award.dur) patchT = -1; }
    shakeAmt *= Math.exp(-8 * dt);
  }

  // ── Drawing ───────────────────────────────────────────────────
  function shake() {
    if (shakeAmt > 0.3) ctx.translate(rnd(-1, 1) * shakeAmt, rnd(-1, 1) * shakeAmt);
  }

  function drawPickup(p: Pickup) {
    const st = PICKUP_STYLE[p.kind], left = PICKUP_LIFE - p.age;
    if (left < 3 && Math.floor(left * 6) % 2 === 0) return; // blink out
    const pulse = 0.5 + 0.5 * Math.sin(p.age * 4);
    ctx.save(); ctx.translate(p.x, p.y);
    // Halo.
    ctx.globalAlpha = 0.18 + 0.12 * pulse; ctx.strokeStyle = st.color; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, 17 + pulse * 3, 0, TAU); ctx.stroke();
    // Canister art, rocking gently. Falls back to a plain diamond while the image decodes.
    ctx.globalAlpha = 1; ctx.rotate(Math.sin(p.spin) * 0.25);
    const art = pickupArt(p.kind);
    if (isReady(art)) {
      ctx.drawImage(art, -PICKUP_SIZE / 2, -PICKUP_SIZE / 2, PICKUP_SIZE, PICKUP_SIZE);
      ctx.restore();
      setFont(8);
      ctx.save(); ctx.globalAlpha = 0.8; ctx.fillStyle = st.color;
      ctx.fillText(st.label, p.x - ctx.measureText(st.label).width / 2, p.y + 26); ctx.restore();
      return;
    }
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(12, 0); ctx.lineTo(0, 12); ctx.lineTo(-12, 0); ctx.closePath();
    ctx.fillStyle = c['surface-200']; ctx.fill(); ctx.strokeStyle = st.color; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = st.color; ctx.fillStyle = st.color; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    if (p.kind === 'shield') { ctx.arc(0, 2, 5, Math.PI, TAU); ctx.moveTo(-5, 2); ctx.lineTo(5, 2); }
    else if (p.kind === 'repair') { ctx.moveTo(-4.5, 0); ctx.lineTo(4.5, 0); ctx.moveTo(0, -4.5); ctx.lineTo(0, 4.5); }
    else { ctx.moveTo(1.5, -6); ctx.lineTo(-2.5, 0.5); ctx.lineTo(2.5, 0.5); ctx.lineTo(-1.5, 6); }
    ctx.stroke();
    ctx.restore();
    setFont(8);
    ctx.save(); ctx.globalAlpha = 0.8; ctx.fillStyle = st.color;
    ctx.fillText(st.label, p.x - ctx.measureText(st.label).width / 2, p.y + 26); ctx.restore();
  }

  function drawBeam() {
    const flick = 0.85 + 0.15 * Math.sin(performance.now() / 18);
    ctx.save(); ctx.lineCap = 'round';
    ctx.globalAlpha = 0.22 * flick; ctx.strokeStyle = c.amber; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(beam.x1, beam.y1); ctx.lineTo(beam.x2, beam.y2); ctx.stroke();
    ctx.globalAlpha = 0.9; ctx.strokeStyle = c.ember; ctx.lineWidth = 3.5 * flick;
    ctx.beginPath(); ctx.moveTo(beam.x1, beam.y1); ctx.lineTo(beam.x2, beam.y2); ctx.stroke();
    ctx.globalAlpha = 1; ctx.strokeStyle = sky.light() ? c.amber : c['flame-core']; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(beam.x1, beam.y1); ctx.lineTo(beam.x2, beam.y2); ctx.stroke();
    const g = ctx.createRadialGradient(beam.x2, beam.y2, 0, beam.x2, beam.y2, 10);
    g.addColorStop(0, 'rgba(255,243,224,0.9)'); g.addColorStop(1, 'rgba(255,74,34,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(beam.x2, beam.y2, 10, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // Drawn over the ship: the shield bubble.
  function drawOver() {
    if (phase !== 'fly' || shieldT <= 0 || ship.alpha <= 0) return;
    if (shieldT < 3 && Math.floor(shieldT * 6) % 2 === 0) return;
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 260);
    ctx.save();
    ctx.translate(ship.x, ship.y); ctx.rotate(ship.a);
    ctx.beginPath(); ctx.ellipse(-10 * ship.s, 0, 230 * ship.s, 82 * ship.s, 0, 0, TAU);
    ctx.globalAlpha = 0.07 + 0.04 * pulse; ctx.fillStyle = '#7CC4FF'; ctx.fill();
    ctx.globalAlpha = 0.65; ctx.strokeStyle = '#7CC4FF'; ctx.lineWidth = 1.3; ctx.setLineDash([5, 4]);
    ctx.lineDashOffset = -performance.now() / 60; ctx.stroke();
    ctx.restore();
  }

  function drawUnder() {
    for (const p of pickups) drawPickup(p);
    if (beamOn) drawBeam();
    if (!parts.length && !bolts.length && muzzleFlash <= 0) return;
    ctx.save();
    ctx.lineCap = 'round';
    for (const p of parts) {
      const a = 1 - p.age / p.life;
      ctx.globalAlpha = a;
      if (p.kind === 'spark') {
        ctx.strokeStyle = p.color; ctx.lineWidth = p.size;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke();
      } else if (p.kind === 'shard') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.moveTo(-p.size, -p.size * 0.6); ctx.lineTo(p.size, 0); ctx.lineTo(-p.size * 0.4, p.size * 0.7); ctx.closePath(); ctx.fill();
        ctx.restore();
      } else {
        ctx.globalAlpha = a * 0.55; ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 + (1 - a) * 2), 0, TAU); ctx.fill();
      }
    }
    for (const b of bolts) {
      const sp = Math.hypot(b.vx, b.vy) || 1, tx = b.x - (b.vx / sp) * 16, ty = b.y - (b.vy / sp) * 16;
      ctx.globalAlpha = 0.9; ctx.strokeStyle = c.ember; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.globalAlpha = 1; ctx.strokeStyle = sky.light() ? c.amber : c['flame-core']; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(tx, ty); ctx.stroke();
    }
    if (muzzleFlash > 0 && ship.alpha > 0) {
      const m = sky.toWorld(sky.muzzle.x + 6, sky.muzzle.y), r = 7;
      const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, r);
      g.addColorStop(0, 'rgba(255,243,224,0.95)'); g.addColorStop(1, 'rgba(255,179,0,0)');
      ctx.globalAlpha = muzzleFlash / 0.06; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(m.x, m.y, r, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function setFont(px: number, family = '"IBM Plex Mono", monospace', weight = 500, spacing = 0.12) {
    ctx.font = `${weight} ${px}px ${family}`;
    if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${(px * spacing).toFixed(1)}px`;
  }

  // A keycap: returns its width. Lit while held.
  function keycap(x: number, y: number, label: string, lit: boolean) {
    setFont(10);
    const w = Math.max(18, ctx.measureText(label).width + 10), h = 18;
    ctx.fillStyle = lit ? c.amber : c['surface-200'];
    ctx.fillRect(x, y - h + 4, w, h);
    ctx.strokeStyle = lit ? c.amber : c['line-strong']; ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y - h + 4.5, w - 1, h - 1);
    ctx.fillStyle = lit ? '#14182A' : c.ink;
    ctx.fillText(label, x + (w - ctx.measureText(label).width) / 2 + 1, y - 1);
    return w;
  }

  // Draws a HUD glyph sitting on the text baseline; returns the advance.
  function drawGlyph(p: Path2D, x: number, base: number, color: string, size = 14) {
    ctx.save(); ctx.translate(x, base - size + 2); ctx.scale(size / 24, size / 24); ctx.fillStyle = color; ctx.fill(p); ctx.restore();
    return size + 6;
  }

  function drawHud() {
    if (phase === 'off' && hudA <= 0) return;
    const W = sky.W(), H = sky.H(), L = W < 1100 ? 24 : 48, top = 30, bot = H - 18;
    ctx.save();
    ctx.globalAlpha = hudA;
    ctx.textBaseline = 'alphabetic';

    // Pop-ups ride in world space.
    for (const p of pops) {
      setFont(10); ctx.globalAlpha = hudA * (1 - p.age / 0.9); ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x - ctx.measureText(p.text).width / 2, p.y);
    }
    ctx.globalAlpha = hudA;

    // Top left: mode, wave, telemetry.
    const speed = Math.hypot(ship.vx, ship.vy), hdg = ((ship.a * 180) / Math.PI + 90 + 360) % 360;
    ctx.fillStyle = c.ember; ctx.fillRect(L, top - 8, 7, 7);
    setFont(11); ctx.fillStyle = c.ink;
    const t1 = `FLIGHT MODE · WAVE ${pad(wave, 2)}`;
    ctx.fillText(t1, L + 14, top);
    // HUD badge: the latest patch earned this run (hidden while it's being awarded).
    if (runBest > 0 && patchT < 0) { const b = patchArt(runBest); if (isReady(b)) ctx.drawImage(b, L + 14 + ctx.measureText(t1).width + 10, top - 15, 20, 20); }
    ctx.fillStyle = c['ink-subtle'];
    ctx.fillText(`VEL ${pad(speed, 3)} · HDG ${pad(hdg, 3)}° · γ ${gamma.toFixed(2)}`, L, top + 18);

    // Top right: score.
    setFont(14, undefined, 500, 0.08); ctx.fillStyle = c.ink;
    const s1 = `SCORE ${pad(score, 6)}`, s1w = ctx.measureText(s1).width;
    ctx.fillText(s1, W - L - s1w, top + 2);
    drawGlyph(GLYPH.target, W - L - s1w - 22, top + 3, c.amber, 16);
    setFont(11); ctx.fillStyle = c['ink-subtle'];
    const s2 = `BEST ${pad(Math.max(best, score), 6)}`; ctx.fillText(s2, W - L - ctx.measureText(s2).width, top + 20);

    // Bottom left: hull pips and laser heat.
    setFont(11);
    let x = L + drawGlyph(GLYPH.hull, L, bot + 1, hull === 1 ? c.ember : c['ink-muted']);
    ctx.fillStyle = c['ink-subtle']; ctx.fillText('HULL', x, bot);
    x += ctx.measureText('HULL').width + 10;
    const blink = Math.floor(performance.now() / 250) % 2 === 0;
    for (let i = 0; i < 3; i++) {
      const on = i < hull;
      if (on) { ctx.fillStyle = hull === 1 && blink ? c.ember : c['hull-light']; ctx.fillRect(x, bot - 9, 10, 10); }
      else { ctx.strokeStyle = c['line-strong']; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, bot - 8.5, 9, 9); }
      x += 14;
    }
    // Repair just collected: the repair glyph blinks beside the pips.
    if (repairFlash > 0 && Math.floor(repairFlash * 6) % 2 === 0) drawGlyph(GLYPH.repair, x + 2, bot + 1, '#3FD69B');
    x += 18;
    x += drawGlyph(GLYPH.laser, x, bot + 1, overheat ? c.ember : c['ink-muted']);
    ctx.fillStyle = c['ink-subtle']; ctx.fillText('LASER', x, bot);
    x += ctx.measureText('LASER').width + 10;
    ctx.strokeStyle = c['line-strong']; ctx.strokeRect(x + 0.5, bot - 8.5, 72, 9);
    let sx = x + 84;
    if (overT > 0) {
      // Overclocked: the bar shows beam charge left instead of heat.
      ctx.fillStyle = c.amber; ctx.fillRect(x + 2, bot - 7, 69 * (overT / OVERCLOCK_TIME), 6);
      sx += drawGlyph(GLYPH.overclock, sx, bot + 1, c.amber);
      ctx.fillStyle = c.amber; ctx.fillText('OVERCLOCK', sx, bot); sx += ctx.measureText('OVERCLOCK').width + 18;
    } else {
      ctx.fillStyle = overheat ? c.ember : c.amber; ctx.fillRect(x + 2, bot - 7, 69 * heat, 6);
      if (overheat) { if (blink) { ctx.fillStyle = c['ember-text']; ctx.fillText('OVERHEAT', sx, bot); } sx += ctx.measureText('OVERHEAT').width + 18; }
    }
    if (shieldT > 0) {
      sx += drawGlyph(GLYPH.shield, sx, bot + 1, '#7CC4FF');
      ctx.fillStyle = '#7CC4FF'; ctx.fillText(`SHIELD ${pad(Math.ceil(shieldT), 2)}`, sx, bot);
    }

    // Bottom right: controls, lit while held.
    const groups: [string, string[], string][] = [
      ['W', ['w', 'arrowup'], 'THRUST'], ['A', ['a', 'arrowleft'], ''], ['D', ['d', 'arrowright'], 'TURN'],
      ['S', ['s', 'arrowdown'], 'BRAKE'], ['SPACE', [' '], 'FIRE'], ['F', ['f'], document.fullscreenElement ? 'WINDOW' : 'FULL'], ['ESC', [], 'LAND'],
    ];
    let rx = W - L;
    for (let i = groups.length - 1; i >= 0; i--) {
      const [cap, ks, label] = groups[i];
      setFont(10);
      if (label) { const lw = ctx.measureText(label).width; rx -= lw; ctx.fillStyle = c['ink-subtle']; ctx.fillText(label, rx, bot); rx -= 6; }
      const kw = Math.max(18, ctx.measureText(cap).width + 10);
      rx -= kw; keycap(rx, bot, cap, ks.some((q) => keys.has(q)));
      // A pairs tightly with D ("A D TURN"); every other group gets a wide gap.
      rx -= i > 0 && !groups[i - 1][2] ? 4 : 16;
    }

    // Centre banner.
    if (banner.t < banner.dur) {
      const a = Math.min(1, banner.t / 0.25, (banner.dur - banner.t) / 0.4);
      ctx.globalAlpha = hudA * a;
      setFont(56, '"Big Shoulders Display", "Arial Narrow", sans-serif', 800, 0.02); ctx.fillStyle = c.ink;
      const t1 = banner.text.toUpperCase(); ctx.fillText(t1, (W - ctx.measureText(t1).width) / 2, H * 0.34);
      setFont(11); ctx.fillStyle = c['ink-subtle'];
      const t2 = banner.sub.toUpperCase(); ctx.fillText(t2, (W - ctx.measureText(t2).width) / 2, H * 0.34 + 24);
    }

    if (patchT >= 0 && isReady(patchArt(awardWave))) drawPatchAward(W, H);
    if (phase === 'dead' && deadT > 0.9) drawLos(W, H, Math.min(1, (deadT - 0.9) / 0.3));
    ctx.restore();
  }

  // Patch award: pops in under the wave banner, holds, then fades. Engines Idle: static for the same time.
  function drawPatchAward(W: number, H: number) {
    const t = patchT, { dur, size: full } = award, still = sky.idle();
    const pop = still || t >= 0.45 ? 1 : 1 + 0.12 * Math.sin((t / 0.45) * Math.PI);
    const a = still ? 1 : Math.min(1, t / 0.2, (dur - t) / 0.4);
    const size = still ? full : full * Math.min(1, t / 0.3) * pop;
    const cx = W / 2, cy = H * 0.34 + 50 + full / 2;
    ctx.save();
    ctx.globalAlpha = hudA * Math.max(0, a);
    ctx.drawImage(patchArt(awardWave), cx - size / 2, cy - size / 2, size, size);
    setFont(11); ctx.fillStyle = c.amber;
    const label = `MISSION PATCH ${waveCode(awardWave)} · EARNED`;
    ctx.fillText(label, cx - ctx.measureText(label).width / 2, cy + full / 2 + 20);
    ctx.restore();
  }

  function drawLos(W: number, H: number, a: number) {
    // With the art: plate is art | text. Without it (still loading), text only.
    const art = isReady(losArt) ? losArt : null;
    const w = art ? 600 : 400, h = art ? 228 : 184, x = (W - w) / 2, y = (H - h) / 2;
    ctx.globalAlpha = a;
    ctx.fillStyle = c['surface-200']; ctx.globalAlpha = a * 0.94; ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = a; ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    // Registration marks, as on every plate.
    ctx.strokeStyle = c['ink-subtle']; ctx.lineWidth = 1.5;
    for (const [cx, cy, sx, sy] of [[x - 6, y - 6, 1, 1], [x + w + 6, y - 6, -1, 1], [x - 6, y + h + 6, 1, -1], [x + w + 6, y + h + 6, -1, -1]]) {
      ctx.beginPath(); ctx.moveTo(cx + sx * 12, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy * 12); ctx.stroke();
    }
    let px = x + 24, ty = y;
    if (art) {
      const s = h - 28;
      ctx.drawImage(art, x + 14, y + 14, s, s);
      ctx.strokeStyle = c.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 28 + s + 0.5, y + 14); ctx.lineTo(x + 28 + s + 0.5, y + h - 14); ctx.stroke();
      px = x + 28 + s + 22; ty = y + 22;
    }
    ctx.fillStyle = c.ember; ctx.fillRect(px, ty + 26, 7, 7);
    setFont(11); ctx.fillStyle = c['ember-text']; ctx.fillText('TELEMETRY LOST', px + 14, ty + 34);
    setFont(44, '"Big Shoulders Display", "Arial Narrow", sans-serif', 800, 0.02); ctx.fillStyle = c.ink;
    ctx.fillText('LOSS OF SIGNAL', px, ty + 82);
    setFont(12); ctx.fillStyle = c['ink-muted'];
    ctx.fillText(`SCORE ${pad(score, 6)} · BEST ${pad(best, 6)}`, px, ty + 110);
    ctx.fillText(`WAVE ${pad(wave, 2)}`, px, ty + 128);
    let tagX = px + ctx.measureText(`WAVE ${pad(wave, 2)}`).width + 14;
    if (newBest) { ctx.fillStyle = c.amber; ctx.fillText('NEW BEST', tagX, ty + 128); tagX += ctx.measureText('NEW BEST').width + 14; }
    let kx = px;
    const ky = ty + 164;
    kx += keycap(kx, ky, 'R', keys.has('r')) + 6;
    setFont(10); ctx.fillStyle = c['ink-subtle']; ctx.fillText('RETRY', kx, ky); kx += ctx.measureText('RETRY').width + 18;
    kx += keycap(kx, ky, 'ESC', false) + 6;
    setFont(10); ctx.fillStyle = c['ink-subtle']; ctx.fillText('LAND', kx, ky);
    drawSticker(x + w - 16, y + 4, a);
  }

  // The best patch earned on this device, as a die-cut sticker stamped across the plate's top-right
  // corner: half on the plate, half off. Slams in from 1.5× with a jolt; Engines Idle just shows it.
  function drawSticker(cx: number, cy: number, plateA: number) {
    const art = everBest > 0 ? patchArt(everBest) : null;
    const t = deadT - STICKER.at;
    if (!isReady(art) || t < 0) return;
    const still = sky.idle(), k = still ? 1 : Math.min(1, t / STICKER.slam);
    const scale = 1 + 0.5 * (1 - k) * (1 - k);
    const r = (STICKER.size / 2) * scale;
    ctx.save();
    ctx.globalAlpha = plateA * k;
    ctx.translate(cx, cy); ctx.rotate(STICKER.tilt * (still ? 1 : 0.6 + 0.4 * k));
    // Die-cut paper edge with a lifted shadow; the shadow tightens as it lands.
    ctx.shadowColor = 'rgba(6,8,16,0.5)'; ctx.shadowBlur = 6 + 18 * (1 - k); ctx.shadowOffsetY = 3 + 10 * (1 - k);
    ctx.fillStyle = sky.light() ? '#FFFFFF' : '#E6E9F2';
    ctx.beginPath(); ctx.arc(0, 0, r + 6, 0, TAU); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.drawImage(art!, -r, -r, r * 2, r * 2);
    // A soft sheen across the vinyl.
    const g = ctx.createLinearGradient(-r, -r, r, r);
    g.addColorStop(0, 'rgba(255,255,255,0.16)'); g.addColorStop(0.45, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r + 6, 0, TAU); ctx.fill();
    // Caption printed on the sticker's tab.
    setFont(9); ctx.fillStyle = c['ink-subtle'];
    const l = `BEST · FL-${pad(everBest, 2)}`;
    ctx.fillText(l, -ctx.measureText(l).width / 2, r + 22);
    ctx.restore();
  }

  // Fullscreen just the hero (the game area). The browser's own Esc leaves fullscreen first;
  // a second Esc lands. Landing also leaves fullscreen.
  function toggleFullscreen() {
    if (!document.fullscreenEnabled) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else hero.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  }

  // ── Input ─────────────────────────────────────────────────────
  window.addEventListener('keydown', (e) => {
    if (phase === 'off' || phase === 'exit') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tg = e.target as HTMLElement | null;
    if (tg && (tg.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName))) return;
    const key = e.key.toLowerCase();
    if (key === 'escape') { e.preventDefault(); exit(); return; }
    if (key === 'f' && !e.repeat) { e.preventDefault(); toggleFullscreen(); return; }
    if (phase === 'dead') {
      if ((key === 'r' || key === 'enter') && deadT > 0.9) { e.preventDefault(); retry(); }
      if (GAME_KEYS.has(key)) e.preventDefault();
      return;
    }
    if (GAME_KEYS.has(key)) { e.preventDefault(); keys.add(key); }
  });
  window.addEventListener('keyup', (e) => { keys.delete(e.key.toLowerCase()); });
  window.addEventListener('blur', () => keys.clear());

  syncHeroPatch();

  return {
    get active() { return phase !== 'off'; },
    get gamma() { return gamma; },
    enter, exit, stepShip, stepWorld, drawUnder, drawOver, drawHud, shake, gift,
    rockAlpha: () => 1,
    releaseKeys: () => keys.clear(),
  };
}

function prune<T>(arr: T[], keep: (x: T) => boolean) {
  let j = 0;
  for (let i = 0; i < arr.length; i++) if (keep(arr[i])) arr[j++] = arr[i];
  arr.length = j;
}
