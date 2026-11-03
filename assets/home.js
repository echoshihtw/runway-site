// One earned moment per section, played once when it comes into view.
(function () {
  if (!('IntersectionObserver' in window)) return;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Material emphasized decelerate, cubic-bezier(0.05, 0.7, 0.1, 1).
  var ease = function (t) {
    var a = 0.05, b = 0.7, c = 0.1, d = 1, lo = 0, hi = 1, m, x;
    for (var i = 0; i < 24; i++) {
      m = (lo + hi) / 2;
      x = 3 * a * m * (1 - m) * (1 - m) + 3 * c * m * m * (1 - m) + m * m * m;
      if (x < t) lo = m; else hi = m;
    }
    m = (lo + hi) / 2;
    return 3 * b * m * (1 - m) * (1 - m) + 3 * d * m * m * (1 - m) + m * m * m;
  };
  var count = function (el, delay) {
    var n = +el.getAttribute('data-count');
    if (reduce) { el.textContent = n; return; }
    el.textContent = '0';
    setTimeout(function () {
      var t0 = performance.now();
      var step = function (t) {
        var p = Math.min(1, (t - t0) / 800);
        el.textContent = Math.round(n * ease(p));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, delay);
  };
  var secs = document.querySelectorAll('[data-sec]');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var s = e.target;
      io.unobserve(s);
      s.classList.remove('wait');
      s.classList.add('go');
      s.querySelectorAll('[data-count]').forEach(function (el) {
        count(el, +(el.getAttribute('data-delay') || 0));
      });
    });
  }, { threshold: 0.35 });
  secs.forEach(function (s) { s.classList.add('wait'); io.observe(s); });
})();
