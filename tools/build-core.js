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
  '7. Architectural Visualisation',
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
  'src/services.sr.json',
  'src/faq.json',
  'src/pages/sr/index.html',
  'src/pages/sr/our-work.html',
  'src/pages/sr/work.html',
  'src/partials/sr/nav.html',
  'src/partials/sr/footer.html',
];
// Ostale stranice (o nama, usluge, kontakt, privatnost) se grade samo lokalno, sa opcijom all.
export const STATIC_SOURCES = [
  'src/pages/about.html',
  'src/pages/services.html',
  'src/pages/contact.html',
  'src/pages/privacy-policy.html',
  'src/pages/404.html',
  'src/pages/sr/about.html',
  'src/pages/sr/services.html',
  'src/pages/sr/contact.html',
  'src/pages/sr/privacy-policy.html',
];

// naslovi i opisi po jeziku; 404 postoji samo na engleskom
const STATIC_PAGES = [
  { out: 'about.html', src: 'about', key: 'about',
    en: ['About Us | QBC Architects, Architecture Studio in Belgrade', 'Founded in 2010 by architects Slavoljub and Vladica Ljubić. A Belgrade studio with BIM workflows and first-hand knowledge of the Serbian permitting system.'],
    sr: ['O nama | QBC Architects, arhitektonski studio u Beogradu', 'Osnovali su ga 2010. arhitekte Slavoljub i Vladica Ljubić. Beogradski studio sa BIM načinom rada i iskustvom iz prve ruke u srpskom sistemu izdavanja dozvola.'] },
  { out: 'services.html', src: 'services', key: 'services',
    en: ['Architecture & Interior Design Services in Belgrade | QBC Architects', 'Architecture, interior design and visualisation by QBC Architects, Belgrade: concept and BIM design, permit documentation and architectural supervision.'],
    sr: ['Usluge arhitekture i dizajna enterijera u Beogradu | QBC Architects', 'Arhitektura, dizajn enterijera i vizualizacija, QBC Architects, Beograd: koncept i BIM projektovanje, dokumentacija za dozvole i arhitektonski nadzor.'] },
  { out: 'contact.html', src: 'contact', key: 'contact',
    en: ['Contact QBC Architects | Start Your Project in Belgrade', 'Tell us about your site, brief and timeline. QBC Architects, Belgrade, replies personally to every inquiry.'],
    sr: ['Kontakt | QBC Architects, započnite projekat u Beogradu', 'Recite nam o parceli, zadatku i rokovima. QBC Architects iz Beograda lično odgovara na svaki upit.'] },
  { out: 'privacy-policy.html', src: 'privacy-policy', key: 'privacy',
    en: ['Privacy Policy | QBC Architects', 'Read the privacy policy of QBC Architects. We are committed to protecting your personal information and ensuring transparency in our digital operations.'],
    sr: ['Politika privatnosti | QBC Architects', 'Politika privatnosti QBC Architects. Čuvamo vaše lične podatke i transparentni smo u digitalnom poslovanju.'] },
];
const NOT_FOUND = { out: '404.html', src: '404', key: 'none', root: '/', title: 'Page not found | QBC Architects', desc: 'The page you are looking for does not exist.' };

