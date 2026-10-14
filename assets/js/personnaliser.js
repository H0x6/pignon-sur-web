/*!
 * personnaliser.js — page « Essayez votre design ».
 * L'aperçu est le vrai site d'exemple (même origine), chargé dans un cadre en mode ?apercu.
 * Le nom, la palette et la couleur d'accent sont appliqués directement dans la page du cadre,
 * puis réappliqués à chaque page visitée dans l'aperçu. L'état tient dans l'adresse de la page
 * (?design=fournil&palette=2&nom=…&accent=…), qu'on peut copier et partager.
 */
(function () {
  'use strict';
  var root = document.getElementById('cz');
  var dataEl = document.getElementById('cz-data');
  if (!root || !dataEl || !window.PSW) return;
  var R = window.PSW;
  var designs = JSON.parse(dataEl.textContent);
  var byId = function (id) { for (var i = 0; i < designs.length; i++) if (designs[i].id === id) return designs[i]; return null; };

  var form = document.getElementById('cz-form');
  var selDesign = document.getElementById('cz-design');
  var inNom = document.getElementById('cz-nom');
  var palBox = document.getElementById('cz-palettes');
  var inAccent = document.getElementById('cz-accent');
  var btnRetirer = document.getElementById('cz-accent-retirer');
  var verif = document.getElementById('cz-accent-verif');
  var veux = document.getElementById('cz-veux');
  var copier = document.getElementById('cz-copier');
  var copie = document.getElementById('cz-copie');
  var cadre = document.getElementById('cz-cadre');
  var ecran = document.getElementById('cz-ecran');
  var iframe = document.getElementById('cz-iframe');
  var ouvrir = document.getElementById('cz-ouvrir');
  var seg = root.querySelector('.seg');

  var q = new URLSearchParams(location.search);
  var state = {
    design: byId(q.get('design') || q.get('gabarit')) ? (q.get('design') || q.get('gabarit')) : designs[0].id,
    palette: parseInt(q.get('palette'), 10) || 0,
    nom: (q.get('nom') || '').slice(0, 40),
    accent: /^[0-9a-f]{6}$/i.test(q.get('accent') || '') ? '#' + q.get('accent').toUpperCase() : null,
    device: 'bureau'
  };
  var d = byId(state.design);
  if (!state.palette || state.palette > d.palettes.length) state.palette = d.palette;

  /* Palettes du design choisi : boutons radio --------------------------- */
  function renderPalettes() {
    var dd = byId(state.design);
    palBox.innerHTML = dd.palettes.map(function (p, i) {
      return '<label class="cz__palette"><input type="radio" name="palette" value="' + (i + 1) + '"' + (i + 1 === state.palette ? ' checked' : '') + '>' +
        '<span class="cz__palette-boite"><span class="cz__pastille" aria-hidden="true" style="--f:' + p.fond + ';--a:' + p.accent + ';--s:' + p.secondaire + '"></span>' + R.esc(p.nom) + '</span></label>';
    }).join('');
  }

  /* Dans le cadre : nom, palette et accent appliqués à la page affichée --- */
  function appliquer() {
    var doc;
    try { doc = iframe.contentDocument; } catch (e) { return; }
    if (!doc) return;
    var pv = doc.querySelector('.pv');
    if (!pv) return;
    var dd = byId(state.design);
    var pal = dd.palettes[state.palette - 1];
    var der = R.derive(pal, state.accent);
    Object.keys(der.vars).forEach(function (k) { pv.style.setProperty(k, der.vars[k]); });
    pv.className = pv.className.replace(/\bpv-palette--\d+\b/, 'pv-palette--' + state.palette);
    doc.body.style.background = der.vars['--p-bg'];
    // Le nom : partout où le site l'affiche (en-tête, pied de page, enseignes)
    var nom = state.nom.trim();
    Array.prototype.forEach.call(doc.querySelectorAll('[data-pv="nom"]'), function (el) {
      if (!el.hasAttribute('data-pv-orig')) el.setAttribute('data-pv-orig', el.textContent);
      el.textContent = nom || el.getAttribute('data-pv-orig');
    });
    // Contraste : message seulement pour une couleur personnelle
    if (state.accent) {
      var m = der.report.messages[0];
      verif.textContent = m ? m.text : '';
    } else verif.textContent = '';
  }

  function urlApercu() {
    var dd = byId(state.design);
    return dd.exemple + '?apercu&palette=' + state.palette;
  }

  function charger() {
    var u = urlApercu();
    iframe.src = u;
    ouvrir.href = byId(state.design).exemple + '?palette=' + state.palette;
  }
  // Chaque page visitée dans l'aperçu (les liens du site d'exemple y restent) reçoit les réglages
  iframe.addEventListener('load', appliquer);

  /* L'adresse de la page garde les réglages ----------------------------- */
  function majAdresse() {
    var p = new URLSearchParams();
    p.set('design', state.design);
    p.set('palette', String(state.palette));
    if (state.nom.trim()) p.set('nom', state.nom.trim());
    if (state.accent) p.set('accent', state.accent.slice(1));
    history.replaceState(null, '', location.pathname + '?' + p.toString());
    var c = new URLSearchParams();
    c.set('gabarit', state.design);
    c.set('palette', String(state.palette));
    if (state.nom.trim()) c.set('nom', state.nom.trim());
    if (state.accent) c.set('accent', state.accent.slice(1));
    veux.href = 'contact.html?' + c.toString();
    ouvrir.href = byId(state.design).exemple + '?palette=' + state.palette;
  }

  /* Taille de l'écran simulé : 1280 px de large (ordinateur) ou 390 px (téléphone), mis à l'échelle */
  function echelle() {
    var largeur = state.device === 'mobile' ? 390 : 1280;
    var w = ecran.clientWidth, h = ecran.clientHeight;
    var s = Math.min(1, w / largeur);
    iframe.style.width = largeur + 'px';
    iframe.style.height = Math.ceil(h / s) + 'px';
    iframe.style.transform = 'scale(' + s + ')';
  }
  if ('ResizeObserver' in window) new ResizeObserver(echelle).observe(ecran);
  else window.addEventListener('resize', echelle);

  /* Évènements ------------------------------------------------------------ */
  selDesign.addEventListener('change', function () {
    state.design = selDesign.value;
    state.palette = byId(state.design).palette;
    if (!state.accent) inAccent.value = byId(state.design).palettes[state.palette - 1].accent.toLowerCase();
    renderPalettes();
    charger();
    majAdresse();
  });
  inNom.addEventListener('input', function () { state.nom = inNom.value.slice(0, 40); appliquer(); majAdresse(); });
  palBox.addEventListener('change', function (e) {
    if (e.target.name !== 'palette') return;
    state.palette = parseInt(e.target.value, 10);
    if (!state.accent) inAccent.value = byId(state.design).palettes[state.palette - 1].accent.toLowerCase();
    appliquer();
    majAdresse();
  });
  inAccent.addEventListener('input', function () {
    state.accent = inAccent.value.toUpperCase();
    btnRetirer.hidden = false;
    appliquer();
    majAdresse();
  });
  btnRetirer.addEventListener('click', function () {
    state.accent = null;
    btnRetirer.hidden = true;
    inAccent.value = byId(state.design).palettes[state.palette - 1].accent.toLowerCase();
    appliquer();
    majAdresse();
    inAccent.focus();
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); });

  // Ordinateur ou téléphone : la pastille glisse, le cadre change de forme
  Array.prototype.forEach.call(seg.querySelectorAll('button'), function (b, i) {
    b.addEventListener('click', function () {
      state.device = b.getAttribute('data-device');
      seg.setAttribute('data-active', String(i));
      Array.prototype.forEach.call(seg.querySelectorAll('button'), function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      cadre.setAttribute('data-device', state.device);
      echelle();
    });
  });

  copier.addEventListener('click', function () {
    var done = function () { copie.textContent = 'Lien copié.'; setTimeout(function () { copie.textContent = ''; }, 2500); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(location.href).then(done, function () { copie.textContent = location.href; });
    else copie.textContent = location.href;
  });

  /* Démarrage ------------------------------------------------------------- */
  selDesign.value = state.design;
  inNom.value = state.nom;
  renderPalettes();
  var pal0 = byId(state.design).palettes[state.palette - 1];
  inAccent.value = (state.accent || pal0.accent).toLowerCase();
  btnRetirer.hidden = !state.accent;
  root.hidden = false;
  echelle();
  charger();
  majAdresse();
})();
