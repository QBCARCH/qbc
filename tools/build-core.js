// QBC site generator: cista funkcija bez zavisnosti, radi i u Node-u i u pregledacu (admin stranica).
// Iz data/projects.json i sablona pravi: work/<slug>.html, listu na our-work.html i listu na index.html.

export const IDS = {
  works: 'caf3eb9d-c8e3-b91e-7486-4f835fad0b16', // our-work.html
  home: '964807fa-5466-2dcd-d260-9bfb824755e6', // index.html
  last: '33a458b3-2847-916d-f52a-cc4a9f49db9e', // "Check our last work" na stranici projekta
  hero: '0adc6fd8-bd77-045f-dc28-71a09f2ac2de', // glavna slika projekta (Webflow animacija)
};

export const STANDARD_SERVICES = [
  '1. Conceptual & Schematic Design',
  '2. Design Development & BIM Modeling',
  '3. Construction Documents & Engineering',
  '4. Construction Administration & Oversight',
  '5. Interior Architecture & Custom Detailing',
  '6. Feasibility Studies & Master Planning',
];

export const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function slugify(title) {
  const map = { č: 'c', ć: 'c', š: 's', ž: 'z', đ: 'dj', Č: 'c', Ć: 'c', Š: 's', Ž: 'z', Đ: 'dj' };
  return String(title)
    .replace(/[čćšžđČĆŠŽĐ]/g, (c) => map[c])
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'projekat';
}

// "text\n\ntext" -> <p>text</p><p>text</p>
export function textToRichtext(text) {
  return String(text).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    .map((p) => '<p>' + esc(p).replace(/\n/g, '<br/>') + '</p>').join('');
}
export function richtextToText(html) {
  return String(html).replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/‍/g, '').trim();
}

function imgTag(im, cls, prefix, { dataWId = '', style = '' } = {}) {
  const file = im.file;
  const dot = file.lastIndexOf('.');
  const base = file.slice(0, dot), ext = file.slice(dot + 1);
  let srcset = '';
  if (im.w && (im.widths || []).length >= 0 && (im.widths || []).length) {
    const parts = im.widths.map((w) => `${prefix}images/${base}-p-${w}.${ext} ${w}w`);
    parts.push(`${prefix}images/${file} ${im.w}w`);
    srcset = ` srcset="${parts.join(', ')}"`;
  }
  return `<img alt="${esc(im.alt || '')}" class="${cls}"${dataWId ? ` data-w-id="${dataWId}"` : ''} loading="lazy" src="${prefix}images/${file}"${srcset}${style ? ` style="${style}"` : ''}/>`;
}

function servicesItems(list, kind) {
  return (list || []).map((t) => kind === 'hero'
    ? `<div class="work-hero__services qbc-dyn-item" role="listitem"><div class="work-hero__services-text text-size-small">${esc(t)}</div></div>`
    : `<div class="works__services-item qbc-dyn-item" role="listitem"><div class="works__services-text text-size-small">${esc(t)}</div></div>`).join('');
}

export function listItem(p, { prefix, id, main }) {
  const cover = p.cover || p.hero, thumb = p.thumb || p.cover || p.hero;
  return `<div class="works__item${main ? ' main' : ''} qbc-dyn-item" data-w-id="${id}" role="listitem">` +
    `<div class="works__item-visual">${imgTag(cover, 'works__item-img', prefix)}<div class="works__item-overlay"></div></div>` +
    `<div class="works__item-content"><div class="works__content-visual">${imgTag(thumb, 'works__content-img', prefix)}</div>` +
    `<div class="works__content-infos"><div class="works__item-text text-size-small">${esc(p.title)}</div>` +
    `<div class="works__services-list"><div class="works__item-services qbc-dyn-list"><div class="works__services-list qbc-dyn-items" role="list">${servicesItems(p.services, 'list')}</div></div></div>` +
    `<div class="works__item-date"><div class="works__item-text text-size-small">/</div><div class="works__item-text text-size-small">${esc(p.year)}</div></div></div></div>` +
    `<a class="works__item-link qbc-inline-block" href="${prefix}work/${p.slug}.html"></a></div>`;
}

function replaceMarkers(html, name, inner) {
  const a = `<!--QBC:${name}:START-->`, b = `<!--QBC:${name}:END-->`;
  const i = html.indexOf(a), j = html.indexOf(b);
  if (i < 0 || j < 0 || j < i) throw new Error(`Markeri QBC:${name} nisu nadjeni u stranici`);
  return html.slice(0, i + a.length) + inner + html.slice(j);
}

function metaDesc(p) {
  const first = richtextToText(p.description || '').split(/\n\n/)[0] || `${p.title}, ${p.year}`;
  const t = first.replace(/\s+/g, ' ').trim();
  return t.length > 158 ? t.slice(0, 155).replace(/\s+\S*$/, '') + '...' : t;
}

export function renderWork(p, projects, tpl, opts = {}) {
  const n = opts.lastWorkCount ?? 3;
  const last = projects.filter((x) => x.slug !== p.slug).slice(0, n);
  const og = 'https://www.qbc.rs/images/' + encodeURIComponent(p.hero.file).replace(/%2F/g, '/');
  const map = {
    SLUG: p.slug,
    OG_IMAGE: og,
    TITLE_TEXT: esc(p.title),
    TITLE_ATTR: esc(p.title),
    DESC_ATTR: esc(metaDesc(p)),
    HERO_SERVICES: servicesItems(p.services, 'hero'),
    HERO_IMG: imgTag(p.hero, 'works-details__img', '../', { dataWId: IDS.hero, style: 'opacity:0' }),
    DESCRIPTION: p.description || '',
    GALLERY: (p.gallery || []).map((g) =>
      `<div class="works-details__showcase-visual qbc-dyn-item qbc-dyn-repeater-item" role="listitem">${imgTag(g, 'works-details__showcase-img', '../')}</div>`).join(''),
    LAST_WORK: last.map((x) => listItem(x, { prefix: '../', id: IDS.last, main: false })).join(''),
  };
  return tpl.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => (k in map ? map[k] : m));
}

export function validate(data) {
  const errs = [];
  const seen = new Set();
  for (const p of data.projects) {
    if (!p.slug || !/^[a-z0-9-]+$/.test(p.slug)) errs.push(`Neispravan slug: ${p.slug}`);
    if (seen.has(p.slug)) errs.push(`Duplirani slug: ${p.slug}`);
    seen.add(p.slug);
    if (!p.title) errs.push(`Projekat ${p.slug} nema naslov`);
    if (!p.hero || !p.hero.file) errs.push(`Projekat ${p.slug} nema glavnu sliku`);
  }
  return errs;
}

// templates: { work, index, ourWork } (tekst), vraca { 'work/x.html': '...', 'index.html': '...', 'our-work.html': '...' }
export function buildSite(data, templates) {
  const errs = validate(data);
  if (errs.length) throw new Error(errs.join('\n'));
  const projects = data.projects;
  const out = {};
  out['our-work.html'] = replaceMarkers(templates.ourWork, 'LIST',
    projects.map((p) => listItem(p, { prefix: '', id: IDS.works, main: true })).join(''));
  out['index.html'] = replaceMarkers(templates.index, 'LIST',
    projects.slice(0, data.home_count ?? 4).map((p) => listItem(p, { prefix: '', id: IDS.home, main: false })).join(''));
  for (const p of projects) {
    out[`work/${p.slug}.html`] = renderWork(p, projects, templates.work, { lastWorkCount: data.last_work_count ?? 3 });
  }
  return out;
}
