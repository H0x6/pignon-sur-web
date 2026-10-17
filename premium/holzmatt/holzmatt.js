/*!
 * holzmatt.js — Holzmatt, maisons à ossature bois (site d'exemple premium, Pignon sur Web)
 * Le titre peint au pochoir, la maison en 3D qui se monte au défilement (chargée à l'approche),
 * les plans qui se dessinent, l'estimation du budget, les chiffres de la forêt, le formulaire.
 * Mouvement réduit : la maison se construit toujours au défilement, mais sans mouvement de caméra.
 */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var econome = !!(navigator.connection && navigator.connection.saveData);
  var autoLecture = !reduit && !econome;
  var petitEcran = window.matchMedia('(max-width: 699px)').matches;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var sortie = function (t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); };
  var NB = ' ';
  var vw = window.innerWidth, vh = window.innerHeight;
  var annonce = $('[data-annonce]');
  var dire = function (t) { if (annonce) { annonce.textContent = ''; setTimeout(function () { annonce.textContent = t; }, 30); } };
  var nombre = function (n, d) { return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); };
  var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

  /* L'arrivée -------------------------------------------------------------------------- */
  (function () {
    var fait = false;
    var go = function () { if (fait) return; fait = true; requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add('est-charge'); }); }); };
    if (reduit) { root.classList.add('est-charge'); return; }
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(go);
    setTimeout(go, 800);
  })();

  /* Vidéos -------------------------------------------------------------------------------- */
  $$('video[data-poster-petit]').forEach(function (v) { if (petitEcran) v.poster = v.getAttribute('data-poster-petit'); });
  var source = function (v) { return v.getAttribute('data-src') || v.getAttribute(petitEcran ? 'data-src-petit' : 'data-src-grand'); };
  function lire(v) {
    if (!v || v.enPause) return;
    if (!v.getAttribute('src')) { v.src = source(v); v.load(); } else if (!v.paused) return;
    var p = v.play(); if (p && p.catch) p.catch(function () {});
  }
  function arreter(v) { if (v && !v.paused) v.pause(); }
  $$('video').forEach(function (v) { v.enPause = !autoLecture; });
  $$('[data-pause]').forEach(function (b) {
    var cibles = $$(b.getAttribute('data-pause'));
    var maj = function () { var arret = cibles.length && cibles[0].enPause; b.setAttribute('aria-pressed', String(!!arret)); b.querySelector('.sr').textContent = arret ? 'Lire la vidéo' : 'Mettre la vidéo en pause'; };
    maj();
    b.addEventListener('click', function () { var r = cibles[0].enPause; cibles.forEach(function (v) { v.enPause = !r; if (r) { if (v.visible !== false) lire(v); } else arreter(v); }); maj(); });
  });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { e.target.visible = e.isIntersecting; if (e.isIntersecting) lire(e.target); else arreter(e.target); }); }, { rootMargin: '200px 0px' });
    $$('[data-video], [data-video-lazy]').forEach(function (v) { io.observe(v); });
  }
  lire($('[data-video]'));

  /* En-tête ---------------------------------------------------------------------------------- */
  var entete = $('[data-entete]'), une = $('.une'), burger = $('.burger'), nav = $('#nav'), menuOuvert = false;
  if (burger && nav) {
    var menu = function (o) { menuOuvert = o; burger.setAttribute('aria-expanded', String(o)); if (o) { nav.setAttribute('data-ouvert', ''); entete.classList.add('est-plein'); entete.classList.remove('est-cache'); } else nav.removeAttribute('data-ouvert'); };
    burger.addEventListener('click', function () { menu(burger.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) menu(false); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuOuvert) { menu(false); burger.focus(); } });
  }
  var dernierY = window.scrollY;
  function majEntete() {
    if (!entete) return;
    var y = window.scrollY, bas = une ? une.offsetTop + une.offsetHeight - 80 : 200;
    entete.classList.toggle('est-plein', y > bas || menuOuvert);
    var f = doc.activeElement;
    if (!menuOuvert && !(f && f.closest && f.closest('.entete'))) {
      if (y > bas && y > dernierY + 6) entete.classList.add('est-cache');
      else if (y < dernierY - 6 || y <= bas) entete.classList.remove('est-cache');
    }
    dernierY = y;
  }
  if (entete) entete.addEventListener('focusin', function () { entete.classList.remove('est-cache'); });

  /* La maison se monte -------------------------------------------------------------------------- */
  var montage = $('[data-montage]'), scene = $('[data-scene]'), canvas = $('[data-canvas]');
  var etapes = $$('[data-etape]'), elBois = $('[data-bois]'), elCo2 = $('[data-co2]'), barre = $('[data-avancement]');
  var M3D = null, BOIS = [0, 0, 4.6, 10.8, 16.2, 21.4, 29.8, 36.1, 38.4], derniereEtape = -1, dernierP = -1;
  var actif = !!(montage && etapes.length);
  if (actif) montage.classList.add('est-actif');
  function bois(p) { var k = Math.min(7, Math.floor(p)), u = p - k; return BOIS[k] + (BOIS[k + 1] - BOIS[k]) * clamp(u / 0.9, 0, 1); }
  function progression() {
    var r = montage.getBoundingClientRect();
    return clamp(-r.top / (r.height - vh), 0, 1) * 8.4;
  }
  function majMontage() {
    if (!actif) return;
    var r = montage.getBoundingClientRect();
    if (r.top > vh || r.bottom < 0) return;
    var P = Math.min(8, progression());
    if (Math.abs(P - dernierP) < 0.0005) return;
    dernierP = P;
    if (M3D) M3D.regler(P);
    etapes.forEach(function (li, k) {
      var d = P - k, op;
      if (k === 0) op = clamp(1 - d * 2.4, 0, 1);
      else if (k === 8) op = clamp((d + 0.55) * 2.4, 0, 1);
      else op = clamp(1 - Math.abs(d - 0.1) * 2.4, 0, 1);
      li.style.opacity = op.toFixed(3);
      li.style.transform = reduit ? '' : 'translate3d(0,' + ((d - 0.1) * -26).toFixed(1) + 'px,0)';
      li.style.visibility = op > 0.01 ? 'visible' : 'hidden';
    });
    var b = bois(P);
    elBois.textContent = nombre(b, 1);
    elCo2.textContent = nombre(b * 0.92, 0);
    barre.style.setProperty('--p', (P / 8).toFixed(4));
    var e = Math.round(P);
    if (e !== derniereEtape) { derniereEtape = e; dire(etapes[e].querySelector('.etape__nom').textContent + ', ' + etapes[e].querySelector('.etape__quand').textContent.toLowerCase()); }
  }
  function webglOk() { try { var c = doc.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; } }
  if (actif && canvas && webglOk() && 'IntersectionObserver' in window) {
    var charge = false;
    new IntersectionObserver(function (e, o) {
      if (!e[0].isIntersecting || charge) return;
      charge = true; o.disconnect();
      import('./3d/maison.js').then(function (mod) {
        M3D = mod.lancer(canvas, { reduit: reduit, depart: Math.min(8, progression()) });
        setTimeout(function () { scene.classList.add('est-pret'); }, 120);
        dernierP = -1; majMontage();
      }).catch(function () {});
    }, { rootMargin: '600px 0px' }).observe(montage);
  }

  /* Les maisons : le plan se dessine ----------------------------------------------------------------- */
  $$('[data-plan]').forEach(function (b) {
    var carte = b.closest('.modele'), libelle = b.textContent;
    b.addEventListener('click', function () {
      var on = !carte.classList.contains('est-plan');
      carte.classList.toggle('est-plan', on);
      b.setAttribute('aria-pressed', String(on));
      b.textContent = on ? 'Revoir la photo' : libelle;
      dire(on ? 'Plan affiché.' : 'Photo affichée.');
    });
  });

  /* Le budget ----------------------------------------------------------------------------------------- */
  var budget = $('[data-budget]');
  var resume = '';
  if (budget) (function () {
    var PRIX = { heha: 1250, paf: 1750, cle: 2350 }, NOMS = { heha: 'hors d’eau, hors d’air', paf: 'prête à finir', cle: 'clé en main' };
    var OPTIONS = { poele: 6500, terrasse: 9800, solaire: 8900, abri: 14000 }, NOMS_OPT = { poele: 'poêle à bois', terrasse: 'terrasse', solaire: 'panneaux solaires', abri: 'abri voiture' };
    var range = $('#b-surface', budget), sortieS = $('[data-sortie="surface"]', budget), elPrix = $('[data-prix]', budget), etiquette = $('.budget__etiquette', budget);
    var parts = {}; $$('[data-part]', budget).forEach(function (p) { parts[p.getAttribute('data-part')] = p; });
    var affiche = [0, 0];
    function calculer() {
      var s = +range.value, niv = +$('input[name="niveaux"]:checked', budget).value, fin = $('input[name="finition"]:checked', budget).value;
      var opts = $$('input[data-b="option"]:checked', budget).map(function (i) { return i.value; });
      var base = s * PRIX[fin] * (niv === 2 ? 0.95 : 1);
      var options = opts.reduce(function (t, o) { return t + OPTIONS[o]; }, 0);
      var total = base + options;
      var structure = s * 620 * (niv === 2 ? 0.92 : 1), enveloppe = s * (fin === 'heha' ? 630 : 560), finitions = Math.max(0, base - structure - enveloppe);
      var semaines = Math.round((fin === 'heha' ? 8 : fin === 'paf' ? 11 : 13) + (s - 100) / 40 + (niv === 2 ? 1 : 0));
      var m3 = s * 0.28 * (niv === 2 ? 0.95 : 1.05);
      return { s: s, niv: niv, fin: fin, opts: opts, bas: Math.round(total * 0.95 / 1000) * 1000, haut: Math.round(total * 1.05 / 1000) * 1000, parts: { structure: structure, enveloppe: enveloppe, finitions: finitions, options: options }, semaines: semaines, m3: m3 };
    }
    function majRange() { var p = (range.value - range.min) / (range.max - range.min) * 100; range.style.setProperty('--rempli', p + '%'); sortieS.textContent = range.value + NB + 'm²'; }
    function maj(anime) {
      majRange();
      var r = calculer();
      etiquette.textContent = 'Votre maison de ' + r.s + NB + 'm², ' + NOMS[r.fin];
      Object.keys(parts).forEach(function (k) { parts[k].style.flexGrow = Math.max(0.5, r.parts[k] / 1000).toFixed(2); });
      $('[data-duree]', budget).textContent = r.semaines + ' semaines';
      $('[data-mbois]', budget).textContent = nombre(r.m3, 0) + NB + 'm³';
      $('[data-mco2]', budget).textContent = nombre(r.m3 * 0.92, 0) + NB + 't';
      var de = affiche.slice(), vers = [r.bas, r.haut];
      var ecrire = function (a, b) { elPrix.textContent = 'de ' + nombre(Math.round(a / 1000) * 1000) + ' à ' + nombre(Math.round(b / 1000) * 1000) + NB + '€'; };
      if (!anime || reduit || !de[0]) { affiche = vers; ecrire(vers[0], vers[1]); }
      else {
        var t0 = performance.now();
        (function pas(t) { var p = sortie((t - t0) / 500); affiche = [de[0] + (vers[0] - de[0]) * p, de[1] + (vers[1] - de[1]) * p]; ecrire(affiche[0], affiche[1]); if (p < 1) requestAnimationFrame(pas); else affiche = vers; })(t0);
      }
      resume = 'Maison de ' + r.s + ' m² ' + (r.niv === 2 ? 'à étage' : 'de plain-pied') + ', ' + NOMS[r.fin] + (r.opts.length ? ', avec ' + r.opts.map(function (o) { return NOMS_OPT[o]; }).join(', ') : '') + ' : estimation de ' + nombre(r.bas) + ' à ' + nombre(r.haut) + ' euros.';
    }
    budget.addEventListener('input', function () { maj(true); });
    budget.addEventListener('change', function () { maj(true); });
    maj(false);
    var vers = $('[data-vers-contact]', budget), msg = $('[data-message]');
    if (vers && msg) vers.addEventListener('click', function () { if (!msg.value.trim()) msg.value = 'Bonjour,\n\nJ’ai estimé sur votre site : ' + resume + '\n\n'; });
  })();

  /* La forêt : les chiffres comptent ------------------------------------------------------------------------ */
  var chiffres = $('[data-chiffres]');
  if (chiffres && !reduit && 'IntersectionObserver' in window) {
    var cibles = $$('[data-compte]', chiffres);
    cibles.forEach(function (c) { c.textContent = '0'; });
    new IntersectionObserver(function (e, o) {
      if (!e[0].isIntersecting) return; o.disconnect();
      var t0 = performance.now();
      (function pas(t) {
        var p = sortie((t - t0) / 1600);
        cibles.forEach(function (c) { var v = parseFloat(c.getAttribute('data-compte')), d = +(c.getAttribute('data-decimales') || 0); c.textContent = nombre(v * p, d); });
        if (p < 1) requestAnimationFrame(pas);
      })(t0);
    }, { threshold: 0.4 }).observe(chiffres);
  }

  /* Sur nos chantiers : les flèches font défiler ------------------------------------------------------------- */
  var galerie = $('[data-galerie]');
  $$('[data-defiler]').forEach(function (b) {
    b.addEventListener('click', function () { if (galerie) galerie.scrollBy({ left: +b.getAttribute('data-defiler') * galerie.clientWidth * 0.7, behavior: reduit ? 'auto' : 'smooth' }); });
  });

  /* Contact : les deux prochains samedis de visite, la demande par e-mail -------------------------------------- */
  var visites = $('[data-visites-texte]');
  if (visites) {
    var d = new Date(), samedis = [];
    d.setDate(d.getDate() + 5);
    while (samedis.length < 2) { if (d.getDay() === 6) { samedis.push(new Date(d)); d.setDate(d.getDate() + 14); } else d.setDate(d.getDate() + 1); }
    var lieux = ['à Wimmenau', 'à La Petite-Pierre'];
    visites.innerHTML = 'Prochaines visites&#8239;: <strong>samedi ' + samedis[0].getDate() + ' ' + MOIS[samedis[0].getMonth()] + '</strong> ' + lieux[0] + ' et <strong>samedi ' + samedis[1].getDate() + ' ' + MOIS[samedis[1].getMonth()] + '</strong> ' + lieux[1] + ', de 10&nbsp;h à 16&nbsp;h. Inscription dans le formulaire.';
  }
  var form = $('[data-formulaire]');
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = function (n) { var el = form.elements[n]; return el ? el.value.trim() : ''; };
    var corps = 'Nom : ' + v('nom') + '\nCommune du terrain : ' + v('commune') + '\nSurface du terrain : ' + (v('surface') || 'non précisée') + '\nMaison qui me plaît : ' + v('modele') + '\n\n' + (v('message') || '') + (resume && v('message').indexOf(resume) < 0 ? '\n\nEstimation faite sur le site : ' + resume : '') + '\n';
    location.href = 'mailto:contact@holzmatt.example?subject=' + encodeURIComponent('Mon terrain à ' + (v('commune') || 'préciser')) + '&body=' + encodeURIComponent(corps);
  });

  /* Une seule boucle ---------------------------------------------------------------------------------------------- */
  var prevu = false;
  function maj() { prevu = false; majEntete(); majMontage(); }
  window.addEventListener('scroll', function () { if (!prevu) { prevu = true; requestAnimationFrame(maj); } }, { passive: true });
  window.addEventListener('resize', function () { vw = window.innerWidth; vh = window.innerHeight; dernierP = -1; maj(); });
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
