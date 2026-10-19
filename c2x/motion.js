/* Landing motion: splits the hero headline for its rise and spins the work ring
   (drag to turn it; the first bit of scroll settles it smaller). */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; });
  }

  /* ---------- Hero headline: one masked span per word, in both hero layers ---------- */
  if (!reduce) {
    document.querySelectorAll('.hero-section h1').forEach(function (h) {
      var words = h.textContent.trim().split(/\s+/);
      h.innerHTML = words.map(function (w, i) {
        return '<span class="w"><span style="--wi:' + i + '">' + esc(w) + '</span></span>';
      }).join(' ');
    });
  }

  /* ---------- Work ring ---------- */
  var stage = document.querySelector('.ring-stage');
  if (!stage) return;
  var scene = stage.querySelector('.ring-scene');

  // give every card a back: the same card, flipped
  stage.querySelectorAll('.ring-item').forEach(function (item) {
    var front = item.querySelector('.ring-card');
    var old = item.querySelector('.ring-back');
    var back = front.cloneNode(true);
    back.classList.add('ring-back');
    if (old) old.replaceWith(back); else item.appendChild(back);
  });

  var SPIN = 16;           // degrees per second when nobody is touching it
  var rot = 210, vel = 0, last = null, raf = null, onScreen = true;
  var dragging = false, px = 0, py = 0, pt = 0;

  function paint() { scene.style.setProperty('--ring-rot', rot.toFixed(2) + 'deg'); }

  // the wheel's cards reach well past the 380px scene, so size it to its box
  function fit() { scene.style.setProperty('--ring-scale', (stage.clientWidth / 840).toFixed(3)); }
  fit();
  window.addEventListener('resize', fit);

  // opens big; a short scroll lifts it and settles it halfway between that size
  // and one that fits a short screen (never less than a 10% shrink)
  var SETTLE = 80, ringP = -1, ringQueued = false;
  function settleTarget() {
    var big = stage.clientWidth;
    var fitted = Math.min(big, window.innerHeight * 0.54);
    stage.style.setProperty('--ring-end', Math.min((big + fitted) / 2 / big, 0.9).toFixed(3));
  }
  function settle() {
    ringQueued = false;
    var p = reduce ? 1 : Math.max(0, Math.min(1, window.scrollY / SETTLE));
    if (Math.abs(p - ringP) < 0.002) return;
    ringP = p;
    stage.style.setProperty('--ring-p', p.toFixed(3));
  }
  function queueSettle() {
    if (ringQueued) return;
    ringQueued = true;
    requestAnimationFrame(settle);
  }
  settleTarget();
  settle();
  window.addEventListener('scroll', queueSettle, { passive: true });
  window.addEventListener('resize', function () { settleTarget(); queueSettle(); });

  function frame(now) {
    var dt = last === null ? 0 : Math.min(now - last, 64) / 1000;
    last = now;
    if (!dragging) {
      rot += (reduce ? 0 : SPIN) * dt + vel * dt;
      vel *= Math.pow(0.04, dt);    // a flick coasts for about a second
      if (Math.abs(vel) < 0.5) vel = 0;
    }
    paint();
    raf = onScreen && (!reduce || dragging || vel) ? requestAnimationFrame(frame) : null;
  }
  function start() {
    if (raf) return;
    last = null;
    raf = requestAnimationFrame(frame);
  }

  stage.addEventListener('pointerdown', function (e) {
    dragging = true;
    stage.classList.add('is-dragging');
    px = e.clientX; py = e.clientY; pt = performance.now(); vel = 0;
    if (e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
    start();
  });
  stage.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var now = performance.now();
    var d = (e.clientX - px) - (e.pointerType === 'touch' ? 0 : (e.clientY - py));
    rot += d * 0.45;
    var dt = Math.max(now - pt, 8) / 1000;
    vel = (d * 0.45) / dt;
    px = e.clientX; py = e.clientY; pt = now;
  });
  function release() {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove('is-dragging');
    vel = Math.max(-720, Math.min(720, vel));
    start();
  }
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      if (onScreen) start();
    }).observe(stage);
  }

  paint();
  start();
})();
