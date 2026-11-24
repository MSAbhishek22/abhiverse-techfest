/* ABHIVERSE TECHFEST — concept site behaviour
   One Three.js canvas (hero), countdown, filters, tilt, reveal, register form. */
import * as THREE from 'three';

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ================= Three.js hero scene ================= */
(function initScene() {
  const canvas = document.getElementById('bg3d');
  if (!canvas) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) {
    canvas.style.display = 'none';
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x04060f, 0.028);

  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 200);
  camera.position.set(0, 7.5, 17);

  /* --- wireframe terrain --- */
  const SEG = 72, SIZE = 90;
  const terrainGeo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  terrainGeo.rotateX(-Math.PI / 2);
  const base = terrainGeo.attributes.position.array.slice();
  const terrain = new THREE.Mesh(
    terrainGeo,
    new THREE.MeshBasicMaterial({ color: 0x155e75, wireframe: true, transparent: true, opacity: 0.5 })
  );
  terrain.position.y = -3.4;
  scene.add(terrain);

  function waveHeight(x, z, t) {
    return Math.sin(x * 0.22 + t * 0.9) * 1.15
         + Math.cos(z * 0.3 - t * 0.7) * 0.9
         + Math.sin((x + z) * 0.11 + t * 0.45) * 0.7;
  }
  function displace(geo, t) {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], z = base[i * 3 + 2];
      pos.setY(i, waveHeight(x, z, t));
    }
    pos.needsUpdate = true;
  }

  /* --- particle wave above the terrain --- */
  const P_COLS = 110, P_ROWS = 34, P_COUNT = P_COLS * P_ROWS;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(P_COUNT * 3);
  const pBase = new Float32Array(P_COUNT * 2);
  let p = 0;
  for (let r = 0; r < P_ROWS; r++) {
    for (let c = 0; c < P_COLS; c++) {
      const x = (c / (P_COLS - 1) - 0.5) * 76;
      const z = (r / (P_ROWS - 1) - 0.5) * 26;
      pBase[p * 2] = x; pBase[p * 2 + 1] = z;
      pPos[p * 3] = x; pPos[p * 3 + 1] = 0; pPos[p * 3 + 2] = z;
      p++;
    }
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
    color: 0x67e8f9, size: 0.14, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  particles.position.y = 1.2;
  scene.add(particles);

  /* --- floating geometric shapes --- */
  const shapes = [];
  const shapeDefs = [
    { geo: new THREE.IcosahedronGeometry(1.5, 0), color: 0x22d3ee, pos: [-9.5, 3.6, -4] },
    { geo: new THREE.TorusKnotGeometry(0.95, 0.3, 90, 12), color: 0x8b5cf6, pos: [9.8, 4.4, -5] },
    { geo: new THREE.OctahedronGeometry(1.25, 0), color: 0xa78bfa, pos: [6.4, 1.4, 2.5] },
    { geo: new THREE.TorusGeometry(1.1, 0.34, 12, 40), color: 0x22d3ee, pos: [-6.8, 0.9, 2] },
    { geo: new THREE.IcosahedronGeometry(0.8, 0), color: 0x67e8f9, pos: [0.5, 5.6, -8] }
  ];
  for (const d of shapeDefs) {
    const m = new THREE.Mesh(d.geo, new THREE.MeshBasicMaterial({
      color: d.color, wireframe: true, transparent: true, opacity: 0.75
    }));
    m.position.set(d.pos[0], d.pos[1], d.pos[2]);
    m.userData.homeY = d.pos[1];
    m.userData.spin = 0.15 + Math.random() * 0.25;
    m.userData.phase = Math.random() * Math.PI * 2;
    scene.add(m);
    shapes.push(m);
  }

  /* --- mouse parallax --- */
  let targetX = 0, targetY = 0, camX = 0, camY = 0;
  if (!prefersReduced) {
    window.addEventListener('pointermove', (e) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  function resize() {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth;
    const h = canvas.clientHeight || canvas.parentElement.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  let inView = true;
  const io = new IntersectionObserver((entries) => {
    inView = entries[0].isIntersecting;
  }, { threshold: 0.02 });
  io.observe(canvas);

  const clock = new THREE.Clock();
  let firstFrame = true;

  function renderFrame(t) {
    displace(terrainGeo, t);
    const pp = pGeo.attributes.position;
    for (let i = 0; i < P_COUNT; i++) {
      const x = pBase[i * 2], z = pBase[i * 2 + 1];
      pp.setY(i, Math.sin(x * 0.24 + t * 1.4) * 0.85 + Math.cos(z * 0.5 - t * 1.1) * 0.55);
    }
    pp.needsUpdate = true;
    for (const s of shapes) {
      s.rotation.x += 0.0035 * s.userData.spin * 4;
      s.rotation.y += 0.005 * s.userData.spin * 4;
      s.position.y = s.userData.homeY + Math.sin(t * 0.8 + s.userData.phase) * 0.45;
    }
    camX += (targetX - camX) * 0.045;
    camY += (targetY - camY) * 0.045;
    camera.position.x = camX * 2.6;
    camera.position.y = 7.5 - camY * 1.6;
    camera.lookAt(0, 0.6, 0);
    renderer.render(scene, camera);
    if (firstFrame) { firstFrame = false; window.__THREE_SCENE_OK = true; }
  }

  if (prefersReduced) {
    renderFrame(1.6); /* one still frame, no loop */
    return;
  }

  renderer.setAnimationLoop(() => {
    if (!inView || document.hidden) return; /* pause off-screen */
    renderFrame(clock.getElapsedTime());
  });
})();

/* ================= Countdown to 1 March 2027 ================= */
(function countdown() {
  const target = new Date('2027-03-01T00:00:00');
  const el = {
    d: document.getElementById('cdDays'),
    h: document.getElementById('cdHours'),
    m: document.getElementById('cdMins'),
    s: document.getElementById('cdSecs'),
    note: document.getElementById('cdNote')
  };
  if (!el.d) return;
  const pad = (n) => String(n).padStart(2, '0');
  function tick() {
    const diff = target - new Date();
    if (diff <= 0) {
      el.d.textContent = '00'; el.h.textContent = '00';
      el.m.textContent = '00'; el.s.textContent = '00';
      el.note.textContent = 'The gates are open — the edition has begun.';
      return;
    }
    el.d.textContent = pad(Math.floor(diff / 86400000));
    el.h.textContent = pad(Math.floor(diff / 3600000) % 24);
    el.m.textContent = pad(Math.floor(diff / 60000) % 60);
    el.s.textContent = pad(Math.floor(diff / 1000) % 60);
  }
  tick();
  setInterval(tick, 1000);
})();

/* ================= Scroll reveal + stat count-up ================= */
(function reveal() {
  const items = document.querySelectorAll('.reveal');
  if (prefersReduced || !('IntersectionObserver' in window)) {
    items.forEach((n) => n.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      }
    }, { threshold: 0.14 });
    items.forEach((n) => io.observe(n));
  }

  function formatNum(v, format) {
    if (format === 'inr') return '₹' + (v >= 1000000 ? '10,00,000+' : Math.round(v).toLocaleString('en-IN'));
    return Math.round(v).toLocaleString('en-IN') + '+';
  }
  const nums = document.querySelectorAll('.stat-num');
  const io2 = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io2.unobserve(e.target);
      const end = Number(e.target.dataset.count);
      const format = e.target.dataset.format;
      if (prefersReduced) { e.target.textContent = formatNum(end, format); continue; }
      const start = performance.now(), dur = 1400;
      (function step(now) {
        const k = Math.min((now - start) / dur, 1);
        e.target.textContent = formatNum(end * (1 - Math.pow(1 - k, 3)), format);
        if (k < 1) requestAnimationFrame(step);
      })(start);
    }
  }, { threshold: 0.4 });
  nums.forEach((n) => io2.observe(n));
})();

