// Skica za naslovnu sliku: iz slike se izdvoje mirne konture (zgrada, teren, stabla) i poredjaju u poteze
// kojima bi ih olovka nacrtala, bez podizanja kad je sledeca linija blizu. Radi u pregledacu (admin i
// tools/sketch.html). Rezultat je mali JSON { w, h, s: [[x0, y0, x1, y1, ...], ...] } koji sajt crta (js/site.js).
export const SKETCH_W = 1400;

// 1. ivice (Canny): siva slika, blago zamucenje, Sobel, stanjivanje, dva praga
function edges(src, W) {
  const H = Math.round(src.height * W / src.width);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(src, 0, 0, W, H);
  const d = x.getImageData(0, 0, W, H).data, n = W * H;
  let g = new Float32Array(n);
  for (let i = 0; i < n; i++) g[i] = .299 * d[i * 4] + .587 * d[i * 4 + 1] + .114 * d[i * 4 + 2];
  const k = [1, 4, 6, 4, 1];
  const blur = (s, dx, dy) => {
    const o = new Float32Array(n);
    for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
      let v = 0;
      for (let t = -2; t <= 2; t++) { const X = Math.min(W - 1, Math.max(0, xx + t * dx)), Y = Math.min(H - 1, Math.max(0, y + t * dy)); v += s[Y * W + X] * k[t + 2]; }
      o[y * W + xx] = v / 16;
    }
    return o;
  };
  g = blur(blur(g, 1, 0), 0, 1);
  const mag = new Float32Array(n), dir = new Uint8Array(n);
  for (let y = 1; y < H - 1; y++) for (let xx = 1; xx < W - 1; xx++) {
    const i = y * W + xx;
    const gx = -g[i - W - 1] - 2 * g[i - 1] - g[i + W - 1] + g[i - W + 1] + 2 * g[i + 1] + g[i + W + 1];
    const gy = -g[i - W - 1] - 2 * g[i - W] - g[i - W + 1] + g[i + W - 1] + 2 * g[i + W] + g[i + W + 1];
    mag[i] = Math.hypot(gx, gy);
    const a = (Math.atan2(gy, gx) * 180 / Math.PI + 180) % 180;
    dir[i] = a < 22.5 || a >= 157.5 ? 0 : a < 67.5 ? 1 : a < 112.5 ? 2 : 3;
  }
  const nms = new Float32Array(n), off = [[1, 0], [1, 1], [0, 1], [-1, 1]];
  for (let y = 1; y < H - 1; y++) for (let xx = 1; xx < W - 1; xx++) {
    const i = y * W + xx, [ox, oy] = off[dir[i]], m = mag[i];
    if (m >= mag[i + oy * W + ox] && m >= mag[i - oy * W - ox]) nms[i] = m;
  }
  const vals = Array.from(nms).filter((v) => v > 0).sort((a, b) => a - b);
  const hi = vals[Math.floor(vals.length * .8)] || 1, lo = hi * .38;
  const e = new Uint8Array(n), st = [];
  for (let i = 0; i < n; i++) if (nms[i] >= hi) { e[i] = 1; st.push(i); }
  while (st.length) {
    const i = st.pop();
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const j = i + dy * W + dx; if (j >= 0 && j < n && !e[j] && nms[j] >= lo) { e[j] = 1; st.push(j); } }
  }
  return { e, W, H };
}

// 2. konture: pracenje u oba smera, pojednostavljenje, a kratki nemirni komadici (trava, lisce) otpadaju
function contours({ e, W, H }) {
  const seen = new Uint8Array(W * H), out = [];
  const nb = (i) => { const r = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const j = i + dy * W + dx; if (j >= 0 && j < W * H && e[j] && !seen[j]) r.push(j); } return r; };
  const walk = (from) => { const pts = []; let cur = from; for (;;) { const r = nb(cur); if (!r.length) break; cur = r[0]; seen[cur] = 1; pts.push([cur % W, (cur / W) | 0]); } return pts; };
  const rdp = (pts, eps) => {
    if (pts.length < 3) return pts;
    const a = pts[0], b = pts[pts.length - 1]; let md = 0, mi = 0;
    for (let i = 1; i < pts.length - 1; i++) { const p = pts[i]; const dd = Math.abs((b[1] - a[1]) * p[0] - (b[0] - a[0]) * p[1] + b[0] * a[1] - b[1] * a[0]) / (Math.hypot(b[0] - a[0], b[1] - a[1]) || 1); if (dd > md) { md = dd; mi = i; } }
    return md > eps ? rdp(pts.slice(0, mi + 1), eps).slice(0, -1).concat(rdp(pts.slice(mi), eps)) : [a, b];
  };
  for (let s = 0; s < W * H; s++) {
    if (!e[s] || seen[s]) continue;
    seen[s] = 1;
    const fwd = walk(s), back = walk(s), chain = back.reverse().concat([[s % W, (s / W) | 0]], fwd);
    if (chain.length < 8) continue;
    const pts = rdp(chain, 1.3), minSeg = W * .0075;
    let run = [pts[0]], L = 0;
    const flush = () => { if (run.length > 1 && L >= W * .014) out.push({ pts: run, L }); };
    for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (d >= minSeg) { run.push(pts[i]); L += d; } else { flush(); run = [pts[i]]; L = 0; }
    }
    flush();
  }
  return out.sort((a, b) => b.L - a.L).slice(0, 1100);
}

// 3. potezi: olovka ide na najblizu sledecu konturu; ako je blizu, nastavlja bez podizanja
function strokes(lines, W) {
  if (!lines.length) return [];
  const left = lines.slice(), out = [], join = W * .05;
  let stroke = left.splice(left.reduce((bi, l, i, a) => (l.pts[0][0] + l.pts[0][1] < a[bi].pts[0][0] + a[bi].pts[0][1] ? i : bi), 0), 1)[0].pts.slice();
  while (left.length) {
    const [ex, ey] = stroke[stroke.length - 1];
    let bi = 0, bd = Infinity, rev = false;
    for (let i = 0; i < left.length; i++) {
      const p = left[i].pts, a = p[0], b = p[p.length - 1];
      const da = (a[0] - ex) ** 2 + (a[1] - ey) ** 2, db = (b[0] - ex) ** 2 + (b[1] - ey) ** 2;
      if (da < bd) { bd = da; bi = i; rev = false; }
      if (db < bd) { bd = db; bi = i; rev = true; }
    }
    const next = left.splice(bi, 1)[0], pts = rev ? next.pts.slice().reverse() : next.pts;
    if (Math.sqrt(bd) <= join) stroke = stroke.concat(pts);
    else { out.push(stroke); stroke = pts.slice(); }
  }
  out.push(stroke);
  return out;
}

// src: Image ili ImageBitmap. Vraca JSON tekst skice.
export function makeSketch(src) {
  const ed = edges(src, SKETCH_W);
  const s = strokes(contours(ed), ed.W).map((st) => st.flat());
  return JSON.stringify({ w: ed.W, h: ed.H, s });
}
