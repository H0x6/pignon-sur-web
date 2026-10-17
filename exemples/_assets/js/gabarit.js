/*!
 * horaires.js — horaires réels d'un commerce, à l'heure de Paris :
 * semaine type, jours fériés (dont le Vendredi saint et la Saint-Étienne en Alsace-Moselle),
 * congés et fermetures exceptionnelles. Calcule « Ouvert jusqu'à 18 h », les fermetures à venir
 * et les créneaux de retrait des commandes.
 * Partagé par les sites des clients (concaténé devant gabarit.js) et par la console.
 * Sans dépendance. En français, allemand et anglais.
 */
(function (global) {
  'use strict';

  // Index = Date.getDay() (0 = dimanche)
  var JOURS = ['di', 'lu', 'ma', 'me', 'je', 've', 'sa'];
  var ORDRE = ['lu', 'ma', 'me', 'je', 've', 'sa', 'di'];
  var SCHEMA = { Su: 'di', Mo: 'lu', Tu: 'ma', We: 'me', Th: 'je', Fr: 've', Sa: 'sa' };

  var T = {
    fr: {
      jours: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
      mois: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
      ouvert: 'Ouvert jusqu’à {h}',
      ouvertPause: 'Ouvert jusqu’à {h}, puis de {h2} à {h3}',
      ouvre: 'Fermé, ouvre {quand}à {h}',
      ouvreLoin: 'réouverture le {date} à {h}',
      aujourdhui: '',
      demain: 'demain ',
      jour: '{jour} ',
      ferme: 'Fermé',
      motifAujourdhui: 'Fermé aujourd’hui ({motif}), ouvre {quand}à {h}',
      fermeLe: 'Fermé le {date}',
      fermeDu: 'Fermé du {du} au {au}',
      a: ' au ',
      et: ' et ',
      tirets: ' – ',
      premier: 'er',
      auj: 'Aujourd’hui',
      dem: 'Demain',
      conges: 'congés',
      motifs: { conges: 'congés', exceptionnelle: 'fermeture exceptionnelle', inventaire: 'inventaire', travaux: 'travaux', formation: 'formation' },
      plusieurs: 'Fermetures à venir',
      feries: {
        'jour-an': 'Jour de l’an', 'vendredi-saint': 'Vendredi saint', 'lundi-paques': 'lundi de Pâques', 'travail': 'fête du Travail',
        'victoire': 'Victoire 1945', 'ascension': 'Ascension', 'lundi-pentecote': 'lundi de Pentecôte', 'fete-nationale': 'fête nationale',
        'assomption': 'Assomption', 'toussaint': 'Toussaint', 'armistice': 'Armistice 1918', 'noel': 'Noël', 'saint-etienne': 'Saint-Étienne'
      }
    },
    de: {
      jours: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
      mois: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
      ouvert: 'Geöffnet bis {h}',
      ouvertPause: 'Geöffnet bis {h}, dann von {h2} bis {h3}',
      ouvre: 'Geschlossen, öffnet {quand}um {h}',
      ouvreLoin: 'wieder geöffnet am {date} um {h}',
      aujourdhui: '',
      demain: 'morgen ',
      jour: 'am {jour} ',
      ferme: 'Geschlossen',
      motifAujourdhui: 'Heute geschlossen ({motif}), öffnet {quand}um {h}',
      fermeLe: 'Geschlossen am {date}',
      fermeDu: 'Geschlossen vom {du} bis {au}',
      a: ' bis ',
      et: ' und ',
      tirets: ' – ',
      premier: '',
      auj: 'Heute',
      dem: 'Morgen',
      conges: 'Betriebsferien',
      motifs: { conges: 'Betriebsferien', exceptionnelle: 'außerordentlich geschlossen', inventaire: 'Inventur', travaux: 'Umbau', formation: 'Fortbildung' },
      plusieurs: 'Kommende Schließtage',
      feries: {
        'jour-an': 'Neujahr', 'vendredi-saint': 'Karfreitag', 'lundi-paques': 'Ostermontag', 'travail': 'Tag der Arbeit',
        'victoire': 'Kriegsende 1945', 'ascension': 'Christi Himmelfahrt', 'lundi-pentecote': 'Pfingstmontag', 'fete-nationale': 'Nationalfeiertag',
        'assomption': 'Mariä Himmelfahrt', 'toussaint': 'Allerheiligen', 'armistice': 'Waffenstillstand 1918', 'noel': 'Weihnachten', 'saint-etienne': 'Stephanstag'
      }
    },
    en: {
      jours: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      mois: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      ouvert: 'Open until {h}',
      ouvertPause: 'Open until {h}, then {h2} to {h3}',
      ouvre: 'Closed, opens {quand}at {h}',
      ouvreLoin: 'reopening on {date} at {h}',
      aujourdhui: '',
      demain: 'tomorrow ',
      jour: 'on {jour} ',
      ferme: 'Closed',
      motifAujourdhui: 'Closed today ({motif}), opens {quand}at {h}',
      fermeLe: 'Closed on {date}',
      fermeDu: 'Closed from {du} to {au}',
      a: ' to ',
      et: ' and ',
      tirets: ' – ',
      premier: '',
      auj: 'Today',
      dem: 'Tomorrow',
      conges: 'annual holiday',
      motifs: { conges: 'annual holiday', exceptionnelle: 'exceptional closure', inventaire: 'stocktaking', travaux: 'renovation work', formation: 'training' },
      plusieurs: 'Upcoming closures',
      feries: {
        'jour-an': 'New Year’s Day', 'vendredi-saint': 'Good Friday', 'lundi-paques': 'Easter Monday', 'travail': 'Labour Day',
        'victoire': 'VE Day', 'ascension': 'Ascension Day', 'lundi-pentecote': 'Whit Monday', 'fete-nationale': 'Bastille Day',
        'assomption': 'Assumption Day', 'toussaint': 'All Saints’ Day', 'armistice': 'Armistice Day', 'noel': 'Christmas Day', 'saint-etienne': 'St Stephen’s Day'
      }
    }
  };
  var tr = function (lang) { return T[lang] || T.fr; };
  var remplir = function (s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : ''; }); };

  /* Dates (chaînes « AAAA-MM-JJ », calculs en UTC pour éviter les changements d'heure) */
  function versMs(iso) { var p = String(iso).split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function versIso(ms) { return new Date(ms).toISOString().slice(0, 10); }
  function plusJours(iso, n) { return versIso(versMs(iso) + n * 864e5); }
  function jourSemaine(iso) { return new Date(versMs(iso)).getUTCDay(); }

  /** Dimanche de Pâques (calendrier grégorien, algorithme de Meeus/Jones/Butcher) */
  function paques(an) {
    var a = an % 19, b = Math.floor(an / 100), c = an % 100, d = Math.floor(b / 4), e = b % 4;
    var f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    var mois = Math.floor((h + l - 7 * m + 114) / 31), jour = ((h + l - 7 * m + 114) % 31) + 1;
    return versIso(Date.UTC(an, mois - 1, jour));
  }

  /** Jours fériés d'une année : [{ date, id }]. alsace : + Vendredi saint et Saint-Étienne (Alsace-Moselle) */
  function feries(an, alsace) {
    var p = paques(an);
    var l = [
      [an + '-01-01', 'jour-an'], [plusJours(p, 1), 'lundi-paques'], [an + '-05-01', 'travail'], [an + '-05-08', 'victoire'],
      [plusJours(p, 39), 'ascension'], [plusJours(p, 50), 'lundi-pentecote'], [an + '-07-14', 'fete-nationale'],
      [an + '-08-15', 'assomption'], [an + '-11-01', 'toussaint'], [an + '-11-11', 'armistice'], [an + '-12-25', 'noel']
    ];
    if (alsace) l.push([plusJours(p, -2), 'vendredi-saint'], [an + '-12-26', 'saint-etienne']);
    return l.map(function (x) { return { date: x[0], id: x[1] }; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  }
  function ferieDu(iso, alsace) {
    var l = feries(+iso.slice(0, 4), alsace);
    for (var i = 0; i < l.length; i++) if (l[i].date === iso) return l[i];
    return null;
  }

  /** « Mo-Fr 08:00-12:00 » (schema.org) → { lu: [['08:00','12:00']], … } */
  function depuisSchema(liste) {
    var s = {};
    ORDRE.forEach(function (j) { s[j] = []; });
    var cles = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    (liste || []).forEach(function (ligne) {
      var m = String(ligne).match(/^([A-Za-z,\- ]+)\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/);
      if (!m) return;
      m[1].replace(/\s/g, '').split(',').forEach(function (bloc) {
        var b = bloc.split('-'), a = cles.indexOf(b[0]), z = cles.indexOf(b[1] || b[0]);
        if (a < 0 || z < 0) return;
        for (var j = a; ; j = (j + 1) % 7) { s[SCHEMA[cles[j]]].push([m[2], m[3]]); if (j === z) break; }
      });
    });
    ORDRE.forEach(function (j) { s[j].sort(function (x, y) { return x[0] < y[0] ? -1 : 1; }); });
    return s;
  }
  /** Semaine → horaires schema.org (« Tu-Fr 07:30-12:30 ») */
  function versSchema(sem) {
    var cles = { lu: 'Mo', ma: 'Tu', me: 'We', je: 'Th', ve: 'Fr', sa: 'Sa', di: 'Su' };
    var out = [];
    groupes(sem).forEach(function (g) {
      if (!g.plages.length) return;
      var jours = cles[g.jours[0]] + (g.jours.length > 1 ? '-' + cles[g.jours[g.jours.length - 1]] : '');
      g.plages.forEach(function (p) { out.push(jours + ' ' + p[0] + '-' + p[1]); });
    });
    return out;
  }
  // Jours consécutifs (du lundi au dimanche) qui ont les mêmes horaires
  function groupes(sem) {
    var out = [];
    ORDRE.forEach(function (j) {
      var p = (sem && sem[j]) || [];
      var cle = JSON.stringify(p);
      var der = out[out.length - 1];
      if (der && der.cle === cle) der.jours.push(j);
      else out.push({ cle: cle, jours: [j], plages: p });
    });
    return out;
  }

  var enMin = function (h) { var p = String(h).split(':'); return +p[0] * 60 + +p[1]; };

  /** « 7 h 30 » (fr), « 7:30 Uhr » (de), « 7:30 am » (en) */
  function heure(min, lang) {
    var h = Math.floor(min / 60) % 24, m = min % 60, mm = (m < 10 ? '0' : '') + m;
    if (lang === 'de') return h + ':' + mm + ' Uhr';
    if (lang === 'en') { var h12 = h % 12 || 12; return h12 + (m ? ':' + mm : '') + (h < 12 ? ' am' : ' pm'); }
    return h + ' h' + (m ? ' ' + mm : '');
  }
  /** « lundi 1er décembre » / « Montag, 1. Dezember » / « Monday 1 December » */
  function dateLongue(iso, lang, sansJour) {
    var t = tr(lang), d = new Date(versMs(iso)), j = d.getUTCDate(), mo = t.mois[d.getUTCMonth()], js = t.jours[d.getUTCDay()];
    if (lang === 'de') return (sansJour ? '' : js + ', ') + j + '. ' + mo;
    if (lang === 'en') return (sansJour ? '' : js + ' ') + j + ' ' + mo;
    return (sansJour ? '' : js + ' ') + j + (j === 1 ? t.premier : '') + ' ' + mo;
  }

  /** Lignes d'horaires affichables : [['Mardi au vendredi', '7 h 30 – 12 h 30, 14 h 30 – 18 h 30'], …] */
  function lignes(sem, lang) {
    var t = tr(lang);
    var nom = function (j) { var s = t.jours[JOURS.indexOf(j)]; return s.charAt(0).toUpperCase() + s.slice(1); };
    return groupes(sem).map(function (g) {
      var jours = nom(g.jours[0]) + (g.jours.length === 2 ? t.et + t.jours[JOURS.indexOf(g.jours[1])] : g.jours.length > 2 ? t.a + t.jours[JOURS.indexOf(g.jours[g.jours.length - 1])] : '');
      return [jours, g.plages.length ? g.plages.map(function (p) { return heure(enMin(p[0]), lang) + t.tirets + heure(enMin(p[1]), lang); }).join(', ') : t.ferme];
    });
  }

  /** Infos complètes (avec valeurs par défaut) */
  function normaliser(i) {
    i = i || {};
    var sem = i.semaine || {};
    ORDRE.forEach(function (j) { if (!Array.isArray(sem[j])) sem[j] = []; });
    return {
      semaine: sem,
      fermetures: Array.isArray(i.fermetures) ? i.fermetures : [],
      feries: { ferme: !i.feries || i.feries.ferme !== false, ouverts: (i.feries && i.feries.ouverts) || [] },
      alsace: i.alsace !== false,
      annonce: i.annonce || {},
      platDuJour: i.platDuJour || {},
      commandes: i.commandes || {},
      maj: i.maj || ''
    };
  }

  /** Ce jour-là : { plages: [[début, fin] en minutes], motif: null | texte } */
  function journee(infos, iso, lang) {
    var t = tr(lang);
    var I = normaliser(infos);
    for (var k = 0; k < I.fermetures.length; k++) {
      var f = I.fermetures[k];
      if (f.du && iso >= f.du && iso <= (f.au || f.du)) return { plages: [], motif: t.motifs[f.motif] || f.motif || t.conges, fermeture: f };
    }
    var fe = ferieDu(iso, I.alsace);
    var base = (I.semaine[JOURS[jourSemaine(iso)]] || []).map(function (p) { return [enMin(p[0]), enMin(p[1])]; });
    if (fe && I.feries.ferme && I.feries.ouverts.indexOf(iso) < 0) return { plages: [], motif: t.feries[fe.id], ferie: fe, normalementOuvert: base.length > 0 };
    return { plages: base, motif: null, ferie: fe };
  }

  /** Date et heure à Paris : { iso, min } */
  function maintenant(d) {
    d = d || new Date();
    try {
      var parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
      var g = function (ty) { for (var i = 0; i < parts.length; i++) if (parts[i].type === ty) return parts[i].value; return '00'; };
      return { iso: g('year') + '-' + g('month') + '-' + g('day'), min: (+g('hour') % 24) * 60 + +g('minute') };
    } catch (err) {
      var p = function (n) { return (n < 10 ? '0' : '') + n; };
      return { iso: d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()), min: d.getHours() * 60 + d.getMinutes() };
    }
  }

  /** « Ouvert jusqu'à 18 h » / « Fermé, ouvre demain à 7 h » : { etat, texte } ou null sans horaires */
  function statut(infos, lang, quand) {
    var t = tr(lang), n = maintenant(quand);
    var auj = journee(infos, n.iso, lang);
    var sem = normaliser(infos).semaine;
    if (!ORDRE.some(function (j) { return sem[j].length; })) return null;
    for (var i = 0; i < auj.plages.length; i++) {
      var p = auj.plages[i];
      if (n.min >= p[0] && n.min < p[1]) {
        var suite = auj.plages[i + 1];
        return { etat: 'ouvert', texte: suite && suite[0] - p[1] < 300 ? remplir(t.ouvertPause, { h: heure(p[1], lang), h2: heure(suite[0], lang), h3: heure(suite[1], lang) }) : remplir(t.ouvert, { h: heure(p[1], lang) }) };
      }
    }
    var motif = auj.motif;
    for (var k = 0; k < 60; k++) {
      var iso = plusJours(n.iso, k);
      var j = k === 0 ? auj : journee(infos, iso, lang);
      if (!motif && j.motif) motif = j.motif;
      var cand = j.plages.filter(function (pl) { return k > 0 || pl[0] > n.min; });
      if (!cand.length) continue;
      var h = heure(cand[0][0], lang);
      // Longue fermeture (congés) : la raison et la date de réouverture
      if (k > 6) return { etat: 'ferme', texte: t.ferme + (motif ? ' (' + motif + ')' : '') + ', ' + remplir(t.ouvreLoin, { date: dateLongue(iso, lang), h: h }) };
      var qd = k === 0 ? t.aujourdhui : k === 1 ? t.demain : remplir(t.jour, { jour: t.jours[jourSemaine(iso)] });
      if (auj.motif && k > 0) return { etat: 'ferme', texte: remplir(t.motifAujourdhui, { motif: auj.motif, quand: qd, h: h }) };
      return { etat: 'ferme', texte: remplir(t.ouvre, { quand: qd, h: h }) };
    }
    return { etat: 'ferme', texte: t.ferme };
  }

  /** Fermetures exceptionnelles des prochains jours (congés, jours fériés un jour d'ouverture) :
      [{ du, au, motif, texte }] */
  function aVenir(infos, lang, nbJours) {
    var t = tr(lang), n = maintenant(), fin = plusJours(n.iso, nbJours || 45), out = [];
    var I = normaliser(infos);
    I.fermetures.forEach(function (f) {
      var au = f.au || f.du;
      if (au < n.iso || f.du > fin) return;
      out.push({ du: f.du, au: au, motif: t.motifs[f.motif] || f.motif || t.conges });
    });
    for (var k = 0; k <= (nbJours || 45); k++) {
      var iso = plusJours(n.iso, k);
      var j = journee(infos, iso, lang);
      if (j.ferie && j.normalementOuvert && !j.fermeture) out.push({ du: iso, au: iso, motif: j.motif });
    }
    out.sort(function (a, b) { return a.du < b.du ? -1 : 1; });
    return out.map(function (f) {
      f.texte = (f.du === f.au ? remplir(t.fermeLe, { date: dateLongue(f.du, lang) }) : remplir(t.fermeDu, { du: dateLongue(f.du, lang, true), au: dateLongue(f.au, lang, true) })) + (f.motif ? ' (' + f.motif + ')' : '');
      return f;
    });
  }

  /** Créneaux de retrait : [{ date, libelle, heures: ['08:30', …] }]
      o : { delai (minutes avant le premier créneau), pas (minutes), jours (nombre de jours proposés),
            marge (minutes avant la fermeture), max (nombre de jours d'ouverture affichés) } */
  function creneaux(infos, lang, o) {
    o = o || {};
    var delai = o.delai != null ? o.delai : 120, pas = o.pas || 30, marge = o.marge != null ? o.marge : 15;
    var n = maintenant(), debut = n.min + delai, out = [];
    for (var k = 0; k < (o.jours || 14) && out.length < (o.max || 7); k++) {
      var iso = plusJours(n.iso, k);
      var j = journee(infos, iso, lang);
      var heures = [];
      j.plages.forEach(function (p) {
        for (var m = Math.ceil(p[0] / pas) * pas; m <= p[1] - marge; m += pas) {
          if (k * 1440 + m < debut) continue;
          heures.push((Math.floor(m / 60) < 10 ? '0' : '') + Math.floor(m / 60) + ':' + (m % 60 < 10 ? '0' : '') + (m % 60));
        }
      });
      var t = tr(lang);
      var lib = k === 0 ? t.auj + ', ' + dateLongue(iso, lang) : k === 1 ? t.dem + ', ' + dateLongue(iso, lang) : dateLongue(iso, lang);
      if (heures.length) out.push({ date: iso, libelle: lib.charAt(0).toUpperCase() + lib.slice(1), heures: heures });
    }
    return out;
  }

  var API = {
    JOURS: JOURS, ORDRE: ORDRE, T: T, paques: paques, feries: feries, ferieDu: ferieDu, depuisSchema: depuisSchema, versSchema: versSchema,
    lignes: lignes, heure: heure, enMin: enMin, dateLongue: dateLongue, normaliser: normaliser, journee: journee, maintenant: maintenant,
    statut: statut, aVenir: aVenir, creneaux: creneaux, plusJours: plusJours, jourSemaine: jourSemaine
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else global.PV_HORAIRES = API;
})(typeof window !== 'undefined' ? window : this);

/*!
 * gabarit.js — comportements des sites générés : menu mobile, apparition des sections
 * au défilement, images, volets, horaires en direct (ouvert / fermé, jours fériés, congés),
 * annonce et plat du jour (console), commande à retirer, formulaires.
 * Sans dépendance, sans cookie. Précédé de horaires.js dans le fichier publié.
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
  // Lien d'évitement : place le focus sur le contenu sans changer d'adresse (fiable aussi sur la page 404,
  // dont les liens partent de la racine du site)
  var skip = doc.querySelector('.pv-skip');
  var contenu = doc.getElementById('contenu');
  if (skip && contenu) skip.addEventListener('click', function (e) { e.preventDefault(); contenu.focus(); contenu.scrollIntoView(); });
  // Langue de la page et textes affichés par ce script
  var LANG = (root && root.getAttribute('data-lang')) || doc.documentElement.lang || 'fr';
  var TXTS = {
    fr: {
      ferme: 'Fermé', fermeture: 'Fermeture à venir', fermetures: 'Fermetures à venir', menu: 'Menu', fermerMenu: 'Fermer le menu',
      nom: 'Indiquez votre nom.', telephone: 'Indiquez un numéro de téléphone valide.', email: 'Indiquez une adresse e-mail valide, par exemple nom@exemple.fr.',
      message: 'Écrivez votre message.', consentement: 'Cochez cette case pour que nous puissions vous répondre.', requis: 'Ce champ est obligatoire.',
      jour: 'Choisissez un jour.', heure: 'Choisissez une heure.', produits: 'Choisissez au moins un produit, ou écrivez votre commande dans « Autre chose ? ».',
      unChamp: 'Un champ est à corriger.', champs: 'champs sont à corriger.', merci: 'Merci, votre message est bien envoyé. Nous vous répondons rapidement.',
      reference: 'Référence :', exemple: 'Site d\'exemple', demonstration: 'Démonstration', demoTexte: 'ce formulaire fonctionne, mais n\'envoie rien. Sur votre site, le message vous parviendra directement.',
      messagerie: 'Votre messagerie va s\'ouvrir avec votre message déjà rédigé : il ne reste qu\'à l\'envoyer.', envoi: 'Envoi en cours…',
      echec: 'L\'envoi n\'a pas abouti. Réessayez, ou contactez-nous par téléphone', ou: 'ou à', sujet: 'Message depuis le site', sujetCommande: 'Commande pour',
      aucunProduit: 'Aucun produit pour l\'instant.', total: 'Total indicatif :', poids: '+ produits au poids, pesés au retrait', poidsSeul: 'Produits au poids : le prix est calculé au retrait.',
      retrait: 'Retrait', aucunCreneau: 'Aucun créneau dans les prochains jours', pause: 'Les commandes en ligne sont suspendues pour le moment. Appelez-nous.',
      commandeOk: 'Merci, votre commande est envoyée.', commandeDemo: 'Démonstration : voici la confirmation que verrait votre client.', passage: 'Vous passez la prendre :',
      emailParti: 'Une confirmation vient de partir à votre adresse e-mail. Vous payez sur place.', payer: 'Vous payez sur place. En cas de souci, nous vous appelons.'
    },
    de: {
      ferme: 'Geschlossen', fermeture: 'Kommender Schließtag', fermetures: 'Kommende Schließtage', menu: 'Menü', fermerMenu: 'Menü schließen',
      nom: 'Bitte geben Sie Ihren Namen an.', telephone: 'Bitte geben Sie eine gültige Telefonnummer an.', email: 'Bitte geben Sie eine gültige E-Mail-Adresse an, z. B. name@beispiel.de.',
      message: 'Bitte schreiben Sie Ihre Nachricht.', consentement: 'Bitte setzen Sie das Häkchen, damit wir Ihnen antworten können.', requis: 'Dieses Feld ist erforderlich.',
      jour: 'Bitte wählen Sie einen Tag.', heure: 'Bitte wählen Sie eine Uhrzeit.', produits: 'Bitte wählen Sie mindestens ein Produkt oder schreiben Sie Ihre Bestellung unter „Sonst noch etwas?“.',
      unChamp: 'Ein Feld ist zu korrigieren.', champs: 'Felder sind zu korrigieren.', merci: 'Vielen Dank, Ihre Nachricht wurde gesendet. Wir antworten Ihnen schnell.',
      reference: 'Referenz:', exemple: 'Beispielseite', demonstration: 'Vorführung', demoTexte: 'Dieses Formular funktioniert, sendet aber nichts. Auf Ihrer Website erhalten Sie die Nachricht direkt.',
      messagerie: 'Ihr E-Mail-Programm öffnet sich mit der fertigen Nachricht: Sie müssen sie nur noch senden.', envoi: 'Wird gesendet…',
      echec: 'Das Senden hat nicht geklappt. Versuchen Sie es erneut oder rufen Sie uns an', ou: 'oder schreiben Sie an', sujet: 'Nachricht über die Website', sujetCommande: 'Bestellung für',
      aucunProduit: 'Noch keine Produkte.', total: 'Richtpreis:', poids: '+ Ware nach Gewicht, bei Abholung gewogen', poidsSeul: 'Ware nach Gewicht: Der Preis wird bei Abholung berechnet.',
      retrait: 'Abholung', aucunCreneau: 'In den nächsten Tagen keine Abholzeit frei', pause: 'Online-Bestellungen sind derzeit ausgesetzt. Bitte rufen Sie uns an.',
      commandeOk: 'Vielen Dank, Ihre Bestellung ist unterwegs.', commandeDemo: 'Vorführung: So sähe die Bestätigung für Ihre Kunden aus.', passage: 'Abholung:',
      emailParti: 'Eine Bestätigung wurde an Ihre E-Mail-Adresse geschickt. Sie bezahlen vor Ort.', payer: 'Sie bezahlen vor Ort. Bei Fragen rufen wir Sie an.'
    },
    en: {
      ferme: 'Closed', fermeture: 'Upcoming closure', fermetures: 'Upcoming closures', menu: 'Menu', fermerMenu: 'Close menu',
      nom: 'Please enter your name.', telephone: 'Please enter a valid phone number.', email: 'Please enter a valid email address, for example name@example.com.',
      message: 'Please write your message.', consentement: 'Please tick this box so that we can reply.', requis: 'This field is required.',
      jour: 'Please choose a day.', heure: 'Please choose a time.', produits: 'Please choose at least one product, or write your order under “Anything else?”.',
      unChamp: 'One field needs correcting.', champs: 'fields need correcting.', merci: 'Thank you, your message has been sent. We will reply shortly.',
      reference: 'Reference:', exemple: 'Example site', demonstration: 'Demo', demoTexte: 'this form works but sends nothing. On your own site, messages reach you directly.',
      messagerie: 'Your email app will open with the message ready: just press send.', envoi: 'Sending…',
      echec: 'Sending failed. Please try again or call us', ou: 'or write to', sujet: 'Message from the website', sujetCommande: 'Order for',
      aucunProduit: 'No products yet.', total: 'Estimated total:', poids: '+ items sold by weight, weighed at pick-up', poidsSeul: 'Items sold by weight: the price is worked out at pick-up.',
      retrait: 'Pick-up', aucunCreneau: 'No pick-up slot in the next few days', pause: 'Online orders are paused for the moment. Please call us.',
      commandeOk: 'Thank you, your order has been sent.', commandeDemo: 'Demo: this is the confirmation your customer would see.', passage: 'Pick-up:',
      emailParti: 'A confirmation has been sent to your email address. You pay in the shop.', payer: 'You pay in the shop. If anything comes up, we will call you.'
    }
  };
  var TXT = TXTS[LANG] || TXTS.fr;
  var echap = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

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
      if (label) label.textContent = open ? (btn.getAttribute('data-label-fermer') || TXT.fermerMenu) : TXT.menu;
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

  /* Horaires réels, annonce, plat du jour --------------------------------
     Les données de départ sont dans la page (#pv-infos). Sur le site final avec la console, infos.json
     les remplace (le client les change depuis son téléphone). Sur un site d'exemple, la console de
     démonstration les garde dans le navigateur. Calculs : horaires.js (heure de Paris, jours fériés,
     dont le Vendredi saint et la Saint-Étienne en Alsace-Moselle). */
  var HO = window.PV_HORAIRES;
  var INFOS = null;
  var infosEl = doc.getElementById('pv-infos');
  var majRetrait = function () {};
  if (root && HO && infosEl) {
    try { INFOS = JSON.parse(infosEl.textContent); } catch (err) { INFOS = {}; }
    var semaineDepart = JSON.stringify(HO.normaliser(INFOS).semaine);
    var demo = root.getAttribute('data-demo');
    if (demo) { try { var dd = localStorage.getItem('pv-demo-infos-' + demo); if (dd) INFOS = JSON.parse(dd); } catch (err) { /* stockage indisponible */ } }
    var lignesHtml = function (sem) {
      return HO.lignes(sem, LANG).map(function (l) {
        return '<div class="pv-hours-row"><span>' + echap(l[0]) + '</span><span>' + l[1].split(', ').map(echap).join('<br>') + '</span></div>';
      }).join('');
    };
    var appliquer = function () {
      var I = HO.normaliser(INFOS);
      var n = HO.maintenant();
      // Ouvert / fermé
      var st = HO.statut(INFOS, LANG);
      each(doc.querySelectorAll('[data-pv-statut]'), function (el) {
        if (!st) { el.hidden = true; return; }
        el.textContent = st.texte;
        el.setAttribute('data-etat', st.etat);
        el.hidden = false;
      });
      // Annonce en haut des pages
      var a = I.annonce || {};
      each(doc.querySelectorAll('[data-pv-annonce]'), function (el) {
        var on = !!(a.texte && (!a.jusquau || a.jusquau >= n.iso));
        if (on) el.querySelector('[data-pv-annonce-texte]').textContent = a.texte;
        el.hidden = !on;
      });
      // Plat du jour : seulement le jour prévu
      var p = I.platDuJour || {};
      each(doc.querySelectorAll('[data-pv-jour]'), function (el) {
        var on = !!(p.texte && (p.date === 'aujourdhui' || p.date === n.iso));
        if (on) {
          var dt = HO.dateLongue(n.iso, LANG);
          el.querySelector('[data-pv-jour-date]').textContent = dt.charAt(0).toUpperCase() + dt.slice(1);
          el.querySelector('[data-pv-jour-texte]').innerHTML = String(p.texte).split(/\n+/).filter(Boolean).map(function (l) { return '<p>' + echap(l) + '</p>'; }).join('');
          var px = el.querySelector('[data-pv-jour-prix]');
          px.textContent = p.prix || '';
          px.hidden = !p.prix;
        }
        el.hidden = !on;
      });
      // Horaires changés depuis la console : les lignes affichées suivent
      if (JSON.stringify(I.semaine) !== semaineDepart) {
        each(doc.querySelectorAll('[data-pv-horaires]'), function (el) { el.innerHTML = lignesHtml(I.semaine); });
        each(doc.querySelectorAll('[data-pv-tableau] tbody'), function (tb) {
          tb.innerHTML = HO.ORDRE.map(function (j) {
            var pl = I.semaine[j];
            var midi = pl.filter(function (x) { return HO.enMin(x[0]) < 960; }), soir = pl.filter(function (x) { return HO.enMin(x[0]) >= 960; });
            var cell = function (l) { return l.length ? '<td><span>' + l.map(function (x) { return HO.heure(HO.enMin(x[0]), LANG) + ' – ' + HO.heure(HO.enMin(x[1]), LANG); }).join(', ') + '</span></td>' : '<td class="bi-ferme"><span>' + echap(TXT.ferme) + '</span></td>'; };
            var nom = HO.T[LANG] ? HO.T[LANG].jours[HO.JOURS.indexOf(j)] : j;
            return '<tr><th scope="row"><span>' + echap(nom.charAt(0).toUpperCase() + nom.slice(1)) + '</span></th>' + cell(midi) + cell(soir) + '</tr>';
          }).join('');
        });
      }
      // Fermetures à venir (congés, jours fériés un jour d'ouverture)
      var av = HO.aVenir(INFOS, LANG, 45);
      each(doc.querySelectorAll('[data-pv-fermetures]'), function (el) {
        if (!av.length) { el.hidden = true; return; }
        el.innerHTML = '<p class="pv-fermetures-titre">' + echap(av.length > 1 ? TXT.fermetures : TXT.fermeture) + '</p><ul>' + av.slice(0, 4).map(function (f) { return '<li>' + echap(f.texte) + '</li>'; }).join('') + '</ul>';
        el.hidden = false;
      });
      majRetrait();
    };
    appliquer();
    var url = root.getAttribute('data-infos');
    if (url && window.fetch) {
      fetch(url + '?t=' + Math.floor(Date.now() / 60000), { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { if (j && j.semaine) { INFOS = j; appliquer(); } })
        .catch(function () { /* on garde les horaires de la page */ });
    }
    setInterval(appliquer, 60000);
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
    var J = (HO && HO.T[LANG] ? HO.T[LANG] : { jours: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'] }).jours;
    var FO = {
      fr: { chaud: 'Tout juste sorti du four', prochaine: 'Prochaine sortie du four', instant: 'à l’instant', ilya: 'il y a {n} min', dans: 'dans {d}', demain: 'demain', ferme: 'Fermé aujourd’hui, rendez-vous {j}' },
      de: { chaud: 'Frisch aus dem Ofen', prochaine: 'Nächstes Blech aus dem Ofen', instant: 'gerade eben', ilya: 'vor {n} Min.', dans: 'in {d}', demain: 'morgen', ferme: 'Heute geschlossen, wir sehen uns {j}' },
      en: { chaud: 'Fresh out of the oven', prochaine: 'Next batch out of the oven', instant: 'just now', ilya: '{n} min ago', dans: 'in {d}', demain: 'tomorrow', ferme: 'Closed today, see you {j}' }
    };
    FO = FO[LANG] || FO.fr;
    var fo$ = function (k, v) { return String((FO || {})[k] || '').replace(/\{(\w)\}/g, function (m, x) { return v && v[x] != null ? v[x] : ''; }); };
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
    // Un jour de fermeture (habituel, férié, congés) : pas de fournée
    var duJour = function (j, decalage) {
      if (fermes.indexOf(j) >= 0) return [];
      if (HO && INFOS) { var iso = HO.plusJours(HO.maintenant().iso, decalage || 0); if (!HO.journee(INFOS, iso, LANG).plages.length) return []; }
      return liste.filter(function (f) { return j !== 0 || f.dimanche; });
    };
    var duree = function (m) { var h = Math.floor(m / 60), r = m % 60; return h ? h + ' h' + (r ? ' ' + (r < 10 ? '0' : '') + r : '') : r + ' min'; };
    var champ = function (cls) { return fo.querySelector('.' + cls); };
    var frise = doc.querySelector('.fo-frise');
    var repere = doc.querySelector('.fo-maintenant');
    var maj = function () {
      var n = paris();
      var auj = duJour(n.jour, 0);
      var sortie = null, suiv = null, jourSuiv = n.jour, i;
      for (i = 0; i < auj.length; i++) {
        if (n.min >= auj[i].min && n.min - auj[i].min <= 20) sortie = auj[i];
        if (!suiv && auj[i].min > n.min) suiv = auj[i];
      }
      var titre, f, delai;
      if (sortie) { f = sortie; titre = fo$('chaud'); delai = n.min === sortie.min ? fo$('instant') : fo$('ilya', { n: n.min - sortie.min }); }
      else if (suiv) { f = suiv; titre = fo$('prochaine'); delai = fo$('dans', { d: duree(suiv.min - n.min) }); }
      else {
        var dec = 1;
        for (i = 1; i <= 14; i++) { jourSuiv = (n.jour + i) % 7; if (duJour(jourSuiv, i).length) { f = duJour(jourSuiv, i)[0]; dec = i; break; } }
        titre = fo$('prochaine');
        delai = !auj.length && liste.length ? fo$('ferme', { j: dec === 1 ? fo$('demain') : J[jourSuiv] }) : (dec === 1 ? fo$('demain') : J[jourSuiv]);
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

  /* Avis : dates relatives (« il y a 2 semaines ») et, sur le site final hébergé avec PHP,
     les avis Google les plus récents (api/avis.php, mis en cache 6 heures sur l'hébergement) ------ */
  var avisSec = doc.querySelector('.pv-sec--avis');
  if (avisSec) {
    var rtf = window.Intl && Intl.RelativeTimeFormat ? new Intl.RelativeTimeFormat(LANG, { numeric: 'auto' }) : null;
    var relatif = function (date) {
      var j = Math.round((Date.now() - date.getTime()) / 864e5);
      if (!rtf || isNaN(j) || j < 0 || j > 364) return null;
      if (j < 7) return rtf.format(-j, 'day');
      if (j < 30) return rtf.format(-Math.round(j / 7), 'week');
      return rtf.format(-Math.max(1, Math.round(j / 30.4)), 'month');
    };
    var dates = function () {
      each(avisSec.querySelectorAll('.pv-review-date'), function (el) {
        var j = el.getAttribute('data-jours');
        var d = j !== null ? new Date(Date.now() - parseFloat(j) * 864e5) : new Date(el.getAttribute('datetime'));
        if (j !== null) el.setAttribute('datetime', d.toISOString().slice(0, 10));
        var r = relatif(d);
        if (r) el.textContent = r;
      });
    };
    dates();
    var src = avisSec.getAttribute('data-avis');
    if (src && mode === 'production' && window.fetch) {
      var nfr = function (n, d) { return Number(n).toLocaleString(LANG, { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); };
      fetch(src, { headers: { Accept: 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (d) {
          if (!d || !d.avis || !d.avis.length) return;
          var liste = avisSec.querySelector('.pv-reviews');
          var modele = liste && liste.querySelector('.pv-review');
          if (!modele) return;
          var surCinq = (modele.querySelector('.pv-stars') || { getAttribute: function () { return ''; } }).getAttribute('aria-label').replace(/^[\d.,\s]+/, '');
          var nouvelles = d.avis.slice(0, 3).map(function (a) {
            var li = modele.cloneNode(true);
            var nom = String(a.auteur || '');
            var av = li.querySelector('.pv-avatar');
            if (av) { av.textContent = nom.charAt(0).toUpperCase(); var h = 0; for (var i = 0; i < nom.length; i++) h = (h * 31 + nom.charCodeAt(i)) % 360; av.style.setProperty('--pv-teinte', h); }
            var n = li.querySelector('.pv-review-nom'); if (n) n.textContent = nom;
            var t = li.querySelector('.pv-review-date'); if (t) { t.removeAttribute('data-jours'); t.setAttribute('datetime', String(a.date || '').slice(0, 10)); t.textContent = new Date(a.date).toLocaleDateString(LANG, { month: 'long', year: 'numeric' }); }
            var s = li.querySelector('.pv-stars'); if (s) { s.style.setProperty('--pv-note', Math.round(a.note / 5 * 100) + '%'); s.setAttribute('aria-label', nfr(a.note) + ' ' + surCinq); }
            var q = li.querySelector('.pv-review-texte'); if (q) { if (a.langue && a.langue !== LANG) q.setAttribute('lang', a.langue); else q.removeAttribute('lang'); q.querySelector('p').textContent = a.texte; }
            return li;
          });
          liste.textContent = '';
          nouvelles.forEach(function (li) { liste.appendChild(li); });
          var ch = avisSec.querySelector('.pv-avis-chiffre');
          if (ch && d.note) ch.textContent = nfr(d.note, 1);
          var moy = avisSec.querySelector('.pv-avis-moy .pv-stars');
          if (moy && d.note) { moy.style.setProperty('--pv-note', Math.round(d.note / 5 * 100) + '%'); moy.setAttribute('aria-label', moy.getAttribute('aria-label').replace(/[\d][\d.,]*/, nfr(d.note, 1))); }
          var nb = avisSec.querySelector('.pv-avis-nb');
          if (nb && d.nombre) nb.firstChild.nodeValue = nb.firstChild.nodeValue.replace(/^[\d\s  .,]+/, nfr(d.nombre) + ' ');
          dates();
          if (!reduce) { liste.classList.add('pv-avis-maj'); }
        })
        .catch(function () { /* les avis écrits dans la page restent affichés */ });
    }
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

  /* Formulaires (contact, commande à retirer) --------------------------- */
  var form = doc.getElementById('pv-form');
  if (!form) return;
  var status = doc.getElementById('pv-form-status');
  var endpoint = form.getAttribute('data-endpoint') || '';
  var email = form.getAttribute('data-email') || '';
  var submit = form.querySelector('[type="submit"]');
  var commande = form.hasAttribute('data-retrait');
  var attempted = false;

  function fields() { return Array.prototype.filter.call(form.elements, function (el) { return el.name && el.name !== '_gotcha' && el.type !== 'submit' && el.type !== 'hidden' && el.type !== 'button' && !/^q\d+$/.test(el.name); }); }

  function check(el) {
    var v = (el.value || '').trim();
    var msg = '';
    if (el.type === 'checkbox') { if (el.required && !el.checked) msg = TXT.consentement; }
    else if (el.required && !v) msg = TXT[el.name] || TXT.requis;
    else if (v && el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = TXT.email;
    else if (v && el.type === 'tel' && v.replace(/\D/g, '').length < 9) msg = TXT.telephone;
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
  function say(text, html) {
    if (html) status.innerHTML = text; else status.textContent = text;
    if (status.animate && text) {
      status.animate(reduce ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }],
        { duration: 200, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
    }
  }
  var reference = function () {
    var d = new Date(), p = function (x) { return (x < 10 ? '0' : '') + x; };
    return (commande ? 'C-' : 'M-') + p(d.getMonth() + 1) + p(d.getDate()) + '-' + String(Math.floor(1000 + Math.random() * 9000));
  };

  /* Commande à retirer : quantités, jour et heure de passage, récapitulatif */
  var qtes = form.querySelectorAll('.pv-qte-n');
  var prixFr = function (x) { return x.toLocaleString(LANG === 'en' ? 'en-GB' : LANG, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (LANG === 'fr' ? ' €' : ' €'); };
  var recapTexte = function () {
    var lignes = [], total = 0, poids = false, n = 0;
    each(qtes, function (q) {
      var k = parseInt(q.value, 10) || 0;
      if (k <= 0) return;
      n += k;
      lignes.push(k + ' × ' + q.getAttribute('data-nom'));
      if (q.hasAttribute('data-prix')) total += k * parseFloat(q.getAttribute('data-prix')); else poids = true;
    });
    return { lignes: lignes, total: total, poids: poids, n: n };
  };
  var majRecap = function () {
    var r = recapTexte();
    var t = form.querySelector('[data-pv-recap-texte]'), tot = form.querySelector('[data-pv-recap-total]');
    if (t) t.innerHTML = r.lignes.length ? r.lignes.map(echap).join('<br>') : echap(TXT.aucunProduit);
    if (tot) tot.textContent = r.total ? TXT.total + ' ' + prixFr(r.total) + (r.poids ? ' ' + TXT.poids : '') : (r.poids ? TXT.poidsSeul : '');
    return r;
  };
  if (commande) {
    var regl = {};
    try { regl = JSON.parse(form.getAttribute('data-retrait')); } catch (err) { regl = {}; }
    var selJour = form.elements.jour, selHeure = form.elements.heure;
    var pause = form.querySelector('[data-pv-ret-pause]');
    var heureLib = function (h) { return HO ? HO.heure(HO.enMin(h), LANG) : h; };
    var remplirHeures = function (liste) {
      var garde = selHeure.value;
      var jour = null;
      liste.forEach(function (j) { if (j.date === selJour.value) jour = j; });
      selHeure.innerHTML = jour ? jour.heures.map(function (h) { return '<option value="' + h + '"' + (h === garde ? ' selected' : '') + '>' + echap(heureLib(h)) + '</option>'; }).join('') : '';
    };
    majRetrait = function () {
      if (!HO || !INFOS) return;
      var I = HO.normaliser(INFOS);
      var enPause = !!(I.commandes && I.commandes.pause);
      if (pause) { pause.hidden = !enPause; pause.textContent = enPause ? ((I.commandes.message || '').trim() || TXT.pause) : ''; }
      var liste = HO.creneaux(INFOS, LANG, regl);
      var garde = selJour.value;
      selJour.innerHTML = liste.map(function (j) { return '<option value="' + j.date + '"' + (j.date === garde ? ' selected' : '') + '>' + echap(j.libelle) + '</option>'; }).join('');
      if (!liste.length) selJour.innerHTML = '<option value="">' + echap(TXT.aucunCreneau) + '</option>';
      remplirHeures(liste);
      selJour.onchange = function () { remplirHeures(HO.creneaux(INFOS, LANG, regl)); };
      submit.disabled = enPause || !liste.length;
    };
    majRetrait();
    each(form.querySelectorAll('[data-qte]'), function (li) {
      var q = li.querySelector('.pv-qte-n'), moins = li.querySelector('[data-moins]'), plus = li.querySelector('[data-plus]');
      var regle = function (v) {
        v = Math.max(0, Math.min(99, parseInt(v, 10) || 0));
        q.value = v;
        moins.disabled = v === 0;
        li.classList.toggle('pv-qte--choisi', v > 0);
        majRecap();
        var err = doc.getElementById('err-produits');
        if (attempted && v > 0 && err) err.hidden = true;
      };
      moins.addEventListener('click', function () { regle((parseInt(q.value, 10) || 0) - 1); });
      plus.addEventListener('click', function () { regle((parseInt(q.value, 10) || 0) + 1); });
      q.addEventListener('change', function () { regle(q.value); });
    });
    majRecap();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    attempted = true;
    var bad = fields().filter(function (el) { return !check(el); });
    var r = commande ? majRecap() : null;
    var errP = doc.getElementById('err-produits');
    if (commande && !r.n && !(form.elements.precisions && form.elements.precisions.value.trim())) {
      if (errP) { errP.textContent = TXT.produits; errP.hidden = false; }
      bad.unshift(qtes[0] || form.elements.precisions);
    } else if (errP) errP.hidden = true;
    if (bad.length) {
      say(bad.length === 1 ? TXT.unChamp : bad.length + ' ' + TXT.champs);
      if (bad[0]) bad[0].focus();
      return;
    }
    if (form.elements._gotcha && form.elements._gotcha.value) { say(TXT.merci); form.reset(); return; }

    var ref = reference();
    if (form.elements.reference) form.elements.reference.value = ref;
    var quand = '';
    if (commande) {
      var opt = form.elements.jour.options[form.elements.jour.selectedIndex];
      quand = (opt ? opt.text : '') + ', ' + (form.elements.heure.options[form.elements.heure.selectedIndex] || {}).text;
      form.elements.commande.value = r.lignes.join('\n') + (r.total ? '\n' + TXT.total + ' ' + prixFr(r.total) + (r.poids ? ' ' + TXT.poids : '') : '') + '\n' + TXT.retrait + ' : ' + quand;
    }
    if (form.elements._subject) form.elements._subject.value = (commande ? TXT.sujetCommande + ' ' + quand : TXT.sujet) + ' (' + ref + ')';

    // Confirmation à l'écran : le client voit ce qu'il a commandé et quand passer
    var confirmer = function (emailParti) {
      if (!commande) { say(TXT.merci + ' ' + TXT.reference + ' ' + ref + '.'); form.reset(); attempted = false; return; }
      var box = doc.createElement('div');
      box.className = 'pv-ret-ok';
      box.tabIndex = -1;
      box.innerHTML = '<p class="pv-ret-ok-titre">' + echap(mode === 'production' ? TXT.commandeOk : TXT.commandeDemo) + '</p>' +
        '<p>' + echap(TXT.passage) + ' <strong>' + echap(LANG === 'de' ? quand : quand.charAt(0).toLowerCase() + quand.slice(1)) + '</strong>. ' + echap(TXT.reference) + ' <strong>' + echap(ref) + '</strong>.</p>' +
        '<p class="pv-ret-ok-liste">' + r.lignes.map(echap).join('<br>') + (form.elements.precisions && form.elements.precisions.value.trim() ? '<br>' + echap(form.elements.precisions.value.trim()) : '') + '</p>' +
        (r.total ? '<p>' + echap(TXT.total + ' ' + prixFr(r.total) + (r.poids ? ' ' + TXT.poids : '')) + '</p>' : '') +
        '<p>' + echap(emailParti ? TXT.emailParti : TXT.payer) + '</p>';
      form.hidden = true;
      form.parentNode.insertBefore(box, form);
      box.focus();
    };

    if (mode === 'demo' || mode === 'maquette' || mode === 'exemple') {
      if (commande) confirmer(false);
      else { say((mode === 'exemple' ? TXT.exemple : TXT.demonstration) + ' : ' + TXT.demoTexte); status.focus(); }
      return;
    }

    var data = new URLSearchParams(new FormData(form));
    if (!endpoint) {
      var body = [];
      data.forEach(function (v, k) { if (k.charAt(0) !== '_' && k !== 'consentement' && k !== 'form-name' && !/^q\d+$/.test(k) && v) body.push(k.charAt(0).toUpperCase() + k.slice(1) + ' : ' + v); });
      window.location.href = 'mailto:' + email + '?subject=' + encodeURIComponent(form.elements._subject ? form.elements._subject.value : TXT.sujet) + '&body=' + encodeURIComponent(body.join('\n'));
      say(TXT.messagerie);
      return;
    }
    var label = submit.textContent;
    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    submit.textContent = TXT.envoi;
    var entetes = { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' };
    // Envoi par le PHP du site (même adresse) : en-tête qui bloque les envois depuis un autre site
    if (!/^https?:/i.test(endpoint)) entetes['X-PSW'] = '1';
    fetch(endpoint, { method: 'POST', headers: entetes, body: data.toString() })
      .then(function (rep) {
        if (!rep.ok) throw new Error(rep.status);
        return rep.json().catch(function () { return {}; });
      })
      .then(function (d) { confirmer(!!(d && d.accuse)); })
      .catch(function () {
        say(TXT.echec + (email ? ' ' + TXT.ou + ' ' + email : '') + '.');
        status.focus();
      })
      .then(function () { submit.disabled = false; submit.removeAttribute('aria-busy'); submit.textContent = label; if (!commande) status.focus(); });
  });
})();
