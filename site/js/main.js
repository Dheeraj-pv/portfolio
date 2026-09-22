(function () {
  var toggle = document.getElementById('theme-toggle');
  var crtToggle = document.getElementById('crt-toggle');
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

  // CRT scanlines only render in the dark theme (see site.css); this just lets
  // the visitor turn that layer off regardless of theme, independent of it.
  function setCrt(on) {
    html.classList.toggle('crt-off', !on);
    crtToggle.textContent = on ? 'CRT: On' : 'CRT: Off';
    try { localStorage.setItem('crt', on ? '1' : '0'); } catch (e) {}
  }
  var crtSaved = null;
  try { crtSaved = localStorage.getItem('crt'); } catch (e) {}
  setCrt(crtSaved !== '0');
  crtToggle.addEventListener('click', function () {
    setCrt(html.classList.contains('crt-off'));
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