// ---------------------------------------------------------------- jezici
// en je osnova (koren sajta), sr je pod /sr/. Svaki jezik ima svoje sablone, delove i tekstove.
export const LANGS = ['en', 'sr'];
const PRE = { en: '', sr: 'sr/' };
const L = {
  en: { home: 'Home', work: 'Work', next: 'Next project', view: 'View project', prev: 'Previous', year: 'Year', location: 'Location',
    type: 'Type', area: 'Area', status: 'Status', services: 'Services', images: 'Images', locale: 'en_US', cta: 'Start a project',
    countries: 'Serbia and Montenegro' },
  sr: { home: 'Početna', work: 'Radovi', next: 'Sledeći projekat', view: 'Pogledaj projekat', prev: 'Prethodni', year: 'Godina', location: 'Lokacija',
    type: 'Tip', area: 'Površina', status: 'Status', services: 'Usluge', images: 'Fotografije', locale: 'sr_RS', cta: 'Započnite projekat',
    countries: 'Srbija i Crna Gora' },
};
const SVC_SR = {
  'Conceptual & Schematic Design': 'Idejno rešenje i koncept',
  'Design Development & BIM Modeling': 'Razrada projekta i BIM modelovanje',
  'Construction Documents & Engineering': 'Tehnička dokumentacija i inženjering',
  'Construction Administration & Oversight': 'Arhitektonski nadzor',
  'Interior Architecture & Custom Detailing': 'Enterijer i detalji po meri',
  'Feasibility Studies & Master Planning': 'Studije izvodljivosti i master planiranje',
  'Architectural Visualisation': 'Arhitektonska vizualizacija',
};
// naziv usluge bez rednog broja, na trazenom jeziku (nepoznate usluge ostaju kako su upisane)
const svcName = (s, lang) => { const n = String(s).replace(/^\d+\.\s*/, ''); return lang === 'sr' ? SVC_SR[n] || n : n; };
// tekst projekta na jeziku: sr polja imaju prednost, a bez njih ostaje engleski
const tr = (p, k, lang) => (lang === 'sr' && p.sr && p.sr[k]) || p[k];
// relativna putanja sa stranice 'from' na 'to' (obe od korena sajta)
const rel = (from, to) => '../'.repeat(from.split('/').length - 1) + to;


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

// Naslovna slika na pocetnoj bira se pri gradjenju sajta, ne u pregledacu: obican <img> u HTML-u pregledac
// pronalazi odmah i preuzima prvi (brzi prvi prikaz, LCP). Novi projekat je na vrhu promo_days dana od
// datuma dodavanja (vazi od sledece objave), a inace podrazumevani projekat (hero_slug).
function pickHero(projects, def, promoDays, now = Date.now()) {
  const fresh = projects.filter((p) => {
    const t = Date.parse(p.added || '');
    return t && t <= now + 864e5 && (now - t) / 864e5 <= promoDays;
  }).sort((a, b) => Date.parse(b.added) - Date.parse(a.added))[0];
  return fresh || def;
}
function heroCredit(p, base) {
  return `<a class="hero__credit" href="${base}work/${p.slug}.html">${esc(p.title)} / ${esc(p.year)} ↗</a>`;
}

// slika za deljenje na mrezama: JPEG ako postoji (WebP ne prikazuju svi)
const ogUrl = (im) => 'https://www.qbc.rs/' + (im.og ? `images/${encFile(im.og)}` : imgUrl(im, '', 1080));

// lastmod samo kada je datum stvarno poznat (datum dodavanja projekta); inace ga izostavljamo.
// Svaka adresa ima i alternativu na drugom jeziku (hreflang), kako trazilice povezuju en i sr.
function sitemap(projects) {
  const pages = ['index.html', 'our-work.html', 'about.html', 'services.html', 'contact.html', 'privacy-policy.html']
    .map((u) => [u, '']).concat(projects.map((p) => [`work/${p.slug}.html`, /^\d{4}-\d{2}-\d{2}$/.test(p.added || '') ? p.added : '']));
  const url = (lang, u) => 'https://www.qbc.rs/' + (u === 'index.html' ? PRE[lang] : PRE[lang] + u);
  const rows = [];
  for (const [u, d] of pages) for (const lang of LANGS) {
    rows.push(`  <url><loc>${url(lang, u)}</loc>${d ? `<lastmod>${d}</lastmod>` : ''}` +
      LANGS.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${url(l, u)}"/>`).join('') +
      `<xhtml:link rel="alternate" hreflang="x-default" href="${url('en', u)}"/></url>`);
  }
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    rows.join('\n') + '\n</urlset>\n';
}

