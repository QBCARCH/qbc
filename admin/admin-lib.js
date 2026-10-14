// Logika admin stranice: GitHub klijent, obrada slika, objava u jednom commit-u.
import { buildSite, slugify, DYNAMIC_SOURCES } from '../tools/build-core.js';

export const WIDTHS = [500, 800, 1080, 1600, 2000, 2600, 3200];
export const MAX_W = 3840;

// ---------------------------------------------------------------- GitHub
export class GitHub {
  constructor({ token, repo, branch = 'main', fetchImpl }) {
    this.token = token; this.repo = repo; this.branch = branch;
    this.f = fetchImpl || ((...a) => fetch(...a));
  }
  async api(path, { method = 'GET', body, raw = false } = {}) {
    const r = await this.f(`https://api.github.com/repos/${this.repo}${path ? '/' + path : ''}`, {
      method,
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) {
      let msg = '';
      try { msg = (await r.json()).message || ''; } catch { /* ignore */ }
      const e = new Error(explainError(r.status, msg));
      e.status = r.status; throw e;
    }
    return raw ? r.text() : r.json();
  }
  async check() {
    const info = await this.api('');
    if (!info.permissions || !info.permissions.push) {
      throw new Error('Token nema pravo upisa (Contents: Read and write) za ovaj repozitorijum.');
    }
    return info;
  }
  getText(path) {
    return this.api(`contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(this.branch)}`, { raw: true });
  }
  async exists(path) {
    try { await this.getText(path); return true; } catch (e) { if (e.status === 404) return false; throw e; }
  }
  // files: [{path, text} | {path, base64}], deletes: [path]
  async commit({ message, files, deletes = [], onProgress = () => {} }) {
    onProgress('Čitam trenutno stanje sajta');
    const ref = await this.api(`git/ref/heads/${this.branch}`);
    const parent = ref.object.sha;
    const parentCommit = await this.api(`git/commits/${parent}`);
    const entries = [];
    let done = 0;
    const queue = files.slice();
    const worker = async () => {
      while (queue.length) {
        const f = queue.shift();
        const blob = await this.api('git/blobs', {
          method: 'POST',
          body: f.base64 !== undefined ? { content: f.base64, encoding: 'base64' } : { content: f.text, encoding: 'utf-8' },
        });
        entries.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
        onProgress(`Šaljem fajlove (${++done}/${files.length})`);
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, files.length) || 1 }, worker));
    if (deletes.length) {
      // brisanje nepostojece putanje GitHub odbija, pa brisemo samo ono sto stvarno postoji
      const full = await this.api(`git/trees/${parentCommit.tree.sha}?recursive=1`);
      const have = new Set((full.tree || []).map((t) => t.path));
      for (const p of deletes) if (have.has(p)) entries.push({ path: p, mode: '100644', type: 'blob', sha: null });
    }
    onProgress('Pravim commit');
    const tree = await this.api('git/trees', { method: 'POST', body: { base_tree: parentCommit.tree.sha, tree: entries } });
    const commit = await this.api('git/commits', { method: 'POST', body: { message, tree: tree.sha, parents: [parent] } });
    try {
      await this.api(`git/refs/heads/${this.branch}`, { method: 'PATCH', body: { sha: commit.sha, force: false } });
    } catch (e) {
      if (e.status === 422) throw new Error('Sajt je u međuvremenu izmenjen na drugom mestu. Osveži stranicu i ponovi unos.');
      throw e;
    }
    return commit.sha;
  }
}

function explainError(status, msg) {
  if (status === 401) return 'Token nije ispravan ili je istekao.';
  if (status === 403) return 'GitHub je odbio zahtev (nedovoljna prava tokena ili ograničenje broja zahteva). ' + msg;
  if (status === 404) return 'Repozitorijum ili fajl nije pronađen (proveri naziv repozitorijuma i prava tokena).';
  return `GitHub greška ${status}: ${msg}`;
}