/* ================= Competition filter ================= */
(function filter() {
  const buttons = document.querySelectorAll('.filter-btn');
  const cards = Array.from(document.querySelectorAll('.comp-card'));
  const note = document.getElementById('filterNote');
  if (!buttons.length) return;
  const names = { all: 'all 6 flagship competitions', ai: 'the AI arena', hardware: 'the hardware arenas', code: 'the code arenas' };

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.toggle('is-active', b === btn));
      const f = btn.dataset.filter;
      let shown = 0;
      for (const card of cards) {
        const match = f === 'all' || card.dataset.cat === f;
        if (match) {
          shown++;
          card.hidden = false;
          requestAnimationFrame(() => card.classList.remove('is-hiding'));
        } else if (prefersReduced) {
          card.hidden = true;
        } else {
          card.classList.add('is-hiding');
          setTimeout(() => { if (card.classList.contains('is-hiding')) card.hidden = true; }, 260);
        }
      }
      note.textContent = 'Showing ' + shown + ' of 6 — ' + names[f];
    });
  });
})();

/* ================= 3D tilt on cards ================= */
(function tilt() {
  if (prefersReduced || window.matchMedia('(hover: none)').matches) return;
  document.querySelectorAll('.tilt').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const rx = ((e.clientY - r.top) / r.height - 0.5) * -11;
      const ry = ((e.clientX - r.left) / r.width - 0.5) * 11;
      card.style.transform = 'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateY(-3px)';
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });
})();

