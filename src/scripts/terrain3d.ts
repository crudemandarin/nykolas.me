// FO-01 survey model: a hand-rolled WebGL2 relief of real elevation data.
// No 3D library. Loads its mesh (~24 KB) only when the plate nears the viewport,
// renders on demand, and parks in its resting pose when motion is idle.

type Marker = { key: string; label: string; u: number; v: number; hot?: boolean };
type Meta = {
  url: string; cols: number; rows: number; scale: number; minM: number; maxM: number; widthKm: number; depthKm: number;
  intervalFt: number; indexFt: number; markers: Marker[]; seg: [number, number, number, number];
};

const EX = 1.5;           // vertical exaggeration
const FT = 0.3048;
type V3 = [number, number, number];

// ── tiny matrix kit (column-major, as WebGL expects) ────────────────
const perspective = (fovy: number, aspect: number, near: number, far: number) => {
  const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
};
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const lookAt = (eye: V3, target: V3, up: V3) => {
  const z = norm(sub(eye, target)), x = norm(cross(up, z)), y = cross(z, x);
  return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1]);
};
const mul = (a: Float32Array, b: Float32Array) => {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s;
  }
  return o;
};
const project = (m: Float32Array, p: V3) => {
  const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12];
  const y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13];
  const w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
  return { x: x / w, y: y / w, w };
};

const VS = `#version 300 es
in vec3 a_pos; in vec3 a_nrm; in vec2 a_uv; in float a_ft;
uniform mat4 u_mvp;
out vec3 v_nrm; out vec2 v_uv; out float v_ft;
void main() { v_nrm = a_nrm; v_uv = a_uv; v_ft = a_ft; gl_Position = u_mvp * vec4(a_pos, 1.0); }`;

const FS = `#version 300 es
precision highp float;
in vec3 v_nrm; in vec2 v_uv; in float v_ft;
uniform vec3 u_low, u_high, u_line, u_index, u_signal, u_skirt, u_light;
uniform float u_interval, u_indexEvery, u_minFt, u_maxFt, u_aspect;
uniform vec4 u_seg;
out vec4 o;
float contour(float f, float wmul) { float w = fwidth(f); float d = abs(fract(f - 0.5) - 0.5); return 1.0 - smoothstep(0.0, w * wmul, d); }
void main() {
  vec3 n = normalize(v_nrm);
  float lam = max(dot(n, u_light), 0.0);
  if (v_ft < 0.0) { o = vec4(u_skirt * (0.75 + 0.5 * lam), 1.0); return; }
  float t = clamp((v_ft - u_minFt) / (u_maxFt - u_minFt), 0.0, 1.0);
  vec3 col = mix(u_low, u_high, t) * (0.62 + 0.55 * lam);
  float relief = 1.0 - smoothstep(0.992, 0.9995, n.y);   // contours fade on near-flat valley floor
  col = mix(col, u_line, contour(v_ft / u_interval, 1.0) * 0.7 * relief);
  col = mix(col, u_index, contour(v_ft / (u_interval * u_indexEvery), 1.6) * relief);
  vec2 p = vec2(v_uv.x * u_aspect, v_uv.y), a = vec2(u_seg.x * u_aspect, u_seg.y), b = vec2(u_seg.z * u_aspect, u_seg.w);
  vec2 ab = b - a; float h = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
  float dist = length(p - a - ab * h); float fw = fwidth(dist);
  float tr = (1.0 - smoothstep(0.003, 0.003 + fw * 1.5, dist)) * step(0.45, fract(h * 22.0));
  o = vec4(mix(col, u_signal, tr), 1.0);
}`;

const hex = (css: string): V3 => {
  const h = css.trim().replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  return [parseInt(v.slice(0, 2), 16) / 255, parseInt(v.slice(2, 4), 16) / 255, parseInt(v.slice(4, 6), 16) / 255];
};

