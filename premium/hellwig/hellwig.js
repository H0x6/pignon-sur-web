/*!
 * hellwig.js — Domaine Hellwig (site d'exemple premium, Pignon sur Web)
 * Vidéo du coteau, mots qui s'allument, cadran de l'année, coupe du coteau,
 * vitrine des vins épinglée, commande et réservation. Sans dépendance.
 * Mouvement réduit : plus de parallaxe ni d'inertie, la vidéo ne démarre pas seule.
 */
(function () {
  'use strict';
  var doc = document;
  var root = doc.documentElement;
  var reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var annonce = $('[data-annonce]');
  var dire = function (t) { if (annonce) { annonce.textContent = ''; setTimeout(function () { annonce.textContent = t; }, 30); } };

  /* Heure de Paris -------------------------------------------------------- */
  function paris() {
    var d = new Date(), o = { jour: d.getDay(), min: d.getHours() * 60 + d.getMinutes(), mois: d.getMonth() + 1 };
    try {
      var p = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', weekday: 'short', hour: 'numeric', minute: 'numeric', month: 'numeric', hourCycle: 'h23' }).formatToParts(d);
      var g = function (t) { for (var i = 0; i < p.length; i++) if (p[i].type === t) return p[i].value; return ''; };
      o.jour = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g('weekday'));
      o.min = (parseInt(g('hour'), 10) % 24) * 60 + parseInt(g('minute'), 10);
      o.mois = parseInt(g('month'), 10);
    } catch (e) { /* heure de l'appareil */ }
    return o;
  }

  /* Caveau ouvert ou fermé : lundi au samedi, 9 h – 12 h et 14 h – 18 h 30 */
  var PLAGES = [[540, 720], [840, 1110]];
  var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var hfr = function (m) { var h = Math.floor(m / 60), r = m % 60; return h + ' h' + (r ? ' ' + (r < 10 ? '0' : '') + r : ''); };
  function statut() {
    var n = paris(), txt, etat;
    var ouvre = n.jour >= 1 && n.jour <= 6;
    var p = ouvre ? PLAGES.filter(function (x) { return n.min >= x[0] && n.min < x[1]; })[0] : null;
    if (p) { txt = 'Caveau ouvert jusqu’à ' + hfr(p[1]); etat = 'ouvert'; }
    else {
      var suiv = ouvre ? PLAGES.filter(function (x) { return x[0] > n.min; })[0] : null;
      if (suiv) txt = 'Caveau fermé, ouvre à ' + hfr(suiv[0]);
      else { var j = n.jour === 6 ? 1 : (n.jour + 1) % 7; if (j === 0) j = 1; txt = 'Caveau fermé, ouvre ' + (j === (n.jour + 1) % 7 ? 'demain' : JOURS[j]) + ' à 9 h'; }
      etat = 'ferme';
    }
    $$('[data-statut]').forEach(function (el) { el.textContent = txt; el.setAttribute('data-etat', etat); el.hidden = false; });
  }
  statut();
  setInterval(statut, 60000);

  /* En-tête : plein dès que la vidéo est quittée ; menu mobile ------------ */
  var entete = $('[data-entete]');
  var une = $('.une');
  if (entete && une && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { entete.classList.toggle('est-plein', !e[0].isIntersecting); }, { rootMargin: '-80px 0px 0px 0px' }).observe(une);
  }
  var burger = $('.burger'), nav = $('#nav');
  if (burger && nav) {
    var menu = function (o) { burger.setAttribute('aria-expanded', String(o)); if (o) nav.setAttribute('data-ouvert', ''); else nav.removeAttribute('data-ouvert'); };
    burger.addEventListener('click', function () { menu(burger.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) menu(false); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') { menu(false); burger.focus(); } });
  }

  /* Vidéo du coteau : la bonne taille selon l'écran, pause possible ------- */
  var video = $('[data-video]');
  var pause = $('[data-pause]');
  if (video) {
    var petit = window.matchMedia('(max-width: 699px)').matches;
    if (petit) video.poster = video.getAttribute('data-poster-petit');
    var econome = navigator.connection && navigator.connection.saveData;
    var lancer = function () {
      if (!video.src) { video.src = video.getAttribute(petit ? 'data-src-petit' : 'data-src-grand'); video.load(); }
      var p = video.play(); if (p && p.catch) p.catch(function () {});
    };
    video.addEventListener('playing', function () { video.classList.add('est-pret'); });
    if (!reduit && !econome) lancer();
    else if (pause) pause.setAttribute('aria-pressed', 'true');
    if (pause) {
      var majPause = function () { var arret = video.paused; pause.setAttribute('aria-pressed', String(arret)); pause.querySelector('.sr').textContent = arret ? 'Lire la vidéo' : 'Mettre la vidéo en pause'; };
      majPause();
      pause.addEventListener('click', function () { if (video.paused) lancer(); else video.pause(); setTimeout(majPause, 50); });
      video.addEventListener('pause', majPause); video.addEventListener('play', majPause);
    }
    // Hors de l'écran, la vidéo s'arrête (batterie, données)
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) {
      if (!video.src) return;
      if (!e[0].isIntersecting) video.pause(); else if (pause && pause.getAttribute('aria-pressed') !== 'true') { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
    }).observe(video);
  }
  // Vidéo de la section des vins : chargée et lue seulement quand elle est visible
  var vSec = $('[data-video-section]');
  if (vSec && !reduit && 'IntersectionObserver' in window) new IntersectionObserver(function (e) {
    if (getComputedStyle(vSec.parentNode).display === 'none') return;
    if (e[0].isIntersecting) { if (!vSec.src) vSec.src = vSec.getAttribute('data-src'); var p = vSec.play(); if (p && p.catch) p.catch(function () {}); } else vSec.pause();
  }).observe(vSec);

  /* Manifeste : un mot par <span> ------------------------------------------ */
  var manif = $('[data-mots]');
  var mots = [];
  if (manif) {
    manif.innerHTML = manif.textContent.trim().split(/\s+/).map(function (m) { return '<span class="mot">' + m + '</span>'; }).join(' ');
    mots = $$('.mot', manif);
    // Mouvement réduit : le texte est allumé d'emblée
    if (reduit) { mots.forEach(function (m) { m.classList.add('est-allume'); }); mots = []; }
  }

  /* L'année : le cadran ------------------------------------------------------ */
  var annee = $('[data-annee]');
  var A = null;
  if (annee) {
    var items = $$('[data-liste] > li', annee).map(function (li) {
      var h = li.querySelector('h3').textContent.split(' : ');
      return { m: +li.getAttribute('data-m'), nom: h[0], tache: h[1].charAt(0).toUpperCase() + h[1].slice(1), texte: li.querySelector('p').textContent, saison: li.getAttribute('data-saison'), photo: li.getAttribute('data-photo'), alt: li.getAttribute('data-alt') };
    });
    var TEINTES = ['#28323A', '#2A3134', '#2E3529', '#2C3B27', '#27402C', '#2E4427', '#3A4324', '#4A3F1F', '#4E3423', '#4A2D21', '#3C2C22', '#231C18'];
    // Les traits et les noms des mois, dessinés une fois
    var g = $('[data-traits]', annee);
    var svg = '<circle cx="100" cy="100" r="96"/><circle cx="100" cy="100" r="71"/>';
    for (var i = 0; i < 60; i++) {
      var a = i * 6 * Math.PI / 180, maj = i % 5 === 0, r1 = maj ? 86 : 90;
      svg += '<line' + (maj ? ' class="majeur"' : '') + ' x1="' + (100 + Math.sin(a) * r1).toFixed(2) + '" y1="' + (100 - Math.cos(a) * r1).toFixed(2) + '" x2="' + (100 + Math.sin(a) * 96).toFixed(2) + '" y2="' + (100 - Math.cos(a) * 96).toFixed(2) + '"/>';
    }
    var maintenant = paris().mois;
    items.forEach(function (it, k) {
      var ang = (k * 30 + 15);
      svg += '<g transform="rotate(' + ang + ' 100 100)"><text x="100" y="20.5" data-label="' + k + '">' + it.nom + '</text>' + (it.m === maintenant ? '<circle class="aujourdhui" cx="100" cy="29" r="1.6"/>' : '') + '</g>';
    });
    g.innerHTML = svg;
    var labels = $$('[data-label]', annee);
    // Les photos, chargées à l'approche
    var boitePhotos = $('[data-photos]', annee);
    var photos = items.map(function (it) {
      var img = doc.createElement('img');
      img.className = 'annee__photo'; img.alt = ''; img.decoding = 'async';
      img.setAttribute('data-src', 'img/' + it.photo + '-1600.webp');
      img.setAttribute('data-src-petit', 'img/' + it.photo + '-800.webp');
      boitePhotos.appendChild(img);
      return img;
    });
    var petitEcran = window.matchMedia('(max-width: 979px)').matches;
    var charge = function (k) { var img = photos[k]; if (img && !img.src) img.src = img.getAttribute(petitEcran ? 'data-src-petit' : 'data-src'); };
    A = {
      roue: $('[data-roue]', annee), num: $('[data-num]', annee), saison: $('[data-saison]', annee),
      bloc: $('.mois', annee), nom: $('[data-mois-nom]', annee), tache: $('[data-mois-tache]', annee), texte: $('[data-mois-texte]', annee), now: $('[data-maintenant]', annee),
      actif: -1, rot: 0, cible: 0, items: items, photos: photos, labels: labels, maintenant: maintenant
    };
    A.afficher = function (k) {
      if (k === A.actif) return;
      A.actif = k;
      var it = items[k];
      charge(k); charge(k + 1); charge(k - 1);
      photos.forEach(function (p, j) { p.classList.toggle('est-actif', j === k); });
      labels.forEach(function (l, j) { l.classList.toggle('est-actif', j === k); });
      annee.style.setProperty('--teinte', TEINTES[k]);
      A.num.textContent = (it.m < 10 ? '0' : '') + it.m;
      A.saison.textContent = it.saison;
      A.bloc.classList.add('change');
      requestAnimationFrame(function () {
        A.nom.textContent = it.nom;
        A.tache.textContent = it.tache;
        A.texte.textContent = it.texte;
        A.now.hidden = it.m !== maintenant;
        A.now.textContent = 'En ce moment au domaine';
        requestAnimationFrame(function () { A.bloc.classList.remove('change'); });
      });
    };
    A.afficher(0);
    charge(0);
  }

  /* Le coteau : choix d'une parcelle --------------------------------------- */
  var boutonsParcelle = $$('[data-parcelle]');
  boutonsParcelle.forEach(function (b) {
    b.addEventListener('click', function () {
      var id = b.getAttribute('data-parcelle');
      boutonsParcelle.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      $$('[data-fiche]').forEach(function (f) { f.hidden = f.getAttribute('data-fiche') !== id; });
    });
  });

  /* Vitrine des vins épinglée (grand écran) ----------------------------------- */
  var vins = $('[data-vins]');
  var piste = vins && $('.vins__liste', vins);
  var V = null;
  var grand = window.matchMedia('(min-width: 980px)');
  function preparerVins() {
    if (!vins) return;
    var epingle = grand.matches && !reduit;
    vins.classList.toggle('est-epingle', epingle);
    if (!epingle) { V = null; vins.style.removeProperty('--hauteur'); piste.style.transform = ''; return; }
    var deborde = Math.max(0, piste.scrollWidth - window.innerWidth);
    vins.style.setProperty('--hauteur', (window.innerHeight + deborde * 1.1) + 'px');
    V = { deborde: deborde };
  }
  // Au clavier : une bouteille qui reçoit le focus est amenée à l'écran
  if (vins) vins.addEventListener('focusin', function (e) {
    if (!V) return;
    var li = e.target.closest('.vin'); if (!li) return;
    var x = li.offsetLeft - window.innerWidth * 0.1;
    var p = clamp(x / V.deborde, 0, 1);
    var top = vins.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + p * (vins.offsetHeight - window.innerHeight), behavior: 'auto' });
  });

  /* Parallaxe (coteau, cave) -------------------------------------------------- */
  var plans = $$('[data-plan]');
  var coupe = $('.coupe');
  var paraCave = $$('[data-parallaxe]');

  /* Boucle de défilement : un seul calcul par image ---------------------------- */
  var vh = window.innerHeight;
  var attente = false;
  function progres(el) {
    var r = el.getBoundingClientRect();
    return { r: r, p: clamp(-r.top / Math.max(1, r.height - vh), 0, 1) };
  }
  function image() {
    attente = false;
    // Mots du manifeste : allumés au fil de la traversée de la section
    if (mots.length) {
      var r = manif.getBoundingClientRect();
      var t = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.3), 0, 1);
      var n = Math.round(t * mots.length);
      for (var i = 0; i < mots.length; i++) { var on = i < n; if (on !== mots[i]._on) { mots[i]._on = on; mots[i].classList.toggle('est-allume', on); } }
    }
    // Cadran : position continue de 0 à 12 mois
    if (A) {
      var pa = progres(annee);
      var x = clamp(pa.p * 12, 0, 11.999);
      A.afficher(Math.floor(x));
      A.cible = reduit ? -(Math.floor(x) + 0.5) * 30 : -(x - 0.5) * 30;
      relancer();
    }
    // Vitrine des vins : la piste avance avec le défilement
    if (V) {
      var pv = progres(vins);
      piste.style.transform = 'translate3d(' + (-pv.p * V.deborde).toFixed(1) + 'px,0,0)';
    }
    if (!reduit) {
      if (coupe) {
        var rc = coupe.getBoundingClientRect();
        if (rc.bottom > 0 && rc.top < vh) {
          var c = (rc.top + rc.height / 2 - vh / 2) / vh;
          plans.forEach(function (pl) { pl.style.transform = 'translateY(' + (c * 120 * parseFloat(pl.getAttribute('data-plan'))).toFixed(1) + 'px)'; });
        }
      }
      paraCave.forEach(function (f) {
        var rf = f.getBoundingClientRect();
        if (rf.bottom < 0 || rf.top > vh) return;
        var k = (rf.top + rf.height / 2 - vh / 2) / vh;
        f.firstElementChild.style.transform = 'translateY(' + (k * 100 * parseFloat(f.getAttribute('data-parallaxe'))).toFixed(1) + 'px)';
      });
    }
  }
  // Le cadran rattrape sa cible avec un peu d'inertie (sauf mouvement réduit) ; la boucle s'arrête à l'arrivée
  var tourne = false;
  function roue() {
    if (!A) return;
    A.rot += (A.cible - A.rot) * (reduit ? 1 : 0.14);
    if (Math.abs(A.cible - A.rot) < 0.01) A.rot = A.cible;
    A.roue.style.transform = 'rotate(' + A.rot.toFixed(2) + 'deg)';
    // Les noms du bas du cadran se retournent pour rester lisibles, comme sur une lunette de montre
    for (var k = 0; k < A.labels.length; k++) {
      var monde = (((k * 30 + 15 + A.rot) % 360) + 360) % 360;
      var bas = monde > 95 && monde < 265;
      if (bas !== A.labels[k]._bas) { A.labels[k]._bas = bas; A.labels[k].setAttribute('transform', bas ? 'rotate(180 100 20.5)' : ''); }
    }
    if (A.rot !== A.cible) requestAnimationFrame(roue); else tourne = false;
  }
  var relancer = function () { if (A && !tourne && A.rot !== A.cible) { tourne = true; requestAnimationFrame(roue); } };
  var demander = function () { if (!attente) { attente = true; requestAnimationFrame(image); } };
  window.addEventListener('scroll', demander, { passive: true });
  window.addEventListener('resize', function () { vh = window.innerHeight; preparerVins(); demander(); });
  if (grand.addEventListener) grand.addEventListener('change', function () { preparerVins(); demander(); });
  preparerVins();
  image();
  if (A) { A.rot = A.cible + 0.02; relancer(); }

  /* Ma commande ----------------------------------------------------------------- */
  var panier = {};
  var tiroir = $('[data-tiroir]');
  var lignes = $('[data-lignes]');
  var vide = $('[data-vide]');
  var formCmd = $('[data-commande]');
  var nbs = $$('[data-nb]');
  var euros = function (v) { return v.toLocaleString('fr-FR', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' €'; };
  function totaux() {
    var n = 0, t = 0;
    Object.keys(panier).forEach(function (k) { n += panier[k].q; t += panier[k].q * panier[k].prix; });
    return { n: n, t: t };
  }
  function rendre() {
    var tt = totaux();
    nbs.forEach(function (b) { b.textContent = tt.n; });
    $$('[data-ouvrir-commande]').forEach(function (b) { b.setAttribute('aria-label', 'Ma commande, ' + (tt.n ? tt.n + (tt.n > 1 ? ' bouteilles' : ' bouteille') : 'aucune bouteille')); });
    var ids = Object.keys(panier).filter(function (k) { return panier[k].q > 0; });
    vide.hidden = ids.length > 0;
    formCmd.hidden = ids.length === 0;
    lignes.innerHTML = ids.map(function (k) {
      var it = panier[k];
      return '<li class="ligne-cmd" data-id="' + k + '"><span class="ligne-cmd__nom">' + it.nom + '</span><span class="ligne-cmd__prix">' + euros(it.prix) + ' la bouteille</span>' +
        '<span class="compteur" role="group" aria-label="Quantité de ' + it.nom + '"><button type="button" data-q="-1" aria-label="Une bouteille de moins">−</button><output>' + it.q + '</output><button type="button" data-q="1" aria-label="Une bouteille de plus">+</button></span></li>';
    }).join('');
    $('[data-total]').textContent = euros(tt.t);
  }
  $$('[data-ajouter]').forEach(function (b) {
    b.addEventListener('click', function () {
      var li = b.closest('.vin'), id = li.getAttribute('data-vin');
      if (!panier[id]) panier[id] = { nom: li.getAttribute('data-nom'), prix: parseFloat(li.getAttribute('data-prix')), q: 0 };
      panier[id].q += 1;
      rendre();
      li.classList.remove('est-ajoute'); void li.offsetWidth; li.classList.add('est-ajoute');
      nbs.forEach(function (n) { n.classList.remove('tic'); void n.offsetWidth; n.classList.add('tic'); });
      b.textContent = 'Ajoutée (' + panier[id].q + ')';
      dire(panier[id].nom + ' ajouté à votre commande. ' + totaux().n + ' bouteilles au total.');
    });
  });
  if (lignes) lignes.addEventListener('click', function (e) {
    var b = e.target.closest('[data-q]'); if (!b) return;
    var id = b.closest('[data-id]').getAttribute('data-id');
    panier[id].q = Math.max(0, panier[id].q + parseInt(b.getAttribute('data-q'), 10));
    var bouton = $('.vin[data-vin="' + id + '"] [data-ajouter]');
    if (bouton) bouton.textContent = panier[id].q ? 'Ajoutée (' + panier[id].q + ')' : 'Ajouter';
    rendre();
    var garde = $('[data-id="' + id + '"] [data-q="' + b.getAttribute('data-q') + '"]', lignes) || $('[data-fermer-commande].tiroir__fermer');
    if (garde) garde.focus();
  });
  // Ouverture et fermeture du tiroir, focus gardé à l'intérieur
  var avant = null;
  function ouvrir() {
    avant = doc.activeElement;
    tiroir.hidden = false;
    requestAnimationFrame(function () { requestAnimationFrame(function () { tiroir.classList.add('est-ouvert'); }); });
    $('.tiroir__panneau').focus();
    doc.body.style.overflow = 'hidden';
  }
  function fermer() {
    tiroir.classList.remove('est-ouvert');
    doc.body.style.overflow = '';
    setTimeout(function () { tiroir.hidden = true; }, reduit ? 200 : 380);
    if (avant) avant.focus();
  }
  $$('[data-ouvrir-commande]').forEach(function (b) { b.addEventListener('click', ouvrir); });
  $$('[data-fermer-commande]').forEach(function (b) { b.addEventListener('click', fermer); });
  doc.addEventListener('keydown', function (e) {
    if (tiroir.hidden) return;
    if (e.key === 'Escape') fermer();
    if (e.key === 'Tab') {
      var f = $$('button, input, a[href], output', $('.tiroir__panneau')).filter(function (x) { return x.offsetParent !== null && x.tagName !== 'OUTPUT'; });
      if (!f.length) return;
      if (e.shiftKey && doc.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && doc.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  function verifier(form) {
    var err = $('[data-erreur]', form), manque = null;
    $$('[required]', form).forEach(function (c) {
      var ok = c.type === 'checkbox' ? c.checked : c.value.trim() !== '';
      if (c.type !== 'checkbox') c.setAttribute('aria-invalid', String(!ok));
      if (!ok && !manque) manque = c;
    });
    if (manque) {
      err.textContent = manque.type === 'checkbox' ? 'Cochez la case pour confirmer que vous avez 18 ans ou plus.' : 'Indiquez votre ' + (manque.name === 'tel' ? 'téléphone' : 'nom') + ' pour qu’on puisse vous rappeler.';
      err.hidden = false; manque.focus(); return false;
    }
    err.hidden = true; return true;
  }
  if (formCmd) formCmd.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!verifier(formCmd)) return;
    var tt = totaux();
    var corps = Object.keys(panier).filter(function (k) { return panier[k].q; }).map(function (k) { return panier[k].q + ' × ' + panier[k].nom; }).join('\n') +
      '\n\nTotal : ' + euros(tt.t) + '\n' + formCmd.elements.mode.value + '\n\n' + formCmd.elements.nom.value + '\n' + formCmd.elements.tel.value;
    window.location.href = 'mailto:caveau@domaine-hellwig.example?subject=' + encodeURIComponent('Commande de ' + tt.n + ' bouteilles') + '&body=' + encodeURIComponent(corps);
  });

  /* Réservation d'une visite des foudres ----------------------------------------- */
  var resa = $('[data-resa]');
  if (resa) {
    var boite = $('[data-dates]', resa);
    // Les six prochains samedis (le premier : le samedi qui vient, jamais aujourd'hui)
    var d = new Date(); d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + (((6 - d.getDay()) + 7) % 7 || 7));
    var html = '';
    for (var s = 0; s < 6; s++) {
      var j = d.getDate(), mois = d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
      var complet = s === 1; // un samedi déjà complet, pour l'exemple
      html += '<label class="choix"><input type="radio" name="date" value="samedi ' + j + ' ' + d.toLocaleDateString('fr-FR', { month: 'long' }) + '"' + (s === 0 ? ' checked' : '') + (complet ? ' disabled' : '') + '><span>' + j + ' ' + mois + (complet ? '<small>complet</small>' : '') + '</span></label>';
      d.setDate(d.getDate() + 7);
    }
    boite.innerHTML = html;
    var pers = 2, sortie = $('[data-pers]', resa), recap = $('[data-recap]', resa);
    var maj = function () {
      sortie.textContent = pers;
      var date = resa.querySelector('[name="date"]:checked'), heure = resa.querySelector('[name="heure"]:checked');
      recap.textContent = (date ? date.value.charAt(0).toUpperCase() + date.value.slice(1) : '') + ' à ' + heure.value + ', ' + pers + (pers > 1 ? ' personnes' : ' personne') + ' : ' + euros(pers * 12) + ', offerts dès 6 bouteilles.';
    };
    $('[data-moins]', resa).addEventListener('click', function () { pers = Math.max(1, pers - 1); maj(); });
    $('[data-plus]', resa).addEventListener('click', function () { pers = Math.min(12, pers + 1); maj(); });
    resa.addEventListener('change', maj);
    maj();
    resa.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!verifier(resa)) return;
      window.location.href = 'mailto:caveau@domaine-hellwig.example?subject=' + encodeURIComponent('Visite des foudres') + '&body=' + encodeURIComponent(recap.textContent + '\n\n' + resa.elements.nom.value + '\n' + resa.elements.tel.value + '\n' + resa.elements.email.value);
    });
  }

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
})();
