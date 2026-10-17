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
  else if (q.get('gabarit') === 'premium' || /^premium/.test(q.get('formule') || '')) tplSelect.value = 'premium';

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
    if (q.get('logo') === '1') lines.push('Logo : essayé dans l\'aperçu, je vous l\'envoie par e-mail');
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
    var gab = gabLibelle();
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
      'Design souhaité : ' + (gab || 'je ne sais pas encore'),
      val('formule') ? 'Formule envisagée : ' + val('formule') : '',
      'Référence : ' + val('reference'),
      val('personnalisation') ? '\nPersonnalisation :\n' + val('personnalisation') : '',
      '',
      'Message :',
      val('message')
    ].filter(function (l) { return l !== ''; }).join('\n');
    return 'mailto:' + cfg.email + '?subject=' + encodeURIComponent('Demande de maquette : ' + val('entreprise')) + '&body=' + encodeURIComponent(body);
  }

  // Libellé du design choisi (cartes du formulaire) ; vide pour « Je ne sais pas encore »
  function gabLibelle() {
    var c = form.querySelector('input[name="gabarit"]:checked');
    return c && c.value ? c.getAttribute('data-libelle') : '';
  }

  function emailLink() { return '<a href="mailto:' + R(cfg.email) + '">' + R(cfg.email) + '</a>'; }

  var mesure = (window.PSW_UI && window.PSW_UI.mesure) || function () {};
  var $ = function (id) { return document.getElementById(id); };

  // « M-1015-4821 » : mois, jour et quatre chiffres
  function reference() {
    var d = new Date();
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return 'M-' + p(d.getMonth() + 1) + p(d.getDate()) + '-' + String(Math.floor(1000 + Math.random() * 9000));
  }

  // Ce que le visiteur a envoyé : [libellé, valeur]
  function recapitulatif() {
    var f = form.elements;
    var v = function (n) { return (f[n] && f[n].value ? f[n].value : '').trim(); };
    var gab = gabLibelle();
    return [
      ['Nom', v('nom')], ['Entreprise', v('entreprise')], ['E-mail', v('email')], ['Téléphone', v('telephone')],
      ['Site actuel', v('site')], ['Secteur', v('secteur')], ['Design souhaité', gab],
      ['Formule envisagée', v('formule')], ['Personnalisation', v('personnalisation')], ['Message', v('message')]
    ].filter(function (l) { return l[1]; });
  }

  /* Accusé de réception à l'écran : la demande, sa référence et la suite.
     emailEnvoye : le serveur (envoi.php) a aussi envoyé l'accusé par e-mail. */
  function accuse(ref, recap, emailEnvoye) {
    var mail = '';
    recap.forEach(function (l) { if (l[0] === 'E-mail') mail = l[1]; });
    var texte = 'Ma demande de maquette (' + ref + ')\u00a0:\n\n' + recap.map(function (l) { return l[0] + '\u00a0: ' + l[1]; }).join('\n');
    var copie = 'mailto:' + encodeURIComponent(mail) + '?subject=' + encodeURIComponent('Copie de ma demande ' + ref + ' à ' + cfg.nom) + '&body=' + encodeURIComponent(texte);
    var rdv = $('rendez-vous');
    var box = document.createElement('div');
    box.className = 'recu';
    box.id = 'recu';
    box.tabIndex = -1;
    box.setAttribute('aria-labelledby', 'recu-titre');
    box.innerHTML =
      '<p class="recu__badge"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4.5 12.5l4.5 4.5L19.5 6.5"/></svg>Demande envoyée</p>' +
      '<h2 class="recu__titre" id="recu-titre">Merci, c\'est bien reçu.</h2>' +
      '<p class="recu__lead">Votre référence\u00a0: <strong class="recu__ref">' + R(ref) + '</strong>. Je regarde votre demande et je vous réponds ' + R(form.getAttribute('data-delai') || 'rapidement') + (mail ? ', à <strong>' + R(mail) + '</strong>' : '') + '.' +
      (emailEnvoye ? ' Un accusé de réception vient de partir à cette adresse\u00a0: s\'il n\'arrive pas, regardez dans les indésirables.' : '') + '</p>' +
      '<details class="recu__detail"><summary>Revoir ce que vous m\'avez envoyé</summary><dl class="recu__recap">' + recap.map(function (l) { return '<dt>' + R(l[0]) + '</dt><dd>' + R(l[1]).replace(/\n/g, '<br>') + '</dd>'; }).join('') + '</dl></details>' +
      '<h3 class="recu__h">La suite</h3>' +
      '<ol class="recu__suite" role="list"><li><span>Je regarde votre site actuel.</span></li><li><span>Je vous envoie la maquette, en captures d\'écran ou en PDF.</span></li><li><span>Si elle vous plaît, je vous envoie un devis. Sinon, on en reste là.</span></li></ol>' +
      '<p class="btn-row recu__actions">' + (mail && !emailEnvoye ? '<a class="btn btn--secondary" href="' + R(copie) + '">Garder une copie par e-mail</a>' : '') +
      (rdv ? '<a class="link-arrow" href="#rendez-vous">' + (rdv.querySelector('[data-rdv]') ? 'Réserver un appel de 15 minutes' : 'Être rappelé') + '</a>' : '') + '</p>';
    form.hidden = true;
    ['selection', 'formule-note'].forEach(function (id) { var el = $(id); if (el) el.hidden = true; });
    form.parentNode.insertBefore(box, form);
    if (window.PSW_UI && window.PSW_UI.appear) window.PSW_UI.appear(box);
    // L'accusé reçoit le focus : les lecteurs d'écran lisent son titre
    box.scrollIntoView({ block: 'start', behavior: (window.PSW_UI && window.PSW_UI.reduceMotion) ? 'auto' : 'smooth' });
    box.focus({ preventScroll: true });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    attempted = true;
    var invalid = order.filter(function (n) { return !validateField(n); });
    if (invalid.length) {
      setStatus('error', invalid.length === 1 ? 'Un champ est à corriger : il est signalé en rouge.' : invalid.length + ' champs sont à corriger : ils sont signalés en rouge.');
      form.elements[invalid[0]].focus();
      return;
    }

    // Référence de la demande (reprise dans l'e-mail reçu et dans l'accusé de réception)
    var ref = reference();
    form.elements.reference.value = ref;
    form.elements._subject.value = 'Demande de maquette : ' + (form.elements.entreprise.value || '').trim() + ' (' + ref + ')';
    if (form.elements.depuis && window.PSW_UI && window.PSW_UI.depuis) form.elements.depuis.value = window.PSW_UI.depuis();
    var props = { formule: (form.elements.formule.value || '').split(',')[0] || 'non précisée', design: form.elements.gabarit.value || 'non précisé', depuis: form.elements.depuis ? form.elements.depuis.value : '' };

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
      mesure('Demande de maquette', Object.assign({ envoi: 'messagerie' }, props));
      window.location.href = href;
      return;
    }

    var original = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.setAttribute('aria-busy', 'true');
    submitBtn.textContent = 'Envoi en cours…';
    setStatus('info', 'Envoi en cours…');

    var recap = recapitulatif();
    var body = new URLSearchParams(new FormData(form));
    var entetes = { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' };
    // Envoi par le PHP du site (même adresse) : en-tête qui bloque les envois depuis un autre site
    if (!/^https?:/i.test(endpoint)) entetes['X-PSW'] = '1';
    fetch(endpoint, {
      method: 'POST',
      headers: entetes,
      body: body.toString()
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json().catch(function () { return {}; });
    }).then(function (rep) {
      mesure('Demande de maquette', Object.assign({ envoi: 'formulaire' }, props));
      accuse(ref, recap, !!(rep && rep.accuse));
      form.reset();
      attempted = false;
      if (fallbackWrap) fallbackWrap.hidden = true;
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
