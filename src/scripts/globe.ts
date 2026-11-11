// Travel Log globe: an orthographic Earth on a 2D canvas.
// d3-geo clips land and graticule to the visible hemisphere; pins and ribbons use their own
// little 3D projection so air routes can arc above the surface (and peek over the horizon).
// Loaded lazily by TravelGlobe.astro when the plate nears the viewport. Follows the Theme and
// Engines switches: with motion idle there is no spin, no flowing ribbons and fly-tos are instant.

import { geoOrthographic, geoPath, geoGraticule10, geoInterpolate, geoDistance, geoRotation, geoCentroid } from 'd3-geo';
import { feature } from 'topojson-client';
import landTopo from 'world-atlas/land-110m.json';
import type { Place, Home, Trip, Mode } from '../data/travel';

type Data = { places: Record<string, Place>; homes: Home[]; trips: Trip[]; current?: string };
type LL = [number, number];
type Pt = { lon: number; lat: number; h: number };
type Leg = { trip: Trip; mode: Mode; pts: Pt[]; phase: number; speed: number };
type Pin = { id: string; place: Place; home?: Home; stints: Home[]; trips: Trip[] };
type Scr = { x: number; y: number; z: number; vis: boolean };

// Zoom feel. ZMAX is the closest zoom; steps are multipliers per wheel unit / key / button press.
const ZMAX = 12, WHEEL = 0.005, PINCH = 1.5, KEY = 1.5, BTN = 2;
// Idle spin resumes this long after the last input: quickly at full globe, much later once zoomed in on an area.
const RESUME_MS = 4000, RESUME_ZOOMED_MS = 120000;
const D = Math.PI / 180;
const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const fmtLat = (v: number) => `${Math.abs(v).toFixed(2)}°${v >= 0 ? 'N' : 'S'}`;
const fmtLon = (v: number) => { const l = ((((v + 180) % 360) + 360) % 360) - 180; return `${Math.abs(l).toFixed(2)}°${l >= 0 ? 'E' : 'W'}`; };
const hexA = (h: string, a: number) => {
  const v = h.trim().replace('#', ''); const n = parseInt(v.length === 3 ? v.split('').map((c) => c + c).join('') : v.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const land = feature(landTopo as any, (landTopo as any).objects.land) as any;
const graticule = geoGraticule10();

export function mount(root: HTMLElement) {
  if (root.dataset.mounted) return;
  root.dataset.mounted = '1';
  const data: Data = JSON.parse(root.dataset.travel || '{}');
  const scope = root.closest<HTMLElement>('[data-travel-scope]') ?? root;
  const canvas = root.querySelector('canvas')!;
  const ctx = canvas.getContext('2d');
  const tip = root.querySelector<HTMLElement>('.tg-tip')!;
  const readout = root.querySelector<HTMLElement>('[data-tg="center"]');
  if (!ctx) return;
  const doc = document.documentElement;

  // ── Model ─────────────────────────────────────────────────────────
  const P = (id: string) => data.places[id];
  const legs: Leg[] = [];
  data.trips.forEach((trip, ti) => {
    for (let i = 0; i + 1 < trip.stops.length; i++) {
      const a = P(trip.stops[i]), b = P(trip.stops[i + 1]);
      if (!a || !b) continue;
      const A: LL = [a.lon, a.lat], B: LL = [b.lon, b.lat];
      const d = geoDistance(A, B), f = geoInterpolate(A, B);
      const n = clamp(Math.round(d / D * 1.5), 24, 160);
      const mode = trip.modes?.[i] ?? trip.mode;
      const peak = mode === 'air' ? clamp(0.03 + d * 0.12, 0.03, 0.16) : clamp(0.006 + d * 0.03, 0.006, 0.02);
      const pts: Pt[] = [];
      for (let k = 0; k <= n; k++) { const t = k / n, [lon, lat] = f(t); pts.push({ lon, lat, h: peak * Math.sin(Math.PI * t) }); }
      legs.push({ trip, mode, pts, phase: (ti * 0.37 + i * 0.21) % 1, speed: clamp(0.5 / (d + 0.15), 0.12, 0.9) });
    }
  });
  const pinMap = new Map<string, Pin>();
  const pin = (id: string) => { if (!pinMap.has(id) && P(id)) pinMap.set(id, { id, place: P(id), stints: [], trips: [] }); return pinMap.get(id); };
  data.homes.forEach((h) => { const p = pin(h.place); if (p) { p.home ??= h; p.stints.push(h); } });
  data.trips.forEach((t) => new Set(t.stops).forEach((s) => pin(s)?.trips.push(t)));
  const pins = [...pinMap.values()];
  const current = data.current ?? data.homes.find((h) => !h.to)?.place;

  // ── State ─────────────────────────────────────────────────────────
  const layers = { homes: true, solo: true, crew: true };
  let selected: Trip | null = null, preview: Trip | null = null, hoverPin: Pin | null = null;
  let lam = 100, phi = -40, zoom = 1, W = 0, H = 0, R = 0;
  let vLam = 0, vPhi = 0, lastInput = -1e9, engaged = false, visible = false, dirty = true, raf = 0, lastT = 0;
  let fly: { from: LL; to: LL; z0: number; z1: number; t0: number; dur: number } | null = null;
  let intro = 0; // ribbon draw-in progress 0→1
  const c: Record<string, string> = {};
  let armed = true, light = false;

  const proj = geoOrthographic().clipAngle(90).precision(0.5);
  const path = geoPath(proj, ctx);
  let rot = geoRotation([lam, phi]);

  function readColors() {
    const s = getComputedStyle(doc);
    for (const k of ['surface-000', 'surface-100', 'surface-200', 'surface-300', 'grid', 'line', 'line-strong', 'ink', 'ink-muted', 'ink-subtle', 'ember', 'amber', 'signal', 'brand-blue', 'flame-core', 'caution'])
      c[k] = s.getPropertyValue('--' + k).trim();
    light = doc.dataset.theme === 'light';
    armed = doc.dataset.motion !== 'idle';
    c.crew = light ? c.caution : c.amber;
    dirty = true;
  }

  function resize() {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    dirty = true;
  }

  const tripOn = (t: Trip) => (t.crew ? layers.crew : layers.solo);
  const pinOn = (p: Pin) => (p.home && layers.homes) || p.trips.some(tripOn);
  const center = (): LL => [-lam, -phi];

  // Project a lon/lat at altitude h (in globe radii) to screen.
  function scr(lon: number, lat: number, h = 0): Scr {
    const [l, p] = rot([lon, lat]);
    const cp = Math.cos(p * D), x = cp * Math.sin(l * D), y = -Math.sin(p * D), z = cp * Math.cos(l * D);
    const k = R * (1 + h);
    return { x: W / 2 + k * x, y: H / 2 + k * y, z, vis: z > 0 || (x * x + y * y) * (1 + h) * (1 + h) > 1.0005 };
  }

  // ── Drawing ───────────────────────────────────────────────────────
  function frame(now: number) {
    R = Math.min(W, H) / 2 * 0.84 * zoom;
    proj.rotate([lam, phi]).translate([W / 2, H / 2]).scale(R);
    rot = geoRotation([lam, phi]);
    ctx!.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;

    // Bezel: an instrument ring with ticks every 6°, north chevron on top.
    const bz = Math.min(W, H) / 2 * 0.84 + 12;
    if (zoom < 1.15) {
      ctx!.save();
      ctx!.globalAlpha = clamp((1.15 - zoom) / 0.15, 0, 1);
      ctx!.strokeStyle = c['line-strong']; ctx!.lineWidth = 1;
      ctx!.beginPath(); ctx!.arc(cx, cy, bz, 0, TAU); ctx!.stroke();
      ctx!.beginPath();
      for (let a = 0; a < 360; a += 6) {
        const len = a % 30 === 0 ? 8 : 4, r0 = bz, r1 = bz + len, t = a * D;
        ctx!.moveTo(cx + Math.sin(t) * r0, cy - Math.cos(t) * r0); ctx!.lineTo(cx + Math.sin(t) * r1, cy - Math.cos(t) * r1);
      }
      ctx!.strokeStyle = c['ink-subtle']; ctx!.stroke();
      ctx!.fillStyle = c.ember;
      ctx!.beginPath(); ctx!.moveTo(cx, cy - bz - 14); ctx!.lineTo(cx + 5, cy - bz - 4); ctx!.lineTo(cx - 5, cy - bz - 4); ctx!.closePath(); ctx!.fill();
      ctx!.restore();
    }

    // Sphere, graticule, land.
    ctx!.beginPath(); path({ type: 'Sphere' } as any);
    ctx!.fillStyle = light ? c['surface-000'] : c['surface-000']; ctx!.fill();
    ctx!.beginPath(); path(graticule); ctx!.strokeStyle = light ? c.line : c['line']; ctx!.globalAlpha = light ? 0.8 : 0.55; ctx!.lineWidth = 1; ctx!.stroke(); ctx!.globalAlpha = 1;
    ctx!.beginPath(); path(land); ctx!.fillStyle = light ? c['surface-200'] : c['surface-300']; ctx!.fill();
    ctx!.strokeStyle = c['line-strong']; ctx!.lineWidth = 1; ctx!.stroke();
    // Limb shading for depth.
    const g = ctx!.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
    g.addColorStop(0, light ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.05)');
    g.addColorStop(0.75, 'rgba(0,0,0,0)');
    g.addColorStop(1, light ? 'rgba(30,34,51,0.12)' : 'rgba(0,0,0,0.35)');
    ctx!.beginPath(); path({ type: 'Sphere' } as any); ctx!.fillStyle = g; ctx!.fill();
    ctx!.strokeStyle = c['line-strong']; ctx!.lineWidth = 1.5; ctx!.stroke();

    // Ribbons.
    const focus = selected ?? preview;
    const prog = armed ? ease(clamp(intro, 0, 1)) : 1;
    for (const leg of legs) {
      if (!tripOn(leg.trip)) continue;
      const on = !focus || focus === leg.trip;
      const col = leg.trip.crew ? c.crew : c.signal;
      const upto = Math.max(1, Math.floor(prog * (leg.pts.length - 1)));
      const road = leg.mode !== 'air';
      ctx!.lineCap = 'round'; ctx!.lineJoin = 'round';
      if (on && !road) stroke(leg.pts, upto, hexA(col, focus ? 0.28 : 0.16), focus ? 7 : 5);
      ctx!.setLineDash(leg.mode === 'road' ? [4, 4] : leg.mode === 'rail' ? [10, 3, 2, 3] : leg.mode === 'sea' ? [1.5, 4] : []);
      stroke(leg.pts, upto, on ? col : hexA(col, 0.22), focus === leg.trip ? 2.5 : 1.75);
      ctx!.setLineDash([]);
      // Comet: a bright head travelling the route.
      if (armed && on && prog >= 1) {
        const t = (now / 1000 * leg.speed + leg.phase) % 1, n = leg.pts.length - 1, i = t * n;
        for (let k = 0; k < 10; k++) {
          const j = Math.floor(i) - k; if (j < 0) break;
          const p = leg.pts[j], s = scr(p.lon, p.lat, p.h); if (!s.vis) continue;
          ctx!.fillStyle = k === 0 ? c['flame-core'] : hexA(col, 0.6 * (1 - k / 10));
          const r = k === 0 ? 2.2 : 1.8 * (1 - k / 12);
          ctx!.beginPath();
          if (leg.trip.crew) ctx!.rect(s.x - r, s.y - r, r * 2, r * 2); else ctx!.arc(s.x, s.y, r, 0, TAU);
          ctx!.fill();
        }
      }
    }

    // Pins: back-to-front so near ones overlap far ones.
    const drawn: { p: Pin; s: Scr }[] = [];
    for (const p of pins) {
      if (!pinOn(p)) continue;
      const s = scr(p.place.lon, p.place.lat, 0);
      if (s.z <= 0.02) continue;
      drawn.push({ p, s });
    }
    drawn.sort((a, b) => a.s.z - b.s.z);
    const focusPlaces = focus ? new Set(focus.stops) : null;
    for (const { p, s } of drawn) {
      const fade = clamp(s.z * 5, 0, 1);
      const dim = focusPlaces && !focusPlaces.has(p.id) && p !== hoverPin;
      ctx!.globalAlpha = fade * (dim ? 0.35 : 1);
      if (p.home && layers.homes) {
        const top = scr(p.place.lon, p.place.lat, 0.07);
        ctx!.strokeStyle = c.ember; ctx!.lineWidth = 1.5;
        ctx!.beginPath(); ctx!.moveTo(s.x, s.y); ctx!.lineTo(top.x, top.y); ctx!.stroke();
        if (p.id === current && armed) {
          const k = (now / 1800) % 1;
          ctx!.strokeStyle = hexA(c.ember, 0.7 * (1 - k)); ctx!.lineWidth = 1.5;
          ctx!.beginPath(); ctx!.arc(s.x, s.y, 4 + k * 16, 0, TAU); ctx!.stroke();
        }
        const r = p === hoverPin ? 7 : 5.5;
        ctx!.beginPath(); ctx!.moveTo(top.x, top.y - r); ctx!.lineTo(top.x + r, top.y); ctx!.lineTo(top.x, top.y + r); ctx!.lineTo(top.x - r, top.y); ctx!.closePath();
        ctx!.fillStyle = c.ember; ctx!.fill(); ctx!.strokeStyle = c['surface-100']; ctx!.lineWidth = 1.5; ctx!.stroke();
        label(p, top.x + r + 6, top.y, p.id === current ? c.ink : c['ink-muted']);
      } else {
        const crew = p.trips.some((t) => t.crew && tripOn(t));
        const col = crew ? c.crew : c.signal, r = p === hoverPin ? 5 : 3.5;
        ctx!.beginPath();
        if (crew) ctx!.rect(s.x - r, s.y - r, r * 2, r * 2); else ctx!.arc(s.x, s.y, r, 0, TAU);
        ctx!.fillStyle = c['surface-200']; ctx!.fill(); ctx!.strokeStyle = col; ctx!.lineWidth = 2; ctx!.stroke();
        if (p === hoverPin || focusPlaces?.has(p.id)) label(p, s.x + r + 6, s.y, c.ink);
      }
      ctx!.globalAlpha = 1;
    }
    flushLabels();
    hits = drawn.map(({ p, s }) => {
      if (p.home && layers.homes) { const t = scr(p.place.lon, p.place.lat, 0.07); return { p, x: t.x, y: t.y }; }
      return { p, x: s.x, y: s.y };
    });

    if (readout) { const [lo, la] = center(); readout.textContent = `${fmtLat(la)} ${fmtLon(lo)} · ${zoom.toFixed(1)}×`; }
  }

  function stroke(pts: Pt[], upto: number, style: string, width: number) {
    ctx!.beginPath(); let pen = false;
    for (let i = 0; i <= upto; i++) {
      const p = pts[i], s = scr(p.lon, p.lat, p.h);
      if (!s.vis) { pen = false; continue; }
      if (pen) ctx!.lineTo(s.x, s.y); else ctx!.moveTo(s.x, s.y);
      pen = true;
    }
    ctx!.strokeStyle = style; ctx!.lineWidth = width; ctx!.stroke();
  }

  // Labels are queued while pins draw, then placed by priority; any that would overlap one
  // already placed are skipped (hover always wins).
  let queue: { p: Pin; x: number; y: number; col: string; alpha: number; rank: number }[] = [];
  function label(p: Pin, x: number, y: number, col: string) {
    const rank = p === hoverPin ? 0 : p.id === current ? 1 : p.home ? 2 : 3;
    queue.push({ p, x, y, col, alpha: ctx!.globalAlpha, rank });
  }
  function flushLabels() {
    ctx!.font = '500 11px "IBM Plex Mono", ui-monospace, monospace';
    if ('letterSpacing' in ctx!) (ctx as any).letterSpacing = '1.3px';
    ctx!.textBaseline = 'middle';
    const placed: [number, number, number, number][] = [];
    for (const q of queue.sort((a, b) => a.rank - b.rank)) {
      const text = q.p.place.name.toUpperCase(), w = ctx!.measureText(text).width;
      const box: [number, number, number, number] = [q.x - 3, q.y - 8, w + 6, 16];
      if (placed.some((b) => box[0] < b[0] + b[2] && b[0] < box[0] + box[2] && box[1] < b[1] + b[3] && b[1] < box[1] + box[3])) continue;
      placed.push(box);
      ctx!.globalAlpha = q.alpha;
      ctx!.fillStyle = hexA(c['surface-100'], 0.72); ctx!.fillRect(...box);
      ctx!.fillStyle = q.col; ctx!.fillText(text, q.x, q.y + 0.5);
    }
    ctx!.globalAlpha = 1; queue = [];
  }

  // ── Animation loop ────────────────────────────────────────────────
  function tick(now: number) {
    raf = 0;
    const dt = Math.min(0.05, (now - (lastT || now)) / 1000); lastT = now;
    let moving = false;
    if (fly) {
      const k = clamp((now - fly.t0) / fly.dur, 0, 1), e = ease(k);
      const [lo, la] = geoInterpolate(fly.from, fly.to)(e);
      lam = -lo; phi = -la; zoom = fly.z0 + (fly.z1 - fly.z0) * e;
      if (k >= 1) fly = null; moving = true;
    } else if (!dragging) {
      if (Math.abs(vLam) + Math.abs(vPhi) > 0.5) {
        lam += vLam * dt; phi = clamp(phi + vPhi * dt, -85, 85);
        const decay = Math.pow(0.04, dt); vLam *= decay; vPhi *= decay; moving = true;
      } else if (armed && !selected && now - lastInput > (zoom > 1.05 ? RESUME_ZOOMED_MS : RESUME_MS)) {
        lam += 5 * dt; moving = true; // slow idle spin
      }
    }
    if (intro < 1) { intro += dt / 1.6; moving = true; }
    if (dirty || moving || (armed && visible)) { frame(now); dirty = false; }
    if (visible && (armed || moving || fly)) schedule();
  }
  const schedule = () => { if (!raf) raf = requestAnimationFrame(tick); };
  const touch = () => { dirty = true; if (!armed) { frame(performance.now()); dirty = false; } else schedule(); };

  function flyTo(to: LL, z1 = zoom, dur = 1100) {
    lastInput = performance.now(); vLam = vPhi = 0;
    if (!armed) { lam = -to[0]; phi = -to[1]; zoom = z1; touch(); return; }
    fly = { from: center(), to, z0: zoom, z1, t0: performance.now(), dur }; lastT = 0; schedule();
  }
  function fit(ids: string[], max = 3) {
    const pts = ids.map(P).filter(Boolean).map((p) => [p.lon, p.lat] as LL);
    if (!pts.length) return;
    const mid = pts.length === 1 ? pts[0] : (geoCentroid({ type: 'MultiPoint', coordinates: pts }) as LL);
    const far = Math.max(...pts.map((p) => geoDistance(mid, p)));
    flyTo(mid, clamp(far > 1.2 ? 1 : 0.72 / Math.max(Math.sin(far), 0.08), 1, max));
  }
  const home = () => { const h = P(current ?? ''); if (h) flyTo([h.lon, h.lat - 12], 1); else fit(pins.filter(pinOn).map((p) => p.id), 1.6); };

  // ── Selection, filters, list ──────────────────────────────────────
  const rows = [...scope.querySelectorAll<HTMLButtonElement>('[data-trip]')];
  const placeRows = [...scope.querySelectorAll<HTMLButtonElement>('[data-place]')];
  const filters = [...scope.querySelectorAll<HTMLButtonElement>('[data-layer]')];
  function select(t: Trip | null) {
    selected = t;
    rows.forEach((r) => r.setAttribute('aria-pressed', String(!!t && r.dataset.trip === t.id)));
    if (t) fit(t.stops); else touch();
  }
  rows.forEach((r) => {
    const t = data.trips.find((x) => x.id === r.dataset.trip); if (!t) return;
    r.addEventListener('click', () => select(selected === t ? null : t));
    r.addEventListener('pointerenter', () => { preview = t; touch(); });
    r.addEventListener('pointerleave', () => { preview = null; touch(); });
    r.addEventListener('focus', () => { preview = t; touch(); });
    r.addEventListener('blur', () => { preview = null; touch(); });
  });
  placeRows.forEach((r) => r.addEventListener('click', () => { select(null); fit([r.dataset.place!], 2.2); }));
  filters.forEach((f) => f.addEventListener('click', () => {
    const k = f.dataset.layer as keyof typeof layers; layers[k] = !layers[k];
    f.setAttribute('aria-pressed', String(layers[k]));
    rows.forEach((r) => { const t = data.trips.find((x) => x.id === r.dataset.trip); if (t) r.closest('li')!.hidden = !tripOn(t); });
    placeRows.forEach((r) => (r.closest('li')!.hidden = !layers.homes));
    if (selected && !tripOn(selected)) select(null);
    touch();
  }));

  // ── Pointer, wheel, keys ──────────────────────────────────────────
  let hits: { p: Pin; x: number; y: number }[] = [];
  const ptrs = new Map<number, { x: number; y: number }>();
  let dragging = false, moved = 0, pinch = 0;
  const local = (e: PointerEvent | WheelEvent) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const hitTest = (x: number, y: number) => {
    let best: Pin | null = null, bd = 14 * 14;
    for (const h of hits) { const d = (h.x - x) ** 2 + (h.y - y) ** 2; if (d < bd) { bd = d; best = h.p; } }
    return best;
  };
  function showTip(p: Pin | null, x = 0, y = 0) {
    hoverPin = p;
    if (!p) { tip.hidden = true; canvas.style.cursor = ''; return; }
    const ts = p.trips.filter(tripOn), crew = ts.filter((t) => t.crew).length;
    const lines = [`<b>${esc(p.place.name)}, ${esc(p.place.region)}</b>`];
    if (p.stints.length) lines.push(`<span class="hot">Home · ${p.stints.map((h) => `${esc(h.from)}–${h.to ? esc(h.to) : "now"}`).join(", ")}</span>`);
    if (ts.length) lines.push(`<span>${ts.length} trip${ts.length > 1 ? 's' : ''}${crew ? ` · ${crew} with Powder` : ''}</span>`);
    lines.push(`<span>${fmtLat(p.place.lat)} ${fmtLon(p.place.lon)}</span>`);
    tip.innerHTML = lines.join('');
    tip.hidden = false;
    const flip = x > W - 200;
    tip.style.transform = `translate(${flip ? x - 14 : x + 14}px, ${y + 14}px) translateX(${flip ? '-100%' : '0'})`;
    canvas.style.cursor = 'pointer';
  }
  const setEngaged = (on: boolean) => { engaged = on; root.classList.toggle('engaged', on); };

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragging = true; moved = 0; fly = null; vLam = vPhi = 0; lastInput = performance.now();
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
  });
  canvas.addEventListener('pointermove', (e) => {
    const prev = ptrs.get(e.pointerId);
    if (!prev) { const l = local(e); const p = hitTest(l.x, l.y); if (p !== hoverPin || p) { showTip(p, l.x, l.y); touch(); } return; }
    const dx = e.clientX - prev.x, dy = e.clientY - prev.y; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved += Math.abs(dx) + Math.abs(dy); lastInput = performance.now();
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch) zoom = clamp(zoom * Math.pow(d / pinch, PINCH), 1, ZMAX); pinch = d; touch(); return;
    }
    const k = 180 / (Math.PI * Math.max(R, 1));
    lam += dx * k; phi = clamp(phi - dy * k, -85, 85);
    const dt = Math.max(e.timeStamp - (lastMove || e.timeStamp - 16), 8) / 1000; lastMove = e.timeStamp;
    vLam = dx * k / dt; vPhi = -dy * k / dt;
    showTip(null); touch();
  });
  let lastMove = 0;
  const up = (e: PointerEvent) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = 0;
    if (ptrs.size) return;
    dragging = false;
    if (performance.now() - lastMove > 80 || !armed) vLam = vPhi = 0;
    if (moved < 5) {
      setEngaged(true);
      const l = local(e), p = hitTest(l.x, l.y);
      if (p) { const own = p.trips.filter(tripOn); select(null); fit(own.length && !p.home ? own[0].stops : [p.id], 2.2); showTip(p, l.x, l.y); }
    }
    schedule();
  };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('pointerleave', () => { if (!dragging && hoverPin) { showTip(null); touch(); } });
  canvas.addEventListener('wheel', (e) => { if (!engaged) return; e.preventDefault(); fly = null; zoom = clamp(zoom * Math.exp(-e.deltaY * WHEEL), 1, ZMAX); lastInput = performance.now(); touch(); }, { passive: false });
  canvas.addEventListener('keydown', (e) => {
    const s = 10 / zoom, act: Record<string, () => void> = {
      ArrowLeft: () => (lam -= s), ArrowRight: () => (lam += s), ArrowUp: () => (phi = clamp(phi + s, -85, 85)), ArrowDown: () => (phi = clamp(phi - s, -85, 85)),
      '+': () => (zoom = clamp(zoom * KEY, 1, ZMAX)), '=': () => (zoom = clamp(zoom * KEY, 1, ZMAX)), '-': () => (zoom = clamp(zoom / KEY, 1, ZMAX)),
      r: () => { select(null); home(); }, R: () => { select(null); home(); }, Escape: () => { setEngaged(false); select(null); },
    };
    if (!act[e.key]) return;
    e.preventDefault(); fly = null; lastInput = performance.now(); act[e.key](); touch();
  });
  canvas.addEventListener('blur', () => setEngaged(false));
  root.querySelectorAll<HTMLButtonElement>('[data-tg]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.tg;
    if (k === 'in') flyTo(center(), clamp(zoom * BTN, 1, ZMAX), 350);
    if (k === 'out') flyTo(center(), clamp(zoom / BTN, 1, ZMAX), 350);
    if (k === 'reset') { select(null); home(); }
  }));

  // ── Lifecycle ─────────────────────────────────────────────────────
  readColors(); resize();
  { // Opening pose: home base, tilted so the northern routes sit across the face.
    const h = P(current ?? '') ?? pins[0]?.place;
    if (h) { lam = -h.lon; phi = -(h.lat - 12); }
  }
  new ResizeObserver(() => { resize(); touch(); }).observe(canvas);
  new MutationObserver(() => { readColors(); if (!armed) { fly = null; vLam = vPhi = 0; } touch(); }).observe(doc, { attributes: true, attributeFilter: ['data-theme', 'data-motion'] });
  new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); if (visible) { lastT = 0; schedule(); } }, { rootMargin: '100px' }).observe(root);
  document.fonts?.ready.then(() => touch());
  root.classList.add('ready');
  touch();
}
