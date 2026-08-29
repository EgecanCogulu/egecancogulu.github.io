(() => {
  const COLORS = {
    text: '#0f172a',
    muted: '#64748b',
    faint: '#94a3b8',
    grid: '#e8eef5',
    border: '#cbd5e1',
    blue: '#0284c7',
    orange: '#ea580c',
    green: '#0f766e',
    slate: '#64748b',
    white: '#ffffff',
  };

  function map(value, sourceMin, sourceMax, targetMin, targetMax) {
    return targetMin + (value - sourceMin) / (sourceMax - sourceMin) * (targetMax - targetMin);
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function mean(values) {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function seededRandom(seed) {
    let state = seed >>> 0;
    return () => {
      state += 0x6D2B79F5;
      let value = state;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }

  function normalRandom(random) {
    const first = Math.max(random(), 1e-9);
    const second = random();
    return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
  }

  function formatSigned(value, digits = 2) {
    const prefix = value > 0 ? '+' : '';
    return `${prefix}${value.toFixed(digits)}`;
  }

  function drawFrame(ctx, width, height) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = COLORS.white;
    ctx.fillRect(0, 0, width, height);
  }

  function drawChartAxes(ctx, bounds, options) {
    const { left, right, top, bottom } = bounds;
    const { xMin, xMax, yMin, yMax, xTicks, yTicks, xLabel, yLabel } = options;

    ctx.font = '16px Inter, Arial, sans-serif';
    ctx.lineWidth = 1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    xTicks.forEach(tick => {
      const x = map(tick.value, xMin, xMax, left, right);
      ctx.strokeStyle = COLORS.grid;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
      ctx.fillStyle = COLORS.muted;
      ctx.fillText(tick.label, x, bottom + 18);
    });

    ctx.textAlign = 'right';
    yTicks.forEach(tick => {
      const y = map(tick.value, yMin, yMax, bottom, top);
      ctx.strokeStyle = COLORS.grid;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
      ctx.fillStyle = COLORS.muted;
      ctx.fillText(tick.label, left - 8, y);
    });

    ctx.strokeStyle = COLORS.border;
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, bottom);
    ctx.lineTo(right, bottom);
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.font = '18px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(xLabel, (left + right) / 2, bottom + 39);
    ctx.save();
    ctx.translate(16, (top + bottom) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
  }

  function linePath(ctx, points, xScale, yScale, color, width = 2.5, dash = []) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.setLineDash(dash);
    ctx.beginPath();
    points.forEach((point, index) => {
      const x = xScale(point.x);
      const y = yScale(point.y);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();
  }

  function pointMarker(ctx, x, y, color, radius = 4) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = COLORS.white;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function initializeConfounding() {
    const root = document.querySelector('[data-demo="confounding"]');
    if (!root) return;

    const dataCanvas = root.querySelector('[data-canvas="confounding-data"]');
    const estimateCanvas = root.querySelector('[data-canvas="confounding-estimates"]');
    const trueEffectControl = root.querySelector('[data-control="true-effect"]');
    const confoundingControl = root.querySelector('[data-control="confounding"]');
    const random = seededRandom(78231);
    const records = Array.from({ length: 280 }, () => ({
      intent: clamp(normalRandom(random), -2.7, 2.7),
      assignment: random(),
      noise: normalRandom(random) * 1.55,
    }));

    function estimates(points, trueEffect) {
      const treated = points.filter(point => point.treated);
      const untreated = points.filter(point => !point.treated);
      const naive = mean(treated.map(point => point.outcome)) - mean(untreated.map(point => point.outcome));

      const treatmentMean = mean(points.map(point => point.treated));
      const intentMean = mean(points.map(point => point.intent));
      const outcomeMean = mean(points.map(point => point.outcome));
      const intentVariance = points.reduce((sum, point) => sum + (point.intent - intentMean) ** 2, 0);
      const treatmentIntentCovariance = points.reduce((sum, point) => sum + (point.intent - intentMean) * (point.treated - treatmentMean), 0);
      const outcomeIntentCovariance = points.reduce((sum, point) => sum + (point.intent - intentMean) * (point.outcome - outcomeMean), 0);
      const treatmentIntentSlope = treatmentIntentCovariance / intentVariance;
      const outcomeIntentSlope = outcomeIntentCovariance / intentVariance;
      const treatmentResiduals = points.map(point => point.treated - treatmentMean - treatmentIntentSlope * (point.intent - intentMean));
      const outcomeResiduals = points.map(point => point.outcome - outcomeMean - outcomeIntentSlope * (point.intent - intentMean));
      const adjusted = treatmentResiduals.reduce((sum, residual, index) => sum + residual * outcomeResiduals[index], 0)
        / treatmentResiduals.reduce((sum, residual) => sum + residual * residual, 0);

      const intentSlope = (outcomeIntentCovariance - adjusted * treatmentIntentCovariance) / intentVariance;
      const intercept = outcomeMean - adjusted * treatmentMean - intentSlope * intentMean;

      return { trueEffect, naive, adjusted, intentSlope, intercept };
    }

    function drawData(points, result) {
      const ctx = dataCanvas.getContext('2d');
      const width = dataCanvas.width;
      const height = dataCanvas.height;
      drawFrame(ctx, width, height);
      const bounds = { left: 58, right: width - 22, top: 22, bottom: height - 54 };
      const yValues = points.map(point => point.outcome);
      const yMin = Math.floor(Math.min(...yValues) - 1);
      const yMax = Math.ceil(Math.max(...yValues) + 1);
      drawChartAxes(ctx, bounds, {
        xMin: -3, xMax: 3, yMin, yMax,
        xTicks: [-2, -1, 0, 1, 2].map(value => ({ value, label: String(value) })),
        yTicks: Array.from({ length: 5 }, (_, index) => {
          const value = yMin + index * (yMax - yMin) / 4;
          return { value, label: value.toFixed(0) };
        }),
        xLabel: 'Latent purchase intent',
        yLabel: 'Purchase outcome',
      });

      const xScale = value => map(value, -3, 3, bounds.left, bounds.right);
      const yScale = value => map(value, yMin, yMax, bounds.bottom, bounds.top);
      ctx.save();
      ctx.beginPath();
      ctx.rect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
      ctx.clip();

      const modelStart = -2.8;
      const modelEnd = 2.8;
      [
        { treated: 0, color: 'rgba(2, 132, 199, 0.9)' },
        { treated: 1, color: 'rgba(234, 88, 12, 0.9)' },
      ].forEach(group => {
        ctx.strokeStyle = group.color;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(xScale(modelStart), yScale(result.intercept + result.intentSlope * modelStart + result.adjusted * group.treated));
        ctx.lineTo(xScale(modelEnd), yScale(result.intercept + result.intentSlope * modelEnd + result.adjusted * group.treated));
        ctx.stroke();
      });

      points.forEach(point => {
        ctx.beginPath();
        ctx.arc(xScale(point.intent), yScale(point.outcome), 3.2, 0, Math.PI * 2);
        ctx.fillStyle = point.treated ? 'rgba(234, 88, 12, 0.58)' : 'rgba(2, 132, 199, 0.48)';
        ctx.fill();
      });
      ctx.restore();

      ctx.fillStyle = COLORS.muted;
      ctx.font = '700 15px Inter, Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Solid sloped lines compare outcomes at the same intent', bounds.left + 6, bounds.top + 12);

      const treatedMean = mean(points.filter(point => point.treated).map(point => point.outcome));
      const untreatedMean = mean(points.filter(point => !point.treated).map(point => point.outcome));
      [
        { value: treatedMean, color: COLORS.orange, label: 'Exposed average' },
        { value: untreatedMean, color: COLORS.blue, label: 'Unexposed average' },
      ].forEach(group => {
        const y = yScale(group.value);
        ctx.save();
        ctx.strokeStyle = group.color;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.moveTo(bounds.left, y);
        ctx.lineTo(bounds.right, y);
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = group.color;
        ctx.font = '700 15px Inter, Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(group.label, bounds.right - 4, y - 7);
      });
    }

    function drawEstimates(result) {
      const ctx = estimateCanvas.getContext('2d');
      const width = estimateCanvas.width;
      const height = estimateCanvas.height;
      drawFrame(ctx, width, height);
      const values = [result.trueEffect, result.naive, result.adjusted];
      const extent = Math.max(4, Math.ceil(Math.max(...values.map(Math.abs)) + 1));
      const yMin = -extent;
      const yMax = extent;
      const bounds = { left: 62, right: width - 24, top: 24, bottom: height - 60 };
      drawChartAxes(ctx, bounds, {
        xMin: 0, xMax: 3, yMin, yMax,
        xTicks: [],
        yTicks: [-extent, -extent / 2, 0, extent / 2, extent].map(value => ({ value, label: value.toFixed(value % 1 ? 1 : 0) })),
        xLabel: '',
        yLabel: 'Change in outcome',
      });

      const zeroY = map(0, yMin, yMax, bounds.bottom, bounds.top);
      const labels = [
        { main: 'True effect', detail: 'Known in simulation' },
        { main: 'Naive estimate', detail: 'All exposed vs. unexposed' },
        { main: 'Adjusted estimate', detail: 'Control for intent' },
      ];
      const colors = [COLORS.green, COLORS.orange, COLORS.blue];
      const centers = [0.55, 1.5, 2.45].map(value => map(value, 0, 3, bounds.left, bounds.right));
      const barWidth = 78;
      values.forEach((value, index) => {
        const valueY = map(value, yMin, yMax, bounds.bottom, bounds.top);
        ctx.fillStyle = colors[index];
        ctx.fillRect(centers[index] - barWidth / 2, Math.min(zeroY, valueY), barWidth, Math.max(2, Math.abs(valueY - zeroY)));
        pointMarker(ctx, centers[index], valueY, colors[index], 4.5);
        ctx.fillStyle = COLORS.text;
        ctx.font = '700 18px Inter, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(formatSigned(value), centers[index], value >= 0 ? valueY - 12 : valueY + 14);
        ctx.fillStyle = COLORS.muted;
        ctx.font = '700 15px Inter, Arial, sans-serif';
        ctx.fillText(labels[index].main, centers[index], bounds.bottom + 16);
        ctx.fillStyle = COLORS.faint;
        ctx.font = '14px Inter, Arial, sans-serif';
        ctx.fillText(labels[index].detail, centers[index], bounds.bottom + 32);
      });
    }

    function render() {
      const trueEffect = Number(trueEffectControl.value);
      const confounding = Number(confoundingControl.value);
      root.querySelector('[data-value="true-effect"]').textContent = trueEffect.toFixed(1);
      root.querySelector('[data-value="confounding"]').textContent = confounding.toFixed(1);

      const points = records.map(record => {
        const probability = 1 / (1 + Math.exp(-confounding * record.intent));
        const treated = record.assignment < probability ? 1 : 0;
        return {
          ...record,
          treated,
          outcome: 10 + 3.2 * record.intent + trueEffect * treated + record.noise,
        };
      });
      const result = estimates(points, trueEffect);
      drawData(points, result);
      drawEstimates(result);

      root.querySelector('[data-stat="confounding-true"]').textContent = formatSigned(result.trueEffect);
      root.querySelector('[data-stat="confounding-naive"]').textContent = formatSigned(result.naive);
      root.querySelector('[data-stat="confounding-adjusted"]').textContent = formatSigned(result.adjusted);

      const naiveBias = Math.abs(result.naive - result.trueEffect);
      const adjustedBias = Math.abs(result.adjusted - result.trueEffect);
      const insight = root.querySelector('[data-insight="confounding"]');
      if (confounding < 0.15) {
        insight.textContent = 'With random assignment, exposure is unrelated to purchase intent. The simple treated-versus-untreated comparison is already close to the truth.';
      } else if (Math.abs(trueEffect) < 0.15) {
        insight.textContent = `The ad has zero causal effect, but targeting creates a naive effect of ${formatSigned(result.naive)}. Adjusting for purchase intent brings it back to ${formatSigned(result.adjusted)}.`;
      } else {
        insight.textContent = `Targeting moves the naive estimate ${naiveBias.toFixed(2)} units away from the truth. Adjustment reduces that error to ${adjustedBias.toFixed(2)}.`;
      }
    }

    [trueEffectControl, confoundingControl].forEach(control => control.addEventListener('input', render));
    root.querySelector('[data-action="random-assignment"]').addEventListener('click', () => {
      confoundingControl.value = 0;
      render();
    });
    root.querySelector('[data-action="strong-targeting"]').addEventListener('click', () => {
      confoundingControl.value = 2.5;
      trueEffectControl.value = 0;
      render();
    });
    render();
  }

  function initializeMatching() {
    const root = document.querySelector('[data-demo="matching"]');
    if (!root) return;
    const canvas = root.querySelector('[data-canvas="matching"]');
    const selectionControl = root.querySelector('[data-control="matching-selection"]');
    const caliperControl = root.querySelector('[data-control="matching-caliper"]');
    const trueEffect = 2;
    const random = seededRandom(19471);
    const records = Array.from({ length: 220 }, (_, id) => ({
      id,
      covariate: clamp(normalRandom(random), -2.8, 2.8),
      assignment: random(),
      noise: normalRandom(random) * 1.25,
      jitter: random(),
    }));
    let hasMatched = false;

    function makeData(selection) {
      return records.map(record => {
        const propensity = 1 / (1 + Math.exp(-selection * record.covariate));
        const treated = record.assignment < propensity;
        return {
          ...record,
          propensity,
          treated,
          outcome: 10 + 3.1 * record.covariate + trueEffect * Number(treated) + record.noise,
        };
      });
    }

    function nearestNeighborMatch(data, caliper) {
      const treated = data.filter(record => record.treated).sort((first, second) => second.propensity - first.propensity);
      const availableControls = new Map(data.filter(record => !record.treated).map(record => [record.id, record]));
      const pairs = [];
      treated.forEach(treatedRecord => {
        let bestControl = null;
        let bestDistance = Infinity;
        availableControls.forEach(controlRecord => {
          const distance = Math.abs(treatedRecord.propensity - controlRecord.propensity);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestControl = controlRecord;
          }
        });
        if (bestControl && bestDistance <= caliper) {
          pairs.push({ treated: treatedRecord, control: bestControl, distance: bestDistance });
          availableControls.delete(bestControl.id);
        }
      });
      return pairs;
    }

    function drawScoreAxis(ctx, bounds) {
      const axisY = bounds.bottom;
      ctx.strokeStyle = COLORS.border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bounds.left, axisY);
      ctx.lineTo(bounds.right, axisY);
      ctx.stroke();
      ctx.font = '15px Inter, Arial, sans-serif';
      ctx.textAlign = 'center';
      [0, 0.25, 0.5, 0.75, 1].forEach(value => {
        const x = map(value, 0, 1, bounds.left, bounds.right);
        ctx.strokeStyle = COLORS.grid;
        ctx.beginPath();
        ctx.moveTo(x, bounds.top);
        ctx.lineTo(x, axisY);
        ctx.stroke();
        ctx.fillStyle = COLORS.muted;
        ctx.fillText(value.toFixed(value === 0 || value === 1 ? 0 : 2), x, axisY + 17);
      });
      ctx.fillStyle = '#475569';
      ctx.font = '17px Inter, Arial, sans-serif';
      ctx.fillText('Propensity score from observed pre-treatment confounders', (bounds.left + bounds.right) / 2, axisY + 36);
    }

    function drawOutcomeComparison(ctx, width, naive, matchedEstimate) {
      const availableValues = [trueEffect, naive];
      if (hasMatched && Number.isFinite(matchedEstimate)) availableValues.push(matchedEstimate);
      const yMax = Math.max(4, Math.ceil(Math.max(...availableValues) + 1));
      const bounds = { left: 78, right: width - 32, top: 485, bottom: 645 };
      drawChartAxes(ctx, bounds, {
        xMin: 0, xMax: 3, yMin: 0, yMax,
        xTicks: [],
        yTicks: [0, yMax / 2, yMax].map(value => ({ value, label: value.toFixed(value % 1 ? 1 : 0) })),
        xLabel: '',
        yLabel: 'Change in purchase outcome',
      });

      ctx.fillStyle = COLORS.text;
      ctx.font = '750 18px Inter, Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('OUTCOME EFFECT ESTIMATES', bounds.left, 453);
      ctx.fillStyle = COLORS.faint;
      ctx.font = '15px Inter, Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('Matching changes the comparison group, then outcomes are compared', bounds.right, 453);

      const entries = [
        { value: trueEffect, color: COLORS.green, label: 'True effect', detail: 'Known in simulation' },
        { value: naive, color: COLORS.orange, label: 'Naive difference', detail: 'All treated minus all controls' },
        { value: hasMatched ? matchedEstimate : null, color: COLORS.blue, label: 'Matched estimate', detail: 'Paired treated minus paired controls' },
      ];
      const centers = [0.5, 1.5, 2.5].map(value => map(value, 0, 3, bounds.left, bounds.right));
      const zeroY = map(0, 0, yMax, bounds.bottom, bounds.top);
      const barWidth = 112;

      entries.forEach((entry, index) => {
        if (Number.isFinite(entry.value)) {
          const valueY = map(entry.value, 0, yMax, bounds.bottom, bounds.top);
          ctx.fillStyle = entry.color;
          ctx.fillRect(centers[index] - barWidth / 2, valueY, barWidth, zeroY - valueY);
          pointMarker(ctx, centers[index], valueY, entry.color, 5);
          ctx.fillStyle = COLORS.text;
          ctx.font = '700 17px Inter, Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(formatSigned(entry.value), centers[index], valueY - 14);
        } else {
          ctx.save();
          ctx.strokeStyle = COLORS.border;
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 5]);
          ctx.strokeRect(centers[index] - barWidth / 2, bounds.top + 40, barWidth, bounds.bottom - bounds.top - 40);
          ctx.restore();
          ctx.fillStyle = COLORS.faint;
          ctx.font = '700 16px Inter, Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Run matching', centers[index], (bounds.top + bounds.bottom) / 2);
        }
        ctx.fillStyle = COLORS.muted;
        ctx.font = '700 15px Inter, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(entry.label, centers[index], bounds.bottom + 19);
        ctx.fillStyle = COLORS.faint;
        ctx.font = '14px Inter, Arial, sans-serif';
        ctx.fillText(entry.detail, centers[index], bounds.bottom + 39);
      });
    }

    function draw(data, pairs, naive, matchedEstimate) {
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      drawFrame(ctx, width, height);
      const leftBounds = { left: 62, right: width / 2 - 34, top: 66, bottom: 385 };
      const rightBounds = { left: width / 2 + 34, right: width - 28, top: 66, bottom: 385 };
      const treatedY = 145;
      const controlY = 275;

      ctx.fillStyle = COLORS.text;
      ctx.font = '750 18px Inter, Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('BEFORE MATCHING', leftBounds.left, 32);
      ctx.fillText('AFTER MATCHING', rightBounds.left, 32);
      ctx.fillStyle = COLORS.faint;
      ctx.font = '15px Inter, Arial, sans-serif';
      ctx.fillText('The full observed groups', leftBounds.left, 50);
      ctx.fillText(hasMatched ? 'Only comparable treated-control pairs' : 'Choose Match nearest neighbors', rightBounds.left, 50);

      [leftBounds, rightBounds].forEach(bounds => {
        drawScoreAxis(ctx, bounds);
        ctx.fillStyle = COLORS.orange;
        ctx.font = '700 16px Inter, Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Treated', bounds.left, 88);
        ctx.fillStyle = COLORS.blue;
        ctx.fillText('Controls', bounds.left, 218);
      });

      const leftX = value => map(value, 0, 1, leftBounds.left, leftBounds.right);
      data.forEach(record => {
        const baseY = record.treated ? treatedY : controlY;
        const y = baseY + (record.jitter - 0.5) * 82;
        ctx.beginPath();
        ctx.arc(leftX(record.propensity), y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = record.treated ? 'rgba(234, 88, 12, 0.58)' : 'rgba(2, 132, 199, 0.5)';
        ctx.fill();
      });

      if (!hasMatched) {
        ctx.fillStyle = COLORS.faint;
        ctx.font = '16px Inter, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No pairs selected yet', (rightBounds.left + rightBounds.right) / 2, (rightBounds.top + rightBounds.bottom) / 2);
      } else {
        const rightX = value => map(value, 0, 1, rightBounds.left, rightBounds.right);
        pairs.forEach((pair, index) => {
          const jitter = ((index * 37) % 101) / 100 - 0.5;
          const pairTreatedY = treatedY + jitter * 82;
          const pairControlY = controlY + jitter * 82;
          ctx.strokeStyle = 'rgba(100, 116, 139, 0.22)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(rightX(pair.treated.propensity), pairTreatedY);
          ctx.lineTo(rightX(pair.control.propensity), pairControlY);
          ctx.stroke();
          pointMarker(ctx, rightX(pair.treated.propensity), pairTreatedY, COLORS.orange, 3.6);
          pointMarker(ctx, rightX(pair.control.propensity), pairControlY, COLORS.blue, 3.6);
        });
      }

      ctx.strokeStyle = COLORS.border;
      ctx.beginPath();
      ctx.moveTo(28, 428);
      ctx.lineTo(width - 28, 428);
      ctx.stroke();
      drawOutcomeComparison(ctx, width, naive, matchedEstimate);
    }

    function render() {
      const selection = Number(selectionControl.value);
      const caliper = Number(caliperControl.value);
      const data = makeData(selection);
      const pairs = nearestNeighborMatch(data, caliper);
      const treated = data.filter(record => record.treated);
      const controls = data.filter(record => !record.treated);
      const naive = mean(treated.map(record => record.outcome)) - mean(controls.map(record => record.outcome));
      const matchedEstimate = pairs.length
        ? mean(pairs.map(pair => pair.treated.outcome - pair.control.outcome))
        : NaN;

      root.querySelector('[data-value="matching-selection"]').textContent = selection.toFixed(1);
      root.querySelector('[data-value="matching-caliper"]').textContent = caliper.toFixed(2);
      root.querySelector('[data-stat="matching-true"]').textContent = formatSigned(trueEffect);
      root.querySelector('[data-stat="matching-naive"]').textContent = formatSigned(naive);
      root.querySelector('[data-stat="matching-estimate"]').textContent = hasMatched ? formatSigned(matchedEstimate) : 'Run matching';
      root.querySelector('[data-stat="matching-count"]').textContent = hasMatched ? `${pairs.length} of ${treated.length}` : 'Not matched';
      draw(data, pairs, naive, matchedEstimate);

      const insight = root.querySelector('[data-insight="matching"]');
      if (!hasMatched) {
        insight.textContent = `Selection makes treated customers look better even before treatment, producing a naive estimate of ${formatSigned(naive)}. Match them to more comparable controls.`;
      } else {
        const matchRate = pairs.length / treated.length;
        if (matchRate < 0.65) {
          insight.textContent = `Matching moves the estimate to ${formatSigned(matchedEstimate)}, but only ${Math.round(matchRate * 100)}% of treated customers find a match. The result now describes the overlap population, not every treated customer.`;
        } else {
          insight.textContent = `${pairs.length} treated customers find similar controls. Replacing the full control group with those comparisons moves the estimate from ${formatSigned(naive)} toward the true effect of ${formatSigned(trueEffect)}.`;
        }
      }
    }

    [selectionControl, caliperControl].forEach(control => control.addEventListener('input', () => {
      hasMatched = false;
      render();
    }));
    root.querySelector('[data-action="run-matching"]').addEventListener('click', () => {
      hasMatched = true;
      render();
    });
    root.querySelector('[data-action="good-overlap"]').addEventListener('click', () => {
      selectionControl.value = 1.4;
      caliperControl.value = 0.08;
      hasMatched = false;
      render();
    });
    root.querySelector('[data-action="poor-overlap"]').addEventListener('click', () => {
      selectionControl.value = 3.6;
      caliperControl.value = 0.05;
      hasMatched = false;
      render();
    });
    render();
  }

  function initializeDid() {
    const root = document.querySelector('[data-demo="did"]');
    if (!root) return;
    const canvas = root.querySelector('[data-canvas="did"]');
    const effectControl = root.querySelector('[data-control="did-effect"]');
    const trendControl = root.querySelector('[data-control="trend-difference"]');
    const counterfactualButton = root.querySelector('[data-action="toggle-did-counterfactual"]');
    const intervention = 5;
    const commonShocks = [0, 0.4, -0.2, 0.25, -0.15, 0.2, 0.55, -0.3, 0.35, 0.05];
    let revealCounterfactual = false;

    function makeSeries(effect, trendDifference) {
      const control = [];
      const counterfactual = [];
      const treated = [];
      for (let time = 0; time < commonShocks.length; time += 1) {
        const controlValue = 20 + 1.15 * time + commonShocks[time];
        const counterfactualValue = 25 + (1.15 + trendDifference) * time + commonShocks[time];
        control.push({ x: time, y: controlValue });
        counterfactual.push({ x: time, y: counterfactualValue });
        treated.push({ x: time, y: counterfactualValue + (time >= intervention ? effect : 0) });
      }
      return { control, counterfactual, treated };
    }

    function periodAverage(series, start, end) {
      return mean(series.filter(point => point.x >= start && point.x <= end).map(point => point.y));
    }

    function draw(series) {
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      drawFrame(ctx, width, height);
      const allValues = [...series.control, ...series.counterfactual, ...series.treated].map(point => point.y);
      const yMin = Math.floor(Math.min(...allValues) - 2);
      const yMax = Math.ceil(Math.max(...allValues) + 2);
      const bounds = { left: 72, right: width - 32, top: 28, bottom: height - 58 };
      drawChartAxes(ctx, bounds, {
        xMin: 0, xMax: 9, yMin, yMax,
        xTicks: Array.from({ length: 10 }, (_, value) => ({ value, label: String(value + 1) })),
        yTicks: Array.from({ length: 5 }, (_, index) => {
          const value = yMin + index * (yMax - yMin) / 4;
          return { value, label: value.toFixed(0) };
        }),
        xLabel: 'Time period',
        yLabel: 'Outcome',
      });
      const xScale = value => map(value, 0, 9, bounds.left, bounds.right);
      const yScale = value => map(value, yMin, yMax, bounds.bottom, bounds.top);
      const interventionX = (xScale(4) + xScale(5)) / 2;

      ctx.fillStyle = 'rgba(2, 132, 199, 0.035)';
      ctx.fillRect(interventionX, bounds.top, bounds.right - interventionX, bounds.bottom - bounds.top);
      ctx.save();
      ctx.strokeStyle = COLORS.faint;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(interventionX, bounds.top);
      ctx.lineTo(interventionX, bounds.bottom);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = COLORS.muted;
      ctx.font = '700 16px Inter, Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('TREATMENT', interventionX + 9, bounds.top + 13);

      linePath(ctx, series.control, xScale, yScale, COLORS.slate, 3);
      if (revealCounterfactual) linePath(ctx, series.counterfactual, xScale, yScale, COLORS.green, 3, [8, 6]);
      linePath(ctx, series.treated, xScale, yScale, COLORS.orange, 3.5);
      series.control.forEach(point => pointMarker(ctx, xScale(point.x), yScale(point.y), COLORS.slate, 4.2));
      series.treated.forEach(point => pointMarker(ctx, xScale(point.x), yScale(point.y), COLORS.orange, 4.5));

      const lastControl = series.control.at(-1);
      const lastTreated = series.treated.at(-1);
      ctx.font = '700 17px Inter, Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillStyle = COLORS.orange;
      ctx.fillText('Treated', xScale(lastTreated.x) - 7, yScale(lastTreated.y) - 12);
      ctx.fillStyle = COLORS.slate;
      ctx.fillText('Control', xScale(lastControl.x) - 7, yScale(lastControl.y) + 15);
      if (revealCounterfactual) {
        const lastCounterfactual = series.counterfactual.at(-1);
        ctx.fillStyle = COLORS.green;
        ctx.fillText('No-treatment path', xScale(lastCounterfactual.x) - 7, yScale(lastCounterfactual.y) - 12);
      }
    }

    function render() {
      const effect = Number(effectControl.value);
      const trendDifference = Number(trendControl.value);
      root.querySelector('[data-value="did-effect"]').textContent = effect.toFixed(1);
      root.querySelector('[data-value="trend-difference"]').textContent = formatSigned(trendDifference, 2);
      const series = makeSeries(effect, trendDifference);
      const treatedPre = periodAverage(series.treated, 0, intervention - 1);
      const treatedPost = periodAverage(series.treated, intervention, 9);
      const controlPre = periodAverage(series.control, 0, intervention - 1);
      const controlPost = periodAverage(series.control, intervention, 9);
      const postGap = treatedPost - controlPost;
      const did = (treatedPost - treatedPre) - (controlPost - controlPre);
      draw(series);

      root.querySelector('[data-stat="did-true"]').textContent = formatSigned(effect);
      root.querySelector('[data-stat="did-gap"]').textContent = formatSigned(postGap);
      root.querySelector('[data-stat="did-estimate"]').textContent = formatSigned(did);
      const insight = root.querySelector('[data-insight="did"]');
      if (Math.abs(trendDifference) < 0.01) {
        insight.textContent = `The markets start ${formatSigned(5)} units apart, so their post-period gap is misleading. Parallel trends let DiD subtract that persistent difference and recover ${formatSigned(did)}.`;
      } else {
        insight.textContent = `The untreated treated-market path now drifts away from the control. DiD calls part of that drift a treatment effect and misses the truth by ${Math.abs(did - effect).toFixed(2)}.`;
      }
    }

    [effectControl, trendControl].forEach(control => control.addEventListener('input', render));
    root.querySelector('[data-action="parallel-trends"]').addEventListener('click', () => {
      trendControl.value = 0;
      render();
    });
    root.querySelector('[data-action="break-trends"]').addEventListener('click', () => {
      trendControl.value = 0.65;
      render();
    });
    counterfactualButton.addEventListener('click', () => {
      revealCounterfactual = !revealCounterfactual;
      counterfactualButton.classList.toggle('active', revealCounterfactual);
      counterfactualButton.textContent = revealCounterfactual ? 'Hide counterfactual' : 'Reveal counterfactual';
      render();
    });
    render();
  }

  function initializeSyntheticControl() {
    const root = document.querySelector('[data-demo="synthetic"]');
    if (!root) return;
    const canvas = root.querySelector('[data-canvas="synthetic"]');
    const weightControls = ['a', 'b', 'c', 'd'].map(key => root.querySelector(`[data-control="weight-${key}"]`));
    const weightValues = ['a', 'b', 'c', 'd'].map(key => root.querySelector(`[data-value="weight-${key}"]`));
    const truthButton = root.querySelector('[data-action="toggle-synthetic-counterfactual"]');
    const intervention = 12;
    const trueWeights = [0.5, 0.25, 0.15, 0.1];
    let revealTruth = false;

    const donors = Array.from({ length: 4 }, () => []);
    for (let time = 0; time < 20; time += 1) {
      donors[0].push(42 + 0.8 * time + 2.2 * Math.sin(time / 2));
      donors[1].push(51 + 0.28 * time + 3.1 * Math.cos(time / 3));
      donors[2].push(34 + 1.22 * time + 1.7 * Math.sin(time / 1.7 + 0.5));
      donors[3].push(47 + 0.52 * time + 2.5 * Math.cos(time / 2.4 + 0.8));
    }
    const trueCounterfactual = Array.from({ length: 20 }, (_, time) => donors.reduce(
      (sum, donor, index) => sum + trueWeights[index] * donor[time], 0,
    ));
    const treatmentEffects = Array.from({ length: 20 }, (_, time) => time < intervention ? 0 : 6 + 0.65 * (time - intervention));
    const treated = trueCounterfactual.map((value, time) => value + treatmentEffects[time]);

    function normalizedWeights() {
      const raw = weightControls.map(control => Number(control.value));
      const total = raw.reduce((sum, value) => sum + value, 0);
      if (total === 0) return [0.25, 0.25, 0.25, 0.25];
      return raw.map(value => value / total);
    }

    function syntheticSeries(weights) {
      return Array.from({ length: 20 }, (_, time) => donors.reduce(
        (sum, donor, index) => sum + weights[index] * donor[time], 0,
      ));
    }

    function draw(synthetic) {
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      drawFrame(ctx, width, height);
      const allValues = [...donors.flat(), ...treated, ...synthetic, ...trueCounterfactual];
      const yMin = Math.floor(Math.min(...allValues) - 3);
      const yMax = Math.ceil(Math.max(...allValues) + 3);
      const bounds = { left: 72, right: width - 32, top: 30, bottom: height - 58 };
      drawChartAxes(ctx, bounds, {
        xMin: 0, xMax: 19, yMin, yMax,
        xTicks: [0, 3, 7, 11, 15, 19].map(value => ({ value, label: String(value + 1) })),
        yTicks: Array.from({ length: 5 }, (_, index) => {
          const value = yMin + index * (yMax - yMin) / 4;
          return { value, label: value.toFixed(0) };
        }),
        xLabel: 'Time period',
        yLabel: 'Outcome',
      });
      const xScale = value => map(value, 0, 19, bounds.left, bounds.right);
      const yScale = value => map(value, yMin, yMax, bounds.bottom, bounds.top);
      const interventionX = (xScale(intervention - 1) + xScale(intervention)) / 2;
      ctx.fillStyle = 'rgba(2, 132, 199, 0.035)';
      ctx.fillRect(interventionX, bounds.top, bounds.right - interventionX, bounds.bottom - bounds.top);
      ctx.save();
      ctx.strokeStyle = COLORS.faint;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(interventionX, bounds.top);
      ctx.lineTo(interventionX, bounds.bottom);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = COLORS.muted;
      ctx.font = '700 16px Inter, Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('TREATMENT', interventionX + 9, bounds.top + 13);

      donors.forEach((donor, donorIndex) => {
        linePath(ctx, donor.map((value, time) => ({ x: time, y: value })), xScale, yScale, ['#cbd5e1', '#d6dce5', '#bfc9d7', '#dfe4eb'][donorIndex], 1.6);
      });
      if (revealTruth) {
        linePath(ctx, trueCounterfactual.map((value, time) => ({ x: time, y: value })), xScale, yScale, COLORS.green, 3, [4, 5]);
      }
      linePath(ctx, synthetic.map((value, time) => ({ x: time, y: value })), xScale, yScale, COLORS.blue, 3.2, [9, 5]);
      linePath(ctx, treated.map((value, time) => ({ x: time, y: value })), xScale, yScale, COLORS.text, 3.5);
      treated.forEach((value, time) => pointMarker(ctx, xScale(time), yScale(value), COLORS.text, 3.8));

      ctx.font = '700 17px Inter, Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillStyle = COLORS.text;
      ctx.fillText('Treated', xScale(19) - 8, yScale(treated[19]) - 12);
      ctx.fillStyle = COLORS.blue;
      ctx.fillText('Synthetic', xScale(19) - 8, yScale(synthetic[19]) + 16);
      if (revealTruth) {
        ctx.fillStyle = COLORS.green;
        ctx.fillText('True no-treatment path', xScale(19) - 8, yScale(trueCounterfactual[19]) - 13);
      }
    }

    function render() {
      const weights = normalizedWeights();
      const synthetic = syntheticSeries(weights);
      weightValues.forEach((element, index) => {
        element.textContent = `${Math.round(weights[index] * 100)}%`;
      });
      const preErrors = treated.slice(0, intervention).map((value, time) => value - synthetic[time]);
      const rmse = Math.sqrt(mean(preErrors.map(error => error * error)));
      const estimatedEffects = treated.slice(intervention).map((value, index) => value - synthetic[index + intervention]);
      const estimatedEffect = mean(estimatedEffects);
      const trueEffect = mean(treatmentEffects.slice(intervention));
      draw(synthetic);

      root.querySelector('[data-stat="synthetic-rmse"]').textContent = rmse.toFixed(2);
      root.querySelector('[data-stat="synthetic-effect"]').textContent = formatSigned(estimatedEffect);
      root.querySelector('[data-stat="synthetic-true"]').textContent = formatSigned(trueEffect);
      const insight = root.querySelector('[data-insight="synthetic"]');
      if (rmse < 0.08) {
        insight.textContent = `The weighted donors reproduce the full pre-treatment path. Extending that combination forward recovers an average effect of ${formatSigned(estimatedEffect)}, almost exactly the hidden truth.`;
      } else if (rmse < 1) {
        insight.textContent = `The pre-treatment fit is close but imperfect. That small mismatch carries into the post period, where the estimated effect differs from the truth by ${Math.abs(estimatedEffect - trueEffect).toFixed(2)}.`;
      } else {
        insight.textContent = `The synthetic control misses the treated market even before treatment. A post-treatment gap is hard to interpret until the pre-period counterfactual fits convincingly.`;
      }
    }

    weightControls.forEach(control => control.addEventListener('input', render));
    root.querySelector('[data-action="equal-weights"]').addEventListener('click', () => {
      weightControls.forEach(control => { control.value = 25; });
      render();
    });
    root.querySelector('[data-action="fit-weights"]').addEventListener('click', () => {
      trueWeights.forEach((weight, index) => { weightControls[index].value = weight * 100; });
      render();
    });
    truthButton.addEventListener('click', () => {
      revealTruth = !revealTruth;
      truthButton.classList.toggle('active', revealTruth);
      truthButton.textContent = revealTruth ? 'Hide truth' : 'Reveal truth';
      render();
    });
    render();
  }

  function initializeNavigation() {
    const nav = document.querySelector('nav');
    if (nav) {
      window.addEventListener('scroll', () => {
        nav.style.background = window.scrollY > 20 ? 'rgba(240,244,248,0.97)' : 'rgba(240,244,248,0.85)';
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
  }

  initializeConfounding();
  initializeMatching();
  initializeDid();
  initializeSyntheticControl();
  initializeNavigation();
})();
