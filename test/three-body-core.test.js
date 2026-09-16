const assert = require('node:assert/strict');

const {
  computeAccelerations,
  centerOfMass,
  cloneBodies,
  createSimulationState,
  leapfrogStep,
  presets,
  recenterSimulation,
  simulationMomentum,
  simulationEnergy,
  totalMomentum,
} = require('../assets/js/three-body-core.js');

function closeTo(actual, expected, tolerance = 1e-10) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

function runTest(name, fn) {
  fn();
  return name;
}

const completed = [];

completed.push(runTest('computeAccelerations applies equal and opposite forces for a two-body pair', () => {
  const bodies = [
    { mass: 1, x: -1, y: 0, vx: 0, vy: 0 },
    { mass: 1, x: 1, y: 0, vx: 0, vy: 0 },
  ];

  const accelerations = computeAccelerations(bodies, { gravity: 1, softening: 0 });

  closeTo(accelerations[0].ax, 0.25);
  closeTo(accelerations[1].ax, -0.25);
  closeTo(accelerations[0].ay, 0);
  closeTo(accelerations[1].ay, 0);
}));

completed.push(runTest('computeAccelerations has zero net momentum derivative for isolated bodies', () => {
  const bodies = [
    { mass: 1.4, x: -0.8, y: 0.2, vx: 0, vy: 0 },
    { mass: 0.9, x: 0.7, y: -0.1, vx: 0, vy: 0 },
    { mass: 1.2, x: 0.1, y: 1.1, vx: 0, vy: 0 },
  ];

  const accelerations = computeAccelerations(bodies, { gravity: 0.8, softening: 0.01 });
  const net = accelerations.reduce(
    (sum, accel, index) => ({
      x: sum.x + bodies[index].mass * accel.ax,
      y: sum.y + bodies[index].mass * accel.ay,
    }),
    { x: 0, y: 0 },
  );

  closeTo(net.x, 0, 1e-12);
  closeTo(net.y, 0, 1e-12);
}));

completed.push(runTest('createSimulationState stores bodies in typed arrays for hot-loop simulation', () => {
  const sim = createSimulationState(presets.figureEight.bodies);

  assert.equal(sim.count, 3);
  assert.ok(sim.x instanceof Float64Array);
  assert.ok(sim.y instanceof Float64Array);
  assert.ok(sim.vx instanceof Float64Array);
  assert.ok(sim.vy instanceof Float64Array);
  assert.ok(sim.mass instanceof Float64Array);
  closeTo(sim.x[0], presets.figureEight.bodies[0].x);
  closeTo(sim.vy[2], presets.figureEight.bodies[2].vy);
}));

completed.push(runTest('leapfrogStep mutates typed-array state and preserves total momentum', () => {
  const sim = createSimulationState(presets.figureEight.bodies);
  const before = simulationMomentum(sim);
  const xArray = sim.x;

  leapfrogStep(sim, 0.005, { gravity: 1, softening: 0.002 });
  const after = simulationMomentum(sim);

  assert.equal(sim.x, xArray);
  assert.notEqual(sim.x[0], presets.figureEight.bodies[0].x);
  closeTo(after.x, before.x, 1e-12);
  closeTo(after.y, before.y, 1e-12);
}));

completed.push(runTest('recenterSimulation pins the center of mass without changing internal geometry', () => {
  const sim = createSimulationState(presets.eulerCollinear.bodies);
  leapfrogStep(sim, 0.01, { gravity: 1, softening: 0.002 });
  const beforeDistance = Math.hypot(sim.x[1] - sim.x[0], sim.y[1] - sim.y[0]);

  recenterSimulation(sim);
  const afterDistance = Math.hypot(sim.x[1] - sim.x[0], sim.y[1] - sim.y[0]);
  const momentum = simulationMomentum(sim);
  let cx = 0;
  let cy = 0;
  let mass = 0;
  for (let i = 0; i < sim.count; i += 1) {
    cx += sim.mass[i] * sim.x[i];
    cy += sim.mass[i] * sim.y[i];
    mass += sim.mass[i];
  }

  closeTo(cx / mass, 0, 1e-12);
  closeTo(cy / mass, 0, 1e-12);
  closeTo(momentum.x, 0, 1e-12);
  closeTo(momentum.y, 0, 1e-12);
  closeTo(afterDistance, beforeDistance, 1e-12);
}));

completed.push(runTest('periodic preset list excludes fragile named orbit families', () => {
  assert.equal(Object.hasOwn(presets, 'closePass'), false);
  assert.equal(Object.hasOwn(presets, 'butterflyI'), false);
  assert.equal(Object.hasOwn(presets, 'goggles'), false);
  assert.equal(Object.hasOwn(presets, 'dragonfly'), false);
}));

completed.push(runTest('simple closed-orbit presets are available for live simulation', () => {
  assert.equal(Object.hasOwn(presets, 'eulerCollinear'), true);
  ['wideEuler', 'compactEuler', 'wideLagrange', 'compactLagrange'].forEach((key) => {
    assert.equal(Object.hasOwn(presets, key), false);
  });
  assert.ok(presets.brouckeA1);
  assert.ok(presets.moth);
  assert.equal(Object.hasOwn(presets, 'hierarchical'), false);
  assert.equal(Object.hasOwn(presets, 'nestedBinary'), false);
}));

completed.push(runTest('simple closed-orbit presets keep conservative defaults', () => {
  Object.keys(presets).forEach((key) => {
    closeTo(presets[key].speed * presets[key].dt, 0.01, 1e-12);
    assert.equal(presets[key].trail, 500);
  });
}));

completed.push(runTest('atlas orbits close and conserve energy over twenty live periods', () => {
  for (const key of ['brouckeA1', 'moth']) {
    const preset = presets[key];
    const options = { gravity: 1, softening: preset.softening };
    const sim = createSimulationState(preset.bodies, options);
    const energy = simulationEnergy(sim, options);
    const steps = Math.ceil(preset.period / preset.maxStep);
    const dt = preset.period / steps;
    for (let period = 0; period < 20; period += 1) {
      for (let step = 0; step < steps; step += 1) {
        leapfrogStep(sim, dt, options);
        if (step % 10 === 0) {
          recenterSimulation(sim, options);
          assert.ok(Math.abs((simulationEnergy(sim, options) - energy) / energy) < 0.0001, `${key}: energy drift`);
        }
      }
      preset.bodies.forEach((body, i) => {
        assert.ok(Math.hypot(sim.x[i] - body.x, sim.y[i] - body.y) < 0.003, `${key}: position closure`);
        assert.ok(Math.hypot(sim.vx[i] - body.vx, sim.vy[i] - body.vy) < 0.03, `${key}: velocity closure`);
      });
    }
  }
}));

module.exports = { completed };
