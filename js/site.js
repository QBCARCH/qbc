/* QBC Architects: ponasanje sajta (bez biblioteka).
   Sadrzaj: stanje i petlja, otkrivanje i podela teksta, parallax, kartice, marquee, nav i meni,
   kursor, tranzicije stranica, intro, satovi, projekti (prikaz), servisi, lightbox. */
(() => {
  'use strict';

  const D = document, root = D.documentElement;
  const $ = (s, r = D) => r.querySelector(s);
  const $$ = (s, r = D) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const store = {
    get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* nista */ } },
  };

  /* ---------- stanje i petlja ---------------------------------------------------------- */
  const S = { cur: scrollY, y: scrollY, v: 0, vh: innerHeight, vw: innerWidth, mx: 0.5, my: 0.5, sx: 0.5, sy: 0.5, moved: false, docH: 0 };
  const tasks = [];      // funkcije koje se pozivaju svaki frejm
  const relayouts = [];  // funkcije koje ponovo mere raspored
  const amp = () => (S.vw < 900 ? 0.55 : 1);

  const measure = (el, applied = 0) => {
    const r = el.getBoundingClientRect();
    return { top: r.top + scrollY - applied, h: r.height };
  };
  const relayout = () => {
    S.vh = innerHeight; S.vw = innerWidth; S.docH = root.scrollHeight;
    relayouts.forEach((fn) => fn());
  };

  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    S.y = scrollY;
    const prev = S.cur;
    S.cur = reduce ? S.y : lerp(S.cur, S.y, 0.11);
    if (Math.abs(S.cur - S.y) < 0.04) S.cur = S.y;
    S.v = S.cur - prev;
    S.sx = lerp(S.sx, S.mx, 0.06); S.sy = lerp(S.sy, S.my, 0.06);
    for (const t of tasks) t(dt);
    requestAnimationFrame(frame);
  };

  /* ---------- otkrivanje i podela teksta ----------------------------------------------- */
  const splitText = (el) => {
    let i = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = D.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(D.createTextNode(' ')); return; }
            const w = D.createElement('span'); w.className = 'w';
            Array.from(part).forEach((c) => {
              const s = D.createElement('span'); s.className = 'ch'; s.textContent = c; s.style.setProperty('--i', i++); w.appendChild(s);
            });
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.classList.contains('w')) walk(n);
      });
    };
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    walk(el);
    $$('.w', el).forEach((w) => w.setAttribute('aria-hidden', 'true'));
  };

  let ready = false; const queue = [];
  const whenReady = (fn) => (ready ? fn() : queue.push(fn));
  const setReady = () => { ready = true; queue.splice(0).forEach((f) => f()); };

  const initReveal = () => {
    $$('[data-split]').forEach(splitText);
    const targets = $$('[data-reveal], [data-curtain], [data-split]');
    targets.forEach((el) => { if (el.dataset.d) el.style.setProperty('--d', el.dataset.d + 's'); });
    if (reduce || !('IntersectionObserver' in window)) { targets.forEach((el) => el.classList.add('is-in')); return; }
    // clip-path na samom elementu bi ga za IntersectionObserver ucinio nevidljivim, pa se prati roditelj
    const watch = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const above = e.boundingClientRect.bottom < 0;
        if (!e.isIntersecting && !above) return;
        io.unobserve(e.target);
        (watch.get(e.target) || []).forEach((el) => whenReady(() => el.classList.add('is-in')));
      });
    }, { rootMargin: '0px 0px -9% 0px', threshold: 0.05 });
    targets.forEach((el) => {
      const t = el.hasAttribute('data-curtain') ? el.parentElement : el;
      if (!watch.has(t)) { watch.set(t, []); io.observe(t); }
      watch.get(t).push(el);
    });
  };

  /* ---------- parallax -------------------------------------------------------------------- */
  const initParallax = () => {
    if (reduce) return;
    // elementi sa data-parallax="brzina": pozitivna brzina ide brze od skrola, negativna sporije
    const pars = $$('[data-parallax]').map((el) => ({ el, s: parseFloat(el.dataset.parallax) || 0, ty: 0, base: null }));
    // slike unutar okvira
    const ips = $$('[data-ip]').map((el) => ({ el, img: el.querySelector('img'), base: null }));

    const lay = () => {
      pars.forEach((p) => { p.base = measure(p.el, p.ty); });
      ips.forEach((p) => { p.base = measure(p.el); });
    };
    relayouts.push(lay);

    tasks.push(() => {
      const vh = S.vh, c = S.cur, a = amp();
      for (const p of pars) {
        if (!p.base) continue;
        const rel = p.base.top + p.base.h / 2 - (c + vh / 2);
        if (Math.abs(rel) > vh + p.base.h) continue;
        p.ty = rel * p.s * a;
        p.el.style.transform = `translate3d(0, ${p.ty.toFixed(1)}px, 0)`;
      }
      for (const p of ips) {
        if (!p.base || !p.img) continue;
        const rel = p.base.top + p.base.h / 2 - (c + vh / 2);
        const range = (vh + p.base.h) / 2;
        if (Math.abs(rel) > range + 80) continue;
        const k = clamp(rel / range, -1, 1);
        p.el.style.setProperty('--ty', (-k * p.base.h * 0.085 * a).toFixed(1) + 'px');
      }
    });
  };

  /* hero (pocetna i projekat): slika sporije od skrola, naslov drugom brzinom, mis pomera slojeve */
  const initHero = () => {
    const hero = $('.hero, .phero');
    if (!hero || reduce) return;
    const media = $('.hero__media, .phero__media', hero);
    const title = $('.hero__title, .phero__title', hero);
    const badge = $('.hero__badge', hero);
    tasks.push(() => {
      if (S.cur > S.vh * 1.3) return;
      const a = amp();
      media.style.setProperty('--ty', (S.cur * 0.34 * a).toFixed(1) + 'px');
      media.style.setProperty('--sc', (1.1 + (S.cur / S.vh) * 0.07).toFixed(4));
      media.style.setProperty('--mx', ((S.sx - 0.5) * -34 * (fine ? 1 : 0)).toFixed(1) + 'px');
      media.style.setProperty('--my', ((S.sy - 0.5) * -22 * (fine ? 1 : 0)).toFixed(1) + 'px');
      if (title) title.style.setProperty('--ty', (S.cur * 0.16 * a).toFixed(1) + 'px');
      if (badge) badge.style.setProperty('--r', (S.cur * 0.3).toFixed(1) + 'deg');
    });
  };

  /* kartice koje se slazu (pocetna) */
  const initStack = () => {
    const stack = $('.stack');
    if (!stack || reduce) return;
    const cards = $$('.card', stack);
    let top = 0, h = 0;
    relayouts.push(() => { top = measure(stack).top; h = cards[0] ? cards[0].offsetHeight : S.vh; });
    tasks.push(() => {
      cards.forEach((c, i) => {
        if (i === cards.length - 1) return;
        const p = clamp((S.cur - (top + i * h)) / h);
        c.style.setProperty('--p', p.toFixed(3));
      });
    });
  };

  /* recenica koja se pali rec po rec */
  const initScrub = () => {
    $$('.scrub').forEach((el) => {
      const words = [];
      const walk = (node) => Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = D.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((t) => {
            if (!t) return;
            if (/^\s+$/.test(t)) { frag.appendChild(D.createTextNode(' ')); return; }
            const s = D.createElement('span'); s.className = 'sw'; s.textContent = t; words.push(s); frag.appendChild(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
      el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
      walk(el);
      if (reduce) { words.forEach((w) => w.classList.add('on')); return; }
      let base = null;
      relayouts.push(() => { base = measure(el); });
      let shown = -1;
      tasks.push(() => {
        if (!base) return;
        const start = base.top - S.vh * 0.85, end = base.top + base.h - S.vh * 0.45;
        const p = clamp((S.cur - start) / (end - start));
        const n = Math.round(p * words.length);
        if (n === shown) return;
        shown = n;
        words.forEach((w, i) => w.classList.toggle('on', i < n));
      });
    });
  };

  /* trake sa tekstom koje reaguju na skrol */
  const initMarquee = () => {
    const rows = $$('[data-marq]');
    if (!rows.length) return;
    const st = rows.map((el) => {
      const set = Array.from(el.children);
      for (let k = 0; k < 3; k++) set.forEach((c) => { const cl = c.cloneNode(true); cl.setAttribute('aria-hidden', 'true'); el.appendChild(cl); });
      return { el, w: 0, pos: 0, dir: parseFloat(el.dataset.marq) || 1, base: parseFloat(el.dataset.speed) || 60, kick: 0 };
    });
    const lay = () => st.forEach((m) => { m.w = m.el.scrollWidth / 4; });
    relayouts.push(lay);
    if (reduce) return;
    tasks.push((dt) => {
      st.forEach((m) => {
        if (!m.w) return;
        const push = clamp(S.v * 14, -900, 900);
        m.kick = lerp(m.kick, push, 0.1);
        m.pos += (m.base + m.kick * 6) * m.dir * dt * (S.v < -0.2 ? 1 : 1);
        m.pos = ((m.pos % m.w) + m.w) % m.w;
        m.el.style.transform = `translate3d(${(-m.pos).toFixed(1)}px,0,0)`;
      });
    });
  };

  /* podnozje se otkriva ispod stranice */
  const initFooter = () => {
    const footer = $('.footer');
    if (!footer) return;
    const mq = matchMedia('(min-width: 900px) and (min-height: 620px)');
    const inner = $('.footer__inner', footer);
    let fh = 0;
    relayouts.push(() => {
      fh = mq.matches ? footer.offsetHeight : 0;
      root.style.setProperty('--footer-h', fh + 'px');
      S.docH = root.scrollHeight;
    });
    if (reduce) return;
    tasks.push(() => {
      if (!fh) { inner.style.transform = ''; return; }
      const r = clamp((S.cur + S.vh - (S.docH - fh)) / fh);
      inner.style.transform = `translate3d(0, ${((1 - r) * -22).toFixed(2)}%, 0)`;
    });
  };

  /* ---------- nav, meni ---------------------------------------------------------------------- */
  const initNav = () => {
    const nav = $('.nav'), menu = $('.menu');
    if (nav) {
      let lastY = scrollY;
      tasks.push(() => {
        const y = S.y, d = y - lastY;
        if (Math.abs(d) < 6) return;
        nav.classList.toggle('is-hidden', d > 0 && y > 160 && !menu.classList.contains('is-open'));
        lastY = y;
      });
    }
    const bar = $('.progress');
    if (bar) tasks.push(() => bar.style.setProperty('--p', clamp(S.cur / Math.max(1, S.docH - S.vh)).toFixed(4)));
    if (!menu) return;
    const open = $('[data-menu-open]'), close = $('[data-menu-close]');
    const set = (on) => {
      menu.classList.toggle('is-open', on);
      menu.setAttribute('aria-hidden', String(!on));
      open && open.setAttribute('aria-expanded', String(on));
      root.classList.toggle('is-locked', on);
      if (on) close && close.focus(); else open && open.focus({ preventScroll: true });
    };
    open && open.addEventListener('click', () => set(true));
    close && close.addEventListener('click', () => set(false));
    D.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('is-open')) set(false); });
  };

  /* ---------- kursor, magnetni elementi ------------------------------------------------------ */
  const initCursor = () => {
    const c = $('.cursor');
    if (!c || !fine) return;
    root.classList.add('has-cursor');
    const label = $('.cursor__label', c), xy = $('.cursor__xy', c);
    let x = -100, y = -100, tx = x, ty = y;
    D.addEventListener('pointermove', (e) => {
      tx = e.clientX; ty = e.clientY; S.mx = tx / S.vw; S.my = ty / S.vh; S.moved = true;
      xy.textContent = `X ${String(Math.round(tx)).padStart(4, '0')}  Y ${String(Math.round(ty + S.y)).padStart(5, '0')}`;
    }, { passive: true });
    D.addEventListener('pointerover', (e) => {
      const t = e.target.closest ? e.target.closest('[data-cursor], a, button') : null;
      const txt = t && t.dataset ? t.dataset.cursor : '';
      label.textContent = txt || '';
      c.classList.toggle('is-active', !!txt);
      c.classList.toggle('is-small', !txt && !!t);
    });
    D.documentElement.addEventListener('pointerleave', () => { c.style.opacity = '0'; });
    D.documentElement.addEventListener('pointerenter', () => { c.style.opacity = '1'; });
    tasks.push(() => {
      x = lerp(x, tx, 0.24); y = lerp(y, ty, 0.24);
      c.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    });
  };

  const initMagnetic = () => {
    if (!fine || reduce) return;
    $$('[data-magnetic]').forEach((el) => {
      let tx = 0, ty = 0, cx = 0, cy = 0, hot = false;
      const strength = parseFloat(el.dataset.magnetic) || 0.25;
      D.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        const reach = Math.max(r.width, r.height) * 0.9;
        hot = Math.hypot(dx, dy) < reach;
        tx = hot ? dx * strength : 0; ty = hot ? dy * strength : 0;
      }, { passive: true });
      tasks.push(() => {
        cx = lerp(cx, tx, 0.14); cy = lerp(cy, ty, 0.14);
        if (Math.abs(cx - tx) < 0.05 && Math.abs(cy - ty) < 0.05 && !hot && !cx && !cy) return;
        el.style.translate = `${cx.toFixed(1)}px ${cy.toFixed(1)}px`;
      });
    });
  };

  /* ---------- tranzicije stranica ------------------------------------------------------------- */
  const initTransitions = () => {
    const curtain = $('.curtain');
    if (!curtain) return;
    if (store.get('qbc-t') === '1' && !reduce) {
      store.set('qbc-t', '0');
      curtain.classList.add('is-arrive');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        curtain.classList.remove('is-arrive'); curtain.classList.add('is-leave');
        setTimeout(() => { curtain.classList.remove('is-leave'); }, 1100);
      }));
    }
    D.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target && a.target !== '_self') return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || (u.pathname === location.pathname && u.hash) || /^(mailto|tel):/.test(a.getAttribute('href'))) return;
      if (reduce) return;
      e.preventDefault();
      store.set('qbc-t', '1');
      curtain.classList.remove('is-leave'); curtain.classList.add('is-on');
      setTimeout(() => { location.href = u.href; }, 780);
    });
    addEventListener('pageshow', (e) => { if (e.persisted) curtain.classList.remove('is-on', 'is-arrive', 'is-leave'); });
  };

  /* ---------- intro (samo prvi put na pocetnoj) ------------------------------------------------- */
  const initIntro = () => {
    const intro = $('.intro');
    const skip = !intro || reduce || store.get('qbc-intro') === '1' || store.get('qbc-t') === '1';
    if (skip) { intro && intro.remove(); setReady(); return; }
    store.set('qbc-intro', '1');
    intro.classList.add('is-active');
    const count = $('.intro__count', intro);
    const t0 = performance.now(), dur = 1500;
    const step = (now) => {
      const p = clamp((now - t0) / dur);
      count.textContent = String(Math.round((1 - Math.pow(1 - p, 3)) * 100)).padStart(3, '0');
      if (p < 1) { requestAnimationFrame(step); return; }
      setTimeout(() => {
        intro.classList.add('is-done');
        setTimeout(setReady, 350);
        setTimeout(() => intro.remove(), 1300);
      }, 180);
    };
    requestAnimationFrame(step);
  };

  /* ---------- satovi gradova ------------------------------------------------------------------------ */
  const initClocks = () => {
    const els = $$('[data-tz]');
    if (!els.length) return;
    const fmt = new Map();
    const tick = () => els.forEach((el) => {
      const tz = el.dataset.tz;
      if (!fmt.has(tz)) fmt.set(tz, new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
      el.textContent = fmt.get(tz).format(new Date());
    });
    tick(); setInterval(tick, 1000);
  };

  /* ---------- projekti: grid i index prikaz ------------------------------------------------------------ */
  const initWorks = () => {
    const wrap = $('[data-works]');
    if (!wrap) return;
    const btns = $$('[data-view]', wrap);
    const set = (v) => {
      wrap.classList.toggle('view-index', v === 'index');
      btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
      try { localStorage.setItem('qbc-view', v); } catch { /* nista */ }
      requestAnimationFrame(relayout);
    };
    btns.forEach((b) => b.addEventListener('click', () => set(b.dataset.view)));
    let saved = null; try { saved = localStorage.getItem('qbc-view'); } catch { /* nista */ }
    if (saved === 'index') set('index');

    const peek = $('.peek');
    if (!peek || !fine) return;
    const img = $('img', peek);
    let x = 0, y = 0, tx = 0, ty = 0;
    $$('.windex__row', wrap).forEach((row) => {
      row.addEventListener('pointerenter', () => { img.src = row.dataset.img; peek.classList.add('is-on'); });
      row.addEventListener('pointerleave', () => peek.classList.remove('is-on'));
    });
    D.addEventListener('pointermove', (e) => { tx = e.clientX + 28; ty = e.clientY - 120; }, { passive: true });
    tasks.push(() => {
      x = lerp(x, tx, 0.14); y = lerp(y, ty, 0.14);
      peek.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    });
  };

  /* ---------- servisi: harmonika ------------------------------------------------------------------------- */
  const initServices = () => {
    $$('.svc__row').forEach((row) => {
      const head = $('.svc__head', row);
      head.addEventListener('click', () => {
        const on = !row.classList.contains('is-open');
        row.classList.toggle('is-open', on);
        head.setAttribute('aria-expanded', String(on));
        setTimeout(relayout, 800);
      });
    });
  };

  /* ---------- lightbox za galeriju ----------------------------------------------------------------------- */
  const initLightbox = () => {
    const shots = $$('.pgal figure');
    if (!shots.length) return;
    const lb = D.createElement('div');
    lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Galerija');
    lb.innerHTML = '<span class="lb__c"></span><button class="lb__x" aria-label="Close">Close</button><button class="lb__p" aria-label="Previous">Prev</button><button class="lb__n" aria-label="Next">Next</button><img alt="">';
    D.body.appendChild(lb);
    const big = $('img', lb), cnt = $('.lb__c', lb);
    let cur = 0;
    const show = (i) => {
      cur = (i + shots.length) % shots.length;
      big.classList.remove('is-ready');
      const url = shots[cur].dataset.full;
      const t = new Image();
      t.onload = () => { big.src = url; requestAnimationFrame(() => big.classList.add('is-ready')); };
      t.src = url;
      cnt.textContent = `${String(cur + 1).padStart(2, '0')} / ${String(shots.length).padStart(2, '0')}`;
    };
    const open = (i) => { show(i); lb.classList.add('is-open'); root.classList.add('is-locked'); };
    const shut = () => { lb.classList.remove('is-open'); root.classList.remove('is-locked'); };
    shots.forEach((f, i) => f.addEventListener('click', () => open(i)));
    $('.lb__x', lb).onclick = shut;
    $('.lb__p', lb).onclick = (e) => { e.stopPropagation(); show(cur - 1); };
    $('.lb__n', lb).onclick = (e) => { e.stopPropagation(); show(cur + 1); };
    lb.addEventListener('click', (e) => { if (e.target === lb || e.target === big) shut(); });
    D.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') shut(); else if (e.key === 'ArrowLeft') show(cur - 1); else if (e.key === 'ArrowRight') show(cur + 1);
    });
    let x0 = null;
    lb.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1));
    });
  };

  /* ---------- pocetna: nasumicne slike, novi projekat ima prednost -------------------------------- */
  const enc = (f) => encodeURIComponent(f);
  const initPicks = () => {
    const holder = $('#qbc-pool');
    if (!holder) return;
    let pool;
    try { pool = JSON.parse(holder.textContent); } catch { return; }
    const all = [];
    pool.p.forEach((p) => p.i.forEach((i) => all.push({ p, i })));
    if (!all.length) return;
    const rnd = (a) => a[Math.floor(Math.random() * a.length)];
    // promo: projekat dodat u poslednjih `d` dana (najnoviji) ima prednost dok traje
    const now = Date.now();
    const fresh = pool.p.filter((p) => p.a && Date.parse(p.a) <= now + 864e5 && (now - Date.parse(p.a)) / 864e5 <= pool.d)
      .sort((a, b) => Date.parse(b.a) - Date.parse(a.a))[0];
    const prim = all.find((x) => x.p.s === pool.h[0] && x.i[0] === pool.h[1]);
    const fromFresh = () => ({ p: fresh, i: rnd(fresh.i) });
    const hero = fresh && Math.random() < 0.7 ? fromFresh() : (prim && Math.random() < 0.35 ? prim : rnd(all));
    let big = hero;
    for (let k = 0; k < 30 && big.i[0] === hero.i[0]; k++) big = fresh && Math.random() < 0.85 ? fromFresh() : rnd(all);

    const apply = (img, pick) => {
      const [file, w, h, widths] = pick.i;
      const dot = file.lastIndexOf('.'), base = file.slice(0, dot), ext = file.slice(dot + 1);
      const parts = widths.map((x) => `images/${enc(`${base}-p-${x}.${ext}`)} ${x}w`);
      parts.push(`images/${enc(file)} ${w}w`);
      img.alt = pick.p.t; img.width = w; img.height = h;
      img.sizes = img.dataset.sizes || '100vw';
      img.srcset = parts.join(', ');
      const mid = widths.find((x) => x >= 2000) || widths[widths.length - 1];
      img.src = mid ? `images/${enc(`${base}-p-${mid}.${ext}`)}` : `images/${enc(file)}`;
    };
    const heroImg = $('img[data-pick="hero"]'), bigImg = $('img[data-pick="big"]');
    heroImg && apply(heroImg, hero);
    bigImg && apply(bigImg, big);
    const credit = $('[data-credit]');
    if (credit) { credit.href = `work/${hero.p.s}.html`; credit.textContent = `${hero.p.t} / ${hero.p.y} ↗`; }
    const link = $('[data-big-link]');
    if (link) { link.href = `work/${big.p.s}.html`; $('[data-big-title]', link).textContent = big.p.t; }
    const yr = $('[data-big-year]');
    if (yr) yr.textContent = `${big.p.y} /`;
  };

  /* siroka slika koja se otvara od malog pravougaonika do celog ekrana */
  const initExpand = () => {
    const sec = $('.expand');
    if (!sec || reduce) return;
    let top = 0, h = 0;
    relayouts.push(() => { const m = measure(sec); top = m.top; h = m.h; });
    let last = -1;
    tasks.push(() => {
      const p = clamp((S.cur - (top - S.vh * 0.15)) / (h - S.vh * 0.85));
      const e = 1 - Math.pow(1 - clamp(p * 1.15), 3);
      if (Math.abs(e - last) < 0.0005) return;
      last = e;
      sec.style.setProperty('--e', e.toFixed(4));
    });
  };

  /* slova menjaju debljinu (promenljivi font) prema blizini kursora */
  const initWeight = () => {
    const host = $('[data-vf]');
    if (!host || reduce || !fine) return;
    const chars = $$('.ch', host).map((el) => ({ el, x: 0, y: 0, w: 300 }));
    const lay = () => chars.forEach((c) => { const r = c.el.getBoundingClientRect(); c.x = r.left + r.width / 2; c.y = r.top + scrollY + r.height / 2; });
    relayouts.push(lay);
    D.fonts && D.fonts.ready && D.fonts.ready.then(() => setTimeout(lay, 1800));
    tasks.push(() => {
      if (S.cur > S.vh || !S.moved) return;
      const mx = S.sx * S.vw, my = S.sy * S.vh + S.cur;
      for (const c of chars) {
        const d = Math.hypot(c.x - mx, c.y - my);
        const target = 300 + 420 * Math.exp(-Math.pow(d / (S.vw * 0.11), 2));
        c.w = lerp(c.w, target, 0.2);
        c.el.style.setProperty('--wg', c.w.toFixed(0));
      }
    });
  };

  /* trag slika projekata za kursorom na stranici radova */
  const initTrail = () => {
    const zone = $('[data-trail]');
    if (!zone || !fine || reduce) return;
    const srcs = $$('.wcard img').map((i) => i.currentSrc || i.src).filter(Boolean);
    if (!srcs.length) return;
    let n = 0, lx = -999, ly = -999, live = 0;
    zone.addEventListener('pointermove', (e) => {
      if (Math.hypot(e.clientX - lx, e.clientY - ly) < 120 || live > 12) return;
      lx = e.clientX; ly = e.clientY;
      const im = D.createElement('img');
      im.className = 'trail__img'; im.alt = ''; im.src = srcs[n++ % srcs.length];
      const rot = (Math.random() - 0.5) * 16;
      im.style.transform = `translate3d(${e.clientX - 90}px, ${e.clientY - 110}px, 0) rotate(${rot}deg)`;
      live++;
      im.addEventListener('animationend', () => { im.remove(); live--; });
      D.body.appendChild(im);
    }, { passive: true });
  };

  /* kartice radova se blago naginju prema kursoru */
  const initTilt = () => {
    if (!fine || reduce) return;
    $$('.wcard').forEach((card) => {
      const f = $('.frame', card);
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        f.style.transform = `perspective(1000px) rotateY(${(x * 9).toFixed(2)}deg) rotateX(${(-y * 9).toFixed(2)}deg) scale(1.015)`;
      });
      card.addEventListener('pointerleave', () => { f.style.transform = ''; });
    });
  };

  /* ---------- pokretanje --------------------------------------------------------------------------------- */
  const boot = () => {
    initPicks();
    initIntro();
    initReveal();
    initParallax();
    initHero();
    initStack();
    initExpand();
    initWeight();
    initTrail();
    initTilt();
    initScrub();
    initMarquee();
    initFooter();
    initNav();
    initCursor();
    initMagnetic();
    initTransitions();
    initClocks();
    initWorks();
    initServices();
    initLightbox();

    relayout();
    addEventListener('load', relayout);
    if (D.fonts && D.fonts.ready) D.fonts.ready.then(relayout);
    let t = 0;
    addEventListener('resize', () => { clearTimeout(t); t = setTimeout(relayout, 120); });
    if ('ResizeObserver' in window) {
      let h = root.scrollHeight;
      new ResizeObserver(() => { if (Math.abs(root.scrollHeight - h) > 2) { h = root.scrollHeight; relayout(); } }).observe(D.body);
    }
    requestAnimationFrame(frame);
  };

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
})();
