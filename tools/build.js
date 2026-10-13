#!/usr/bin/env node
// Lokalni build: node tools/build.js [--out dir] [--check]
// Isti generator (tools/build-core.js) koristi i admin stranica, ali ona gradi samo stranice koje zavise od projekata.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSite, DYNAMIC_SOURCES, STATIC_SOURCES } from './build-core.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const outDir = outIdx >= 0 ? path.resolve(args[outIdx + 1]) : root;
const check = args.includes('--check');

const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const data = JSON.parse(rd('data/projects.json'));
const sources = Object.fromEntries([...DYNAMIC_SOURCES, ...STATIC_SOURCES].map((p) => [p, rd(p)]));
const files = buildSite(data, sources, { all: true });

let changed = 0;
for (const [rel, content] of Object.entries(files)) {
  const target = path.join(outDir, rel);
  const old = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;
  if (old === content) continue;
  changed++;
  if (check) { console.log('razlika:', rel); continue; }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
  console.log('upisano:', rel);
}

// obrisi stranice projekata koji vise ne postoje u data/projects.json
const workDir = path.join(outDir, 'work');
if (fs.existsSync(workDir)) {
  for (const f of fs.readdirSync(workDir)) {
    if (f.endsWith('.html') && !(`work/${f}` in files)) {
      changed++;
      if (check) console.log('visak:', `work/${f}`);
      else { fs.unlinkSync(path.join(workDir, f)); console.log('obrisano:', `work/${f}`); }
    }
  }
}
console.log(changed ? `${changed} fajl(ova) ${check ? 'se razlikuje' : 'promenjeno'}` : 'sve je vec aktuelno');
