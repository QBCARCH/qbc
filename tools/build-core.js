// QBC generator sajta: cista funkcija bez zavisnosti, radi u Node-u (tools/build.js) i u pregledacu (admin stranica).
// Ulaz: data/projects.json + izvori iz src/ (sabloni, delovi, services.json). Izlaz: mapa { 'putanja.html': 'sadrzaj' }.
//
// Sabloni koriste tri vrste oznaka:
//   {{> ime}}      ubacuje deo iz src/partials/ime.html
//   {{CUR:kljuc}}  ' aria-current="page"' ako je to trenutna stranica
//   {{IME}}        vrednost iz konteksta stranice (tekst, putanja, blokovi koje generise ovaj fajl)

export const STANDARD_SERVICES = [
  '1. Conceptual & Schematic Design',
  '2. Design Development & BIM Modeling',
  '3. Construction Documents & Engineering',
  '4. Construction Administration & Oversight',
  '5. Interior Architecture & Custom Detailing',
  '6. Feasibility Studies & Master Planning',
];

// Izvori koji utiču na stranice koje zavise od projekata (admin ih cita sa GitHub-a).
export const DYNAMIC_SOURCES = [
  'src/partials/head.html',
  'src/partials/nav.html',
  'src/partials/footer.html',
  'src/pages/index.html',
  'src/pages/our-work.html',
  'src/pages/work.html',
  'src/services.json',
];
// Ostale stranice (o nama, usluge, kontakt, privatnost) se grade samo lokalno, sa opcijom all.
export const STATIC_SOURCES = [
  'src/pages/about.html',
  'src/pages/services.html',
  'src/pages/contact.html',
  'src/pages/privacy-policy.html',
];

const STATIC_PAGES = [
  { out: 'about.html', src: 'about', key: 'about', title: 'About Us | QBC Architects - Architectural & Urban Design',
    desc: 'Founded in 2010, QBC Architects is a multidisciplinary studio focused on blending structural logic with modern aesthetic principles. Learn about our methodology and leadership team.' },
  { out: 'services.html', src: 'services', key: 'services', title: 'Architectural Services | QBC Architects',
    desc: 'We provide end-to-end architectural services, from schematic design and technical detailing to construction administration for residential and commercial projects.' },
  { out: 'contact.html', src: 'contact', key: 'contact', title: 'Contact QBC Architects | Start Your Project',
    desc: 'Discuss your next residential or commercial project with QBC Architects. Reach out to our studio to consult on functional and architecturally sound design solutions.' },
  { out: 'privacy-policy.html', src: 'privacy-policy', key: 'privacy', title: 'Privacy Policy | QBC Architects',
    desc: 'Read the privacy policy of QBC Architects. We are committed to protecting your personal information and ensuring transparency in our digital operations.' },
];

// ---------------------------------------------------------------- tekst
export const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function slugify(title) {
  const map = { č: 'c', ć: 'c', š: 's', ž: 'z', đ: 'dj', Č: 'c', Ć: 'c', Š: 's', Ž: 'z', Đ: 'dj' };
  return String(title)
    .replace(/[čćšžđČĆŠŽĐ]/g, (c) => map[c])
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'projekat';
}

// "tekst\n\ntekst" -> <p>tekst</p><p>tekst</p>
export function textToRichtext(text) {
  return String(text).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    .map((p) => '<p>' + esc(p).replace(/\n/g, '<br/>') + '</p>').join('');
}
export function richtextToText(html) {
  return String(html).replace(/<!--[\s\S]*?-->/g, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/[​-‍﻿]/g, '').trim();
}
// ociscen opis: bez starih komentara, nevidljivih znakova i praznih pasusa
const cleanRich = (html) => String(html || '')
  .replace(/<!--[\s\S]*?-->/g, '').replace(/[​-‍﻿]/g, '').replace(/&nbsp;| /g, ' ')
  .replace(/\s+<\/p>/g, '</p>').replace(/<p[^>]*>\s*<\/p>/g, '').trim();

const num = (i) => String(i + 1).padStart(2, '0');
const stripNum = (s) => String(s).replace(/^\d+\.\s*/, '');

