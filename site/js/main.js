(function () {
  var toggle = document.getElementById('theme-toggle');
  var fxToggle = document.getElementById('fx-toggle');
  var html = document.documentElement;

  function setTheme(theme) {
    html.setAttribute('data-theme', theme);
    toggle.textContent = theme === 'terminal' ? 'Daylight' : 'Terminal';
    try { localStorage.setItem('theme', theme); } catch (e) {}
  }

  var saved = null;
  try { saved = localStorage.getItem('theme'); } catch (e) {}
  setTheme(saved === 'daylight' ? 'daylight' : 'terminal');

  toggle.addEventListener('click', function () {
    setTheme(html.getAttribute('data-theme') === 'terminal' ? 'daylight' : 'terminal');
  });

  // CRT scanlines (see site.css, dark theme only) and the Matrix rain below
  // are one combined "FX" toggle, since both are the same kind of retro
  // visual flourish and having two separate buttons for them was clutter.
  function setCrt(on) {
    html.classList.toggle('crt-off', !on);
  }

  // Matrix rain, same canvas/animation as the CLI build. Only visible in the
  // margins outside .shell/.footer (see site.css) and forced off in the
  // daylight theme, since it's a dark-theme-only visual gag either way.
  var matrixCanvas = null, matrixRAF = null, matrixDrops = null;
  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function startMatrix() {
    if (matrixCanvas) return;
    matrixCanvas = document.createElement('canvas');
    matrixCanvas.className = 'matrix-canvas';
    matrixCanvas.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(matrixCanvas, document.body.firstChild);
    var ctx = matrixCanvas.getContext('2d');
    var matrixCols = 0;
    function resize() {
      matrixCanvas.width = window.innerWidth;
      matrixCanvas.height = window.innerHeight;
      matrixCols = Math.floor(window.innerWidth / 16);
      matrixDrops = new Array(matrixCols).fill(0);
    }
    resize();
    matrixCanvas._resize = resize;
    window.addEventListener('resize', resize);
    var chars = '01アイウエオカキクケコサシスセソ';
    function draw() {
      ctx.fillStyle = 'rgba(13,18,16,0.08)';
      ctx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
      ctx.fillStyle = getComputedStyle(html).getPropertyValue('--accent') || '#39ff88';
      ctx.font = '14px monospace';
      for (var i = 0; i < matrixDrops.length; i++) {
        var ch = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(ch, i * 16, matrixDrops[i] * 16);
        if (matrixDrops[i] * 16 > matrixCanvas.height && Math.random() > 0.975) matrixDrops[i] = 0;
        matrixDrops[i]++;
      }
      matrixRAF = requestAnimationFrame(draw);
    }
    draw();
  }
  function stopMatrix() {
    if (!matrixCanvas) return;
    cancelAnimationFrame(matrixRAF);
    window.removeEventListener('resize', matrixCanvas._resize);
    matrixCanvas.remove();
    matrixCanvas = null;
  }
  var fxOn = false;
  function setFx(on) {
    setCrt(on);
    if (on && reducedMotion()) on = false;
    if (on) startMatrix(); else stopMatrix();
    fxOn = on;
    fxToggle.textContent = on ? 'FX: On' : 'FX: Off';
    try { localStorage.setItem('fx', on ? '1' : '0'); } catch (e) {}
  }
  var fxSaved = null;
  try { fxSaved = localStorage.getItem('fx'); } catch (e) {}
  setFx(fxSaved === '1');
  fxToggle.addEventListener('click', function () {
    setFx(!fxOn);
  });

  Array.prototype.forEach.call(document.querySelectorAll('.ds-project-card'), function (card) {
    Portfolio3D.initTilt(card);
  });

  // Swap the boot log's greeting line for a real one based on the visitor's
  // local clock. Runs unconditionally (not just under animation) so reduced-
  // motion visitors still get the correct line, just without the typing.
  function setGreeting() {
    var el = document.getElementById('boot-greeting');
    if (!el) return;
    var h = new Date().getHours();
    var msg = (h < 5 || h >= 22) ? 'Burning the midnight oil?'
      : h < 12 ? 'Good morning.'
      : h < 17 ? 'Good afternoon.'
      : 'Good evening.';
    el.textContent = msg;
  }
  setGreeting();

  // Types out the boot lines and the hero tagline in sequence, like a
  // terminal printing its own startup text. Every element already holds its
  // full text in HTML, so no-JS or a JS failure just shows everything at
  // once; reduced motion skips the animation for the same reason. Click or
  // any keypress skips straight to the finished state.
  function initIntro() {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    var queue = Array.prototype.slice.call(document.querySelectorAll('.boot-line'));
    var tagline = document.getElementById('hero-tagline');
    if (tagline) queue.push(tagline);
    if (!queue.length) return;

    var fullTexts = queue.map(function (el) { return el.textContent; });
    queue.forEach(function (el) { el.textContent = ''; });

    var hint = document.querySelector('.boot-skip-hint');
    var done = false;
    var timer = null;

    function cleanup() {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', finishAll);
      if (hint) hint.style.display = 'none';
    }
    function finishAll() {
      if (done) return;
      done = true;
      if (timer) clearInterval(timer);
      queue.forEach(function (el, i) { el.textContent = fullTexts[i]; });
      cleanup();
    }
    function onKey() { finishAll(); }
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', finishAll);
    if (hint) hint.style.display = 'block';

    var qi = 0;
    function typeNext() {
      if (done) return;
      if (qi >= queue.length) { done = true; cleanup(); return; }
      var el = queue[qi], full = fullTexts[qi], ci = 0;
      timer = setInterval(function () {
        ci++;
        el.textContent = full.slice(0, ci);
        if (ci >= full.length) {
          clearInterval(timer);
          qi++;
          typeNext();
        }
      }, 24);
    }
    typeNext();
  }
  initIntro();
})();
