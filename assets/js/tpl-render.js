/*!
 * tpl-render.js — moteur partagé des aperçus de gabarits.
 * Utilisé côté navigateur (window.PSW) et par build.js (require).
 * Contient : outils de couleur et de contraste (WCAG), dérivation des palettes,
 * bibliothèque d'illustrations SVG, rendu des aperçus (miniature et page complète).
 * Aucune dépendance.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PSW = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Outils                                                              */
  /* ------------------------------------------------------------------ */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function isHex(v) { return typeof v === 'string' && /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v); }

  function normHex(hex) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    return '#' + h.toUpperCase();
  }

  function hexToRgb(hex) {
    var n = parseInt(normHex(hex).slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rgbToHex(rgb) {
    return '#' + rgb.map(function (v) {
      v = Math.round(Math.max(0, Math.min(255, v)));
      return (v < 16 ? '0' : '') + v.toString(16);
    }).join('').toUpperCase();
  }

  /** Luminance relative WCAG 2.x */
  function luminance(hex) {
    var c = hexToRgb(hex).map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  /** Rapport de contraste WCAG entre deux couleurs (1 à 21) */
  function contrast(a, b) {
    var la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  /** Mélange a vers b ; t = part de b (0 à 1) */
  function mix(a, b, t) {
    var A = hexToRgb(a), B = hexToRgb(b);
    return rgbToHex(A.map(function (v, i) { return v + (B[i] - v) * t; }));
  }

  /** Déplace fg vers `toward` jusqu'à atteindre le contraste `min` avec bg */
  function ensureContrast(fg, bg, min, toward) {
    var c = fg, t = 0;
    while (contrast(c, bg) < min && t < 1) {
      t = Math.min(1, t + 0.02);
      c = mix(fg, toward, t);
    }
    return c;
  }

  function ratioFr(r) { return (Math.floor(r * 10) / 10).toFixed(1).replace('.', ',') + ':1'; }

  /* ------------------------------------------------------------------ */
  /* Dérivation d'une palette en variables CSS + contrôle AA             */
  /* ------------------------------------------------------------------ */

  var WHITE = '#FFFFFF', DARK = '#111111';

  /**
   * @param {object} p palette {fond, surface, texte, accent, secondaire}
   * @param {string} [accentPerso] couleur d'accent libre (#RRGGBB)
   * @returns {{vars: object, report: object}}
   */
  function derive(p, accentPerso) {
    var bg = normHex(p.fond), ink = normHex(p.texte), surface = normHex(p.surface);
    var second = normHex(p.secondaire);
    var dark = luminance(bg) < 0.2;
    var original = normHex(isHex(accentPerso) ? accentPerso : p.accent);
    var accent = original;

    // 1. Texte posé sur l'accent (boutons) : blanc ou foncé, au meilleur contraste
    var cw = contrast(WHITE, accent), cd = contrast(DARK, accent);
    var onAccent = cw >= cd ? WHITE : DARK;
    var adjusted = false;
    if (Math.max(cw, cd) < 4.5) {
      accent = ensureContrast(accent, onAccent, 4.5, onAccent === WHITE ? '#000000' : '#FFFFFF');
      adjusted = accent !== original;
    }
    var ratioButton = contrast(onAccent, accent);

    // 2. Accent utilisé comme couleur de texte (liens, titres courts) sur le fond
    var accentText = accent;
    if (contrast(accent, bg) < 4.5) accentText = ensureContrast(accent, bg, 4.5, dark ? '#FFFFFF' : '#000000');
    if (contrast(accentText, surface) < 4.5) accentText = ensureContrast(accentText, surface, 4.5, dark ? '#FFFFFF' : '#000000');
    var ratioText = contrast(accentText, bg);

    // 3. Teintes dérivées
    var muted = mix(ink, bg, 0.3);
    var lowest = contrast(muted, surface) < contrast(muted, bg) ? surface : bg;
    if (contrast(muted, lowest) < 4.5) muted = ensureContrast(muted, lowest, 4.5, ink);
    var line = mix(ink, bg, 0.82);
    var accentSoft = mix(accent, bg, dark ? 0.78 : 0.86);
    var secondSoft = mix(second, bg, 0.6);

    var visibility = contrast(accent, bg);
    var messages = [];
    if (adjusted) {
      messages.push({ type: 'corrige', text: 'La couleur ' + original + ' a été ajustée en ' + accent + ' pour que le texte des boutons reste lisible (' + ratioFr(ratioButton) + ').' });
    } else {
      messages.push({ type: 'ok', text: 'Contraste du texte des boutons : ' + ratioFr(ratioButton) + ', conforme au niveau AA.' });
    }
    if (visibility < 3) {
      messages.push({ type: 'alerte', text: 'Cette couleur ressort peu sur le fond (' + ratioFr(visibility) + '). Les liens utiliseront une teinte plus contrastée (' + accentText + ').' });
    }

    return {
      vars: {
        '--p-bg': bg,
        '--p-surface': surface,
        '--p-ink': ink,
        '--p-muted': muted,
        '--p-line': line,
        '--p-accent': accent,
        '--p-on-accent': onAccent,
        '--p-accent-text': accentText,
        '--p-accent-soft': accentSoft,
        '--p-second': second,
        '--p-second-soft': secondSoft,
        '--p-error': dark ? '#FF9A8F' : '#B3261E'
      },
      report: {
        original: original,
        accent: accent,
        onAccent: onAccent,
        adjusted: adjusted,
        ratioButton: ratioButton,
        accentText: accentText,
        ratioText: ratioText,
        visibility: visibility,
        ok: ratioButton >= 4.5 && ratioText >= 4.5,
        messages: messages
      }
    };
  }

  function styleVars(vars) {
    return Object.keys(vars).map(function (k) { return k + ':' + vars[k]; }).join(';');
  }

  /* ------------------------------------------------------------------ */
  /* Icônes (24 × 24, trait)                                             */
  /* ------------------------------------------------------------------ */

  var ICONS = {
    assiette: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/>',
    tasse: '<path d="M4 9h12v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H15.5"/><path d="M8 3.5v2.5M12 3.5v2.5"/><path d="M3 21h15"/>',
    soleil: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
    sac: '<path d="M5 8h14l-1.2 12.5H6.2z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/>',
    cadeau: '<path d="M4.5 11h15v9.5h-15z"/><path d="M3.5 7.5h17V11h-17zM12 7.5v13"/><path d="M12 7.5C10 3.5 6.5 4.5 7.5 7.5M12 7.5c2-4 5.5-3 4.5 0"/>',
    etiquette: '<path d="M3.5 12.5V4h8.5l9 9-8.5 8.5z"/><circle cx="8" cy="8.5" r="1.4"/>',
    marteau: '<path d="M13 3.5l7.5 7.5-2.5 2.5L10.5 6z"/><path d="M12.2 9.8L4 18l2 2 8.2-8.2"/>',
    maison: '<path d="M3 11.5L12 4l9 7.5"/><path d="M5.5 10v10.5h13V10"/><path d="M10 20.5v-6h4v6"/>',
    devis: '<path d="M6 3h9l4 4v14H6z"/><path d="M14.5 3v4.5H19M9 12h7M9 16h5"/>',
    repere: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    feuille: '<path d="M5 19C5 10 11 5 20 5c0 9-5.5 15-14 14z"/><path d="M5 19l8.5-8.5"/>',
    goutte: '<path d="M12 3s6.5 7 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 10 12 3 12 3z"/>',
    calendrier: '<path d="M4 5.5h16v15H4zM4 10h16M8.5 3v5M15.5 3v5"/>',
    balance: '<path d="M12 4v16M7 20h10M4.5 8h15"/><path d="M5.5 8l-3 6.5a3.2 3.2 0 0 0 6 0zM18.5 8l-3 6.5a3.2 3.2 0 0 0 6 0z"/>',
    dossier: '<path d="M3 6h6.5l2 2.5H21V19H3z"/>',
    equipe: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16.5 5.2a3 3 0 0 1 0 5.6M17.5 14.5A5.5 5.5 0 0 1 21 20"/>',
    lit: '<path d="M3 18.5V6.5M3 14h18v4.5"/><path d="M21 14v-2.5a3 3 0 0 0-3-3h-7.5V14"/><circle cx="6.8" cy="11" r="1.8"/>',
    cle: '<circle cx="8" cy="15" r="4"/><path d="M11 12.5L20 4M17 7l2.5 2.5M14.5 9.5L16.5 11.5"/>',
    coeur: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/>',
    ballon: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5l4 3-1.5 4.5h-5L8 10.5zM12 3.5v4M16 10.5l4-1M14.5 15l2.5 3.5M9.5 15L7 18.5M8 10.5l-4-1"/>',
    chrono: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 2M10 2.5h4M18.5 6.5l1.5-1.5"/>',
    annonce: '<path d="M4 10v4h3.5l7.5 4.5v-13L7.5 10z"/><path d="M18 9a4 4 0 0 1 0 6"/>',
    camion: '<path d="M2.5 6.5h11v9.5h-11zM13.5 9.5h4l3.5 3.5v3h-7.5"/><circle cx="6.5" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    outil: '<path d="M14.5 4.5a4.5 4.5 0 0 0 5 6L12 18a2.3 2.3 0 0 1-3.3-3.3l7.5-7.5"/><path d="M14.5 4.5l-1.5 3.5 3 3 3.5-1.5"/>',
    appareil: '<path d="M3.5 8h4l2-3h5l2 3h4v11.5h-17z"/><circle cx="12" cy="13.5" r="3.5"/>',
    crayon: '<path d="M4 20l1.2-4.8L16 4.5l3.5 3.5L8.8 18.8z"/><path d="M14 6.5l3.5 3.5"/>',
    etoile: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
    telephone: '<path d="M6.5 3.5h3l1.5 4.5-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4.5 1.5v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2z"/>',
    horloge: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    croix: '<path d="M9.5 3.5h5v6h6v5h-6v6h-5v-6h-6v-5h6z"/>',
    ciseaux: '<circle cx="6.5" cy="7" r="2.5"/><circle cx="6.5" cy="17" r="2.5"/><path d="M8.5 8.5L20 17M8.5 15.5L20 7"/>',
    portfolio: '<path d="M3.5 7.5h17v12h-17zM8.5 7.5V5h7v2.5M3.5 12.5h17"/>',
    wifi: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19" r="1"/>',
    parking: '<path d="M4 4h16v16H4z"/><path d="M9.5 17V7.5h3.5a3 3 0 0 1 0 6H9.5"/>',
    jardin: '<path d="M12 21v-8M12 13c-4 0-6-2.5-6-6.5 4 0 6 2.5 6 6.5zM12 13c4 0 6-2.5 6-6.5-4 0-6 2.5-6 6.5zM5 21h14"/>',
    voiture: '<path d="M3.5 16v-3.5l2.2-5h12.6l2.2 5V16z"/><path d="M3.5 16v2.5h3V16M17.5 16v2.5h3V16M3.5 12.5h17"/><circle cx="7.5" cy="14.3" r="0.6"/><circle cx="16.5" cy="14.3" r="0.6"/>',
    pneu: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/><path d="M12 3.5v5M12 15.5v5M3.5 12h5M15.5 12h5"/>',
    patte: '<ellipse cx="12" cy="16" rx="4.5" ry="3.8"/><circle cx="6" cy="10.5" r="1.9"/><circle cx="9.5" cy="6.5" r="1.9"/><circle cx="14.5" cy="6.5" r="1.9"/><circle cx="18" cy="10.5" r="1.9"/>',
    panneau: '<path d="M5 21V3.5M5 5.5h14v8.5H5"/><path d="M8.5 9.5h7"/>',
    bouclier: '<path d="M12 3l7.5 3v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6z"/><path d="M8.8 12l2.3 2.3 4.2-4.6"/>',
    loupe: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/>',
    euro: '<path d="M17 6.5a7 7 0 1 0 0 11M4.5 10.5h9M4.5 13.5h9"/>'
  };

  function icon(name, cls) {
    var body = ICONS[name] || ICONS.etoile;
    return '<svg class="' + (cls || 'pv-ico') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + body + '</svg>';
  }

  /* ------------------------------------------------------------------ */
  /* Illustrations (400 × 300) — classes : k fond, s surface, i texte,   */
  /* a accent, b secondaire, m accent clair, n secondaire clair          */
  /* ------------------------------------------------------------------ */

  var ART = {
    cafe:
      '<rect class="s" width="400" height="300"/>' +
      '<circle class="n" cx="318" cy="96" r="64"/>' +
      '<path class="a" d="M24 0h208v46a26 26 0 0 1-52 0 26 26 0 0 1-52 0 26 26 0 0 1-52 0 26 26 0 0 1-52 0z"/>' +
      '<path class="k" d="M50 0h26v46a13 13 0 0 1-26 0zM154 0h26v46a13 13 0 0 1-26 0z" opacity=".35"/>' +
      '<rect class="m" y="214" width="400" height="86"/>' +
      '<rect class="i" y="210" width="400" height="8" opacity=".85"/>' +
      '<path class="k" d="M118 128h104v52a52 52 0 0 1-104 0z"/>' +
      '<path class="i" d="M222 140h12a22 22 0 0 1 0 44h-16v-12h16a10 10 0 0 0 0-20h-12z"/>' +
      '<path class="a" d="M118 128h104v14H118z"/>' +
      '<path class="sa" d="M150 112c-12-14 12-22 0-38M176 112c-12-14 12-22 0-38M202 112c-12-14 12-22 0-38" fill="none" stroke-width="7" stroke-linecap="round"/>' +
      '<ellipse class="k" cx="314" cy="216" rx="64" ry="14"/>' +
      '<path class="b" d="M262 210c10-22 94-22 104 0z"/>' +
      '<circle class="a" cx="290" cy="200" r="6"/><circle class="a" cx="318" cy="196" r="6"/><circle class="a" cx="342" cy="203" r="6"/>',
    boutique:
      '<rect class="s" width="400" height="300"/>' +
      '<rect class="k" x="56" y="70" width="288" height="230"/>' +
      '<path class="a" d="M40 60h320v40H40z"/>' +
      '<path class="k" d="M40 100h40v18a20 20 0 0 1-40 0zM120 100h40v18a20 20 0 0 1-40 0zM200 100h40v18a20 20 0 0 1-40 0zM280 100h40v18a20 20 0 0 1-40 0z" opacity=".9"/>' +
      '<path class="a" d="M80 100h40v18a20 20 0 0 1-40 0zM160 100h40v18a20 20 0 0 1-40 0zM240 100h40v18a20 20 0 0 1-40 0zM320 100h40v18a20 20 0 0 1-40 0z"/>' +
      '<rect class="m" x="80" y="156" width="150" height="112" rx="4"/>' +
      '<rect class="i" x="252" y="156" width="70" height="144" rx="4"/>' +
      '<circle class="k" cx="306" cy="232" r="5"/>' +
      '<rect class="b" x="98" y="212" width="32" height="56" rx="6"/>' +
      '<circle class="a" cx="160" cy="236" r="22"/>' +
      '<path class="n" d="M190 268l18-46 18 46z"/>' +
      '<rect class="i" x="74" y="268" width="162" height="8" opacity=".8"/>' +
      '<path class="si" d="M300 26h70M346 26v10" fill="none" stroke-width="5" stroke-linecap="round"/>' +
      '<circle class="b" cx="346" cy="48" r="15"/>',
    atelier:
      '<rect class="s" width="400" height="300"/>' +
      '<circle class="n" cx="72" cy="70" r="40"/>' +
      '<rect class="m" y="252" width="400" height="48"/>' +
      '<path class="a" d="M96 120L200 40l104 80z"/>' +
      '<rect class="k" x="112" y="120" width="176" height="132"/>' +
      '<path class="si" d="M112 120h176M112 186h176M112 252h176M112 120v132M200 120v132M288 120v132M112 120l88 66M200 120l-88 66M200 186l88 66M288 186l-88 66M200 186l88-66" fill="none" stroke-width="7" stroke-linejoin="round"/>' +
      '<rect class="b" x="138" y="140" width="40" height="30"/><rect class="b" x="222" y="140" width="40" height="30"/>' +
      '<rect class="i" x="184" y="204" width="32" height="48"/>' +
      '<path class="si" d="M330 252V120M362 252V120M330 140h32M330 172h32M330 204h32M330 236h32" fill="none" stroke-width="6"/>' +
      '<rect class="a" x="40" y="214" width="46" height="38" rx="4"/><path class="si" d="M52 214v-8h22v8" fill="none" stroke-width="5"/>',
    serenite:
      '<rect class="s" width="400" height="300"/>' +
      '<circle class="m" cx="270" cy="120" r="96"/>' +
      '<path class="b" d="M70 230c0-70 40-118 112-130-4 72-44 122-112 130z" opacity=".9"/>' +
      '<path class="sk" d="M76 226l92-112" fill="none" stroke-width="5" stroke-linecap="round"/>' +
      '<path class="n" d="M110 250c10-60 52-92 104-92-10 56-50 90-104 92z"/>' +
      '<ellipse class="i" cx="270" cy="268" rx="96" ry="12" opacity=".12"/>' +
      '<ellipse class="a" cx="270" cy="246" rx="86" ry="26"/>' +
      '<ellipse class="b" cx="270" cy="208" rx="62" ry="20"/>' +
      '<ellipse class="k" cx="270" cy="176" rx="40" ry="15"/>' +
      '<ellipse class="a" cx="270" cy="152" rx="22" ry="10" opacity=".75"/>',
    cabinet:
      '<rect class="s" width="400" height="300"/>' +
      '<rect class="k" x="44" y="36" width="150" height="122" rx="4"/>' +
      '<path class="si" d="M119 36v122M44 97h150" fill="none" stroke-width="5"/>' +
      '<circle class="n" cx="84" cy="70" r="16"/>' +
      '<rect class="i" x="230" y="40" width="130" height="190" rx="3" opacity=".9"/>' +
      '<rect class="k" x="240" y="50" width="110" height="52"/><rect class="k" x="240" y="112" width="110" height="52"/><rect class="k" x="240" y="174" width="110" height="46"/>' +
      '<rect class="a" x="248" y="58" width="14" height="44"/><rect class="b" x="264" y="64" width="12" height="38"/><rect class="a" x="278" y="58" width="16" height="44" opacity=".7"/><rect class="i" x="296" y="70" width="12" height="32" opacity=".7"/>' +
      '<rect class="b" x="250" y="122" width="14" height="42"/><rect class="i" x="266" y="128" width="12" height="36" opacity=".6"/><rect class="a" x="280" y="120" width="16" height="44"/>' +
      '<path class="a" d="M300 164l26-40 10 6-26 40z" opacity=".8"/>' +
      '<rect class="m" y="230" width="400" height="70"/>' +
      '<rect class="i" x="20" y="222" width="360" height="12" rx="3"/>' +
      '<rect class="k" x="70" y="186" width="96" height="36" rx="3"/><rect class="b" x="80" y="196" width="60" height="5"/><rect class="b" x="80" y="207" width="44" height="5" opacity=".6"/>' +
      '<path class="a" d="M184 222v-38h22v38z"/><path class="n" d="M195 184c-14-6-18-26-8-34 4 12 12 18 8 34zM195 184c12-8 30-4 32 8-12 0-22-2-32-8z"/>',
    escale:
      '<rect class="s" width="400" height="300"/>' +
      '<circle class="n" cx="300" cy="78" r="38"/>' +
      '<path class="b" d="M0 196l84-86 62 52 74-92 96 98 84-54v186H0z" opacity=".55"/>' +
      '<path class="a" d="M0 228l110-70 80 46 90-64 120 76v84H0z"/>' +
      '<path class="m" d="M0 300v-46c80-26 170-30 250-10 60 14 110 14 150 4v52z"/>' +
      '<path class="i" d="M118 214l44-34 44 34z"/><rect class="k" x="126" y="214" width="72" height="48"/><rect class="b" x="138" y="226" width="16" height="16"/><rect class="i" x="168" y="232" width="18" height="30"/>' +
      '<path class="i" d="M262 252l18-48 18 48zM292 258l14-38 14 38z" opacity=".8"/>',
    sante:
      '<rect class="s" width="400" height="300"/>' +
      '<circle class="m" cx="128" cy="150" r="92"/>' +
      '<rect class="k" x="190" y="58" width="168" height="182" rx="12"/>' +
      '<rect class="a" x="190" y="58" width="168" height="40" rx="12"/><rect class="a" x="190" y="84" width="168" height="14"/>' +
      '<path class="sk" d="M226 48v24M322 48v24" fill="none" stroke-width="8" stroke-linecap="round"/>' +
      '<g class="n"><rect x="208" y="114" width="28" height="22" rx="4"/><rect x="246" y="114" width="28" height="22" rx="4"/><rect x="284" y="114" width="28" height="22" rx="4"/><rect x="322" y="114" width="20" height="22" rx="4"/><rect x="208" y="146" width="28" height="22" rx="4"/><rect x="284" y="146" width="28" height="22" rx="4"/><rect x="322" y="146" width="20" height="22" rx="4"/><rect x="208" y="178" width="28" height="22" rx="4"/><rect x="246" y="178" width="28" height="22" rx="4"/></g>' +
      '<rect class="a" x="246" y="146" width="28" height="22" rx="4"/>' +
      '<circle class="b" cx="128" cy="150" r="52"/>' +
      '<path class="k" d="M118 116h20v24h24v20h-24v24h-20v-24H94v-20h24z"/>',
    club:
      '<rect class="s" width="400" height="300"/>' +
      '<path class="m" d="M0 300V190c90-50 310-50 400 0v110z"/>' +
      '<path class="sk" d="M0 236c100-44 300-44 400 0M0 270c100-44 300-44 400 0" fill="none" stroke-width="6"/>' +
      '<circle class="k" cx="276" cy="122" r="62"/>' +
      '<path class="i" d="M276 94l24 18-9 28h-30l-9-28z"/>' +
      '<path class="si" d="M276 60v34M300 112l34-10M291 140l20 30M261 140l-20 30M252 112l-34-10" fill="none" stroke-width="5"/>' +
      '<circle class="si" cx="276" cy="122" r="62" fill="none" stroke-width="5"/>' +
      '<path class="si" d="M92 216V58" fill="none" stroke-width="6" stroke-linecap="round"/>' +
      '<path class="a" d="M95 60l84 26-84 28z"/>' +
      '<circle class="b" cx="60" cy="60" r="10"/><circle class="b" cx="356" cy="40" r="7"/><circle class="a" cx="190" cy="40" r="6"/>',
    services:
      '<rect class="s" width="400" height="300"/>' +
      '<path class="n" d="M0 190c60-40 120-50 200-30s140 10 200-20v160H0z"/>' +
      '<rect class="m" y="232" width="400" height="68"/>' +
      '<path class="sk" d="M0 266h400" fill="none" stroke-width="5" stroke-dasharray="26 18"/>' +
      '<path class="a" d="M74 146h150v84H74z"/>' +
      '<path class="a" d="M224 170h52l36 30v30h-88z"/>' +
      '<path class="k" d="M236 180h36l24 22h-60z" opacity=".9"/>' +
      '<rect class="k" x="92" y="164" width="96" height="22" rx="3" opacity=".9"/>' +
      '<circle class="i" cx="118" cy="232" r="20"/><circle class="k" cx="118" cy="232" r="8"/>' +
      '<circle class="i" cx="266" cy="232" r="20"/><circle class="k" cx="266" cy="232" r="8"/>' +
      '<path class="b" d="M330 120s-28-25-28-46a28 28 0 0 1 56 0c0 21-28 46-28 46z"/><circle class="k" cx="330" cy="74" r="11"/>',
    folio:
      '<rect class="s" width="400" height="300"/>' +
      '<circle class="m" cx="96" cy="84" r="58"/>' +
      '<g transform="rotate(-7 160 170)"><rect class="k" x="70" y="96" width="150" height="160" rx="4"/><rect class="b" x="84" y="110" width="122" height="104"/><circle class="a" cx="160" cy="160" r="26"/><rect class="i" x="84" y="226" width="80" height="8" opacity=".5"/></g>' +
      '<g transform="rotate(6 280 150)"><rect class="k" x="214" y="56" width="140" height="170" rx="4"/><rect class="a" x="228" y="70" width="112" height="116"/><path class="n" d="M228 186l40-48 30 30 18-20 24 38z"/><rect class="i" x="228" y="198" width="70" height="8" opacity=".5"/></g>' +
      '<path class="si" d="M300 280l50-50" fill="none" stroke-width="8" stroke-linecap="round"/><path class="a" d="M350 230l14-14 8 8-14 14z"/>'
  };

  ART.garage =
    '<rect class="s" width="400" height="300"/>' +
    '<circle class="n" cx="330" cy="72" r="42"/>' +
    '<path class="i" d="M30 120L150 62l120 58v138H30z"/>' +
    '<rect class="a" x="112" y="92" width="76" height="20" rx="4"/>' +
    '<rect class="k" x="58" y="136" width="184" height="122"/>' +
    '<path class="sb" d="M58 145h184M58 157h184M58 169h184" fill="none" stroke-width="7"/>' +
    '<rect class="m" y="258" width="400" height="42"/>' +
    '<path class="a" d="M118 238c0-15 11-25 26-27l24-24c6-6 13-8 21-8h58c9 0 17 4 23 10l22 22c19 2 32 12 32 29v12H118z"/>' +
    '<path class="k" d="M178 190h28v22h-48zM216 190h28c5 0 9 2 12 5l15 17h-55z" opacity=".9"/>' +
    '<circle class="i" cx="162" cy="252" r="19"/><circle class="k" cx="162" cy="252" r="7"/>' +
    '<circle class="i" cx="284" cy="252" r="19"/><circle class="k" cx="284" cy="252" r="7"/>';
  ART.immobilier =
    '<rect class="s" width="400" height="300"/>' +
    '<circle class="n" cx="84" cy="70" r="36"/>' +
    '<rect class="m" y="250" width="400" height="50"/>' +
    '<path class="i" d="M36 172l52-42 52 42z" opacity=".85"/><rect class="k" x="48" y="172" width="80" height="78"/><rect class="b" x="64" y="188" width="22" height="20"/><rect class="b" x="96" y="188" width="18" height="20"/>' +
    '<path class="a" d="M150 122l82-64 82 64z"/><rect class="k" x="166" y="122" width="132" height="128"/>' +
    '<rect class="b" x="184" y="142" width="36" height="30"/><rect class="b" x="244" y="142" width="36" height="30"/><rect class="i" x="216" y="194" width="32" height="56"/>' +
    '<path class="si" d="M346 250v-90" fill="none" stroke-width="6"/>' +
    '<rect class="a" x="306" y="146" width="80" height="48" rx="4"/>' +
    '<path class="sk" d="M318 162h56M318 177h36" fill="none" stroke-width="6" stroke-linecap="round"/>';
  ART.animaux =
    '<rect class="s" width="400" height="300"/>' +
    '<circle class="m" cx="196" cy="150" r="112"/>' +
    '<ellipse class="a" cx="196" cy="186" rx="54" ry="45"/>' +
    '<ellipse class="a" cx="122" cy="130" rx="20" ry="26" transform="rotate(-22 122 130)"/>' +
    '<ellipse class="a" cx="164" cy="96" rx="20" ry="27" transform="rotate(-7 164 96)"/>' +
    '<ellipse class="a" cx="228" cy="96" rx="20" ry="27" transform="rotate(7 228 96)"/>' +
    '<ellipse class="a" cx="270" cy="130" rx="20" ry="26" transform="rotate(22 270 130)"/>' +
    '<g class="b" transform="rotate(-32 330 236)"><rect x="292" y="228" width="76" height="16" rx="8"/><circle cx="294" cy="228" r="11"/><circle cx="294" cy="244" r="11"/><circle cx="366" cy="228" r="11"/><circle cx="366" cy="244" r="11"/></g>' +
    '<circle class="n" cx="70" cy="240" r="16"/><circle class="b" cx="104" cy="262" r="9"/>';

  function art(name, extraClass, slice) {
    var body = ART[name] || ART.boutique;
    return '<svg class="psw-art' + (extraClass ? ' ' + extraClass : '') + '" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid ' + (slice ? 'slice' : 'meet') + '" aria-hidden="true" focusable="false">' + body + '</svg>';
  }

  /* Tuiles de galerie abstraites (100 × 100) */
  var TILES = [
    '<rect class="s" width="100" height="100"/><circle class="a" cx="72" cy="74" r="38"/><circle class="k" cx="30" cy="30" r="10"/>',
    '<rect class="b" width="100" height="100"/><path class="k" d="M0 24h100v10H0zM0 50h100v10H0zM0 76h100v10H0z" opacity=".55"/>',
    '<rect class="m" width="100" height="100"/><path class="a" d="M10 90L50 22l40 68z"/><circle class="b" cx="78" cy="24" r="10"/>',
    '<rect class="a" width="100" height="100"/><circle class="k" cx="50" cy="50" r="26"/><circle class="b" cx="50" cy="50" r="10"/>',
    '<rect class="n" width="100" height="100"/><path class="sa" d="M-10 80a60 60 0 0 1 120 0M10 80a40 40 0 0 1 80 0" fill="none" stroke-width="8"/>',
    '<rect class="i" width="100" height="100"/><circle class="b" cx="30" cy="70" r="18"/><rect class="a" x="54" y="20" width="30" height="30" rx="4"/>'
  ];

  function tile(i) {
    return '<svg class="psw-art pv-tile" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' + TILES[i % TILES.length] + '</svg>';
  }

  /* Portrait abstrait (équipe) */
  function avatar(i) {
    var c = ['a', 'b', 'i'][i % 3];
    return '<svg class="psw-art pv-avatar" viewBox="0 0 80 80" aria-hidden="true" focusable="false"><rect class="n" width="80" height="80"/><circle class="k" cx="40" cy="32" r="15"/><path class="' + c + '" d="M12 80c2-18 14-28 28-28s26 10 28 28z"/></svg>';
  }

  function mapSvg(radius) {
    return '<svg class="psw-art pv-map" viewBox="0 0 300 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' +
      '<rect class="s" width="300" height="180"/>' +
      '<path class="sb" d="M-10 140c60-30 90 10 150-20s100-60 170-40" fill="none" stroke-width="10" opacity=".55"/>' +
      '<path class="sk" d="M0 60h300M0 120h300M80 0v180M200 0v180M20 0l120 180M300 30L160 180" fill="none" stroke-width="7"/>' +
      (radius ? '<circle class="sa" cx="150" cy="88" r="64" fill="none" stroke-width="3" stroke-dasharray="8 6"/><circle class="a" cx="150" cy="88" r="64" opacity=".1"/>' : '') +
      '<path class="a" d="M150 92s-16-14-16-27a16 16 0 0 1 32 0c0 13-16 27-16 27z"/><circle class="k" cx="150" cy="65" r="6"/>' +
      '</svg>';
  }

  /* ------------------------------------------------------------------ */
  /* Accès aux données                                                   */
  /* ------------------------------------------------------------------ */

  function findFont(data, id) {
    var list = data.polices || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return list[0];
  }

  function fontVars(font) {
    return font ? { '--p-ff-title': font.cssTitres, '--p-ff-body': font.cssTexte, '--p-title-weight': String(font.graisseTitres || 700) } : {};
  }

  function assign(a, b) { for (var k in b) if (Object.prototype.hasOwnProperty.call(b, k)) a[k] = b[k]; return a; }

  /* ------------------------------------------------------------------ */
  /* Miniature (cartes du catalogue)                                     */
  /* ------------------------------------------------------------------ */

  function renderMini(tpl, data, paletteIndex) {
    var pal = tpl.palettes[paletteIndex || 0];
    var d = derive(pal);
    var font = findFont(data, (tpl.polices || [])[0]);
    var vars = assign(assign({}, d.vars), fontVars(font));
    var head = tpl.enteteParDefaut || 'cote';
    var demo = tpl.demo || {};
    var blocks = (demo.services || []).slice(0, 3).map(function (s) {
      return '<span class="mini-block">' + icon(s.icone, 'mini-ico') + '<span class="mini-bar"></span><span class="mini-bar mini-bar--short"></span></span>';
    }).join('');
    return '<div class="mini mini--' + esc(head) + '" style="' + esc(styleVars(vars)) + '" data-mini="' + esc(tpl.id) + '" role="img" aria-label="' + esc('Aperçu du gabarit ' + tpl.nom + ', palette ' + pal.nom) + '">' +
      '<div class="mini-nav"><span class="mini-logo"></span><span class="mini-name">' + esc(demo.nom) + '</span><span class="mini-links"><i></i><i></i><i></i></span><span class="mini-cta"></span></div>' +
      '<div class="mini-hero">' + art(tpl.illustration, 'mini-art', head === 'plein') +
      '<div class="mini-text"><span class="mini-title">' + esc(demo.accroche) + '</span><span class="mini-bar"></span><span class="mini-bar mini-bar--short"></span><span class="mini-btn">' + esc(demo.bouton) + '</span></div></div>' +
      '<div class="mini-blocks">' + blocks + '</div>' +
      '</div>';
  }

  /* ------------------------------------------------------------------ */
  /* Aperçu complet (personnalisateur)                                   */
  /* ------------------------------------------------------------------ */

  function sec(title, body, cls) {
    return '<div class="pv-sec' + (cls ? ' ' + cls : '') + '"><div class="pv-in">' + (title ? '<p class="pv-h">' + esc(title) + '</p>' : '') + body + '</div></div>';
  }

  function stars(n) {
    var s = '';
    for (var i = 0; i < 5; i++) s += '<span class="pv-star' + (i < n ? '' : ' pv-star--off') + '"></span>';
    return '<span class="pv-stars">' + s + '</span>';
  }

  var SPECIALS = {
    carte: function (sp) {
      return sec(sp.titre, '<div class="pv-menu">' + sp.items.map(function (it) {
        return '<div class="pv-menu-row"><span class="pv-menu-name">' + esc(it.nom) + (it.detail ? '<small>' + esc(it.detail) + '</small>' : '') + '</span><span class="pv-menu-dots"></span><span class="pv-menu-price">' + esc(it.prix) + '</span></div>';
      }).join('') + '</div>' + (sp.note ? '<p class="pv-note">' + esc(sp.note) + '</p>' : ''), 'pv-sec--alt');
    },
    produits: function (sp) {
      return sec(sp.titre, '<div class="pv-products">' + sp.items.map(function (it, i) {
        return '<div class="pv-product">' + tile(i + 2) + '<span class="pv-product-name">' + esc(it.nom) + '</span><span class="pv-product-price">' + esc(it.prix) + '</span></div>';
      }).join('') + '</div>', 'pv-sec--alt');
    },
    zone: function (sp) {
      return sec(sp.titre, '<div class="pv-two">' +
        '<div class="pv-zone">' + mapSvg(true) + '<p class="pv-txt">' + esc(sp.texte) + '</p><div class="pv-chips">' + sp.villes.map(function (v) { return '<span class="pv-chip">' + esc(v) + '</span>'; }).join('') + '</div></div>' +
        '<div class="pv-form"><p class="pv-h3">' + esc(sp.formTitre || 'Demander un devis') + '</p>' +
        '<span class="pv-field">Votre nom</span><span class="pv-field">Téléphone</span><span class="pv-field pv-field--area">Décrivez votre projet</span>' +
        '<span class="pv-btn">' + esc(sp.bouton || 'Envoyer ma demande') + '</span></div>' +
        '</div>', 'pv-sec--alt');
    },
    tarifs: function (sp) {
      return sec(sp.titre, '<div class="pv-menu">' + sp.items.map(function (it) {
        return '<div class="pv-menu-row"><span class="pv-menu-name">' + esc(it.nom) + (it.detail ? '<small>' + esc(it.detail) + '</small>' : '') + '</span><span class="pv-menu-dots"></span><span class="pv-menu-price">' + esc(it.prix) + '</span></div>';
      }).join('') + '</div><p class="pv-center"><span class="pv-btn">' + esc(sp.bouton || 'Prendre rendez-vous') + '</span></p>', 'pv-sec--alt');
    },
    equipe: function (sp) {
      return sec(sp.titre, '<div class="pv-team">' + sp.items.map(function (it, i) {
        return '<div class="pv-person">' + avatar(i) + '<span class="pv-person-name">' + esc(it.nom) + '</span><span class="pv-person-role">' + esc(it.role) + '</span></div>';
      }).join('') + '</div>', 'pv-sec--alt');
    },
    equipements: function (sp) {
      var days = '';
      for (var i = 1; i <= 28; i++) days += '<span class="pv-day' + ([3, 4, 5, 11, 12, 18, 19, 20, 26].indexOf(i) >= 0 ? ' pv-day--busy' : '') + '">' + i + '</span>';
      return sec(sp.titre, '<div class="pv-two">' +
        '<div><div class="pv-chips pv-chips--icons">' + sp.items.map(function (it) { return '<span class="pv-chip">' + icon(it.icone, 'pv-ico pv-ico--sm') + esc(it.nom) + '</span>'; }).join('') + '</div></div>' +
        '<div class="pv-cal"><p class="pv-h3">' + esc(sp.calTitre || 'Disponibilités') + '</p><div class="pv-days">' + days + '</div><p class="pv-legend"><span class="pv-day pv-day--busy"></span>' + esc(sp.legende || 'Déjà réservé') + '</p><span class="pv-btn">' + esc(sp.bouton || 'Réserver') + '</span></div>' +
        '</div>', 'pv-sec--alt');
    },
    consultations: function (sp) {
      return sec(sp.titre, '<div class="pv-two">' +
        '<div class="pv-list">' + sp.items.map(function (it) { return '<div class="pv-list-row">' + icon(it.icone || 'calendrier', 'pv-ico pv-ico--sm') + '<span><strong>' + esc(it.nom) + '</strong><small>' + esc(it.detail) + '</small></span></div>'; }).join('') + '</div>' +
        '<div class="pv-form"><p class="pv-h3">' + esc(sp.infosTitre || 'Infos pratiques') + '</p>' + sp.infos.map(function (t) { return '<p class="pv-txt">' + esc(t) + '</p>'; }).join('') + '<span class="pv-btn">' + esc(sp.bouton || 'Prendre rendez-vous') + '</span></div>' +
        '</div>', 'pv-sec--alt');
    },
    planning: function (sp) {
      var rows = sp.lignes.map(function (l) {
        return '<div class="pv-plan-row"><span class="pv-plan-day">' + esc(l.jour) + '</span>' + l.creneaux.map(function (c, i) { return '<span class="pv-plan-slot pv-plan-slot--' + (i % 2 ? 'b' : 'a') + '">' + esc(c) + '</span>'; }).join('') + '</div>';
      }).join('');
      return sec(sp.titre, '<div class="pv-plan">' + rows + '</div>', 'pv-sec--alt');
    },
    projets: function (sp) {
      return sec(sp.titre, '<div class="pv-products pv-products--4">' + sp.items.map(function (it, i) {
        return '<div class="pv-product">' + tile(i + 1) + '<span class="pv-product-name">' + esc(it.nom) + '</span><span class="pv-product-price">' + esc(it.detail) + '</span></div>';
      }).join('') + '</div>', 'pv-sec--alt');
    }
  };

  var EXTRAS = {
    avis: function (tpl) {
      var cards = '';
      for (var i = 0; i < 3; i++) cards += '<div class="pv-review">' + stars(5 - (i === 2 ? 1 : 0)) + '<span class="pv-bar"></span><span class="pv-bar"></span><span class="pv-bar pv-bar--short"></span><span class="pv-review-who"><span class="pv-dot"></span><span class="pv-bar pv-bar--tiny"></span></span></div>';
      return sec(tpl.demo.avisTitre || 'Ils en parlent', '<div class="pv-reviews">' + cards + '</div><p class="pv-note">Emplacement prévu pour vos vrais avis clients.</p>');
    },
    realisations: function (tpl) {
      return sec(tpl.demo.realisationsTitre || 'Nos réalisations', '<div class="pv-products pv-products--4">' + [0, 1, 2, 3].map(function (i) {
        return '<div class="pv-product">' + tile(i + 3) + '<span class="pv-product-name">' + esc((tpl.demo.realisations || [])[i] || 'Chantier') + '</span></div>';
      }).join('') + '</div>');
    },
    bandeau: function (tpl) {
      var b = tpl.demo.bandeau || {};
      return '<div class="pv-band"><div class="pv-in pv-band-in"><p class="pv-band-title">' + esc(b.titre) + '</p><span class="pv-btn pv-btn--inverse">' + esc(b.bouton) + '</span></div></div>';
    },
    domaines: function (tpl) {
      var d = tpl.demo.domaines || [];
      return sec(tpl.demo.domainesTitre || 'Domaines d\'intervention', '<div class="pv-grid3 pv-grid3--compact">' + d.map(function (x) {
        return '<div class="pv-card pv-card--line">' + icon(x.icone, 'pv-ico') + '<p class="pv-h3">' + esc(x.nom) + '</p><p class="pv-txt">' + esc(x.texte) + '</p></div>';
      }).join('') + '</div>');
    },
    parcours: function (tpl) {
      var d = tpl.demo.parcours || [];
      return sec(tpl.demo.parcoursTitre || 'Parcours', '<div class="pv-timeline">' + d.map(function (x) {
        return '<div class="pv-tl-row"><span class="pv-tl-year">' + esc(x.annee) + '</span><span class="pv-txt">' + esc(x.texte) + '</span></div>';
      }).join('') + '</div>');
    }
  };

  /**
   * Rend la page factice d'un gabarit.
   * @param {object} tpl gabarit (templates.json)
   * @param {object} data templates.json complet (pour les polices)
   * @param {object} state {palette: 0-2, accent: '#hex'|null, polices: id, entete: 'plein'|'cote'}
   */
  function renderPreview(tpl, data, state) {
    state = state || {};
    var pi = Math.max(0, Math.min(tpl.palettes.length - 1, +state.palette || 0));
    var pal = tpl.palettes[pi];
    var d = derive(pal, state.accent);
    var font = findFont(data, state.polices || (tpl.polices || [])[0]);
    var head = state.entete === 'plein' || state.entete === 'cote' ? state.entete : (tpl.enteteParDefaut || 'cote');
    var demo = tpl.demo || {};
    var vars = assign(assign({}, d.vars), fontVars(font));
    var detailed = tpl.statut === 'disponible';

    var nomAff = state.nom && String(state.nom).trim() ? String(state.nom).trim() : demo.nom;
    var logoHtml = state.logo ? '<img class="pv-logo-img" src="' + esc(state.logo) + '" alt="">' : '<span class="pv-logo-mark">' + icon(demo.logo || (demo.services && demo.services[0] && demo.services[0].icone), 'pv-ico pv-ico--logo') + '</span>';
    var nav = '<div class="pv-nav"><div class="pv-in pv-nav-in"><span class="pv-logo">' + logoHtml + '<span class="pv-logo-name">' + esc(nomAff) + '</span></span>' +
      '<span class="pv-links">' + (demo.menu || []).map(function (m) { return '<span>' + esc(m) + '</span>'; }).join('') + '</span>' +
      '<span class="pv-btn pv-btn--sm">' + esc(demo.boutonNav || demo.bouton2 || 'Contact') + '</span><span class="pv-burger"><i></i><i></i><i></i></span></div></div>';

    var hero = '<div class="pv-hero pv-hero--' + head + '">' +
      (head === 'plein' ? '<div class="pv-hero-bg">' + art(tpl.illustration, 'pv-hero-art', true) + '</div>' : '') +
      '<div class="pv-in pv-hero-in"><div class="pv-hero-text">' +
      '<p class="pv-kicker">' + esc(demo.lieu) + '</p>' +
      '<p class="pv-title">' + esc(demo.accroche) + '</p>' +
      '<p class="pv-lead">' + esc(demo.texte) + '</p>' +
      '<p class="pv-actions"><span class="pv-btn">' + esc(demo.bouton) + '</span>' + (demo.bouton2 ? '<span class="pv-btn pv-btn--ghost">' + esc(demo.bouton2) + '</span>' : '') + '</p>' +
      '</div>' + (head === 'cote' ? '<div class="pv-hero-media">' + art(tpl.illustration, 'pv-hero-art') + '</div>' : '') + '</div></div>';

    var services = sec(demo.servicesTitre || 'Nos services', '<div class="pv-grid3">' + (demo.services || []).map(function (s) {
      return '<div class="pv-card">' + '<span class="pv-card-ico">' + icon(s.icone, 'pv-ico') + '</span><p class="pv-h3">' + esc(s.titre) + '</p><p class="pv-txt">' + esc(s.texte) + '</p></div>';
    }).join('') + '</div>');

    var special = demo.special && SPECIALS[demo.special.type] ? SPECIALS[demo.special.type](demo.special) : '';
    var extras = (detailed ? (demo.extras || []) : []).map(function (x) { return EXTRAS[x] ? EXTRAS[x](tpl) : ''; }).join('');

    var gal = '';
    var nTiles = detailed ? 5 : 4;
    for (var i = 0; i < nTiles; i++) gal += '<div class="pv-gal-item' + (detailed && i === 0 ? ' pv-gal-item--big' : '') + '">' + tile(i) + '</div>';
    var gallery = sec(demo.galerieTitre || 'Galerie', '<div class="pv-gal pv-gal--' + nTiles + '">' + gal + '</div>');

    var hours = (demo.horaires || []).map(function (h) { return '<div class="pv-hours-row"><span>' + esc(h[0]) + '</span><span>' + esc(h[1]) + '</span></div>'; }).join('');
    var info = sec(demo.infoTitre || 'Horaires et contact', '<div class="pv-two">' +
      '<div class="pv-hours">' + '<p class="pv-h3">' + icon('horloge', 'pv-ico pv-ico--sm') + 'Horaires</p>' + hours + '</div>' +
      '<div class="pv-contact">' + mapSvg(false) + '<p class="pv-txt">' + icon('repere', 'pv-ico pv-ico--sm') + esc(demo.adresse) + '</p><p class="pv-txt">' + icon('telephone', 'pv-ico pv-ico--sm') + '03 00 00 00 00</p></div>' +
      '</div>');

    var foot = '<div class="pv-foot"><div class="pv-in pv-foot-in"><span>' + esc(nomAff) + '</span><span>Mentions légales</span><span>Confidentialité</span></div></div>';

    var label = 'Aperçu du gabarit ' + tpl.nom + (state.nom ? ' pour ' + state.nom : '') + ' : palette ' + pal.nom + (state.accent ? ' avec accent personnalisé ' + d.report.accent : '') + ', polices ' + (font ? font.nom : '') + ', en-tête ' + (head === 'plein' ? 'plein écran' : 'texte à côté de l\'image') + '. Exemple fictif.';

    var html = '<div class="pv pv--' + esc(tpl.id) + ' pv--head-' + head + (detailed ? ' pv--detailed' : '') + '" style="' + esc(styleVars(vars)) + '">' +
      nav + hero + services + special + extras + gallery + info + foot + '</div>';

    return { html: html, label: label, report: d.report, palette: pal, font: font, entete: head, vars: vars, nom: nomAff };
  }

  return {
    esc: esc,
    isHex: isHex,
    normHex: normHex,
    contrast: contrast,
    luminance: luminance,
    mix: mix,
    ratioFr: ratioFr,
    derive: derive,
    styleVars: styleVars,
    icon: icon,
    art: art,
    tile: tile,
    findFont: findFont,
    fontVars: fontVars,
    renderMini: renderMini,
    mapSvg: mapSvg,
    avatar: avatar,
    findTemplate: function (data, id) { for (var i = 0; i < data.gabarits.length; i++) if (data.gabarits[i].id === id) return data.gabarits[i]; return null; },
    renderPreview: renderPreview,
    ICONS: ICONS,
    ART: ART
  };
});
