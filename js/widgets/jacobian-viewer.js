// ============================================================
// jacobian-viewer.js
// 2-link planar arm. Drag q1, q2 with sliders; drag q̇1, q̇2
// rates with sliders. The widget overlays:
//   - the arm itself (two segments + joint dots)
//   - a red "column 1" arrow at the end-effector showing the
//     velocity contribution of joint 1 alone (J_1 · q̇1)
//   - a green "column 2" arrow showing joint 2's contribution
//     (J_2 · q̇2)
//   - a blue "total" arrow showing the sum ẋ = J · q̇
//   - a gauge for det(J), smoothly coloured from green
//     (manipulable) to red (singular)
//   - the live numeric Jacobian
//
// For a 2-link planar arm with link lengths L1, L2:
//   p   = (L1 cos q1 + L2 cos(q1+q2),
//          L1 sin q1 + L2 sin(q1+q2))
//   J   = [ -L1 sin q1 - L2 sin(q1+q2),  -L2 sin(q1+q2) ;
//            L1 cos q1 + L2 cos(q1+q2),   L2 cos(q1+q2) ]
//   det = L1 · L2 · sin(q2)
//
// Singular at q2 = 0 (arm extended) or q2 = ±π (arm folded).
// ------------------------------------------------------------
// Usage:
//
//   <div data-jacobian-viewer
//        data-l1="0.5" data-l2="0.4"
//        data-q1="60" data-q2="45"
//        data-qd1="20" data-qd2="0"></div>
//
//   import { mountJacobianViewer } from '.../jacobian-viewer.js';
//   document.querySelectorAll('[data-jacobian-viewer]').forEach(mountJacobianViewer);
// ============================================================

const D2R = Math.PI / 180;

// Render constants — SVG view-box is 600 × 480, world origin at (300, 320),
// world unit = PIX_PER_M pixels.  These are tuned for arms with L1+L2 ≈ 1 m.
const VIEW_W = 600;
const VIEW_H = 480;
const ORIGIN_X = 300;
const ORIGIN_Y = 320;
const PIX_PER_M = 220;

function fmt(n, digits = 3) {
  if (Math.abs(n) < 1e-10) return (0).toFixed(digits);
  return n.toFixed(digits);
}

function fk(q1, q2, L1, L2) {
  const x = L1 * Math.cos(q1) + L2 * Math.cos(q1 + q2);
  const y = L1 * Math.sin(q1) + L2 * Math.sin(q1 + q2);
  const elbowX = L1 * Math.cos(q1);
  const elbowY = L1 * Math.sin(q1);
  return { x, y, elbowX, elbowY };
}

function jacobian(q1, q2, L1, L2) {
  const s1   = Math.sin(q1);
  const c1   = Math.cos(q1);
  const s12  = Math.sin(q1 + q2);
  const c12  = Math.cos(q1 + q2);
  // ∂p/∂q1
  const J11 = -L1 * s1 - L2 * s12;
  const J21 =  L1 * c1 + L2 * c12;
  // ∂p/∂q2
  const J12 = -L2 * s12;
  const J22 =  L2 * c12;
  return { J11, J12, J21, J22, det: L1 * L2 * Math.sin(q2) };
}

// Map a world (x, y) to SVG pixel space (origin bottom-centre, y up).
function worldToPx(x, y) {
  return [ORIGIN_X + x * PIX_PER_M, ORIGIN_Y - y * PIX_PER_M];
}

// Build an SVG arrow head marker with the given id + colour.
function arrowMarker(id, fill) {
  return `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5"
                  markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="${fill}" />
          </marker>`;
}