// ---------------------------------------------------------------- slike
// ime fajla u adresi: zarez, razmak i slicno moraju biti kodirani (u srcset zarez razdvaja kandidate)
const encFile = (f) => encodeURIComponent(f).replace(/%2F/g, '/');
function variants(im) {
  const file = im.file, dot = file.lastIndexOf('.');
  return { base: file.slice(0, dot), ext: file.slice(dot + 1), widths: (im.widths || []).filter((w) => !im.w || w < im.w) };
}
// putanja slike u nekoj od sirina (prva dostupna koja je >= trazene, inace original)
export function imgUrl(im, root, want = 1600) {
  const { base, ext, widths } = variants(im);
  const w = widths.find((x) => x >= want);
  return w ? `${root}images/${encFile(`${base}-p-${w}.${ext}`)}` : `${root}images/${encFile(im.file)}`;
}
function img(im, { root, sizes = '100vw', alt = '', eager = false, want = 1600 } = {}) {
  const { base, ext, widths } = variants(im);
  const parts = widths.map((w) => `${root}images/${encFile(`${base}-p-${w}.${ext}`)} ${w}w`);
  if (im.w) parts.push(`${root}images/${encFile(im.file)} ${im.w}w`);
  const dims = im.w && im.h ? ` width="${im.w}" height="${im.h}"` : '';
  const set = parts.length > 1 ? ` srcset="${parts.join(', ')}" sizes="${sizes}"` : '';
  const load = eager ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"';
  return `<img src="${imgUrl(im, root, want)}"${set}${dims} alt="${esc(alt)}"${load}>`;
}

// ---------------------------------------------------------------- blokovi
const cover = (p) => p.cover || p.hero;
const li = (list, cls = '') => (list || []).map((t) => `<li${cls ? ` class="${cls}"` : ''}>${esc(t)}</li>`).join('');

// Slike na pocetnoj biraju se nasumicno u pregledacu (js/site.js, initPicks), a ovde se samo pravi izbor.
// Bez JS-a ostaje podrazumevana slika u <noscript>.
function pickImg(im, p, role, sizes) {
  const dims = im.w && im.h ? ` width="${im.w}" height="${im.h}"` : '';
  const prio = role === 'hero' ? ' fetchpriority="high"' : ' loading="lazy"';
  return `<img data-pick="${role}" data-sizes="${sizes}" alt="${esc(p.title)}"${dims}${prio}>` +
    `<noscript>${img(im, { root: '', sizes, alt: p.title, want: 2000 })}</noscript>`;
}
function heroCredit(p) {
  return `<a class="hero__credit" data-credit href="work/${p.slug}.html">${esc(p.title)} / ${esc(p.year)} ↗</a>`;
}

// Izbor slika za pocetnu: sve horizontalne slike, uz datum dodavanja projekta (za promo novog projekta).
function pool(projects, def, promoDays) {
  const p = projects.map((pr) => {
    const seen = new Set(), list = [];
    for (const im of [pr.hero, pr.cover, ...(pr.gallery || [])]) {
      if (!im || !im.file || seen.has(im.file)) continue;
      seen.add(im.file);
      if (im.w >= 1300 && im.h && im.w / im.h >= 1.35) list.push([im.file, im.w, im.h, (im.widths || []).filter((w) => w < im.w)]);
    }
    return { s: pr.slug, t: pr.title, y: pr.year, a: pr.added || '', i: list };
  }).filter((x) => x.i.length);
  const json = JSON.stringify({ d: promoDays, h: [def.slug, def.hero.file], p }).replace(/</g, '\\u003c');
  return `<script type="application/json" id="qbc-pool">${json}</script>`;
}

function worksGrid(projects) {
  return projects.map((p) =>
    `<a class="wcard" href="work/${p.slug}.html">` +
    `<div class="frame" data-ip>${img(cover(p), { root: '', sizes: '(max-width: 900px) 100vw, 50vw', alt: p.title, want: 1600 })}</div>` +
    `<div class="wcard__meta"><h2 class="wcard__title">${esc(p.title)}</h2><span class="label">${esc(p.year)}</span></div>` +
    `<p class="wcard__svc">${esc((p.services || []).map(stripNum).slice(0, 2).join('  /  '))}</p></a>`).join('');
}

