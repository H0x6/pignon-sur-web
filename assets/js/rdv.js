/*!
 * rdv.js — appel de 15 minutes.
 * 1. Avec une page de réservation intégrable (rendezVous.integration) : sur grand écran, l'agenda
 *    s'ouvre dans une fenêtre de la page (chargé seulement au clic) ; sur téléphone, dans un onglet.
 * 2. Sans page de réservation : petit formulaire « Être rappelé », envoyé comme la demande de
 *    maquette (formEndpoint), ou par la messagerie du visiteur en repli.
 */
(function () {
  'use strict';
  var doc = document;
  var UI = window.PSW_UI || {};
  var mesure = UI.mesure || function () {};
  var R = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  /* 1. Agenda dans une fenêtre --------------------------------------- */
  var lien = doc.querySelector('[data-rdv-cadre]');
  if (lien && window.HTMLDialogElement) {
    var dlg = null;
    var ouvrir = function () {
      if (!dlg) {
        dlg = doc.createElement('dialog');
        dlg.className = 'rdv-dialog';
        dlg.setAttribute('aria-labelledby', 'rdv-dialog-titre');
        dlg.innerHTML = '<div class="rdv-dialog__tete"><h2 id="rdv-dialog-titre">Choisir un créneau</h2>' +
          '<a class="link-arrow" href="' + R(lien.href) + '" target="_blank" rel="noopener">Ouvrir dans un nouvel onglet</a>' +
          '<button class="rdv-dialog__fermer" type="button" aria-label="Fermer"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
          '<iframe class="rdv-dialog__cadre" title="Agenda de réservation" src="' + R(lien.getAttribute('data-rdv-cadre')) + '"></iframe>';
        doc.body.appendChild(dlg);
        dlg.querySelector('.rdv-dialog__fermer').addEventListener('click', function () { dlg.close(); });
        // Un clic sur le fond (en dehors de la fenêtre) la referme
        dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
        dlg.addEventListener('close', function () { lien.focus(); });
      }
      dlg.showModal();
    };
    lien.addEventListener('click', function (e) {
      // Petit écran ou écran tactile : l'agenda s'ouvre dans un onglet, plus confortable
      var large = window.matchMedia && window.matchMedia('(min-width: 48rem) and (pointer: fine)').matches;
      if (!large || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      ouvrir();
    });
  }

  /* 2. Être rappelé --------------------------------------------------- */
  var form = doc.getElementById('form-rappel');
  if (!form) return;
  var status = doc.getElementById('rappel-status');
  var endpoint = (form.getAttribute('data-endpoint') || '').trim();
  var email = form.getAttribute('data-email') || '';
  var btn = form.querySelector('[type="submit"]');
  var champs = [
    { el: form.elements.nom, err: 'err-r-nom', test: function (v) { return v ? '' : 'Indiquez votre nom.'; } },
    { el: form.elements.telephone, err: 'err-r-tel', test: function (v) { return v.replace(/\D/g, '').length >= 9 ? '' : 'Indiquez un numéro de téléphone complet.'; } },
    { el: form.elements.consentement, err: 'err-r-consent', test: function (v, el) { return el.checked ? '' : 'Cochez cette case pour que je puisse vous appeler.'; } }
  ];
  var tente = false;
  var verifier = function (c) {
    var msg = c.test((c.el.value || '').trim(), c.el);
    var err = doc.getElementById(c.err);
    if (msg) { c.el.setAttribute('aria-invalid', 'true'); err.textContent = msg; err.hidden = false; }
    else { c.el.removeAttribute('aria-invalid'); err.textContent = ''; err.hidden = true; }
    return !msg;
  };
  champs.forEach(function (c) {
    c.el.addEventListener(c.el.type === 'checkbox' ? 'change' : 'input', function () { if (tente && c.el.getAttribute('aria-invalid') === 'true') verifier(c); });
  });
  var dire = function (type, html) {
    status.className = 'form-status form-status--' + type;
    status.innerHTML = html;
    if (UI.appear) UI.appear(status);
  };
  var reference = function () {
    var d = new Date();
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return 'R-' + p(d.getMonth() + 1) + p(d.getDate()) + '-' + String(Math.floor(1000 + Math.random() * 9000));
  };

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    tente = true;
    var bad = champs.filter(function (c) { return !verifier(c); });
    if (bad.length) { dire('error', bad.length === 1 ? 'Un champ est à corriger.' : bad.length + ' champs sont à corriger.'); bad[0].el.focus(); return; }
    if (form.elements._gotcha.value) { dire('ok', 'Merci, c\'est noté.'); form.reset(); return; }
    var ref = reference();
    form.elements.reference.value = ref;
    var f = form.elements;
    f._subject.value = 'Demande de rappel : ' + f.nom.value.trim() + ' (' + ref + ')';
    var moment = f.creneau ? f.creneau.value : '';
    if (!endpoint) {
      var corps = 'Bonjour,\n\nPouvez-vous me rappeler ?\n\nNom : ' + f.nom.value.trim() + '\nTéléphone : ' + f.telephone.value.trim() + (moment ? '\nMoment préféré : ' + moment : '') + '\nRéférence : ' + ref;
      window.location.href = 'mailto:' + email + '?subject=' + encodeURIComponent('Demande de rappel') + '&body=' + encodeURIComponent(corps);
      dire('info', 'Votre messagerie va s\'ouvrir avec la demande déjà rédigée : il ne reste qu\'à l\'envoyer.');
      mesure('Rappel demandé', { envoi: 'messagerie' });
      return;
    }
    var label = btn.textContent;
    btn.disabled = true; btn.setAttribute('aria-busy', 'true'); btn.textContent = 'Envoi en cours…';
    var entetes = { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' };
    // Envoi par le PHP du site (même adresse) : en-tête qui bloque les envois depuis un autre site
    if (!/^https?:/i.test(endpoint)) entetes['X-PSW'] = '1';
    fetch(endpoint, { method: 'POST', headers: entetes, body: new URLSearchParams(new FormData(form)).toString() })
      .then(function (r) { if (!r.ok) throw new Error(r.status); })
      .then(function () {
        dire('ok', '<strong>C\'est noté.</strong> Je vous appelle au ' + R(f.telephone.value.trim()) + (moment && moment !== 'Peu importe' ? ' (' + R(moment.charAt(0).toLowerCase() + moment.slice(1)) + ')' : '') + '. Référence\u00a0: ' + R(ref) + '.');
        mesure('Rappel demandé', { envoi: 'formulaire' });
        form.reset(); tente = false;
      })
      .catch(function () { dire('error', 'L\'envoi n\'a pas abouti. Réessayez, ou écrivez-moi à <a href="mailto:' + R(email) + '">' + R(email) + '</a>.'); })
      .then(function () { btn.disabled = false; btn.removeAttribute('aria-busy'); btn.textContent = label; status.focus(); });
  });
})();
