/* @ds-bundle: {"format":4,"namespace":"Portfolio3D","components":[{"name":"Hero3D"},{"name":"ProjectCard"},{"name":"SkillBadge"},{"name":"ContactLink"}]} */
(function () {
  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function tokenColor(el, name, fallback) {
    var v = getComputedStyle(el).getPropertyValue('--' + name);
    return (v && v.trim()) || fallback;
  }

  // ---- Hero3D --------------------------------------------------------
  // mountHero3D(container, { name, title }) -> { destroy() }
  // Renders a single lit, low-poly "crystal" (a flat-shaded icosahedron)
  // with a soft additive glow behind it and two orbiting colored lights that
  // sweep shifting highlights across its facets as it slowly tumbles,
  // parallaxed on mouse move. Falls back to a static CSS starfield when
  // WebGL / three.js or reduced motion is unavailable.
  function mountHero3D(container, opts) {
    opts = opts || {};
    var name = opts.name || '';
    var title = opts.title || '';

    container.innerHTML = '';
    container.classList.add('ds-hero3d');

    var overlay = document.createElement('div');
    overlay.className = 'ds-hero3d-overlay';

    var nameEl = document.createElement('h1');
    nameEl.className = 'ds-hero3d-name display-xl';
    nameEl.textContent = name;

    var titleEl = document.createElement('p');
    titleEl.className = 'ds-hero3d-title body-lg';
    titleEl.textContent = title;

    overlay.appendChild(nameEl);
    overlay.appendChild(titleEl);

    var reduceMotion = prefersReducedMotion();

    if (!window.THREE || reduceMotion) {
      container.classList.add('ds-hero3d-fallback');
      container.appendChild(overlay);
      return { destroy: function () { container.innerHTML = ''; } };
    }

    var THREE = window.THREE;
    var width = container.clientWidth || 960;
    var height = container.clientHeight || 420;

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.className = 'ds-hero3d-canvas';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    container.appendChild(renderer.domElement);
    container.appendChild(overlay);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 6;

    var accentHex = tokenColor(container, 'accent', '#39ff88');
    var accentSecondaryHex = tokenColor(container, 'accent-secondary', '#4dd8e6');
    var inkHex = tokenColor(container, 'ink', '#eaf2ee');
    var surface200Hex = tokenColor(container, 'surface-200', '#1c2622');

    var group = new THREE.Group();
    scene.add(group);
    function placeGroup() { group.position.y = container.clientWidth < 640 ? 0.6 : 0; }
    placeGroup();

    // A soft additive glow behind the crystal — a radial-gradient sprite,
    // since plain three.js has no bloom pass without extra postprocessing
    // files. Cheap, but reads as a real light source rather than a flat shape.
    function makeGlowTexture(hex) {
      var size = 256;
      var c = document.createElement('canvas');
      c.width = size; c.height = size;
      var ctx = c.getContext('2d');
      var g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      g.addColorStop(0, hex + 'cc');
      g.addColorStop(0.35, hex + '55');
      g.addColorStop(1, hex + '00');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      var tex = new THREE.CanvasTexture(c);
      return tex;
    }
    var glowTex = makeGlowTexture(accentHex);
    var glowMat = new THREE.SpriteMaterial({
      map: glowTex,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    var glow = new THREE.Sprite(glowMat);
    glow.scale.set(4.6, 4.6, 1);
    glow.position.z = -0.6; // 4.6 units keeps the fade inside the ~5-unit-tall view; larger gets clipped flat at the hero edge
    group.add(glow);

    // The focal object: a low-poly faceted "crystal" (flat-shaded
    // icosahedron), lit dramatically so its facets catch color as it turns.
    var crystalGeo = new THREE.IcosahedronGeometry(1.7, 0);
    var crystalMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(surface200Hex),
      metalness: 0.55,
      roughness: 0.28,
      flatShading: true,
      emissive: new THREE.Color(accentHex),
      emissiveIntensity: 0.12
    });
    var crystal = new THREE.Mesh(crystalGeo, crystalMat);
    group.add(crystal);

    var ambient = new THREE.AmbientLight(new THREE.Color(inkHex), 0.35);
    scene.add(ambient);

    var keyLight = new THREE.PointLight(new THREE.Color(accentHex), 14, 20);
    keyLight.position.set(3, 2, 4);
    scene.add(keyLight);

    var rimLight = new THREE.PointLight(new THREE.Color(accentSecondaryHex), 10, 20);
    rimLight.position.set(-3, -1.5, -3);
    scene.add(rimLight);

    // Faint background particles for depth, well behind the crystal.
    var bgCount = 140;
    var bgGeo = new THREE.BufferGeometry();
    var bgPositions = new Float32Array(bgCount * 3);
    for (var i = 0; i < bgCount; i++) {
      bgPositions[i * 3] = (Math.random() - 0.5) * 24;
      bgPositions[i * 3 + 1] = (Math.random() - 0.5) * 24;
      bgPositions[i * 3 + 2] = (Math.random() - 0.5) * 24 - 6;
    }
    bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));
    var bgMat = new THREE.PointsMaterial({
      color: new THREE.Color(inkHex),
      size: 0.025,
      transparent: true,
      opacity: 0.35
    });
    var bg = new THREE.Points(bgGeo, bgMat);
    scene.add(bg);

    var mouseX = 0, mouseY = 0;
    function onMove(e) {
      var rect = container.getBoundingClientRect();
      mouseX = (e.clientX - rect.left) / rect.width - 0.5;
      mouseY = (e.clientY - rect.top) / rect.height - 0.5;
    }
    container.addEventListener('pointermove', onMove);

    var raf;
    function tick() {
      var t = Date.now() * 0.001;

      crystal.rotation.y += 0.0032;
      crystal.rotation.x += 0.0014;
      bg.rotation.y += 0.0003;

      // Orbit the two lights so the crystal's facets catch shifting color
      // as it turns, instead of sitting under one flat, static highlight.
      keyLight.position.x = Math.cos(t * 0.6) * 3.4;
      keyLight.position.z = Math.sin(t * 0.6) * 3.4 + 1;
      rimLight.position.x = Math.cos(t * 0.4 + Math.PI) * 3.4;
      rimLight.position.z = Math.sin(t * 0.4 + Math.PI) * 3.4 - 1;

      // A slow breathing pulse on the glow behind the crystal.
      var pulse = 1 + Math.sin(t * 0.8) * 0.06;
      glow.scale.set(4.6 * pulse, 4.6 * pulse, 1);

      camera.position.x += (mouseX * 1.2 - camera.position.x) * 0.04;
      camera.position.y += (-mouseY * 1.2 - camera.position.y) * 0.04;
      camera.lookAt(scene.position);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    }
    tick();

    // Stop rendering while the hero is scrolled out of view.
    var visible = true;
    var io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (entries) {
        var v = entries[0].isIntersecting;
        if (v && !visible) { visible = true; tick(); }
        else if (!v && visible) { visible = false; cancelAnimationFrame(raf); }
      });
      io.observe(container);
    }

    function onResize() {
      var w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      placeGroup();
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', onResize);

    return {
      destroy: function () {
        cancelAnimationFrame(raf);
        if (io) io.disconnect();
        window.removeEventListener('resize', onResize);
        container.removeEventListener('pointermove', onMove);
        renderer.dispose();
        crystalGeo.dispose();
        crystalMat.dispose();
        glowTex.dispose();
        glowMat.dispose();
        bgGeo.dispose();
        bgMat.dispose();
        container.innerHTML = '';
      }
    };
  }

  // ---- ProjectCard tilt -----------------------------------------------
  // initTilt(cardEl) — pointer-tracked 3D tilt; no-ops on repeat calls and
  // degrades to a plain lift under prefers-reduced-motion.
  function initTilt(card) {
    if (!card || card.__dsTiltBound) return;
    card.__dsTiltBound = true;

    if (prefersReducedMotion()) {
      card.classList.add('ds-tilt-static');
      return;
    }

    card.classList.add('ds-tilt');

    function onMove(e) {
      var rect = card.getBoundingClientRect();
      var px = (e.clientX - rect.left) / rect.width - 0.5;
      var py = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform =
        'perspective(700px) rotateX(' + (py * -8).toFixed(2) + 'deg) rotateY(' + (px * 10).toFixed(2) + 'deg)';
    }
    function onLeave() {
      card.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg)';
    }

    card.addEventListener('pointermove', onMove);
    card.addEventListener('pointerleave', onLeave);
  }

  window.Portfolio3D = {
    mountHero3D: mountHero3D,
    initTilt: initTilt
  };
})();