/* ================= Register form ================= */
(function register() {
  const form = document.getElementById('regForm');
  if (!form) return;
  const nameIn = document.getElementById('regName');
  const emailIn = document.getElementById('regEmail');
  const compIn = document.getElementById('regComp');
  const success = document.getElementById('regSuccess');
  const successText = document.getElementById('successText');
  const count = document.getElementById('regCount');
  const KEY = 'abhiverse_registrations';

  function entries() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch (e) { return []; }
  }
  function showCount() {
    const n = entries().length;
    count.textContent = n === 0
      ? 'Be among the first names on this device’s register.'
      : n + (n === 1 ? ' registration' : ' registrations') + ' saved on this device.';
  }
  showCount();

  function setErr(input, errEl, bad) {
    document.getElementById(errEl).hidden = !bad;
    input.classList.toggle('invalid', bad);
    input.setAttribute('aria-invalid', bad ? 'true' : 'false');
    return !bad;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const okName = setErr(nameIn, 'errName', nameIn.value.trim().length < 2);
    const okEmail = setErr(emailIn, 'errEmail', !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailIn.value.trim()));
    const okComp = setErr(compIn, 'errComp', compIn.value === '');
    if (!(okName && okEmail && okComp)) {
      (document.querySelector('.field input.invalid, .field select.invalid') || nameIn).focus();
      return;
    }
    const entry = {
      name: nameIn.value.trim(),
      email: emailIn.value.trim(),
      competition: compIn.value,
      at: new Date().toISOString()
    };
    const list = entries();
    list.push(entry);
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (err) { /* storage full/blocked — success still shown */ }
    successText.textContent = 'Welcome aboard, ' + entry.name.split(' ')[0] +
      ' — your name is down for ' + entry.competition +
      '. Watch your inbox as March 2027 draws near.';
    form.hidden = true;
    success.hidden = false;
    showCount();
  });

  document.getElementById('regAgain').addEventListener('click', () => {
    form.reset();
    success.hidden = true;
    form.hidden = false;
    nameIn.focus();
  });

  /* "Register interest" buttons pre-select the competition */
  document.querySelectorAll('[data-comp]').forEach((btn) => {
    btn.addEventListener('click', () => {
      compIn.value = btn.dataset.comp;
      setErr(compIn, 'errComp', false);
      document.getElementById('register').scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth' });
      setTimeout(() => nameIn.focus({ preventScroll: true }), prefersReduced ? 0 : 650);
    });
  });
})();
