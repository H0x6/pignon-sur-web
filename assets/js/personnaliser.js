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
  var inLogo = document.getElementById('cz-logo');
  var teintes = document.getElementById('cz-teintes');
  var lienEmail = document.getElementById('cz-email');
  var btnPartager = document.getElementById('cz-partager');
  var mesure = (window.PSW_UI && window.PSW_UI.mesure) || function () {};

  var q = new URLSearchParams(location.search);
  var state = {
    design: byId(q.get('design') || q.get('gabarit')) ? (q.get('design') || q.get('gabarit')) : designs[0].id,
    palette: parseInt(q.get('palette'), 10) || 0,
    nom: (q.get('nom') || '').slice(0, 40),
    accent: /^[0-9a-f]{6}$/i.test(q.get('accent') || '') ? '#' + q.get('accent').toUpperCase() : null,
    device: 'bureau',
    logo: null // image du logo (adresse data:), gardée dans la page seulement
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
    // Le logo importé : placé devant le nom, dans l'en-tête du site affiché
    var lien = doc.querySelector('.pv-logo');
    var img = doc.querySelector('.cz-logo-img');
    if (lien && state.logo) {
      if (!doc.getElementById('cz-logo-style')) {
        var st = doc.createElement('style');
        st.id = 'cz-logo-style';
        st.textContent = '.pv-logo.cz-avec-logo{display:grid!important;grid-template-columns:auto auto;column-gap:12px;align-items:center;justify-content:start}' +
          '.cz-logo-img{grid-row:1 / span 2;max-height:52px;max-width:150px;width:auto;height:auto;padding:4px 6px;border-radius:6px;background:#fff;box-shadow:0 1px 3px rgb(0 0 0 / .15)}.cz-avec-logo [data-pv="logo"]{display:none!important}';
        doc.head.appendChild(st);
      }
      if (!img) { img = doc.createElement('img'); img.className = 'cz-logo-img'; img.alt = ''; lien.insertBefore(img, lien.firstChild); }
      img.src = state.logo;
      lien.classList.add('cz-avec-logo');
    } else if (img) { img.parentNode.classList.remove('cz-avec-logo'); img.parentNode.removeChild(img); }
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
    if (state.logo) c.set('logo', '1');
    veux.href = 'contact.html?' + c.toString();
    ouvrir.href = byId(state.design).exemple + '?palette=' + state.palette;
    lienEmail.href = 'mailto:?subject=' + encodeURIComponent(sujetPartage()) + '&body=' + encodeURIComponent(textePartage() + '\n\n' + location.href);
  }
  function sujetPartage() { return 'Aperçu de notre futur site' + (state.nom.trim() ? ' : ' + state.nom.trim() : ''); }
  function textePartage() {
    var dd = byId(state.design);
    return 'Bonjour,\n\nVoici à quoi pourrait ressembler notre nouveau site, avec le design « ' + dd.nom + ' »' + (state.accent ? ' et la couleur de notre logo' : '') + '. L\'aperçu se visite comme un vrai site, sur ordinateur ou sur téléphone :';
  }

  /* Couleurs d'un logo ----------------------------------------------------
     L'image est réduite (96 px), ses pixels regroupés par teinte voisine ; on garde les teintes
     colorées les plus présentes, puis les foncées si le logo est noir et blanc. Tout se passe ici. */
  function couleursLogo(img) {
    var cote = 96, w = img.naturalWidth || cote, h = img.naturalHeight || cote;
    var k = Math.min(1, cote / Math.max(w, h));
    var cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k));
    var cv = document.createElement('canvas');
    cv.width = cw; cv.height = ch;
    var cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(img, 0, 0, cw, ch);
    var d;
    try { d = cx.getImageData(0, 0, cw, ch).data; } catch (e) { return []; }
    var seaux = {};
    for (var i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 140) continue; // transparent
      var r = d[i], g = d[i + 1], b = d[i + 2];
      var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 510;
      var sat = mx === mn ? 0 : (l > 0.5 ? (mx - mn) / (510 - mx - mn) : (mx - mn) / (mx + mn));
      var cle = (r >> 4) + ',' + (g >> 4) + ',' + (b >> 4);
      var o = seaux[cle] || (seaux[cle] = { n: 0, r: 0, g: 0, b: 0, s: 0, l: 0 });
      o.n++; o.r += r; o.g += g; o.b += b; o.s += sat; o.l += l;
    }
    var liste = Object.keys(seaux).map(function (kk) {
      var o = seaux[kk], n = o.n;
      var c = { r: o.r / n, g: o.g / n, b: o.b / n, s: o.s / n, l: o.l / n, n: n };
      // Blanc et quasi-blanc (le fond) : écartés ; gris et noirs : gardés en dernier recours
      c.fond = c.l > 0.93;
      c.score = n * (c.s > 0.18 && c.l > 0.1 && c.l < 0.9 ? 1 + c.s : 0.04);
      return c;
    }).filter(function (c) { return !c.fond; }).sort(function (a, b) { return b.score - a.score; });
    var gardees = [];
    var total = liste.reduce(function (t, c) { return t + c.n; }, 0);
    liste.forEach(function (c) {
      // Une teinte trop rare (bords adoucis du dessin, petits détails) n'est pas proposée
      if (gardees.length >= 4 || (gardees.length && c.n < total * 0.04)) return;
      var proche = gardees.some(function (g2) { return Math.abs(g2.r - c.r) + Math.abs(g2.g - c.g) + Math.abs(g2.b - c.b) < 70; });
      if (!proche) gardees.push(c);
    });
    var hex = function (v) { var x = Math.round(v).toString(16); return x.length < 2 ? '0' + x : x; };
    return gardees.map(function (c) { return ('#' + hex(c.r) + hex(c.g) + hex(c.b)).toUpperCase(); });
  }
  function choisirTeinte(c) {
    state.accent = c;
    inAccent.value = c.toLowerCase();
    btnRetirer.hidden = false;
    Array.prototype.forEach.call(teintes.querySelectorAll('.cz__teinte'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-teinte') === c)); });
    appliquer();
    majAdresse();
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
    Array.prototype.forEach.call(teintes.querySelectorAll('.cz__teinte'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-teinte') === state.accent)); });
    btnRetirer.hidden = false;
    appliquer();
    majAdresse();
  });
  btnRetirer.addEventListener('click', function () {
    state.accent = null;
    Array.prototype.forEach.call(teintes.querySelectorAll('.cz__teinte'), function (b) { b.setAttribute('aria-pressed', 'false'); });
    btnRetirer.hidden = true;
    inAccent.value = byId(state.design).palettes[state.palette - 1].accent.toLowerCase();
    appliquer();
    majAdresse();
    inAccent.focus();
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); });

  inLogo.addEventListener('change', function () {
    var f = inLogo.files && inLogo.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { verif.textContent = 'Ce fichier est trop lourd (5 Mo au plus).'; return; }
    var lecteur = new FileReader();
    lecteur.onload = function () {
      var img = new Image();
      img.onload = function () {
        state.logo = lecteur.result;
        var cs = couleursLogo(img);
        var liste = teintes.querySelector('.cz__teintes-liste');
        liste.innerHTML = cs.map(function (c) { return '<button class="cz__teinte" type="button" data-teinte="' + c + '" aria-pressed="false"><span style="background:' + c + '"></span>' + c + '</button>'; }).join('');
        teintes.hidden = !cs.length;
        if (cs.length) choisirTeinte(cs[0]);
        else { appliquer(); majAdresse(); }
        mesure('Logo essayé', { couleurs: String(cs.length) });
      };
      img.onerror = function () { verif.textContent = 'Cette image n\'a pas pu être lue. Essayez un fichier PNG ou JPEG.'; };
      img.src = lecteur.result;
    };
    lecteur.readAsDataURL(f);
  });
  teintes.addEventListener('click', function (e) {
    var b = e.target.closest('.cz__teinte');
    if (b) choisirTeinte(b.getAttribute('data-teinte'));
  });
  lienEmail.addEventListener('click', function () { mesure('Aperçu partagé', { moyen: 'e-mail', design: state.design }); });
  if (navigator.share) {
    btnPartager.hidden = false;
    btnPartager.addEventListener('click', function () {
      navigator.share({ title: sujetPartage(), text: textePartage(), url: location.href }).then(function () { mesure('Aperçu partagé', { moyen: 'partage', design: state.design }); }, function () {});
    });
  }

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
    var done = function () { copie.textContent = 'Lien copié.'; mesure('Aperçu partagé', { moyen: 'lien copié', design: state.design }); setTimeout(function () { copie.textContent = ''; }, 2500); };
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