// strukturisani podaci za stranicu projekta: putanja (breadcrumb) i sam projekat
function projectLd(p, lang) {
  const url = `https://www.qbc.rs/${PRE[lang]}work/${p.slug}.html`;
  const ld = [
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: L[lang].home, item: 'https://www.qbc.rs/' + PRE[lang] },
      { '@type': 'ListItem', position: 2, name: L[lang].work, item: `https://www.qbc.rs/${PRE[lang]}our-work.html` },
      { '@type': 'ListItem', position: 3, name: p.title, item: url }] },
    { '@context': 'https://schema.org', '@type': 'CreativeWork', name: p.title, url, image: ogUrl(p.hero), inLanguage: lang,
      dateCreated: p.year || undefined, description: metaDesc(p, lang), genre: tr(p, 'type', lang) || undefined,
      ...(p.location ? { locationCreated: { '@type': 'Place', name: tr(p, 'location', lang) } } : {}),
      creator: { '@id': 'https://www.qbc.rs/#studio' } },
  ];
  return `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`;
}

// odnos sirine i visine naslovne slike: kartice imaju istu visinu, a sirinu po formatu slike
const ratio = (im) => (im && im.w && im.h ? Math.min(2.4, Math.max(0.6, im.w / im.h)) : 1.5).toFixed(3);

// opisni alt tekst: naslov i mesto, da slika znaci nesto i trazilicama i citacima ekrana
const altOf = (p, lang) => [p.title, tr(p, 'location', lang)].filter(Boolean).join(', ');
const dataQ = (p, lang) => esc([p.title, p.year, tr(p, 'location', lang), tr(p, 'type', lang), ...(p.services || []).map((x) => svcName(x, lang))].filter(Boolean).join(' ').toLowerCase());

function worksGrid(projects, lang, base, root) {
  return projects.map((p, i) =>
    `<a class="wcard" style="--ar:${ratio(cover(p))}" href="${base}work/${p.slug}.html" data-q="${dataQ(p, lang)}">` +
    `<div class="frame" data-ip>${img(cover(p), { root, sizes: '(max-width: 900px) 100vw, 50vw', alt: altOf(p, lang), want: 1600 })}</div>` +
    `<div class="wcard__meta"><h2 class="wcard__title">${esc(p.title)}</h2><span class="label">${esc(p.year)}</span></div>` +
    (tr(p, 'type', lang) ? `<p class="wcard__type">${esc(tr(p, 'type', lang))}</p>` : '') + `</a>`).join('');
}

function worksIndex(projects, lang, base) {
  return projects.map((p, i) => {
    const first = svcName((p.services || [])[0] || '', lang);
    const more = (p.services || []).length > 1 ? ` +${p.services.length - 1}` : '';
    return `<a class="windex__row" href="${base}work/${p.slug}.html" data-q="${dataQ(p, lang)}">` +
      `<span class="label">${num(i)}</span><span class="windex__title">${esc(p.title)}</span>` +
      `<span class="windex__svc label mute">${esc(first)}${more}</span><span class="windex__year label">${esc(p.year)}</span></a>`;
  }).join('');
}

function servicesList(sv) {
  return `<div class="svc">` + sv.phases.map((ph, i) =>
    `<div class="svc__row" data-reveal><span class="label mute">${num(i)}</span><span class="svc__title">${esc(ph.title)}</span>` +
    `<ul class="svc__items">${ph.items.map((it) => `<li>${esc(it.title)}</li>`).join('')}</ul></div>`).join('') + `</div>`;
}

// usluge kao pregledna harmonika: u zatvorenom redu naslov i stavke, a otvoreno opis i detalji
function phases(sv) {
  return `<div class="acc">` + sv.phases.map((ph, i) =>
    `<details class="acc__item" id="s${i + 1}" data-reveal><summary><span class="label mute">${num(i)}</span><span class="acc__t">${esc(ph.title)}</span>` +
    `<span class="acc__chips">${ph.items.map((it) => esc(it.title)).join(' / ')}</span><i aria-hidden="true"></i></summary>` +
    `<div class="acc__b"><p class="body">${esc(ph.text)}</p><div class="acc__items">` +
    ph.items.map((it) => `<div><h3 class="h3">${esc(it.title)}</h3><p>${esc(it.text)}</p></div>`).join('') +
    `</div></div></details>`).join('') + `</div>`;
}

