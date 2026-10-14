/*!
 * gabarit.js — comportements des sites générés : menu mobile, apparition des sections
 * au défilement, images, volets et formulaire de contact.
 * Sans dépendance, sans cookie.
 *
 * Mouvement : une action au clavier ne s'anime jamais ; mouvement réduit = fondus seulement.
 */
(function () {
  'use strict';
  var doc = document;
  var root = doc.querySelector('.pv');
  var mode = root ? root.getAttribute('data-mode') : 'production';
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };

  /* Aperçus (sites d'exemple) ----------------------------------------
     ?palette=2 applique une autre palette du design ; ?apercu masque le bandeau et la barre d'action.
     Les liens internes gardent ces réglages d'une page à l'autre. */
  var query = '';
  if (root && mode === 'exemple' && window.URLSearchParams) {
    var q = new URLSearchParams(location.search);
    var keep = [];
    if (q.has('apercu')) { root.classList.add('pv-apercu'); keep.push('apercu'); }
    var pal = parseInt(q.get('palette'), 10);
    if (pal > 0 && root.hasAttribute('data-palettes')) {
      try {
        var v = JSON.parse(root.getAttribute('data-palettes'))[pal - 1];
        if (v) {
          for (var k in v) if (Object.prototype.hasOwnProperty.call(v, k)) root.style.setProperty(k, v[k]);
          root.className = root.className.replace(/\bpv-palette--\d+\b/, 'pv-palette--' + pal);
          doc.body.style.background = v['--p-bg'];
          keep.push('palette=' + pal);
        }
      } catch (err) { /* aperçu ignoré */ }
    }
    query = keep.length ? '?' + keep.join('&') : '';
    if (query) {
      each(doc.querySelectorAll('a[href]'), function (a) {
        var h = a.getAttribute('href');
        if (/^[\w-]+\.html(#.*)?$/.test(h)) a.setAttribute('href', h.replace(/(#.*)?$/, query + '$1'));
      });
    }
  }

  // Coupe les transitions le temps d'un changement d'état déclenché au clavier
  function instant(el) {
    if (!el) return;
    el.setAttribute('data-instant', '');
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.removeAttribute('data-instant'); }); });
  }
  // Un « click » produit par le clavier (Entrée, Espace) a e.detail === 0
  var byKeyboard = function (e) { return e && e.type === 'click' && e.detail === 0; };

  /* Menu mobile ------------------------------------------------------ */
  var btn = doc.querySelector('.pv-burger-btn');
  var menu = doc.getElementById('pv-menu');
  if (btn && menu) {
    var nav = btn.closest('.pv-nav') || btn.parentNode;
    // Changement de disposition en redimensionnant : pas de « clignotement » du menu fermé
    window.addEventListener('resize', function () { instant(nav); });
    var label = btn.querySelector('.pv-sr');
    var setOpen = function (open, focusBtn, now) {
      if (now) instant(nav);
      btn.setAttribute('aria-expanded', String(open));
      if (open) menu.setAttribute('data-open', ''); else menu.removeAttribute('data-open');
      if (label) label.textContent = open ? 'Fermer le menu' : 'Menu';
      if (!open && focusBtn) btn.focus();
    };
    btn.addEventListener('click', function (e) { setOpen(btn.getAttribute('aria-expanded') !== 'true', false, byKeyboard(e)); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') setOpen(false, true, true); });
    doc.addEventListener('click', function (e) { if (btn.getAttribute('aria-expanded') === 'true' && !menu.contains(e.target) && !btn.contains(e.target)) setOpen(false); });
    menu.addEventListener('focusout', function (e) {
      if (btn.getAttribute('aria-expanded') === 'true' && e.relatedTarget && !menu.contains(e.relatedTarget) && e.relatedTarget !== btn) setOpen(false, false, true);
    });
  }

  /* Volets (FAQ) ouverts au clavier : instantanés --------------------- */
  doc.addEventListener('click', function (e) {
    var sum = e.target.closest ? e.target.closest('summary') : null;
    if (sum && byKeyboard(e)) instant(sum.parentNode);
  }, true);

  /* Ouvert ou fermé en ce moment (heure de Paris) -----------------------
     À partir des horaires schema.org : « Mo-Fr 08:00-12:00 », « Sa 08:00-12:00 ». */
  var statuts = doc.querySelectorAll('.pv-statut[data-horaires]');
  if (statuts.length) {
    var JOURS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    var NOMS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    var hfr = function (m) { var h = Math.floor(m / 60) % 24, r = m % 60; return h + ' h' + (r ? ' ' + (r < 10 ? '0' : '') + r : ''); };
    var maintenantParis = function () {
      var d = new Date(), o = { jour: d.getDay(), min: d.getHours() * 60 + d.getMinutes() };
      try {
        var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(d);
        var get = function (t) { for (var i = 0; i < parts.length; i++) if (parts[i].type === t) return parts[i].value; return ''; };
        o.jour = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
        o.min = (parseInt(get('hour'), 10) % 24) * 60 + parseInt(get('minute'), 10);
      } catch (err) { /* heure de l'appareil */ }
      return o;
    };
    // [[jour, début, fin], …] en minutes
    var plages = function (liste) {
      var out = [];
      liste.forEach(function (ligne) {
        var m = String(ligne).match(/^([A-Za-z,\- ]+)\s+(\d{2}):(\d{2})-(\d{2}):(\d{2})$/);
        if (!m) return;
        var jours = [];
        m[1].replace(/\s/g, '').split(',').forEach(function (bloc) {
          var b = bloc.split('-'), a = JOURS.indexOf(b[0]), z = JOURS.indexOf(b[1] || b[0]);
          if (a < 0 || z < 0) return;
          for (var j = a; ; j = (j + 1) % 7) { jours.push(j); if (j === z) break; }
        });
        jours.forEach(function (j) { out.push([j, +m[2] * 60 + +m[3], +m[4] * 60 + +m[5]]); });
      });
      return out;
    };
    var majStatut = function (el, P) {
      var n = maintenantParis(), i, k, ouvert = null, prochain = null;
      for (i = 0; i < P.length; i++) if (P[i][0] === n.jour && n.min >= P[i][1] && n.min < P[i][2]) ouvert = P[i];
      if (!ouvert) {
        for (k = 0; k < 8 && !prochain; k++) {
          var j = (n.jour + k) % 7, cand = P.filter(function (p) { return p[0] === j && (k > 0 || p[1] > n.min); }).sort(function (a, b) { return a[1] - b[1]; });
          if (cand.length) prochain = { k: k, p: cand[0] };
        }
      }
      if (ouvert) {
        // Une pause de midi suivie d'une réouverture : on annonce la fermeture de la plage en cours
        el.textContent = 'Ouvert jusqu’à ' + hfr(ouvert[2]);
        el.setAttribute('data-etat', 'ouvert');
      } else if (prochain) {
        var quand = prochain.k === 0 ? '' : prochain.k === 1 ? ' demain' : ' ' + NOMS[prochain.p[0]];
        el.textContent = 'Fermé, ouvre' + quand + ' à ' + hfr(prochain.p[1]);
        el.setAttribute('data-etat', 'ferme');
      } else return;
      el.hidden = false;
    };
    each(statuts, function (el) {
      var P = [];
      try { P = plages(JSON.parse(el.getAttribute('data-horaires'))); } catch (err) { return; }
      if (!P.length) return;
      majStatut(el, P);
      setInterval(function () { majStatut(el, P); }, 60000);
    });
  }

  /* Calendrier de l'année (design Cabinet) : le mois en cours, sinon le prochain */
  var cal = doc.querySelector('[data-calendrier]');
  if (cal) {
    var mois = new Date().getMonth() + 1;
    var items = cal.querySelectorAll('[data-mois]');
    var cible = null, ecart = 13;
    each(items, function (li) {
      (li.getAttribute('data-mois') || '').split(',').forEach(function (v) {
        var m = parseInt(v, 10);
        if (!m) return;
        var d = (m - mois + 12) % 12;
        if (d < ecart) { ecart = d; cible = li; }
      });
    });
    if (cible) {
      cible.classList.add('ca-mois-item--actuel');
      var badge = doc.createElement('span');
      badge.className = 'ca-mois-badge';
      badge.textContent = ecart === 0 ? 'Ce mois-ci' : 'À venir';
      cible.insertBefore(badge, cible.firstChild);
    }
  }

  /* Fournées (design Fournil) ------------------------------------------
     L'heure de la prochaine sortie du four, à l'heure de Paris, mise à jour chaque minute,
     et le repère « Maintenant » sur la frise de la journée. */
  var fo = doc.querySelector('[data-fournees]');
  if (fo) {
    var J = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    var data = {};
    try { data = JSON.parse(fo.getAttribute('data-fournees')); } catch (err) { data = {}; }
    var liste = data.fournees || [];
    var fermes = data.fermes || [];
    var paris = function () {
      var o = { jour: new Date().getDay(), min: new Date().getHours() * 60 + new Date().getMinutes() };
      try {
        var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
        var get = function (t) { for (var i = 0; i < parts.length; i++) if (parts[i].type === t) return parts[i].value; return ''; };
        o.jour = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
        o.min = (parseInt(get('hour'), 10) % 24) * 60 + parseInt(get('minute'), 10);
      } catch (err) { /* heure locale de l'appareil */ }
      return o;
    };
    var duJour = function (j) { return fermes.indexOf(j) >= 0 ? [] : liste.filter(function (f) { return j !== 0 || f.dimanche; }); };
    var duree = function (m) { var h = Math.floor(m / 60), r = m % 60; return h ? h + ' h' + (r ? ' ' + (r < 10 ? '0' : '') + r : '') : r + ' min'; };
    var champ = function (cls) { return fo.querySelector('.' + cls); };
    var frise = doc.querySelector('.fo-frise');
    var repere = doc.querySelector('.fo-maintenant');
    var maj = function () {
      var n = paris();
      var auj = duJour(n.jour);
      var sortie = null, suiv = null, jourSuiv = n.jour, i;
      for (i = 0; i < auj.length; i++) {
        if (n.min >= auj[i].min && n.min - auj[i].min <= 20) sortie = auj[i];
        if (!suiv && auj[i].min > n.min) suiv = auj[i];
      }
      var titre, f, delai;
      if (sortie) { f = sortie; titre = 'Tout juste sorti du four'; delai = n.min === sortie.min ? 'à l’instant' : 'il y a ' + (n.min - sortie.min) + ' min'; }
      else if (suiv) { f = suiv; titre = 'Prochaine sortie du four'; delai = 'dans ' + duree(suiv.min - n.min); }
      else {
        for (i = 1; i <= 7; i++) { jourSuiv = (n.jour + i) % 7; if (duJour(jourSuiv).length) { f = duJour(jourSuiv)[0]; break; } }
        titre = 'Prochaine sortie du four';
        delai = fermes.indexOf(n.jour) >= 0 ? 'Fermé aujourd’hui, rendez-vous ' + J[jourSuiv] : (jourSuiv === (n.jour + 1) % 7 ? 'demain' : J[jourSuiv]);
      }
      if (f) {
        champ('fo-prochaine-titre').textContent = titre;
        champ('fo-prochaine-heure').textContent = f.heure;
        champ('fo-prochaine-quoi').textContent = f.titre;
        var d = champ('fo-prochaine-delai');
        d.textContent = delai; d.hidden = false;
        fo.classList.toggle('fo-prochaine--chaud', !!sortie);
      }
      if (frise) {
        each(frise.querySelectorAll('.fo-fournee'), function (li) {
          var m = parseInt(li.getAttribute('data-min'), 10);
          var ouvert = auj.some(function (x) { return x.min === m; });
          li.classList.toggle('fo-fournee--prochaine', !!(suiv && !sortie && m === suiv.min));
          li.classList.toggle('fo-fournee--chaud', !!(sortie && m === sortie.min));
          li.classList.toggle('fo-fournee--passee', ouvert && m < n.min && !(sortie && m === sortie.min));
        });
        if (repere) {
          var dans = auj.length && n.min >= data.debut && n.min <= data.fin;
          repere.hidden = !dans;
          if (dans) repere.style.setProperty('--pos', ((n.min - data.debut) / (data.fin - data.debut) * 100).toFixed(2) + '%');
        }
      }
    };
    maj();
    setInterval(maj, 60000);
  }

  /* Apparition douce des sections au défilement ----------------------
     Seulement si le mouvement n'est pas réduit ; les sections déjà à l'écran restent visibles.
     Dans une grille (cartes, produits, galerie, avis, équipe), les éléments se suivent à 50 ms. */
  var blocks = doc.querySelectorAll('main .pv-sec > .pv-in, main .pv-band-in');
  if (!reduce && blocks.length && 'IntersectionObserver' in window) {
    each(doc.querySelectorAll('main .pv-grid3, main .pv-products, main .pv-gal, main .pv-reviews, main .pv-team'), function (g) {
      each(g.children, function (c, i) { c.style.setProperty('--i', Math.min(i, 5)); });
    });
    var vh = window.innerHeight || doc.documentElement.clientHeight;
    each(blocks, function (el) { var r = el.getBoundingClientRect(); if (r.top < vh * 0.92 && r.bottom > 0) el.classList.add('pv-vu'); });
    doc.documentElement.classList.add('pv-anim');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('pv-vu'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    each(blocks, function (el) { if (!el.classList.contains('pv-vu')) io.observe(el); });
    window.addEventListener('beforeprint', function () { each(blocks, function (el) { el.classList.add('pv-vu'); }); });
  }

  /* Photos chargées à la demande : fondu de 300 ms à l'arrivée -------- */
  if (!reduce) {
    each(doc.querySelectorAll('img[loading="lazy"]'), function (img) {
      if (img.complete) return;
      img.classList.add('img-attente');
      var show = function () { img.classList.remove('img-attente'); };
      img.addEventListener('load', show, { once: true });
      img.addEventListener('error', show, { once: true });
    });
  }

  /* Formulaire ------------------------------------------------------- */
  var form = doc.getElementById('pv-form');
  if (!form) return;
  var status = doc.getElementById('pv-form-status');
  var endpoint = form.getAttribute('data-endpoint') || '';
  var email = form.getAttribute('data-email') || '';
  var submit = form.querySelector('[type="submit"]');
  var attempted = false;

  var messages = {
    nom: 'Indiquez votre nom.',
    telephone: 'Indiquez un numéro de téléphone valide.',
    email: 'Indiquez une adresse e-mail valide, par exemple nom@exemple.fr.',
    message: 'Écrivez votre message.',
    consentement: 'Cochez cette case pour que nous puissions vous répondre.'
  };

  function fields() { return Array.prototype.filter.call(form.elements, function (el) { return el.name && el.name !== '_gotcha' && el.type !== 'submit'; }); }

  function check(el) {
    var v = (el.value || '').trim();
    var msg = '';
    if (el.type === 'checkbox') { if (el.required && !el.checked) msg = messages.consentement; }
    else if (el.required && !v) msg = messages[el.name] || 'Ce champ est obligatoire.';
    else if (v && el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = messages.email;
    else if (v && el.type === 'tel' && v.replace(/\D/g, '').length < 9) msg = messages.telephone;
    var err = doc.getElementById('err-' + el.name);
    if (msg) { el.setAttribute('aria-invalid', 'true'); if (err) { err.textContent = msg; err.hidden = false; } }
    else { el.removeAttribute('aria-invalid'); if (err) { err.textContent = ''; err.hidden = true; } }
    return !msg;
  }

  fields().forEach(function (el) {
    el.addEventListener(el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'blur', function () { if (attempted) check(el); });
    // L'erreur disparaît dès que la saisie est correcte (et non au moment où l'on clique ailleurs,
    // ce qui décalerait la page sous le doigt)
    el.addEventListener('input', function () { if (attempted && el.getAttribute('aria-invalid') === 'true') check(el); });
  });

  // Le message de statut glisse de 4 px en fondu plutôt que de surgir
  function say(text) {
    status.textContent = text;
    if (status.animate && text) {
      status.animate(reduce ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }],
        { duration: 200, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
    }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    attempted = true;
    var bad = fields().filter(function (el) { return !check(el); });
    if (bad.length) {
      say(bad.length === 1 ? 'Un champ est à corriger.' : bad.length + ' champs sont à corriger.');
      bad[0].focus();
      return;
    }
    if (form.elements._gotcha && form.elements._gotcha.value) { say('Merci, votre message est bien envoyé.'); form.reset(); return; }

    if (mode === 'demo' || mode === 'maquette' || mode === 'exemple') {
      say((mode === 'exemple' ? 'Site d\'exemple' : 'Démonstration') + ' : ce formulaire fonctionne, mais n\'envoie rien. Sur votre site, le message vous parviendra directement.');
      status.focus();
      return;
    }

    var data = new URLSearchParams(new FormData(form));
    if (!endpoint) {
      var body = [];
      data.forEach(function (v, k) { if (k !== '_gotcha' && k !== 'consentement' && v) body.push(k.charAt(0).toUpperCase() + k.slice(1) + ' : ' + v); });
      window.location.href = 'mailto:' + email + '?subject=' + encodeURIComponent('Demande depuis le site') + '&body=' + encodeURIComponent(body.join('\n'));
      say('Votre messagerie va s\'ouvrir avec votre message déjà rédigé : il ne reste qu\'à l\'envoyer.');
      return;
    }
    var label = submit.textContent;
    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    submit.textContent = 'Envoi en cours…';
    fetch(endpoint, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: data.toString() })
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        say('Merci, votre message est bien envoyé. Nous vous répondons rapidement.');
        form.reset(); attempted = false;
      })
      .catch(function () {
        say('L\'envoi n\'a pas abouti. Réessayez, ou contactez-nous par téléphone' + (email ? ' ou à ' + email : '') + '.');
      })
      .then(function () { submit.disabled = false; submit.removeAttribute('aria-busy'); submit.textContent = label; status.focus(); });
  });
})();
