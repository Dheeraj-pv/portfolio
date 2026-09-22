/* Terminal engine: DOM wiring, input handling, boot sequence, history,
   tab-complete, Konami code, Matrix rain, sound. Command data/logic lives in
   commands.js (window.CLI_BUILD); this file only talks to the DOM. */
(function () {
  var html = document.documentElement;
  var screenEl = document.getElementById('term-screen');
  var outputEl = document.getElementById('term-output');
  var inputEl = document.getElementById('term-input');
  var promptEl = document.getElementById('term-prompt');
  var chipsEl = document.getElementById('term-chips');
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  var state = {
    cwd: ['~'],
    history: [],
    historyIndex: 0,
    achievements: loadJSON('cli-achievements', []),
    themeVisits: loadJSON('cli-theme-visits', []),
    themeName: 'green',
    matrix: false,
    sound: false,
    busy: false
  };

  function loadJSON(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function saveJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function scrollToBottom() { screenEl.scrollTop = screenEl.scrollHeight; }

  function print(text, cls) {
    var d = document.createElement('div');
    d.className = 'term-line' + (cls ? ' ' + cls : '');
    d.textContent = text;
    outputEl.appendChild(d);
    scrollToBottom();
    return d;
  }
  function printLink(text, url) {
    var d = document.createElement('div');
    d.className = 'term-line';
    var a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = text;
    d.appendChild(a);
    outputEl.appendChild(d);
    scrollToBottom();
    return d;
  }
  function printSequence(lines, delay, cb) {
    var i = 0;
    function next() {
      if (i >= lines.length) { if (cb) cb(); return; }
      print(lines[i], 'term-out-mono');
      i++;
      setTimeout(next, delay);
    }
    next();
  }
  function clearOutput() { outputEl.innerHTML = ''; }

  function beep(freq, dur) {
    if (!state.sound) return;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      beep._ctx = beep._ctx || new Ctx();
      var o = beep._ctx.createOscillator(), g = beep._ctx.createGain();
      o.type = 'square'; o.frequency.value = freq || 440;
      g.gain.value = 0.03;
      o.connect(g); g.connect(beep._ctx.destination);
      o.start(); o.stop(beep._ctx.currentTime + (dur || 0.03));
    } catch (e) {}
  }

  function shakeScreen() {
    if (reduce) return;
    screenEl.classList.add('term-shake');
    setTimeout(function () { screenEl.classList.remove('term-shake'); }, 400);
  }

  function unlock(id, label) {
    if (state.achievements.indexOf(id) !== -1) return false;
    state.achievements.push(id);
    saveJSON('cli-achievements', state.achievements);
    print('🏆 achievement unlocked: ' + label, 'term-out-achieve');
    return true;
  }

  function trackThemeVisit(name) {
    if (state.themeVisits.indexOf(name) === -1) {
      state.themeVisits.push(name);
      saveJSON('cli-theme-visits', state.themeVisits);
    }
    var all = ['green', 'amber', 'blue', 'cyberpunk'];
    if (all.every(function (n) { return state.themeVisits.indexOf(n) !== -1; })) {
      unlock('themes', 'tried every color scheme');
    }
  }

  // ---- Matrix rain --------------------------------------------------------
  var matrixCanvas = null, matrixRAF = null, matrixDrops = null, matrixCols = 0;
  function startMatrix() {
    if (matrixCanvas) return;
    matrixCanvas = document.createElement('canvas');
    matrixCanvas.className = 'matrix-canvas';
    matrixCanvas.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(matrixCanvas, document.body.firstChild);
    var ctx = matrixCanvas.getContext('2d');
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

  function updatePrompt() {
    var path = api.state.pathString ? api.state.pathString(state.cwd) : '~';
    promptEl.textContent = 'guest@portfolio:' + path + '$';
  }

  var api = {
    print: print, printLink: printLink, printSequence: printSequence, clear: clearOutput,
    state: state, html: html, unlock: unlock, trackThemeVisit: trackThemeVisit,
    startMatrix: startMatrix, stopMatrix: stopMatrix, beep: function (f, d) { beep(f, d); },
    shakeScreen: shakeScreen, isReduced: function () { return reduce; },
    navigate: function (url) { window.location.href = url; },
    // rm/hack/coffee stage their output over time via setTimeout; locking the
    // input while one is running keeps a second command from being submitted
    // mid-sequence and interleaving its lines with the one still printing.
    lockInput: function () { state.busy = true; inputEl.disabled = true; },
    unlockInput: function () { state.busy = false; inputEl.disabled = false; inputEl.focus(); }
  };

  var COMMANDS = window.CLI_BUILD(api);

  function tokenize(s) {
    var re = /"([^"]*)"|'([^']*)'|(\S+)/g, out = [], m;
    while ((m = re.exec(s))) out.push(m[1] !== undefined ? m[1] : (m[2] !== undefined ? m[2] : m[3]));
    return out;
  }

  function runCommandLine(raw) {
    // Single choke point: while boot text or a staged sequence (rm/hack/
    // coffee) is still printing, ignore new input from *any* source — the
    // Enter key, a chip click, or anything else — instead of just disabling
    // the input element, which a chip button (or a synthetic event) can
    // bypass.
    if (state.busy) return;
    var d = document.createElement('div');
    d.className = 'term-line';
    var echoPrompt = document.createElement('span');
    echoPrompt.className = 'term-echo-prompt';
    echoPrompt.textContent = promptEl.textContent;
    d.appendChild(echoPrompt);
    d.appendChild(document.createTextNode(' ' + raw));
    outputEl.appendChild(d);
    scrollToBottom();

    var trimmed = raw.trim();
    if (!trimmed) return;
    beep(300, 0.02);

    if (trimmed !== state.history[state.history.length - 1]) state.history.push(trimmed);
    state.historyIndex = state.history.length;

    var tokens = tokenize(trimmed);
    var name = tokens[0].toLowerCase();
    var args = tokens.slice(1);
    var cmd = COMMANDS[name];
    if (!cmd) {
      print(name + ": command not found. Type 'help' to see what's available.", 'term-out-error');
      return;
    }
    cmd.run(args, trimmed);
    updatePrompt();
  }

  function listNamesForCompletion() {
    var node = state.findNode(state.cwd);
    if (!node || !node.children) return [];
    return Object.keys(node.children).filter(function (n) { return n.charAt(0) !== '.'; });
  }

  function tabComplete() {
    var val = inputEl.value;
    var parts = val.split(/\s+/);
    var isFirst = parts.length <= 1 && !/\s$/.test(val);
    var lastTok = parts[parts.length - 1] || '';
    var candidates;
    if (isFirst) {
      candidates = Object.keys(COMMANDS).filter(function (c) {
        return COMMANDS[c].desc !== null && c.indexOf(lastTok) === 0;
      }).sort();
    } else if (['ls', 'cd', 'cat'].indexOf(parts[0]) !== -1) {
      candidates = listNamesForCompletion().filter(function (n) { return n.indexOf(lastTok) === 0; }).sort();
    } else {
      candidates = [];
    }
    if (candidates.length === 1) {
      parts[parts.length - 1] = candidates[0];
      inputEl.value = parts.join(' ') + (isFirst ? ' ' : '');
    } else if (candidates.length > 1) {
      print(candidates.join('    '), 'term-out-mono');
    }
  }

  function historyUp() {
    if (!state.history.length) return;
    if (state.historyIndex > 0) state.historyIndex--;
    inputEl.value = state.history[state.historyIndex] || '';
  }
  function historyDown() {
    if (!state.history.length) return;
    if (state.historyIndex < state.history.length - 1) {
      state.historyIndex++;
      inputEl.value = state.history[state.historyIndex];
    } else {
      state.historyIndex = state.history.length;
      inputEl.value = '';
    }
  }

  // ---- Konami code (works regardless of input focus, never blocks default) --
  var KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  var konamiPos = 0;
  document.addEventListener('keydown', function (e) {
    var key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === KONAMI[konamiPos]) {
      konamiPos++;
      if (konamiPos === KONAMI.length) {
        konamiPos = 0;
        print('↑↑↓↓←→←→BA — you found it. Nothing breaks, nothing unlocks except this line and an achievement.', 'term-out-achieve');
        unlock('konami', 'entered the Konami code');
      }
    } else {
      konamiPos = (key === KONAMI[0]) ? 1 : 0;
    }
  });

  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      var val = inputEl.value;
      inputEl.value = '';
      runCommandLine(val);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      tabComplete();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      historyUp();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      historyDown();
    } else if (e.key.length === 1) {
      beep(220, 0.015);
    }
  });

  chipsEl.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('button[data-cmd]') : null;
    if (!btn) return;
    inputEl.value = '';
    runCommandLine(btn.getAttribute('data-cmd'));
    inputEl.focus();
  });

  screenEl.addEventListener('click', function () { inputEl.focus(); });

  // ---- boot sequence --------------------------------------------------------
  var BOOT_LINES = [
    'DHEERAJ-OS v1.0 (c) 2026',
    'Initializing shell...',
    'Checking filesystem... OK',
    'Mounting ~/projects... OK',
    'Loading skills.txt... OK',
    'Handshake with github.com... OK',
    '',
    '┌───────────────────┐',
    '│       D P V       │',
    '│  full-stack dev   │',
    '└───────────────────┘',
    '',
    "Welcome. Type 'help' to see available commands."
  ];

  function runBoot() {
    updatePrompt();
    if (reduce) {
      print(BOOT_LINES.join('\n'), 'term-out-mono');
      outputEl.setAttribute('aria-live', 'polite');
      inputEl.disabled = false;
      return;
    }
    var done = false;
    state.busy = true; // also blocks chip-button clicks during boot, not just the (disabled) input
    // Natural completion (printSequence's callback) just finalizes — the
    // lines are already all on screen from the stagger. Only an explicit
    // skip needs to clear and jump straight to the finished block.
    function completeAll() {
      if (done) return;
      done = true;
      document.removeEventListener('keydown', onSkipKey);
      screenEl.removeEventListener('click', onSkipClick);
      outputEl.setAttribute('aria-live', 'polite');
      state.busy = false;
      inputEl.disabled = false;
    }
    function skip() {
      if (done) return;
      clearOutput();
      print(BOOT_LINES.join('\n'), 'term-out-mono');
      completeAll();
    }
    function onSkipKey(e) {
      if (e.key === 'Tab') return; // don't eat focus navigation before boot even finishes
      skip();
    }
    function onSkipClick() { skip(); }
    document.addEventListener('keydown', onSkipKey);
    screenEl.addEventListener('click', onSkipClick);
    inputEl.disabled = true;
    printSequence(BOOT_LINES, 90, completeAll);
  }

  runBoot();
})();
