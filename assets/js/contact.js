/*!
 * contact.js — formulaire « Demander ma maquette ».
 * Préremplissage depuis la page « Essayez votre design », validation accessible,
 * envoi par fetch vers formEndpoint, ou repli par e-mail prérempli.
 */
(function () {
  'use strict';
  var form = document.getElementById('form-maquette');
  var dataEl = document.getElementById('contact-data');
  if (!form || !dataEl) return;

  var cfg = JSON.parse(dataEl.textContent);
  var endpoint = (cfg.formEndpoint || '').trim();
  var status = document.getElementById('form-status');
  var submitBtn = form.querySelector('[type="submit"]');
  var submitHint = document.getElementById('submit-hint');
  var fallbackWrap = document.getElementById('mail-fallback');
  var fallbackLink = document.getElementById('mail-fallback-link');
  var q = new URLSearchParams(window.location.search);
  var byId = function (list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; };

  form.noValidate = true;
  if (!endpoint) {
    submitBtn.textContent = 'Préparer l\'e-mail de ma demande';
    if (submitHint) submitHint.hidden = false;
  }

  /* Préremplissage ---------------------------------------------------- */
  var nomParam = (q.get('nom') || '').trim().slice(0, 60);
  if (nomParam && !form.elements.entreprise.value) form.elements.entreprise.value = nomParam;
  var tplSelect = form.elements.gabarit;
  var tpl = byId(cfg.gabarits, q.get('gabarit'));
  if (tpl) tplSelect.value = tpl.id;
  else if (q.get('formule') === 'sur-mesure') tplSelect.value = 'sur-mesure';

  var formule = byId(cfg.formules, q.get('formule'));
  if (formule) {
    var extras = (q.get('options') || '').split(',').map(function (id) { var s = byId(cfg.supplements || [], id); return s ? s.nom.toLowerCase() : null; }).filter(Boolean);
    var maint = byId(cfg.maintenance || [], q.get('maintenance'));
    var resume = formule.nom + (extras.length ? ', avec ' + extras.join(', ') : '') + (maint ? ', maintenance ' + maint.nom : '');
    form.elements.formule.value = resume;
    var fNote = document.getElementById('formule-note');
    if (fNote) { fNote.hidden = false; fNote.querySelector('strong').textContent = resume; }
  }

  // Résultat de l'autodiagnostic : préremplit le message
  var diag = (q.get('diagnostic') || '').trim();
  if (diag && !form.elements.message.value) {
    form.elements.message.value = 'Résultat de mon autodiagnostic : ' + diag.slice(0, 400) + '.\n\n';
  }

  if (tpl && (q.has('palette') || q.has('accent') || nomParam)) {
    var pIndex = Math.min(tpl.palettes.length, Math.max(1, parseInt(q.get('palette'), 10) || 1)) - 1;
    var pal = tpl.palettes[pIndex];
    var accent = /^[0-9a-f]{6}$/i.test(q.get('accent') || '') ? '#' + q.get('accent').toUpperCase() : null;
    var lines = [
      'Design : ' + tpl.nom,
      'Palette : ' + pal.nom + (accent ? ', avec la couleur de mon logo ' + accent : '')
    ];
    form.elements.personnalisation.value = lines.join('\n');

    var card = document.getElementById('selection');
    if (card) {
      var dl = card.querySelector('dl');
      var sw = function (c) { return '<span class="selection__swatch" style="background:' + c + '"></span>'; };
      dl.innerHTML =
        '<dt>Design</dt><dd>' + R(tpl.nom) + '</dd>' +
        '<dt>Palette</dt><dd>' + sw(pal.fond) + sw(accent || pal.accent) + sw(pal.secondaire) + R(pal.nom) + (accent ? ', couleur ' + accent : '') + '</dd>' +
        (nomParam ? '<dt>Nom</dt><dd>' + R(nomParam) + '</dd>' : '');
      var back = new URLSearchParams(q.toString());
      back.delete('gabarit'); back.set('design', tpl.id);
      card.querySelector('[data-edit]').setAttribute('href', 'personnaliser.html?' + back.toString());
      card.hidden = false;
    }
  }

  function R(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  /* Validation -------------------------------------------------------- */
  var rules = {
    nom: function (v) { return v ? '' : 'Indiquez votre nom.'; },
    entreprise: function (v) { return v ? '' : 'Indiquez le nom de votre entreprise.'; },
    email: function (v) {
      if (!v) return 'Indiquez votre adresse e-mail.';
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Vérifiez l\'adresse e-mail : elle doit ressembler à nom@exemple.fr.';
    },
    telephone: function (v) {
      if (!v) return '';
      return v.replace(/\D/g, '').length >= 9 ? '' : 'Vérifiez le numéro de téléphone, ou laissez ce champ vide.';
    },
    site: function (v) {
      if (!v) return '';
      return /^(https?:\/\/)?[^\s.\/]+(\.[^\s.\/]+)+(\/\S*)?$/i.test(v) ? '' : 'Vérifiez l\'adresse du site : elle doit ressembler à www.exemple.fr.';
    },
    secteur: function (v) { return v ? '' : 'Choisissez votre secteur d\'activité.'; },
    message: function (v) { return v ? '' : 'Écrivez quelques mots sur votre activité ou votre demande.'; },
    consentement: function (v, el) { return el.checked ? '' : 'Cochez cette case pour que je puisse vous répondre.'; }
  };
  var order = ['nom', 'entreprise', 'email', 'telephone', 'site', 'secteur', 'message', 'consentement'];
  var attempted = false;

  function validateField(name) {
    var el = form.elements[name];
    var msg = rules[name]((el.value || '').trim(), el);
    var err = document.getElementById('err-' + name);
    if (msg) {
      el.setAttribute('aria-invalid', 'true');
      err.textContent = msg;
      err.hidden = false;
    } else {
      el.removeAttribute('aria-invalid');
      err.textContent = '';
      err.hidden = true;
    }
    return !msg;
  }

  order.forEach(function (name) {
    var el = form.elements[name];
    var ev = el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'blur';
    el.addEventListener(ev, function () { if (attempted) validateField(name); });
    if (ev === 'blur') el.addEventListener('input', function () { if (attempted && el.getAttribute('aria-invalid') === 'true') validateField(name); });
  });

  function setStatus(type, html) {
    status.className = 'form-status form-status--' + type;
    status.innerHTML = html;
    // Le message glisse de 4 px en fondu plutôt que de surgir
    if (window.PSW_UI) window.PSW_UI.appear(status);
  }

  /* Envoi ------------------------------------------------------------- */
  function mailtoHref() {
    var f = form.elements;
    var val = function (n) { return (f[n].value || '').trim(); };
    var gab = f.gabarit.options[f.gabarit.selectedIndex];
    var body = [
      'Bonjour,',
      '',
      'Je souhaite recevoir une maquette pour mon site.',
      '',
      'Nom : ' + val('nom'),
      'Entreprise : ' + val('entreprise'),
      'E-mail : ' + val('email'),
      'Téléphone : ' + (val('telephone') || 'non précisé'),
      'Site actuel : ' + (val('site') || 'aucun'),
      'Secteur : ' + val('secteur'),
      'Gabarit souhaité : ' + (gab ? gab.text : 'je ne sais pas encore'),
      val('formule') ? 'Formule envisagée : ' + val('formule') : '',
      val('personnalisation') ? '\nPersonnalisation :\n' + val('personnalisation') : '',
      '',
      'Message :',
      val('message')
    ].filter(function (l) { return l !== ''; }).join('\n');
    return 'mailto:' + cfg.email + '?subject=' + encodeURIComponent('Demande de maquette : ' + val('entreprise')) + '&body=' + encodeURIComponent(body);
  }

  function emailLink() { return '<a href="mailto:' + R(cfg.email) + '">' + R(cfg.email) + '</a>'; }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    attempted = true;
    var invalid = order.filter(function (n) { return !validateField(n); });
    if (invalid.length) {
      setStatus('error', invalid.length === 1 ? 'Un champ est à corriger : il est signalé en rouge.' : invalid.length + ' champs sont à corriger : ils sont signalés en rouge.');
      form.elements[invalid[0]].focus();
      return;
    }

    // Champ piège rempli : probablement un robot. On simule un envoi réussi.
    if (form.elements._gotcha && form.elements._gotcha.value) {
      setStatus('ok', 'Merci, votre demande est bien envoyée.');
      form.reset();
      return;
    }

    if (!endpoint) {
      var href = mailtoHref();
      if (fallbackLink) fallbackLink.setAttribute('href', href);
      setStatus('info', 'Votre messagerie va s\'ouvrir avec la demande déjà rédigée : il ne vous reste qu\'à l\'envoyer. Si rien ne s\'ouvre, écrivez-moi à ' + emailLink() + '.');
      window.location.href = href;
      return;
    }

    var original = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.setAttribute('aria-busy', 'true');
    submitBtn.textContent = 'Envoi en cours…';
    setStatus('info', 'Envoi en cours…');

    var body = new URLSearchParams(new FormData(form));
    fetch(endpoint, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      setStatus('ok', '<strong>Merci, votre demande est bien envoyée.</strong> Je vous réponds ' + R(form.getAttribute('data-delai') || 'rapidement') + ', à l\'adresse indiquée.');
      form.reset();
      attempted = false;
      if (fallbackWrap) fallbackWrap.hidden = true;
      status.focus();
    }).catch(function () {
      if (fallbackLink) fallbackLink.setAttribute('href', mailtoHref());
      if (fallbackWrap) fallbackWrap.hidden = false;
      setStatus('error', 'L\'envoi n\'a pas abouti. Vérifiez votre connexion et réessayez, ou envoyez votre demande par e-mail avec le bouton ci-dessous.');
      status.focus();
    }).then(function () {
      submitBtn.disabled = false;
      submitBtn.removeAttribute('aria-busy');
      submitBtn.textContent = original;
    });
  });
})();
