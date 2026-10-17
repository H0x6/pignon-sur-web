/*!
 * simulateur.js — page Tarifs : le site, les options et la maintenance choisis forment l'estimation
 * de la première année (encadré « Votre estimation » et total de la barre des étapes).
 * La barre des étapes suit la lecture : l'étape à l'écran est soulignée.
 */
(function () {
  'use strict';
  var form = document.getElementById('simu');
  // Hauteur de l'en-tête du site : la barre des étapes se colle juste dessous
  var entete = document.querySelector('.site-header');
  var hauteur = function () { if (entete) document.documentElement.style.setProperty('--entete-h', entete.offsetHeight + 'px'); };
  hauteur(); window.addEventListener('resize', hauteur);
  var dataEl = document.getElementById('simu-data');
  if (!form || !dataEl) return;
  var data = JSON.parse(dataEl.textContent);
  var out = {};
  Array.prototype.forEach.call(document.querySelectorAll('[data-out]'), function (el) {
    var k = el.getAttribute('data-out');
    (out[k] = out[k] || []).push(el);
  });
  var cta = document.getElementById('simu-cta');
  var live = document.getElementById('simu-live');
  var timer = 0;

  var eur = function (n) { return Math.round(n).toLocaleString('fr-FR').replace(/[   ]/g, ' ') + ' €'; };
  var find = function (list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; };

  // Valeurs qui changent : petit « tic » (200 ms) pour montrer ce qui a bougé ; rien au clavier
  var UI = window.PSW_UI || { tick: function () {} };
  function setText(k, txt, e) {
    (out[k] || []).forEach(function (el) {
      if (el.textContent === txt) return;
      el.textContent = txt;
      if (e) UI.tick(el, e);
    });
  }

  function update(announce, e) {
    var f = find(data.formules, form.elements.formule.value) || data.formules[0];
    var sups = Array.prototype.filter.call(form.querySelectorAll('input[name="supplement"]'), function (c) { return c.checked; })
      .map(function (c) { return find(data.supplements, c.value); }).filter(Boolean);
    var m = find(data.maintenance, form.elements.maintenance.value);
    var opt = sups.reduce(function (a, s) { return a + s.prix; }, 0);
    var creation = f.prix + opt;
    var maintYear = m ? m.prix * 12 : 0;
    var total = creation + maintYear;
    var des = f.aPartirDe ? 'dès ' : '';

    setText('nom', f.nom, e);
    setText('site', des + eur(f.prix), e);
    setText('options', opt ? eur(opt) + ' (' + sups.length + ')' : 'aucune', e);
    setText('acompte', des + eur(creation / 2), e);
    setText('solde', des + eur(creation / 2), e);
    setText('maint', m ? eur(m.prix) + '/mois' : 'aucune', e);
    setText('total', des + eur(total), e);
    setText('note', 'Prix nets, TVA non applicable.' + (f.aPartirDe ? ' Montant de départ : le devis précise le prix.' : '') + (m ? ' Maintenance : ' + eur(maintYear) + ' sur 12 mois, engagement de 12 mois.' : ''));

    var p = new URLSearchParams();
    p.set('formule', f.id);
    if (/^premium/.test(f.id)) p.set('gabarit', 'premium');
    if (sups.length) p.set('options', sups.map(function (s) { return s.id; }).join(','));
    if (m) p.set('maintenance', m.id);
    cta.setAttribute('href', 'contact.html?' + p.toString());

    if (announce) {
      clearTimeout(timer);
      timer = setTimeout(function () { live.textContent = 'Total la première année : ' + des + eur(total) + '.'; }, 300);
    }
  }

  form.addEventListener('change', function (e) { update(true, e); });
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  update(false);

  /* Barre des étapes : l'étape en cours de lecture */
  var liens = document.querySelectorAll('[data-etape-lien]:not(.tarifs-etapes__total)');
  if (liens.length && 'IntersectionObserver' in window) {
    var parId = {};
    Array.prototype.forEach.call(liens, function (a) { parId[a.getAttribute('href').slice(1)] = a; });
    var vues = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { vues[en.target.id] = en.isIntersecting ? en.intersectionRatio : 0; });
      var best = null, max = 0;
      Object.keys(vues).forEach(function (id) { if (vues[id] > max) { max = vues[id]; best = id; } });
      Array.prototype.forEach.call(liens, function (a) { if (a === parId[best]) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current'); });
    }, { rootMargin: '-30% 0px -50% 0px', threshold: [0, 0.01, 0.2, 0.5, 1] });
    Object.keys(parId).forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
  }
})();