// Adresa na koju forme salju upite (FormSubmit). Posle prve potvrde FormSubmit u mejlu daje nasumicni alias
// (https://formsubmit.co/<alias>): kada ga upises ovde, e-adresa vise nije vidljiva u kodu sajta i botovi je ne nalaze.
export const FORM_ACTION = 'https://formsubmit.co/office@qbc.rs';

// kratak upit na dnu svake stranice (osim kontakta): vidljiv poziv, isti FormSubmit kao glavna forma
const INQ = {
  en: { k: 'Start a project', h: 'Tell us about your project.', p: 'Share a few lines about your site and what you need. We reply personally.', name: 'Name *', email: 'Email *', msg: 'Your project *', send: 'Send inquiry',
    alt: 'Or write to <a href="mailto:office@qbc.rs">office@qbc.rs</a>, call <a href="tel:+38163411066">+381 63 411 066</a>, or use the <a href="{BASE}contact.html">full inquiry form</a>.', subj: 'New inquiry from qbc.rs (short form)' },
  sr: { k: 'Započnite projekat', h: 'Recite nam o vašem projektu.', p: 'Napišite nekoliko redova o parceli i onome što vam treba. Lično odgovaramo.', name: 'Ime *', email: 'E-pošta *', msg: 'Vaš projekat *', send: 'Pošalji upit',
    alt: 'Ili pišite na <a href="mailto:office@qbc.rs">office@qbc.rs</a>, pozovite <a href="tel:+38163411066">+381 63 411 066</a>, ili koristite <a href="{BASE}contact.html">kompletan obrazac</a>.', subj: 'Novi upit sa qbc.rs (kratki obrazac, srpski)' },
};
function inquiryHtml(lang, path, base) {
  const t = INQ[lang];
  return `<section class="inq" id="inquiry"><div class="wrap inq__in"><div class="inq__head"><p class="label">${t.k}</p><h2 class="inq__h">${t.h}</h2><p class="inq__p">${t.p}</p></div>` +
    `<form class="cform inq__form" action="${FORM_ACTION}" method="POST" data-form>` +
    `<input type="hidden" name="_subject" value="${t.subj}"><input type="hidden" name="_template" value="table"><input type="hidden" name="_captcha" value="false">` +
    `<input type="hidden" name="_next" value="https://www.qbc.rs/${path}?sent=1#inquiry">` +
    `<p class="cform__hp" aria-hidden="true"><label>Leave this empty <input type="text" name="_honey" tabindex="-1" autocomplete="off"></label></p>` +
    `<label class="cform__f"><span class="label">${t.name}</span><input name="name" type="text" required autocomplete="name"></label>` +
    `<label class="cform__f"><span class="label">${t.email}</span><input name="email" type="email" required autocomplete="email"></label>` +
    `<label class="cform__f cform__f--full"><span class="label">${t.msg}</span><textarea name="message" rows="3" required></textarea></label>` +
    `<div class="cform__f--full cform__actions"><button class="btn btn--round btn--solid" type="submit">${t.send}</button><p class="cform__status" data-form-status role="status" aria-live="polite"></p></div>` +
    `<p class="inq__alt label cform__f--full">${t.alt.replace('{BASE}', base)}</p></form></div></section>`;
}

