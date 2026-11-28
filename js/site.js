/* QBC Architects: site.js (mirna verzija)
   meni, tihi reveal, blagi parallax, sat, pregled radova, lightbox, mekan prelaz izmedju stranica */
(() => {
  'use strict';
  const D = document, root = D.documentElement;
  const $ = (s, c = D) => c.querySelector(s);
  const $$ = (s, c = D) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const safe = (fn) => { try { return fn(); } catch { return null; } };

  /* tiho pojavljivanje */
  const initReveal = () => {
    const els = $$('[data-reveal]');
    if (!els.length) return;
    if (!('IntersectionObserver' in window) || reduce) { els.forEach((e) => e.classList.add('is-in')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting || e.boundingClientRect.top < 0) { e.target.style.setProperty('--d', (e.target.dataset.d || 0) + 's'); e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { rootMargin: '0px' });
    els.forEach((e) => io.observe(e));
  };

  /* jedan, jednak i blag parallax: slika se krece sporije od okvira */
  const initParallax = () => {
    if (reduce) return;
    const hero = $('.phero__media');
    const frames = $$('[data-ip]').map((el) => ({ el, im: $('img', el) })).filter((f) => f.im);
    let y = scrollY, target = y, vh = innerHeight, raf = 0;
    const tops = new Map();
    const measure = () => {
      vh = innerHeight;
      frames.forEach((f) => { const r = f.el.getBoundingClientRect(); tops.set(f, { top: r.top + scrollY, h: r.height }); });
    };
    const paint = () => {
      raf = 0;
      y += (target - y) * 0.08;
      if (hero) hero.style.setProperty('--ty', (y * 0.12).toFixed(1) + 'px');
      frames.forEach((f) => {
        const m = tops.get(f);
        if (!m || m.top - y > vh * 1.2 || m.top + m.h - y < -vh * 0.2) return;
        const off = (m.top + m.h / 2 - y - vh / 2) / vh;
        f.im.style.setProperty('--ty', (clamp(-off * m.h * 0.08, -m.h * 0.035, m.h * 0.035)).toFixed(1) + 'px');
      });
      if (Math.abs(target - y) > 0.3) raf = requestAnimationFrame(paint);
    };
    const kick = () => { target = scrollY; if (!raf) raf = requestAnimationFrame(paint); };
    addEventListener('scroll', kick, { passive: true });
    addEventListener('resize', () => { measure(); kick(); });
    addEventListener('load', () => { measure(); kick(); });
    measure(); y = target = scrollY; paint();
  };

  /* navigacija: pri spustanju se sklanjaju traka i linkovi, a znak i naziv ostaju;
     preko tamnih delova (slika na vrhu, tamne trake) tekst je beo, inace crn */
  const initNav = () => {
    const nav = $('.nav'), brand = $('.nav__brand');
    if (!nav || !brand) return;
    const darks = $$('.hero, .phero, .reel, .inq, .pgal--dark');
    let last = scrollY, raf = 0;
    // dok se na naslovnoj crta skica (svetao papir), zaglavlje je tamno
    const tone = () => {
      raf = 0;
      const b = brand.getBoundingClientRect(), y = b.top + b.height / 2;
      root.classList.toggle('on-dark', darks.some((el) => { if (el.classList.contains('is-sketch') && !el.classList.contains('is-render')) return false; const r = el.getBoundingClientRect(); return r.top <= y && r.bottom >= y; }));
    };
    tone();
    addEventListener('scroll', () => {
      const y = scrollY;
      nav.classList.toggle('is-hidden', y > last && y > 120 && !root.classList.contains('menu-open'));
      last = y;
      if (!raf) raf = requestAnimationFrame(tone);
    }, { passive: true });
    addEventListener('resize', tone);
    // znak se pomera kada se traka skupi, pa se ton proverava i posle prelaza
    nav.addEventListener('transitionend', tone);
  };

  const initProgress = () => {
    const bar = $('.progress');
    if (!bar) return;
    const f = () => bar.style.setProperty('--p', clamp(scrollY / Math.max(1, root.scrollHeight - innerHeight)).toFixed(4));
    addEventListener('scroll', f, { passive: true }); addEventListener('resize', f); f();
  };

  /* strelice na tastaturi: prethodni / sledeci projekat */
  const initKeys = () => {
    const nx = $('[data-next]'), pv = $('[data-prev]');
    if (!nx && !pv) return;
    D.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || D.body.classList.contains('is-locked')) return;
      const t = e.target && e.target.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA') return;
      const a = e.key === 'ArrowRight' ? nx : e.key === 'ArrowLeft' ? pv : null;
      if (a) a.click();
    });
  };

  const initMenu = () => {
    const menu = $('#menu');
    if (!menu) return;
    const open = $('[data-menu-open]'), close = $('[data-menu-close]');
    // slika u meniju se ucitava tek kad korisnik krene ka meniju (inace je skrivena, a ipak se preuzima na svakoj stranici)
    const art = $('img[data-srcset]', menu);
    const loadArt = () => { if (art && !art.srcset) art.srcset = art.dataset.srcset; };
    open && ['pointerenter', 'focus', 'touchstart'].forEach((ev) => open.addEventListener(ev, loadArt, { passive: true, once: true }));
    const set = (on) => {
      on && loadArt();
      menu.classList.toggle('is-open', on);
      menu.setAttribute('aria-hidden', String(!on));
      open && open.setAttribute('aria-expanded', String(on));
      root.classList.toggle('menu-open', on);
      D.body.classList.toggle('is-locked', on);
      (on ? close : open) && (on ? close : open).focus({ preventScroll: true });
    };
    open && open.addEventListener('click', () => set(true));
    close && close.addEventListener('click', () => set(false));
    D.addEventListener('keydown', (e) => {
      if (!menu.classList.contains('is-open')) return;
      if (e.key === 'Escape') { set(false); return; }
      if (e.key !== 'Tab') return;
      const f = $$('a[href], button', menu).filter((el) => el.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && D.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && D.activeElement === last) { e.preventDefault(); first.focus(); }
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
    // pretraga i filteri (vrsta, stanje) rade zajedno: projekat ostaje ako prolazi sve uslove
    const input = $('[data-search]', host), empty = $('[data-empty]', host);
    const f = { cat: '', st: '' };
    const apply = () => {
      const q = input ? input.value.trim().toLowerCase().split(/\s+/).filter(Boolean) : [];
      let n = 0;
      $$('[data-q]', host).forEach((el) => {
        const ok = q.every((t) => el.dataset.q.includes(t)) && (!f.cat || el.dataset.cat === f.cat) && (!f.st || el.dataset.st === f.st);
        el.classList.toggle('is-filtered', !ok);
        if (ok && el.classList.contains('wcard')) n++;
      });
      if (empty) empty.hidden = n > 0;
    };
    if (input) input.addEventListener('input', apply);
    $$('[data-f]', host).forEach((b) => b.addEventListener('click', () => {
      f[b.dataset.f] = b.dataset.v;
      $$(`[data-f="${b.dataset.f}"]`, host).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      apply();
    }));
    const saved = safe(() => sessionStorage.getItem('qbc-view'));
    if (saved === 'index') set('index');
  };

  /* klik na projekat sa liste: kliknuta slika dobija ime "hero", pa je pregledac prenese u veliku sliku
     na vrhu stranice projekta (css ::view-transition-group(hero)). Na stranici projekta velika slika vec nosi
     to ime, pa se tu nista ne dodaje (dva ista imena bi prekinula prelaz). */
  const initHeroLink = () => {
    if (reduce || $('.phero')) return;
    const clear = () => $$('img').forEach((im) => { if (im.style.viewTransitionName) im.style.viewTransitionName = ''; });
    D.addEventListener('click', (e) => {
      const a = e.target.closest('a[href*="work/"]');
      if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      clear();
      const im = $('.frame img', a) || (a.classList.contains('windex__row') && $('.peek.is-on img'));
      if (im) im.style.viewTransitionName = 'hero';
    });
    // povratak iz istorije (bfcache): stranica je zamrznuta sa imenom, pa se ono brise
    addEventListener('pageshow', clear);
  };

  /* kursor "Pogledaj" nad karticama i slika projekta uz pokazivac u Index prikazu; samo za mis */
  const initPointer = () => {
    if (reduce || !matchMedia('(pointer: fine)').matches) return;
    const CARDS = '.wcard, .reel .card:not(.card--end)', ROWS = '.windex__row[data-img]';
    if (!$(CARDS) && !$(ROWS)) return;
    const cur = D.createElement('div'), peek = D.createElement('div');
    cur.className = 'cur'; cur.setAttribute('aria-hidden', 'true'); cur.textContent = root.lang === 'sr' ? 'Pogledaj' : 'View';
    peek.className = 'peek'; peek.setAttribute('aria-hidden', 'true'); peek.innerHTML = '<img alt="">';
    D.body.append(cur, peek); root.classList.add('has-cur');
    const pim = $('img', peek);
    let x = -200, y = -200, raf = 0;
    const paint = () => {
      raf = 0;
      cur.style.transform = `translate3d(${x}px,${y}px,0)`;
      const w = peek.offsetWidth, h = peek.offsetHeight;
      const px = x + 28 + w > innerWidth ? x - 28 - w : x + 28;
      peek.style.transform = `translate3d(${px}px,${clamp(y - h / 2, 8, innerHeight - h - 8)}px,0)`;
    };
    const update = (t) => {
      const card = t && t.closest && t.closest(CARDS), row = t && t.closest && t.closest(ROWS);
      cur.classList.toggle('is-on', !!card);
      cur.classList.toggle('cur--ink', !!(card && card.closest('.reel')));
      if (row && pim.getAttribute('src') !== row.dataset.img) pim.src = row.dataset.img;
      peek.classList.toggle('is-on', !!row);
      if (!raf) raf = requestAnimationFrame(paint);
    };
    addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; x = e.clientX; y = e.clientY; update(e.target); }, { passive: true });
    // pri skrolu se ispod mirnog pokazivaca smenjuju kartice
    addEventListener('scroll', () => { if (x > 0) update(D.elementFromPoint(x, y)); }, { passive: true });
    // i posle klika (npr. Grid / Index), kada se ispod pokazivaca promeni sadrzaj
    D.addEventListener('click', () => requestAnimationFrame(() => { if (x > 0) update(D.elementFromPoint(x, y)); }));
    D.addEventListener('mouseleave', () => { cur.classList.remove('is-on'); peek.classList.remove('is-on'); });
  };

  /* crtezi projekta (osnove po nivoima, preseci): dugme otkriva svoj kadar, ostali su skriveni.
     Dugmad imaju aria-pressed; bez JS-a vidi se samo prvi crtez. */
  const initDrawings = () => {
    $$('[data-draw]').forEach((g) => {
      const btns = $$('.pdraw__tabs button', g), figs = $$('.pdraw__fig', g);
      // ostali kadrovi se ucitavaju u pozadini cim se stranica smiri, da dugme ne ceka mrezu
      setTimeout(() => $$('img', g).forEach((im) => { im.loading = 'eager'; }), 2500);
      btns.forEach((b) => b.addEventListener('click', () => {
        const n = +b.dataset.i;
        figs.forEach((f, k) => { f.hidden = k !== n; });
        btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      }));
    });
  };

  /* galerija projekta: pregled preko celog ekrana i, gde postoji, osnova iza rendera.
     Pokazivac (mis) otkriva crtez kao brisanje; dodir prebacuje render/osnova; dugmad rade svuda.
     U pregledu preko celog ekrana osnova je svoj kadar odmah posle svog rendera. */
  const initGallery = () => {
    const figs = $$('.pgal figure[data-full]');
    if (!figs.length) return;
    const slides = [], at = new Map();
    figs.forEach((f) => {
      at.set(f, slides.length);
      slides.push({ src: f.dataset.full, alt: $('img', f).alt });
      if (f.dataset.planFull) slides.push({ src: f.dataset.planFull, alt: f.dataset.planAlt || '' });
    });
    const lb = D.createElement('div');
    lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Image viewer');
    lb.innerHTML = '<span class="lb__c"></span><img alt=""><button class="lb__p" type="button" aria-label="Previous">←</button><button class="lb__n" type="button" aria-label="Next">→</button><button class="lb__x" type="button">Close</button>';
    D.body.appendChild(lb);
    const im = $('img', lb), cnt = $('.lb__c', lb);
    let i = 0;
    const show = (n) => {
      i = (n + slides.length) % slides.length;
      im.classList.remove('is-ready');
      im.onload = () => im.classList.add('is-ready');
      im.src = slides[i].src;
      im.alt = slides[i].alt;
      cnt.textContent = `${String(i + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    };
    const open = (n) => { show(n); lb.classList.add('is-open'); D.body.classList.add('is-locked'); };
    const close = () => { lb.classList.remove('is-open'); D.body.classList.remove('is-locked'); };
    const fine = matchMedia('(pointer: fine)').matches && !reduce;
    figs.forEach((f) => {
      if (!f.classList.contains('pfig')) {
        // slika bez osnove je dugme: fokus tastaturom, Enter ili Space otvaraju pregled
        f.tabIndex = 0; f.setAttribute('role', 'button'); f.setAttribute('aria-label', `${$('img', f).alt}, ${at.get(f) + 1} / ${figs.length}`);
        f.addEventListener('click', () => open(at.get(f)));
        f.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(at.get(f)); } });
        return;
      }
      const btns = $$('[data-show]', f);
      let mode = 'render';
      const set = (m) => {
        mode = m;
        f.classList.remove('is-live');
        f.style.setProperty('--x', m === 'plan' ? '0%' : '100%');
        f.classList.toggle('is-plan', m === 'plan');
        btns.forEach((b) => { if (b.dataset.show !== 'zoom') b.setAttribute('aria-pressed', String(b.dataset.show === m)); });
      };
      btns.forEach((b) => b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (b.dataset.show === 'zoom') open(at.get(f) + (f.classList.contains('is-plan') ? 1 : 0)); else set(b.dataset.show);
      }));
      if (fine) {
        f.addEventListener('pointermove', (e) => {
          if (e.pointerType !== 'mouse' || e.target.closest('.pfig__tag')) return;
          const r = f.getBoundingClientRect(), x = clamp((e.clientX - r.left) / r.width);
          f.classList.add('is-live');
          f.style.setProperty('--x', (x * 100).toFixed(2) + '%');
          f.classList.toggle('is-plan', x < .5);
        });
        f.addEventListener('pointerleave', () => set(mode));
        // klik misem otvara ono sto je pod pokazivacem: render ili osnovu
        f.addEventListener('click', (e) => { if (!e.target.closest('.pfig__tag')) open(at.get(f) + (f.classList.contains('is-plan') ? 1 : 0)); });
      } else {
        f.addEventListener('click', (e) => { if (!e.target.closest('.pfig__tag')) set(mode === 'plan' ? 'render' : 'plan'); });
      }
    });
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


  /* kontakt forma: salje preko FormSubmit (AJAX); bez JS-a radi obican POST sa povratkom na ?sent=1 */
  const initForm = () => {
    const f = $('[data-form]');
    if (!f) return;
    const st = $('[data-form-status]', f), btn = $('button[type="submit"]', f);
    const say = (t, err) => { st.textContent = t; st.classList.toggle('is-error', !!err); };
    const sr = D.documentElement.lang === 'sr';
    const M = sr ? { ok: 'Hvala. Vaša poruka je poslata, javićemo se uskoro.', sending: 'Šaljem...', fail: 'Poruka nije poslata. Pišite nam na office@qbc.rs ili nas pozovite na +381 63 411 066.' }
      : { ok: 'Thank you. Your message has been sent, we will reply soon.', sending: 'Sending...', fail: 'The message could not be sent. Please write to office@qbc.rs or call +381 63 411 066.' };
    if (/[?&]sent=1/.test(location.search)) say(M.ok);
    const t0 = Date.now();
    f.addEventListener('submit', async (e) => {
      if (!window.fetch) return;
      e.preventDefault();
      if (f._honey && f._honey.value) return;
      // zamka za botove: covek ne popuni formu za manje od 3 sekunde; botu se prikaze uspeh, a nista se ne salje
      if (Date.now() - t0 < 3000) { f.reset(); say(M.ok); return; }
      btn.disabled = true; say(M.sending);
      try {
        const r = await fetch(f.action.replace('formsubmit.co/', 'formsubmit.co/ajax/'), {
          method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(f) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || String(j.success) === 'false') throw new Error(j.message || r.status);
        f.reset(); say(M.ok);
      } catch {
        say(M.fail, true);
      } finally { btn.disabled = false; }
    });
  };

  // brojaci: broj raste od nule kada udje u vidno polje; bez JS-a ili uz smanjeno kretanje ostaje krajnji broj
  const initCount = () => {
    const els = $$('[data-count]');
    if (!els.length || !('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const run = (el) => {
      const to = +el.dataset.count, t0 = performance.now(), dur = 1800;
      const step = (t) => { const k = Math.min(1, (t - t0) / dur); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 4))); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    };
    els.forEach((e) => { e.textContent = '0'; });
    const io = new IntersectionObserver((en) => en.forEach((x) => { if (x.isIntersecting) { io.unobserve(x.target); run(x.target); } }), { threshold: .6 });
    els.forEach((e) => io.observe(e));
  };

  // recenica se otkriva rec po rec kako se skroluje; bez JS-a ili uz smanjeno kretanje vidi se cela
  const initWords = () => {
    const el = $('[data-words]');
    if (!el || reduce) return;
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', words.join(' '));
    el.innerHTML = words.map((w) => `<span class="w" aria-hidden="true">${w}</span>`).join(' ');
    const spans = $$('.w', el);
    let raf = 0;
    const paint = () => {
      raf = 0;
      const r = el.getBoundingClientRect(), vh = innerHeight;
      const p = clamp((vh * .82 - r.top) / (vh * .5));
      const n = Math.round(p * spans.length);
      spans.forEach((x, i) => x.classList.toggle('is-lit', i < n));
    };
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(paint); }, { passive: true });
    paint();
  };

  /* skica na naslovnoj: potezi su napravljeni unapred (admin/sketch-lib.js); ovde ih skrol "docrtava".
     .hero je staza od 220svh: do 62% puta olovka crta, od 58% do 88% se ispod pojavljuje slika,
     a linije se povuku do 98%. Na vrhu stranice je vec iscrtan pocetak (14%), da papir nikad nije prazan. */
  const initSketch = () => {
    const hero = $('.hero.is-sketch[data-sketch]'), host = hero && $('.hero__sketch', hero);
    if (!hero || !host) return;
    const stage = $('[data-stage]', hero), meter = $('[data-meter]', hero);
    const names = root.lang === 'sr' ? ['Skica', 'Model', 'Render'] : ['Sketch', 'Model', 'Render'];
    let seed = 7;
    const rnd = () => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822507) + 0x9e3779b9 >>> 0) / 4294967296);
    // drhtava olovka: tacke na ~6 px, blagi talas popreko, zaobljeno (Catmull-Rom), mali produzetak na krajevima
    const pencil = (pts) => {
      const res = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[i + 1], n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / 6));
        for (let k = 0; k < n; k++) res.push([x1 + (x2 - x1) * k / n, y1 + (y2 - y1) * k / n]);
      }
      res.push(pts[pts.length - 1]);
      const ext = (a, b, d) => { const L = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1; return [a[0] + (a[0] - b[0]) / L * d, a[1] + (a[1] - b[1]) / L * d]; };
      res.unshift(ext(res[0], res[1], 2 + rnd() * 4));
      res.push(ext(res[res.length - 1], res[res.length - 2], 2 + rnd() * 4));
      const amp = .5 + rnd() * .5, f1 = 1 / (50 + rnd() * 60), f2 = 1 / (11 + rnd() * 8), p1 = rnd() * 6.3, p2 = rnd() * 6.3;
      let dist = 0;
      const q = res.map((p, i) => {
        if (i) dist += Math.hypot(p[0] - res[i - 1][0], p[1] - res[i - 1][1]);
        const a = res[Math.max(0, i - 1)], b = res[Math.min(res.length - 1, i + 1)], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        const w = amp * Math.sin(dist * f1 * 6.28 + p1) + amp * .35 * Math.sin(dist * f2 * 6.28 + p2);
        return [p[0] - (b[1] - a[1]) / L * w, p[1] + (b[0] - a[0]) / L * w];
      });
      let d = `M${q[0][0].toFixed(1)} ${q[0][1].toFixed(1)}`;
      for (let i = 0; i < q.length - 1; i++) {
        const a = q[Math.max(0, i - 1)], b = q[i], c = q[i + 1], e = q[Math.min(q.length - 1, i + 2)];
        d += `C${(b[0] + (c[0] - a[0]) / 6).toFixed(1)} ${(b[1] + (c[1] - a[1]) / 6).toFixed(1)} ${(c[0] - (e[0] - b[0]) / 6).toFixed(1)} ${(c[1] - (e[1] - b[1]) / 6).toFixed(1)} ${c[0].toFixed(1)} ${c[1].toFixed(1)}`;
      }
      return d;
    };
    const paths = [];
    let total = 0, raf = 0, wasRender = false;
    const prog = () => { const r = hero.getBoundingClientRect(); return clamp(-r.top / (r.height - innerHeight)); };
    const paint = () => {
      raf = 0;
      const p = prog(), draw = clamp(p / .62) * total;
      paths.forEach(({ el, len, at }) => { el.style.strokeDashoffset = len * (1 - clamp((draw - at) / len)); });
      const r = clamp((p - .58) / .3);
      hero.style.setProperty('--render', r.toFixed(3));
      hero.style.setProperty('--paper', (1 - clamp((p - .8) / .18)).toFixed(3));
      // kada se pojavi slika, zaglavlje menja ton (initNav slusa resize)
      if (hero.classList.toggle('is-render', r > .55) !== wasRender) { wasRender = !wasRender; dispatchEvent(new Event('resize')); }
      if (meter) meter.style.setProperty('--p', p.toFixed(3));
      if (stage) stage.textContent = names[p < .6 ? 0 : p < .88 ? 1 : 2];
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(paint); };
    fetch(hero.dataset.sketch).then((r) => r.json()).then(({ w, h, s }) => {
      const NS = 'http://www.w3.org/2000/svg', svg = D.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`); svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
      const st = s.map((f) => { const p = []; for (let i = 0; i < f.length; i += 2) p.push([f[i], f[i + 1]]); return p; }).filter((p) => p.length > 1);
      st.forEach((p) => {
        const el = D.createElementNS(NS, 'path');
        el.setAttribute('d', pencil(p)); el.setAttribute('stroke-width', (.85 + rnd() * .4).toFixed(2)); el.style.opacity = (.62 + rnd() * .3).toFixed(2);
        svg.appendChild(el);
      });
      host.appendChild(svg);
      $$('path', svg).forEach((el) => { const len = el.getTotalLength(); el.style.strokeDasharray = len; el.style.strokeDashoffset = len; paths.push({ el, len, at: total }); total += len; });
      // na samom vrhu je vec iscrtano prvih 45%, da stranica ne pocinje praznim papirom
      if (prog() === 0) { const d = total * .45; paths.forEach(({ el, len, at }) => { el.style.strokeDashoffset = len * (1 - clamp((d - at) / len)); }); }
      else paint();
      addEventListener('scroll', kick, { passive: true });
      addEventListener('resize', kick);
    }).catch(() => { hero.classList.remove('is-sketch'); });
  };

  /* traka projekata na pocetnoj: zalepljen ekran, kartice klize ulevo srazmerno spustanju kroz .reel */
  const initReel = () => {
    const reel = $('.reel'), track = reel && $('[data-track]', reel);
    if (!reel || !track || reduce) return;
    const bar = $('[data-bar]', reel), count = $('[data-count]', reel), cards = $$('.card:not(.card--end)', track);
    const pad = (n) => String(n).padStart(2, '0');
    let raf = 0;
    const paint = () => {
      raf = 0;
      const r = reel.getBoundingClientRect(), p = clamp(-r.top / (r.height - innerHeight)), max = Math.max(0, track.scrollWidth - innerWidth);
      track.style.transform = `translate3d(${(-max * p).toFixed(1)}px,0,0)`;
      if (bar) bar.style.setProperty('--p', p.toFixed(3));
      if (count && cards.length) count.textContent = `${pad(Math.min(cards.length, Math.floor(p * cards.length * 1.08) + 1))} / ${pad(cards.length)}`;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(paint); };
    addEventListener('scroll', kick, { passive: true });
    addEventListener('resize', kick);
    addEventListener('load', kick);
    paint();
  };

  /* potpis naslovne slike: sliku je izabrala mala skripta na mestu slike (tools/build-core.js, HERO_JS) */
  const initCredit = () => {
    const hero = $('.hero[data-s]'), credit = $('.hero__credit');
    if (!hero || !credit) return;
    credit.href = (credit.getAttribute('href') || '').replace(/work\/[^/]*$/, 'work/' + hero.dataset.s + '.html');
    credit.textContent = `${hero.dataset.t} / ${hero.dataset.y} ↗`;
  };

  /* beleske olovkom preko naslovne slike projekta: podaci su u data/projects.json (polje annot), build ih upisuje u
     .phero__annot[data-annot]. Ovde se kratki zapisi (osa, kota, beleska...) razlazu u poteze, prave SVG sa blagim
     drhtanjem linije (feTurbulence) i docrtavaju jedan za drugim posle ucitavanja. Koordinate su u prostoru
     sirine 1366 (data-h je visina u istom prostoru); SVG ima "slice" kao object-fit: cover. Uz smanjeno kretanje
     je sve odmah iscrtano. Tekst je isti na srpskom i engleskom (cirilica, font Andric). */
  const initAnnot = () => {
    const host = $('.phero__annot[data-annot]');
    if (!host) return;
    let spec; try { spec = JSON.parse(host.dataset.annot); } catch (e) { return; }
    const NS = 'http://www.w3.org/2000/svg', W = 1366, H = +host.dataset.h || 768;
    let s = 7; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    const L = (pts, c = 'ink', amp = 1.6, over = true) => ({ k: 'p', pts, c, amp, over });
    const T = (x, y, lines, c = 'ink', o = {}) => ({ k: 't', x, y, lines, c, rot: o.rot || 0, anchor: o.anchor || 'start' });
    const circ = (cx, cy, r, c) => { const p = []; for (let a = 0; a <= 370; a += 30) p.push([cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)]); return L(p, c, .8, false); };
    const dash = (x1, y1, x2, y2, c) => { const n = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / n, uy = (y2 - y1) / n, segs = []; for (let d = 0; d < n; d += 22) { const e = Math.min(d + 14, n); segs.push([[x1 + ux * d, y1 + uy * d], [x1 + ux * e, y1 + uy * e]]); } return { k: 'd', segs, c }; };
    const ex = {
      axis: (x, y1, y2, t, c) => [dash(x, y1, x, y2, c), circ(x, y1 - 14, 12, c), T(x, y1 - 8, [t], c, { anchor: 'middle' })],
      dimv: (x, y1, y2, t, c) => [L([[x, y1], [x, y2]], c, .8), L([[x - 5, y1 + 5], [x + 5, y1 - 5]], c, .4), L([[x - 5, y2 + 5], [x + 5, y2 - 5]], c, .4), T(x - 6, (y1 + y2) / 2 + 14, [t], c, { rot: -90, anchor: 'middle' })],
      dimh: (x1, x2, y, t, c) => [L([[x1, y], [x2, y]], c, .8), L([[x1 - 5, y + 5], [x1 + 5, y - 5]], c, .4), L([[x2 - 5, y + 5], [x2 + 5, y - 5]], c, .4), T((x1 + x2) / 2, y - 7, [t], c, { anchor: 'middle' })],
      level: (x, y, t, c) => [L([[x - 9, y - 12], [x + 9, y - 12], [x, y], [x - 9, y - 12]], c, .4, false), L([[x - 14, y], [x + 44, y]], c, .6), T(x + 16, y - 5, [t], c)],
      note: (x, y1, y2, lines, c, side) => [L([[x, y1], [x, y2]], c, 1.8), { k: 'dot', x, y: y1, c }, T(side === 'l' ? x - 7 : x + 7, y2 + 14, lines, c, { anchor: side === 'l' ? 'end' : 'start' })],
      noterot: (x, y1, y2, t, c) => [L([[x, y1], [x, y2]], c, 1.8), { k: 'dot', x, y: y1, c }, T(x - 6, y1 - 8, [t], c, { rot: -90 })],
      line: (pts, c, amp, over) => [L(pts, c, amp ?? .7, !!over)],
      box: (x1, y1, x2, y2, c) => [L([[x1, y1], [x2, y1], [x2, y2], [x1, y2], [x1, y1]], c, .8, false)],
      text: (x, y, lines, c, o) => [T(x, y, lines, c, o || {})],
      dash: (x1, y1, x2, y2, c) => [dash(x1, y1, x2, y2, c)],
      circ: (x, y, r, c) => [circ(x, y, r, c)],
    };
    const list = [];
    spec.forEach((a) => { const f = ex[a[0]]; if (!f) return; const args = a.slice(1); list.push(...f(...args).map((e) => (e.c = e.c || 'ink', e))); });
    const svg = D.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('preserveAspectRatio', 'xMidYMid slice'); svg.setAttribute('aria-hidden', 'true');
    const mk = (n, at) => { const e = D.createElementNS(NS, n); for (const k in at) e.setAttribute(k, at[k]); return e; };
    const defs = mk('defs', {}), fl = mk('filter', { id: 'penf', x: '-5%', y: '-5%', width: '110%', height: '110%' });
    fl.append(mk('feTurbulence', { type: 'fractalNoise', baseFrequency: '.045', numOctaves: '2', seed: '5', result: 'n' }), mk('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: '1.7' }));
    defs.appendChild(fl); svg.appendChild(defs);
    const g = mk('g', { filter: 'url(#penf)' }); svg.appendChild(g);
    const wob = (pts, amp) => { const o = []; for (let i = 0; i < pts.length - 1; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[i + 1], n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / 40)); for (let k = 0; k < n; k++) { const t = k / n; o.push([x1 + (x2 - x1) * t + (rnd() - .5) * amp, y1 + (y2 - y1) * t + (rnd() - .5) * amp]); } } o.push(pts[pts.length - 1]); return o; };
    const dOf = (p) => 'M' + p.map((q) => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' L');
    const items = [];
    list.forEach((el) => {
      const grp = mk('g', { class: el.c }); g.appendChild(grp);
      if (el.k === 'p') {
        let pts = el.pts.map((p) => [p[0], p[1]]);
        if (el.over) { const a = pts[0], b = pts[1], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, e = rnd() * 3; pts[0] = [a[0] - (b[0] - a[0]) / d * e, a[1] - (b[1] - a[1]) / d * e]; }
        const p = mk('path', { class: 'ln', d: dOf(wob(pts, el.amp)) }); grp.appendChild(p); items.push({ p });
      } else if (el.k === 'd') {
        const p = mk('path', { class: 'ln', d: el.segs.map((q) => dOf(wob(q, 1.4))).join(' ') }); p.style.opacity = .8; grp.appendChild(p); items.push({ p });
      } else if (el.k === 'dot') {
        const c = mk('circle', { cx: el.x, cy: el.y, r: 2.1, class: 'dot' }); grp.appendChild(c); items.push({ t: c });
      } else {
        const t = mk('text', { class: 'tx', x: el.x, y: el.y, 'text-anchor': el.anchor });
        t.setAttribute('transform', `rotate(${el.rot || ((rnd() - .5) * 3).toFixed(2)} ${el.x} ${el.y})`);
        el.lines.forEach((l, i) => { const sp = mk('tspan', { x: el.x, dy: i ? 21 : 0 }); sp.textContent = l; t.appendChild(sp); });
        grp.appendChild(t); items.push({ t });
      }
    });
    host.appendChild(svg);
    /* sve sto bi "slice" odsekao (uski ekran, drugi odnos strana) se izbacuje, da ne ostanu poluseckani zapisi */
    const hb = host.getBoundingClientRect();
    if (hb.width && hb.height) {
      const sc = Math.max(hb.width / W, hb.height / H), vx = hb.width / sc, vy = hb.height / sc, x0 = (W - vx) / 2, y0 = (H - vy) / 2;
      for (let i = items.length - 1; i >= 0; i--) {
        const grp = (items[i].p || items[i].t).parentNode, b = grp.getBBox();
        if (b.x < x0 + 6 || b.x + b.width > x0 + vx - 6 || b.y < y0 + 6 || b.y + b.height > y0 + vy - 6) { grp.remove(); items.splice(i, 1); }
      }
    }
    items.forEach((it) => { if (it.p) { const n = it.p.getTotalLength(); it.p.style.strokeDasharray = n; it.p.style.strokeDashoffset = reduce ? 0 : n; it.n = n; } else it.t.style.opacity = reduce ? 1 : 0; });
    if (reduce) return;
    const N = items.length || 1;
    const start = () => items.forEach((it, i) => {
      const e = it.p || it.t, delay = 900 + i * (3200 / N);
      e.style.transition = `${it.p ? 'stroke-dashoffset' : 'opacity'} ${it.p ? 0.8 : 0.5}s ease-out ${delay}ms`;
      requestAnimationFrame(() => requestAnimationFrame(() => { if (it.p) it.p.style.strokeDashoffset = 0; else it.t.style.opacity = 1; }));
    });
    start();
  };

  const boot = () => {
    initCredit(); initAnnot(); initSketch(); initReel(); initReveal(); initParallax(); initNav(); initProgress(); initKeys(); initMenu(); initClocks(); initWorks(); initHeroLink(); initPointer(); initGallery(); initDrawings(); initForm(); initCount(); initWords();
  };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
})();
