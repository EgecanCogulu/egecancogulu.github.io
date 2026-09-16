(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ThreeBodyCore = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DEFAULTS = {
    gravity: 1,
    softening: 0.002,
  };

  function cloneBodies(bodies) {
    return bodies.map((body) => ({ ...body }));
  }

  function createSimulationState(bodies, options = DEFAULTS) {
    const count = bodies.length;
    const state = {
      count,
      names: bodies.map((body, index) => body.name ?? `Body ${index + 1}`),
      x: new Float64Array(count),
      y: new Float64Array(count),
      vx: new Float64Array(count),
      vy: new Float64Array(count),
      mass: new Float64Array(count),
      ax: new Float64Array(count),
      ay: new Float64Array(count),
    };

    for (let i = 0; i < count; i += 1) {
      state.x[i] = bodies[i].x;
      state.y[i] = bodies[i].y;
      state.vx[i] = bodies[i].vx;
      state.vy[i] = bodies[i].vy;
      state.mass[i] = bodies[i].mass;
    }
    computeSimulationAccelerations(state, options);
    return state;
  }

  function computeSimulationAccelerations(state, options = {}) {
    const gravity = options.gravity ?? DEFAULTS.gravity;
    const softening = options.softening ?? DEFAULTS.softening;
    const softeningSquared = softening * softening;
    const { count, x, y, mass, ax, ay } = state;

    ax.fill(0);
    ay.fill(0);

    for (let i = 0; i < count; i += 1) {
      const xi = x[i];
      const yi = y[i];
      for (let j = i + 1; j < count; j += 1) {
        const dx = x[j] - xi;
        const dy = y[j] - yi;
        const distanceSquared = dx * dx + dy * dy + softeningSquared;
        const invDistance = 1 / Math.sqrt(distanceSquared);
        const invDistanceCubed = invDistance * invDistance * invDistance;
        const force = gravity * invDistanceCubed;
        const fx = force * dx;
        const fy = force * dy;

        ax[i] += mass[j] * fx;
        ay[i] += mass[j] * fy;
        ax[j] -= mass[i] * fx;
        ay[j] -= mass[i] * fy;
      }
    }
  }

  function leapfrogStep(state, dt, options = {}) {
    const { count, x, y, vx, vy, ax, ay } = state;
    const halfDt = 0.5 * dt;

    for (let i = 0; i < count; i += 1) {
      vx[i] += ax[i] * halfDt;
      vy[i] += ay[i] * halfDt;
      x[i] += vx[i] * dt;
      y[i] += vy[i] * dt;
    }

    computeSimulationAccelerations(state, options);

    for (let i = 0; i < count; i += 1) {
      vx[i] += ax[i] * halfDt;
      vy[i] += ay[i] * halfDt;
    }
  }

  function simulationMomentum(state) {
    let xMomentum = 0;
    let yMomentum = 0;
    for (let i = 0; i < state.count; i += 1) {
      xMomentum += state.mass[i] * state.vx[i];
      yMomentum += state.mass[i] * state.vy[i];
    }
    return { x: xMomentum, y: yMomentum };
  }

  function recenterSimulation(state, options = DEFAULTS) {
    let massSum = 0;
    let cx = 0;
    let cy = 0;
    let cvx = 0;
    let cvy = 0;

    for (let i = 0; i < state.count; i += 1) {
      const m = state.mass[i];
      massSum += m;
      cx += m * state.x[i];
      cy += m * state.y[i];
      cvx += m * state.vx[i];
      cvy += m * state.vy[i];
    }

    cx /= massSum;
    cy /= massSum;
    cvx /= massSum;
    cvy /= massSum;

    for (let i = 0; i < state.count; i += 1) {
      state.x[i] -= cx;
      state.y[i] -= cy;
      state.vx[i] -= cvx;
      state.vy[i] -= cvy;
    }

    computeSimulationAccelerations(state, options);
  }

  function simulationEnergy(state, options = {}) {
    const gravity = options.gravity ?? DEFAULTS.gravity;
    const softening = options.softening ?? DEFAULTS.softening;
    let kinetic = 0;
    let potential = 0;

    for (let i = 0; i < state.count; i += 1) {
      kinetic += 0.5 * state.mass[i] * (state.vx[i] * state.vx[i] + state.vy[i] * state.vy[i]);
      for (let j = i + 1; j < state.count; j += 1) {
        const dx = state.x[j] - state.x[i];
        const dy = state.y[j] - state.y[i];
        const distance = Math.sqrt(dx * dx + dy * dy + softening * softening);
        potential -= gravity * state.mass[i] * state.mass[j] / distance;
      }
    }

    return kinetic + potential;
  }

  function simulationAngularMomentum(state) {
    let angular = 0;
    for (let i = 0; i < state.count; i += 1) {
      angular += state.mass[i] * (state.x[i] * state.vy[i] - state.y[i] * state.vx[i]);
    }
    return angular;
  }

  function totalMass(bodies) {
    return bodies.reduce((sum, body) => sum + body.mass, 0);
  }

  function totalMomentum(bodies) {
    return bodies.reduce(
      (sum, body) => ({
        x: sum.x + body.mass * body.vx,
        y: sum.y + body.mass * body.vy,
      }),
      { x: 0, y: 0 },
    );
  }

  function centerOfMass(bodies) {
    const mass = totalMass(bodies);
    const accum = bodies.reduce(
      (sum, body) => ({
        x: sum.x + body.mass * body.x,
        y: sum.y + body.mass * body.y,
        vx: sum.vx + body.mass * body.vx,
        vy: sum.vy + body.mass * body.vy,
      }),
      { x: 0, y: 0, vx: 0, vy: 0 },
    );

    return {
      x: accum.x / mass,
      y: accum.y / mass,
      vx: accum.vx / mass,
      vy: accum.vy / mass,
    };
  }

  function normalizeFrame(bodies) {
    const center = centerOfMass(bodies);
    return bodies.map((body) => ({
      ...body,
      x: body.x - center.x,
      y: body.y - center.y,
      vx: body.vx - center.vx,
      vy: body.vy - center.vy,
    }));
  }

  function computeAccelerations(bodies, options = {}) {
    const gravity = options.gravity ?? DEFAULTS.gravity;
    const softening = options.softening ?? DEFAULTS.softening;
    const softeningSquared = softening * softening;
    const accelerations = bodies.map(() => ({ ax: 0, ay: 0 }));

    for (let i = 0; i < bodies.length; i += 1) {
      for (let j = i + 1; j < bodies.length; j += 1) {
        const dx = bodies[j].x - bodies[i].x;
        const dy = bodies[j].y - bodies[i].y;
        const distanceSquared = dx * dx + dy * dy + softeningSquared;
        const invDistanceCubed = 1 / (distanceSquared * Math.sqrt(distanceSquared));
        const force = gravity * invDistanceCubed;

        accelerations[i].ax += force * bodies[j].mass * dx;
        accelerations[i].ay += force * bodies[j].mass * dy;
        accelerations[j].ax -= force * bodies[i].mass * dx;
        accelerations[j].ay -= force * bodies[i].mass * dy;
      }
    }

    return accelerations;
  }

  function derivative(bodies, options) {
    const accelerations = computeAccelerations(bodies, options);
    return bodies.map((body, index) => ({
      dx: body.vx,
      dy: body.vy,
      dvx: accelerations[index].ax,
      dvy: accelerations[index].ay,
    }));
  }

  function addScaled(base, delta, scale) {
    return base.map((body, index) => ({
      ...body,
      x: body.x + delta[index].dx * scale,
      y: body.y + delta[index].dy * scale,
      vx: body.vx + delta[index].dvx * scale,
      vy: body.vy + delta[index].dvy * scale,
    }));
  }

  function rk4Step(bodies, dt, options = {}) {
    const k1 = derivative(bodies, options);
    const k2 = derivative(addScaled(bodies, k1, dt / 2), options);
    const k3 = derivative(addScaled(bodies, k2, dt / 2), options);
    const k4 = derivative(addScaled(bodies, k3, dt), options);

    return bodies.map((body, index) => ({
      ...body,
      x: body.x + (dt / 6) * (k1[index].dx + 2 * k2[index].dx + 2 * k3[index].dx + k4[index].dx),
      y: body.y + (dt / 6) * (k1[index].dy + 2 * k2[index].dy + 2 * k3[index].dy + k4[index].dy),
      vx: body.vx + (dt / 6) * (k1[index].dvx + 2 * k2[index].dvx + 2 * k3[index].dvx + k4[index].dvx),
      vy: body.vy + (dt / 6) * (k1[index].dvy + 2 * k2[index].dvy + 2 * k3[index].dvy + k4[index].dvy),
    }));
  }

  function totalEnergy(bodies, options = {}) {
    const gravity = options.gravity ?? DEFAULTS.gravity;
    const softening = options.softening ?? DEFAULTS.softening;
    let kinetic = 0;
    let potential = 0;

    for (let i = 0; i < bodies.length; i += 1) {
      kinetic += 0.5 * bodies[i].mass * (bodies[i].vx * bodies[i].vx + bodies[i].vy * bodies[i].vy);
      for (let j = i + 1; j < bodies.length; j += 1) {
        const dx = bodies[j].x - bodies[i].x;
        const dy = bodies[j].y - bodies[i].y;
        const distance = Math.sqrt(dx * dx + dy * dy + softening * softening);
        potential -= gravity * bodies[i].mass * bodies[j].mass / distance;
      }
    }

    return kinetic + potential;
  }

  function angularMomentum(bodies) {
    return bodies.reduce(
      (sum, body) => sum + body.mass * (body.x * body.vy - body.y * body.vx),
      0,
    );
  }

  function withFrameNormalized(bodyList) {
    return normalizeFrame(bodyList).map((body, index) => ({
      ...body,
      name: body.name ?? `Body ${index + 1}`,
    }));
  }

  function equalMassCollinearOrbit(vx, vy, names) {
    return withFrameNormalized([
      { name: names[0], mass: 1, x: -1, y: 0, vx, vy },
      { name: names[1], mass: 1, x: 1, y: 0, vx, vy },
      { name: names[2], mass: 1, x: 0, y: 0, vx: -2 * vx, vy: -2 * vy },
    ]);
  }

  function lagrangeBodies() {
    return lagrangeBodiesWithRadius(1.15, ['Astra', 'Boreal', 'Cygnus']);
  }

  function lagrangeBodiesWithRadius(radius, names) {
    const omega = Math.sqrt(1 / (Math.sqrt(3) * radius * radius * radius));
    return [0, 1, 2].map((index) => {
      const angle = index * (2 * Math.PI / 3);
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      return {
        name: names[index],
        mass: 1,
        x,
        y,
        vx: -omega * y,
        vy: omega * x,
      };
    });
  }

  function eulerCollinearBodies(radius, names) {
    const speed = Math.sqrt(1.25);
    return withFrameNormalized([
      { name: names[0], mass: 1, x: -radius, y: 0, vx: 0, vy: -speed / Math.sqrt(radius) },
      { name: names[1], mass: 1, x: 0, y: 0, vx: 0, vy: 0 },
      { name: names[2], mass: 1, x: radius, y: 0, vx: 0, vy: speed / Math.sqrt(radius) },
    ]);
  }

  function hierarchicalBodies() {
    const binaryRadius = 0.52;
    const binarySeparation = binaryRadius * 2;
    const binaryOmega = Math.sqrt(2 / (binarySeparation * binarySeparation * binarySeparation));
    const outerRadius = 3.35;
    const outerMass = 0.22;
    const outerSpeed = Math.sqrt((2 + outerMass) / outerRadius);

    return [
      { name: 'Inner A', mass: 1, x: -binaryRadius, y: 0, vx: 0, vy: -binaryOmega * binaryRadius },
      { name: 'Inner B', mass: 1, x: binaryRadius, y: 0, vx: 0, vy: binaryOmega * binaryRadius },
      { name: 'Outer C', mass: outerMass, x: 0, y: outerRadius, vx: -outerSpeed, vy: 0 },
    ];
  }

  const presets = {
    figureEight: {
      label: 'Figure-eight choreography',
      description: 'Three equal masses share one looping curve with zero total angular momentum.',
      dt: 0.002,
      speed: 5,
      scale: 150,
      trail: 500,
      bodies: withFrameNormalized([
        { name: 'One', mass: 1, x: -0.97000436, y: 0.24308753, vx: 0.466203685, vy: 0.43236573 },
        { name: 'Two', mass: 1, x: 0.97000436, y: -0.24308753, vx: 0.466203685, vy: 0.43236573 },
        { name: 'Three', mass: 1, x: 0, y: 0, vx: -0.93240737, vy: -0.86473146 },
      ]),
    },
    lagrange: {
      label: 'Lagrange triangle',
      description: 'An equilateral central configuration rotating as a rigid triangle.',
      dt: 0.002,
      speed: 5,
      scale: 130,
      trail: 500,
      bodies: withFrameNormalized(lagrangeBodies()),
    },
    eulerCollinear: {
      label: 'Euler collinear rotation',
      description: 'Three equal masses stay on one rotating line: the center mass sits between two equal outer bodies.',
      dt: 0.002,
      speed: 5,
      scale: 145,
      trail: 500,
      bodies: eulerCollinearBodies(1, ['Outer A', 'Center', 'Outer B']),
    },
    brouckeA1: {
      label: 'Broucke A1',
      description: 'A looping binary and a third body weave a broad, flattened orbit.',
      source: 'https://www.threebodyorbits.com/orbit/broucke_broucke_a_1',
      period: 6.283210286711399,
      softening: 0,
      maxStep: 0.0002,
      dt: 0.002,
      speed: 5,
      scale: 85,
      trail: 500,
      // Refined initial conditions from the atlas; trajectories are integrated live.
      bodies: withFrameNormalized([
        { name: 'One', mass: 1, x: -0.9892646277064892, y: 0.000024662886418756747, vx: -0.0002390610396954478, vy: 1.9169218514423296 },
        { name: 'Two', mass: 1, x: 2.20962358039321, y: 0.0000023386048597951686, vx: -0.000002336175087723179, vy: 0.19102662047856678 },
        { name: 'Three', mass: 1, x: -1.2203589526867211, y: -0.000027001491278551915, vx: 0.00024139721478317098, vy: -2.1079484719208965 },
      ]),
    },
    moth: {
      label: 'Moth IVa.2.A',
      description: 'Three equal masses trace interlaced wings and small turning loops.',
      source: 'https://www.threebodyorbits.com/orbit/iva_moth_iva_2_a',
      period: 14.894305175042124,
      softening: 0,
      maxStep: 0.0001,
      dt: 0.002,
      speed: 5,
      scale: 145,
      trail: 500,
      bodies: equalMassCollinearOrbit(0.4644451728180667, 0.39606001465281476, ['One', 'Two', 'Three']),
    },
  };

  return {
    angularMomentum,
    centerOfMass,
    cloneBodies,
    computeAccelerations,
    computeSimulationAccelerations,
    createSimulationState,
    leapfrogStep,
    normalizeFrame,
    presets,
    recenterSimulation,
    rk4Step,
    simulationAngularMomentum,
    simulationEnergy,
    simulationMomentum,
    totalEnergy,
    totalMass,
    totalMomentum,
  };
}));
