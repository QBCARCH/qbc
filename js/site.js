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

  /* potpis naslovne slike: izbor je napravila mala skripta odmah posle slike */
  const initPicks = () => {
    const img = $('img[data-pick="hero"]'), credit = $('[data-credit]');
    if (!img || !credit || !img.dataset.s) return;
    credit.href = `work/${img.dataset.s}.html`;
    credit.textContent = `${img.dataset.t} / ${img.dataset.y} ↗`;
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
      setTimeout(() => { location.href = a.href; }, 560);
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
    const input = $('[data-search]', host), empty = $('[data-empty]', host);
    if (input) input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      let n = 0;
      $$('[data-q]', host).forEach((el) => {
        const ok = q.every((t) => el.dataset.q.includes(t));
        el.classList.toggle('is-filtered', !ok);
        if (ok && el.classList.contains('wcard')) n++;
      });
      if (empty) empty.hidden = n > 0;
    });
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


  /* kontakt forma: salje preko FormSubmit (AJAX); bez JS-a radi obican POST sa povratkom na ?sent=1 */
  const initForm = () => {
    const f = $('[data-form]');
    if (!f) return;
    const st = $('[data-form-status]', f), btn = $('button[type="submit"]', f);
    const say = (t, err) => { st.textContent = t; st.classList.toggle('is-error', !!err); };
    if (/[?&]sent=1/.test(location.search)) say('Thank you. Your message has been sent, we will reply soon.');
    f.addEventListener('submit', async (e) => {
      if (!window.fetch) return;
      e.preventDefault();
      if (f._honey && f._honey.value) return;
      btn.disabled = true; say('Sending...');
      try {
        const r = await fetch(f.action.replace('formsubmit.co/', 'formsubmit.co/ajax/'), {
          method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(f) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || String(j.success) === 'false') throw new Error(j.message || r.status);
        f.reset(); say('Thank you. Your message has been sent, we will reply soon.');
      } catch {
        say('The message could not be sent. Please write to office@qbc.rs or call +381 63 411 066.', true);
      } finally { btn.disabled = false; }
    });
  };

  const boot = () => {
    initPicks(); initReveal(); initParallax(); initNav(); initProgress(); initKeys(); initMenu(); initTransitions(); initClocks(); initWorks(); initLightbox(); initForm();
  };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
})();
