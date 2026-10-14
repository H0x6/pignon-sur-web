/*!
 * diagnostic.js — autodiagnostic : compte les réponses « non » et propose la suite.
 */
(function () {
  'use strict';
  var form = document.getElementById('diag');
  if (!form) return;
  var out = {};
  Array.prototype.forEach.call(document.querySelectorAll('[data-out]'), function (el) { out[el.getAttribute('data-out')] = el; });
  var cta = document.getElementById('diag-cta');
  var live = document.getElementById('diag-live');
  var questions = Array.prototype.slice.call(form.querySelectorAll('.diag__q'));
  var timer = 0;

  var UI = window.PSW_UI || { tick: function () {} };

  function update(e) {
    var answered = 0, bad = [];
    var before = out.score.textContent;
    questions.forEach(function (q) {
      var c = q.querySelector('input:checked');
      if (c) { answered++; if (c.value === 'non') bad.push(q.getAttribute('data-label')); }
    });
    var n = bad.length;
    out.score.textContent = String(n);
    // Le score qui change remonte en se défloutant (200 ms) : on voit qu'il a bougé
    if (e && before !== String(n)) UI.tick(out.score, e);
    out.scoreLabel.textContent = n > 1 ? 'points à revoir' : 'point à revoir';
    var verdict;
    if (!answered) verdict = 'Répondez aux questions : le résultat s\'affiche ici au fur et à mesure.';
    else if (n === 0) verdict = 'Votre site tient la route sur l\'essentiel. S\'il s\'agit surtout de le faire vivre (horaires, photos, nouveautés), la maintenance suffit peut-être.';
    else if (n <= 2) verdict = 'Quelques points freinent vos visiteurs. Une maquette gratuite vous montrera ce qu\'une refonte changerait, sans engagement.';
    else verdict = 'Une refonte vaut le coup : plusieurs points font fuir vos clients, surtout sur téléphone. Envoyez-moi le lien de votre site, je vous montre la nouvelle version.';
    if (answered && answered < questions.length) verdict += ' (' + answered + ' réponse' + (answered > 1 ? 's' : '') + ' sur ' + questions.length + '.)';
    out.verdict.textContent = verdict;
    out.list.innerHTML = '';
    bad.forEach(function (b) { var li = document.createElement('li'); li.textContent = b.charAt(0).toUpperCase() + b.slice(1); out.list.appendChild(li); });
    var p = new URLSearchParams();
    if (answered) p.set('diagnostic', n + ' point' + (n > 1 ? 's' : '') + ' à revoir' + (n ? ' (' + bad.join(', ') + ')' : ''));
    cta.setAttribute('href', 'contact.html' + (answered ? '?' + p.toString() : ''));
    clearTimeout(timer);
    timer = setTimeout(function () { live.textContent = answered ? n + ' ' + out.scoreLabel.textContent + ' sur ' + answered + ' réponses.' : ''; }, 350);
  }
  form.addEventListener('change', update);
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  update();
})();