// ---------------------------------------------------------------- pomocne funkcije za podatke
export function allImages(p) {
  return [p.cover, p.thumb, p.hero, ...(p.gallery || [])].filter(Boolean);
}
export function imagePaths(im) {
  const dot = im.file.lastIndexOf('.');
  const base = im.file.slice(0, dot), ext = im.file.slice(dot + 1);
  return ['images/' + im.file, ...(im.widths || []).map((w) => `images/${base}-p-${w}.${ext}`), ...(im.og ? ['images/' + im.og] : [])];
}
export function orphanImagePaths(removed, remaining) {
  const used = new Set(remaining.flatMap((p) => allImages(p).map((i) => i.file)));
  const out = new Set();
  for (const im of allImages(removed)) if (!used.has(im.file)) imagePaths(im).forEach((x) => out.add(x));
  return [...out];
}
export function uniqueSlug(title, projects, ignore) {
  const base = slugify(title);
  let s = base, i = 2;
  while (projects.some((p) => p.slug === s && p.slug !== ignore)) s = `${base}-${i++}`;
  return s;
}

// ---------------------------------------------------------------- slike (samo u pregledacu)
// Sve slike se cuvaju kao WebP (manje i brze), uz jednu JPEG kopiju od 1200 px za deljenje na mrezama.
// Ako pregledac ne ume da pravi WebP (stariji Safari), koristi se JPEG.
export const SMALL_W = 2400;

function toBlob(canvas, type, q) {
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Ne mogu da obradim sliku'))), type, q));
}
let webpOk = null;
async function canWebp() {
  if (webpOk === null) {
    const c = document.createElement('canvas'); c.width = c.height = 2;
    try { webpOk = (await toBlob(c, 'image/webp', 0.8)).type === 'image/webp'; } catch { webpOk = false; }
  }
  return webpOk;
}

export async function processImage(file) {
  let bmp;
  try { bmp = await createImageBitmap(file); } catch { throw new Error(`Slika "${file.name}" nije podržan format (koristi JPG, PNG ili WEBP).`); }
  const origW = bmp.width, origH = bmp.height;
  const webp = await canWebp();
  const ext = webp ? 'webp' : 'jpg', type = webp ? 'image/webp' : 'image/jpeg';
  const draw = (w, flat) => {
    const h = Math.round((origH * w) / origW);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    if (flat || !webp) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, 0, 0, w, h);
    return c;
  };
  const finalW = Math.min(origW, MAX_W);
  const rand = Math.random().toString(16).slice(2, 8);
  const stem = (file.name.replace(/\.[^.]+$/, '') || 'slika');
  const safe = stem.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'slika';
  const base = `${Date.now().toString(16)}${rand}_${safe}`;
  const name = `${base}.${ext}`;
  const widths = WIDTHS.filter((w) => w < finalW);
  const blobs = [{ path: 'images/' + name, blob: await toBlob(draw(finalW), type, 0.86) }];
  for (const w of widths) blobs.push({ path: `images/${base}-p-${w}.${ext}`, blob: await toBlob(draw(w), type, 0.82) });
  const og = `${base}-og.jpg`;
  blobs.push({ path: 'images/' + og, blob: await toBlob(draw(Math.min(1200, finalW), true), 'image/jpeg', 0.8) });
  bmp.close && bmp.close();
  return { entry: { file: name, widths, w: finalW, h: Math.round((origH * finalW) / origW), og }, blobs, origW, safe };
}

export async function blobToBase64(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  const CH = 0x8000;
  for (let i = 0; i < buf.length; i += CH) bin += String.fromCharCode.apply(null, buf.subarray(i, i + CH));
  return btoa(bin);
}

// ---------------------------------------------------------------- objava
// state: { data, pending: Map(path -> Blob|{base64}), removedProjects: [project] }
export async function publish(gh, { data, pending, removed = [], message, onProgress = () => {} }) {
  onProgress('Učitavam šablone sa sajta');
  const texts = await Promise.all(DYNAMIC_SOURCES.map((p) => gh.getText(p)));
  const sources = Object.fromEntries(DYNAMIC_SOURCES.map((p, i) => [p, texts[i]]));
  const built = buildSite(data, sources);
  const files = Object.entries(built).map(([path, text]) => ({ path, text }));
  files.push({ path: 'data/projects.json', text: JSON.stringify(data, null, 1) + '\n' });
  onProgress('Pripremam slike');
  for (const [path, b] of pending) {
    files.push({ path, base64: b.base64 !== undefined ? b.base64 : await blobToBase64(b) });
  }
  const deletes = [];
  for (const p of removed) {
    deletes.push(`work/${p.slug}.html`);
    deletes.push(...orphanImagePaths(p, data.projects));
  }
  return gh.commit({ message, files, deletes, onProgress });
}
