/* Command data + handlers for the CLI portfolio. Pure content/logic — no DOM
   access here. terminal.js builds an `api` object (print functions, mutable
   state, small FS helpers) and calls CLI_BUILD(api) to get back the command
   registry it runs against typed input. All copy below mirrors the real
   scrolling portfolio in ../site/ so the two never drift apart in substance. */
(function () {
  var ABOUT_TEXT = 'I build full-stack web apps end to end: layered APIs, authentication, storage, ' +
    'Docker deployment and polished frontends. I like clean architecture and small details, from a ' +
    'controller/service/repository split to a night-sky family history site.';

  var EXPERIENCE_TEXT = 'Lektik — Software Engineering Intern (June 2026 — Present)\n\n' +
    '- Migrated CI/CD from self-hosted GitLab to GitHub Actions, building automated deploy pipelines ' +
    'across dev, staging, and production\n' +
    '- Provisioned AWS infrastructure as code with Terraform (ECS, ECR, Cognito, IAM, SES), including ' +
    'CI trust policies and centralized secrets management\n' +
    '- Contributed backend features and fixes in a Next.js/TypeScript + FastAPI/PostgreSQL codebase, ' +
    'working spec-first with written technical proposals for new features\n\n' +
    'stack: Terraform, AWS, GitHub Actions, FastAPI\n\n' +
    '---\n\n' +
    'Jetpack Softs — Software Engineering Intern (April 2025 — November 2025)\n\n' +
    '- Built and maintained RESTful APIs for CRUD operations and database interactions using Node.js ' +
    'and MySQL\n' +
    '- Developed backend functionality for a retail and service management platform — repairs, ' +
    'invoicing, and purchase tracking — with a focus on scalability\n' +
    '- Integrated frontend components with backend services and documented features for deployment ' +
    'and maintenance\n\n' +
    'stack: Node.js, JavaScript, MySQL, REST APIs';

  var SKILLS_TEXT = [
    'Languages         TypeScript, JavaScript, Python, SQL, HTML/CSS, Bash',
    'Frontend          Next.js, React, Vite, Tailwind CSS, EJS',
    'Backend           FastAPI, Express, Flask, Prisma, SQLAlchemy, Alembic, Pydantic, Firebase Cloud Messaging',
    'Auth & security   JWT, Sessions, bcrypt, TOTP 2FA, Row-level security',
    'Data & storage    PostgreSQL, MySQL, Supabase, MinIO / S3',
    'DevOps            Docker, Docker Compose, GitHub Actions, AWS, Terraform, OpenTelemetry, Linux',
    'Testing & tooling Pytest, Vitest, Playwright, ESLint, Prettier, Git, Claude Code'
  ].join('\n');

  var PROJECTS = [
    {
      id: 'family-galaxy', file: 'family-galaxy.md', name: 'The Family Galaxy', featured: true,
      desc: 'Relatives as stars in a night sky — before/after photo sliders, flippable postcards, and a ' +
        'timeline that ages the sky through the decades. Vanilla JS with Supabase (Postgres, Storage, ' +
        'row-level security) for shared cloud sync.',
      tags: ['Vanilla JS', 'Supabase', 'PostgreSQL', 'Row-level security'],
      repo: 'https://github.com/Dheeraj-pv/Family-Galaxy'
    },
    {
      id: 'tradelink', file: 'tradelink.md', name: 'TradeLink',
      desc: 'A service marketplace on Next.js 16 (App Router) and TypeScript — route → controller → ' +
        'service → repository, Prisma with PostgreSQL, JWT auth, MinIO file storage, Firebase push ' +
        'notifications, OpenTelemetry. Ships with Docker.',
      tags: ['Next.js 16', 'Prisma', 'JWT', 'Docker'],
      repo: 'https://github.com/Dheeraj-pv/tradeLink'
    },
    {
      id: 'tradelink-fastapi', file: 'tradelink-fastapi.md', name: 'TradeLink (FastAPI edition)',
      desc: 'The same marketplace rebuilt with a Python backend — FastAPI, SQLAlchemy 2, Alembic ' +
        'migrations, Pydantic validation, JWT auth and TOTP two-factor login, a pytest suite and ' +
        'pre-commit hooks.',
      tags: ['FastAPI', 'SQLAlchemy 2', 'TOTP 2FA', 'Pytest'],
      repo: 'https://github.com/Dheeraj-pv/tradeLink-FastApi'
    },
    {
      id: 'grama-panchayat', file: 'grama-panchayat.md', name: 'Grama Panchayat Citizen Portal',
      desc: 'A citizen-facing portal for local services — healthcare, education, transport, emergency ' +
        'contacts and tourism. Flask with SQLAlchemy and MySQL, Flask-Login auth, a Flask-Admin ' +
        'dashboard and email-based password reset with signed, expiring tokens.',
      tags: ['Flask', 'SQLAlchemy', 'MySQL', 'Flask-Admin'],
      repo: 'https://github.com/Dheeraj-pv/miniproject'
    },
    {
      id: 'evo-munnar', file: 'evo-munnar.md', name: 'EVO Munnar',
      desc: 'An Express backend serving a React (Vite) frontend — register and login flows, ' +
        'cookie-based auth middleware that gates routes before static assets are served, and ' +
        'server-rendered EJS bill pages.',
      tags: ['Express', 'React', 'Vite', 'EJS'],
      repo: 'https://github.com/Dheeraj-pv/EVO_MUNNAR'
    }
  ];

  // Real commits (git log --oneline), newest first — the only repo whose
  // history was actually fetched and worth showing verbatim.
  var FAMILY_GALAXY_LOG = [
    ['4e5237e', 'Add milestone constellation, ambient discovery, and a family map view'],
    ['8983982', 'Smooth the story-mode playhead glide instead of hopping per year'],
    ['25e3b99', 'Add remove photo option to Then & Now uploads'],
    ['3df299a', 'Fix Then & Now upload buttons being swallowed by the divider drag'],
    ['1b724be', 'Document Supabase cloud sync and photo uploads in CLAUDE.md'],
    ['92507cc', 'Initial commit: The Family Galaxy frontend + Supabase cloud sync']
  ];

  var FORTUNES = [
    'Ship small, ship often, roll back calmly.',
    'The bug is always in the last place you check — because you stop looking after that.',
    'A good README saves a future 2am you.',
    'There are two hard problems: cache invalidation, naming things, and off-by-one errors.',
    'Tests are just documentation that complains when you lie to it.',
    'Every "quick fix" has a family.',
    'Read the error message. All of it. Yes, the stack trace too.',
    'The database always remembers, even when you would rather it forgot.'
  ];

  var ACHIEVEMENTS_META = [
    { id: 'sudo', label: 'tried to sudo your way in' },
    { id: 'hidden-files', label: 'found the hidden folder' },
    { id: 'matrix', label: 'turned on the matrix rain' },
    { id: 'konami', label: 'entered the Konami code' },
    { id: 'meltdown', label: 'survived rm -rf /' },
    { id: 'hack', label: 'ran a fake hack sequence' },
    { id: 'coffee', label: 'brewed a coffee' },
    { id: 'themes', label: 'tried every color scheme' }
  ];

  var EXT_TAGS = {
    py: ['fastapi', 'flask', 'sqlalchemy', 'pydantic', 'alembic'],
    js: ['vanilla js', 'express', 'ejs'],
    ts: ['next.js', 'typescript', 'prisma']
  };

  // ---- virtual filesystem ------------------------------------------------
  function projectFileNode(p) {
    var safeDesc = p.desc;
    var tagsLine = 'stack: ' + p.tags.join(', ');
    return {
      type: 'file',
      content: '# ' + p.name + '\n\n' + safeDesc + '\n\n' + tagsLine,
      link: p.repo,
      linkLabel: 'repo:  ' + p.repo
    };
  }

  function buildFS() {
    var projectChildren = {};
    PROJECTS.forEach(function (p) { projectChildren[p.file] = projectFileNode(p); });
    return {
      type: 'dir',
      children: {
        'about.md': { type: 'file', content: ABOUT_TEXT },
        'experience.log': { type: 'file', content: EXPERIENCE_TEXT },
        'skills.txt': { type: 'file', content: SKILLS_TEXT },
        'contact.sh': {
          type: 'file',
          content: '#!/bin/sh\n# Reach me here:\necho "GitHub: https://github.com/Dheeraj-pv"\n# No email or LinkedIn on file yet.',
          link: 'https://github.com/Dheeraj-pv',
          linkLabel: 'GitHub: https://github.com/Dheeraj-pv'
        },
        'resume.pdf': { type: 'file', special: 'resume' },
        'projects': { type: 'dir', children: projectChildren },
        '.secrets': {
          type: 'dir', hidden: true,
          children: {
            'welcome.txt': {
              type: 'file',
              content: 'You found the hidden folder.\nThere is no real treasure here — just a thank-you for poking around.\nTry: konami, sudo, rm -rf /, hack, matrix'
            }
          }
        }
      }
    };
  }

  function findByExt(ext) {
    var kws = EXT_TAGS[ext];
    if (!kws) return null;
    return PROJECTS.filter(function (p) {
      return p.tags.some(function (t) {
        var lt = t.toLowerCase();
        return kws.some(function (k) { return lt.indexOf(k) !== -1; });
      });
    });
  }

  function pad(s, n) { s = String(s); while (s.length < n) s += ' '; return s; }

  // ---- registry factory ---------------------------------------------------
  // api: { print(text,cls), printLink(text,url), state, html, unlock,
  //        startMatrix, stopMatrix, beep, isReduced, navigate, shakeScreen }
  window.CLI_BUILD = function (api) {
    var state = api.state;
    var FS = buildFS();

    function findNode(pathArr) {
      var node = FS;
      for (var i = 1; i < pathArr.length; i++) {
        if (!node.children || !node.children[pathArr[i]]) return null;
        node = node.children[pathArr[i]];
      }
      return node;
    }
    state.findNode = findNode;

    function pathString(cwd) {
      return cwd.length === 1 ? '~' : '~/' + cwd.slice(1).join('/');
    }
    state.pathString = pathString;

    function cd(arg) {
      if (!arg || arg === '~' || arg === '/') { state.cwd = ['~']; return; }
      var segs = arg.replace(/^\.\//, '').split('/').filter(Boolean);
      var newPath = state.cwd.slice();
      for (var i = 0; i < segs.length; i++) {
        var s = segs[i];
        if (s === '.') continue;
        if (s === '..') { if (newPath.length > 1) newPath.pop(); continue; }
        var node = findNode(newPath.concat(s));
        if (!node) { api.print('cd: no such directory: ' + arg, 'term-out-error'); return; }
        if (node.type !== 'dir') { api.print('cd: not a directory: ' + arg, 'term-out-error'); return; }
        newPath.push(s);
      }
      state.cwd = newPath;
    }

    function ls(args) {
      var showAll = args.indexOf('-a') !== -1;
      var pathArg = args.filter(function (a) { return a.charAt(0) !== '-'; })[0];
      var targetPath = state.cwd;
      if (pathArg) {
        var segs = pathArg.split('/').filter(Boolean);
        targetPath = state.cwd.slice();
        for (var i = 0; i < segs.length; i++) {
          var node = findNode(targetPath.concat(segs[i]));
          if (!node || node.type !== 'dir') { api.print("ls: cannot access '" + pathArg + "': No such directory", 'term-out-error'); return; }
          targetPath.push(segs[i]);
        }
      }
      var dirNode = findNode(targetPath);
      var names = Object.keys(dirNode.children || {}).filter(function (n) { return showAll || n.charAt(0) !== '.'; }).sort();
      if (!names.length) { api.print('(empty)'); return; }
      var line = names.map(function (n) {
        var c = dirNode.children[n];
        return c.type === 'dir' ? n + '/' : n;
      }).join('   ');
      api.print(line);
      if (showAll && names.indexOf('.secrets') !== -1) api.unlock('hidden-files', 'revealed .secrets/');
    }

    function cat(args) {
      if (!args.length) { api.print('usage: cat <file>', 'term-out-error'); return; }
      var pathArg = args[0];
      var segs = pathArg.split('/').filter(Boolean);
      var path = state.cwd.slice();
      for (var i = 0; i < segs.length - 1; i++) {
        var node = findNode(path.concat(segs[i]));
        if (!node || node.type !== 'dir') { api.print('cat: ' + pathArg + ': No such file or directory', 'term-out-error'); return; }
        path.push(segs[i]);
      }
      var fname = segs[segs.length - 1];
      var fileNode = findNode(path.concat(fname));
      if (!fileNode) { api.print('cat: ' + pathArg + ': No such file or directory', 'term-out-error'); return; }
      if (fileNode.type === 'dir') { api.print('cat: ' + pathArg + ': Is a directory', 'term-out-error'); return; }
      if (fileNode.special === 'resume') { api.print("No resume on file yet. Try 'ls projects' or 'contact'."); return; }
      api.print(fileNode.content || '');
      if (fileNode.link) api.printLink(fileNode.linkLabel || fileNode.link, fileNode.link);
      if (path.indexOf('.secrets') !== -1) api.unlock('hidden-files', 'read a hidden file');
    }

    var COMMANDS = {
      help: {
        desc: 'list available commands', run: function () {
          api.print([
            'FILESYSTEM   ls [-a] [dir]   cd <dir>   cat <file>   pwd   find . -name "<pattern>"',
            'INFO         about   experience   man <cmd>   whoami   neofetch   projects   skills',
            'CONTACT      contact   social   resume   legacy',
            'FUN          coffee   fortune   ping <name>   git log   top',
            'DISPLAY      theme <name>   crt on|off   matrix   sound on|off',
            'SESSION      clear   achievements   exit',
            '',
            'Tab to autocomplete · ↑/↓ for history · tap a command below to run it.'
          ].join('\n'));
        }
      },
      about: { desc: 'print the about text', run: function () { api.print(ABOUT_TEXT); } },
      experience: { desc: 'print work experience', run: function () { api.print(EXPERIENCE_TEXT); } },
      man: {
        desc: 'show the manual page for a command', run: function (args) {
          var name = args[0];
          if (!name) { api.print('usage: man <command>', 'term-out-error'); return; }
          var cmd = COMMANDS[name];
          if (!cmd) { api.print('No manual entry for ' + name, 'term-out-error'); return; }
          api.print(name.toUpperCase() + '(1)\n\n    ' + cmd.desc);
        }
      },
      pwd: { desc: 'print working directory', run: function () { api.print(pathString(state.cwd)); } },
      ls: { desc: 'list a directory', run: function (args) { ls(args); } },
      cd: { desc: 'change directory', run: function (args) { cd(args[0]); } },
      cat: { desc: 'print a file', run: function (args) { cat(args); } },
      find: {
        desc: 'find projects by tech stack', run: function (args) {
          var idx = args.indexOf('-name');
          var pattern = idx !== -1 ? args[idx + 1] : args[args.length - 1];
          if (!pattern) { api.print('usage: find . -name "*.ext"', 'term-out-error'); return; }
          var m = /\*\.(\w+)$/.exec(pattern);
          if (!m) { api.print('find: unsupported pattern ' + pattern, 'term-out-error'); return; }
          var ext = m[1].toLowerCase();
          if (ext === 'md') {
            api.print(['./about.md'].concat(PROJECTS.map(function (p) { return './projects/' + p.file; })).join('\n'));
            return;
          }
          var matches = findByExt(ext);
          if (!matches || !matches.length) { api.print('find: no matches for ' + pattern); return; }
          api.print(matches.map(function (p) { return './projects/' + p.file; }).join('\n'));
        }
      },
      projects: {
        desc: 'list projects with descriptions', run: function () {
          PROJECTS.forEach(function (p) {
            api.print((p.featured ? '★ ' : '  ') + p.name);
            api.print('  ' + p.desc);
            api.print('  [' + p.tags.join(', ') + ']');
            api.printLink('  ' + p.repo, p.repo);
            api.print('');
          });
        }
      },
      skills: { desc: 'list skills', run: function () { api.print(SKILLS_TEXT); } },
      whoami: { desc: 'a one-liner about me', run: function () { api.print('A developer who reads the whole stack trace before asking for help.'); } },
      neofetch: {
        desc: 'ascii portrait + stats', run: function () {
          api.print([
            '   ┌───────┐      guest@dheeraj-portfolio',
            '   │ D P V │      ─────────────────────',
            '   └───────┘      OS: DheerajOS (static-site edition)',
            '                     Shell: bash-flavored JS',
            '                     Stack: Next.js, FastAPI, PostgreSQL',
            '                     Packages: 20+ (see: skills)',
            '                     Terminal: you, right now',
            '                     Uptime: still building'
          ].join('\n'));
        }
      },
      ping: {
        desc: 'ping something', run: function (args) {
          var target = args[0];
          if (!target) { api.print('usage: ping <name>', 'term-out-error'); return; }
          if (/^(dheeraj|me)$/i.test(target)) {
            api.print('ping ' + target + ': 4 packets transmitted, 4 received, 0% loss — still awake, still shipping.');
          } else {
            api.print('ping ' + target + ': no response — try \'contact\' instead.');
          }
        }
      },
      coffee: {
        desc: 'brew a coffee', run: function () {
          api.print(['   ( (', '    ) )', ' .........', ' |       |]', ' \\       /', "  `-----'"].join('\n'));
          api.print('brewing...');
          api.lockInput();
          setTimeout(function () {
            api.print('Coffee ready. Productivity +2.');
            api.unlock('coffee', 'brewed a coffee');
            api.unlockInput();
          }, api.isReduced() ? 0 : 700);
        }
      },
      fortune: { desc: 'a random dev one-liner', run: function () { api.print(FORTUNES[Math.floor(Math.random() * FORTUNES.length)]); } },
      social: {
        desc: 'social links', run: function () {
          api.print('Reach me here:');
          api.printLink('  GitHub → https://github.com/Dheeraj-pv', 'https://github.com/Dheeraj-pv');
          api.print('No email or LinkedIn on file yet.');
        }
      },
      contact: {
        desc: 'how to reach me', run: function () {
          api.print('Reach me here:');
          api.printLink('  GitHub → https://github.com/Dheeraj-pv', 'https://github.com/Dheeraj-pv');
          api.print('No email or LinkedIn on file yet — GitHub is the best way for now.');
        }
      },
      resume: { desc: 'resume', run: function () { api.print("No resume on file yet. Try 'ls projects' or 'contact'."); } },
      git: {
        desc: 'career as commits', run: function (args) {
          if (args[0] !== 'log') { api.print('usage: git log', 'term-out-error'); return; }
          var lines = FAMILY_GALAXY_LOG.map(function (c) { return c[0] + ' (family-galaxy) ' + c[1]; });
          api.print(lines.join('\n'));
          api.print('');
          api.print('Other repos (summarized, not literal commit text):');
          api.print([
            '        (tradelink)          Next.js 16 service marketplace — Prisma, JWT, MinIO, Docker',
            '        (tradelink-fastapi)  Same marketplace rebuilt in FastAPI — SQLAlchemy 2, TOTP 2FA',
            '        (grama-panchayat)    Flask citizen portal for local government services',
            '        (evo-munnar)         Express + React app with cookie-based auth middleware'
          ].join('\n'));
          api.print('');
          api.printLink('full history: github.com/Dheeraj-pv', 'https://github.com/Dheeraj-pv');
        }
      },
      top: {
        desc: 'skills as running processes', run: function () {
          api.print([
            'PID   COMMAND         CPU%   STATUS',
            '101   nextjs           92%   running',
            '102   fastapi          88%   running',
            '103   typescript       85%   running',
            '104   postgresql       74%   running',
            '105   docker           70%   running',
            '106   python           65%   running',
            '107   react            60%   running',
            '108   prisma           55%   running',
            '109   coffee.exe       99%   critical'
          ].join('\n'));
        }
      },
      htop: { desc: 'alias for top', run: function (args) { COMMANDS.top.run(args); } },
      theme: {
        desc: 'change the color scheme', run: function (args) {
          var name = (args[0] || '').toLowerCase();
          if (!name) { api.print('current: ' + (state.themeName || 'green') + '\ntry: theme amber | theme blue | theme cyberpunk | theme daylight | theme green'); return; }
          if (name === 'daylight') {
            api.html.setAttribute('data-theme', 'daylight'); api.html.removeAttribute('data-accent');
            state.themeName = 'daylight'; api.print('theme: daylight'); return;
          }
          if (name === 'terminal' || name === 'green') {
            api.html.setAttribute('data-theme', 'terminal'); api.html.removeAttribute('data-accent');
            state.themeName = 'green'; api.print('theme: green'); api.trackThemeVisit('green'); return;
          }
          if (['amber', 'blue', 'cyberpunk'].indexOf(name) === -1) {
            api.print("theme: unknown scheme '" + name + "'. try green, amber, blue, cyberpunk, daylight", 'term-out-error'); return;
          }
          api.html.setAttribute('data-theme', 'terminal'); api.html.setAttribute('data-accent', name);
          state.themeName = name; api.print('theme: ' + name); api.trackThemeVisit(name);
        }
      },
      crt: {
        desc: 'toggle CRT scanlines', run: function (args) {
          var a = (args[0] || '').toLowerCase();
          if (a === 'on') { api.html.classList.remove('crt-off'); api.print('crt: on'); }
          else if (a === 'off') { api.html.classList.add('crt-off'); api.print('crt: off'); }
          else { api.print('crt: ' + (api.html.classList.contains('crt-off') ? 'off' : 'on') + '\nusage: crt on|off'); }
        }
      },
      matrix: {
        desc: 'toggle a Matrix-style rain background', run: function () {
          if (api.isReduced()) { api.print('matrix rain needs motion — reduced motion is on, so it stays off.'); return; }
          state.matrix = !state.matrix;
          if (state.matrix) { api.startMatrix(); api.print('matrix rain: on'); api.unlock('matrix', 'turned on the matrix rain'); }
          else { api.stopMatrix(); api.print('matrix rain: off'); }
        }
      },
      sound: {
        desc: 'toggle keyboard/beep sounds', run: function (args) {
          var a = (args[0] || '').toLowerCase();
          if (a === 'on') { state.sound = true; api.print('sound: on'); api.beep(440, 0.05); }
          else if (a === 'off') { state.sound = false; api.print('sound: off'); }
          else { api.print('sound: ' + (state.sound ? 'on' : 'off') + '\nusage: sound on|off'); }
        }
      },
      achievements: {
        desc: 'list unlocked achievements', run: function () {
          var lines = ACHIEVEMENTS_META.map(function (a) {
            var got = state.achievements.indexOf(a.id) !== -1;
            return (got ? '🏆 ' : '🔒 ') + pad(a.id, 14) + (got ? a.label : '???');
          });
          api.print(lines.join('\n') + '\n\n' + state.achievements.length + '/' + ACHIEVEMENTS_META.length + ' unlocked');
        }
      },
      clear: { desc: 'clear the screen', run: function () { api.clear(); } },
      sudo: {
        desc: null, run: function () {
          api.print("Nice try. You don't have permission to be me.", 'term-out-error');
          api.unlock('sudo', 'tried to sudo your way in');
        }
      },
      rm: {
        desc: null, run: function (args) {
          if (args.indexOf('-rf') !== -1 && args.indexOf('/') !== -1) {
            var lines = ['rm: descending into /', 'rm: removing /etc...', 'rm: removing /home...', 'rm: removing /var...', 'rm: removing /you-get-the-idea...'];
            api.shakeScreen();
            api.lockInput();
            api.printSequence(lines, api.isReduced() ? 0 : 160, function () {
              api.print('');
              api.print('Just kidding. Nothing was harmed — this is a portfolio, not root access. 🙂');
              api.unlock('meltdown', 'survived rm -rf /');
              api.unlockInput();
            });
          } else {
            api.print("rm: permission denied (this isn't a real filesystem)", 'term-out-error');
          }
        }
      },
      hack: {
        desc: null, run: function (args) {
          var target = args[0] || 'the mainframe';
          var lines = [
            'bootstrapping exploit chain...',
            'bypassing firewall... 41%... 77%... 100%',
            'cracking hash 0x' + Math.random().toString(16).slice(2, 10) + '...',
            'accessing ' + target + '...',
            'decrypting payload...'
          ];
          api.lockInput();
          api.printSequence(lines, api.isReduced() ? 0 : 220, function () {
            api.print('Access granted to: your own curiosity.');
            api.print('Nothing was actually hacked — nice try though.');
            api.unlock('hack', 'ran a fake hack sequence');
            api.unlockInput();
          });
        }
      },
      konami: { desc: null, run: function () { api.print("That's a key sequence, not a command — try the actual arrow keys."); } },
      exit: { desc: 'exit', run: function () { api.print('There is no escape from here — this is a static site, not a real shell. Just close the tab. 👋'); } },
      legacy: {
        desc: 'switch to the standard portfolio page', run: function () {
          api.print('Redirecting to the standard site...');
          setTimeout(function () { api.navigate('../site/index.html'); }, 500);
        }
      }
    };

    return COMMANDS;
  };
})();
