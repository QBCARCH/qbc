/* QBC Architects: site.js (mirna verzija)
   meni, tihi reveal, blagi parallax, sat, pregled radova, lightbox, mekan prelaz izmedju stranica */
(() => {
  'use strict';
  const D = document, root = D.documentElement;
  const $ = (s, c = D) => c.querySelector(s);
  const $$ = (s, c = D) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const enc = (f) => encodeURIComponent(f).replace(/%2F/g, '/');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const safe = (fn) => { try { return fn(); } catch { return null; } };

  /* nasumicna slika na pocetnoj (novi projekat ima prednost dok traje promo) */
  const initPicks = () => {
    const holder = $('#qbc-pool');
    const img = $('img[data-pick="hero"]');
    if (!holder || !img) return;
    let pool;
    try { pool = JSON.parse(holder.textContent); } catch { return; }
    const all = [];
    pool.p.forEach((p) => p.i.forEach((i) => all.push({ p, i })));
    if (!all.length) return;
    const rnd = (a) => a[Math.floor(Math.random() * a.length)];
    const now = Date.now();
    const fresh = pool.p.filter((p) => p.a && Date.parse(p.a) <= now + 864e5 && (now - Date.parse(p.a)) / 864e5 <= pool.d)
      .sort((a, b) => Date.parse(b.a) - Date.parse(a.a))[0];
    const prim = all.find((x) => x.p.s === pool.h[0] && x.i[0] === pool.h[1]);
    const pick = fresh && Math.random() < 0.7 ? { p: fresh, i: rnd(fresh.i) } : (prim && Math.random() < 0.35 ? prim : rnd(all));
    const [file, w, h, widths] = pick.i;
    const dot = file.lastIndexOf('.'), base = file.slice(0, dot), ext = file.slice(dot + 1);
    const parts = widths.map((x) => `images/${enc(`${base}-p-${x}.${ext}`)} ${x}w`);
    parts.push(`images/${enc(file)} ${w}w`);
    img.alt = pick.p.t; img.width = w; img.height = h;
    img.sizes = img.dataset.sizes || '100vw';
    img.srcset = parts.join(', ');
    const mid = widths.find((x) => x >= 2000) || widths[widths.length - 1];
    img.src = mid ? `images/${enc(`${base}-p-${mid}.${ext}`)}` : `images/${enc(file)}`;
    const credit = $('[data-credit]');
    if (credit) { credit.href = `work/${pick.p.s}.html`; credit.textContent = `${pick.p.t} / ${pick.p.y} ↗`; }
  };

  /* tiho pojavljivanje */
  const initReveal = () => {
    const els = $$('[data-reveal]');
    if (!els.length) return;
    if (!('IntersectionObserver' in window) || reduce) { els.forEach((e) => e.classList.add('is-in')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting || e.boundingClientRect.top < 0) { e.target.style.setProperty('--d', (e.target.dataset.d || 0) + 's'); e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    els.forEach((e) => io.observe(e));
  };

  /* jedan, jednak i blag parallax: slika se krece sporije od okvira */
  const initParallax = () => {
    if (reduce) return;
    const hero = $('.hero__media, .phero__media');
    const frames = $$('[data-ip]').map((el) => ({ el, im: $('img', el) })).filter((f) => f.im);
    let y = scrollY, target = y, vh = innerHeight, raf = 0;
    const tops = new Map();
    const measure = () => {
      vh = innerHeight;
      frames.forEach((f) => { const r = f.el.getBoundingClientRect(); tops.set(f, { top: r.top + scrollY, h: r.height }); });
    };
    const paint = () => {
      raf = 0;
      y += (target - y) * 0.14;
      if (hero) hero.style.setProperty('--ty', (y * 0.22).toFixed(1) + 'px');
      frames.forEach((f) => {
        const m = tops.get(f);
        if (!m || m.top - y > vh * 1.2 || m.top + m.h - y < -vh * 0.2) return;
        const off = (m.top + m.h / 2 - y - vh / 2) / vh;
        f.im.style.setProperty('--ty', (clamp(-off * m.h * 0.16, -m.h * 0.07, m.h * 0.07)).toFixed(1) + 'px');
      });
      if (Math.abs(target - y) > 0.3) raf = requestAnimationFrame(paint);
    };
    const kick = () => { target = scrollY; if (!raf) raf = requestAnimationFrame(paint); };
    addEventListener('scroll', kick, { passive: true });
    addEventListener('resize', () => { measure(); kick(); });
    addEventListener('load', () => { measure(); kick(); });
    measure(); y = target = scrollY; paint();
  };

  /* navigacija: sakrij pri spustanju, vrati pri podizanju */
  const initNav = () => {
    const nav = $('.nav');
    if (!nav) return;
    let last = scrollY;
    const hero = $('.hero, .phero');
    const tone = () => root.classList.toggle('over-hero', !!hero && scrollY < hero.offsetHeight - 70);
    tone();
    addEventListener('scroll', () => {
      const y = scrollY;
      tone();
      nav.classList.toggle('is-hidden', y > last && y > 120 && !root.classList.contains('menu-open'));
      last = y;
    }, { passive: true });
  };

  const initMenu = () => {
    const menu = $('#menu');
    if (!menu) return;
    const open = $('[data-menu-open]'), close = $('[data-menu-close]');
    const set = (on) => {
      menu.classList.toggle('is-open', on);
      menu.setAttribute('aria-hidden', String(!on));
      open && open.setAttribute('aria-expanded', String(on));
      root.classList.toggle('menu-open', on);
      D.body.classList.toggle('is-locked', on);
      (on ? close : open) && (on ? close : open).focus({ preventScroll: true });
    };
    open && open.addEventListener('click', () => set(true));
    close && close.addEventListener('click', () => set(false));
    D.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('is-open')) set(false); });
  };

  /* mekan prelaz izmedju stranica */
  const initTransitions = () => {
    const fade = $('.fade');
    if (!fade || reduce) return;
    addEventListener('pageshow', (e) => { if (e.persisted) fade.classList.remove('is-on'); });
    D.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      if (a.target || a.hasAttribute('download')) return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || (u.pathname === location.pathname && u.search === location.search)) return;
      e.preventDefault();
      fade.classList.add('is-on');
      setTimeout(() => { location.href = a.href; }, 340);
    });
  };

  const initClocks = () => {
    const els = $$('time[data-tz]');
    if (!els.length) return;
    const fmts = els.map((el) => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: el.dataset.tz }));
    const tick = () => els.forEach((el, i) => { el.textContent = fmts[i].format(new Date()); });
    tick(); setInterval(tick, 15000);
  };

  /* Grid / Index */
  const initWorks = () => {
    const host = $('[data-works]');
    if (!host) return;
    const btns = $$('[data-view]', host);
    const set = (v) => {
      host.classList.toggle('view-index', v === 'index');
      btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
      safe(() => sessionStorage.setItem('qbc-view', v));
    };
    btns.forEach((b) => b.addEventListener('click', () => set(b.dataset.view)));
    const saved = safe(() => sessionStorage.getItem('qbc-view'));
    if (saved === 'index') set('index');
  };

  const initLightbox = () => {
    const figs = $$('.pgal figure[data-full]');
    if (!figs.length) return;
    const lb = D.createElement('div');
    lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Image viewer');
    lb.innerHTML = '<span class="lb__c"></span><img alt=""><button class="lb__p" type="button" aria-label="Previous">←</button><button class="lb__n" type="button" aria-label="Next">→</button><button class="lb__x" type="button">Close</button>';
    D.body.appendChild(lb);
    const im = $('img', lb), cnt = $('.lb__c', lb);
    let i = 0;
    const show = (n) => {
      i = (n + figs.length) % figs.length;
      im.classList.remove('is-ready');
      im.onload = () => im.classList.add('is-ready');
      im.src = figs[i].dataset.full;
      im.alt = $('img', figs[i]).alt;
      cnt.textContent = `${String(i + 1).padStart(2, '0')} / ${String(figs.length).padStart(2, '0')}`;
    };
    const open = (n) => { show(n); lb.classList.add('is-open'); D.body.classList.add('is-locked'); };
    const close = () => { lb.classList.remove('is-open'); D.body.classList.remove('is-locked'); };
    figs.forEach((f, n) => f.addEventListener('click', () => open(n)));
    $('.lb__x', lb).addEventListener('click', close);
    $('.lb__p', lb).addEventListener('click', () => show(i - 1));
    $('.lb__n', lb).addEventListener('click', () => show(i + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
    D.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft') show(i - 1); else if (e.key === 'ArrowRight') show(i + 1);
    });
    let x0 = null;
    lb.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1)); x0 = null; });
  };

  const boot = () => {
    initPicks(); initReveal(); initParallax(); initNav(); initMenu(); initTransitions(); initClocks(); initWorks(); initLightbox();
  };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
})();