function svgLine(x1, y1, x2, y2, stroke, width, marker, dash) {
  const d = dash ? `stroke-dasharray="${dash}"` : '';
  const m = marker ? `marker-end="url(#${marker})"` : '';
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
                stroke="${stroke}" stroke-width="${width}"
                stroke-linecap="round" ${m} ${d} />`;
}

// Smooth colour interpolation green → amber → red as |det| → 0.
function gaugeColour(absDet, maxDet) {
  // ratio in [0, 1]; 1 == fully manipulable, 0 == singular
  const r = Math.max(0, Math.min(1, absDet / maxDet));
  // map: r=1 green (#5dba8b), r=0.5 amber (#e3a13b), r=0 red (#d44d4d)
  if (r >= 0.5) {
    const t = (r - 0.5) / 0.5;          // 0..1 green at 1, amber at 0
    return interpHex('#e3a13b', '#5dba8b', t);
  } else {
    const t = r / 0.5;                  // 0..1 red at 0, amber at 1
    return interpHex('#d44d4d', '#e3a13b', t);
  }
}
function interpHex(a, b, t) {
  const ha = parseInt(a.slice(1), 16), hb = parseInt(b.slice(1), 16);
  const ar = (ha >> 16) & 255, ag = (ha >> 8) & 255, ab = ha & 255;
  const br = (hb >> 16) & 255, bg = (hb >> 8) & 255, bb = hb & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

export function mountJacobianViewer(host) {
  const L1 = parseFloat(host.dataset.l1 || '0.5');
  const L2 = parseFloat(host.dataset.l2 || '0.4');
  // Stored in degrees in dataset for convenience; converted to radians internally.
  const q1Init = parseFloat(host.dataset.q1 || '60');
  const q2Init = parseFloat(host.dataset.q2 || '45');
  const qd1Init = parseFloat(host.dataset.qd1 || '40');
  const qd2Init = parseFloat(host.dataset.qd2 || '0');

  // The widget is laid out as: [SVG canvas] [controls column].
  host.classList.add('jacobian-viewer');
  host.innerHTML = `
    <div class="jacobian-viewer-canvas">
      <svg viewBox="0 0 ${VIEW_W} ${VIEW_H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="2-link planar arm">
        <defs>
          ${arrowMarker('arr-col1', '#d44d4d')}
          ${arrowMarker('arr-col2', '#3a8a4f')}
          ${arrowMarker('arr-total', '#2f5496')}
          ${arrowMarker('arr-axis', '#9aa3ae')}
        </defs>
        <g data-grid></g>
        <g data-axes>
          ${svgLine(20, ORIGIN_Y, VIEW_W - 20, ORIGIN_Y, '#cbd2d8', 1, 'arr-axis')}
          ${svgLine(ORIGIN_X, VIEW_H - 20, ORIGIN_X, 20, '#cbd2d8', 1, 'arr-axis')}
          <text x="${VIEW_W - 18}" y="${ORIGIN_Y - 6}" font-family="ui-sans-serif, sans-serif" font-size="13" fill="#7a8590" text-anchor="end">x</text>
          <text x="${ORIGIN_X + 6}" y="22" font-family="ui-sans-serif, sans-serif" font-size="13" fill="#7a8590">y</text>
        </g>
        <g data-arm></g>
        <g data-vectors></g>
        <g data-labels></g>
      </svg>
      <div class="jacobian-viewer-legend">
        <div><span class="dot" style="background:#d44d4d"></span> J<sub>1</sub>·q̇<sub>1</sub> — joint 1's contribution</div>
        <div><span class="dot" style="background:#3a8a4f"></span> J<sub>2</sub>·q̇<sub>2</sub> — joint 2's contribution</div>
        <div><span class="dot" style="background:#2f5496"></span> ẋ = J·q̇ — total end-effector velocity</div>
      </div>
    </div>
    <div class="jacobian-viewer-controls">
      <div class="slider-section-heading">Joint angles</div>
      <div class="slider-row">
        <div class="slider-label"><span>q<sub>1</sub></span><span class="slider-value" data-q1-val>0°</span></div>
        <input type="range" data-q1 min="-180" max="180" step="1" value="${q1Init}">
      </div>
      <div class="slider-row">
        <div class="slider-label"><span>q<sub>2</sub></span><span class="slider-value" data-q2-val>0°</span></div>
        <input type="range" data-q2 min="-180" max="180" step="1" value="${q2Init}">
      </div>
      <div class="slider-section-heading">Joint rates (q̇)</div>
      <div class="slider-row">
        <div class="slider-label"><span>q̇<sub>1</sub></span><span class="slider-value" data-qd1-val>0 °/s</span></div>
        <input type="range" data-qd1 min="-100" max="100" step="1" value="${qd1Init}">
      </div>
      <div class="slider-row">
        <div class="slider-label"><span>q̇<sub>2</sub></span><span class="slider-value" data-qd2-val>0 °/s</span></div>
        <input type="range" data-qd2 min="-100" max="100" step="1" value="${qd2Init}">
      </div>
      <div class="slider-section-heading">Determinant</div>
      <div class="jac-gauge">
        <div class="jac-gauge-bar"><div class="jac-gauge-fill" data-gauge-fill></div></div>
        <div class="jac-gauge-readout">
          <span>det(J) =</span>
          <span class="mono" data-det>0.000</span>
        </div>
        <div class="jac-gauge-note" data-det-note></div>
      </div>
      <div class="slider-section-heading">Numerical J(q)</div>
      <div class="matrix-display" data-jmat>—</div>
      <div class="slider-section-heading">End-effector velocity ẋ = J·q̇</div>
      <div class="matrix-display" data-xdot>—</div>
      <div class="btn-row">
        <button class="btn" data-preset="manipulable">Manipulable pose</button>
        <button class="btn" data-preset="singular">Singular pose</button>
      </div>
    </div>
  `;

  const svg       = host.querySelector('svg');
  const armG      = svg.querySelector('[data-arm]');
  const gridG     = svg.querySelector('[data-grid]');
  const vecG      = svg.querySelector('[data-vectors]');
  const labelG    = svg.querySelector('[data-labels]');
  const q1Slider  = host.querySelector('[data-q1]');
  const q2Slider  = host.querySelector('[data-q2]');
  const qd1Slider = host.querySelector('[data-qd1]');
  const qd2Slider = host.querySelector('[data-qd2]');
  const q1Val     = host.querySelector('[data-q1-val]');
  const q2Val     = host.querySelector('[data-q2-val]');
  const qd1Val    = host.querySelector('[data-qd1-val]');
  const qd2Val    = host.querySelector('[data-qd2-val]');
  const detEl     = host.querySelector('[data-det]');
  const detNote   = host.querySelector('[data-det-note]');
  const gaugeFill = host.querySelector('[data-gauge-fill]');
  const jmatEl    = host.querySelector('[data-jmat]');
  const xdotEl    = host.querySelector('[data-xdot]');

  // Light grid behind the arm — every 0.1 m.
  let gridSvg = '';
  for (let gx = -1.5; gx <= 1.5; gx += 0.1) {
    const [px] = worldToPx(gx, 0);
    gridSvg += `<line x1="${px}" y1="20" x2="${px}" y2="${VIEW_H - 20}" stroke="#eef1f4" stroke-width="0.5"/>`;
  }
  for (let gy = -0.8; gy <= 1.0; gy += 0.1) {
    const [, py] = worldToPx(0, gy);
    gridSvg += `<line x1="20" y1="${py}" x2="${VIEW_W - 20}" y2="${py}" stroke="#eef1f4" stroke-width="0.5"/>`;
  }
  gridG.innerHTML = gridSvg;

  // Maximum det (when sin q2 = 1) for gauge normalisation.
  const MAX_DET = L1 * L2;

  // Velocity-vector scale: 1 m/s → 60 px (so 0.5 m/s → 30 px).
  // Joint rates are in deg/s; ẋ = J · q̇_rad gives m/s (since J is in m/rad).
  const VEL_SCALE = 60;

  function render() {
    const q1deg = parseFloat(q1Slider.value);
    const q2deg = parseFloat(q2Slider.value);
    const qd1deg = parseFloat(qd1Slider.value);
    const qd2deg = parseFloat(qd2Slider.value);
    const q1 = q1deg * D2R, q2 = q2deg * D2R;
    const qd1 = qd1deg * D2R, qd2 = qd2deg * D2R;

    q1Val.textContent  = `${q1deg}°`;
    q2Val.textContent  = `${q2deg}°`;
    qd1Val.textContent = `${qd1deg} °/s`;
    qd2Val.textContent = `${qd2deg} °/s`;

    const { x, y, elbowX, elbowY } = fk(q1, q2, L1, L2);
    const J = jacobian(q1, q2, L1, L2);

    // Arm rendering
    const [bx, by] = worldToPx(0, 0);
    const [ex, ey] = worldToPx(elbowX, elbowY);
    const [tx, ty] = worldToPx(x, y);
    armG.innerHTML = `
      <line x1="${bx}" y1="${by}" x2="${ex}" y2="${ey}"
            stroke="#2f5496" stroke-width="9" stroke-linecap="round" opacity="0.85" />
      <line x1="${ex}" y1="${ey}" x2="${tx}" y2="${ty}"
            stroke="#2f5496" stroke-width="7" stroke-linecap="round" opacity="0.85" />
      <circle cx="${bx}" cy="${by}" r="9" fill="#1f3a6e" stroke="white" stroke-width="2" />
      <circle cx="${ex}" cy="${ey}" r="7" fill="#1f3a6e" stroke="white" stroke-width="2" />
      <circle cx="${tx}" cy="${ty}" r="6" fill="#d44d4d" stroke="white" stroke-width="2" />
    `;

    // Velocity contributions in world units (m/s):
    //   v1 = J_1 · q̇1   (column 1 of J times rate of joint 1)
    //   v2 = J_2 · q̇2   (column 2 times rate of joint 2)
    //   v  = v1 + v2 = J · q̇
    const v1x = J.J11 * qd1, v1y = J.J21 * qd1;
    const v2x = J.J12 * qd2, v2y = J.J22 * qd2;
    const vx  = v1x + v2x,   vy  = v1y + v2y;

    // Render the three arrows at the end-effector.
    let vecSvg = '';
    const minLen = 4;     // don't render arrowheads for ε vectors
    const drawArrow = (vx0, vy0, colour, marker, width = 3, opacity = 0.92, dash = '') => {
      const dxPx = vx0 * VEL_SCALE * (PIX_PER_M / PIX_PER_M);  // already in m/s; × 60 px/(m/s)
      const dyPx = vy0 * VEL_SCALE;
      const len  = Math.hypot(dxPx, dyPx);
      if (len < minLen) return '';
      const x2 = tx + dxPx;
      const y2 = ty - dyPx;
      const d = dash ? `stroke-dasharray="${dash}"` : '';
      return `<line x1="${tx}" y1="${ty}" x2="${x2}" y2="${y2}"
                    stroke="${colour}" stroke-width="${width}" stroke-linecap="round"
                    marker-end="url(#${marker})" opacity="${opacity}" ${d} />`;
    };
    // Sub-vectors first (so the total sits on top), but draw column arrows
    // tail-to-head from the end-effector outward — that's the geometric
    // "this column does this" reading.
    vecSvg += drawArrow(v1x, v1y, '#d44d4d', 'arr-col1', 3, 0.85);
    vecSvg += drawArrow(v2x, v2y, '#3a8a4f', 'arr-col2', 3, 0.85);
    vecSvg += drawArrow(vx,  vy,  '#2f5496', 'arr-total', 4, 1.0);
    vecG.innerHTML = vecSvg;

    // Labels next to the end-effector.
    labelG.innerHTML = `
      <text x="${tx + 12}" y="${ty - 10}" font-family="ui-monospace, monospace" font-size="12" fill="#1f3a6e">
        p = (${fmt(x, 2)}, ${fmt(y, 2)})
      </text>
    `;

    // det(J) gauge
    const absDet = Math.abs(J.det);
    const ratio = Math.min(1, absDet / MAX_DET);
    const colour = gaugeColour(absDet, MAX_DET);
    detEl.textContent = fmt(J.det, 4);
    gaugeFill.style.width = `${(ratio * 100).toFixed(1)}%`;
    gaugeFill.style.background = colour;
    if (ratio > 0.6)      detNote.textContent = 'Manipulable. Any task-space velocity is reachable.';
    else if (ratio > 0.2) detNote.textContent = 'Reduced manipulability. Some directions are getting expensive.';
    else if (ratio > 0.02) detNote.textContent = 'Near-singular. Joint rates required for simple motions are exploding.';
    else                  detNote.textContent = 'Singular. The Jacobian has lost rank — some directions are unreachable.';

    // Numeric J display
    jmatEl.innerHTML = renderMatrix([
      [J.J11, J.J12],
      [J.J21, J.J22],
    ]);

    // Numeric ẋ display
    xdotEl.innerHTML = renderMatrix([[vx], [vy]]);
  }

  function renderMatrix(rows) {
    return rows.map(r =>
      r.map(v => `<span class="matrix-cell">${fmt(v, 3)}</span>`).join('')
    ).join('\n');
  }

  // Wire up sliders and presets.
  [q1Slider, q2Slider, qd1Slider, qd2Slider].forEach(el =>
    el.addEventListener('input', render)
  );

  host.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.dataset.preset;
      if (p === 'manipulable') {
        q1Slider.value  = '45';
        q2Slider.value  = '90';
        qd1Slider.value = '40';
        qd2Slider.value = '0';
      } else if (p === 'singular') {
        q1Slider.value  = '30';
        q2Slider.value  = '0';     // arm fully extended → det(J) = 0
        qd1Slider.value = '40';
        qd2Slider.value = '0';
      }
      render();
    });
  });

  render();
  return { render };
}