function worksIndex(projects) {
  return projects.map((p, i) => {
    const first = stripNum((p.services || [])[0] || '');
    const more = (p.services || []).length > 1 ? ` +${p.services.length - 1}` : '';
    return `<a class="windex__row" href="work/${p.slug}.html">` +
      `<span class="label">${num(i)}</span><span class="windex__title">${esc(p.title)}</span>` +
      `<span class="windex__svc label mute">${esc(first)}${more}</span><span class="windex__year label">${esc(p.year)}</span></a>`;
  }).join('');
}

function servicesList(sv) {
  return `<div class="svc">` + sv.phases.map((ph, i) =>
    `<div class="svc__row" data-reveal><span class="label mute">${num(i)}</span><span class="svc__title">${esc(ph.title)}</span>` +
    `<ul class="svc__items">${ph.items.map((it) => `<li>${esc(it.title)}</li>`).join('')}</ul></div>`).join('') + `</div>`;
}

function phases(sv) {
  return sv.phases.map((ph, i) =>
    `<section class="phase"><div class="phase__num" data-reveal><b>${num(i)}</b><h2 class="h2">${esc(ph.title)}</h2></div>` +
    `<div class="phase__body"><p class="lead" data-reveal>${esc(ph.text)}</p><div class="phase__items">` +
    ph.items.map((it) => `<div class="phase__item" data-reveal><h3 class="h3">${esc(it.title)}</h3><p>${esc(it.text)}</p></div>`).join('') +
    `</div></div></section>`).join('');
}

function gallery(p) {
  return (p.gallery || []).map((g, i) => {
    const ar = g.w && g.h ? ` style="--ar:${g.w} / ${g.h}"` : '';
    return `<figure data-full="${imgUrl(g, '../', 2000)}"><div class="frame" data-ip${ar}>` +
      img(g, { root: '../', sizes: '(max-width: 900px) 100vw, 60vw', alt: `${p.title}, image ${i + 1}`, want: 1600 }) + `</div></figure>`;
  }).join('');
}

function nextProject(p, projects) {
  if (projects.length < 2) return '';
  const nx = projects[(projects.findIndex((x) => x.slug === p.slug) + 1) % projects.length];
  return `<a class="pnext" data-next href="${nx.slug}.html"><div class="pnext__row"><div class="pnext__text">` +
    `<span class="label mute">Next project</span><span class="pnext__title">${esc(nx.title)}</span>` +
    `<span class="btn"><span>View project</span><span class="btn__arrow" aria-hidden="true">→</span></span></div>` +
    `<div class="frame">${img(cover(nx), { root: '../', sizes: '(max-width: 900px) 100vw, 40vw', alt: '', want: 1080 })}</div></div></a>`;
}

function prevProject(p, projects) {
  if (projects.length < 2) return '';
  const pv = projects[(projects.findIndex((x) => x.slug === p.slug) - 1 + projects.length) % projects.length];
  return `<a class="label mute pprev" data-prev href="${pv.slug}.html">Previous: ${esc(pv.title)}</a>`;
}

function metaDesc(p) {
  const first = richtextToText(p.description || '').split(/\n\n/)[0] || `${p.title}, ${p.year}`;
  const t = first.replace(/\s+/g, ' ').trim();
  return t.length > 158 ? t.slice(0, 155).replace(/\s+\S*$/, '') + '...' : t;
}