// najcesca pitanja: isti izvor pravi vidljiv tekst i FAQPage strukturisane podatke
function faqHtml(items) {
  return items.map((f, i) =>
    `<details class="faq__item" data-reveal><summary><span class="label mute">${num(i)}</span><span class="faq__q">${esc(f.q)}</span><i aria-hidden="true"></i></summary><div class="faq__a"><p class="body">${esc(f.a)}</p></div></details>`).join('');
}
function faqLd(items) {
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }).replace(/</g, '\\u003c')}</script>`;
}

function gallery(p, lang, depth) {
  const n = (p.gallery || []).length;
  return (p.gallery || []).map((g, i) => {
    const ar = g.w && g.h ? ` style="--ar:${g.w} / ${g.h}"` : '';
    const alt = g.alt || (lang === 'sr' ? `${altOf(p, lang)}, QBC Architects, prikaz ${i + 1} od ${n}` : `${altOf(p, lang)}, by QBC Architects, view ${i + 1} of ${n}`);
    return `<figure data-full="${imgUrl(g, depth, 2000)}"><div class="frame" data-ip${ar}>` +
      img(g, { root: depth, sizes: '(max-width: 900px) 100vw, 60vw', alt, want: 1600 }) + `</div></figure>`;
  }).join('');
}

function nextProject(p, projects, lang, depth) {
  if (projects.length < 2) return '';
  const nx = projects[(projects.findIndex((x) => x.slug === p.slug) + 1) % projects.length];
  return `<a class="pnext" data-next href="${nx.slug}.html"><div class="pnext__row"><div class="pnext__text">` +
    `<span class="label mute">${L[lang].next}</span><span class="pnext__title">${esc(nx.title)}</span>` +
    `<span class="btn"><span>${L[lang].view}</span><span class="btn__arrow" aria-hidden="true">→</span></span></div>` +
    `<div class="frame">${img(cover(nx), { root: depth, sizes: '(max-width: 900px) 100vw, 40vw', alt: '', want: 1080 })}</div></div></a>`;
}

function facts(p, lang) {
  const row = (k, v) => (v ? `<div><p class="label mute">${k}</p><p>${esc(v)}</p></div>` : '');
  const t = L[lang];
  return row(t.year, p.year) + row(t.type, tr(p, 'type', lang)) + row(t.location, tr(p, 'location', lang)) + row(t.area, p.area) + row(t.status, tr(p, 'status', lang)) +
    `<div><p class="label mute">${t.services}</p><ul>${li((p.services || []).map((x) => svcName(x, lang)))}</ul></div>` + row(t.images, p.credit);
}

function prevProject(p, projects, lang) {
  if (projects.length < 2) return '';
  const pv = projects[(projects.findIndex((x) => x.slug === p.slug) - 1 + projects.length) % projects.length];
  return `<a class="label mute pprev" data-prev href="${pv.slug}.html">${L[lang].prev}: ${esc(pv.title)}</a>`;
}

function metaDesc(p, lang = 'en') {
  const text = richtextToText(tr(p, 'description', lang) || '').replace(/\s+/g, ' ').trim() || `${p.title}, ${p.year}`;
  // cele recenice (preko pasusa) do ~158 znakova; ako prva ne staje, secemo na zarezu ili reci
  const sent = text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text];
  let out = '';
  for (const x of sent) { if ((out + x).trim().length > 170) break; out += x; }
  out = out.trim();
  if (out) return out;
  const cut = text.slice(0, 165), comma = cut.lastIndexOf(',');
  return (comma > 50 ? cut.slice(0, comma) : cut.replace(/\s+\S*$/, '')) + '.';
}

// strukturisani podaci o studiju: ista cinjenica ("Architect" sa uslugama i podrucjem rada) na svakoj stranici
function orgLd(lang, services) {
  const catalog = services.phases.map((ph) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: ph.title, description: ph.text } }));
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': ['Architect', 'ProfessionalService'], '@id': 'https://www.qbc.rs/#studio',
    name: 'QBC Architects', alternateName: 'QBCarchitects', url: 'https://www.qbc.rs/', logo: 'https://www.qbc.rs/assets/logo.png',
    email: 'office@qbc.rs', telephone: '+38163411066', foundingDate: '2010', slogan: 'Architecture, interiors and visualisation',
    founder: [{ '@type': 'Person', name: 'Slavoljub Ljubić', jobTitle: 'Architect' }, { '@type': 'Person', name: 'Vladica Ljubić', jobTitle: 'Architect' }],
    address: { '@type': 'PostalAddress', addressLocality: 'Belgrade', addressCountry: 'RS' },
    areaServed: [{ '@type': 'Country', name: 'Serbia' }, { '@type': 'Country', name: 'Montenegro' }, { '@type': 'Place', name: 'Europe' }],
    availableLanguage: ['en', 'sr'], knowsAbout: ['Architecture', 'Interior design', 'Architectural visualisation', 'BIM', 'Autodesk Revit', 'Building permits in Serbia'],
    hasOfferCatalog: { '@type': 'OfferCatalog', name: lang === 'sr' ? 'Usluge' : 'Services', itemListElement: catalog },
    sameAs: ['https://www.instagram.com/qbcarchitects/', 'https://www.behance.net/qbcarchitects', 'https://www.pinterest.com/qbcarchitects'] })}</script>`;
}

