/*!
 * console.js — la console du client : il change lui-même, depuis son téléphone, l'annonce en haut du site,
 * le plat du jour, ses horaires, ses congés et fermetures, les jours fériés, et peut suspendre les commandes.
 * Sur le site final, les changements sont publiés par api/infos.php (fichier infos.json, lu par chaque page).
 * Sur un site d'exemple (démonstration), ils restent dans le navigateur : le site d'exemple les affiche aussi.
 * Sans dépendance (horaires.js fournit le calcul des horaires et des jours fériés).
 */
(function () {
  'use strict';
  var doc = document;
  var cfg = JSON.parse(doc.getElementById('console-cfg').textContent);
  var H = window.PV_HORAIRES;
  var app = doc.getElementById('console');
  var DEMO = cfg.mode !== 'production';
  var CLE_DEMO = 'pv-demo-infos-' + cfg.demo;
  var CLE_JETON = 'pv-console-jeton';
  var JOURS = { lu: 'Lundi', ma: 'Mardi', me: 'Mercredi', je: 'Jeudi', ve: 'Vendredi', sa: 'Samedi', di: 'Dimanche' };
  var MOTIFS = [['conges', 'Congés'], ['exceptionnelle', 'Fermeture exceptionnelle'], ['inventaire', 'Inventaire'], ['travaux', 'Travaux'], ['formation', 'Formation']];
  var etat = { infos: null, publie: '', jeton: null, envoi: false };

  var R = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  var $ = function (sel, el) { return (el || doc).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(sel)); };
  // Stockage du navigateur : peut être indisponible (navigation privée) sans bloquer la console
  var lire = function (k, sess) { try { return (sess ? sessionStorage : localStorage).getItem(k); } catch (e) { return null; } };
  var ecrire = function (k, v, sess) { try { var st = sess ? sessionStorage : localStorage; if (v == null) st.removeItem(k); else st.setItem(k, v); } catch (e) { /* ignoré */ } };

  /* Données ------------------------------------------------------------ */
  function normaliser(i) {
    var n = H.normaliser(clone(i || {}));
    n.annonce = { texte: (i && i.annonce && i.annonce.texte) || '', jusquau: (i && i.annonce && i.annonce.jusquau) || '' };
    n.platDuJour = { date: (i && i.platDuJour && i.platDuJour.date) || '', texte: (i && i.platDuJour && i.platDuJour.texte) || '', prix: (i && i.platDuJour && i.platDuJour.prix) || '' };
    n.commandes = { pause: !!(i && i.commandes && i.commandes.pause), message: (i && i.commandes && i.commandes.message) || '' };
    if (n.platDuJour.date === 'aujourdhui') n.platDuJour.date = H.maintenant().iso;
    return n;
  }
  var signature = function () { return JSON.stringify(etat.infos); };
  var modifie = function () { return etat.infos && signature() !== etat.publie; };

  function api(action, corps) {
    var h = { 'Content-Type': 'application/json', 'X-PSW': '1' };
    if (etat.jeton) h.Authorization = 'Bearer ' + etat.jeton;
    return fetch(cfg.api + '?action=' + action, { method: 'POST', headers: h, body: JSON.stringify(corps || {}), cache: 'no-store' })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d.statut = r.status; return d; }); });
  }

  /* Démarrage ------------------------------------------------------------ */
  function demarrer() {
    if (DEMO) { charger(); return; }
    etat.jeton = lire(CLE_JETON) || lire(CLE_JETON, true);
    if (!etat.jeton) { connexion(); return; }
    api('verifier').then(function (d) { if (d.ok) charger(); else { oublier(); connexion(); } }, function () { charger(); });
  }
  function oublier() { etat.jeton = null; ecrire(CLE_JETON, null); ecrire(CLE_JETON, null, true); }

  function charger() {
    var fini = function (i) { etat.infos = normaliser(i); etat.publie = signature(); ecran(); };
    if (DEMO) {
      var l = lire(CLE_DEMO);
      try { fini(l ? JSON.parse(l) : cfg.depart); } catch (e) { fini(cfg.depart); }
      return;
    }
    fetch(cfg.infos + '?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(fini, function () { fini(cfg.depart); });
  }

  /* Connexion ------------------------------------------------------------ */
  function connexion(message) {
    app.innerHTML = '<main class="cs-connexion"><div class="cs-carte">' +
      '<p class="cs-sur">' + R(cfg.nom) + '</p><h1>Ma console</h1><p>Pour changer vous-même vos horaires, vos congés et vos annonces.</p>' +
      '<form id="cs-login" novalidate><div class="cs-champ"><label for="cs-code">Code d\'accès</label>' +
      '<div class="cs-mdp"><input id="cs-code" type="password" autocomplete="current-password" autocapitalize="none" spellcheck="false" required aria-describedby="cs-login-msg">' +
      '<button type="button" class="cs-lien" id="cs-voir" aria-pressed="false">Afficher</button></div></div>' +
      '<label class="cs-case"><input type="checkbox" id="cs-rester" checked> Rester connecté sur cet appareil</label>' +
      '<p class="cs-msg" id="cs-login-msg" role="alert">' + R(message || '') + '</p>' +
      '<button class="cs-btn cs-btn--plein" type="submit">Se connecter</button></form>' +
      '<p class="cs-aide">Code oublié ? Demandez-le à la personne qui a créé votre site.</p></div></main>';
    var f = $('#cs-login'), code = $('#cs-code'), msg = $('#cs-login-msg');
    $('#cs-voir').addEventListener('click', function () {
      var vis = code.type === 'password';
      code.type = vis ? 'text' : 'password';
      this.textContent = vis ? 'Masquer' : 'Afficher';
      this.setAttribute('aria-pressed', String(vis));
    });
    code.focus();
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!code.value.trim()) { msg.textContent = 'Saisissez votre code d\'accès.'; code.focus(); return; }
      var b = f.querySelector('[type="submit"]');
      b.disabled = true; b.textContent = 'Connexion…';
      var rester = $('#cs-rester').checked;
      api('connexion', { code: code.value.trim(), rester: rester }).then(function (d) {
        if (d.ok && d.jeton) {
          etat.jeton = d.jeton;
          ecrire(CLE_JETON, d.jeton, !rester);
          charger();
          return;
        }
        msg.textContent = d.statut === 429 ? 'Trop d\'essais. Réessayez dans un quart d\'heure.' : 'Ce code n\'est pas le bon. Vérifiez les majuscules et les tirets.';
        b.disabled = false; b.textContent = 'Se connecter'; code.select();
      }, function () { msg.textContent = 'Pas de connexion. Vérifiez votre réseau et réessayez.'; b.disabled = false; b.textContent = 'Se connecter'; });
    });
  }

  /* Écran principal ---------------------------------------------------- */
  function ecran() {
    var I = etat.infos;
    app.innerHTML =
      '<header class="cs-tete"><div class="cs-in"><p class="cs-tete-nom">' + R(cfg.nom) + '</p>' +
      '<a class="cs-lien" href="' + R(cfg.site) + '" target="_blank" rel="noopener">Voir mon site</a>' +
      '</div></header>' +
      (DEMO ? '<p class="cs-demo"><strong>Démonstration.</strong> Vos changements restent sur cet appareil : ouvrez le site d\'exemple pour les voir.</p>' : '') +
      '<main class="cs-in cs-corps">' +
      '<section class="cs-carte cs-apercu" aria-labelledby="t-apercu"><h2 id="t-apercu">Ce que voient vos clients</h2><div id="cs-apercu"></div></section>' +
      '<section class="cs-carte" aria-labelledby="t-annonce"><h2 id="t-annonce">Annonce</h2>' +
      '<p class="cs-aide">Un message court en haut de toutes les pages. Par exemple : « Fermé exceptionnellement samedi 18 ».</p>' +
      '<div class="cs-champ"><label for="cs-annonce">Texte de l\'annonce</label><textarea id="cs-annonce" rows="2" maxlength="200" data-champ="annonce.texte">' + R(I.annonce.texte) + '</textarea></div>' +
      '<div class="cs-ligne"><div class="cs-champ"><label for="cs-annonce-fin">Afficher jusqu\'au <span class="cs-opt">(facultatif)</span></label><input id="cs-annonce-fin" type="date" data-champ="annonce.jusquau" value="' + R(I.annonce.jusquau) + '"></div>' +
      '<button class="cs-btn" type="button" data-vider="annonce">Retirer l\'annonce</button></div></section>' +
      (cfg.jour ? sectionJour() : '') +
      '<section class="cs-carte" aria-labelledby="t-semaine"><h2 id="t-semaine">Horaires de la semaine</h2><p class="cs-aide">Vos horaires habituels. Pour un jour exceptionnel, ajoutez plutôt une fermeture ci-dessous.</p><div id="cs-semaine"></div></section>' +
      '<section class="cs-carte" aria-labelledby="t-fermetures"><h2 id="t-fermetures">Congés et fermetures</h2><div id="cs-fermetures"></div>' +
      '<form class="cs-ajout" id="cs-ajout" novalidate><h3>Ajouter une fermeture</h3><div class="cs-ligne">' +
      '<div class="cs-champ"><label for="cs-du">Du</label><input id="cs-du" type="date" required></div>' +
      '<div class="cs-champ"><label for="cs-au">Au <span class="cs-opt">(inclus)</span></label><input id="cs-au" type="date"></div></div>' +
      '<div class="cs-champ"><label for="cs-motif">Motif</label><select id="cs-motif">' + MOTIFS.map(function (m) { return '<option value="' + m[0] + '">' + m[1] + '</option>'; }).join('') + '<option value="autre">Autre…</option></select></div>' +
      '<div class="cs-champ" id="cs-motif-autre" hidden><label for="cs-motif-texte">Motif à afficher</label><input id="cs-motif-texte" type="text" maxlength="60"></div>' +
      '<p class="cs-msg" id="cs-ajout-msg" role="alert"></p><button class="cs-btn" type="submit">Ajouter</button></form></section>' +
      '<section class="cs-carte" aria-labelledby="t-feries"><h2 id="t-feries">Jours fériés</h2><label class="cs-case"><input type="checkbox" id="cs-feries"' + (I.feries.ferme ? ' checked' : '') + '> Fermé les jours fériés</label>' +
      '<p class="cs-aide">' + (I.alsace ? 'Y compris le Vendredi saint et la Saint-Étienne (26 décembre), fériés en Alsace-Moselle. ' : '') + 'Cochez un jour pour ouvrir exceptionnellement.</p><div id="cs-feries-liste"></div></section>' +
      (cfg.retrait ? '<section class="cs-carte" aria-labelledby="t-commandes"><h2 id="t-commandes">Commandes en ligne</h2>' +
        '<label class="cs-case"><input type="checkbox" data-champ="commandes.pause"' + (I.commandes.pause ? ' checked' : '') + '> Suspendre les commandes</label>' +
        '<div class="cs-champ"><label for="cs-cmd-msg">Message affiché pendant la pause <span class="cs-opt">(facultatif)</span></label><input id="cs-cmd-msg" type="text" maxlength="160" data-champ="commandes.message" value="' + R(I.commandes.message) + '" placeholder="Les commandes reprennent lundi."></div></section>' : '') +
      '<p class="cs-maj" id="cs-maj"></p>' +
      (DEMO ? '<p class="cs-maj"><button class="cs-lien" type="button" id="cs-reinit">Revenir aux réglages de départ</button></p>' : '<p class="cs-maj"><button class="cs-lien" type="button" id="cs-annuler-pub">Annuler la dernière publication</button><br><button class="cs-lien" type="button" id="cs-sortir">Se déconnecter</button></p>') +
      '</main>' +
      '<div class="cs-barre" id="cs-barre" hidden><div class="cs-in"><p>Modifications pas encore publiées</p><button class="cs-btn" type="button" id="cs-annuler">Annuler</button><button class="cs-btn cs-btn--plein" type="button" id="cs-publier">Publier</button></div></div>' +
      '<p class="cs-toast" id="cs-toast" role="status" aria-live="polite"></p>';
    semaine(); fermetures(); feries(); apercu(); barre(); maj();
    lier();
  }

  function sectionJour() {
    var I = etat.infos, n = H.maintenant(), dem = H.plusJours(n.iso, 1);
    var d = I.platDuJour.date;
    return '<section class="cs-carte" aria-labelledby="t-jour"><h2 id="t-jour">' + R(cfg.jour.titre) + '</h2>' +
      '<p class="cs-aide">Il s\'affiche sur l\'accueil le jour choisi, puis disparaît tout seul à minuit.</p>' +
      '<div class="cs-champ"><label for="cs-jour-pour">Pour</label><select id="cs-jour-pour" data-champ="platDuJour.date">' +
      '<option value="' + n.iso + '"' + (d === n.iso || !d ? ' selected' : '') + '>Aujourd\'hui, ' + R(H.dateLongue(n.iso, 'fr')) + '</option>' +
      '<option value="' + dem + '"' + (d === dem ? ' selected' : '') + '>Demain, ' + R(H.dateLongue(dem, 'fr')) + '</option></select></div>' +
      '<div class="cs-champ"><label for="cs-jour-texte">Le plat <span class="cs-opt">(une ligne par plat)</span></label><textarea id="cs-jour-texte" rows="3" maxlength="300" data-champ="platDuJour.texte" placeholder="Bouchée à la reine, spaetzle maison">' + R(I.platDuJour.texte) + '</textarea></div>' +
      '<div class="cs-ligne"><div class="cs-champ cs-champ--court"><label for="cs-jour-prix">Prix <span class="cs-opt">(facultatif)</span></label><input id="cs-jour-prix" type="text" maxlength="30" inputmode="decimal" data-champ="platDuJour.prix" value="' + R(I.platDuJour.prix) + '" placeholder="14,50 €"></div>' +
      '<button class="cs-btn" type="button" data-vider="platDuJour">Effacer</button></div></section>';
  }

  /* Horaires de la semaine : par jour, ouvert ou fermé, une ou deux plages */
  function semaine() {
    var I = etat.infos;
    $('#cs-semaine').innerHTML = '<ul class="cs-jours" role="list">' + H.ORDRE.map(function (j) {
      var pl = I.semaine[j];
      var ouvert = pl.length > 0;
      return '<li class="cs-jour"><div class="cs-jour-tete"><span class="cs-jour-nom" id="j-' + j + '">' + JOURS[j] + '</span>' +
        '<label class="cs-bascule"><input type="checkbox" data-ouvert="' + j + '"' + (ouvert ? ' checked' : '') + ' aria-describedby="j-' + j + '"><span>' + (ouvert ? 'Ouvert' : 'Fermé') + '</span></label></div>' +
        (ouvert ? '<div class="cs-plages">' + pl.map(function (p, k) {
          return '<div class="cs-plage"><input type="time" step="300" value="' + p[0] + '" data-plage="' + j + '.' + k + '.0" aria-label="' + JOURS[j] + ', ouverture ' + (k + 1) + '"><span aria-hidden="true">à</span>' +
            '<input type="time" step="300" value="' + p[1] + '" data-plage="' + j + '.' + k + '.1" aria-label="' + JOURS[j] + ', fermeture ' + (k + 1) + '">' +
            (k > 0 ? '<button class="cs-retirer" type="button" data-retirer="' + j + '.' + k + '" aria-label="Retirer la plage ' + (k + 1) + ' du ' + JOURS[j].toLowerCase() + '"><span aria-hidden="true">×</span></button>' : '<span></span>') + '</div>';
        }).join('') + (pl.length === 1 ? '<button class="cs-lien" type="button" data-coupure="' + j + '">Ajouter une coupure (midi)</button>' : '') + '</div>' : '') +
        '</li>';
    }).join('') + '</ul>';
  }

  function fermetures() {
    var I = etat.infos, n = H.maintenant();
    var liste = I.fermetures.filter(function (f) { return (f.au || f.du) >= n.iso; }).sort(function (a, b) { return a.du < b.du ? -1 : 1; });
    var nom = function (m) { for (var i = 0; i < MOTIFS.length; i++) if (MOTIFS[i][0] === m) return MOTIFS[i][1]; return m || 'Congés'; };
    $('#cs-fermetures').innerHTML = liste.length ? '<ul class="cs-liste" role="list">' + liste.map(function (f) {
      var quand = f.du === (f.au || f.du) ? 'Le ' + H.dateLongue(f.du, 'fr') : 'Du ' + H.dateLongue(f.du, 'fr') + ' au ' + H.dateLongue(f.au, 'fr');
      return '<li><span><strong>' + R(quand) + '</strong><br>' + R(nom(f.motif)) + '</span><button class="cs-lien" type="button" data-suppr="' + I.fermetures.indexOf(f) + '">Supprimer</button></li>';
    }).join('') + '</ul>' : '<p class="cs-vide">Aucune fermeture prévue.</p>';
  }

  // Les jours fériés des douze prochains mois qui tombent un jour d'ouverture
  function feries() {
    var I = etat.infos, n = H.maintenant(), fin = H.plusJours(n.iso, 365), an = +n.iso.slice(0, 4);
    var l = H.feries(an, I.alsace).concat(H.feries(an + 1, I.alsace)).filter(function (f) { return f.date >= n.iso && f.date <= fin; });
    var box = $('#cs-feries-liste');
    if (!I.feries.ferme) { box.innerHTML = '<p class="cs-vide">Votre site indique vos horaires habituels les jours fériés.</p>'; return; }
    box.innerHTML = '<ul class="cs-liste cs-liste--feries" role="list">' + l.map(function (f) {
      var ouvertHabituel = I.semaine[H.JOURS[H.jourSemaine(f.date)]].length > 0;
      var nom = H.T.fr.feries[f.id];
      return '<li' + (ouvertHabituel ? '' : ' class="cs-ferie--sans"') + '><span><strong>' + R(nom.charAt(0).toUpperCase() + nom.slice(1)) + '</strong><br>' + R(H.dateLongue(f.date, 'fr')) + (ouvertHabituel ? '' : ', jour de fermeture habituel') + '</span>' +
        (ouvertHabituel ? '<label class="cs-case"><input type="checkbox" data-ferie="' + f.date + '"' + (I.feries.ouverts.indexOf(f.date) >= 0 ? ' checked' : '') + '> Ouvert</label>' : '') + '</li>';
    }).join('') + '</ul>';
  }

  /* Ce que voient les clients : l'état « Ouvert / Fermé » et les fermetures à venir, avec les réglages en cours */
  function apercu() {
    var I = etat.infos;
    var s = H.statut(I, 'fr');
    var av = H.aVenir(I, 'fr', 45);
    var n = H.maintenant();
    var ann = I.annonce.texte && (!I.annonce.jusquau || I.annonce.jusquau >= n.iso);
    $('#cs-apercu').innerHTML = (s ? '<p class="cs-statut" data-etat="' + s.etat + '">' + R(s.texte) + '</p>' : '<p class="cs-vide">Ajoutez vos horaires pour afficher « Ouvert / Fermé ».</p>') +
      (ann ? '<p class="cs-apercu-annonce">' + R(I.annonce.texte) + '</p>' : '') +
      (av.length ? '<ul class="cs-avenir" role="list">' + av.slice(0, 4).map(function (f) { return '<li>' + R(f.texte) + '</li>'; }).join('') + '</ul>' : '');
  }
  function barre() {
    var m = modifie();
    $('#cs-barre').hidden = !m;
    doc.body.classList.toggle('cs-modifie', m);
  }
  function maj() {
    var I = etat.infos;
    $('#cs-maj').textContent = I.maj ? 'Dernière publication : ' + new Date(I.maj).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) + '.' : '';
  }
  function change(sansListes) {
    if (!sansListes) { fermetures(); feries(); }
    apercu(); barre();
  }
  var toastT = null;
  function toast(t) {
    var el = $('#cs-toast');
    el.textContent = t;
    el.classList.add('cs-toast--on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { el.classList.remove('cs-toast--on'); }, 4200);
  }

  /* Évènements ----------------------------------------------------------- */
  function lier() {
    var I = function () { return etat.infos; };
    app.addEventListener('input', function (e) {
      var el = e.target, ch = el.getAttribute('data-champ');
      if (ch) {
        var p = ch.split('.');
        I()[p[0]][p[1]] = el.type === 'checkbox' ? el.checked : el.value;
        if (p[0] === 'platDuJour' && p[1] !== 'date' && !I().platDuJour.date) I().platDuJour.date = $('#cs-jour-pour') ? $('#cs-jour-pour').value : H.maintenant().iso;
        change(true);
        return;
      }
      var pl = el.getAttribute('data-plage');
      if (pl) {
        var q = pl.split('.');
        if (el.value) I().semaine[q[0]][+q[1]][+q[2]] = el.value;
        change(false);
      }
    });
    app.addEventListener('change', function (e) {
      var el = e.target;
      if (el.hasAttribute('data-champ') && el.tagName === 'SELECT') { I()[el.getAttribute('data-champ').split('.')[0]].date = el.value; change(true); return; }
      if (el.hasAttribute('data-champ') && el.type === 'checkbox') { var p = el.getAttribute('data-champ').split('.'); I()[p[0]][p[1]] = el.checked; change(true); return; }
      var o = el.getAttribute('data-ouvert');
      if (o) {
        // Un jour qu'on ouvre reprend les horaires d'un autre jour ouvert, sinon 9 h – 12 h, 14 h – 18 h
        var modele = null;
        H.ORDRE.forEach(function (j) { if (!modele && j !== o && I().semaine[j].length) modele = clone(I().semaine[j]); });
        I().semaine[o] = el.checked ? (modele || [['09:00', '12:00'], ['14:00', '18:00']]) : [];
        semaine(); change(false);
        var b = $('[data-ouvert="' + o + '"]'); if (b) b.focus();
        return;
      }
      if (el.id === 'cs-feries') { I().feries.ferme = el.checked; feries(); change(true); return; }
      var f = el.getAttribute('data-ferie');
      if (f) {
        var l = I().feries.ouverts, i = l.indexOf(f);
        if (el.checked && i < 0) l.push(f); else if (!el.checked && i >= 0) l.splice(i, 1);
        change(true);
        return;
      }
      if (el.id === 'cs-motif') $('#cs-motif-autre').hidden = el.value !== 'autre';
    });
    app.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      var v = b.getAttribute('data-vider');
      if (v === 'annonce') { I().annonce = { texte: '', jusquau: '' }; $('#cs-annonce').value = ''; $('#cs-annonce-fin').value = ''; change(true); return; }
      if (v === 'platDuJour') { I().platDuJour = { date: '', texte: '', prix: '' }; $('#cs-jour-texte').value = ''; $('#cs-jour-prix').value = ''; change(true); return; }
      var c = b.getAttribute('data-coupure');
      if (c) { var pl = I().semaine[c], der = pl[pl.length - 1]; var deb = H.enMin(der[1]) + 60; pl.push([hh(Math.min(deb, 1380)), hh(Math.min(deb + 180, 1435))]); semaine(); change(false); return; }
      var r = b.getAttribute('data-retirer');
      if (r) { var q = r.split('.'); I().semaine[q[0]].splice(+q[1], 1); semaine(); change(false); return; }
      var s = b.getAttribute('data-suppr');
      if (s != null) { I().fermetures.splice(+s, 1); change(false); return; }
      if (b.id === 'cs-annuler') { etat.infos = JSON.parse(etat.publie); ecran(); toast('Modifications annulées.'); return; }
      if (b.id === 'cs-publier') { publier(b); return; }
      if (b.id === 'cs-sortir') { oublier(); connexion('Vous êtes déconnecté.'); return; }
      if (b.id === 'cs-reinit') { ecrire(CLE_DEMO, null); charger(); toast('Réglages de départ rétablis.'); return; }
      if (b.id === 'cs-annuler-pub') {
        api('annuler').then(function (d) { if (d.ok) { charger(); toast('La publication précédente est rétablie.'); } else toast(d.erreur || 'Rien à annuler.'); }, function () { toast('Pas de connexion.'); });
      }
    });
    $('#cs-ajout').addEventListener('submit', function (e) {
      e.preventDefault();
      var du = $('#cs-du').value, au = $('#cs-au').value || du, m = $('#cs-motif').value, msg = $('#cs-ajout-msg');
      if (!du) { msg.textContent = 'Choisissez le premier jour de fermeture.'; $('#cs-du').focus(); return; }
      if (au < du) { var x = du; du = au; au = x; }
      if (au < H.maintenant().iso) { msg.textContent = 'Cette date est déjà passée.'; return; }
      var motif = m === 'autre' ? ($('#cs-motif-texte').value.trim() || 'Fermeture exceptionnelle') : m;
      I().fermetures.push({ du: du, au: au, motif: motif });
      msg.textContent = '';
      this.reset(); $('#cs-motif-autre').hidden = true;
      change(false);
      toast('Fermeture ajoutée. Pensez à publier.');
    });
    window.addEventListener('beforeunload', function (e) { if (modifie()) { e.preventDefault(); e.returnValue = ''; } });
    // L'état « ouvert / fermé » suit l'heure qui passe
    setInterval(apercu, 60000);
  }
  var hh = function (m) { return (m < 600 ? '0' : '') + Math.floor(m / 60) + ':' + (m % 60 < 10 ? '0' : '') + (m % 60); };

  function publier(b) {
    var I = etat.infos;
    // Plages incohérentes (fermeture avant l'ouverture) : on le dit avant de publier
    var faux = H.ORDRE.filter(function (j) { return I.semaine[j].some(function (p) { return !p[0] || !p[1] || p[0] >= p[1]; }); });
    if (faux.length) { toast('Vérifiez les horaires du ' + JOURS[faux[0]].toLowerCase() + ' : la fermeture doit suivre l\'ouverture.'); return; }
    if (DEMO) {
      I.maj = new Date().toISOString();
      ecrire(CLE_DEMO, JSON.stringify(I));
      etat.publie = signature(); barre(); maj();
      toast('Enregistré (démonstration). Ouvrez le site pour voir le changement.');
      return;
    }
    b.disabled = true; b.textContent = 'Publication…';
    api('enregistrer', { infos: I }).then(function (d) {
      b.disabled = false; b.textContent = 'Publier';
      if (d.statut === 401) { oublier(); connexion('Reconnectez-vous pour publier : vos changements seront à refaire.'); return; }
      if (!d.ok) { toast(d.erreur || 'La publication n\'a pas abouti. Réessayez.'); return; }
      etat.infos = normaliser(d.infos);
      etat.publie = signature();
      ecran();
      toast('C\'est en ligne : votre site est à jour.');
    }, function () { b.disabled = false; b.textContent = 'Publier'; toast('Pas de connexion. Vos changements sont gardés : réessayez.'); });
  }

  demarrer();
})();
