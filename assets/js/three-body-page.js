(function () {
  'use strict';

  const Core = window.ThreeBodyCore;
  if (!Core) return;

  const root = document.querySelector('[data-three-body-app]');
  if (!root) return;

  const canvas = root.querySelector('#orbit-canvas');
  const ctx = canvas.getContext('2d');
  const trailCanvas = document.createElement('canvas');
  const trailCtx = trailCanvas.getContext('2d');
  const presetSelect = root.querySelector('#preset-select');
  const themeButton = root.querySelector('#theme-toggle');
  const runButton = root.querySelector('#run-toggle');
  const resetButton = root.querySelector('#reset-sim');
  const recenterInput = root.querySelector('#recenter');
  const speedInput = root.querySelector('#speed');
  const dtInput = root.querySelector('#time-step');
  const trailInput = root.querySelector('#trail-length');
  const presetDescription = root.querySelector('#preset-description');
  const stats = {
    time: root.querySelector('#stat-time'),
    energy: root.querySelector('#stat-energy'),
    angular: root.querySelector('#stat-angular'),
    momentum: root.querySelector('#stat-momentum'),
  };
  const labels = {
    speed: root.querySelector('#speed-value'),
    dt: root.querySelector('#time-step-value'),
    trail: root.querySelector('#trail-length-value'),
  };

  const GRAVITY_OPTIONS = { gravity: 1, softening: 0.002 };
  const bodyColors = ['#5eead4', '#f97388', '#facc15', '#a78bfa', '#38bdf8'];

  const themes = {
    dark: {
      canvasA: '#030711',
      canvasB: '#111827',
      grid: 'rgba(148, 163, 184, 0.18)',
      ring: 'rgba(94, 234, 212, 0.13)',
      text: 'rgba(226, 232, 240, 0.88)',
      muted: 'rgba(148, 163, 184, 0.76)',
      stars: 'rgba(226, 232, 240, 0.7)',
    },
    light: {
      canvasA: '#f8fbff',
      canvasB: '#eaf1f8',
      grid: 'rgba(15, 23, 42, 0.14)',
      ring: 'rgba(2, 132, 199, 0.16)',
      text: 'rgba(15, 23, 42, 0.86)',
      muted: 'rgba(51, 65, 85, 0.68)',
      stars: 'rgba(15, 23, 42, 0.34)',
    },
  };

  const state = {
    sim: null,
    previousX: null,
    previousY: null,
    stars: [],
    presetKey: 'figureEight',
    running: true,
    theme: window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark',
    time: 0,
    initialEnergy: 0,
    initialAngular: 0,
    scale: 150,
    width: 900,
    height: 560,
  };

  const colorCache = new Map();

  function hexToRgb(hex) {
    if (colorCache.has(hex)) return colorCache.get(hex);
    const clean = hex.replace('#', '');
    const rgb = {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
    };
    colorCache.set(hex, rgb);
    return rgb;
  }

  function rgba(hex, alpha) {
    const rgb = hexToRgb(hex);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }

  function formatPercent(value) {
    if (!Number.isFinite(value)) return '--';
    const abs = Math.abs(value);
    if (abs < 0.001) return `${(value * 10000).toFixed(2)} bp`;
    return `${(value * 100).toFixed(3)}%`;
  }

  function formatMomentum(momentum) {
    const mag = Math.hypot(momentum.x, momentum.y);
    return mag < 0.0001 ? mag.toExponential(1) : mag.toFixed(4);
  }

  function screenX(x) {
    return state.width / 2 + x * state.scale;
  }

  function screenY(y) {
    return state.height / 2 - y * state.scale;
  }

  function resizeCanvas() {
    const bounds = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    state.width = Math.max(320, Math.round(bounds.width));
    state.height = Math.max(300, Math.round(bounds.height));
    canvas.width = Math.round(state.width * ratio);
    canvas.height = Math.round(state.height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    buildStars();
    resetTrailLayer();
    draw();
  }

  function buildStars() {
    state.stars = Array.from({ length: 110 }, (_, index) => {
      const seed = Math.sin(index * 9301.17) * 10000;
      const seed2 = Math.sin(index * 49297.31) * 10000;
      return {
        x: (seed - Math.floor(seed)) * state.width,
        y: (seed2 - Math.floor(seed2)) * state.height,
        radius: 0.45 + ((index * 37) % 100) / 140,
        alpha: 0.12 + ((index * 19) % 100) / 220,
      };
    });
  }

  function resetTrails() {
    state.previousX = new Float64Array(state.sim.count);
    state.previousY = new Float64Array(state.sim.count);

    for (let i = 0; i < state.sim.count; i += 1) {
      state.previousX[i] = state.sim.x[i];
      state.previousY[i] = state.sim.y[i];
    }
    resetTrailLayer();
  }

  function resetTrailLayer() {
    const ratio = window.devicePixelRatio || 1;
    trailCanvas.width = Math.round(state.width * ratio);
    trailCanvas.height = Math.round(state.height * ratio);
    trailCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
    trailCtx.clearRect(0, 0, state.width, state.height);
  }

  function fadeTrailLayer() {
    const visibleTrail = Number(trailInput.value);
    const fadeAlpha = Math.max(0.0035, Math.min(0.075, 8 / visibleTrail));
    trailCtx.save();
    trailCtx.globalCompositeOperation = 'destination-out';
    trailCtx.fillStyle = `rgba(0, 0, 0, ${fadeAlpha})`;
    trailCtx.fillRect(0, 0, state.width, state.height);
    trailCtx.restore();
  }

  function drawLatestTrailSegments() {
    trailCtx.save();
    trailCtx.lineCap = 'round';
    trailCtx.lineJoin = 'round';

    for (let i = 0; i < state.sim.count; i += 1) {
      const color = bodyColors[i % bodyColors.length];
      trailCtx.strokeStyle = rgba(color, 0.82);
      trailCtx.lineWidth = 1;
      trailCtx.beginPath();
      trailCtx.moveTo(screenX(state.previousX[i]), screenY(state.previousY[i]));
      trailCtx.lineTo(screenX(state.sim.x[i]), screenY(state.sim.y[i]));
      trailCtx.stroke();
      state.previousX[i] = state.sim.x[i];
      state.previousY[i] = state.sim.y[i];
    }

    trailCtx.restore();
  }

  function updateLabels() {
    labels.speed.textContent = speedInput.value;
    labels.dt.textContent = Number(dtInput.value).toFixed(4);
    labels.trail.textContent = trailInput.value;
  }

  function applyTheme(theme) {
    state.theme = theme;
    root.dataset.theme = theme;
    themeButton.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
    themeButton.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
    resetTrailLayer();
    draw();
  }

  function loadPreset(key) {
    const preset = Core.presets[key];
    state.presetKey = key;
    GRAVITY_OPTIONS.softening = preset.softening ?? 0.002;
    state.sim = Core.createSimulationState(preset.bodies, GRAVITY_OPTIONS);
    state.time = 0;
    state.initialEnergy = Core.simulationEnergy(state.sim, GRAVITY_OPTIONS);
    state.initialAngular = Core.simulationAngularMomentum(state.sim);
    speedInput.value = preset.speed;
    dtInput.value = preset.dt;
    trailInput.value = preset.trail;
    state.scale = preset.scale;
    presetDescription.textContent = preset.description;
    updateLabels();
    resetTrails();
    updateStats();
    draw();
  }

  function stepSimulation() {
    const steps = Number(speedInput.value);
    const dt = Number(dtInput.value);
    const preset = Core.presets[state.presetKey];
    const maxStep = preset.maxStep ?? dt;

    for (let i = 0; i < steps; i += 1) {
      const substeps = Math.max(1, Math.ceil(dt / maxStep));
      const subDt = dt / substeps;
      for (let j = 0; j < substeps; j += 1) {
        Core.leapfrogStep(state.sim, subDt, GRAVITY_OPTIONS);
      }
      if (recenterInput.checked) Core.recenterSimulation(state.sim, GRAVITY_OPTIONS);
      state.time += dt;
    }
    fadeTrailLayer();
    drawLatestTrailSegments();
  }

  function updateStats() {
    const energy = Core.simulationEnergy(state.sim, GRAVITY_OPTIONS);
    const angular = Core.simulationAngularMomentum(state.sim);
    const momentum = Core.simulationMomentum(state.sim);
    const energyDrift = (energy - state.initialEnergy) / Math.max(1e-12, Math.abs(state.initialEnergy));
    const angularScale = Math.max(1e-12, Math.abs(state.initialAngular));
    const angularDrift = (angular - state.initialAngular) / angularScale;

    stats.time.textContent = state.time.toFixed(2);
    stats.energy.textContent = formatPercent(energyDrift);
    stats.angular.textContent = formatPercent(angularDrift);
    stats.momentum.textContent = formatMomentum(momentum);
  }

  function drawBackground(theme) {
    const gradient = ctx.createLinearGradient(0, 0, state.width, state.height);
    gradient.addColorStop(0, theme.canvasA);
    gradient.addColorStop(1, theme.canvasB);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, state.width, state.height);

    ctx.save();
    for (let i = 0; i < state.stars.length; i += 1) {
      const star = state.stars[i];
      ctx.globalAlpha = star.alpha;
      ctx.fillStyle = theme.stars;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    const centerX = state.width / 2;
    const centerY = state.height / 2;
    const maxRadius = Math.min(state.width, state.height) * 0.46;
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;

    for (let r = maxRadius / 4; r <= maxRadius; r += maxRadius / 4) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (let i = 0; i < 12; i += 1) {
      const angle = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + Math.cos(angle) * maxRadius, centerY + Math.sin(angle) * maxRadius);
      ctx.stroke();
    }

    const halo = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
    halo.addColorStop(0, theme.ring);
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, state.width, state.height);
  }

  function drawBody(index) {
    const color = bodyColors[index % bodyColors.length];
    const x = screenX(state.sim.x[index]);
    const y = screenY(state.sim.y[index]);
    const radius = 4 + Math.sqrt(state.sim.mass[index]) * 2.2;

    ctx.save();
    const orb = ctx.createRadialGradient(x - radius / 2, y - radius / 2, 1, x, y, radius * 2.4);
    orb.addColorStop(0, '#ffffff');
    orb.addColorStop(0.22, color);
    orb.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = orb;
    ctx.beginPath();
    ctx.arc(x, y, radius * 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function draw() {
    if (!state.sim) return;
    const theme = themes[state.theme];
    drawBackground(theme);
    ctx.drawImage(trailCanvas, 0, 0, state.width, state.height);

    ctx.save();
    for (let i = 0; i < state.sim.count; i += 1) {
      drawBody(i);
    }
    ctx.restore();

    ctx.fillStyle = theme.muted;
    ctx.font = '400 12px Inter, system-ui, sans-serif';
    ctx.fillText(Core.presets[state.presetKey].label, 18, state.height - 18);
  }

  function frame() {
    if (state.running) {
      stepSimulation();
      updateStats();
      draw();
    }
    requestAnimationFrame(frame);
  }

  function populatePresets() {
    Object.entries(Core.presets).forEach(([key, preset]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = preset.label;
      presetSelect.appendChild(option);
    });
  }

  function initControls() {
    presetSelect.addEventListener('change', () => loadPreset(presetSelect.value));
    themeButton.addEventListener('click', () => applyTheme(state.theme === 'dark' ? 'light' : 'dark'));
    runButton.addEventListener('click', () => {
      state.running = !state.running;
      runButton.textContent = state.running ? 'Pause' : 'Run';
      runButton.setAttribute('aria-pressed', state.running ? 'true' : 'false');
    });
    resetButton.addEventListener('click', () => loadPreset(state.presetKey));

    [speedInput, dtInput, trailInput].forEach((input) => {
      input.addEventListener('input', () => {
        updateLabels();
        if (input === trailInput) resetTrailLayer();
        draw();
      });
    });

    window.addEventListener('resize', resizeCanvas);
  }

  populatePresets();
  initControls();
  applyTheme(state.theme);
  loadPreset(state.presetKey);
  resizeCanvas();
  frame();
}());
