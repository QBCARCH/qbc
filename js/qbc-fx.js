/* QBC dodatni efekti (bez zavisnosti). Ne dira Webflow interakcije, samo dodaje sloj iznad. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };

  function init() {
    var gallery = $$('.works-details__showcase-visual');
    var paras = $$('.works-details__title.qbc-richtext p');
    if (!gallery.length && !paras.length) { /* druge stranice: samo indikator nije potreban */ return; }
    root.classList.add('qbc-fx');

    /* ---- otkrivanje pri skrolu ---- */
    var reveal = function (el) { el.classList.add('qbc-in'); };
    if ('IntersectionObserver' in window && !reduce) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      gallery.forEach(function (el, i) { el.style.setProperty('--fx-delay', ((i % 2) * 0.12) + 's'); io.observe(el); });
      paras.forEach(function (el, i) { el.style.transitionDelay = (i * 0.08) + 's'; io.observe(el); });
    } else {
      gallery.concat(paras).forEach(reveal);
    }

    /* ---- blagi parallax unutar slika galerije ---- */
    if (!reduce && gallery.length) {
      var ticking = false;
      var imgs = gallery.map(function (w) { return { w: w, i: w.querySelector('img') }; });
      var update = function () {
        ticking = false;
        var vh = window.innerHeight;
        imgs.forEach(function (o) {
          if (!o.i) return;
          var r = o.w.getBoundingClientRect();
          if (r.bottom < -100 || r.top > vh + 100) return;
          var p = ((r.top + r.height / 2) - vh / 2) / vh; // -1..1 oko sredine ekrana
          var amp = Math.min(34, r.height * 0.06);
          o.i.style.setProperty('--fx-py', (p * -amp).toFixed(1) + 'px');
        });
      };
      var req = function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
      window.addEventListener('scroll', req, { passive: true });
      window.addEventListener('resize', req);
      update();
    }

    /* ---- indikator skrola ---- */
    var bar = doc.createElement('div'); bar.className = 'qbc-progress'; doc.body.appendChild(bar);
    var setBar = function () {
      var h = root.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, window.scrollY / h) : 0) + ')';
    };
    window.addEventListener('scroll', setBar, { passive: true }); setBar();

    /* ---- lightbox ---- */
    var shots = $$('.works-details__img, .works-details__showcase-img');
    var seen = {}, list = [];
    shots.forEach(function (im) {
      var key = im.getAttribute('src');
      if (seen[key]) { im.__lb = seen[key].idx; return; }
      seen[key] = { idx: list.length }; im.__lb = list.length; list.push(im);
    });
    if (!list.length) return;

    function bestUrl(im) {
      var ss = im.getAttribute('srcset');
      if (!ss) return im.getAttribute('src');
      var best = null;
      ss.split(/,\s+/).forEach(function (part) {
        var m = part.trim().match(/^(.*\S)\s+(\d+)w$/); if (!m) return;
        var w = +m[2];
        if (w <= 2600 && (!best || w > best.w)) best = { u: m[1], w: w };
      });
      return best ? best.u : im.getAttribute('src');
    }

    var lb = doc.createElement('div');
    lb.className = 'qbc-lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true');
    lb.innerHTML = '<span class="lb-c"></span><button class="lb-x" aria-label="Zatvori">Close</button>' +
      '<button class="lb-p" aria-label="Prethodna">Prev</button><button class="lb-n" aria-label="Sledeca">Next</button><img alt="">';
    doc.body.appendChild(lb);
    var big = lb.querySelector('img'), cnt = lb.querySelector('.lb-c'), cur = 0;

    function show(i) {
      cur = (i + list.length) % list.length;
      big.classList.remove('ready');
      var url = bestUrl(list[cur]);
      var t = new Image();
      t.onload = function () { big.src = url; requestAnimationFrame(function () { big.classList.add('ready'); }); };
      t.src = url;
      cnt.textContent = String(cur + 1).padStart(2, '0') + ' / ' + String(list.length).padStart(2, '0');
    }
    function open(i) { show(i); lb.classList.add('open'); doc.body.classList.add('qbc-lb-lock'); }
    function close() { lb.classList.remove('open'); doc.body.classList.remove('qbc-lb-lock'); }

    shots.forEach(function (im) { im.addEventListener('click', function () { open(im.__lb); }); });
    lb.querySelector('.lb-x').onclick = close;
    lb.querySelector('.lb-p').onclick = function (e) { e.stopPropagation(); show(cur - 1); };
    lb.querySelector('.lb-n').onclick = function (e) { e.stopPropagation(); show(cur + 1); };
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target === big) close(); });
    doc.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(cur - 1);
      else if (e.key === 'ArrowRight') show(cur + 1);
    });
    var x0 = null;
    lb.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1));
    });
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
})();
