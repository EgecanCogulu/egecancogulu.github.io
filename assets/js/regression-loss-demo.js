(() => {
  const fixedNoise = [
    -0.28, 0.36, -0.12, 0.48, -0.43, 0.19, 0.33, -0.51, 0.08, 0.29,
    -0.37, 0.41, -0.18, 0.14, -0.34, 0.45, -0.08, 0.24, -0.22, 0.31,
  ];

  let sharedPoints = [];
  const demos = [];

  function map(value, sourceMin, sourceMax, targetMin, targetMax) {
    return targetMin + (value - sourceMin) / (sourceMax - sourceMin) * (targetMax - targetMin);
  }

  function gaussianNoise() {
    const u = Math.max(Math.random(), 1e-9);
    const v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * 0.34;
  }

  function makePoints(randomize = false) {
    return Array.from({ length: 20 }, (_, index) => {
      const x = 0.04 + index * (0.92 / 19);
      const noise = randomize ? gaussianNoise() : fixedNoise[index];
      return { x, y: 1.65 + 4.25 * x + noise };
    });
  }

  function calculateFit(points) {
    const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
    const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
    const numerator = points.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0);
    const denominator = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
    const slope = numerator / denominator;
    const intercept = meanY - slope * meanX;
    return { slope, intercept };
  }

  function meanSquaredError(points, slope, intercept) {
    return points.reduce((sum, point) => {
      const residual = point.y - (intercept + slope * point.x);
      return sum + residual * residual;
    }, 0) / points.length;
  }

  function drawAxes(ctx, bounds, xTicks, yTicks, xLabel, yLabel) {
    const { left, right, top, bottom } = bounds;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, bottom);
    ctx.lineTo(right, bottom);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '11px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    xTicks.forEach(tick => {
      const x = map(tick.value, tick.min, tick.max, left, right);
      ctx.strokeStyle = '#eef2f7';
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.fillText(tick.label, x, bottom + 18);
    });

    ctx.textAlign = 'right';
    yTicks.forEach(tick => {
      const y = map(tick.value, tick.min, tick.max, bottom, top);
      ctx.strokeStyle = '#eef2f7';
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.fillText(tick.label, left - 8, y + 4);
    });

    ctx.fillStyle = '#475569';
    ctx.textAlign = 'center';
    ctx.font = '12px Inter, Arial, sans-serif';
    ctx.fillText(xLabel, (left + right) / 2, bottom + 38);
    ctx.save();
    ctx.translate(15, (top + bottom) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
  }

  function surfaceColor(value, alpha = 1) {
    const hue = 205 - value * 178;
    const lightness = 58 + value * 5;
    return `hsla(${hue}, 76%, ${lightness}%, ${alpha})`;
  }

  class RegressionDemo {
    constructor(root) {
      this.root = root;
      this.mode = root.dataset.mode;
      this.dataCanvas = root.querySelector('[data-canvas="data"]');
      this.dataCtx = this.dataCanvas.getContext('2d');
      this.lossCanvas = root.querySelector('[data-canvas="loss"]');
      this.lossCtx = this.lossCanvas.getContext('2d');
      this.lossTitle = root.querySelector('[data-role="loss-title"]');
      this.slopeSlider = root.querySelector('[data-role="slope-slider"]');
      this.interceptSlider = root.querySelector('[data-role="intercept-slider"]');
      this.slopeValue = root.querySelector('[data-role="slope-value"]');
      this.interceptValue = root.querySelector('[data-role="intercept-value"]');
      this.equationValue = root.querySelector('[data-role="equation"]');
      this.currentMseValue = root.querySelector('[data-role="current-mse"]');
      this.minimumMseValue = root.querySelector('[data-role="minimum-mse"]');
      this.gapValue = root.querySelector('[data-role="mse-gap"]');
      this.surfaceView = 'surface';
      this.camera = { yaw: -Math.PI / 4, pitch: Math.PI / 4, zoom: 1.15 };
      this.dragState = null;

      if (this.slopeSlider) {
        this.slopeSlider.addEventListener('input', () => {
          this.slope = Number(this.slopeSlider.value);
          this.render();
        });
      }

      if (this.interceptSlider) {
        this.interceptSlider.addEventListener('input', () => {
          this.intercept = Number(this.interceptSlider.value);
          this.render();
        });
      }

      root.querySelector('[data-action="reset"]').addEventListener('click', () => this.reset());
      root.querySelector('[data-action="best-fit"]').addEventListener('click', () => this.showBestFit());
      root.querySelector('[data-action="new-data"]').addEventListener('click', () => refreshSharedData(true));

      root.querySelectorAll('[data-view]').forEach(button => {
        button.addEventListener('click', () => {
          this.surfaceView = button.dataset.view;
          root.querySelectorAll('[data-view]').forEach(item => {
            item.classList.toggle('active', item.dataset.view === this.surfaceView);
          });
          this.lossTitle.textContent = this.surfaceView === 'surface' ? 'Error surface' : 'Error contours';
          this.updateSurfaceInteractionState();
          this.render();
        });
      });

      const resetViewButton = root.querySelector('[data-action="reset-view"]');
      if (resetViewButton) {
        resetViewButton.addEventListener('click', () => this.resetCamera());
      }

      if (this.mode === 'both') this.attachSurfaceInteraction();
    }

    setData(points) {
      this.points = points;
      const fit = calculateFit(points);
      this.bestSlope = fit.slope;
      this.bestIntercept = fit.intercept;
      this.bestMse = meanSquaredError(points, fit.slope, fit.intercept);
      this.slopeMin = fit.slope - 3.6;
      this.slopeMax = fit.slope + 3.6;
      this.interceptMin = fit.intercept - 2.8;
      this.interceptMax = fit.intercept + 2.8;

      if (this.slopeSlider) {
        this.slopeSlider.min = this.slopeMin;
        this.slopeSlider.max = this.slopeMax;
        this.slopeSlider.step = 0.01;
      }

      if (this.interceptSlider) {
        this.interceptSlider.min = this.interceptMin;
        this.interceptSlider.max = this.interceptMax;
        this.interceptSlider.step = 0.01;
      }

      this.reset();
    }

    reset() {
      if (this.mode === 'slope') {
        this.initialSlope = this.bestSlope - 2.25;
        this.initialIntercept = this.bestIntercept;
      } else if (this.mode === 'intercept') {
        this.initialSlope = this.bestSlope;
        this.initialIntercept = this.bestIntercept + 2.1;
      } else {
        this.initialSlope = this.bestSlope - 1.9;
        this.initialIntercept = this.bestIntercept + 1.8;
      }
      this.slope = this.initialSlope;
      this.intercept = this.initialIntercept;
      this.syncControls();
      this.render();
    }

    showBestFit() {
      this.slope = this.bestSlope;
      this.intercept = this.bestIntercept;
      this.syncControls();
      this.render();
    }

    resetCamera() {
      this.camera = { yaw: -Math.PI / 4, pitch: Math.PI / 4, zoom: 1.15 };
      if (this.mode === 'both' && this.surfaceView === 'surface') this.drawSurface();
    }

    updateSurfaceInteractionState() {
      const rotatable = this.mode === 'both' && this.surfaceView === 'surface';
      this.lossCanvas.classList.toggle('rotatable-surface', rotatable);
      this.lossCanvas.style.touchAction = rotatable ? 'none' : 'auto';
    }

    attachSurfaceInteraction() {
      this.updateSurfaceInteractionState();

      this.lossCanvas.addEventListener('pointerdown', event => {
        if (this.surfaceView !== 'surface') return;
        this.lossCanvas.setPointerCapture(event.pointerId);
        this.dragState = {
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
        };
        this.lossCanvas.classList.add('dragging-surface');
      });

      this.lossCanvas.addEventListener('pointermove', event => {
        if (!this.dragState || this.dragState.pointerId !== event.pointerId || this.surfaceView !== 'surface') return;
        const deltaX = event.clientX - this.dragState.x;
        const deltaY = event.clientY - this.dragState.y;
        this.dragState.x = event.clientX;
        this.dragState.y = event.clientY;
        this.camera.yaw += deltaX * 0.012;
        this.camera.pitch = Math.min(1.35, Math.max(0.18, this.camera.pitch + deltaY * 0.009));
        this.drawSurface();
      });

      const endDrag = event => {
        if (!this.dragState || this.dragState.pointerId !== event.pointerId) return;
        this.dragState = null;
        this.lossCanvas.classList.remove('dragging-surface');
      };
      this.lossCanvas.addEventListener('pointerup', endDrag);
      this.lossCanvas.addEventListener('pointercancel', endDrag);

      this.lossCanvas.addEventListener('wheel', event => {
        if (this.surfaceView !== 'surface') return;
        event.preventDefault();
        const direction = event.deltaY > 0 ? 0.92 : 1.08;
        this.camera.zoom = Math.min(1.65, Math.max(0.72, this.camera.zoom * direction));
        this.drawSurface();
      }, { passive: false });

      this.lossCanvas.addEventListener('dblclick', () => {
        if (this.surfaceView === 'surface') this.resetCamera();
      });
    }

    syncControls() {
      if (this.slopeSlider) this.slopeSlider.value = this.slope;
      if (this.interceptSlider) this.interceptSlider.value = this.intercept;
    }

    loss(slope, intercept) {
      return meanSquaredError(this.points, slope, intercept);
    }

    render() {
      this.drawDataSpace();
      if (this.mode === 'slope') this.drawLossCurve('slope');
      else if (this.mode === 'intercept') this.drawLossCurve('intercept');
      else if (this.surfaceView === 'surface') this.drawSurface();
      else this.drawContours();
      this.updateStats();
    }

    drawDataSpace() {
      const ctx = this.dataCtx;
      const width = this.dataCanvas.width;
      const height = this.dataCanvas.height;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      const bounds = { left: 58, right: width - 22, top: 22, bottom: height - 52 };
      const dataYMin = Math.min(...this.points.map(point => point.y));
      const dataYMax = Math.max(...this.points.map(point => point.y));
      const yMin = Math.floor(dataYMin - 1.2);
      const yMax = Math.ceil(dataYMax + 1.2);
      const xTicks = [0, 0.25, 0.5, 0.75, 1].map(value => ({
        value, min: 0, max: 1, label: value.toFixed(value === 0 || value === 1 ? 0 : 2),
      }));
      const yTicks = Array.from({ length: 5 }, (_, index) => {
        const value = yMin + index * (yMax - yMin) / 4;
        return { value, min: yMin, max: yMax, label: value.toFixed(1) };
      });
      drawAxes(ctx, bounds, xTicks, yTicks, 'Feature x', 'Outcome y');

      const px = value => map(value, 0, 1, bounds.left, bounds.right);
      const py = value => map(value, yMin, yMax, bounds.bottom, bounds.top);
      ctx.save();
      ctx.beginPath();
      ctx.rect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
      ctx.clip();

      ctx.strokeStyle = 'rgba(220, 38, 38, 0.55)';
      ctx.lineWidth = 1.4;
      this.points.forEach(point => {
        const prediction = this.intercept + this.slope * point.x;
        ctx.beginPath();
        ctx.moveTo(px(point.x), py(point.y));
        ctx.lineTo(px(point.x), py(prediction));
        ctx.stroke();
      });

      ctx.setLineDash([7, 6]);
      ctx.strokeStyle = 'rgba(15, 118, 110, 0.65)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px(0), py(this.bestIntercept));
      ctx.lineTo(px(1), py(this.bestIntercept + this.bestSlope));
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px(0), py(this.intercept));
      ctx.lineTo(px(1), py(this.intercept + this.slope));
      ctx.stroke();

      this.points.forEach(point => {
        ctx.beginPath();
        ctx.arc(px(point.x), py(point.y), 4.2, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      });
      ctx.restore();

      ctx.font = '11px Inter, Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#0284c7';
      ctx.fillText('Current line', bounds.left + 8, bounds.top + 15);
      ctx.fillStyle = '#0f766e';
      ctx.fillText('Dashed: best fit', bounds.left + 90, bounds.top + 15);
    }

    drawLossCurve(parameter) {
      const ctx = this.lossCtx;
      const width = this.lossCanvas.width;
      const height = this.lossCanvas.height;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      const isSlope = parameter === 'slope';
      const parameterMin = isSlope ? this.slopeMin : this.interceptMin;
      const parameterMax = isSlope ? this.slopeMax : this.interceptMax;
      const currentParameter = isSlope ? this.slope : this.intercept;
      const samples = Array.from({ length: 181 }, (_, index) => {
        const value = parameterMin + index / 180 * (parameterMax - parameterMin);
        const mse = isSlope
          ? this.loss(value, this.bestIntercept)
          : this.loss(this.bestSlope, value);
        return { value, mse };
      });
      const curveMin = Math.min(...samples.map(sample => sample.mse));
      const curveMax = Math.max(...samples.map(sample => sample.mse));
      const yMax = curveMax * 1.08;
      const bounds = { left: 62, right: width - 24, top: 24, bottom: height - 52 };
      const xTicks = Array.from({ length: 5 }, (_, index) => {
        const value = parameterMin + index * (parameterMax - parameterMin) / 4;
        return { value, min: parameterMin, max: parameterMax, label: value.toFixed(1) };
      });
      const yTicks = Array.from({ length: 5 }, (_, index) => {
        const value = index * yMax / 4;
        return { value, min: 0, max: yMax, label: value.toFixed(1) };
      });
      drawAxes(ctx, bounds, xTicks, yTicks, isSlope ? 'Slope, b₁' : 'Intercept, b₀', 'Mean squared error');

      const px = value => map(value, parameterMin, parameterMax, bounds.left, bounds.right);
      const py = value => map(value, 0, yMax, bounds.bottom, bounds.top);
      ctx.beginPath();
      samples.forEach((sample, index) => {
        if (index === 0) ctx.moveTo(px(sample.value), py(sample.mse));
        else ctx.lineTo(px(sample.value), py(sample.mse));
      });
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 3;
      ctx.stroke();

      const optimalParameter = isSlope ? this.bestSlope : this.bestIntercept;
      ctx.beginPath();
      ctx.arc(px(optimalParameter), py(curveMin), 6, 0, Math.PI * 2);
      ctx.fillStyle = '#0f766e';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      const currentLoss = isSlope
        ? this.loss(currentParameter, this.bestIntercept)
        : this.loss(this.bestSlope, currentParameter);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(234, 88, 12, 0.45)';
      ctx.beginPath();
      ctx.moveTo(px(currentParameter), bounds.bottom);
      ctx.lineTo(px(currentParameter), py(currentLoss));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(px(currentParameter), py(currentLoss), 7, 0, Math.PI * 2);
      ctx.fillStyle = '#ea580c';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#0f766e';
      ctx.font = '11px Inter, Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Minimum', px(optimalParameter) + 10, py(curveMin) - 8);
    }

    lossScale() {
      const corners = [
        this.loss(this.slopeMin, this.interceptMin),
        this.loss(this.slopeMin, this.interceptMax),
        this.loss(this.slopeMax, this.interceptMin),
        this.loss(this.slopeMax, this.interceptMax),
      ];
      return Math.max(...corners) - this.bestMse;
    }

    normalizedLoss(slope, intercept) {
      return Math.min(1, Math.max(0, (this.loss(slope, intercept) - this.bestMse) / this.lossScale()));
    }

    drawSurface() {
      const ctx = this.lossCtx;
      const width = this.lossCanvas.width;
      const height = this.lossCanvas.height;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      const centerX = width * 0.51;
      const centerY = height * 0.63;
      const scale = 112 * this.camera.zoom;
      const verticalScale = 1.3;
      const gridSize = 22;
      const project = (slope, intercept, z) => {
        const u = map(slope, this.slopeMin, this.slopeMax, -1, 1);
        const v = map(intercept, this.interceptMin, this.interceptMax, -1, 1);
        const worldZ = z * verticalScale;
        const cosYaw = Math.cos(this.camera.yaw);
        const sinYaw = Math.sin(this.camera.yaw);
        const xRotated = u * cosYaw - v * sinYaw;
        const yRotated = u * sinYaw + v * cosYaw;
        const cosPitch = Math.cos(this.camera.pitch);
        const sinPitch = Math.sin(this.camera.pitch);
        const screenY = yRotated * cosPitch - worldZ * sinPitch;
        const depth = yRotated * sinPitch + worldZ * cosPitch;
        return {
          x: centerX + xRotated * scale,
          y: centerY + screenY * scale,
          depth,
        };
      };

      const cells = [];
      for (let row = 0; row < gridSize; row++) {
        for (let column = 0; column < gridSize; column++) {
          const m0 = this.slopeMin + column / gridSize * (this.slopeMax - this.slopeMin);
          const m1 = this.slopeMin + (column + 1) / gridSize * (this.slopeMax - this.slopeMin);
          const b0 = this.interceptMin + row / gridSize * (this.interceptMax - this.interceptMin);
          const b1 = this.interceptMin + (row + 1) / gridSize * (this.interceptMax - this.interceptMin);
          const corners = [
            { m: m0, b: b0 }, { m: m1, b: b0 },
            { m: m1, b: b1 }, { m: m0, b: b1 },
          ].map(point => ({ ...point, z: this.normalizedLoss(point.m, point.b) }));
          const projected = corners.map(point => project(point.m, point.b, point.z));
          cells.push({
            corners,
            projected,
            depth: projected.reduce((sum, point) => sum + point.depth, 0) / 4,
            z: corners.reduce((sum, point) => sum + point.z, 0) / 4,
          });
        }
      }

      cells.sort((a, b) => a.depth - b.depth);
      cells.forEach(cell => {
        const projected = cell.projected;
        ctx.beginPath();
        ctx.moveTo(projected[0].x, projected[0].y);
        projected.slice(1).forEach(point => ctx.lineTo(point.x, point.y));
        ctx.closePath();
        ctx.fillStyle = surfaceColor(cell.z, 0.88);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.26)';
        ctx.lineWidth = 0.55;
        ctx.stroke();
      });

      const optimum = project(this.bestSlope, this.bestIntercept, 0);
      ctx.beginPath();
      ctx.arc(optimum.x, optimum.y, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = '#0f766e';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      const currentZ = this.normalizedLoss(this.slope, this.intercept);
      const current = project(this.slope, this.intercept, currentZ);
      ctx.beginPath();
      ctx.arc(current.x, current.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#ea580c';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      const slopeEnd = project(this.slopeMax, this.interceptMin, 0);
      const interceptEnd = project(this.slopeMin, this.interceptMax, 0);
      const axisOrigin = project(this.slopeMin, this.interceptMin, 0);
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.7)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(axisOrigin.x, axisOrigin.y);
      ctx.lineTo(slopeEnd.x, slopeEnd.y);
      ctx.moveTo(axisOrigin.x, axisOrigin.y);
      ctx.lineTo(interceptEnd.x, interceptEnd.y);
      ctx.stroke();
      ctx.fillStyle = '#475569';
      ctx.font = '12px Inter, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Slope, b₁', slopeEnd.x + 28, slopeEnd.y + 22);
      ctx.fillText('Intercept, b₀', interceptEnd.x - 38, interceptEnd.y + 20);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ea580c';
      ctx.fillText('Current line', current.x + 10, current.y - 8);
      ctx.fillStyle = '#0f766e';
      ctx.fillText('Minimum', optimum.x + 9, optimum.y + 17);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Inter, Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Drag to rotate · Scroll to zoom · Double-click to reset', 12, 18);
    }

    drawContours() {
      const ctx = this.lossCtx;
      const width = this.lossCanvas.width;
      const height = this.lossCanvas.height;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      const bounds = { left: 64, right: width - 24, top: 25, bottom: height - 54 };
      const columns = 64;
      const rows = 48;
      const cellWidth = (bounds.right - bounds.left) / columns;
      const cellHeight = (bounds.bottom - bounds.top) / rows;
      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          const slope = this.slopeMin + (column + 0.5) / columns * (this.slopeMax - this.slopeMin);
          const intercept = this.interceptMax - (row + 0.5) / rows * (this.interceptMax - this.interceptMin);
          ctx.fillStyle = surfaceColor(this.normalizedLoss(slope, intercept), 0.9);
          ctx.fillRect(bounds.left + column * cellWidth, bounds.top + row * cellHeight, cellWidth + 1, cellHeight + 1);
        }
      }

      const xTicks = Array.from({ length: 5 }, (_, index) => {
        const value = this.slopeMin + index * (this.slopeMax - this.slopeMin) / 4;
        return { value, min: this.slopeMin, max: this.slopeMax, label: value.toFixed(1) };
      });
      const yTicks = Array.from({ length: 5 }, (_, index) => {
        const value = this.interceptMin + index * (this.interceptMax - this.interceptMin) / 4;
        return { value, min: this.interceptMin, max: this.interceptMax, label: value.toFixed(1) };
      });
      drawAxes(ctx, bounds, xTicks, yTicks, 'Slope, b₁', 'Intercept, b₀');

      const px = value => map(value, this.slopeMin, this.slopeMax, bounds.left, bounds.right);
      const py = value => map(value, this.interceptMin, this.interceptMax, bounds.bottom, bounds.top);
      ctx.beginPath();
      ctx.arc(px(this.bestSlope), py(this.bestIntercept), 6, 0, Math.PI * 2);
      ctx.fillStyle = '#0f766e';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(px(this.slope), py(this.intercept), 7, 0, Math.PI * 2);
      ctx.fillStyle = '#ea580c';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    updateStats() {
      const mse = this.loss(this.slope, this.intercept);
      if (this.slopeValue) this.slopeValue.textContent = this.slope.toFixed(2);
      if (this.interceptValue) this.interceptValue.textContent = this.intercept.toFixed(2);
      this.equationValue.textContent = `y = ${this.intercept.toFixed(2)} ${this.slope >= 0 ? '+' : '−'} ${Math.abs(this.slope).toFixed(2)}x`;
      this.currentMseValue.textContent = mse.toFixed(3);
      this.minimumMseValue.textContent = this.bestMse.toFixed(3);
      this.gapValue.textContent = (mse - this.bestMse).toFixed(3);
    }
  }

  function refreshSharedData(randomize = false) {
    sharedPoints = makePoints(randomize);
    demos.forEach(demo => demo.setData(sharedPoints));
  }

  document.querySelectorAll('[data-regression-demo]').forEach(root => {
    demos.push(new RegressionDemo(root));
  });

  const nav = document.querySelector('nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.style.background = window.scrollY > 20
        ? 'rgba(240,244,248,0.97)'
        : 'rgba(240,244,248,0.85)';
    }, { passive: true });
  }

  const burger = document.querySelector('.nav-burger');
  if (burger) {
    burger.addEventListener('click', () => {
      const open = document.body.classList.toggle('nav-open');
      burger.setAttribute('aria-expanded', String(open));
    });
    document.querySelectorAll('.nav-dropdown a').forEach(link => {
      link.addEventListener('click', () => {
        document.body.classList.remove('nav-open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const headings = document.querySelectorAll('.prose h2');
  const tocList = document.getElementById('toc-list');
  if (tocList) {
    headings.forEach((heading, index) => {
      heading.id = 'section-' + index;
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = '#section-' + index;
      link.textContent = heading.textContent;
      item.appendChild(link);
      tocList.appendChild(item);
    });

    const tocLinks = tocList.querySelectorAll('a');
    window.addEventListener('scroll', () => {
      let current = '';
      headings.forEach(heading => {
        if (window.scrollY >= heading.offsetTop - 100) current = heading.id;
      });
      tocLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === '#' + current);
      });
    }, { passive: true });
  }

  refreshSharedData(false);
})();
