/*!
 * felsenmatt.js — Felsenmatt, hôtel & spa des Hautes-Vosges (site d'exemple premium, Pignon sur Web)
 * Arrivée dans la brume, heure du soleil, traversée de l'hôtel d'une ouverture à l'autre,
 * fiches des chambres, bassin qui s'ouvre, parcours chaud-froid du spa, menu, carte, réservation.
 * Sans dépendance. Mouvement réduit : rien ne bouge seul, les vidéos ne démarrent pas.
 */
(function () {
  'use strict';
  var doc = document;
  var root = doc.documentElement;
  var reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var econome = !!(navigator.connection && navigator.connection.saveData);
  var autoLecture = !reduit && !econome;
  var petitEcran = window.matchMedia('(max-width: 699px)').matches;
  var pointeurFin = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var lisse = function (t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  var sortie = function (t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); };
  var NB = ' ', FINE = ' ';
  var vw = window.innerWidth, vh = window.innerHeight;
  var annonce = $('[data-annonce]');
  var dire = function (t) { if (annonce) { annonce.textContent = ''; setTimeout(function () { annonce.textContent = t; }, 30); } };

  /* Heure de Paris ---------------------------------------------------------------- */
  var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  function paris(d) {
    d = d || new Date();
    var o = { a: d.getFullYear(), m: d.getMonth() + 1, j: d.getDate(), jour: d.getDay(), min: d.getHours() * 60 + d.getMinutes() };
    try {
      var p = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(d);
      var g = function (t) { for (var i = 0; i < p.length; i++) if (p[i].type === t) return p[i].value; return ''; };
      o = { a: +g('year'), m: +g('month'), j: +g('day'), jour: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g('weekday')), min: (parseInt(g('hour'), 10) % 24) * 60 + parseInt(g('minute'), 10) };
    } catch (e) { /* heure de l'appareil */ }
    return o;
  }
  var hfr = function (m) { m = Math.round(m); var h = Math.floor(m / 60) % 24, r = m % 60; return h + NB + 'h' + (r ? NB + (r < 10 ? '0' : '') + r : ''); };

  /* Le soleil au-dessus du lac Blanc (équation du lever du soleil) ---------------- */
  var LAT = 48.1335, LON = 7.0855;
  function soleil(a, m, j) {
    var rad = Math.PI / 180;
    var n = Math.round(Date.UTC(a, m - 1, j, 12) / 86400000 + 2440587.5 - 2451545.0);
    var J = n - LON / 360;
    var M = (357.5291 + 0.98560028 * J) % 360;
    var C = 1.9148 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
    var L = (M + C + 180 + 102.9372) % 360;
    var Jt = 2451545.0 + J + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * L * rad);
    var sd = Math.sin(L * rad) * Math.sin(23.4397 * rad), cd = Math.cos(Math.asin(sd));
    var w = Math.acos((Math.sin(-0.833 * rad) - Math.sin(LAT * rad) * sd) / (Math.cos(LAT * rad) * cd)) / rad;
    var minutes = function (jd) { return paris(new Date((jd - 2440587.5) * 86400000)).min; };
    return { lever: minutes(Jt - w / 360), coucher: minutes(Jt + w / 360) };
  }
  function ciel() {
    var el = $('[data-ciel]');
    if (!el) return;
    var n = paris(), s = soleil(n.a, n.m, n.j), txt;
    if (n.min < s.lever) txt = 'Il est <strong>' + hfr(n.min) + '</strong> à Felsenmatt. Le soleil se lève à <strong>' + hfr(s.lever) + '</strong> sur le lac Blanc.';
    else if (n.min < s.coucher) txt = 'Il est <strong>' + hfr(n.min) + '</strong> à Felsenmatt. Le soleil se couche à <strong>' + hfr(s.coucher) + '</strong> derrière les crêtes.';
    else {
      var dm = new Date(Date.UTC(n.a, n.m - 1, n.j + 1)), s2 = soleil(dm.getUTCFullYear(), dm.getUTCMonth() + 1, dm.getUTCDate());
      txt = 'Il est <strong>' + hfr(n.min) + '</strong> à Felsenmatt. Demain, le soleil se lève à <strong>' + hfr(s2.lever) + '</strong>.';
    }
    el.innerHTML = txt;
  }
  ciel();
  setInterval(ciel, 30000);

  /* La table : service en cours ou prochain service (mercredi au dimanche, 19 h – 21 h 30) */
  function service() {
    var el = $('[data-service]');
    if (!el) return;
    var n = paris(), ouvert = function (j) { return j === 0 || j >= 3; }, txt, etat = 'ferme';
    var prochain = function () {
      for (var k = 1; k <= 7; k++) { var j = (n.jour + k) % 7; if (ouvert(j)) return k === 1 ? 'demain' : JOURS[j]; }
      return '';
    };
    if (ouvert(n.jour) && n.min < 19 * 60) txt = 'Ce soir, le service commence à 19' + NB + 'h.';
    else if (ouvert(n.jour) && n.min < 21 * 60 + 30) { txt = 'Le service est en cours, jusqu’à 21' + NB + 'h' + NB + '30.'; etat = 'ouvert'; }
    else txt = (ouvert(n.jour) ? 'Service terminé' : 'Fermé ce soir') + ', prochain dîner ' + prochain() + ' à 19' + NB + 'h.';
    el.textContent = txt;
    el.setAttribute('data-etat', etat);
  }
  service();
  setInterval(service, 60000);

  /* Découpage des titres en mots et lettres --------------------------------------- */
  var titre = $('[data-titre]');
  if (titre) {
    titre.setAttribute('aria-label', titre.textContent.trim());
    titre.innerHTML = titre.textContent.trim().split(/\s+/).map(function (m, i) { return '<span class="mot" aria-hidden="true"><span style="--i:' + i + '">' + m + '</span></span>'; }).join(' ');
  }
  var recit = $('[data-recit]');
  var motsRecit = [];
  if (recit) {
    recit.innerHTML = recit.textContent.trim().split(/\s+/).map(function (m) { return '<span class="mot">' + m + '</span>'; }).join(' ');
    motsRecit = $$('.mot', recit);
    if (reduit) { motsRecit.forEach(function (m) { m.classList.add('est-allume'); }); motsRecit = []; }
  }
  var nomPied = $('[data-nom-pied]');
  if (nomPied) {
    nomPied.innerHTML = nomPied.textContent.trim().split('').map(function (l, i) { return '<span class="lettre" style="--i:' + i + '">' + l + '</span>'; }).join('');
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e, o) { if (e[0].isIntersecting) { nomPied.classList.add('est-visible'); o.disconnect(); } }, { threshold: 0.4 }).observe(nomPied);
    else nomPied.classList.add('est-visible');
  }

  /* L'arrivée : la brume se lève ------------------------------------------------- */
  (function () {
    var fait = false;
    var go = function () { if (fait) return; fait = true; requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add('est-charge'); }); }); };
    if (reduit) { root.classList.add('est-charge'); return; }
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(go);
    setTimeout(go, 700);
  })();

  /* Vidéos : la bonne taille, chargées à l'approche, pause possible ---------------- */
  $$('video[data-poster-petit]').forEach(function (v) { if (petitEcran) v.poster = v.getAttribute('data-poster-petit'); });
  var source = function (v) { return v.getAttribute('data-src') || v.getAttribute(petitEcran ? 'data-src-petit' : 'data-src-grand'); };
  function lire(v) {
    if (!v || v.enPause) return;
    if (!v.getAttribute('src')) { v.src = source(v); v.load(); }
    else if (!v.paused) return;
    var p = v.play(); if (p && p.catch) p.catch(function () {});
  }
  function arreter(v) { if (v && !v.paused) v.pause(); }
  $$('video').forEach(function (v) { v.enPause = !autoLecture; });

  // Boutons pause : chacun commande les vidéos de sa section
  $$('[data-pause]').forEach(function (b) {
    var cibles = $$(b.getAttribute('data-pause'));
    var maj = function () {
      var arret = cibles.length && cibles[0].enPause;
      b.setAttribute('aria-pressed', String(!!arret));
      b.querySelector('.sr').textContent = arret ? (cibles.length > 1 ? 'Lire les vidéos' : 'Lire la vidéo') : (cibles.length > 1 ? 'Mettre les vidéos en pause' : 'Mettre la vidéo en pause');
    };
    maj();
    b.addEventListener('click', function () {
      var reprendre = cibles[0].enPause;
      cibles.forEach(function (v) {
        v.enPause = !reprendre;
        if (reprendre) { if (v.visible !== false) lire(v); } else arreter(v);
      });
      maj();
    });
  });

  var heros = $('[data-video]');
  if (heros) {
    heros.addEventListener('playing', function () { heros.classList.add('est-pret'); });
    lire(heros);
  }

  /* En-tête : plein hors de l'arrivée, se retire quand on descend ------------------- */
  var entete = $('[data-entete]');
  var une = $('[data-une]');
  var burger = $('.burger'), nav = $('#nav');
  var menuOuvert = false;
  if (burger && nav) {
    var menu = function (o) { menuOuvert = o; burger.setAttribute('aria-expanded', String(o)); if (o) { nav.setAttribute('data-ouvert', ''); entete.classList.add('est-plein'); entete.classList.remove('est-cache'); } else nav.removeAttribute('data-ouvert'); };
    burger.addEventListener('click', function () { menu(burger.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) menu(false); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuOuvert) { menu(false); burger.focus(); } });
  }
  var dernierY = window.scrollY;
  function majEntete() {
    if (!entete) return;
    var y = window.scrollY;
    var basUne = une ? une.offsetTop + une.offsetHeight - 90 : 200;
    entete.classList.toggle('est-plein', y > basUne || menuOuvert);
    var focus = doc.activeElement;
    if (!menuOuvert && !(focus && focus.closest && focus.closest('.entete'))) {
      if (y > basUne && y > dernierY + 6) entete.classList.add('est-cache');
      else if (y < dernierY - 6 || y <= basUne) entete.classList.remove('est-cache');
    }
    dernierY = y;
  }
  if (entete) entete.addEventListener('focusin', function () { entete.classList.remove('est-cache'); });

  /* L'arrivée : la vidéo s'éloigne quand on descend -------------------------------- */
  var uneMedia = $('[data-une-media]'), uneTexte = $('[data-une-texte]');
  function majUne() {
    if (!une || reduit) return;
    var r = une.getBoundingClientRect();
    if (r.bottom < 0) return;
    var p = clamp(-r.top / r.height, 0, 1);
    uneMedia.style.transform = 'translate3d(0,' + (p * 22).toFixed(2) + '%,0) scale(' + (1 + p * 0.1).toFixed(4) + ')';
    uneTexte.style.transform = 'translate3d(0,' + (-p * 90).toFixed(1) + 'px,0)';
    uneTexte.style.opacity = String(clamp(1 - p * 1.8, 0, 1));
  }

  /* Traversez l'hôtel : on passe d'une ouverture à l'autre -------------------------- */
  var FORMES = {
    fenetre: { a: 0.72, o: [0.75, 0.5], r: [0, 0, 1, 1], lx: [0.5], ly: [1 / 3, 2 / 3], vb: '0 0 72 100', svg: '<rect width="72" height="100"/>' },
    oculus: { a: 1, o: [0.5, 0.5], cercle: true, vb: '0 0 100 100', svg: '<circle cx="50" cy="50" r="50"/>' },
    arche: { a: 0.625, o: [0.5, 0.66], r: [0, 0.3125, 1, 1], vb: '0 0 100 160', svg: '<path d="M0 160V50A50 50 0 0 1 100 50V160Z"/>' },
    porte: { a: 100 / 190, o: [0.75, 0.62], r: [0, 45 / 190, 1, 1], lx: [0.5], vb: '0 0 100 190', svg: '<path d="M0 190V45Q0 0 50 0Q100 0 100 45V190Z"/>' }
  };
  var trav = $('[data-traverse]');
  var T = null;
  var masqueOk = window.CSS && CSS.supports && (CSS.supports('mask-composite', 'exclude') || CSS.supports('-webkit-mask-composite', 'xor'));
  if (trav && !reduit && masqueOk) {
    var scenes = $$('.scene', trav).map(function (el) {
      var f = FORMES[el.getAttribute('data-forme')] || null;
      var s = { el: el, media: $('.scene__media', el), cadre: $('.scene__cadre', el), leg: $('.scene__legende', el), video: $('video', el), forme: f };
      if (f) {
        var url = 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + f.vb + '" preserveAspectRatio="none">' + f.svg + '</svg>') + '")';
        var m = s.media.style;
        m.webkitMaskImage = m.maskImage = 'linear-gradient(#000, #000), ' + url;
        m.webkitMaskRepeat = m.maskRepeat = 'no-repeat';
        s.media.classList.add('a-ouverture');
      }
      if (s.video) s.video.visible = false;
      return s;
    });
    T = { scenes: scenes, n: scenes.length, fil: $$('.traverse__fil li', trav), aide: $('.traverse__aide', trav), dernier: -1 };
    trav.classList.add('est-zoom');
    trav.style.setProperty('--hauteur', (100 + (scenes.length - 1) * 115 + 40) + 'vh');
  }
  function geometrie(f) {
    var mobile = vw < 900;
    var h = Math.min(mobile ? 0.42 * vh : 0.6 * vh, (mobile ? 0.8 * vw : 0.4 * vw) / f.a);
    var w = h * f.a;
    var cx = mobile ? vw / 2 : Math.min(0.68 * vw, vw - w / 2 - 0.08 * vw), cy = mobile ? 0.4 * vh : 0.5 * vh;
    var g = { x: cx - w / 2, y: cy - h / 2, w: w, h: h, cx: cx, cy: cy };
    g.ox = g.x + f.o[0] * w; g.oy = g.y + f.o[1] * h;
    var S = 1;
    if (f.cercle) {
      S = Math.max(Math.hypot(g.ox, g.oy), Math.hypot(vw - g.ox, g.oy), Math.hypot(g.ox, vh - g.oy), Math.hypot(vw - g.ox, vh - g.oy)) / (w / 2);
    } else {
      var l = g.x + f.r[0] * w, t = g.y + f.r[1] * h, r = g.x + f.r[2] * w, b = g.y + f.r[3] * h;
      S = Math.max(g.ox / (g.ox - l), (vw - g.ox) / (r - g.ox), g.oy / (g.oy - t), (vh - g.oy) / (b - g.oy));
      (f.lx || []).forEach(function (fx) { var X = g.x + fx * w, d = Math.abs(X - g.ox); if (d > 0) S = Math.max(S, (X < g.ox ? g.ox : vw - g.ox) / d); });
      (f.ly || []).forEach(function (fy) { var Y = g.y + fy * h, d = Math.abs(Y - g.oy); if (d > 0) S = Math.max(S, (Y < g.oy ? g.oy : vh - g.oy) / d); });
    }
    g.S = S * 1.06;
    return g;
  }
  function mesurerTraverse() {
    if (!T) return;
    T.scenes.forEach(function (s) { if (s.forme) s.g = geometrie(s.forme); });
  }
  mesurerTraverse();

  // Les vidéos se chargent à l'approche et s'arrêtent hors de l'écran
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        var v = e.target;
        v.visible = e.isIntersecting;
        if (e.isIntersecting) lire(v); else arreter(v);
      });
    }, { rootMargin: '200px 0px' });
    $$('[data-video], [data-video-lazy]').forEach(function (v) { io.observe(v); });
    if (!T) $$('[data-video-scene]').forEach(function (v) { io.observe(v); });
  }
  function poserTrou(s, o, z) {
    var g = s.g, sh = Math.pow(g.S, z), sm = Math.pow(sh, 0.3);
    // Le trou à l'écran : il s'ouvre depuis son centre, puis grandit autour du point visé
    var w = g.w * o * sh, h = g.h * o * sh;
    var x = o < 1 ? g.cx - w / 2 : g.ox + (g.x - g.ox) * sh;
    var y = o < 1 ? g.cy - h / 2 : g.oy + (g.y - g.oy) * sh;
    s.media.style.transformOrigin = g.ox + 'px ' + g.oy + 'px';
    s.media.style.transform = sm > 1.0005 ? 'scale(' + sm.toFixed(4) + ')' : '';
    // Le masque est posé dans le repère de l'élément, avant sa mise à l'échelle
    var lx = g.ox + (x - g.ox) / sm, ly = g.oy + (y - g.oy) / sm;
    var taille = '100% 100%, ' + (w / sm).toFixed(1) + 'px ' + (h / sm).toFixed(1) + 'px';
    var pos = '0 0, ' + lx.toFixed(1) + 'px ' + ly.toFixed(1) + 'px';
    s.media.style.webkitMaskSize = s.media.style.maskSize = taille;
    s.media.style.webkitMaskPosition = s.media.style.maskPosition = pos;
    var c = s.cadre.style;
    c.width = w.toFixed(1) + 'px'; c.height = h.toFixed(1) + 'px';
    c.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
    c.opacity = String(o < 1 ? o : clamp(1 - (z - 0.8) / 0.2, 0, 1));
  }
  function fermerTrou(s) {
    if (!s.forme) return;
    s.media.style.webkitMaskSize = s.media.style.maskSize = '100% 100%, 0px 0px';
    s.cadre.style.opacity = '0';
  }
  function majTraverse() {
    if (!T) return;
    var r = trav.getBoundingClientRect();
    var enVue = r.top < vh && r.bottom > 0;
    var course = r.height - vh;
    var P = clamp(-r.top / course, 0, 1) * (T.n - 1 + 0.3);
    P = Math.min(P, T.n - 1);
    var k = Math.min(Math.floor(P), T.n - 1), t = P - k;
    var o = k < T.n - 1 ? sortie((t - 0.1) / 0.3) : 0;
    var z = k < T.n - 1 ? lisse((t - 0.46) / 0.54) : 0;
    T.scenes.forEach(function (s, i) {
      var visible = i === k || (i === k + 1 && t > 0.06);
      s.el.classList.toggle('est-visible', visible);
      s.el.style.zIndex = String(T.n - i);
      if (s.video) {
        if (P > i - 1.6 && !s.video.getAttribute('src') && autoLecture) { s.video.src = source(s.video); s.video.preload = 'auto'; }
        s.video.visible = visible && enVue;
        if (s.video.visible) lire(s.video); else arreter(s.video);
      }
      if (i === k) {
        if (s.forme) { if (o > 0) poserTrou(s, o, z); else { fermerTrou(s); s.media.style.transform = ''; } }
        s.leg.style.opacity = String(clamp(1 - z / 0.3, 0, 1));
        s.leg.style.transform = 'translate3d(0,' + (-z * 40).toFixed(1) + 'px,0)';
      } else if (i === k + 1) {
        var sc = 1 + 0.28 * (1 - lisse(z));
        var g = T.scenes[k].g;
        if (g) s.media.style.transformOrigin = g.ox + 'px ' + g.oy + 'px';
        s.media.style.transform = 'scale(' + sc.toFixed(4) + ')';
        fermerTrou(s);
        var op = clamp((z - 0.72) / 0.28, 0, 1);
        s.leg.style.opacity = String(op);
        s.leg.style.transform = 'translate3d(0,' + ((1 - op) * 28).toFixed(1) + 'px,0)';
      } else {
        s.leg.style.opacity = '0';
      }
    });
    var actif = z > 0.5 ? k + 1 : k;
    if (actif !== T.dernier) { T.fil.forEach(function (li, i) { li.classList.toggle('est-actif', i === actif); }); T.dernier = actif; }
    if (T.aide) T.aide.style.opacity = P < 0.12 ? '1' : '0';
  }

  /* La maison : les mots s'allument à la lecture ------------------------------------ */
  function majRecit() {
    if (!motsRecit.length) return;
    var r = recit.getBoundingClientRect();
    if (r.top > vh || r.bottom < 0) return;
    var p = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.3), 0, 1);
    var n = Math.round(p * motsRecit.length);
    motsRecit.forEach(function (m, i) { m.classList.toggle('est-allume', i < n); });
  }

  /* Les chambres : l'aperçu qui suit le pointeur et les fiches ------------------------ */
  var liste = $('[data-chambres]');
  var apercu = $('[data-apercu-flottant]');
  if (liste && apercu && pointeurFin) {
    var imgA = apercu.querySelector('img');
    var cx = 0, cy = 0, ax = 0, ay = 0, anime = false, dedans = false;
    $$('.chambre', liste).forEach(function (li) {
      var pre = new Image(); pre.src = li.getAttribute('data-apercu');
      li.addEventListener('pointerenter', function (e) {
        if (e.pointerType !== 'mouse') return;
        imgA.src = li.getAttribute('data-apercu');
        if (!dedans) { ax = e.clientX; ay = e.clientY; }
        dedans = true;
        apercu.classList.add('est-visible');
        boucleApercu();
      });
    });
    liste.addEventListener('pointermove', function (e) { cx = e.clientX; cy = e.clientY; });
    liste.addEventListener('pointerleave', function () { dedans = false; apercu.classList.remove('est-visible'); });
    var boucleApercu = function () {
      if (anime) return; anime = true;
      var pas = function () {
        var k = reduit ? 1 : 0.16;
        ax += (cx - ax) * k; ay += (cy - ay) * k;
        var w = apercu.offsetWidth, h = apercu.offsetHeight;
        var x = clamp(ax + 36, 12, vw - w - 12), y = clamp(ay - h / 2, 12, vh - h - 12);
        apercu.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + clamp((cx - ax) * 0.04, -4, 4).toFixed(2) + 'deg)';
        if (dedans || Math.abs(cx - ax) > 0.5) requestAnimationFrame(pas); else anime = false;
      };
      requestAnimationFrame(pas);
    };
  }
  function ouvrirFiche(d, ouvreur) {
    if (!d || typeof d.showModal !== 'function') return;
    d.ouvreur = ouvreur;
    d.showModal();
    var fermer = d.querySelector('.fiche__fermer'); if (fermer) fermer.focus();
    root.classList.add('a-fiche');
    requestAnimationFrame(function () { requestAnimationFrame(function () { d.classList.add('est-ouvert'); }); });
  }
  function fermerFiche(d, ensuite) {
    if (!d.open) return;
    d.classList.remove('est-ouvert');
    setTimeout(function () {
      d.close(); root.classList.remove('a-fiche');
      if (ensuite) ensuite(); else if (d.ouvreur) d.ouvreur.focus({ preventScroll: true });
    }, reduit ? 200 : 480);
  }
  $$('[data-fiche]').forEach(function (b) {
    b.addEventListener('click', function () { ouvrirFiche(doc.getElementById(b.getAttribute('data-fiche')), b); });
  });
  $$('dialog.fiche').forEach(function (d) {
    d.addEventListener('cancel', function (e) { e.preventDefault(); fermerFiche(d); });
    d.addEventListener('click', function (e) { if (e.target === d) fermerFiche(d); });
    $$('[data-fermer]', d).forEach(function (b) { b.addEventListener('click', function () { fermerFiche(d); }); });
    $$('[data-choisir]', d).forEach(function (b) {
      b.addEventListener('click', function () {
        var ch = b.getAttribute('data-choisir');
        fermerFiche(d, function () {
          if (R) R.choisirChambre(ch);
          var cible = doc.getElementById('reserver');
          if (cible) cible.scrollIntoView({ behavior: reduit ? 'auto' : 'smooth' });
          var sel = $('[data-resa-chambre]'); if (sel) setTimeout(function () { sel.focus({ preventScroll: true }); }, reduit ? 0 : 700);
        });
      });
    });
  });

  /* Le bassin : la vidéo s'ouvre jusqu'aux bords ------------------------------------- */
  var bassin = $('[data-bassin]');
  var cadreB = $('[data-bassin-cadre]');
  var sceneB = bassin ? $('.bassin__scene', bassin) : null;
  function majBassin() {
    if (!sceneB) return;
    if (reduit) { sceneB.style.setProperty('--to', '1'); return; }
    var r = sceneB.getBoundingClientRect();
    if (r.top > vh || r.bottom < 0) return;
    var q = clamp(1 - r.top / vh, 0, 1), e = sortie(q);
    var mobile = vw < 700;
    var it = (1 - e) * (mobile ? 0.14 : 0.16) * vh, il = (1 - e) * (mobile ? 0.06 : 0.24) * vw;
    sceneB.style.setProperty('--it', it.toFixed(1) + 'px');
    sceneB.style.setProperty('--il', il.toFixed(1) + 'px');
    sceneB.style.setProperty('--ir', ((1 - e) * 22).toFixed(1) + 'px');
    sceneB.style.setProperty('--vs', (1.22 - 0.22 * e).toFixed(4));
    sceneB.style.setProperty('--to', clamp((q - 0.7) / 0.3, 0, 1).toFixed(3));
  }

  /* Le spa : du plus chaud au plus froid --------------------------------------------- */
  var thermes = $('[data-thermes]');
  var TH = null;
  if (thermes && !reduit) {
    thermes.classList.add('est-actif');
    TH = {
      spa: thermes.closest('.spa'),
      etapes: $$('.etape', thermes),
      photos: $$('[data-photo]', thermes),
      degres: $('[data-degres]', thermes),
      mercure: $('[data-mercure]', thermes),
      vapeur: $('[data-vapeur]', thermes),
      dernier: -1
    };
    TH.temps = TH.etapes.map(function (e) { return +e.getAttribute('data-temp'); });
    if (TH.vapeur) TH.vapeur.enPause = !autoLecture;
  }
  var TEINTES = [[85, [60, 34, 25]], [46, [50, 36, 37]], [38, [31, 42, 40]], [31, [21, 41, 46]], [9, [15, 31, 43]]];
  function teinte(t) {
    for (var i = 0; i < TEINTES.length - 1; i++) {
      var a = TEINTES[i], b = TEINTES[i + 1];
      if (t <= a[0] && t >= b[0]) { var u = (a[0] - t) / (a[0] - b[0]); return 'rgb(' + a[1].map(function (c, j) { return Math.round(lerp(c, b[1][j], u)); }).join(' ') + ')'; }
    }
    return t > 85 ? 'rgb(60 34 25)' : 'rgb(15 31 43)';
  }
  function majThermes() {
    if (!TH) return;
    var r = TH.spa.getBoundingClientRect();
    if (r.top > vh || r.bottom < 0) { if (TH.vapeur) arreter(TH.vapeur); return; }
    var c = vw < 900 ? vh * 0.72 : vh * 0.5, centres = TH.etapes.map(function (e) { var b = e.getBoundingClientRect(); return b.top + b.height / 2; });
    var P = 0;
    if (c <= centres[0]) P = 0;
    else if (c >= centres[centres.length - 1]) P = centres.length - 1;
    else for (var i = 0; i < centres.length - 1; i++) if (c >= centres[i] && c < centres[i + 1]) { P = i + (c - centres[i]) / (centres[i + 1] - centres[i]); break; }
    var k = Math.min(Math.floor(P), TH.temps.length - 2), u = P - k;
    var temp = lerp(TH.temps[k], TH.temps[k + 1], lisse((u - 0.2) / 0.6));
    TH.degres.textContent = String(Math.round(temp));
    TH.mercure.style.transform = 'scaleY(' + (clamp(temp, 0, 90) / 90).toFixed(4) + ')';
    TH.spa.style.setProperty('--fond', teinte(temp));
    TH.photos.forEach(function (img, i) {
      var d = Math.abs(P - i), op = clamp(1 - d * 1.35, 0, 1);
      img.style.opacity = op.toFixed(3);
      img.style.transform = 'scale(' + (1 + 0.07 * (1 - op)).toFixed(4) + ')';
    });
    if (TH.vapeur) {
      var vo = clamp(1 - P / 1.6, 0, 1) * 0.45;
      TH.vapeur.style.opacity = vo.toFixed(3);
      TH.vapeur.visible = vo > 0.02;
      if (TH.vapeur.visible) lire(TH.vapeur); else arreter(TH.vapeur);
    }
    var actif = Math.round(P);
    if (actif !== TH.dernier) { TH.etapes.forEach(function (e, i) { e.classList.toggle('est-actif', i === actif); }); TH.dernier = actif; }
  }

  /* Le menu : le fil descend, les plats sont servis ----------------------------------- */
  var menuPlats = $('[data-menu]');
  var plats = menuPlats ? $$('li', menuPlats) : [];
  if (reduit) plats.forEach(function (p) { p.classList.add('est-servi'); });
  function majMenu() {
    if (!menuPlats || reduit) return;
    var r = menuPlats.getBoundingClientRect();
    if (r.top > vh || r.bottom < -vh) return;
    var ligne = vh * 0.62;
    menuPlats.style.setProperty('--fil', clamp((ligne - r.top) / r.height, 0, 1).toFixed(4));
    plats.forEach(function (p) { var b = p.getBoundingClientRect(); p.classList.toggle('est-servi', b.top + 20 < ligne); });
  }

  /* La carte : les routes se tracent, la liste éclaire les lieux --------------------- */
  var carte = $('[data-carte]');
  if (carte) {
    var svgC = $('[data-carte-svg]', carte);
    var etiq = $$('.carte__lieu', carte);
    var vbGrand = '0 20 360 160', vbPetit = '95 30 190 125';
    var placer = function () {
      var vb = (vw < 700 ? vbPetit : vbGrand).split(' ').map(Number);
      svgC.setAttribute('viewBox', vb.join(' '));
      etiq.forEach(function (el) {
        var x = +el.getAttribute('data-x'), y = +el.getAttribute('data-y');
        var dehors = x < vb[0] + 2 || x > vb[0] + vb[2] - 2 || y < vb[1] || y > vb[1] + vb[3];
        el.hidden = dehors;
        el.style.left = ((x - vb[0]) / vb[2] * 100).toFixed(2) + '%';
        el.style.top = ((y - vb[1]) / vb[3] * 100).toFixed(2) + '%';
      });
    };
    placer();
    carte.placer = placer;
    if (reduit || !('IntersectionObserver' in window)) carte.classList.add('est-trace');
    else new IntersectionObserver(function (e, o) { if (e[0].isIntersecting) { carte.classList.add('est-trace'); o.disconnect(); } }, { threshold: 0.35 }).observe(carte);
    var eclairer = function (li) {
      var lieu = li ? li.getAttribute('data-lieu') : null, route = li ? li.getAttribute('data-route') : null;
      carte.classList.toggle('a-un-lieu', !!li);
      $$('[data-route]', svgC).forEach(function (p) { p.classList.toggle('est-allume', p.getAttribute('data-route') === route); });
      $$('[data-point]', svgC).forEach(function (p) { p.classList.toggle('est-allume', p.getAttribute('data-point') === lieu); });
      etiq.forEach(function (el) { el.classList.toggle('est-allume', el.getAttribute('data-lieu') === lieu); });
    };
    $$('[data-carte-liste] li', carte).forEach(function (li) {
      li.addEventListener('pointerenter', function () { eclairer(li); });
      li.addEventListener('pointerleave', function () { eclairer(null); });
    });
  }

  /* Réserver : calendrier, prix par nuit, demande par e-mail -------------------------- */
  var R = null;
  var resa = $('[data-resa]');
  if (resa) R = (function () {
    var CH = {
      sapin: { nom: 'Chambre Sapin', base: 290, max: 2 },
      lac: { nom: 'Chambre Lac', base: 360, max: 2 },
      chaume: { nom: 'Suite Chaume', base: 520, max: 3 },
      hohneck: { nom: 'Suite Hohneck', base: 840, max: 4 }
    };
    var ORDRE = ['sapin', 'lac', 'chaume', 'hohneck'];
    var selCh = $('[data-resa-chambre]', resa), selP = $('[data-resa-personnes]', resa);
    var boite = $('[data-calendrier]', resa);
    var recapTexte = $('[data-recap-texte]', resa), recapTotal = $('[data-recap-total]', resa), envoyer = $('[data-recap-envoyer]', resa);
    var n = paris();
    var auj = Math.floor(Date.UTC(n.a, n.m - 1, n.j) / 86400000);
    var st = { ch: selCh.value, pers: 2, arr: null, dep: null, survol: null, decalage: 0 };
    var DECAL_MAX = 10;
    var date = function (j) { var d = new Date(j * 86400000); return { a: d.getUTCFullYear(), m: d.getUTCMonth() + 1, j: d.getUTCDate(), js: d.getUTCDay() }; };
    var jourDe = function (a, m, j) { return Math.floor(Date.UTC(a, m - 1, j) / 86400000); };
    var fmt = function (j, annee) { var d = date(j); return JOURS[d.js] + ' ' + (d.j === 1 ? '1er' : d.j) + ' ' + MOIS[d.m - 1] + (annee ? ' ' + d.a : ''); };
    var euros = function (v) { return Math.round(v).toLocaleString('fr-FR') + NB + '€'; };
    function prix(j, ch) {
      var d = date(j), md = d.m * 100 + d.j, f = 1;
      if (md >= 1219 || md <= 103) f = 1.35;
      else if (md >= 206 && md <= 308) f = 1.22;
      else if (md >= 710 && md <= 825) f = 1.18;
      else if (md >= 1103 && md <= 1215) f = 0.88;
      else if (md >= 404 && md <= 430) f = 0.94;
      if (d.js === 5 || d.js === 6) f *= 1.14;
      return Math.round(CH[ch].base * f / 5) * 5;
    }
    function complet(j, ch) {
      var h = (j * 2654435761 + ORDRE.indexOf(ch) * 40503) >>> 0;
      h = ((h ^ (h >>> 15)) * 2246822519) >>> 0;
      var d = date(j), seuil = (d.js === 5 || d.js === 6) ? 34 : 11;
      return (h % 100) < seuil;
    }
    function libre(a, b, ch) { for (var j = a; j < b; j++) if (complet(j, ch)) return false; return true; }
    function personnes() {
      var max = CH[st.ch].max;
      st.pers = Math.min(st.pers, max);
      var h = '';
      for (var i = 1; i <= max; i++) h += '<option value="' + i + '"' + (i === st.pers ? ' selected' : '') + '>' + i + ' adulte' + (i > 1 ? 's' : '') + '</option>';
      selP.innerHTML = h;
    }
    var FLECHE_G = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M10 3L5 8l5 5"/></svg>';
    var FLECHE_D = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M6 3l5 5-5 5"/></svg>';
    var JSEM = ['lu', 'ma', 'me', 'je', 've', 'sa', 'di'];
    function nbMois() { return vw < 1200 ? 1 : 2; }
    function etatJour(j) {
      var dispo = j >= auj && !complet(j, st.ch);
      // Le jour du départ peut être complet : on ne dort pas cette nuit-là
      if (!dispo && j > auj && st.arr !== null && st.dep === null && j > st.arr && libre(st.arr, j, st.ch)) dispo = true;
      return dispo;
    }
    function rendre(garderFocus) {
      var focusJ = garderFocus && doc.activeElement && doc.activeElement.getAttribute('data-j');
      var h = '<div class="cal"><div class="cal__nav"><button class="cal__fleche" type="button" data-cal-prec' + (st.decalage <= 0 ? ' disabled' : '') + '><span class="sr">Mois précédent</span>' + FLECHE_G + '</button>';
      h += '<p class="cal__legende"><span><i class="l-sejour"></i>Votre séjour</span><span><i class="l-complet"></i>Complet</span></p>';
      h += '<button class="cal__fleche" type="button" data-cal-suiv' + (st.decalage >= DECAL_MAX ? ' disabled' : '') + '><span class="sr">Mois suivant</span>' + FLECHE_D + '</button></div><div class="cal__mois-liste">';
      for (var k = 0; k < nbMois(); k++) {
        var mm = n.m - 1 + st.decalage + k, a = n.a + Math.floor(mm / 12), m = (mm % 12) + 1;
        var premier = jourDe(a, m, 1), nbj = new Date(Date.UTC(a, m, 0)).getUTCDate();
        var dec = (date(premier).js + 6) % 7;
        var titreM = MOIS[m - 1] + ' ' + a;
        h += '<div class="cal__mois"><h3>' + titreM.charAt(0).toUpperCase() + titreM.slice(1) + '</h3><div class="cal__grille" role="group" aria-label="' + titreM + '">';
        JSEM.forEach(function (s) { h += '<span class="cal__jsem" aria-hidden="true">' + s + '</span>'; });
        for (var v = 0; v < dec; v++) h += '<span class="cal__vide"></span>';
        for (var d = 1; d <= nbj; d++) {
          var j = premier + d - 1, passe = j < auj, plein = !passe && complet(j, st.ch), dispo = etatJour(j);
          var cls = 'cal__jour', etiquette = fmt(j);
          if (plein) cls += ' est-complet';
          if (j === auj) cls += ' est-aujourdhui';
          if (j === st.arr) { cls += ' est-debut'; etiquette += ', arrivée'; }
          else if (j === st.dep) { cls += ' est-fin'; etiquette += ', départ'; }
          else if (st.arr !== null && st.dep !== null && j > st.arr && j < st.dep) { cls += ' est-dans'; etiquette += ', dans votre séjour'; }
          var px = passe || j === st.dep ? '' : (plein ? 'complet' : String(prix(j, st.ch)));
          if (!passe) etiquette += plein ? (dispo ? ', complet ce soir, possible en départ' : ', complet') : ', ' + prix(j, st.ch) + ' euros la nuit';
          h += '<button type="button" class="' + cls + '" data-j="' + j + '"' + (dispo ? '' : ' disabled') + ' aria-label="' + etiquette + '"><span class="cal__num" aria-hidden="true">' + d + '</span><span class="cal__prix" aria-hidden="true">' + px + '</span></button>';
        }
        h += '</div></div>';
      }
      h += '</div></div>';
      boite.innerHTML = h;
      if (focusJ) { var b = boite.querySelector('[data-j="' + focusJ + '"]'); if (b && !b.disabled) b.focus(); }
      recap();
    }
    function apercuSurvol() {
      $$('.cal__jour', boite).forEach(function (b) {
        var j = +b.getAttribute('data-j');
        b.classList.toggle('est-apercu', st.arr !== null && st.dep === null && st.survol !== null && j > st.arr && j <= st.survol);
      });
    }
    function recap() {
      var ch = CH[st.ch];
      if (st.arr === null) {
        recapTexte.textContent = 'Choisissez le jour de votre arrivée dans le calendrier.';
        recapTotal.hidden = true; envoyer.setAttribute('aria-disabled', 'true'); envoyer.href = 'mailto:reservation@felsenmatt.example';
        return;
      }
      if (st.dep === null) {
        recapTexte.innerHTML = 'Arrivée le <strong>' + fmt(st.arr) + '</strong> en ' + ch.nom + '. Choisissez maintenant le jour du départ.';
        recapTotal.hidden = true; envoyer.setAttribute('aria-disabled', 'true');
        return;
      }
      var nuits = st.dep - st.arr, total = 0;
      for (var j = st.arr; j < st.dep; j++) total += prix(j, st.ch);
      total += Math.max(0, st.pers - 2) * 60 * nuits;
      var da = date(st.arr), dd = date(st.dep);
      var du = da.m === dd.m && da.a === dd.a ? JOURS[da.js] + ' ' + (da.j === 1 ? '1er' : da.j) : fmt(st.arr, da.a !== dd.a);
      recapTexte.innerHTML = '<strong>' + nuits + ' nuit' + (nuits > 1 ? 's' : '') + '</strong> en ' + ch.nom + ', du ' + du + ' au ' + fmt(st.dep, true) + ', pour ' + st.pers + ' adulte' + (st.pers > 1 ? 's' : '') + '.';
      recapTotal.innerHTML = euros(total) + '<small>soit ' + euros(total / nuits) + ' la nuit en moyenne' + (st.pers > 2 ? ', personne' + (st.pers > 3 ? 's' : '') + ' en plus comprise' + (st.pers > 3 ? 's' : '') : '') + '. Petit-déjeuner et spa compris, taxe de séjour en sus.</small>';
      recapTotal.hidden = false;
      var sujet = 'Demande de réservation : ' + ch.nom + ', du ' + da.j + ' ' + MOIS[da.m - 1] + ' au ' + dd.j + ' ' + MOIS[dd.m - 1] + ' ' + dd.a;
      var corps = 'Bonjour,\n\nJe souhaite réserver la ' + ch.nom + ' du ' + fmt(st.arr, true) + ' au ' + fmt(st.dep, true) + ' (' + nuits + ' nuit' + (nuits > 1 ? 's' : '') + '), pour ' + st.pers + ' adulte' + (st.pers > 1 ? 's' : '') + '.\nMontant indiqué sur le site : ' + Math.round(total) + ' euros, petit-déjeuner et spa compris.\n\nNom :\nTéléphone :\nHeure d’arrivée prévue :\n\nMerci,\n';
      envoyer.href = 'mailto:reservation@felsenmatt.example?subject=' + encodeURIComponent(sujet) + '&body=' + encodeURIComponent(corps);
      envoyer.setAttribute('aria-disabled', 'false');
    }
    boite.addEventListener('click', function (e) {
      var fl = e.target.closest('[data-cal-prec], [data-cal-suiv]');
      if (fl) {
        var versAvant = fl.hasAttribute('data-cal-suiv');
        st.decalage = clamp(st.decalage + (versAvant ? 1 : -1), 0, DECAL_MAX);
        rendre();
        var cible = boite.querySelector(versAvant ? '[data-cal-suiv]' : '[data-cal-prec]');
        if (cible.disabled) cible = boite.querySelector(versAvant ? '[data-cal-prec]' : '[data-cal-suiv]');
        cible.focus();
        return;
      }
      var b = e.target.closest('[data-j]');
      if (!b || b.disabled) return;
      var j = +b.getAttribute('data-j');
      if (st.arr === null || st.dep !== null || j <= st.arr) {
        if (complet(j, st.ch)) return;
        st.arr = j; st.dep = null;
        dire('Arrivée le ' + fmt(j) + '. Choisissez le jour du départ.');
      } else if (!libre(st.arr, j, st.ch)) {
        st.arr = complet(j, st.ch) ? null : j; st.dep = null;
        dire('Une nuit est complète entre ces dates. ' + (st.arr !== null ? 'Nouvelle arrivée le ' + fmt(j) + '.' : 'Choisissez une autre arrivée.'));
      } else if (j - st.arr > 21) {
        dire('Pour un séjour de plus de trois semaines, appelez la réception.');
        return;
      } else {
        st.dep = j;
        dire('Départ le ' + fmt(j) + '. ' + (j - st.arr) + ' nuits sélectionnées.');
      }
      st.survol = null;
      rendre(true);
    });
    boite.addEventListener('pointerover', function (e) {
      var b = e.target.closest('[data-j]');
      st.survol = b && !b.disabled ? +b.getAttribute('data-j') : null;
      apercuSurvol();
    });
    boite.addEventListener('pointerleave', function () { st.survol = null; apercuSurvol(); });
    selCh.addEventListener('change', function () {
      st.ch = selCh.value;
      if (st.arr !== null && complet(st.arr, st.ch)) { st.arr = null; st.dep = null; }
      if (st.dep !== null && !libre(st.arr, st.dep, st.ch)) st.dep = null;
      personnes(); rendre();
      dire(CH[st.ch].nom + ' : les prix du calendrier sont à jour.');
    });
    selP.addEventListener('change', function () { st.pers = +selP.value; recap(); });
    personnes();
    rendre();
    var mois = nbMois();
    return {
      choisirChambre: function (ch) { if (!CH[ch]) return; selCh.value = ch; selCh.dispatchEvent(new Event('change')); },
      redimensionner: function () { if (nbMois() !== mois) { mois = nbMois(); rendre(); } }
    };
  })();

  /* Une seule boucle pour tout ce qui suit le défilement ------------------------------- */
  var prevu = false;
  function maj() {
    prevu = false;
    majEntete(); majUne(); majTraverse(); majRecit(); majBassin(); majThermes(); majMenu();
  }
  function planifier() { if (!prevu) { prevu = true; requestAnimationFrame(maj); } }
  window.addEventListener('scroll', planifier, { passive: true });
  var largeur = vw;
  window.addEventListener('resize', function () {
    vw = window.innerWidth; vh = window.innerHeight;
    mesurerTraverse();
    if (carte && carte.placer && vw !== largeur) carte.placer();
    if (R) R.redimensionner();
    largeur = vw;
    planifier();
  });
  maj();

  /* Avis : ancienneté en clair (« il y a 3 semaines »), à partir de « data-jours » (exemples) ou de « datetime » */
  (function () {
    var rtf = window.Intl && Intl.RelativeTimeFormat ? new Intl.RelativeTimeFormat('fr', { numeric: 'auto' }) : null;
    $$('.avis time').forEach(function (el) {
      var j = el.getAttribute('data-jours');
      var d = j !== null ? new Date(Date.now() - parseFloat(j) * 864e5) : new Date(el.getAttribute('datetime'));
      if (isNaN(d)) return;
      el.setAttribute('datetime', d.toISOString().slice(0, 10));
      if (el.hasAttribute('data-mois')) { el.textContent = d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }); return; }
      var n = Math.round((Date.now() - d) / 864e5);
      el.textContent = !rtf ? d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : n < 7 ? rtf.format(-n, 'day') : n < 30 ? rtf.format(-Math.round(n / 7), 'week') : n < 365 ? rtf.format(-Math.max(1, Math.round(n / 30.4)), 'month') : rtf.format(-Math.round(n / 365), 'year');
    });
  })();

  /* Avis : un à la fois. Choix par le nom (ou « suivant ») ; défilement toutes les 7 s quand la section est à l'écran,
     jamais avec le mouvement réduit ; arrêté au survol, quand le focus est dans la section et par le bouton Pause.
     Sans JavaScript, tous les avis restent affichés les uns sous les autres. */
  (function () {
    var sec = $('[data-avis]');
    if (!sec) return;
    var items = $$('[data-avis-item]', sec), choix = $$('[data-avis-choix]', sec), pause = $('[data-avis-pause]', sec), num = $('[data-avis-num]', sec);
    var cmd = $('[data-avis-commandes]', sec);
    if (items.length < 2) return;
    var DUREE = 7000, i = 0, minuteur = null, visible = false, arret = reduit, retenu = false;
    sec.classList.add('avis--js');
    if (cmd) cmd.hidden = false;
    if (pause && reduit) pause.hidden = true;
    sec.style.setProperty('--avis-duree', DUREE + 'ms');
    var pret = false;
    function montrer(n) {
      var avant = i;
      i = (n + items.length) % items.length;
      // L'avis qui vient d'être quitté porte « data-sort » le temps de son animation de sortie
      items.forEach(function (it) { it.removeAttribute('data-sort'); });
      if (pret && avant !== i) { void items[avant].offsetWidth; items[avant].setAttribute('data-sort', ''); }
      pret = true;
      items.forEach(function (it, k) {
        var pos = (k - i + items.length) % items.length;
        it.setAttribute('data-pos', pos);
        it.inert = pos !== 0;
      });
      choix.forEach(function (b, k) { b.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
      if (num) num.textContent = i + 1;
      relancer();
    }
    function relancer() {
      clearTimeout(minuteur);
      sec.classList.remove('avis--defile');
      if (arret || !visible || retenu || doc.hidden) return;
      void sec.offsetWidth;
      sec.classList.add('avis--defile');
      minuteur = setTimeout(function () { montrer(i + 1); }, DUREE);
    }
    choix.forEach(function (b, k) { b.addEventListener('click', function () { montrer(k); }); });
    $$('[data-avis-suivant]', sec).forEach(function (b) { b.addEventListener('click', function () { montrer(i + 1); }); });
    if (pause) pause.addEventListener('click', function () {
      arret = !arret;
      pause.setAttribute('aria-pressed', arret ? 'true' : 'false');
      pause.textContent = arret ? 'Lecture' : 'Pause';
      relancer();
    });
    var scene = $('.avis__scene', sec) || sec;
    scene.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { retenu = true; relancer(); } });
    scene.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { retenu = false; relancer(); } });
    sec.addEventListener('focusin', function () { retenu = true; relancer(); });
    sec.addEventListener('focusout', function (e) { if (!sec.contains(e.relatedTarget)) { retenu = false; relancer(); } });
    doc.addEventListener('visibilitychange', relancer);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; relancer(); }, { threshold: 0.4 }).observe(scene);
    montrer(0);
  })();

  /* Bandeau « site d'exemple » : en haut de la page, puis une version compacte qui redescend dès que l'on remonte
     (et repart quand on redescend). L'en-tête collant du site glisse dessous (--demo-dec). Le bandeau d'origine
     reste le seul lu par les lecteurs d'écran et atteint au clavier : la copie flottante sert à la souris et au doigt. */
  (function () {
    var bar = document.querySelector('[data-demo-bar]');
    if (!bar || !window.requestAnimationFrame) return;
    var racine = document.documentElement;
    var f = document.createElement('div');
    f.className = 'demo-flottant';
    f.setAttribute('aria-hidden', 'true');
    var retour = bar.querySelector('.pv-demo-retour, .demo__retour');
    var liens = bar.querySelectorAll('a');
    var dernier = liens.length ? liens[liens.length - 1] : null;
    if (retour) f.appendChild(retour.cloneNode(true));
    var txt = document.createElement('span');
    txt.className = 'demo-flottant__texte';
    txt.innerHTML = '<span class="demo-flottant__long"></span><span class="demo-flottant__mini"></span>';
    txt.firstChild.textContent = bar.getAttribute('data-demo-court') || '';
    txt.lastChild.textContent = bar.getAttribute('aria-label') || '';
    f.appendChild(txt);
    if (dernier && dernier !== retour) { var c = dernier.cloneNode(true); c.classList.add('demo-flottant__action'); f.appendChild(c); }
    Array.prototype.forEach.call(f.querySelectorAll('a'), function (a) { a.setAttribute('tabindex', '-1'); });
    document.body.appendChild(f);
    var y0 = window.scrollY, visible = false, prevu = false;
    function montrer(v) {
      if (v === visible) return;
      visible = v;
      f.classList.toggle('est-visible', v);
      racine.style.setProperty('--demo-dec', v ? f.offsetHeight + 'px' : '0px');
    }
    function maj() {
      prevu = false;
      var y = window.scrollY, bas = bar.getBoundingClientRect().bottom + y;
      if (y <= bas) montrer(false);
      else if (y < y0 - 6) montrer(true);
      else if (y > y0 + 6) montrer(false);
      if (Math.abs(y - y0) > 6) y0 = y;
    }
    window.addEventListener('scroll', function () { if (!prevu) { prevu = true; requestAnimationFrame(maj); } }, { passive: true });
    window.addEventListener('resize', function () { if (visible) racine.style.setProperty('--demo-dec', f.offsetHeight + 'px'); });
  })();
})();