function build(meta: Meta, h: Float32Array) {
  const { cols, rows, minM } = meta, W = meta.widthKm, D = meta.depthKm;
  const y = (m: number) => ((m - minM) / 1000) * EX;
  const n = cols * rows;
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), uv = new Float32Array(n * 2), ft = new Float32Array(n);
  const P = (i: number, j: number): V3 => [(i / (cols - 1) - 0.5) * W, y(h[j * cols + i]), (j / (rows - 1) - 0.5) * D];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const k = j * cols + i, p = P(i, j);
    pos.set(p, k * 3); uv.set([i / (cols - 1), j / (rows - 1)], k * 2); ft[k] = h[k] / FT;
    const l = P(Math.max(i - 1, 0), j), r = P(Math.min(i + 1, cols - 1), j), u = P(i, Math.max(j - 1, 0)), d = P(i, Math.min(j + 1, rows - 1));
    nrm.set(norm(cross(sub(d, u), sub(r, l))), k * 3);
  }
  const idx = new Uint32Array((cols - 1) * (rows - 1) * 6);
  let q = 0;
  for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
    const a = j * cols + i, b = a + 1, c = a + cols, d = c + 1;
    idx.set([a, c, b, b, c, d], q); q += 6;
  }
  // skirt: walls down to a base plane, so the model reads as a cut block
  const base = -0.25, sp: number[] = [], sn: number[] = [], si: number[] = [];
  const edge = (pts: [number, number][], out: V3) => {
    const start = sp.length / 3;
    for (const [i, j] of pts) { const p = P(i, j); sp.push(...p, p[0], base, p[2]); sn.push(...out, ...out); }
    for (let k = 0; k < pts.length - 1; k++) { const a = start + k * 2; si.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
  };
  const range = (len: number) => Array.from({ length: len }, (_, k) => k);
  edge(range(cols).map((i) => [i, 0]), [0, 0, -1]);
  edge(range(cols).map((i) => [i, rows - 1]), [0, 0, 1]);
  edge(range(rows).map((j) => [0, j]), [-1, 0, 0]);
  edge(range(rows).map((j) => [cols - 1, j]), [1, 0, 0]);
  const heightAt = (u: number, v: number) => y(h[Math.round(v * (rows - 1)) * cols + Math.round(u * (cols - 1))]);
  return { pos, nrm, uv, ft, idx, skirt: { pos: new Float32Array(sp), nrm: new Float32Array(sn), idx: new Uint32Array(si) }, heightAt, W, D, maxY: y(meta.maxM) };
}