// ---------------------------------------------------------------- sabloni
function render(name, src, ctx) {
  let html = src[`src/pages/${name}.html`];
  if (html === undefined) throw new Error(`Nedostaje izvor src/pages/${name}.html`);
  for (let depth = 0; /\{\{>/.test(html); depth++) {
    if (depth > 4) throw new Error('Previse ugnjezdenih delova');
    html = html.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (m, part) => {
      const t = src[`src/partials/${part}.html`];
      if (t === undefined) throw new Error(`Nedostaje deo src/partials/${part}.html`);
      return t.replace(/\n$/, '');
    });
  }
  return html.replace(/\{\{\s*(CUR:)?([\w-]+)\s*\}\}/g, (m, cur, key) => {
    if (cur) return ctx.key === key ? ' aria-current="page"' : '';
    if (!(key in ctx)) throw new Error(`Nepoznata oznaka {{${key}}} u sablonu ${name}`);
    return ctx[key];
  });
}

export function validate(data) {
  const errs = [];
  const seen = new Set();
  if (!Array.isArray(data.projects) || !data.projects.length) errs.push('Nema nijednog projekta');
  for (const p of data.projects || []) {
    if (!p.slug || !/^[a-z0-9-]+$/.test(p.slug)) errs.push(`Neispravan slug: ${p.slug}`);
    if (seen.has(p.slug)) errs.push(`Duplirani slug: ${p.slug}`);
    seen.add(p.slug);
    if (!p.title) errs.push(`Projekat ${p.slug} nema naslov`);
    if (!p.hero || !p.hero.file) errs.push(`Projekat ${p.slug} nema glavnu sliku`);
  }
  return errs;
}

// sources: { 'src/pages/index.html': '...', ... }. Opcija all gradi i staticke stranice (about, services, ...).
export function buildSite(data, sources, { all = false } = {}) {
  const errs = validate(data);
  if (errs.length) throw new Error(errs.join('\n'));
  const projects = data.projects;
  const heroProject = projects.find((p) => p.slug === data.hero_slug) || projects[0];
  const services = JSON.parse(sources['src/services.json']);
  const ogDefault = 'https://www.qbc.rs/' + imgUrl(heroProject.hero, '', 1600);
  const base = { ROOT: '', OG_IMAGE: ogDefault, SERVICES_LIST: servicesList(services) };
  const out = {};

  out['index.html'] = render('index', sources, {
    ...base, key: 'home', PATH: '',
    TITLE: 'QBC Architects | Architecture & Interior Design Studio',
    DESC: 'QBC Architects specializes in high-end residential and commercial architecture. We deliver functional, aesthetically superior, and constructible spaces across Belgrade, Vienna, and New York.',
    HERO_IMG: pickImg(heroProject.hero, heroProject, 'hero', '100vw'), HERO_CREDIT: heroCredit(heroProject),
    POOL: pool(projects, heroProject, data.promo_days ?? 21), HOME_WORKS: worksGrid(projects.slice(0, data.home_count ?? 4)),
  });
  out['our-work.html'] = render('our-work', sources, {
    ...base, key: 'works', PATH: 'our-work.html',
    TITLE: 'Portfolio | Featured Projects by QBC Architects',
    DESC: 'Explore our selected architectural and interior design portfolio. View our high-end residential villas, commercial clinics, and luxury apartments in Belgrade, Montenegro, and beyond.',
    COUNT: String(projects.length).padStart(2, '0'), WORKS_GRID: worksGrid(projects), WORKS_INDEX: worksIndex(projects),
  });
  for (const p of projects) {
    out[`work/${p.slug}.html`] = render('work', sources, {
      ...base, ROOT: '../', key: 'works', PATH: `work/${p.slug}.html`,
      TITLE: `${p.title} | QBC Architects`, DESC: esc(metaDesc(p)),
      OG_IMAGE: 'https://www.qbc.rs/' + imgUrl(p.hero, '', 1600),
      TITLE_TEXT: esc(p.title), YEAR: esc(p.year), SERVICES: li(p.services),
      HERO_IMG: img(p.hero, { root: '../', sizes: '100vw', alt: p.title, eager: true, want: 2000 }),
      DESCRIPTION: cleanRich(p.description), GALLERY: gallery(p), NEXT: nextProject(p, projects), PREV: prevProject(p, projects),
    });
  }
  if (all) {
    for (const pg of STATIC_PAGES) {
      out[pg.out] = render(pg.src, sources, {
        ...base, key: pg.key, PATH: pg.out, TITLE: esc(pg.title), DESC: esc(pg.desc),
        SERVICES_INTRO: esc(services.intro), PHASES: phases(services),
      });
    }
  }
  // TITLE/DESC za dinamicke stranice su vec bezbedni tekstovi bez navodnika; escape radi svejedno
  for (const k of Object.keys(out)) out[k] = out[k].replace(/<title>([^<]*)<\/title>/, (m, t) => `<title>${t.includes('&amp;') ? t : esc(t)}</title>`);
  return out;
}