// ---------------------------------------------------------------- sabloni
// Sabloni i delovi za sr su u podmapama sr/ (nav, footer i stranice); head je zajednicki.
function render(name, src, ctx) {
  const lang = ctx.LANG;
  const dir = lang === 'en' ? '' : lang + '/';
  let html = src[`src/pages/${dir}${name}.html`];
  if (html === undefined) throw new Error(`Nedostaje izvor src/pages/${dir}${name}.html`);
  for (let depth = 0; /\{\{>/.test(html); depth++) {
    if (depth > 4) throw new Error('Previse ugnjezdenih delova');
    html = html.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (m, part) => {
      const t = src[`src/partials/${part === 'head' ? '' : dir}${part}.html`];
      if (t === undefined) throw new Error(`Nedostaje deo src/partials/${part === 'head' ? '' : dir}${part}.html`);
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
  const ogDefault = ogUrl(heroProject.hero);
  const homeHero = pickHero(projects, heroProject, data.promo_days ?? 21);
  const out = {};
  const faq = JSON.parse(sources['src/faq.json']);

  for (const lang of LANGS) {
    const pre = PRE[lang], t = L[lang];
    const services = JSON.parse(sources[lang === 'en' ? 'src/services.json' : `src/services.${lang}.json`]);
    const site = (file, depth = 0) => {
      // kontekst zajednicki za svaku stranicu: putanje do slika (ROOT) i do stranica istog jezika (BASE), veza na drugi jezik, hreflang
      const own = pre + file, other = (lang === 'en' ? PRE.sr : PRE.en) + file;
      const ROOT = '../'.repeat(depth + (lang === 'en' ? 0 : 1)), BASE = '../'.repeat(depth);
      const u = (l) => 'https://www.qbc.rs/' + (file === 'index.html' ? PRE[l] : PRE[l] + file);
      return {
        LANG: lang, LOCALE: t.locale, ROOT, BASE, OG_IMAGE: ogDefault, LD: '', ORG_LD: orgLd(lang, services), CTA: t.cta, FORM_ACTION,
        PATH: file === 'index.html' ? pre : own, LANG_URL: rel(own, other),
        HREFLANG: `<link rel="alternate" hreflang="en" href="${u('en')}"><link rel="alternate" hreflang="sr" href="${u('sr')}"><link rel="alternate" hreflang="x-default" href="${u('en')}">`,
        SERVICES_LIST: servicesList(services), SERVICES_INTRO: esc(services.intro), PHASES: phases(services),
        FAQ_LIST: faqHtml(faq[lang]), INQUIRY: ['contact.html', 'privacy-policy.html'].includes(file) ? '' : inquiryHtml(lang, file === 'index.html' ? pre : own, BASE), COUNT: String(projects.length).padStart(2, '0'),
      };
    };

    const home = lang === 'en'
      ? ['QBC Architects | Architecture & Interior Design Studio in Belgrade, Serbia', 'Belgrade architecture and interior design studio since 2010. Houses, apartments and hospitality spaces, from concept and BIM to permits and site supervision.']
      : ['QBC Architects | Arhitektonski studio i dizajn enterijera, Beograd', 'Arhitektonski studio iz Beograda od 2010. Kuće, stanovi i ugostiteljski prostori, od koncepta i BIM modela do dozvola i arhitektonskog nadzora.'];
    out[`${pre}index.html`] = render('index', sources, {
      ...site('index.html'), key: 'home', TITLE: home[0], DESC: home[1],
      HERO_IMG: img(homeHero.hero, { root: lang === 'en' ? '' : '../', sizes: '100vw', alt: altOf(homeHero, lang), eager: true, want: 2000 }),
      HERO_CREDIT: heroCredit(homeHero, ''),
      HOME_WORKS: worksGrid(projects.slice(0, data.home_count ?? 4), lang, '', lang === 'en' ? '' : '../'),
    });
    const ow = lang === 'en'
      ? ['Portfolio | Architecture and Interior Projects by QBC Architects', 'Selected houses, villas, apartments, hospitality and healthcare interiors by QBC Architects, Belgrade, in Serbia and Montenegro.']
      : ['Portfolio | Projekti arhitekture i enterijera, QBC Architects', 'Izbor kuća, vila, stanova, ugostiteljskih i zdravstvenih enterijera studija QBC Architects iz Beograda, u Srbiji i Crnoj Gori.'];
    out[`${pre}our-work.html`] = render('our-work', sources, {
      ...site('our-work.html'), key: 'works', TITLE: ow[0], DESC: ow[1],
      WORKS_GRID: worksGrid(projects, lang, '', lang === 'en' ? '' : '../'), WORKS_INDEX: worksIndex(projects, lang, ''),
    });
    for (const p of projects) {
      const depth = lang === 'en' ? '../' : '../../';
      out[`${pre}work/${p.slug}.html`] = render('work', sources, {
        ...site(`work/${p.slug}.html`, 1), key: 'works',
        TITLE: lang === 'en' ? `${p.title} | QBC Architects` : `${p.title} | QBC Architects`,
        DESC: esc(metaDesc(p, lang)), OG_IMAGE: ogUrl(p.hero), LD: projectLd(p, lang),
        TITLE_TEXT: esc(p.title), YEAR: esc(p.year), FACTS: facts(p, lang),
        LOC_YEAR: esc([tr(p, 'location', lang), p.year].filter(Boolean).join(', ')),
        HERO_IMG: img(p.hero, { root: depth, sizes: '100vw', alt: altOf(p, lang), eager: true, want: 2000 }),
        GAL_CLASS: p.dark ? ' pgal--dark' : '', DESCRIPTION: cleanRich(tr(p, 'description', lang)), GALLERY: gallery(p, lang, depth),
        NEXT: nextProject(p, projects, lang, depth), PREV: prevProject(p, projects, lang),
      });
    }
    if (all) {
      for (const pg of STATIC_PAGES) {
        out[`${pre}${pg.out}`] = render(pg.src, sources, {
          ...site(pg.out), key: pg.key, TITLE: esc(pg[lang][0]), DESC: esc(pg[lang][1]),
          ...(pg.key === 'services' ? { LD: faqLd(faq[lang]) } : {}),
        });
      }
    }
  }
  if (all) {
    out[NOT_FOUND.out] = render(NOT_FOUND.src, sources, {
      LANG: 'en', LOCALE: 'en_US', ROOT: '/', BASE: '/', OG_IMAGE: ogDefault, LD: '', ORG_LD: orgLd('en', JSON.parse(sources['src/services.json'])), CTA: L.en.cta,
      INQUIRY: '', PATH: '404.html', LANG_URL: '/sr/', HREFLANG: '', key: 'none', TITLE: esc(NOT_FOUND.title), DESC: esc(NOT_FOUND.desc),
    });
  }
  out['sitemap.xml'] = sitemap(projects);
  out['robots.txt'] = 'User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: https://www.qbc.rs/sitemap.xml\n';
  // TITLE/DESC za dinamicke stranice su vec bezbedni tekstovi bez navodnika; escape radi svejedno
  for (const k of Object.keys(out)) out[k] = out[k].replace(/<title>([^<]*)<\/title>/, (m, t) => `<title>${t.includes('&amp;') ? t : esc(t)}</title>`);
  return out;
}