function mount(root: HTMLElement) {
  const meta: Meta = JSON.parse(root.dataset.terrain!);
  const canvas = root.querySelector('canvas')!;
  const labels = root.querySelector<HTMLElement>('.t3d-labels')!;
  const north = root.querySelector<SVGElement>('.t3d-north svg')!;
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: false });
  if (!gl) return;
  const doc = document.documentElement;

  const compile = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  const U = (n: string) => gl.getUniformLocation(prog, n);

  fetch(meta.url).then((r) => r.arrayBuffer()).then((buf) => {
    const dv = new DataView(buf), h = new Float32Array(buf.byteLength / 2);
    for (let k = 0; k < h.length; k++) h[k] = dv.getUint16(k * 2, true) * meta.scale;
    const m = build(meta, h);

    const vao = (pos: Float32Array, nrm: Float32Array, idx: Uint32Array, uv?: Float32Array, ft?: Float32Array) => {
      const va = gl.createVertexArray()!; gl.bindVertexArray(va);
      const attr = (name: string, data: Float32Array, size: number) => {
        const loc = gl.getAttribLocation(prog, name); if (loc < 0) return;
        const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
      };
      attr('a_pos', pos, 3); attr('a_nrm', nrm, 3);
      if (uv && ft) { attr('a_uv', uv, 2); attr('a_ft', ft, 1); }
      else { const l = gl.getAttribLocation(prog, 'a_ft'); gl.disableVertexAttribArray(l); gl.vertexAttrib1f(l, -1); const lu = gl.getAttribLocation(prog, 'a_uv'); gl.disableVertexAttribArray(lu); gl.vertexAttrib2f(lu, 0, 0); }
      const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
      gl.bindVertexArray(null);
      return { va, count: idx.length };
    };
    const terrain = vao(m.pos, m.nrm, m.idx, m.uv, m.ft);
    const skirt = vao(m.skirt.pos, m.skirt.nrm, m.skirt.idx);

    gl.uniform1f(U('u_interval'), meta.intervalFt); gl.uniform1f(U('u_indexEvery'), meta.indexFt / meta.intervalFt);
    gl.uniform1f(U('u_minFt'), meta.minM / FT); gl.uniform1f(U('u_maxFt'), meta.maxM / FT);
    gl.uniform1f(U('u_aspect'), m.W / m.D); gl.uniform4fv(U('u_seg'), meta.seg);
    gl.uniform3fv(U('u_light'), norm([-0.55, 0.75, -0.35]));
    gl.enable(gl.DEPTH_TEST);

    let bg: V3 = [0, 0, 0];
    const palette = () => {
      const cs = getComputedStyle(doc), v = (n: string) => hex(cs.getPropertyValue(n));
      bg = v('--surface-200');
      gl.uniform3fv(U('u_low'), v('--surface-300')); gl.uniform3fv(U('u_high'), v('--line-strong'));
      gl.uniform3fv(U('u_line'), v('--ink-subtle')); gl.uniform3fv(U('u_index'), v('--ink-muted'));
      gl.uniform3fv(U('u_signal'), v('--signal')); gl.uniform3fv(U('u_skirt'), v('--surface-000'));
      dirty = true;
    };

    // camera: orbit around a target on the model
    const narrow = canvas.clientWidth / Math.max(canvas.clientHeight, 1) < 1.1;
    const home = { theta: -1.2, phi: 0.6, r: m.W * (narrow ? 1.6 : 1.95), tx: 0.03 * m.W, tz: 0 };
    let { theta, phi, r, tx, tz } = home;
    let vTheta = 0, dirty = true, engaged = false, auto = true, visible = false;
    const ty = m.maxY * 0.35;
    const still = () => doc.dataset.motion === 'idle';

    const markerEls = meta.markers.map((mk) => {
      const el = document.createElement('span');
      el.className = 't3d-mark' + (mk.hot ? ' hot' : '') + (mk.key === 'crestone_town' ? ' town' : '');
      el.innerHTML = mk.key === 'crestone_needle' ? '<i></i>' : `<i></i><b>${mk.label}</b>`;
      labels.appendChild(el);
      return { mk, el, p: [(mk.u - 0.5) * m.W, m.heightAt(mk.u, mk.v) + 0.08, (mk.v - 0.5) * m.D] as V3 };
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();   // rendered size, so CSS zoom on large screens stays sharp
      const w = Math.round(rect.width * dpr), hh = Math.round(rect.height * dpr);
      if (canvas.width !== w || canvas.height !== hh) { canvas.width = w; canvas.height = hh; dirty = true; }
    };

    const draw = () => {
      resize();
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(bg[0], bg[1], bg[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const eye: V3 = [tx + r * Math.cos(phi) * Math.sin(theta), ty + r * Math.sin(phi), tz + r * Math.cos(phi) * Math.cos(theta)];
      const mvp = mul(perspective(0.62, canvas.width / canvas.height, 0.05, 200), lookAt(eye, [tx, ty, tz], [0, 1, 0]));
      gl.uniformMatrix4fv(U('u_mvp'), false, mvp);
      for (const o of [terrain, skirt]) { gl.bindVertexArray(o.va); gl.drawElements(gl.TRIANGLES, o.count, gl.UNSIGNED_INT, 0); }
      gl.bindVertexArray(null);
      const cw = canvas.clientWidth, ch = canvas.clientHeight;
      for (const { el, p } of markerEls) {
        const s = project(mvp, p);
        const on = s.w > 0 && Math.abs(s.x) < 1.05 && Math.abs(s.y) < 1.05;
        const px = ((s.x + 1) / 2) * cw;
        el.style.opacity = on ? '1' : '0';
        el.classList.toggle('flip', px > cw - 150);   // keep labels inside the plate near the right edge
        el.style.transform = `translate(${px}px, ${((1 - s.y) / 2) * ch}px)`;
      }
      const a = project(mvp, [tx, ty, tz]), b = project(mvp, [tx, ty, tz - 1]);
      north.style.transform = `rotate(${Math.atan2((b.x - a.x) * cw, (b.y - a.y) * ch) * (180 / Math.PI)}deg)`;
    };

    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      if (!still()) {
        if (Math.abs(vTheta) > 1e-4) { theta += vTheta; vTheta *= Math.pow(0.04, dt); dirty = true; }  // inertia, decays smoothly
        else if (auto && visible) { theta += dt * 0.05; dirty = true; }
      }
      if (dirty) { draw(); dirty = false; }
      requestAnimationFrame(loop);
    };

    // ── input ─────────────────────────────────────────────────────
    const ptrs = new Map<number, { x: number; y: number }>();
    let mode: 'rotate' | 'pan' = 'rotate', pinch = 0, moved = 0;
    const stop = () => { auto = false; root.classList.add('touched'); };
    const setEngaged = (on: boolean) => { engaged = on; root.classList.toggle('engaged', on); };
    const pan = (dx: number, dy: number) => {
      const k = r * 0.0016;
      tx += (-Math.cos(theta) * dx - Math.sin(theta) * dy) * k;
      tz += (Math.sin(theta) * dx - Math.cos(theta) * dy) * k;
      tx = Math.max(-m.W / 2, Math.min(m.W / 2, tx)); tz = Math.max(-m.D / 2, Math.min(m.D / 2, tz));
    };
    const zoom = (f: number) => { r = Math.max(m.W * 0.45, Math.min(m.W * 3.2, r * f)); dirty = true; };

    canvas.addEventListener('pointerdown', (e) => {
      stop(); setEngaged(true); canvas.focus({ preventScroll: true });
      canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      mode = e.button === 2 || e.shiftKey || e.ctrlKey ? 'pan' : 'rotate'; vTheta = 0; moved = 0;
      if (ptrs.size === 2) { const [p, q] = [...ptrs.values()]; pinch = Math.hypot(p.x - q.x, p.y - q.y); }
    });
    canvas.addEventListener('pointermove', (e) => {
      const prev = ptrs.get(e.pointerId); if (!prev) return;
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved += Math.abs(dx) + Math.abs(dy);
      if (ptrs.size === 2) {
        const [p, q] = [...ptrs.values()]; const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (pinch) zoom(pinch / d); pinch = d; pan(dx / 2, dy / 2);
      } else if (mode === 'pan') pan(dx, dy);
      else { const d = -dx * 0.006; theta += d; vTheta = d; phi = Math.max(0.14, Math.min(1.45, phi + dy * 0.005)); }
      dirty = true;
    });
    const up = (e: PointerEvent) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = 0; if (still()) vTheta = 0; };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => { if (!engaged) return; e.preventDefault(); stop(); zoom(Math.exp(e.deltaY * 0.0012)); }, { passive: false });
    canvas.addEventListener('keydown', (e) => {
      const k = e.key; let used = true; stop();
      if (k === 'ArrowLeft' && e.shiftKey) pan(-40, 0); else if (k === 'ArrowRight' && e.shiftKey) pan(40, 0);
      else if (k === 'ArrowUp' && e.shiftKey) pan(0, -40); else if (k === 'ArrowDown' && e.shiftKey) pan(0, 40);
      else if (k === 'ArrowLeft') theta += 0.12; else if (k === 'ArrowRight') theta -= 0.12;
      else if (k === 'ArrowUp') phi = Math.min(1.45, phi + 0.08); else if (k === 'ArrowDown') phi = Math.max(0.14, phi - 0.08);
      else if (k === '+' || k === '=') zoom(0.85); else if (k === '-' || k === '_') zoom(1.18);
      else if (k === 'r' || k === 'R') ({ theta, phi, r, tx, tz } = home);
      else if (k === 'Escape') { setEngaged(false); canvas.blur(); }
      else used = false;
      if (used) { e.preventDefault(); dirty = true; }
    });
    canvas.addEventListener('blur', () => setEngaged(false));
    root.querySelector('[data-t3d="in"]')?.addEventListener('click', () => { stop(); zoom(0.8); });
    root.querySelector('[data-t3d="out"]')?.addEventListener('click', () => { stop(); zoom(1.25); });
    root.querySelector('[data-t3d="reset"]')?.addEventListener('click', () => { stop(); ({ theta, phi, r, tx, tz } = home); vTheta = 0; dirty = true; });

    new ResizeObserver(() => { dirty = true; }).observe(canvas);
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(root);
    new MutationObserver(palette).observe(doc, { attributes: true, attributeFilter: ['data-theme'] });
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); root.classList.remove('ready'); });

    palette(); root.classList.add('ready'); requestAnimationFrame(loop);
  }).catch(() => root.classList.remove('ready'));
}

export function mountAll() {
  const roots = document.querySelectorAll<HTMLElement>('[data-terrain]');
  if (!('IntersectionObserver' in window)) return roots.forEach(mount);
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); mount(e.target as HTMLElement); } }), { rootMargin: '600px 0px' });
  roots.forEach((r) => io.observe(r));
}
