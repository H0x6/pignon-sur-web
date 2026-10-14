/*!
 * designs.js — page « Un design par métier » : changer de palette remplace les captures
 * (ordinateur et téléphone) et met à jour les liens vers le site d'exemple et l'essai.
 * Sans JavaScript, la page reste complète : chaque design s'affiche dans la palette de son exemple.
 */
(function () {
  'use strict';
  var designs = document.querySelectorAll('.design[data-design]');
  Array.prototype.forEach.call(designs, function (d) {
    var buttons = d.querySelectorAll('.design__palette');
    var bureau = d.querySelector('.design__bureau');
    var mobile = d.querySelector('.design__mobile');
    var visiter = d.querySelector('.design__visiter');
    var essayer = d.querySelector('.design__essayer');
    var base = d.getAttribute('data-exemple');
    var id = d.getAttribute('data-design');
    // Remplace les deux captures d'un coup, en fondu enchaîné court quand le navigateur sait le faire
    var swap = function (b) {
      var go = function () {
        if (bureau && b.getAttribute('data-bureau')) { bureau.srcset = b.getAttribute('data-bureau'); bureau.src = b.getAttribute('data-bureau-src'); }
        if (mobile && b.getAttribute('data-mobile')) { mobile.srcset = b.getAttribute('data-mobile'); mobile.src = b.getAttribute('data-mobile-src'); }
      };
      if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        if (bureau) bureau.style.viewTransitionName = 'capture-' + id;
        if (mobile) mobile.style.viewTransitionName = 'capture-' + id + '-m';
        document.startViewTransition(go).finished.then(function () {
          if (bureau) bureau.style.viewTransitionName = '';
          if (mobile) mobile.style.viewTransitionName = '';
        });
      } else go();
    };
    Array.prototype.forEach.call(buttons, function (b) {
      b.addEventListener('click', function () {
        if (b.getAttribute('aria-pressed') === 'true') return;
        Array.prototype.forEach.call(buttons, function (o) { o.setAttribute('aria-pressed', String(o === b)); });
        var n = b.getAttribute('data-palette');
        swap(b);
        if (visiter) visiter.href = base + '?palette=' + n;
        if (essayer) essayer.href = 'personnaliser.html?design=' + id + '&palette=' + n;
      });
    });
  });
})();
