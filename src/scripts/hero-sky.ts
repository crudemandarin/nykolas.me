// The hero's night sky, drawn on a canvas behind the copy (mounted by src/components/HeroSky.astro).
// Stars sit on the 32px grid intersections and twinkle. The NYKO rocket flies through the middle,
// trailing exhaust and a plotted trajectory; a sun, a ringed planet with the NYKO satellite in orbit,
// a small rocky world with a moon, and Earth with the Moon fill the rest, with two galaxies far behind. Meteors, tagged asteroids and the odd UFO pass
// through. Hovering the rocket (or tapping it) fires the boost: blue flames, harder bob, faster travel,
// and time dilation on everything else. Clicking it starts Flight Mode (src/scripts/flight.ts).
// Follows the Theme and Engines switches.
import { createFlight } from './flight';

export const TAU = Math.PI * 2;
export const rnd = (a: number, b: number) => a + Math.random() * (b - a);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const hex = (h: string) => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const mix = (a: string, b: string, k: number, alpha = 1) => {
  const A = hex(a), B = hex(b);
  return `rgba(${Math.round(lerp(A[0], B[0], k))},${Math.round(lerp(A[1], B[1], k))},${Math.round(lerp(A[2], B[2], k))},${alpha})`;
};
/** Remove items in place (shared arrays must keep their identity). */
export function prune<T>(arr: T[], keep: (x: T) => boolean) {
  let j = 0;
  for (let i = 0; i < arr.length; i++) if (keep(arr[i])) arr[j++] = arr[i];
  arr.length = j;
}

export type Meteor = { x: number; y: number; vx: number; vy: number; len: number; age: number; life: number };
export type Rock = {
  x: number; y: number; vx: number; vy: number; rot: number; vr: number; pts: number[]; r: number; tag: string;
  // Flight Mode only: size class (3 big → 1 small), hit points, hit flash.
  size?: number; hp?: number; flash?: number; beam?: number;
};
// A UFO visit. pass: crosses, sometimes pausing to beam down. scan: pulls up beside the rocket and scans it.
// probe: scans another body (satellite, Moon, NK-4B or its moon, an asteroid). land: scans Earth, then shrinks
// down into it. abduct: grows up out of Earth with a cow in its beam and leaves. rise: grows out of the ringed
// planet and leaves.
export type UfoMode = 'pass' | 'scan' | 'probe' | 'land' | 'abduct' | 'rise';
export type Ufo = {
  x: number; y: number; dir: number; age: number; tilt: number;
  mode: UfoMode; phase: 'in' | 'scan' | 'out' | 'descend' | 'ascend' | 'hold';
  hoverAt: number; hover: number; beam: boolean; scan: number; vx: number; vy: number; outAge: number;
  shield: number; hostile: boolean;
  scale: number;             // 1 = full size; shrinks into and grows out of planets
  t: number;                 // descend/ascend progress (0..1), or the hold timer
  fx: number; fy: number;    // where a descent started
  target?: ProbeTarget; rock?: Rock; cow?: boolean;
  skin: UfoSkin;             // which pilot is flying (public/brand/nyko-ufo[-pink|-purple].svg)
};
export type UfoSkin = 'green' | 'pink' | 'purple';
type ProbeTarget = 'sat' | 'moon' | 'nk4b' | 'nk4bMoon' | 'rock' | 'earth';
export type Ship = {
  hx: number; hy: number; hs: number; base: number; // home pose (hero)
  x: number; y: number; a: number; s: number;
  travel: number; trail: number; bob: number;
  // Render knobs, all 1 in the hero; Flight Mode drives them.
  flame: number; exhaust: number; lines: number; traj: number; pod: number; alpha: number;
  vx: number; vy: number; w: number;
};

/** Laser pod muzzle when deployed, in rocket units (anchor from public/brand/nyko-laser-pod.svg). */
export const POD_MUZZLE = { x: 81, y: -33 };

export interface SkyApi {
  ctx: CanvasRenderingContext2D; hero: HTMLElement; c: Record<string, string>;
  muzzle: { x: number; y: number };
  ship: Ship; rocks: Rock[]; meteors: Meteor[];
  W(): number; H(): number; light(): boolean; idle(): boolean;
  toWorld(lx: number, ly: number): { x: number; y: number };
  heroPose(): { x: number; y: number; a: number };
  ufo(): Ufo | null; ufoRadius(): number;
  drawRock(k: Rock, alpha?: number): void;
  newRockShape(r: number): number[];
  tag(): string;
}

