/*!
 * simulateur.js — estimation du budget de la première année (page Tarifs).
 */
(function () {
  'use strict';
  var form = document.getElementById('simu');
  var dataEl = document.getElementById('simu-data');
  if (!form || !dataEl) return;
  var data = JSON.parse(dataEl.textContent);
  var out = {};
  Array.prototype.forEach.call(form.querySelectorAll('[data-out]'), function (el) { out[el.getAttribute('data-out')] = el; });
  var cta = document.getElementById('simu-cta');
  var live = document.getElementById('simu-live');
  var timer = 0;

  var eur = function (n) { return Math.round(n).toLocaleString('fr-FR').replace(/[   ]/g, ' ') + ' €'; };
  var find = function (list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; };

  // Valeurs qui changent : petit « tic » (200 ms) pour montrer ce qui a bougé ; rien au clavier
  var UI = window.PSW_UI || { tick: function () {} };
  function setText(el, txt, e) {
    if (el.textContent === txt) return;
    el.textContent = txt;
    if (e) UI.tick(el, e);
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

    setText(out.site, (f.aPartirDe ? 'dès ' : '') + eur(f.prix), e);
    setText(out.options, opt ? eur(opt) : 'aucune', e);
    setText(out.acompte, eur(creation / 2), e);
    setText(out.solde, eur(creation / 2), e);
    setText(out.maint, m ? eur(m.prix) + '/mois, soit ' + eur(maintYear) + ' sur 12 mois' : 'aucune', e);
    setText(out.total, (f.aPartirDe ? 'dès ' : '') + eur(total), e);
    out.note.textContent = 'Prix nets, TVA non applicable.' + (f.aPartirDe ? ' Refonte sur mesure : montant de départ, le devis précise le prix.' : '') + (m ? ' Maintenance : engagement de 12 mois, prélèvement automatique.' : '');

    var p = new URLSearchParams();
    p.set('formule', f.id);
    if (sups.length) p.set('options', sups.map(function (s) { return s.id; }).join(','));
    if (m) p.set('maintenance', m.id);
    cta.setAttribute('href', 'contact.html?' + p.toString());

    if (announce) {
      clearTimeout(timer);
      timer = setTimeout(function () { live.textContent = 'Total la première année : ' + out.total.textContent + '.'; }, 300);
    }
  }

  form.addEventListener('change', function (e) { update(true, e); });
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  update(false);
})();
