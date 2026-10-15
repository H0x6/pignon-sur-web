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
