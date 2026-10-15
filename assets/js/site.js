/*!
 * site.js — comportements communs à toutes les pages :
 * menus, volets, apparitions, images, comparateur avant / après,
 * et petits outils de mouvement partagés (window.PSW_UI) pour les autres scripts.
 *
 * Règles de mouvement (Emil Kowalski) appliquées ici :
 * - une action faite au clavier ne s'anime jamais ;
 * - ce qui entre : ease-out ; ce qui se déplace à l'écran : ease-in-out ;
 * - on referme plus vite qu'on n'ouvre ;
 * - mouvement réduit : pas de déplacement, seulement des fondus.
 */
(function () {
  'use strict';
  var doc = document;
  var root = doc.documentElement;
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
  var EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)';
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };

  /* Clavier ou pointeur ? ----------------------------------------------
     On retient la dernière façon d'agir : un changement fait au clavier (flèches dans un groupe
     de choix, Entrée sur un bouton) s'applique instantanément. */
  var lastInput = 'pointer';
  doc.addEventListener('keydown', function (e) {
    if (!e.metaKey && !e.ctrlKey && !e.altKey) lastInput = 'keyboard';
  }, true);
  doc.addEventListener('pointerdown', function () { lastInput = 'pointer'; }, true);
  // Un « click » produit par le clavier (Entrée, Espace) a e.detail === 0
  var byKeyboard = function (e) { return (e && e.type === 'click') ? e.detail === 0 : lastInput === 'keyboard'; };

  // Coupe les transitions d'un élément le temps d'un changement d'état (voir [data-instant] dans site.css)
  function instant(el) {
    if (!el) return;
    el.setAttribute('data-instant', '');
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.removeAttribute('data-instant'); }); });
  }

  /* Fondu enchaîné d'un changement d'état (View Transitions) ------------
     Seuls les éléments passés dans `els` sont capturés ; le reste de la page reste vivant.
     Sans prise en charge, au clavier, ou avec le mouvement réduit : changement immédiat. */
  var vtToken = 0;
  var vtEls = [];
  var vtCls = null;
  function vtClear() {
    vtEls.forEach(function (el) { el.style.viewTransitionName = ''; });
    vtEls = [];
    root.classList.remove('vt-local');
    if (vtCls) root.classList.remove(vtCls);
    vtCls = null;
  }
  function vt(update, o) {
    o = o || {};
    if (!doc.startViewTransition || reduceMotion || o.instant) { update(); return; }
    // Une transition encore en cours est abandonnée par le navigateur : on retire ses noms
    // pour qu'aucun ne soit en double dans la nouvelle.
    vtClear();
    var token = ++vtToken;
    var prefix = o.prefix || 'psw-vt';
    vtEls = (o.els || []).filter(Boolean);
    vtCls = o.cls || null;
    vtEls.forEach(function (el, i) { el.style.viewTransitionName = el.getAttribute('data-vt-name') || (prefix + '-' + i); });
    root.classList.add('vt-local');
    if (vtCls) root.classList.add(vtCls);
    var done = function () { if (token === vtToken) vtClear(); };
    try {
      var t = doc.startViewTransition(update);
      t.finished.then(done, done);
    } catch (err) { update(); done(); }
  }

  /* Petit « tic » sur une valeur qui vient de changer (total, score) : elle remonte de 4 px
     en se défloutant, 200 ms. Indique l'état sans faire défiler de chiffres. */
  function tick(el, e) {
    if (!el || reduceMotion || !el.animate || byKeyboard(e)) return;
    el.animate([
      { opacity: 0.25, transform: 'translateY(4px)', filter: 'blur(2px)' },
      { opacity: 1, transform: 'none', filter: 'none' }
    ], { duration: 200, easing: EASE_OUT });
  }

  // Apparition d'un message (statut d'un formulaire, lien copié)
  function appear(el) {
    if (!el || !el.animate || !el.textContent) return;
    el.animate(reduceMotion
      ? [{ opacity: 0 }, { opacity: 1 }]
      : [{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }],
    { duration: 200, easing: EASE_OUT });
  }

  /* Mesure d'audience sans cookie (Umami ou Plausible, si réglée dans site.config.json) --------
     mesure('Demande de maquette', { formule: '…' }) envoie un évènement ; sans outil, rien ne se passe.
     « depuis » : la page du site d'où vient le visiteur (pour savoir quelles pages amènent des demandes). */
  function depuis() {
    try {
      var r = doc.referrer ? new URL(doc.referrer) : null;
      if (r && r.host === location.host) return r.pathname.replace(/^.*\//, '') || 'index.html';
      return r ? 'externe : ' + r.host.replace(/^www\./, '') : 'accès direct';
    } catch (err) { return ''; }
  }
  function mesure(nom, props) {
    props = props || {};
    try {
      if (window.umami && typeof window.umami.track === 'function') window.umami.track(nom, props);
      else if (typeof window.plausible === 'function') window.plausible(nom, { props: props });
    } catch (err) { /* la mesure ne doit jamais gêner la page */ }
  }
  // Clics à mesurer : liens marqués data-mesure, adresses e-mail et numéros de téléphone
  doc.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href], button[data-mesure]') : null;
    if (!a) return;
    var page = location.pathname.replace(/^.*\//, '') || 'index.html';
    var h = a.getAttribute('href') || '';
    if (a.hasAttribute('data-mesure')) mesure(a.getAttribute('data-mesure'), { page: page });
    else if (/^mailto:/.test(h)) mesure('Clic e-mail', { page: page });
    else if (/^tel:/.test(h)) mesure('Clic téléphone', { page: page });
  }, true);

  window.PSW_UI = { vt: vt, tick: tick, appear: appear, instant: instant, byKeyboard: byKeyboard, reduceMotion: reduceMotion, EASE_OUT: EASE_OUT, EASE_IN_OUT: EASE_IN_OUT, mesure: mesure, depuis: depuis };

  /* Menu mobile ------------------------------------------------------ */
  var header = doc.querySelector('.site-header');
  // En redimensionnant (rotation d'une tablette, fenêtre qu'on élargit), l'en-tête change de
  // disposition : sans ça, le menu fermé « clignoterait » le temps de sa transition de sortie.
  window.addEventListener('resize', function () { instant(header); });
  var toggle = doc.querySelector('.nav-toggle');
  var nav = doc.getElementById('menu-principal');
  if (toggle && nav) {
    var label = toggle.querySelector('.nav-toggle__label');
    var isOpen = function () { return toggle.getAttribute('aria-expanded') === 'true'; };
    var setOpen = function (open, focusToggle, now) {
      if (now) instant(header);
      toggle.setAttribute('aria-expanded', String(open));
      if (open) nav.setAttribute('data-open', '');
      else nav.removeAttribute('data-open');
      if (label) label.textContent = open ? 'Fermer' : 'Menu';
      if (!open && focusToggle) toggle.focus();
    };
    toggle.addEventListener('click', function (e) { setOpen(!isOpen(), false, byKeyboard(e)); });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) setOpen(false, true, true);
    });
    doc.addEventListener('click', function (e) {
      if (isOpen() && !nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });
    nav.addEventListener('focusout', function (e) {
      if (isOpen() && e.relatedTarget && !nav.contains(e.relatedTarget) && e.relatedTarget !== toggle) setOpen(false, false, true);
    });
    if (window.matchMedia) {
      var mq = window.matchMedia('(min-width: 72rem)');
      var onChange = function () { if (mq.matches) setOpen(false, false, true); };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
  }

  /* Sous-menu « Ressources » ----------------------------------------- */
  var subBtn = doc.querySelector('.nav__sub-toggle');
  if (subBtn) {
    var subItem = subBtn.parentNode;
    var subOpen = function () { return subBtn.getAttribute('aria-expanded') === 'true'; };
    var setSub = function (open, focusBtn, now) {
      if (now) instant(subItem);
      subBtn.setAttribute('aria-expanded', String(open));
      if (!open && focusBtn) subBtn.focus();
    };
    subBtn.addEventListener('click', function (e) { setSub(!subOpen(), false, byKeyboard(e)); });
    doc.addEventListener('click', function (e) { if (subOpen() && !subItem.contains(e.target)) setSub(false); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && subOpen()) setSub(false, true, true); });
    subItem.addEventListener('focusout', function (e) { if (subOpen() && e.relatedTarget && !subItem.contains(e.relatedTarget)) setSub(false, false, true); });
  }

  /* Volets (FAQ…) ouverts au clavier : instantanés ------------------- */
  doc.addEventListener('click', function (e) {
    var sum = e.target.closest ? e.target.closest('summary') : null;
    if (sum && byKeyboard(e)) instant(sum.parentNode);
  }, true);

  /* Vidéo de vitrine (site premium sur l'accueil) ---------------------
     Chargée et lue seulement quand elle est à l'écran ; jamais d'elle-même avec le mouvement
     réduit ou l'économie de données ; un bouton permet de la mettre en pause. */
  each(doc.querySelectorAll('[data-video-vitrine]'), function (v) {
    var btn = v.parentNode.parentNode.querySelector('[data-pause-vitrine]');
    var econome = navigator.connection && navigator.connection.saveData;
    var arret = reduceMotion || econome;
    var lire = function () { if (!v.src) v.src = v.getAttribute('data-src'); var p = v.play(); if (p && p.catch) p.catch(function () {}); };
    var maj = function () {
      if (!btn) return;
      btn.hidden = false;
      btn.setAttribute('aria-pressed', String(arret));
      btn.querySelector('.visually-hidden').textContent = arret ? 'Lire la vid\u00e9o' : 'Mettre la vid\u00e9o en pause';
    };
    maj();
    if (btn) btn.addEventListener('click', function () { arret = !arret; if (arret) v.pause(); else lire(); maj(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { if (e[0].isIntersecting && !arret) lire(); else v.pause(); }, { rootMargin: '120px 0px' }).observe(v);
    }
  });

  /* Sites premium de l'accueil : un onglet par site ------------------
     L'onglet change la vidéo du cadre, l'adresse, la capture du téléphone et le lien.
     Flèches gauche/droite, Début et Fin pour passer d'un onglet à l'autre. */
  var prem = doc.querySelector('[data-premium]');
  if (prem) {
    var onglets = prem.querySelectorAll('[data-onglet]');
    var pVideo = prem.querySelector('[data-video-vitrine]'), pUrl = prem.querySelector('[data-premium-url]'), pLien = prem.querySelector('[data-premium-lien]'), pPanneau = prem.querySelector('[role="tabpanel"]');
    var choisirOnglet = function (t, focus) {
      if (t.getAttribute('aria-selected') === 'true') { if (focus) t.focus(); return; }
      each(onglets, function (x) { var on = x === t; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; });
      pPanneau.setAttribute('aria-labelledby', t.id);
      if (pUrl) pUrl.textContent = t.getAttribute('data-url');
      if (pLien) { pLien.href = t.getAttribute('data-lien'); pLien.textContent = t.getAttribute('data-cta'); }
      each(prem.querySelectorAll('[data-tel]'), function (tel) { tel.hidden = tel.getAttribute('data-tel') !== t.getAttribute('data-onglet'); });
      if (pVideo) {
        var enLecture = !pVideo.paused;
        pVideo.classList.add('est-change');
        setTimeout(function () {
          pVideo.poster = t.getAttribute('data-poster');
          pVideo.setAttribute('data-src', t.getAttribute('data-clip'));
          if (pVideo.getAttribute('src')) { pVideo.src = t.getAttribute('data-clip'); if (enLecture) { var pr = pVideo.play(); if (pr && pr.catch) pr.catch(function () {}); } }
          pVideo.classList.remove('est-change');
        }, reduceMotion ? 0 : 160);
      }
      if (focus) t.focus();
    };
    each(onglets, function (t, i) {
      t.addEventListener('click', function () { choisirOnglet(t); });
      t.addEventListener('keydown', function (e) {
        var n = onglets.length, j = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % n;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + n) % n;
        else if (e.key === 'Home') j = 0;
        else if (e.key === 'End') j = n - 1;
        if (j !== null) { e.preventDefault(); choisirOnglet(onglets[j], true); }
      });
    });
  }

  /* Apparition des sections au défilement -----------------------------
     Rien n'est masqué sans JavaScript ni quand le mouvement est réduit : la classe .anim
     n'est posée qu'ici, après avoir marqué comme visibles les éléments déjà à l'écran.
     Les éléments qui entrent dans l'écran au même moment se suivent à 60 ms d'écart. */
  var reveal = doc.querySelectorAll('[data-reveal]');
  if (!reduceMotion && reveal.length && 'IntersectionObserver' in window) {
    var vh = window.innerHeight || root.clientHeight;
    each(reveal, function (el) {
      if (el.hasAttribute('data-stagger')) each(el.children, function (c, i) { c.style.setProperty('--i', Math.min(i, 5)); });
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) el.classList.add('is-in');
    });
    root.classList.add('anim');
    var seen = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (e) { return e.isIntersecting; })
        .sort(function (a, b) { return (a.boundingClientRect.top - b.boundingClientRect.top) || (a.boundingClientRect.left - b.boundingClientRect.left); });
      batch.forEach(function (e, n) {
        if (!e.target.hasAttribute('data-stagger')) e.target.style.setProperty('--i', Math.min(n, 4));
        e.target.classList.add('is-in');
        seen.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    each(reveal, function (el) { if (!el.classList.contains('is-in')) seen.observe(el); });
    // Impression : tout afficher
    window.addEventListener('beforeprint', function () { each(reveal, function (el) { el.classList.add('is-in'); }); });
  }

  /* Images chargées à la demande : fondu à l'arrivée ------------------ */
  if (!reduceMotion) {
    each(doc.querySelectorAll('img[loading="lazy"]'), function (img) {
      if (img.complete) return;
      img.classList.add('img-attente');
      var show = function () { img.classList.remove('img-attente'); };
      img.addEventListener('load', show, { once: true });
      img.addEventListener('error', show, { once: true });
    });
  }

  /* Comparateur avant / après ----------------------------------------
     La position est appliquée directement sur les deux éléments qui bougent (clip-path de la
     couche « avant », transform de la poignée), jamais via une variable CSS du parent : sinon
     chaque image recalculait les styles de tout l'ancien site. */
  var device = doc.querySelector('[data-ba]');
  if (device) {
    var range = device.querySelector('.ba__range');
    var screen = device.querySelector('.ba__screen');
    var before = device.querySelector('.ba__before');
    var handle = device.querySelector('.ba__handle');
    var pos = 50;
    var intro = null;      // animations d'invitation en cours
    var touched = false;
    var pointerId = null;  // un seul doigt à la fois
    var startX = 0;

    var paint = function (v) {
      before.style.clipPath = 'inset(0 ' + (100 - v).toFixed(2) + '% 0 0)';
      handle.style.transform = 'translateX(' + (v - 50).toFixed(2) + '%)';
    };
    var set = function (v) {
      // Bornes 10-90 % : la poignée reste entière dans l'écran et les deux versions restent visibles
      pos = Math.max(10, Math.min(90, v));
      paint(pos);
      var r = Math.round(pos);
      if (+range.value !== r) range.value = r;
      range.setAttribute('aria-valuetext', r + ' % de l\'ancien site');
    };
    // Interrompt l'invitation là où elle en est (pas de saut) avant de rendre la main
    var stopIntro = function () {
      touched = true;
      if (!intro) return;
      var m = /translateX\((-?[\d.]+)%\)/.exec(handle.style.transform);
      var current = getComputedStyle(handle).transform;
      var px = current && current !== 'none' ? parseFloat(current.split(',')[4]) : 0;
      var w = handle.getBoundingClientRect().width || 1;
      intro.forEach(function (a) { a.cancel(); });
      intro = null;
      set(m && !px ? 50 + parseFloat(m[1]) : 50 + (px / w) * 100);
    };
    var fromPointer = function (e) {
      var rect = screen.getBoundingClientRect();
      return ((e.clientX - rect.left) / rect.width) * 100;
    };

    // Clavier : la valeur change instantanément
    range.addEventListener('focus', stopIntro);
    range.addEventListener('input', function () { stopIntro(); device.classList.remove('is-jumping'); set(+range.value); });

    // Empêche le glisser-déposer natif de la capture, qui interromprait le curseur
    device.addEventListener('dragstart', function (e) { e.preventDefault(); });
    device.addEventListener('pointerdown', function (e) {
      if (pointerId !== null) return; // un deuxième doigt ne reprend pas la poignée
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      pointerId = e.pointerId;
      startX = e.clientX;
      stopIntro();
      try { device.setPointerCapture(e.pointerId); } catch (err) { /* ignoré */ }
      device.classList.add('is-dragging');
      // La poignée glisse jusqu'au point touché ; ensuite elle suit le doigt sans délai
      if (!reduceMotion) device.classList.add('is-jumping');
      set(fromPointer(e));
    });
    device.addEventListener('pointermove', function (e) {
      if (e.pointerId !== pointerId) return;
      if (Math.abs(e.clientX - startX) > 3) device.classList.remove('is-jumping');
      set(fromPointer(e));
    });
    var release = function (e) {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      device.classList.remove('is-dragging');
      setTimeout(function () { device.classList.remove('is-jumping'); }, 240);
    };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (type) { device.addEventListener(type, release); });

    set(50);

    // Une seule invitation, quand le téléphone est bien visible : la poignée part vers la droite,
    // passe à gauche, revient au centre. Animée par le navigateur (WAAPI), donc fluide même
    // pendant la fin du chargement de la page.
    if (!reduceMotion && 'IntersectionObserver' in window && before.animate) {
      var io = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        if (touched) return;
        var stops = [50, 72, 34, 50];
        var offsets = [0, 0.4, 0.78, 1];
        var opts = { duration: 1900, delay: 950, easing: 'linear', fill: 'both' };
        var clipFrames = stops.map(function (v, i) { return { clipPath: 'inset(0 ' + (100 - v) + '% 0 0)', offset: offsets[i], easing: EASE_IN_OUT }; });
        var handleFrames = stops.map(function (v, i) { return { transform: 'translateX(' + (v - 50) + '%)', offset: offsets[i], easing: EASE_IN_OUT }; });
        intro = [before.animate(clipFrames, opts), handle.animate(handleFrames, opts)];
        intro[0].onfinish = function () { if (intro) { intro.forEach(function (a) { a.cancel(); }); intro = null; set(50); } };
      }, { threshold: 0.5 });
      io.observe(device);
    }
  }
})();