export function initHeroSky() {
  const hero = document.querySelector<HTMLElement>('.hero');
  const cv = hero?.querySelector<HTMLCanvasElement>('canvas.hero-sky');
  const ctx = cv?.getContext('2d');
  if (!hero || !cv || !ctx) return;
  const root = document.documentElement;
  const GRID = 32;

  // Flame palettes: ember (cruise) → blue (boost). Fixed, like the mark.
  const FLAME = { outer: ['#FFB300', '#5FB4FF'], mid: ['#FF4A22', '#2A6BFF'], core: ['#FFF3E0', '#EAF6FF'], inner: ['#FFB300', '#9FD3FF'] };

  // ── Geometry, ported from the NYKO mark (nyko-animated.svg) ──
  // Rocket local frame: nose at +x (187), nozzles at -184.
  const R = {
    nozzles: new Path2D('M -175,-39 L -183,-36.5 L -183,-26.5 L -175,-24 Z M -175,39 L -183,36.5 L -183,26.5 L -175,24 Z M -175,-9 L -184,-7 L -184,7 L -175,9 Z'),
    boosters: new Path2D('M -175,-46 L -98,-40.5 Q -58,-34 -31,-18.5 L -175,-18.5 Z M -175,46 L -98,40.5 Q -58,34 -31,18.5 L -175,18.5 Z'),
    core: new Path2D('M -175,-18 L -60,-17.5 Q 10,-15.5 58,-15.5 L 58,15.5 Q 10,15.5 -60,17.5 L -175,18 Z'),
    coreC: new Path2D('M -175,-15 L -102,-13.5 Q -55,-10.5 -27,0 Q -55,10.5 -102,13.5 L -175,15 Z'),
    inter: new Path2D('M 58,-15.5 L 76,-15.5 L 76,15.5 L 58,15.5 Z'),
    upper: new Path2D('M 76,-15.5 L 120,-15.5 L 120,15.5 L 76,15.5 Z'),
    fairing: new Path2D('M 112,-15.5 L 126,-19.5 L 154,-19.5 Q 174,-18 187,-4 L 187,4 Q 174,18 154,19.5 L 126,19.5 L 112,15.5 Z'),
    band: new Path2D('M 126,-19.5 L 133,-19.5 L 133,19.5 L 126,19.5 Z'),
    lattice: new Path2D('M 58,-15.5 L 76,-7.8 M 76,-15.5 L 58,-7.8 M 58,-7.8 L 76,0 M 76,-7.8 L 58,0 M 58,0 L 76,7.8 M 76,0 L 58,7.8 M 58,7.8 L 76,15.5 M 76,7.8 L 58,15.5'),
    details: new Path2D('M -140,-44 L -140,-19 M -140,44 L -140,19 M -140,-14 L -140,14 M -31,-18.5 Q -58,-34 -98,-40.5 M -31,18.5 Q -58,34 -98,40.5 M -27,0 Q -55,-10.5 -102,-13.5 M -27,0 Q -55,10.5 -102,13.5 M 96,-15.5 V 15.5 M 154,-19.3 V 19.3'),
    outline: new Path2D('M -175,-46 L -98,-40.5 Q -58,-34 -31,-18.5 L -175,-18.5 Z M -175,46 L -98,40.5 Q -58,34 -31,18.5 L -175,18.5 Z M -175,-15 L -102,-13.5 Q -55,-10.5 -27,0 Q -55,10.5 -102,13.5 L -175,15 Z M 112,-15.5 L 126,-19.5 L 154,-19.5 Q 174,-18 187,-4 L 187,4 Q 174,18 154,19.5 L 126,19.5 L 112,15.5 Z M 76,-15.5 L 120,-15.5 L 120,15.5 L 76,15.5 Z M -175,-18 L -60,-17.5 Q 10,-15.5 58,-15.5 M 58,15.5 Q 10,15.5 -60,17.5 L -175,18'),
    nyko: new Path2D('M -160,17 L -160,-17 L -151.5,-17 L -142.5,4.5 L -142.5,-17 L -134,-17 L -134,17 L -142.5,17 L -151.5,-4.5 L -151.5,17 Z M -117.75,-17 L -109.25,-17 L -109.25,-1 L -100.5,12.5 L -100.5,17 L -107,17 L -113.5,5.5 L -120,17 L -126.5,17 L -126.5,12.5 L -117.75,-1 Z M -93,-17 L -84.5,-17 L -84.5,-4 L -74.5,-17 L -67,-17 L -79,0 L -67,17 L -74.5,17 L -84.5,4 L -84.5,17 L -93,17 Z M -51.5,-17 H -41.5 Q -33.5,-17 -33.5,-9 V 9 Q -33.5,17 -41.5,17 H -51.5 Q -59.5,17 -59.5,9 V -9 Q -59.5,-17 -51.5,-17 Z M -48,-8.5 Q -51,-8.5 -51,-5.5 V 5.5 Q -51,8.5 -48,8.5 H -45 Q -42,8.5 -42,5.5 V -5.5 Q -42,-8.5 -45,-8.5 Z'),
  };
  // Engines: nozzle x, centre y, flame half-heights and lengths for the outer, mid and core layers.
  const ENGINES = [
    { x: -183, y: -31.5, h: [7.5, 3.75, 2.25], l: [62, 32, 16] },
    { x: -183, y: 31.5, h: [7.5, 3.75, 2.25], l: [62, 32, 16] },
    { x: -184, y: 0, h: [10.5, 5.25, 3.15], l: [96, 50, 25] },
  ];
  // Satellite (drawn mirrored, as in the mark).
  const S = {
    antennas: new Path2D('M -19,-4 L -29,-12 M -19,4 L -27,14 M -21,0 L -27,0'),
    panels: new Path2D('M 9,-11 L 16,-11 L 21,-40 L 13,-40 Z M 9,11 L 16,11 L 11,40 L 3,40 Z'),
    panelLines: new Path2D('M 10.5,-21 L 17.8,-21 M 12,-31 L 19.3,-31 M 7.5,21 L 14.8,21 M 6,31 L 13.3,31'),
    bus: new Path2D('M 4,-8.5 L 17,-8.5 L 21,-10 L 21,10 L 17,8.5 L 4,8.5 Z'),
    strip: new Path2D('M 7,-8.5 L 10,-8.5 L 10,8.5 L 7,8.5 Z'),
    cone: new Path2D('M -6.5,-4.8 C -3.5,-7.8 1,-9 4,-9 L 4,9 C 1,9 -3.5,7.8 -6.5,4.8 Z'),
    dishArc: new Path2D('M -11.2,-7 A 7.5 7.5 0 0 1 -11.2,7'),
  };
  // Laser pod, ported from public/brand/nyko-laser-pod.svg (rocket units; see its header for the linkage).
  const POD = {
    mount: new Path2D('M 9,-15.93 L 12,-19.5 L 40,-19.5 L 43,-15.55 L 43,-14.95 L 40.17,-14.96 L 37.33,-14.98 L 34.5,-15.01 L 31.67,-15.03 L 28.83,-15.06 L 26,-15.09 L 23.17,-15.13 L 20.33,-15.16 L 17.5,-15.2 L 14.67,-15.24 L 11.83,-15.28 L 9,-15.33 Z'),
    housing: new Path2D('M -10,-3.7 Q -10,-5.7 -8,-5.7 L 20,-5.7 L 26,-4.4 L 26,-0.6 L 20,0.8 L -8,0.8 Q -10,0.8 -10,-1.2 Z'),
    seam: new Path2D('M 9,-5.7 V 0.8'),
    hinges: [16, 36], arm: 13,
  };
  // Speed lines streaming past the rocket, from the mark: [y, length, width, alpha, rate].
  const SPEED: [number, number, number, number, number][] = [
    [-142, 120, 2.4, 0.4, 1 / 2.1], [-104, 70, 1.8, 0.3, 1 / 1.7], [-64, 95, 2.2, 0.36, 1 / 2.4], [52, 60, 1.8, 0.26, 1 / 1.5],
    [96, 110, 2.4, 0.42, 1 / 2.2], [138, 75, 1.8, 0.3, 1 / 1.8], [170, 55, 1.6, 0.22, 1 / 1.4], [-178, 60, 1.6, 0.22, 1 / 1.6],
    [-28, 65, 1.4, 0.18, 1 / 1.2], [24, 85, 1.5, 0.2, 1 / 1.35], [66, 50, 1.3, 0.15, 1 / 1.1],
  ];
  const speedPhase = SPEED.map(() => Math.random());

  type Star = { x: number; y: number; r: number; p: number; s: number; big: boolean };
  type Puff = { x: number; y: number; vx: number; vy: number; age: number; life: number; r: number };

  let W = 0, H = 0, light = false, idle = false, visible = true, raf = 0, last = 0, t = rnd(0, 100);
  // World clock: everything outside the rocket. Under boost it runs slow by γ (time dilation).
  let wt = t, gamma = 1;
  let stars: Star[] = [], ufo: Ufo | null = null;
  const meteors: Meteor[] = [], rocks: Rock[] = [], puffs: Puff[] = [];
  let nextMeteor = rnd(1, 3), nextRock = rnd(3, 8), nextUfo = /[?&]ufo=/.test(location.search) ? 1.5 : rnd(10, 18), ufoVisits = 0, puffClock = 0;
  const c: Record<string, string> = {};

  // Bodies are laid out in layout() so they scale with the hero.
  let sun = { x: 0, y: 0, r: 0 }, planet = { x: 0, y: 0, r: 0 }, rocky = { x: 0, y: 0, r: 0 }, earth = { x: 0, y: 0, r: 0 }, fade = 1;
  type Galaxy = { x: number; y: number; R: number; tilt: number; kind: 'spiral' | 'lens'; seed: number; img: HTMLCanvasElement };
  let galaxies: Galaxy[] = [];
  let craters: [number, number, number][] = [];

  const ship: Ship = {
    hx: 0, hy: 0, hs: 0.6, base: -0.56, x: 0, y: 0, a: 0, s: 0.6, travel: 0, trail: 0, bob: 0,
    flame: 1, exhaust: 1, lines: 1, traj: 1, pod: 0, alpha: 1, vx: 0, vy: 0, w: 0,
  };
  let boost = 0, hovering = false, tapUntil = 0, hoverTime = 0;

  function readColors() {
    const s = getComputedStyle(root);
    for (const k of ['ink', 'ink-subtle', 'ink-muted', 'ember', 'ember-text', 'amber', 'flame-core', 'signal', 'brand-blue', 'deep-indigo', 'hull-xlight', 'hull-light', 'hull-mid', 'hull-shadow', 'surface-100', 'surface-200', 'on-ember', 'line', 'line-strong', 'nominal', 'caution'])
      c[k] = s.getPropertyValue('--' + k).trim();
    light = root.dataset.theme === 'light';
    const wasIdle = idle;
    idle = root.dataset.motion === 'idle';
    if (wasIdle && !idle) { wt0 = wt; spunPx = 0; } // engines back on: re-bake and resume from the resting pose
  }

  function layout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = hero!.clientWidth; H = hero!.clientHeight;
    cv!.width = Math.round(W * dpr); cv!.height = Math.round(H * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Grid lines sit at 32k - 1 (background-position: -1px -1px).
    stars = [];
    for (let i = 1; i * GRID < W; i++) for (let j = 1; j * GRID < H; j++) {
      if (Math.random() > 0.075) continue;
      const big = Math.random() < 0.14;
      stars.push({ x: i * GRID - 0.5, y: j * GRID - 0.5, r: big ? rnd(1.2, 1.8) : rnd(0.6, 1.2), p: rnd(0, TAU), s: rnd(0.35, 1.3), big });
    }

    const narrow = W < 900;
    if (narrow) {
      // Phones: the copy stacks below a 260px sky band (see .hero .wrap padding in site.css).
      fade = 0.75;
      sun = { x: W + 6, y: 46, r: 46 };
      planet = { x: W * 0.84, y: 205, r: 26 };
      rocky = { x: W * 0.1, y: 215, r: 7 };
      earth = { x: W * 0.2, y: 70, r: 15 };
      galaxies = [mkGalaxy(W * 0.62, 50, 28, -0.5, 'spiral', 7)];
      Object.assign(ship, { hx: W * 0.46, hy: 140, hs: Math.min(0.42, W / 1000), base: -0.5 });
    } else {
      const k = Math.min(1, W / 1440);
      fade = 1;
      sun = { x: W - 40, y: 170, r: 58 * k + 16 };
      planet = { x: W * 0.86, y: H * 0.72, r: 62 * k + 16 };
      rocky = { x: W * 0.57, y: H * 0.84, r: 13 * k + 5 };
      earth = { x: W * 0.5, y: H * 0.2, r: 26 * k + 10 };
      galaxies = [mkGalaxy(W * 0.33, H * 0.14, 46 * k + 12, -0.4, 'spiral', 7), mkGalaxy(W * 0.43, H * 0.9, 26 * k + 8, 0.32, 'lens', 3)];
      Object.assign(ship, { hx: W * 0.69, hy: H * 0.42, hs: Math.max(0.45, Math.min(0.72, 0.66 * W / 1440)), base: -0.56 });
    }
    // In Flight Mode the player owns the ship's pose; just keep it on screen.
    if (flight.active) { ship.x = Math.min(ship.x, W); ship.y = Math.min(ship.y, H); }
    else { ship.x = ship.hx; ship.y = ship.hy; ship.a = ship.base; ship.s = ship.hs; }
    ufoK = narrow ? 0.24 : 0.38; bakeUfo();
    craters = Array.from({ length: 4 }, () => [rnd(-0.5, 0.5), rnd(-0.5, 0.5), rnd(0.12, 0.26)]);
    bakeGalaxies();
  }

  // ── Deep field: two far galaxies, baked once per layout/theme (they don't move on any human clock) ──
  function mkGalaxy(x: number, y: number, R: number, tilt: number, kind: Galaxy['kind'], seed: number): Galaxy {
    return { x, y, R, tilt, kind, seed, img: document.createElement('canvas') };
  }
  function bakeGalaxies() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const g of galaxies) {
      let z = g.seed * 2654435761 >>> 0; // seeded, so a resize doesn't reshuffle the arms
      const rand = () => ((z = (z + 0x6D2B79F5) >>> 0), (((z ^ (z >>> 15)) * (z | 1)) >>> 0) / 4294967296);
      const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5;
      const size = Math.ceil(g.R * 2.4), b = g.img, x = b.getContext('2d')!;
      b.width = b.height = Math.ceil(size * dpr);
      x.setTransform(dpr, 0, 0, dpr, (size / 2) * dpr, (size / 2) * dpr); // origin at the centre, CSS px
      const ct = Math.cos(g.tilt), st = Math.sin(g.tilt), squash = g.kind === 'spiral' ? 0.42 : 0.2;
      const put = (px: number, py: number) => [px * ct - py * squash * st, px * st + py * squash * ct];
      // Disc haze, then the core glow.
      x.save(); x.rotate(g.tilt); x.scale(1, squash);
      const haze = x.createRadialGradient(0, 0, 0, 0, 0, g.R);
      haze.addColorStop(0, light ? 'rgba(50,56,201,0.16)' : 'rgba(138,147,255,0.2)'); haze.addColorStop(1, 'rgba(138,147,255,0)');
      x.fillStyle = haze; x.beginPath(); x.arc(0, 0, g.R, 0, TAU); x.fill();
      x.restore();
      const coreR = g.R * (g.kind === 'spiral' ? 0.32 : 0.75);
      x.save(); x.rotate(g.tilt); x.scale(1, g.kind === 'spiral' ? 0.6 : 0.3);
      const glow = x.createRadialGradient(0, 0, 0, 0, 0, coreR);
      glow.addColorStop(0, light ? c['ink-muted'] : c['hull-xlight']); glow.addColorStop(0.35, light ? c['ink-subtle'] : c.amber); glow.addColorStop(1, 'transparent');
      x.globalAlpha = light ? 0.35 : 0.45; x.fillStyle = glow; x.beginPath(); x.arc(0, 0, coreR, 0, TAU); x.fill();
      x.restore();
      // Stars: two trailing arms plus a thin disk for the spiral; a gaussian swarm for the lens.
      const dot = (px: number, py: number, r: number, a: number, blue: boolean) => {
        const [qx, qy] = put(px, py);
        x.globalAlpha = a; x.fillStyle = blue ? c.signal : light ? c['ink-muted'] : c['hull-xlight'];
        x.fillRect(qx - r / 2, qy - r / 2, r, r);
      };
      if (g.kind === 'spiral') {
        for (let arm = 0; arm < 2; arm++) for (let i = 0; i < 260; i++) {
          const u = Math.pow(rand(), 0.9), rad = g.R * (0.12 + 0.88 * u) * (1 + gauss() * 0.09), ang = arm * Math.PI + u * 3.4 + gauss() * (0.5 - u * 0.25);
          dot(Math.cos(ang) * rad, Math.sin(ang) * rad, rand() < 0.12 ? 1.5 : 1, (1 - u * 0.55) * (0.3 + 0.7 * rand()), rand() < 0.4);
        }
        for (let i = 0; i < 120; i++) { const ang = rand() * TAU, rad = g.R * Math.pow(rand(), 0.6); dot(Math.cos(ang) * rad, Math.sin(ang) * rad, 0.7, 0.35 * rand(), false); }
      } else {
        for (let i = 0; i < 160; i++) dot(gauss() * g.R * 0.7, gauss() * g.R * 0.7, rand() < 0.08 ? 1.3 : 0.8, 0.75 * rand(), rand() < 0.15);
      }
    }
  }
  function drawGalaxies() {
    ctx!.save(); ctx!.globalAlpha = fade * (light ? 0.6 : 0.75);
    for (const g of galaxies) { const size = Math.ceil(g.R * 2.4); ctx!.drawImage(g.img, g.x - size / 2, g.y - size / 2, size, size); }
    ctx!.restore();
  }

  // ── Static bodies ─────────────────────────────────────────────
  function drawSun() {
    const { x, y, r } = sun;
    ctx!.save();
    const glow = ctx!.createRadialGradient(x, y, r * 0.6, x, y, r * 3.2);
    glow.addColorStop(0, c.amber); glow.addColorStop(1, 'transparent');
    ctx!.globalAlpha = fade * (light ? 0.18 : 0.22);
    ctx!.fillStyle = glow; ctx!.beginPath(); ctx!.arc(x, y, r * 3.2, 0, TAU); ctx!.fill();
    ctx!.globalAlpha = fade;
    const disc = ctx!.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    disc.addColorStop(0, c['flame-core']); disc.addColorStop(0.45, c.amber); disc.addColorStop(1, c.ember);
    ctx!.fillStyle = disc; ctx!.beginPath(); ctx!.arc(x, y, r, 0, TAU); ctx!.fill();
    // Corona: dashed survey rings turning slowly in opposite directions.
    ctx!.lineWidth = 1; ctx!.strokeStyle = c.amber;
    ([[1.35, 0.05, [2, 6]], [1.7, -0.03, [10, 8]], [2.15, 0.02, [1, 10]]] as [number, number, number[]][]).forEach(([m, w, dash], i) => {
      ctx!.globalAlpha = fade * (0.55 - i * 0.14);
      ctx!.setLineDash(dash); ctx!.lineDashOffset = -wt * w * 200;
      ctx!.beginPath(); ctx!.arc(x, y, r * m, 0, TAU); ctx!.stroke();
    });
    ctx!.restore();
  }

  function ringHalf(front: boolean) {
    const { x, y, r } = planet;
    ctx!.save();
    ctx!.translate(x, y); ctx!.rotate(-0.38);
    ctx!.globalAlpha = fade * 0.9;
    ctx!.strokeStyle = c['hull-light']; ctx!.lineWidth = 2.5;
    ctx!.beginPath(); ctx!.ellipse(0, 0, r * 1.75, r * 0.38, 0, front ? 0 : Math.PI, front ? Math.PI : TAU); ctx!.stroke();
    ctx!.globalAlpha = fade * 0.5; ctx!.lineWidth = 1; ctx!.strokeStyle = c['hull-mid'];
    ctx!.beginPath(); ctx!.ellipse(0, 0, r * 2.05, r * 0.46, 0, front ? 0 : Math.PI, front ? Math.PI : TAU); ctx!.stroke();
    ctx!.restore();
  }

  function drawPlanet() {
    const { x, y, r } = planet;
    ctx!.save(); ctx!.globalAlpha = fade;
    ctx!.beginPath(); ctx!.arc(x, y, r, 0, TAU); ctx!.clip();
    const g = ctx!.createLinearGradient(x - r, y - r, x + r, y + r);
    g.addColorStop(0, c.signal); g.addColorStop(0.55, c['brand-blue']); g.addColorStop(1, c['deep-indigo']);
    ctx!.fillStyle = g; ctx!.fillRect(x - r, y - r, r * 2, r * 2);
    // Cloud bands, tilted with the ring and drifting.
    ctx!.translate(x, y); ctx!.rotate(-0.38);
    const drift = (wt * 6) % (r * 2);
    [[-0.55, 0.08], [-0.25, 0.14], [0.1, 0.06], [0.38, 0.12], [0.66, 0.05]].forEach(([b, h], i) => {
      ctx!.globalAlpha = fade * (i % 2 ? 0.16 : 0.24);
      ctx!.fillStyle = i % 2 ? c['deep-indigo'] : c['hull-xlight'];
      ctx!.fillRect(-r * 2 + drift * (i % 2 ? -1 : 1) * 0.3, b * r, r * 4, h * r);
    });
    ctx!.rotate(0.38); ctx!.translate(-x, -y);
    // Terminator: the night side away from the sun (upper right).
    const sh = ctx!.createLinearGradient(x + r * 0.5, y - r * 0.5, x - r * 0.9, y + r * 0.9);
    sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(0.55, 'rgba(0,0,0,0.05)'); sh.addColorStop(1, light ? 'rgba(10,13,24,0.45)' : 'rgba(10,13,24,0.75)');
    ctx!.globalAlpha = fade; ctx!.fillStyle = sh; ctx!.fillRect(x - r, y - r, r * 2, r * 2);
    ctx!.restore();
    // Limb highlight on the sun side.
    ctx!.save(); ctx!.globalAlpha = fade * 0.7; ctx!.strokeStyle = c['hull-xlight']; ctx!.lineWidth = 1.5;
    ctx!.beginPath(); ctx!.arc(x, y, r - 0.75, -Math.PI * 0.95, -Math.PI * 0.05); ctx!.stroke(); ctx!.restore();
  }

  // The NYKO satellite works a tilted orbit around the ringed planet.
  const satOrbit = () => ({ rx: planet.r * 2.6, ry: planet.r * 0.85, tilt: -0.22 });
  function satPos() {
    const { rx, ry, tilt } = satOrbit(), a = wt * 0.28;
    const ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
    const tx = -Math.sin(a) * rx, ty = Math.cos(a) * ry; // tangent
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    return {
      x: planet.x + ex * ct - ey * st, y: planet.y + ex * st + ey * ct,
      heading: Math.atan2(tx * st + ty * ct, tx * ct - ty * st),
      front: Math.sin(a) > 0, depth: 1 + 0.16 * Math.sin(a),
    };
  }
  function drawSatOrbit() {
    const { rx, ry, tilt } = satOrbit();
    ctx!.save(); ctx!.globalAlpha = fade * 0.55; ctx!.strokeStyle = c['line-strong']; ctx!.lineWidth = 1; ctx!.setLineDash([3, 5]);
    ctx!.beginPath(); ctx!.ellipse(planet.x, planet.y, rx, ry, tilt, 0, TAU); ctx!.stroke();
    ctx!.restore();
  }
  function drawSatellite() {
    const p = satPos(), k = (W < 900 ? 0.32 : 0.5) * p.depth;
    ctx!.save(); ctx!.globalAlpha = fade;
    ctx!.translate(p.x, p.y); ctx!.rotate(p.heading); ctx!.scale(-k, k);
    ctx!.lineJoin = 'round';
    ctx!.strokeStyle = '#9AA4BE'; ctx!.lineWidth = 1.1; ctx!.stroke(S.antennas);
    ctx!.strokeStyle = '#1E2233'; ctx!.lineWidth = 1;
    ctx!.fillStyle = '#3238C9'; ctx!.fill(S.panels); ctx!.stroke(S.panels);
    ctx!.strokeStyle = '#C9CFDE'; ctx!.lineWidth = 0.8; ctx!.stroke(S.panelLines);
    ctx!.strokeStyle = '#1E2233'; ctx!.lineWidth = 1;
    ctx!.fillStyle = '#C9CFDE'; ctx!.fill(S.bus); ctx!.stroke(S.bus);
    ctx!.fillStyle = '#525C7A'; ctx!.fill(S.strip);
    ctx!.fillStyle = '#9AA4BE'; ctx!.fill(S.cone); ctx!.stroke(S.cone);
    ctx!.fillStyle = '#C9CFDE'; ctx!.beginPath(); ctx!.arc(-13, 0, 7.5, 0, TAU); ctx!.fill(); ctx!.stroke();
    ctx!.strokeStyle = '#525C7A'; ctx!.lineWidth = 2; ctx!.stroke(S.dishArc);
    ctx!.restore();
  }

  // ── Earth and the Moon ─────────────────────────────────────────
  // Art: public/brand/nyko-earth.svg and nyko-moon.svg (unlit, origin at the centre; source
  // brand/round-2-iconography/gen_earth.mjs). They're baked to offscreen canvases at the drawn size;
  // the halo, night side and Moon phase are drawn here so lighting follows the sun on every layout.
  type Body = { img: HTMLImageElement; bake: HTMLCanvasElement; ready: boolean; half: number; disc: number; px: number };
  const mkBody = (src: string, half: number, disc: number): Body => {
    const b: Body = { img: new Image(), bake: document.createElement('canvas'), ready: false, half, disc, px: 0 };
    b.img.onload = () => { b.ready = true; b.px = 0; if (idle && !flight.active) draw(); }; // idle sky only redraws on demand
    b.img.src = src;
    return b;
  };
  const EARTH_SVG = mkBody('/brand/nyko-earth.svg', 64, 60), MOON = mkBody('/brand/nyko-moon.svg', 16, 15);
  // Draws a body's art so its disc has radius r at (x, y); re-bakes only when the size changes.
  function drawBody(b: Body, x: number, y: number, r: number, fallback: string) {
    const size = (b.half / b.disc) * r, px = Math.ceil(size * 2 * Math.min(window.devicePixelRatio || 1, 2));
    if (b.ready && b.px !== px) {
      b.bake.width = b.bake.height = px; b.px = px;
      b.bake.getContext('2d')!.drawImage(b.img, 0, 0, px, px);
    }
    if (b.ready) ctx!.drawImage(b.bake, x - size, y - size, size * 2, size * 2);
    else { ctx!.fillStyle = fallback; ctx!.fillRect(x - r, y - r, r * 2, r * 2); }
  }
  // Spinning Earth (docs/claude/handoffs/EARTH-SPIN-HANDOFF.md). The art module (+ d3-geo, shared with the
  // Travel Log globe) loads after first paint, only while the engines are armed. It starts at REST_LON, the
  // static SVG's pose, so the swap doesn't jump. Decoration only: nothing here touches pointer handling.
  type EarthArt = typeof import('../../brand/round-2-iconography/earth-art');
  let earthArt: EarthArt | null = null, earthLoading = false, wt0 = 0, spunLon = NaN, spunPx = 0;
  const spinBake = document.createElement('canvas');
  function loadSpin() {
    if (earthArt || earthLoading || idle) return;
    earthLoading = true;
    import('../../brand/round-2-iconography/earth-art')
      .then((m) => { earthArt = m; wt0 = wt; })
      .catch(() => { earthLoading = false; }); // keep the static SVG; try again on the next restart
  }
  function drawSpin(x: number, y: number, r: number): boolean {
    if (!earthArt || idle) return false;
    const { EARTH, earthLayers } = earthArt, el = wt - wt0;
    const lon = EARTH.REST_LON - EARTH.SPIN * el;
    const size = (EARTH.HALF / EARTH.R) * r, px = Math.ceil(size * 2 * Math.min(window.devicePixelRatio || 1, 2));
    if (px !== spunPx || !(Math.abs(lon - spunLon) < (W < 900 ? 1 : 0.5))) { // NaN-safe
      const L = earthLayers(((lon % 360) + 540) % 360 - 180, el % 360);
      if (spinBake.width !== px) spinBake.width = spinBake.height = px;
      const b = spinBake.getContext('2d')!, k = px / (EARTH.HALF * 2);
      b.setTransform(k, 0, 0, k, px / 2, px / 2);
      b.clearRect(-EARTH.HALF, -EARTH.HALF, EARTH.HALF * 2, EARTH.HALF * 2);
      b.save();
      const sea = b.createLinearGradient(-42, -42, 42, 42);
      sea.addColorStop(0, EARTH.ocean[0]); sea.addColorStop(1, EARTH.ocean[1]);
      b.beginPath(); b.arc(0, 0, EARTH.R, 0, TAU); b.fillStyle = sea; b.fill(); b.clip();
      b.fillStyle = EARTH.land; b.fill(new Path2D(L.land));
      const ice = b.createLinearGradient(0, -60, 0, -30);
      ice.addColorStop(0, EARTH.ice[0]); ice.addColorStop(1, EARTH.ice[1]);
      b.fillStyle = ice; b.fill(new Path2D(L.ice));
      b.fillStyle = EARTH.cloud; b.fill(new Path2D(L.clouds));
      b.restore();
      spunLon = lon; spunPx = px;
    }
    ctx!.drawImage(spinBake, x - size, y - size, size * 2, size * 2);
    return true;
  }

  const moonPos = () => {
    const { x, y, r } = earth, a = wt * 0.32, tilt = 0.18;
    const ex = Math.cos(a) * r * 2.3, ey = Math.sin(a) * r * 0.5;
    return { x: x + ex * Math.cos(tilt) - ey * Math.sin(tilt), y: y + ex * Math.sin(tilt) + ey * Math.cos(tilt), front: Math.sin(a) > 0, r: Math.max(3, r * 0.27) };
  };
  function shadeFrom(x: number, y: number, r: number, strength: number) {
    // Night side: a gradient running away from the sun, across a disc that's already clipped.
    const a = Math.atan2(sun.y - y, sun.x - x), dx = Math.cos(a) * r, dy = Math.sin(a) * r;
    const g = ctx!.createLinearGradient(x + dx * 0.4, y + dy * 0.4, x - dx, y - dy);
    g.addColorStop(0, 'rgba(10,13,24,0)'); g.addColorStop(0.3, 'rgba(10,13,24,0.15)'); g.addColorStop(1, `rgba(10,13,24,${strength})`);
    ctx!.fillStyle = g; ctx!.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function drawMoon(m: ReturnType<typeof moonPos>) {
    ctx!.save(); ctx!.globalAlpha = fade;
    ctx!.beginPath(); ctx!.arc(m.x, m.y, m.r, 0, TAU); ctx!.clip();
    drawBody(MOON, m.x, m.y, m.r, c['hull-light']);
    shadeFrom(m.x, m.y, m.r, light ? 0.5 : 0.8);
    ctx!.restore();
  }
  function drawEarth() {
    const { x, y, r } = earth, moon = moonPos();
    // The Moon's orbit, faint and dashed like the satellite's.
    ctx!.save(); ctx!.globalAlpha = fade * 0.4; ctx!.strokeStyle = c['line-strong']; ctx!.lineWidth = 1; ctx!.setLineDash([2, 5]);
    ctx!.beginPath(); ctx!.ellipse(x, y, r * 2.3, r * 0.5, 0.18, 0, TAU); ctx!.stroke(); ctx!.restore();
    if (!moon.front) drawMoon(moon);
    ctx!.save(); ctx!.globalAlpha = fade;
    // Atmosphere: a thin blue halo just off the limb.
    const atm = ctx!.createRadialGradient(x, y, r * 0.9, x, y, r * 1.28);
    atm.addColorStop(0, 'rgba(124,196,255,0.45)'); atm.addColorStop(1, 'rgba(124,196,255,0)');
    ctx!.fillStyle = atm; ctx!.beginPath(); ctx!.arc(x, y, r * 1.28, 0, TAU); ctx!.fill();
    ctx!.beginPath(); ctx!.arc(x, y, r, 0, TAU); ctx!.clip();
    if (!drawSpin(x, y, r)) drawBody(EARTH_SVG, x, y, r, '#1C5FAE');
    shadeFrom(x, y, r, light ? 0.6 : 0.88);
    ctx!.restore();
    if (moon.front) drawMoon(moon);
  }

  function rockyMoonPos() {
    const { x, y, r } = rocky, a = wt * 0.6;
    return { x: x + Math.cos(a) * r * 2.4, y: y + Math.sin(a) * r * 0.8, r: Math.max(2, r * 0.22), front: Math.sin(a) > 0 };
  }
  function drawRocky() {
    const { x, y, r } = rocky;
    ctx!.save(); ctx!.globalAlpha = fade;
    ctx!.beginPath(); ctx!.arc(x, y, r, 0, TAU); ctx!.fillStyle = c.ember; ctx!.fill(); ctx!.clip();
    ctx!.fillStyle = 'rgba(10,13,24,0.25)';
    for (const [cx, cy, cr] of craters) { ctx!.beginPath(); ctx!.arc(x + cx * r, y + cy * r, cr * r, 0, TAU); ctx!.fill(); }
    ctx!.fillStyle = 'rgba(10,13,24,0.45)'; ctx!.beginPath(); ctx!.arc(x - r * 0.45, y + r * 0.45, r, 0, TAU); ctx!.fill();
    ctx!.restore();
    // A small moon on a tight orbit.
    const m = rockyMoonPos();
    if (m.front || Math.hypot(m.x - x, m.y - y) > r) {
      ctx!.save(); ctx!.globalAlpha = fade; ctx!.fillStyle = c['hull-light'];
      ctx!.beginPath(); ctx!.arc(m.x, m.y, m.r, 0, TAU); ctx!.fill(); ctx!.restore();
    }
    // Callout, blueprint style.
    if (W >= 900) {
      ctx!.save(); ctx!.globalAlpha = 0.8; ctx!.strokeStyle = c['ink-subtle']; ctx!.fillStyle = c['ink-subtle']; ctx!.lineWidth = 1;
      ctx!.beginPath(); ctx!.moveTo(x + r + 4, y - r - 4); ctx!.lineTo(x + r + 22, y - r - 22); ctx!.lineTo(x + r + 60, y - r - 22); ctx!.stroke();
      ctx!.font = '500 10px "IBM Plex Mono", monospace'; ctx!.fillText('NK-4B', x + r + 24, y - r - 27);
      ctx!.restore();
    }
  }

  function drawStars() {
    ctx!.save();
    ctx!.fillStyle = light ? c.ink : c['hull-xlight'];
    ctx!.strokeStyle = ctx!.fillStyle;
    // Under boost the stars smear back along the rocket's heading.
    const bx = -Math.cos(ship.a), by = -Math.sin(ship.a), smear = boost * 14;
    // Doppler: stars ahead of the rocket shift blue, stars behind shift red.
    const base = light ? c.ink : c['hull-xlight'], shift = boost * 0.75;
    for (const s of stars) {
      if (shift > 0.01) {
        const dx = s.x - ship.x, dy = s.y - ship.y, d = Math.hypot(dx, dy) || 1;
        const ahead = -(dx * bx + dy * by) / d;
        ctx!.fillStyle = ctx!.strokeStyle = mix(base, ahead > 0 ? '#7CC4FF' : '#FF8A66', shift * Math.abs(ahead));
      }
      const tw = idle && !flight.active ? 0.6 : Math.pow(0.5 + 0.5 * Math.sin(wt * s.s + s.p), 3);
      const a = (0.12 + 0.88 * tw) * (light ? 0.55 : 1);
      ctx!.globalAlpha = a;
      ctx!.beginPath(); ctx!.arc(s.x, s.y, s.r, 0, TAU); ctx!.fill();
      if (smear > 0.5) {
        ctx!.globalAlpha = a * 0.7; ctx!.lineWidth = s.r * 1.4; ctx!.lineCap = 'round';
        ctx!.beginPath(); ctx!.moveTo(s.x, s.y); ctx!.lineTo(s.x + bx * smear * s.r, s.y + by * smear * s.r); ctx!.stroke();
      } else if (s.big && tw > 0.35) {
        const L = 3 + 5 * tw;
        ctx!.globalAlpha = a * 0.6; ctx!.lineWidth = 1;
        ctx!.beginPath(); ctx!.moveTo(s.x - L, s.y); ctx!.lineTo(s.x + L, s.y); ctx!.moveTo(s.x, s.y - L); ctx!.lineTo(s.x, s.y + L); ctx!.stroke();
      }
    }
    ctx!.restore();
  }

  // ── Rocket ────────────────────────────────────────────────────
  const toWorld = (lx: number, ly: number) => {
    const ca = Math.cos(ship.a), sa = Math.sin(ship.a);
    return { x: ship.x + (lx * ca - ly * sa) * ship.s, y: ship.y + (lx * sa + ly * ca) * ship.s };
  };
  function hitsShip(px: number, py: number) {
    const dx = (px - ship.x) / ship.s, dy = (py - ship.y) / ship.s;
    const ca = Math.cos(-ship.a), sa = Math.sin(-ship.a);
    const lx = dx * ca - dy * sa, ly = dx * sa + dy * ca;
    return lx > -230 && lx < 200 && Math.abs(ly) < 56;
  }

  // Where the hero drift would put the rocket right now (Flight Mode glides home to this).
  function heroPose() {
    const ba = 1 + 0.5 * boost, b = ship.bob;
    const wx = Math.sin(t * 0.21) * 34 + Math.sin(b * TAU / 7.3) * 7 * ba;
    const wy = Math.sin(t * 0.34 + 1) * 22 + Math.sin(b * TAU / 5.1) * 5 * ba;
    const surge = boost * 16;
    return {
      x: ship.hx + wx + Math.cos(ship.base) * surge,
      y: ship.hy + wy + Math.sin(ship.base) * surge,
      a: ship.base + Math.sin(b * TAU / 5.9) * 0.025 * ba + Math.cos(t * 0.34 + 1) * 0.04,
    };
  }

  function stepShip(dt: number) {
    const target = !flight.active && (hovering || performance.now() < tapUntil) ? 1 : 0;
    boost += (target - boost) * Math.min(1, dt * (target ? 3 : 2));
    if (Math.abs(target - boost) < 0.002) boost = target;
    hoverTime = hovering && !flight.active ? hoverTime + dt : 0;
    // The bob runs on its own clock so speeding it up never jumps its phase.
    ship.bob += dt * (1 + 0.6 * boost);
    if (flight.active) return; // Flight Mode moves the ship.
    const speed = 1 + 2.4 * boost;
    ship.travel += dt * speed;
    ship.trail += dt * speed * 60;
    const p = heroPose();
    ship.x = p.x; ship.y = p.y; ship.a = p.a;
  }

  function spawnPuffs(dt: number) {
    puffClock += dt * (26 + 40 * boost) * ship.exhaust;
    while (puffClock >= 1) {
      puffClock -= 1;
      const e = ENGINES[Math.floor(Math.random() * 3)];
      const p = toWorld(e.x - e.l[0] * rnd(0.6, 1) * Math.min(1, ship.flame), e.y + rnd(-4, 4));
      const back = ship.a + Math.PI + rnd(-0.12, 0.12), sp = (70 + 160 * boost) * rnd(0.7, 1.2);
      puffs.push({ x: p.x, y: p.y, vx: Math.cos(back) * sp + ship.vx * 0.5, vy: Math.sin(back) * sp + ship.vy * 0.5, age: 0, life: rnd(1.1, 2.2), r: rnd(1.5, 3.5) * ship.s * 1.6 });
    }
  }
  function drawPuffs() {
    ctx!.save();
    ctx!.fillStyle = c['hull-mid'];
    for (const p of puffs) {
      const k = p.age / p.life;
      ctx!.globalAlpha = (1 - k) * (light ? 0.22 : 0.18);
      ctx!.beginPath(); ctx!.arc(p.x, p.y, p.r * (1 + k * 4), 0, TAU); ctx!.fill();
    }
    ctx!.restore();
  }

  // The plotted course behind the rocket: a dashed curve fading out, ticking past as it flies.
  function drawTrajectory() {
    if (ship.traj <= 0.01) return;
    const tail = toWorld(-190, 0), back = ship.a + Math.PI, L = Math.max(W, 700) * 0.7;
    const bend = 0.35;
    const c1 = { x: tail.x + Math.cos(back) * L * 0.5, y: tail.y + Math.sin(back) * L * 0.5 };
    const end = { x: tail.x + Math.cos(back + bend) * L, y: tail.y + Math.sin(back + bend) * L };
    const g = ctx!.createLinearGradient(tail.x, tail.y, end.x, end.y);
    g.addColorStop(0, light ? c['ink-subtle'] : c['hull-mid']); g.addColorStop(1, 'transparent');
    ctx!.save();
    ctx!.strokeStyle = g; ctx!.lineWidth = 1.2; ctx!.globalAlpha = 0.6 * ship.traj;
    ctx!.setLineDash([8, 10]); ctx!.lineDashOffset = -ship.trail; // negative: dashes stream away from the tail
    ctx!.beginPath(); ctx!.moveTo(tail.x, tail.y); ctx!.quadraticCurveTo(c1.x, c1.y, end.x, end.y); ctx!.stroke();
    ctx!.restore();
  }

  function flame(e: typeof ENGINES[number], i: number, fill: string | CanvasGradient, flick: number) {
    const h = e.h[i], len = e.l[i] * flick * (1 + 0.45 * boost) * ship.flame, x0 = e.x, y = e.y;
    ctx!.fillStyle = fill;
    ctx!.beginPath();
    ctx!.moveTo(x0, y - h);
    ctx!.bezierCurveTo(x0 - 16, y - h - 1.5, x0 - len * 0.5, y - h / 2, x0 - len, y);
    ctx!.bezierCurveTo(x0 - len * 0.5, y + h / 2, x0 - 16, y + h + 1.5, x0, y + h);
    ctx!.closePath(); ctx!.fill();
  }

  function drawPod() {
    const k = ship.pod, a = (Math.PI / 180) * (180 + 90 * (k * k * (3 - 2 * k)));
    const INK = '#1E2233';
    ctx!.save();
    ctx!.lineJoin = 'round';
    // Mount plate and hinge pins.
    ctx!.fillStyle = '#525C7A'; ctx!.fill(POD.mount); ctx!.strokeStyle = INK; ctx!.lineWidth = 1; ctx!.stroke(POD.mount);
    ctx!.fillStyle = INK;
    for (const hx of POD.hinges) { ctx!.beginPath(); ctx!.arc(hx, -17.5, 1.6, 0, TAU); ctx!.fill(); }
    // Parallelogram arms: both swing by the same angle, so the gun stays level.
    for (const hx of POD.hinges) {
      ctx!.save(); ctx!.translate(hx, -17.5); ctx!.rotate(a);
      ctx!.beginPath();
      if ('roundRect' in ctx!) ctx!.roundRect(-2.2, -2.2, 17.4, 4.4, 2.2); else ctx!.rect(-2.2, -2.2, 17.4, 4.4);
      ctx!.fillStyle = '#9AA4BE'; ctx!.fill(); ctx!.strokeStyle = INK; ctx!.lineWidth = 1; ctx!.stroke();
      ctx!.fillStyle = INK; ctx!.beginPath(); ctx!.arc(13, 0, 1.2, 0, TAU); ctx!.fill();
      ctx!.restore();
    }
    // Gun.
    ctx!.translate(16 + POD.arm * Math.cos(a), -17.5 + POD.arm * Math.sin(a));
    ctx!.strokeStyle = INK; ctx!.lineWidth = 1;
    ctx!.fillStyle = '#9AA4BE'; ctx!.fillRect(25, -5, 34, 5); ctx!.strokeRect(25, -5, 34, 5);
    ctx!.fillStyle = '#3238C9'; ctx!.fillRect(29, -5.75, 5, 6.5); ctx!.strokeRect(29, -5.75, 5, 6.5);
    ctx!.fillStyle = INK; ctx!.fillRect(58, -5.75, 7, 6.5);
    const g = ctx!.createLinearGradient(0, -5.7, 0, 0.8);
    g.addColorStop(0, '#C9CFDE'); g.addColorStop(0.55, '#9AA4BE'); g.addColorStop(1, '#525C7A');
    ctx!.fillStyle = g; ctx!.fill(POD.housing);
    ctx!.strokeStyle = 'rgba(30,34,51,0.75)'; ctx!.lineWidth = 1.6; ctx!.stroke(POD.housing);
    ctx!.strokeStyle = 'rgba(30,34,51,0.4)'; ctx!.lineWidth = 1; ctx!.stroke(POD.seam);
    ctx!.fillStyle = INK;
    for (const cx of [0, 20]) { ctx!.beginPath(); ctx!.arc(cx, 0, 1.2, 0, TAU); ctx!.fill(); }
    ctx!.restore();
  }

  function drawShip() {
    if (ship.alpha <= 0) return;
    ctx!.save();
    ctx!.globalAlpha = ship.alpha;
    ctx!.translate(ship.x, ship.y); ctx!.rotate(ship.a); ctx!.scale(ship.s, ship.s);

    // Speed lines stream past in the rocket's frame.
    if (ship.lines > 0.01) {
      ctx!.lineCap = 'round';
      ctx!.strokeStyle = light ? c['ink-subtle'] : '#9AA4BE';
      SPEED.forEach(([y, len, w, a, rate], i) => {
        const x = 330 - (((ship.travel * rate + speedPhase[i]) % 1) * 970);
        ctx!.globalAlpha = a * (1 + boost * 0.8) * ship.lines * ship.alpha;
        ctx!.lineWidth = w;
        ctx!.beginPath(); ctx!.moveTo(x, y); ctx!.lineTo(x + len * (1 + boost * 1.2), y); ctx!.stroke();
      });
    }

    // Flames: ember at cruise, blue under boost. Colour snaps over ahead of the speed-up.
    const b = Math.min(1, boost * 2.2), still = idle && !flight.active;
    if (ship.flame > 0.02) {
      ENGINES.forEach((e, n) => {
        const f = still ? 1 : 1 + 0.07 * Math.sin(t * (22 + n * 3)) + 0.04 * Math.sin(t * (37 + n * 5));
        const tip = e.x - e.l[0] * f * (1 + 0.45 * b) * ship.flame;
        const g = ctx!.createLinearGradient(e.x, 0, tip, 0);
        g.addColorStop(0, mix(FLAME.outer[0], FLAME.outer[1], b));
        g.addColorStop(0.45, mix(FLAME.mid[0], FLAME.mid[1], b));
        g.addColorStop(1, mix(FLAME.mid[0], FLAME.mid[1], b, 0));
        ctx!.globalAlpha = 0.92 * ship.alpha; flame(e, 0, g, f);
        ctx!.globalAlpha = 0.9 * ship.alpha; flame(e, 1, mix(FLAME.inner[0], FLAME.inner[1], b), f);
        ctx!.globalAlpha = ship.alpha; flame(e, 2, mix(FLAME.core[0], FLAME.core[1], b), f);
      });
      // Shock diamonds in the main plume.
      const fl = Math.min(1, ship.flame);
      [[-200, 4.6], [-213, 3.5], [-226, 2.4]].forEach(([x, h], i) => {
        ctx!.globalAlpha = (still ? 0.8 : 0.5 + 0.45 * Math.abs(Math.sin(t * 21 - i * 1.5))) * fl * fl * ship.alpha;
        ctx!.fillStyle = mix(FLAME.core[0], FLAME.core[1], b);
        const xx = (x + 184) * ship.flame * (1 + 0.3 * b) - 184;
        ctx!.beginPath(); ctx!.moveTo(xx, -h); ctx!.lineTo(xx + h * 0.8, 0); ctx!.lineTo(xx, h); ctx!.lineTo(xx - h * 0.8, 0); ctx!.closePath(); ctx!.fill();
      });
    }
    // Blue engine glow under boost.
    if (b > 0.02) {
      const glow = ctx!.createRadialGradient(-190, 0, 0, -190, 0, 120);
      glow.addColorStop(0, `rgba(64,150,255,${0.35 * b})`); glow.addColorStop(1, 'rgba(64,150,255,0)');
      ctx!.globalAlpha = ship.alpha; ctx!.fillStyle = glow; ctx!.beginPath(); ctx!.arc(-190, 0, 120, 0, TAU); ctx!.fill();
    }
    ctx!.globalAlpha = ship.alpha;

    // Body.
    const hull = ctx!.createLinearGradient(0, -46, 0, 46);
    hull.addColorStop(0, '#C9CFDE'); hull.addColorStop(0.45, '#9AA4BE'); hull.addColorStop(1, '#525C7A');
    const hullC = ctx!.createLinearGradient(0, -15, 0, 15);
    hullC.addColorStop(0, '#DDE2EC'); hullC.addColorStop(0.55, '#B4BCCF'); hullC.addColorStop(1, '#7A8299');
    ctx!.fillStyle = '#1E2233'; ctx!.fill(R.nozzles);
    ctx!.fillStyle = hull; ctx!.fill(R.boosters); ctx!.fill(R.core);
    ctx!.fillStyle = hullC; ctx!.fill(R.coreC);
    ctx!.fillStyle = '#1E2233'; ctx!.fill(R.inter);
    ctx!.fillStyle = hull; ctx!.fill(R.upper); ctx!.fill(R.fairing);
    ctx!.globalAlpha = 0.9 * ship.alpha; ctx!.fillStyle = '#3238C9'; ctx!.fill(R.band); ctx!.globalAlpha = ship.alpha;
    ctx!.strokeStyle = '#C9CFDE'; ctx!.lineWidth = 1.3; ctx!.stroke(R.lattice);
    ctx!.strokeStyle = 'rgba(30,34,51,0.4)'; ctx!.lineWidth = 1; ctx!.stroke(R.details);
    ctx!.strokeStyle = 'rgba(30,34,51,0.75)'; ctx!.lineWidth = 1.6; ctx!.lineJoin = 'round'; ctx!.stroke(R.outline);
    ctx!.fillStyle = '#FF4A22'; ctx!.fill(R.nyko, 'evenodd');
    if (ship.pod > 0) drawPod(); // after the hull, as the pod file specifies
    ctx!.restore();
  }

  // Telemetry tag riding above the rocket while boosting: the Lorentz factor and the outside clock rate.
  // After a moment of hovering it also hints at Flight Mode.
  // Flight Mode needs a mouse (and so, very likely, a keyboard). Judge by the pointer actually in use,
  // not by (pointer: fine): Chrome on Windows touchscreen PCs reports a coarse pointer even with a mouse.
  let lastPointer = '';
  const canFly = () => W >= 900 && (lastPointer === 'mouse' || lastPointer === 'pen');
  function drawGamma() {
    if (flight.active || boost < 0.03 || W < 900) return;
    const g = 1 + 3 * boost, p = toWorld(-60, -120); // right edge of the tag, off the upper flank
    ctx!.save();
    ctx!.globalAlpha = Math.min(1, boost * 1.5);
    ctx!.font = '500 10px "IBM Plex Mono", monospace';
    ctx!.textAlign = 'right'; // grows away from the hull
    ctx!.fillStyle = light ? c['brand-blue'] : '#7CC4FF';
    ctx!.fillText(`γ ${g.toFixed(2)}`, p.x, p.y);
    ctx!.fillStyle = c['ink-subtle'];
    ctx!.fillText(`EXT CLOCK ×${(1 / g).toFixed(2)}`, p.x, p.y + 14);
    if (canFly() && (hoverTime > 1.2 || idle) && hovering) {
      ctx!.globalAlpha = idle ? 1 : Math.min(1, (hoverTime - 1.2) * 3);
      ctx!.fillStyle = c['ember-text'];
      ctx!.fillText('CLICK TO TAKE CONTROL', p.x, p.y + 28);
    }
    ctx!.restore();
  }

  // ── Transients ────────────────────────────────────────────────
  function spawnMeteor() {
    const ang = rnd(Math.PI * 0.62, Math.PI * 0.78); // heading down-left
    const sp = rnd(650, 1100);
    meteors.push({ x: rnd(W * 0.25, W * 1.05), y: rnd(-20, H * 0.35), vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, len: rnd(80, 170), age: 0, life: rnd(0.55, 1.1) });
  }
  function drawMeteor(m: Meteor) {
    const k = Math.min(1, m.age / 0.12) * Math.max(0, 1 - m.age / m.life);
    const sp = Math.hypot(m.vx, m.vy), tx = m.x - (m.vx / sp) * m.len, ty = m.y - (m.vy / sp) * m.len;
    const g = ctx!.createLinearGradient(m.x, m.y, tx, ty);
    g.addColorStop(0, light ? c.ink : c['flame-core']); g.addColorStop(0.25, c.amber); g.addColorStop(1, 'transparent');
    ctx!.save(); ctx!.globalAlpha = k; ctx!.strokeStyle = g; ctx!.lineWidth = 1.6; ctx!.lineCap = 'round';
    ctx!.beginPath(); ctx!.moveTo(m.x, m.y); ctx!.lineTo(tx, ty); ctx!.stroke();
    ctx!.fillStyle = light ? c.ink : c['flame-core']; ctx!.beginPath(); ctx!.arc(m.x, m.y, 1.6, 0, TAU); ctx!.fill();
    ctx!.restore();
  }

  const newRockShape = (r: number) => {
    const n = 7 + Math.floor(Math.random() * 4), pts: number[] = [];
    for (let i = 0; i < n; i++) pts.push(r * rnd(0.65, 1.1));
    return pts;
  };
  const tag = () => 'AST-' + String(Math.floor(rnd(100, 9999))).padStart(4, '0');
  function spawnRock() {
    const fromLeft = Math.random() < 0.5, r = rnd(4, 11);
    rocks.push({ x: fromLeft ? -30 : W + 30, y: rnd(H * 0.1, H * 0.9), vx: (fromLeft ? 1 : -1) * rnd(22, 55), vy: rnd(-8, 8), rot: rnd(0, TAU), vr: rnd(-0.8, 0.8), pts: newRockShape(r), r, tag: tag() });
  }
  function drawRock(k: Rock, alpha = 1) {
    ctx!.save(); ctx!.translate(k.x, k.y); ctx!.globalAlpha = alpha;
    ctx!.save(); ctx!.rotate(k.rot);
    ctx!.beginPath();
    k.pts.forEach((d, i) => { const a = (i / k.pts.length) * TAU; i ? ctx!.lineTo(Math.cos(a) * d, Math.sin(a) * d) : ctx!.moveTo(Math.cos(a) * d, Math.sin(a) * d); });
    ctx!.closePath();
    ctx!.fillStyle = k.flash && k.flash > 0 ? mix(c['surface-200'], '#FFB300', Math.min(1, k.flash * 4)) : c['surface-200']; ctx!.fill();
    ctx!.strokeStyle = k.flash && k.flash > 0 ? c.amber : c['hull-mid']; ctx!.lineWidth = k.size && k.size > 1 ? 1.4 : 1; ctx!.stroke();
    // Big Flight Mode rocks get a couple of crater rings so they read as heavier.
    if (k.size && k.size >= 2) {
      ctx!.strokeStyle = c['hull-shadow']; ctx!.globalAlpha = alpha * 0.7; ctx!.lineWidth = 1;
      ctx!.beginPath(); ctx!.arc(k.r * 0.25, -k.r * 0.2, k.r * 0.22, 0, TAU); ctx!.stroke();
      ctx!.beginPath(); ctx!.arc(-k.r * 0.35, k.r * 0.3, k.r * 0.14, 0, TAU); ctx!.stroke();
    }
    ctx!.restore();
    ctx!.globalAlpha = 0.75 * alpha; ctx!.fillStyle = c['ink-subtle']; ctx!.font = '500 9px "IBM Plex Mono", monospace';
    ctx!.fillText(k.tag, k.r + 6, -k.r - 2);
    ctx!.restore();
  }

  // The model lives in public/brand/nyko-ufo.svg (origin = saucer centre, emitter at (0, 31)), with two more
  // pilots on the same saucer: nyko-ufo-pink.svg and nyko-ufo-purple.svg (brand/round-2-iconography/gen_ufo_aliens.mjs).
  // Each is baked once per layout into an offscreen canvas; rim lights and beams are drawn live on top.
  const UFO_BOX = { x: -136, y: -72, w: 272, h: 128 }, UFO_EMIT = 31;
  const UFO_LIGHTS = [-102, -68, -34, 0, 34, 68, 102];
  const UFO_SKINS: Record<UfoSkin, { img: HTMLImageElement; bake: HTMLCanvasElement; ready: boolean }> = {
    green: { img: new Image(), bake: document.createElement('canvas'), ready: false },
    pink: { img: new Image(), bake: document.createElement('canvas'), ready: false },
    purple: { img: new Image(), bake: document.createElement('canvas'), ready: false },
  };
  let ufoK = 0.3;
  for (const [k, v] of Object.entries(UFO_SKINS)) {
    v.img.onload = () => { v.ready = true; bakeUfo(); };
    v.img.src = k === 'green' ? '/brand/nyko-ufo.svg' : `/brand/nyko-ufo-${k}.svg`;
  }
  // Green is the regular; pink and purple turn up now and then.
  const pickSkin = (): UfoSkin => { const r = Math.random(); return r < 0.6 ? 'green' : r < 0.8 ? 'pink' : 'purple'; };
  function bakeUfo() {
    const px = ufoK * Math.min(window.devicePixelRatio || 1, 2) * 1.5;
    for (const v of Object.values(UFO_SKINS)) {
      if (!v.ready) continue;
      v.bake.width = Math.ceil(UFO_BOX.w * px); v.bake.height = Math.ceil(UFO_BOX.h * px);
      v.bake.getContext('2d')!.drawImage(v.img, 0, 0, v.bake.width, v.bake.height);
    }
  }

  // Where the UFO parks to scan: off the rocket's upper flank, so its emitter looks down onto the hull.
  // In Flight Mode the rocket is small and moving, so it parks a fixed distance above it instead.
  const scanPost = () => flight.active ? { x: ship.x, y: ship.y - 110 } : toWorld(10, W < 900 ? -240 : -270);
  const shipLen = () => (flight.active ? 0.8 : 1);

  // ?ufo=<mode> forces every visit to that mode, every few seconds (for previewing the behaviours).
  const UFO_MODES: UfoMode[] = ['pass', 'scan', 'probe', 'land', 'abduct', 'rise'];
  const UFO_FORCE = UFO_MODES.find((m) => new RegExp(`[?&]ufo=${m}\\b`).test(location.search));
  const easeIO = (k: number) => k * k * (3 - 2 * k);
  // Green ring pulses where the UFO enters or leaves a planet.
  const blips: { x: number; y: number; age: number }[] = [];
  // A cow dropped mid-abduction (the UFO was shot) tumbles away.
  let looseCow: { x: number; y: number; vx: number; vy: number; rot: number; vr: number; age: number; k: number } | null = null;

  function pickProbe(): Pick<Ufo, 'target' | 'rock'> | null {
    const opts: Pick<Ufo, 'target' | 'rock'>[] = [{ target: 'sat' }, { target: 'moon' }, { target: 'nk4b' }, { target: 'nk4bMoon' }];
    for (const k of rocks) if (k.x > 80 && k.x < W - 80 && k.y > 80 && k.y < H - 40) opts.push({ target: 'rock', rock: k });
    return opts[Math.floor(Math.random() * opts.length)] ?? null;
  }
  // The body a probe/land visit is scanning, wherever it is now; null if it's gone (a shot asteroid).
  function probeInfo(u: Ufo): { x: number; y: number; r: number; label: string; sub: string } | null {
    switch (u.target) {
      case 'sat': { const p = satPos(); return { x: p.x, y: p.y, r: W < 900 ? 8 : 12, label: 'NYKO-SAT', sub: 'SIGNAL ∙ NOT FOR US' }; }
      case 'moon': { const m = moonPos(); return { x: m.x, y: m.y, r: m.r, label: 'LUNA', sub: 'FOOTPRINTS ∙ 12 PAIRS' }; }
      case 'nk4b': return { ...rocky, label: 'NK-4B', sub: 'IRON OXIDE ∙ ABUNDANT' };
      case 'nk4bMoon': { const m = rockyMoonPos(); return { x: m.x, y: m.y, r: m.r, label: 'NK-4B I', sub: 'ROCK ∙ UNREMARKABLE' }; }
      case 'rock': return u.rock && rocks.includes(u.rock) ? { x: u.rock.x, y: u.rock.y, r: u.rock.r, label: u.rock.tag, sub: 'MINERALS ∙ LOW VALUE' } : null;
      case 'earth': return { ...earth, label: 'EARTH', sub: 'LIFE ∙ CONFIRMED' };
    }
    return null;
  }
  // Hover post above a scanned body: the emitter sits a short beam's length over its top.
  const probePost = (b: { x: number; y: number; r: number }) => ({ x: b.x, y: Math.max(28, b.y - b.r - UFO_EMIT * ufoK - 46 * (ufoK / 0.38)) });
  const ascendFrom = (u: Ufo) => (u.mode === 'abduct' ? earth : planet);

  function spawnUfo() {
    const dir = Math.random() < 0.5 ? 1 : -1;
    // The first visit always scans the rocket so it gets seen; after that, any behaviour.
    let mode: UfoMode = UFO_FORCE ?? 'scan';
    if (!UFO_FORCE && ufoVisits > 0) {
      const r = Math.random();
      mode = r < 0.3 ? 'scan' : r < 0.45 ? 'pass' : r < 0.67 ? 'probe' : r < 0.78 ? 'land' : r < 0.89 ? 'abduct' : 'rise';
    }
    ufoVisits++;
    const u: Ufo = {
      x: dir > 0 ? -80 : W + 80, y: mode === 'scan' ? rnd(H * 0.05, H * 0.2) : rnd(H * 0.12, H * 0.4), dir, age: 0, tilt: 0,
      mode, phase: 'in', hoverAt: rnd(W * 0.3, W * 0.8), hover: Math.random() < 0.6 ? rnd(1.6, 3) : 0, beam: false,
      scan: 0, vx: 0, vy: 0, outAge: 0, shield: 0, hostile: false, scale: 1, t: 0, fx: 0, fy: 0, skin: pickSkin(),
    };
    if (mode === 'probe') { const p = pickProbe(); if (p) Object.assign(u, p); else u.mode = 'scan'; }
    if (mode === 'land') u.target = 'earth';
    if (mode === 'abduct' || mode === 'rise') {
      const b = ascendFrom(u);
      Object.assign(u, { x: b.x, y: b.y, scale: 0.04, phase: 'ascend', cow: mode === 'abduct' });
      blips.push({ x: b.x, y: b.y, age: 0 });
    }
    ufo = u;
  }

  function leave(u: Ufo, keepBeam = false) {
    u.phase = 'out'; u.beam = keepBeam; u.vx = u.dir * 40; u.vy = -20; u.outAge = 0;
  }

  function stepUfo(dt: number) {
    for (const b of blips) b.age += dt;
    prune(blips, (b) => b.age < 0.9);
    if (looseCow) {
      const q = looseCow; q.age += dt; q.vy += 160 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt;
      if (q.age > 4 || q.y > H + 40) looseCow = null;
    }
    if (!ufo) return;
    const u = ufo;
    u.age += dt;
    u.shield = Math.max(0, u.shield - dt * 2.5);
    let wantTilt = Math.sin(u.age * 2) * 0.05;
    if (u.mode === 'pass') {
      const reached = u.dir > 0 ? u.x >= u.hoverAt : u.x <= u.hoverAt;
      if (reached && u.hover > 0) { u.hover -= dt; u.beam = true; }
      else { u.beam = false; u.x += u.dir * (reached ? 260 : 140) * dt; }
      wantTilt += u.beam ? 0 : u.dir * 0.08;
    } else if (u.phase === 'ascend') {
      // Grow up out of a planet to a post above it.
      const b = ascendFrom(u), e = easeIO(u.t = Math.min(1, u.t + dt / 2.2));
      u.x = b.x; u.y = lerp(b.y, probePost(b).y, e); u.scale = lerp(0.04, 1, e);
      u.beam = !!u.cow && u.t > 0.15;
      wantTilt = 0;
      if (u.t >= 1) { if (u.cow) { u.phase = 'hold'; u.t = 0; } else leave(u); }
    } else if (u.phase === 'hold') {
      // Pull the specimen clear of Earth, sideways and up, then leave with it in tow.
      u.t += dt; u.beam = true;
      const side = earth.x < W / 2 ? 1 : -1, kz = ufoK / 0.38;
      u.dir = side;
      u.x += side * 70 * kz * dt; u.y = Math.max(28, u.y - 18 * kz * dt);
      wantTilt = side * 0.1;
      if (u.t > 1.6) leave(u, true);
    } else if (u.phase === 'descend') {
      // Shrink down into Earth.
      const e = easeIO(u.t = Math.min(1, u.t + dt / 1.8));
      u.x = lerp(u.fx, earth.x, e); u.y = lerp(u.fy, earth.y, e); u.scale = lerp(1, 0.04, e);
      u.beam = false; wantTilt = 0;
      if (u.t >= 1) { blips.push({ x: earth.x, y: earth.y, age: 0 }); ufo = null; return; }
    } else if (u.phase === 'in') {
      // Close on the moving post, fast at first, then ease in.
      const info = u.mode === 'scan' ? null : probeInfo(u);
      if (u.mode !== 'scan' && !info) { leave(u); return; }
      const p = info ? probePost(info) : scanPost(), dx = p.x - u.x, dy = p.y - u.y, d = Math.hypot(dx, dy);
      const sp = Math.min(320, d * 1.6);
      u.x += (dx / (d || 1)) * sp * dt; u.y += (dy / (d || 1)) * sp * dt;
      wantTilt = Math.max(-0.3, Math.min(0.3, dx / 600));
      if (d < 4) { u.phase = 'scan'; u.scan = 0; }
    } else if (u.phase === 'scan' && u.mode !== 'scan') {
      // Scanning another body: hold over it and sweep it top to bottom.
      const info = probeInfo(u);
      if (!info) { leave(u); return; }
      const p = probePost(info);
      u.x += (p.x - u.x) * Math.min(1, dt * 5); u.y += (p.y - u.y) * Math.min(1, dt * 5);
      wantTilt = Math.max(-0.35, Math.min(0.35, -Math.atan2(info.x - u.x, info.y - u.y)));
      u.scan += dt / 3.4; u.beam = true;
      if (u.scan >= 1) {
        if (u.mode === 'land') { u.phase = 'descend'; u.t = 0; u.fx = u.x; u.fy = u.y; u.beam = false; }
        else leave(u);
      }
    } else if (u.phase === 'scan') {
      const p = scanPost();
      u.x += (p.x - u.x) * Math.min(1, dt * 5); u.y += (p.y - u.y) * Math.min(1, dt * 5);
      // Lean the emitter toward the rocket.
      wantTilt = Math.max(-0.35, Math.min(0.35, -Math.atan2(ship.x - u.x, ship.y - u.y)));
      u.scan += dt / 4.2; u.beam = true;
      if (u.scan >= 1) {
        leave(u);
        // In Flight Mode, a friendly scan ends with a supply drop from the emitter.
        if (flight.active) flight.gift(u.x, u.y + UFO_EMIT * ufoK + 14);
      }
    } else {
      // Satisfied (or offended): peel away and climb out of frame, back to full size.
      u.outAge += dt;
      u.scale += (1 - u.scale) * Math.min(1, dt * 3);
      u.vx += u.dir * 420 * dt; u.vy -= 260 * dt;
      u.x += u.vx * dt; u.y += u.vy * dt;
      wantTilt = u.dir * 0.3;
    }
    u.tilt += (wantTilt - u.tilt) * Math.min(1, dt * 4);
    if (u.x < -160 || u.x > W + 160 || u.y < -120) ufo = null;
  }

  // The abducted cow: public/brand/nyko-cow.svg (viewBox -12 -10 24 20, origin at the body centre, facing right).
  // Baked once at 4× its largest size; drawn ~19px long at k = 1, rotated and bobbing in the beam.
  const COW = { img: new Image(), bake: document.createElement('canvas'), ready: false };
  COW.img.onload = () => {
    COW.bake.width = 192; COW.bake.height = 160;
    COW.bake.getContext('2d')!.drawImage(COW.img, 0, 0, 192, 160);
    COW.ready = true;
  };
  COW.img.src = '/brand/nyko-cow.svg';
  function drawCow(x: number, y: number, k: number, rot: number, alpha = 1) {
    if (!COW.ready) return;
    const w = 24 * 0.8 * k, h = 20 * 0.8 * k;
    ctx!.save(); ctx!.translate(x, y); ctx!.rotate(rot); ctx!.globalAlpha *= alpha;
    ctx!.drawImage(COW.bake, -w / 2, -h / 2, w, h);
    ctx!.restore();
  }

  function drawBlips() {
    if (!blips.length) return;
    ctx!.save(); ctx!.strokeStyle = c.nominal; ctx!.lineWidth = 1.5;
    for (const b of blips) {
      const k = b.age / 0.9;
      ctx!.globalAlpha = (1 - k) * 0.8;
      ctx!.beginPath(); ctx!.ellipse(b.x, b.y, 4 + k * 34, (4 + k * 34) * 0.45, 0, 0, TAU); ctx!.stroke();
    }
    ctx!.restore();
  }

  // Beam from the emitter. pass/abduct: a cone straight down (abduct carries the cow). scan/probe/land: a fan
  // onto a scan line sweeping the rocket's hull, or across the scanned body top to bottom.
  function drawUfoBeam(u: Ufo) {
    if (!u.beam) return;
    const s = u.scale, kz = ufoK / 0.38;
    const bob = Math.sin(u.age * 3) * 3 * s, ca = Math.cos(u.tilt), sa = Math.sin(u.tilt);
    const ex = u.x - sa * UFO_EMIT * ufoK * s, ey = u.y + bob + ca * UFO_EMIT * ufoK * s, half = 9 * ufoK * s;
    ctx!.save();
    if (u.mode === 'pass' || u.mode === 'abduct') {
      const len = u.mode === 'pass' ? 120 : 74 * s * kz, spread = u.mode === 'pass' ? 34 : 22 * s * kz;
      ctx!.translate(ex, ey); ctx!.rotate(u.tilt);
      const g = ctx!.createLinearGradient(0, 0, 0, len);
      g.addColorStop(0, c.nominal); g.addColorStop(1, u.mode === 'pass' ? 'transparent' : 'rgba(63,214,155,0.12)');
      ctx!.globalAlpha = 0.2 + 0.08 * Math.sin(u.age * 20); ctx!.fillStyle = g;
      ctx!.beginPath(); ctx!.moveTo(-half, 0); ctx!.lineTo(half, 0); ctx!.lineTo(spread, len); ctx!.lineTo(-spread, len); ctx!.closePath(); ctx!.fill();
      if (u.cow) {
        ctx!.globalAlpha = 1;
        drawCow(Math.sin(u.age * 1.3) * 2 * s * kz, len * 0.6 + Math.sin(u.age * 2.2) * 2.5 * s * kz, 1.05 * s * kz, Math.sin(u.age * 1.7) * 0.35 - u.tilt);
      }
      ctx!.restore(); return;
    }
    let a: { x: number; y: number }, b: { x: number; y: number }, mid: { x: number; y: number }, sweep: number;
    if (u.mode === 'scan') {
      // Sweep position along the hull, eased at each end.
      const k = 0.5 - 0.5 * Math.cos(u.scan * TAU * 1.5);
      const lx = lerp(-180, 185, k) * shipLen();
      a = toWorld(lx, -52); b = toWorld(lx, 52); mid = toWorld(lx, 0); sweep = u.scan;
    } else {
      const info = probeInfo(u);
      if (!info || u.phase !== 'scan') { ctx!.restore(); return; }
      // A chord across the body, sweeping top → bottom → top.
      const k = 0.5 - 0.5 * Math.cos(u.scan * TAU * 1.5), dy = lerp(-info.r, info.r, k) * 0.9;
      const hw = Math.sqrt(Math.max(0, info.r * info.r - dy * dy)) + 3;
      a = { x: info.x - hw, y: info.y + dy }; b = { x: info.x + hw, y: info.y + dy }; mid = { x: info.x, y: info.y + dy }; sweep = u.scan;
    }
    const g = ctx!.createLinearGradient(ex, ey, mid.x, mid.y);
    g.addColorStop(0, c.nominal); g.addColorStop(1, 'rgba(63,214,155,0.05)');
    const fadeIn = Math.min(1, sweep * 8), fadeOut = Math.min(1, (1 - sweep) * 10);
    ctx!.globalAlpha = (0.24 + 0.06 * Math.sin(u.age * 24)) * fadeIn * fadeOut;
    ctx!.fillStyle = g;
    ctx!.beginPath(); ctx!.moveTo(ex - half, ey); ctx!.lineTo(ex + half, ey); ctx!.lineTo(b.x, b.y); ctx!.lineTo(a.x, a.y); ctx!.closePath(); ctx!.fill();
    // The scan line, with end ticks.
    ctx!.globalAlpha = 0.95 * fadeIn * fadeOut; ctx!.strokeStyle = c.nominal; ctx!.lineWidth = 1.6; ctx!.lineCap = 'round';
    ctx!.beginPath(); ctx!.moveTo(a.x, a.y); ctx!.lineTo(b.x, b.y); ctx!.stroke();
    ctx!.lineWidth = 1;
    for (const e of [a, b]) { ctx!.beginPath(); ctx!.arc(e.x, e.y, 2.2, 0, TAU); ctx!.stroke(); }
    ctx!.restore();
  }

  function drawUfo(u: Ufo) {
    const s = u.scale, bob = Math.sin(u.age * 3) * 3 * s;
    ctx!.save(); ctx!.translate(u.x, u.y + bob); ctx!.rotate(u.tilt); ctx!.scale(s, s);
    const art = UFO_SKINS[u.skin].ready ? UFO_SKINS[u.skin] : UFO_SKINS.green;
    if (art.ready) ctx!.drawImage(art.bake, UFO_BOX.x * ufoK, UFO_BOX.y * ufoK, UFO_BOX.w * ufoK, UFO_BOX.h * ufoK);
    // Rim-light chase: dim all but every third light; races while scanning, all red when hostile.
    const rate = u.phase === 'scan' || u.hostile ? 16 : 7, step = Math.floor(u.age * rate);
    UFO_LIGHTS.forEach((x, i) => {
      if ((step + i) % 3 === 0) {
        if (!u.hostile) return;
        ctx!.fillStyle = c.ember;
      } else ctx!.fillStyle = 'rgba(30,34,51,0.72)';
      ctx!.beginPath(); ctx!.arc(x * ufoK, 2.3 * ufoK, 2.7 * ufoK, 0, TAU); ctx!.fill();
    });
    // Emitter flare while the beam is on.
    if (u.beam) {
      const r = 16 * ufoK, g = ctx!.createRadialGradient(0, UFO_EMIT * ufoK, 0, 0, UFO_EMIT * ufoK, r * 2);
      g.addColorStop(0, 'rgba(230,255,242,0.9)'); g.addColorStop(1, 'rgba(63,214,155,0)');
      ctx!.fillStyle = g; ctx!.beginPath(); ctx!.arc(0, UFO_EMIT * ufoK, r * 2, 0, TAU); ctx!.fill();
    }
    // Shield bubble when shot: the UFO can't be hurt.
    if (u.shield > 0) {
      ctx!.globalAlpha = u.shield; ctx!.strokeStyle = c.nominal; ctx!.lineWidth = 1.5;
      ctx!.setLineDash([4, 3]);
      ctx!.beginPath(); ctx!.ellipse(0, -8 * ufoK, 150 * ufoK, 80 * ufoK, 0, 0, TAU); ctx!.stroke();
      ctx!.globalAlpha = u.shield * 0.12; ctx!.fillStyle = c.nominal; ctx!.fill();
    }
    ctx!.restore();
    // Readout, blueprint style (desktop only).
    if (W < 900) return;
    let text = '', sub = '', alpha = 1;
    if (u.hostile) {
      text = 'HOSTILE ACT LOGGED'; sub = 'FILING COMPLAINT';
      if (u.phase === 'out') alpha = Math.max(0, 1 - u.outAge / 2);
    } else if (u.mode === 'scan' && u.phase === 'scan') {
      text = `SCAN · NYKO-1 · ${String(Math.min(99, Math.floor(u.scan * 100))).padStart(2, '0')}%`; sub = 'CRAFT ∙ UNREGISTERED';
    } else if (u.mode === 'scan' && u.phase === 'out' && u.outAge < 1.6) {
      text = 'ID OK · FRIENDLY'; sub = flight.active ? 'SUPPLY DROP RELEASED' : 'RESUMING COURSE'; alpha = 1 - u.outAge / 1.6;
    } else if ((u.mode === 'probe' || u.mode === 'land') && u.phase === 'scan') {
      const info = probeInfo(u);
      if (info) { text = `SCAN · ${info.label} · ${String(Math.min(99, Math.floor(u.scan * 100))).padStart(2, '0')}%`; sub = info.sub; }
    } else if (u.mode === 'probe' && u.phase === 'out' && u.outAge < 1.6) {
      text = 'ANALYSIS COMPLETE'; sub = 'RESUMING COURSE'; alpha = 1 - u.outAge / 1.6;
    } else if (u.mode === 'land' && u.phase === 'descend') {
      text = 'DESCENT · EARTH'; sub = 'CLEARANCE ∙ NOT REQUESTED'; alpha = 1 - u.t;
    } else if (u.mode === 'abduct' && u.cow && (u.phase !== 'out' || u.outAge < 2)) {
      text = 'SPECIMEN SECURED'; sub = 'BOVINE ∙ 1 HEAD'; alpha = u.phase === 'out' ? 1 - u.outAge / 2 : Math.min(1, u.t * 2 + (u.phase === 'hold' ? 1 : 0));
    } else if (u.mode === 'rise' && (u.phase === 'ascend' || (u.phase === 'out' && u.outAge < 1.6))) {
      text = 'LAUNCH · RING WORLD'; sub = 'OUTPOST ∙ UNDISCLOSED'; alpha = u.phase === 'out' ? 1 - u.outAge / 1.6 : Math.min(1, u.t * 2);
    }
    if (!text || alpha <= 0) return;
    ctx!.save();
    ctx!.font = '500 10px "IBM Plex Mono", monospace';
    ctx!.fillStyle = u.hostile ? c['ember-text'] : c.nominal; ctx!.globalAlpha = alpha;
    // Beside the saucer; flipped to its left side when it's near the right edge.
    const span = 136 * ufoK * s + 10, right = u.x + span + 170 < W;
    const tx = right ? u.x + span : u.x - span, ty = u.y + bob - 6;
    ctx!.textAlign = right ? 'left' : 'right';
    ctx!.fillText(text, tx, ty);
    ctx!.fillStyle = c['ink-subtle'];
    ctx!.fillText(sub, tx, ty + 14);
    ctx!.restore();
  }

  // ── Flight Mode ───────────────────────────────────────────────
  const api: SkyApi = {
    ctx, hero, c, ship, rocks, meteors, muzzle: POD_MUZZLE,
    W: () => W, H: () => H, light: () => light, idle: () => idle,
    toWorld, heroPose,
    ufo: () => ufo,
    ufoRadius: () => 130 * ufoK * (ufo ? ufo.scale : 1),
    drawRock, newRockShape, tag,
  };
  const flight = createFlight(api, {
    onChange: () => restart(),
    onHitUfo: () => {
      if (!ufo) return;
      ufo.shield = 1;
      if (ufo.cow) {
        // Shot mid-abduction: it lets go of the cow.
        const kz = ufoK / 0.38;
        looseCow = { x: ufo.x, y: ufo.y + (UFO_EMIT * ufoK + 44 * kz) * ufo.scale, vx: rnd(-30, 30), vy: -20, rot: 0, vr: rnd(-3, 3), age: 0, k: 1.05 * kz * ufo.scale };
        ufo.cow = false; ufo.beam = false;
      }
      if (!ufo.hostile) {
        // First offence: it stops whatever it was doing and leaves, logging the incident.
        ufo.hostile = true;
        if (ufo.phase !== 'out') { ufo.phase = 'out'; ufo.mode = 'scan'; ufo.beam = false; ufo.vx = ufo.dir * 20; ufo.vy = -10; ufo.outAge = 0; }
      }
    },
  });

  // ?flightdebug: outline the rocket's hit box and the pointer, and print the display numbers.
  const DEBUG = /[?&]flightdebug\b/.test(location.search);
  let debugPtr: [number, number] | null = null;
  function drawDebug() {
    ctx!.save();
    ctx!.translate(ship.x, ship.y); ctx!.rotate(ship.a); ctx!.scale(ship.s, ship.s);
    ctx!.strokeStyle = '#FF2BD6'; ctx!.lineWidth = 2 / ship.s; ctx!.strokeRect(-230, -56, 430, 112);
    ctx!.restore();
    ctx!.save();
    ctx!.strokeStyle = '#FF2BD6'; ctx!.lineWidth = 1.5;
    if (debugPtr) { const [x, y] = debugPtr; ctx!.beginPath(); ctx!.moveTo(x - 10, y); ctx!.lineTo(x + 10, y); ctx!.moveTo(x, y - 10); ctx!.lineTo(x, y + 10); ctx!.stroke(); }
    const r = cv!.getBoundingClientRect();
    ctx!.fillStyle = '#FF2BD6'; ctx!.font = '500 11px "IBM Plex Mono", monospace';
    ctx!.fillText(`dpr ${devicePixelRatio} · layout ${W}×${H} · canvas css ${r.width.toFixed(1)}×${r.height.toFixed(1)} @ ${r.left.toFixed(1)},${r.top.toFixed(1)} · backing ${cv!.width}×${cv!.height} · hover ${hovering}`, 12, H - 40);
    ctx!.restore();
  }

  // ── Loop ──────────────────────────────────────────────────────
  function draw() {
    ctx!.save();
    flight.shake();
    ctx!.clearRect(-20, -20, W + 40, H + 40);
    drawGalaxies();
    drawStars();
    drawSun();
    drawEarth();
    const sat = satPos();
    drawSatOrbit();
    if (!sat.front) drawSatellite();
    ringHalf(false);
    drawPlanet();
    ringHalf(true);
    if (sat.front) drawSatellite();
    drawRocky();
    for (const k of rocks) drawRock(k, flight.rockAlpha());
    for (const me of meteors) drawMeteor(me);
    drawTrajectory();
    drawPuffs();
    flight.drawUnder();
    drawShip();
    flight.drawOver();
    drawBlips();
    if (looseCow) drawCow(looseCow.x, looseCow.y, looseCow.k, looseCow.rot, Math.min(1, 4 - looseCow.age));
    if (ufo) { drawUfoBeam(ufo); drawUfo(ufo); }
    drawGamma();
    ctx!.restore();
    flight.drawHud();
    if (DEBUG) drawDebug();
  }

  function step(dt: number) {
    t += dt;
    stepShip(dt);
    flight.stepShip(dt);
    spawnPuffs(dt);
    // Everything below runs on the dilated world clock.
    gamma = flight.active ? flight.gamma : 1 + 3 * boost;
    dt /= gamma;
    wt += dt;
    for (const p of puffs) { p.age += dt * gamma; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - dt * 0.6; p.vy *= 1 - dt * 0.6; }
    prune(puffs, (p) => p.age < p.life);
    if ((nextMeteor -= dt) <= 0) { spawnMeteor(); if (Math.random() < 0.15) setTimeout(spawnMeteor, 180); nextMeteor = rnd(2.5, 7); }
    if (!flight.active && (nextRock -= dt) <= 0) { if (rocks.length < 3) spawnRock(); nextRock = rnd(6, 14); }
    if ((nextUfo -= dt) <= 0) { if (!ufo) spawnUfo(); nextUfo = UFO_FORCE ? 2 : rnd(24, 48); }
    for (const me of meteors) { me.age += dt; me.x += me.vx * dt; me.y += me.vy * dt; }
    prune(meteors, (me) => me.age < me.life);
    if (!flight.active) {
      for (const k of rocks) { k.x += k.vx * dt; k.y += k.vy * dt; k.rot += k.vr * dt; }
      prune(rocks, (k) => k.x > -60 && k.x < W + 60 && k.y > -60 && k.y < H + 60);
    }
    flight.stepWorld(dt);
    stepUfo(dt);
  }

  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    step(dt); draw();
    raf = requestAnimationFrame(frame);
  }

  function restart() {
    cancelAnimationFrame(raf); raf = 0;
    // Engines Idle stills the sky, but a game the visitor started keeps running.
    if (idle && !flight.active) { meteors.length = 0; rocks.length = 0; ufo = null; puffs.length = 0; blips.length = 0; looseCow = null; draw(); return; }
    if (!visible || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
    requestAnimationFrame(() => requestAnimationFrame(loadSpin)); // after first paint
  }

  // ── Interaction: hover (or tap) the rocket to fire the boost; click it to fly ──
  function setHover(on: boolean) {
    if (on === hovering) return;
    hovering = on;
    hero!.style.cursor = on ? 'pointer' : '';
    if (idle) { boost = on ? 1 : 0; draw(); }
  }
  // Pointer → canvas space, through the canvas's own on-screen box. If the canvas is ever displayed at a
  // different size or offset than layout() assumed, hit tests still follow what's actually drawn.
  const local = (e: PointerEvent | MouseEvent) => {
    const r = cv.getBoundingClientRect();
    const x = (e.clientX - r.left) * (r.width ? W / r.width : 1), y = (e.clientY - r.top) * (r.height ? H / r.height : 1);
    debugPtr = [x, y];
    return [x, y];
  };
  hero.addEventListener('pointermove', (e) => {
    lastPointer = e.pointerType;
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    if (flight.active) { setHover(false); return; }
    const [x, y] = local(e); setHover(hitsShip(x, y));
  });
  hero.addEventListener('pointerleave', () => setHover(false));
  hero.addEventListener('pointerdown', (e) => {
    lastPointer = e.pointerType;
    if (e.pointerType === 'mouse' || e.pointerType === 'pen' || flight.active) return;
    const [x, y] = local(e);
    if (hitsShip(x, y)) { tapUntil = performance.now() + 2500; if (idle) { boost = 1; draw(); setTimeout(() => { boost = 0; draw(); }, 2500); } }
  });
  hero.addEventListener('click', (e) => {
    // Click events are PointerEvents in Chromium/Firefox; Safari's are MouseEvents (always a mouse there).
    const pt = (e as PointerEvent).pointerType;
    if (pt) lastPointer = pt; else if (!lastPointer) lastPointer = 'mouse';
    if (flight.active || !canFly()) return;
    const [x, y] = local(e);
    if (hitsShip(x, y)) { setHover(false); flight.enter(); }
  });

  readColors(); layout(); restart();
  // Fonts load after first paint; redraw so the canvas labels pick them up.
  document.fonts?.ready.then(() => { if (idle && !flight.active) draw(); });

  new ResizeObserver(() => { const w = hero.clientWidth, h = hero.clientHeight; if (w !== W || h !== H) { layout(); if (idle) draw(); } }).observe(hero);
  new MutationObserver(() => { readColors(); bakeGalaxies(); restart(); }).observe(root, { attributes: true, attributeFilter: ['data-theme', 'data-motion'] });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (!visible) flight.releaseKeys(); restart(); }).observe(hero);
  document.addEventListener('visibilitychange', () => { flight.releaseKeys(); restart(); });
}
