// One earned moment per section, played once when it comes into view.
(function () {
  if (!('IntersectionObserver' in window)) return;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Material 3 emphasized easings: settle for arrivals, leave for departures.
  var bezier = function (a, b, c, d) {
    return function (t) {
      var lo = 0, hi = 1, m, x;
      for (var i = 0; i < 24; i++) {
        m = (lo + hi) / 2;
        x = 3 * a * m * (1 - m) * (1 - m) + 3 * c * m * m * (1 - m) + m * m * m;
        if (x < t) lo = m; else hi = m;
      }
      m = (lo + hi) / 2;
      return 3 * b * m * (1 - m) * (1 - m) + 3 * d * m * m * (1 - m) + m * m * m;
    };
  };
  var ease = bezier(0.05, 0.7, 0.1, 1);
  var leave = bezier(0.3, 0, 0.8, 0.15);
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

  // Hero demo: one weekly check-up on a calm loop, built from the screens lower on the page.
  // Every frame is drawn from the loop clock, so pausing is just stopping the clock.
  var frame = document.querySelector('.hero-frame');
  var stage = frame && frame.querySelector('.demo-stage');
  var toggle = frame && frame.querySelector('.demo-toggle');
  var checkSrc = document.querySelector('[data-demo="check-up"] > div > div');
  var resultSrc = document.querySelector('[data-demo="result"] > div > div');
  if (!stage || !toggle || !checkSrc || !resultSrc || reduce) return;

  var byText = function (root, text) {
    var all = root.querySelectorAll('span, button, text');
    for (var i = 0; i < all.length; i++) if (all[i].textContent === text) return all[i];
  };
  var layer = function (src) {
    var el = src.cloneNode(true);
    el.classList.add('demo-layer');
    // The screen's own inline position is relative; stacked, it sits over home.
    el.style.position = 'absolute';
    el.style.left = el.style.top = '0';
    el.querySelectorAll('[data-count]').forEach(function (n) { n.removeAttribute('data-count'); });
    el.querySelectorAll('.draw').forEach(function (n) { n.classList.remove('draw'); });
    stage.appendChild(el);
    return el;
  };

  var home = stage.firstElementChild;
  var homeNum = home.querySelector('[data-count]');
  var homeDate = byText(home, 'December 2027');
  var check = layer(checkSrc);
  var field = byText(check, '4,210');
  var result = layer(resultSrc);
  var resultNum = result.querySelector('[data-count]') || byText(result, '9');
  // The result's earned-star marker is not part of this story.
  result.querySelectorAll('svg g').forEach(function (n) { n.remove(); });
  byText(result, 'February 2028').textContent = 'January 2028';
  ['14', '15', '14'].forEach(function (n, i) { result.querySelectorAll('svg text')[i].textContent = n; });
  var calm = [].filter.call(result.querySelectorAll('div'), function (d) {
    return d.textContent.indexOf("That's 1 month more") === 0;
  })[0];
  var line = result.querySelector('polyline');
  line.style.strokeDasharray = '1';
  var tap = document.createElement('div');
  tap.className = 'demo-tap';
  stage.appendChild(tap);
  var at = function (el) {
    var x = el.offsetWidth / 2, y = el.offsetHeight / 2;
    for (var n = el; n && n !== stage; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; }
    return [x, y];
  };
  var taps = [[2400, at(byText(home, 'Check up'))], [4900, at(byText(check, 'See my runway'))],
    [8600, at(byText(result, 'Done'))]];

  // The loop, in ms. Durations are the app's tokens: fade 200, move 300, count 800.
  var IN = 2700, TYPE = 3300, STEP = 5200, COUNT = 5500, BACK = 8900, SWAP = 12200, LOOP = 12600;
  var p = function (t, a, d) { return t <= a ? 0 : t >= a + d ? 1 : (t - a) / d; };
  var set = function (el, prop, v) { if (el.style[prop] !== v) el.style[prop] = v; };
  var text = function (el, v) { if (el.textContent !== v) el.textContent = v; };
  var loops = 0;

  var render = function (t) {
    var push = ease(p(t, IN, 300)), step = ease(p(t, STEP, 300)), pop = p(t, BACK, 300);
    var back = t >= BACK;
    set(home, 'transform', 'translateX(' + (back ? -90 * (1 - ease(pop)) : -90 * push) + 'px)');
    set(check, 'transform', 'translateX(' + 300 * (1 - push) + 'px)');
    set(check, 'opacity', String(back ? 0 : 1 - leave(p(t, STEP, 200))));
    set(result, 'transform', 'translateX(' + (back ? 300 * leave(pop) : 24 * (1 - step)) + 'px)');
    set(result, 'opacity', String(back ? 1 : step));
    text(field, '12,400'.slice(0, Math.max(0, Math.ceil((t - TYPE) / 160))));
    text(resultNum, String(Math.round(14 + ease(p(t, COUNT, 800)))));
    set(line, 'strokeDashoffset', String(1 - ease(p(t, COUNT + 100, 800))));
    set(calm, 'opacity', String(ease(p(t, COUNT + 800, 200))));
    // Home shows the new number after the check-up, then fades back to the old one to loop.
    if (loops > 0 || back) {
      var later = back && t < SWAP + 200;
      text(homeNum, later ? '15' : '14');
      text(homeDate, later ? 'January 2028' : 'December 2027');
      var o = t < SWAP ? 1 : t < SWAP + 200 ? 1 - leave(p(t, SWAP, 200)) : ease(p(t, SWAP + 200, 200));
      set(homeNum.parentNode, 'opacity', String(o));
      set(homeDate, 'opacity', String(o));
    }
    var dot = 0, x = 0, y = 0;
    taps.forEach(function (k) {
      if (t >= k[0] && t < k[0] + 300) {
        dot = 0.18 * (t < k[0] + 100 ? ease(p(t, k[0], 100)) : 1 - leave(p(t, k[0] + 100, 200)));
        x = k[1][0]; y = k[1][1];
      }
    });
    set(tap, 'opacity', String(dot));
    if (dot) set(tap, 'transform', 'translate(' + x + 'px, ' + y + 'px)');
  };

  // The loop runs only while nothing holds it: the pause button, a pointer or focus on
  // the phone, the phone off screen, or the tab hidden.
  var t = 0, last = null, raf = null, holds = { off: true };
  var tick = function (now) {
    if (last !== null) {
      t += now - last;
      if (t >= LOOP) { t -= LOOP; loops++; }
    }
    last = now;
    render(t);
    raf = requestAnimationFrame(tick);
  };
  var hold = function (why, on) {
    holds[why] = on;
    var stop = Object.keys(holds).some(function (k) { return holds[k]; });
    if (stop && raf !== null) { cancelAnimationFrame(raf); raf = null; }
    if (!stop && raf === null) { last = null; raf = requestAnimationFrame(tick); }
  };

  var shot = stage.parentNode;
  shot.setAttribute('aria-label', shot.getAttribute('data-demo-label'));
  render(0);
  frame.classList.add('demo-on');
  toggle.addEventListener('click', function () {
    var paused = toggle.getAttribute('aria-pressed') !== 'true';
    toggle.setAttribute('aria-pressed', String(paused));
    hold('user', paused);
  });
  shot.addEventListener('mouseenter', function () { hold('hover', true); });
  shot.addEventListener('mouseleave', function () { hold('hover', false); });
  shot.addEventListener('focusin', function () { hold('focus', true); });
  shot.addEventListener('focusout', function () { hold('focus', false); });
  document.addEventListener('visibilitychange', function () { hold('hidden', document.hidden); });
  new IntersectionObserver(function (e) { hold('off', !e[0].isIntersecting); }).observe(shot);
  // Reduce Motion switched on mid-loop: stop on home, as it was.
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', function (e) {
    if (!e.matches) return;
    hold('reduce', true);
    loops = 1;
    render(0);
  });
})();
