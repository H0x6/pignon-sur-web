/*!
 * kuchel.js — Kuchel, atelier de cuisines sur mesure (site d'exemple premium, Pignon sur Web)
 * Le mot qui se met à la mesure de l'écran, le configurateur 3D (chargé à l'approche), l'estimation,
 * l'atelier qui défile à l'horizontale, les réalisations qui s'ouvrent comme des tiroirs, les matières,
 * les créneaux du showroom. Mouvement réduit : rien ne bouge seul, la 3D reste sans animation.
 */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var econome = !!(navigator.connection && navigator.connection.saveData);
  var autoLecture = !reduit && !econome;
  var petitEcran = window.matchMedia('(max-width: 699px)').matches;
  var pointeurFin = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var sortie = function (t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); };
  var NB = ' ';
  var vw = window.innerWidth, vh = window.innerHeight;
  var annonce = $('[data-annonce]');
  var dire = function (t) { if (annonce) { annonce.textContent = ''; setTimeout(function () { annonce.textContent = t; }, 30); } };
  var nombre = function (n) { return Math.round(n).toLocaleString('fr-FR'); };

  /* Heure de Paris ----------------------------------------------------------------- */
  var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  function paris() {
    var d = new Date(), o = { a: d.getFullYear(), m: d.getMonth() + 1, j: d.getDate(), jour: d.getDay(), min: d.getHours() * 60 + d.getMinutes() };
    try {
      var p = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(d);
      var g = function (t) { for (var i = 0; i < p.length; i++) if (p[i].type === t) return p[i].value; return ''; };
      o = { a: +g('year'), m: +g('month'), j: +g('day'), jour: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g('weekday')), min: (parseInt(g('hour'), 10) % 24) * 60 + parseInt(g('minute'), 10) };
    } catch (e) { /* heure de l'appareil */ }
    return o;
  }
  var hfr = function (m) { var h = Math.floor(m / 60), r = m % 60; return h + NB + 'h' + (r ? NB + (r < 10 ? '0' : '') + r : ''); };

  /* Showroom : ouvert ou fermé (mardi–vendredi 10–12 h, 14–18 h 30 ; samedi 9 h 30–17 h) */
  var PLAGES = { 2: [[600, 720], [840, 1110]], 3: [[600, 720], [840, 1110]], 4: [[600, 720], [840, 1110]], 5: [[600, 720], [840, 1110]], 6: [[570, 1020]] };
  function statut() {
    var el = $('[data-statut]'); if (!el) return;
    var n = paris(), pl = PLAGES[n.jour] || [], txt, etat = 'ferme';
    var en = pl.filter(function (x) { return n.min >= x[0] && n.min < x[1]; })[0];
    if (en) { txt = 'Showroom ouvert jusqu’à ' + hfr(en[1]); etat = 'ouvert'; }
    else {
      var suite = pl.filter(function (x) { return x[0] > n.min; })[0];
      if (suite) txt = 'Fermé pour l’instant, réouverture à ' + hfr(suite[0]);
      else {
        for (var k = 1; k <= 7; k++) { var j = (n.jour + k) % 7; if (PLAGES[j]) { txt = 'Fermé, ouvre ' + (k === 1 ? 'demain' : JOURS[j]) + ' à ' + hfr(PLAGES[j][0][0]); break; } }
      }
    }
    el.textContent = txt; el.setAttribute('data-etat', etat); el.hidden = false;
  }
  statut(); setInterval(statut, 60000);

  /* Vidéos ---------------------------------------------------------------------------------- */
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
    var maj = function () {
      var arret = cibles.length && cibles[0].enPause, plusieurs = cibles.length > 1;
      b.setAttribute('aria-pressed', String(!!arret));
      b.querySelector('.sr').textContent = arret ? (plusieurs ? 'Lire les vidéos' : 'Lire la vidéo') : (plusieurs ? 'Mettre les vidéos en pause' : 'Mettre la vidéo en pause');
    };
    maj();
    b.addEventListener('click', function () {
      var reprendre = cibles[0].enPause;
      cibles.forEach(function (v) { v.enPause = !reprendre; if (reprendre) { if (v.visible !== false) lire(v); } else arreter(v); });
      maj();
    });
  });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { e.target.visible = e.isIntersecting; if (e.isIntersecting) lire(e.target); else arreter(e.target); }); }, { rootMargin: '200px 0px' });
    $$('[data-video], [data-video-lazy]').forEach(function (v) { io.observe(v); });
  }
  lire($('[data-video]'));

  /* En-tête ------------------------------------------------------------------------------------ */
  var entete = $('[data-entete]'), une = $('[data-une]'), burger = $('.burger'), nav = $('#nav'), menuOuvert = false;
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

  /* Sur mesure : le mot prend toute la largeur, la cote affiche la mesure ---------------------------- */
  var mot = $('[data-ajuste]'), coteVal = $('[data-cote-valeur]'), contenu = $('.une__contenu');
  var largeurActuelle = 62, coteActuelle = 0;
  function mesurer() {
    if (!mot || !contenu) return null;
    mot.style.fontSize = '';
    var W = contenu.clientWidth;
    mot.style.setProperty('--largeur', '62%'); var a = mot.getBoundingClientRect().width;
    mot.style.setProperty('--largeur', '125%'); var b = mot.getBoundingClientRect().width;
    if (a > W) { var k = W / a; mot.style.fontSize = (parseFloat(getComputedStyle(mot).fontSize) * k) + 'px'; a = W; b = b * k; }
    else if (b < W) { var k2 = W / b; mot.style.fontSize = (parseFloat(getComputedStyle(mot).fontSize) * k2) + 'px'; a = a * k2; b = W; }
    var cible = b > a ? clamp(62 + (W - a) / (b - a) * 63, 62, 125) : 100;
    mot.style.setProperty('--largeur', largeurActuelle + '%');
    return { largeur: cible, mm: Math.round(W * 0.26458 * 10 / 10) * 10 };
  }
  function ajuster(anime) {
    var m = mesurer(); if (!m) return;
    var de = largeurActuelle, deMm = coteActuelle;
    if (!anime || reduit) {
      largeurActuelle = m.largeur; coteActuelle = m.mm;
      mot.style.setProperty('--largeur', m.largeur.toFixed(2) + '%');
      coteVal.textContent = nombre(m.mm) + NB + 'mm';
      return;
    }
    var t0 = performance.now(), D = 1600;
    (function pas(t) {
      var p = clamp((t - t0) / D, 0, 1), e = sortie(p);
      largeurActuelle = de + (m.largeur - de) * e; coteActuelle = deMm + (m.mm - deMm) * e;
      mot.style.setProperty('--largeur', largeurActuelle.toFixed(2) + '%');
      coteVal.textContent = nombre(Math.round(coteActuelle / 10) * 10) + NB + 'mm';
      if (p < 1) requestAnimationFrame(pas);
    })(t0);
  }
  (function () {
    var fait = false;
    var go = function () {
      if (fait) return; fait = true;
      ajuster(false); var cible = largeurActuelle, mm = coteActuelle;
      if (!reduit) { largeurActuelle = 62; coteActuelle = 0; mot.style.setProperty('--largeur', '62%'); coteVal.textContent = '0' + NB + 'mm'; }
      requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add('est-charge'); if (!reduit) setTimeout(function () { ajuster(true); }, 250); else { largeurActuelle = cible; coteActuelle = mm; } }); });
    };
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(go);
    setTimeout(go, 900);
  })();

  /* Le configurateur ----------------------------------------------------------------------------------- */
  var NOMS = {
    plan: { lineaire: 'Cuisine linéaire', l: 'Cuisine en L', ilot: 'Cuisine avec îlot' },
    facade: { chene: 'Chêne naturel', noyer: 'Noyer', frene: 'Frêne noirci', sauge: 'Laque sauge', craie: 'Laque craie', encre: 'Laque encre' },
    plan_travail: { gres: 'Grès rose des Vosges', quartz: 'Quartz blanc', inox: 'Inox brossé', chene: 'Chêne massif' },
    poignee: { laiton: 'Laiton massif', noir: 'Acier noir', gorge: 'Sans poignée, profil en gorge' },
    mur: { chaux: 'Blanc de chaux', vert: 'Vert de gris', argile: 'Argile', nuit: 'Gris nuit' }
  };
  var ORDRE = ['plan', 'facade', 'plan_travail', 'poignee', 'mur'];
  var config = { plan: 'ilot', facade: 'chene', plan_travail: 'gres', poignee: 'laiton', mur: 'chaux' };
  var m = /cuisine=([a-z.]+)/.exec(location.hash);
  if (m) m[1].split('.').forEach(function (v, i) { var k = ORDRE[i]; if (k && NOMS[k][v]) config[k] = v; });

  var PRIX = {
    plan: { lineaire: { base: 11800, ml: 2.4, cred: 2.4, faces: 16 }, l: { base: 14600, ml: 4.6, cred: 4.6, faces: 21 }, ilot: { base: 19200, ml: 5.2, cred: 2.0, faces: 24 } },
    facade: { chene: 1.16, noyer: 1.34, frene: 1.22, sauge: 1, craie: 1, encre: 1.05 },
    plan_travail: { gres: 720, quartz: 560, inox: 640, chene: 410 },
    poignee: { gorge: 0, laiton: 42, noir: 24 }
  };
  function estimer(c) {
    var p = PRIX.plan[c.plan];
    var t = p.base * (0.4 + 0.6 * PRIX.facade[c.facade]) + p.ml * PRIX.plan_travail[c.plan_travail] + p.cred * PRIX.plan_travail[c.plan_travail] * 0.6;
    t += c.poignee === 'gorge' ? 380 : p.faces * PRIX.poignee[c.poignee];
    return [Math.round(t * 0.94 / 100) * 100, Math.round(t * 1.08 / 100) * 100];
  }
  var elPrix = $('[data-prix]'), elResume = $('[data-resume]'), elEnvoyer = $('[data-envoyer]');
  var prixAff = estimer(config);
  function resume(c) {
    return NOMS.plan[c.plan] + ', façades en ' + NOMS.facade[c.facade].toLowerCase() + ', plan en ' + NOMS.plan_travail[c.plan_travail].charAt(0).toLowerCase() + NOMS.plan_travail[c.plan_travail].slice(1) + ', ' + (c.poignee === 'gorge' ? 'sans poignée' : 'poignées en ' + NOMS.poignee[c.poignee].toLowerCase()) + ', murs ' + NOMS.mur[c.mur].toLowerCase() + '.';
  }
  function lien() { return location.href.split('#')[0] + '#cuisine=' + ORDRE.map(function (k) { return config[k]; }).join('.'); }
  function majTextes(anime) {
    ORDRE.forEach(function (k) { var v = $('[data-valeur="' + k + '"]'); if (v) v.textContent = NOMS[k][config[k]]; });
    elResume.textContent = resume(config);
    var vers = estimer(config), de = prixAff.slice();
    var ecrire = function (a, b) { elPrix.textContent = 'de ' + nombre(a) + ' à ' + nombre(b) + NB + '€'; };
    if (!anime || reduit) { ecrire(vers[0], vers[1]); prixAff = vers; }
    else {
      var t0 = performance.now();
      (function pas(t) { var p = sortie((t - t0) / 600); prixAff = [de[0] + (vers[0] - de[0]) * p, de[1] + (vers[1] - de[1]) * p]; ecrire(Math.round(prixAff[0] / 100) * 100, Math.round(prixAff[1] / 100) * 100); if (p < 1) requestAnimationFrame(pas); else prixAff = vers; })(t0);
    }
    var corps = 'Bonjour,\n\nVoici la cuisine que j’ai composée sur votre site :\n' + resume(config) + '\nEstimation affichée : de ' + nombre(vers[0]) + ' à ' + nombre(vers[1]) + ' euros, posée.\nLien : ' + lien() + '\n\nJe souhaiterais recevoir un plan et un devis.\nVille :\nTéléphone :\n\nMerci,\n';
    elEnvoyer.href = 'mailto:atelier@kuchel.example?subject=' + encodeURIComponent('Ma cuisine : ' + NOMS.plan[config.plan].toLowerCase()) + '&body=' + encodeURIComponent(corps);
  }
  var options = $('[data-options]');
  ORDRE.forEach(function (k) { var r = $('input[name="' + k + '"][value="' + config[k] + '"]', options); if (r) r.checked = true; });
  majTextes(false);

  var scene = $('[data-scene]'), canvas = $('[data-canvas]'), A3D = null, enChargement = false;
  var outils = $('[data-outils]'), aide = $('[data-aide]'), chargement = $('[data-chargement]');
  function choisir(nouv, depuis) {
    var change = {};
    Object.keys(nouv).forEach(function (k) { if (config[k] !== nouv[k]) { config[k] = nouv[k]; change[k] = nouv[k]; var r = $('input[name="' + k + '"][value="' + nouv[k] + '"]', options); if (r) r.checked = true; } });
    if (!Object.keys(change).length) return;
    if (A3D) A3D.appliquer(change);
    majTextes(true);
    try { history.replaceState(null, '', '#cuisine=' + ORDRE.map(function (k) { return config[k]; }).join('.')); } catch (e) { /* rien */ }
    if (depuis !== 'radio') dire(resume(config));
    if (change.plan) { ouvert = false; if (btnOuvrir) { btnOuvrir.setAttribute('aria-pressed', 'false'); btnOuvrir.textContent = 'Ouvrir les façades'; } }
  }
  options.addEventListener('change', function (e) {
    var t = e.target; if (!t.name || !NOMS[t.name]) return;
    var n = {}; n[t.name] = t.value; choisir(n, 'radio');
  });
  function webglOk() { try { var c = doc.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; } }
  function lancer3D() {
    if (enChargement || A3D || !webglOk()) return;
    enChargement = true;
    chargement.hidden = false;
    import('./3d/atelier.js').then(function (mod) {
      A3D = mod.lancer(canvas, config, { reduit: reduit, fond: '#E9E7E2', surOuvrant: function () { if (aide) aide.classList.add('est-lu'); } });
      setTimeout(function () { scene.classList.add('est-pret'); chargement.hidden = true; }, 120);
      outils.hidden = false; aide.hidden = false;
      dire('La cuisine en 3D est prête : glissez pour tourner autour.');
    }).catch(function () { chargement.hidden = true; enChargement = false; });
  }
  if (scene && canvas) {
    canvas.addEventListener('pointerdown', function () { if (aide) setTimeout(function () { aide.classList.add('est-lu'); }, 1200); });
    if ('IntersectionObserver' in window) {
      var pret = false;
      new IntersectionObserver(function (e, o) {
        if (!e[0].isIntersecting) return;
        if (!pret) { pret = true; import('./3d/atelier.js').catch(function () {}); } // préchargement
      }, { rootMargin: '900px 0px' }).observe(scene);
      new IntersectionObserver(function (e, o) { if (e[0].isIntersecting) { lancer3D(); o.disconnect(); } }, { threshold: 0.35 }).observe(scene);
    } else lancer3D();
  }
  $$('[data-vue]').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('[data-vue]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      if (A3D) A3D.vue(b.getAttribute('data-vue'));
    });
  });
  var btnOuvrir = $('[data-tout-ouvrir]'), ouvert = false;
  if (btnOuvrir) {
    btnOuvrir.setAttribute('aria-pressed', 'false');
    btnOuvrir.addEventListener('click', function () {
      if (!A3D) return;
      ouvert = A3D.toutOuvrir();
      btnOuvrir.setAttribute('aria-pressed', String(ouvert));
      btnOuvrir.textContent = ouvert ? 'Fermer les façades' : 'Ouvrir les façades';
      if (aide) aide.classList.add('est-lu');
    });
  }
  var copier = $('[data-copier]');
  if (copier) copier.addEventListener('click', function () {
    var url = lien();
    var fini = function () { var t = copier.textContent; copier.textContent = 'Lien copié'; dire('Le lien de votre cuisine est copié.'); setTimeout(function () { copier.textContent = t; }, 2200); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(fini, function () { window.prompt('Copiez ce lien :', url); });
    else window.prompt('Copiez ce lien :', url);
  });

  /* L'atelier : la piste défile à l'horizontale -------------------------------------------------------- */
  var atelier = $('[data-atelier]'), colle = $('[data-atelier-colle]'), piste = $('[data-piste]'), regle = $('[data-regle]');
  var course = 0, epingle = false;
  function mesurerAtelier() {
    if (!atelier) return;
    var veut = !reduit && vw >= 900;
    if (veut !== epingle) { epingle = veut; atelier.classList.toggle('est-epingle', veut); piste.style.transform = ''; }
    if (!epingle) { atelier.style.removeProperty('--hauteur'); return; }
    course = Math.max(0, piste.scrollWidth - colle.clientWidth);
    atelier.style.setProperty('--hauteur', (vh + course * 1.1 + vh * 0.25) + 'px');
  }
  function majAtelier() {
    if (!atelier) return;
    var p;
    if (epingle) {
      var r = atelier.getBoundingClientRect();
      if (r.top > vh || r.bottom < 0) return;
      p = clamp((-r.top - vh * 0.1) / (r.height - vh - vh * 0.25), 0, 1);
      piste.style.transform = 'translate3d(' + (-p * course).toFixed(1) + 'px,0,0)';
    } else {
      var max = piste.scrollWidth - piste.clientWidth;
      p = max > 0 ? piste.scrollLeft / max : 1;
    }
    regle.style.setProperty('--avance', (0.12 + p * 0.88).toFixed(4));
  }
  if (piste) piste.addEventListener('scroll', function () { if (!epingle) majAtelier(); }, { passive: true });
  mesurerAtelier();

  /* Réalisations : les photos s'ouvrent comme des tiroirs ------------------------------------------------ */
  var real = $('[data-real]');
  if (real && !reduit && 'IntersectionObserver' in window) {
    $$('.real__item', real).forEach(function (li, i) { li.style.setProperty('--i', String(i)); });
    real.classList.add('est-pret');
    new IntersectionObserver(function (e, o) { if (e[0].isIntersecting) { real.classList.add('est-ouvert'); o.disconnect(); } }, { threshold: 0.12 }).observe(real);
  }

  /* Matières ----------------------------------------------------------------------------------------------- */
  var mats = $$('[data-matiere]'), imgsM = $$('[data-matieres-images] img'), essayer = $('[data-essayer]'), matCourante = mats[0];
  mats.forEach(function (b) {
    b.addEventListener('click', function () {
      matCourante = b;
      mats.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      var cle = b.getAttribute('data-matiere');
      imgsM.forEach(function (im) { var v = im.getAttribute('data-pour') === cle; im.classList.toggle('est-visible', v); if (v) im.loading = 'eager'; });
    });
  });
  if (essayer) essayer.addEventListener('click', function () {
    var e = matCourante.getAttribute('data-essai').split(':'), n = {}; n[e[0]] = e[1];
    choisir(n);
    var cible = $('#configurer'); if (cible) cible.scrollIntoView({ behavior: reduit ? 'auto' : 'smooth' });
  });

  /* Showroom : choisir un créneau ---------------------------------------------------------------------------- */
  var creneaux = $('[data-creneaux]');
  if (creneaux) (function () {
    var n = paris(), auj = Math.floor(Date.UTC(n.a, n.m - 1, n.j) / 86400000);
    var HEURES = { semaine: [600, 660, 840, 930, 1020], samedi: [570, 660, 840, 930] };
    var jours = [];
    for (var j = auj; jours.length < 10 && j < auj + 21; j++) {
      var d = new Date(j * 86400000), js = d.getUTCDay();
      if (!PLAGES[js]) continue;
      var hs = (js === 6 ? HEURES.samedi : HEURES.semaine).filter(function (h) { return j > auj || h > n.min + 90; });
      if (!hs.length) continue;
      jours.push({ j: j, js: js, d: d.getUTCDate(), m: d.getUTCMonth(), heures: hs });
    }
    var pris = function (j, h) { var x = ((j * 73856093) ^ (h * 19349663)) >>> 0; return x % 10 < 3; };
    var choixJ = null, choixH = null;
    creneaux.innerHTML = '<h3 class="creneaux__titre">Choisir un créneau</h3><ul class="creneaux__jours" role="list" data-jours></ul><ul class="creneaux__heures" role="list" data-heures></ul><p class="creneaux__resume" data-cr-resume>Choisissez un jour, puis une heure.</p><a class="bouton" href="mailto:atelier@kuchel.example" data-cr-envoyer aria-disabled="true">Réserver ce créneau</a>';
    var ulJ = $('[data-jours]', creneaux), ulH = $('[data-heures]', creneaux), res = $('[data-cr-resume]', creneaux), env = $('[data-cr-envoyer]', creneaux);
    ulJ.innerHTML = jours.map(function (x, i) { return '<li><button type="button" class="jour" aria-pressed="false" data-i="' + i + '" aria-label="' + JOURS[x.js] + ' ' + x.d + ' ' + MOIS[x.m] + '"><small aria-hidden="true">' + JOURS[x.js].slice(0, 3) + '.</small><strong aria-hidden="true">' + x.d + '</strong></button></li>'; }).join('');
    function majResume() {
      if (choixJ === null || choixH === null) { res.textContent = choixJ === null ? 'Choisissez un jour, puis une heure.' : 'Choisissez maintenant une heure.'; env.setAttribute('aria-disabled', 'true'); return; }
      var x = jours[choixJ], quand = JOURS[x.js] + ' ' + x.d + ' ' + MOIS[x.m] + ' à ' + hfr(choixH);
      res.innerHTML = 'Rendez-vous <strong>' + quand + '</strong>, au showroom de Sélestat, pour une heure et demie.';
      env.setAttribute('aria-disabled', 'false');
      var corps = 'Bonjour,\n\nJe souhaite prendre rendez-vous au showroom le ' + quand + '.\n' + 'Ma cuisine sur votre site : ' + resume(config) + '\n' + lien() + '\n\nNom :\nTéléphone :\n\nMerci,\n';
      env.href = 'mailto:atelier@kuchel.example?subject=' + encodeURIComponent('Rendez-vous au showroom : ' + quand) + '&body=' + encodeURIComponent(corps);
    }
    ulJ.addEventListener('click', function (e) {
      var b = e.target.closest('.jour'); if (!b) return;
      choixJ = +b.getAttribute('data-i'); choixH = null;
      $$('.jour', ulJ).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      var x = jours[choixJ];
      ulH.innerHTML = x.heures.map(function (h) { var p = pris(x.j, h); return '<li><button type="button" class="heure" aria-pressed="false" data-h="' + h + '"' + (p ? ' disabled aria-label="' + hfr(h) + ', déjà réservé"' : '') + '>' + hfr(h) + '</button></li>'; }).join('');
      majResume();
      var premier = $('.heure:not(:disabled)', ulH); if (premier) premier.focus();
    });
    ulH.addEventListener('click', function (e) {
      var b = e.target.closest('.heure'); if (!b || b.disabled) return;
      choixH = +b.getAttribute('data-h');
      $$('.heure', ulH).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      majResume();
      dire('Créneau choisi : ' + res.textContent);
    });
  })();

  /* Le pied de page : les lettres s'étirent sous le pointeur ------------------------------------------------- */
  var elastique = $('[data-elastique]');
  if (elastique) {
    var lettres = elastique.textContent.trim().split('');
    elastique.innerHTML = lettres.map(function (l) { return '<span class="lettre">' + l + '</span>'; }).join('');
    // Le nom prend toute la largeur, comme le titre du haut
    var caler = function () { elastique.style.fontSize = ''; var W = elastique.parentNode.clientWidth - parseFloat(getComputedStyle(elastique.parentNode).paddingLeft) * 2; var w = elastique.getBoundingClientRect().width; if (w > 0) elastique.style.fontSize = (parseFloat(getComputedStyle(elastique).fontSize) * W / w * 0.985) + 'px'; };
    caler(); elastique.caler = caler;
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(caler);
    if (pointeurFin && !reduit) {
      var spans = $$('.lettre', elastique);
      elastique.addEventListener('pointermove', function (e) {
        spans.forEach(function (s) { var r = s.getBoundingClientRect(), d = Math.abs(e.clientX - (r.left + r.width / 2)); s.style.setProperty('--l', (125 - clamp(d / 260, 0, 1) * 55).toFixed(1) + '%'); });
      });
      elastique.addEventListener('pointerleave', function () { spans.forEach(function (s) { s.style.removeProperty('--l'); }); });
    }
  }

  /* Une seule boucle pour le défilement ------------------------------------------------------------------------- */
  var prevu = false;
  function maj() { prevu = false; majEntete(); majAtelier(); }
  window.addEventListener('scroll', function () { if (!prevu) { prevu = true; requestAnimationFrame(maj); } }, { passive: true });
  var largeur = vw;
  window.addEventListener('resize', function () {
    vw = window.innerWidth; vh = window.innerHeight;
    if (vw !== largeur) { largeur = vw; ajuster(false); if (elastique && elastique.caler) elastique.caler(); }
    mesurerAtelier(); maj();
  });
  maj();
})();
