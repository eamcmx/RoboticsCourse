// ============================================================
// dynamic-comparison.js
// The "kinematics misses, dynamics tracks" widget for L22.
// Two 2-link planar arms, side by side, share one target
// trajectory. Left arm is driven by a pure PD controller in
// joint space (the "kinematic" naïf). Right arm is driven by
// a computed-torque law: τ = D(q)[q̈_d + Kp·e + Kv·ė] + h + c.
//
// Both arms are simulated with their own forward-dynamics
// integrator (RK4). The point: same gains, same trajectory,
// same physics — but the right arm tracks cleanly because it
// pre-compensates for inertia, Coriolis, and gravity.
//
// Below the arms: a torque-vs-time plot for each controller.
// The user picks the trajectory speed and a payload mass.
// Heavy payloads + high speed are where the difference
// becomes obvious.
// ------------------------------------------------------------
// 2-link arm with point masses m1 at the elbow (end of link 1)
// and m2 at the tip (end of link 2):
//
//   D11 = (m1 + m2) L1^2 + m2 L2^2 + 2 m2 L1 L2 cos q2
//   D12 = D21       = m2 L2^2 + m2 L1 L2 cos q2
//   D22             = m2 L2^2
//
//   h1 = -m2 L1 L2 sin q2 · (2 q̇1 q̇2 + q̇2^2)
//   h2 =  m2 L1 L2 sin q2 · q̇1^2
//
//   c1 = (m1 + m2) g L1 cos q1 + m2 g L2 cos(q1 + q2)
//   c2 =                            m2 g L2 cos(q1 + q2)
//
// (Spong et al., conventional planar 2-link with point masses.)
// ============================================================

const D2R = Math.PI / 180;

// SVG geometry — single canvas split L | R, world unit = PIX_PER_M.
const VIEW_W = 720;
const VIEW_H = 360;
const PIX_PER_M = 110;
const ARM_GAP = 30;
const HALF_W = (VIEW_W - ARM_GAP) / 2;
const ORIGIN_LX = HALF_W / 2;
const ORIGIN_RX = HALF_W + ARM_GAP + HALF_W / 2;
const ORIGIN_Y = VIEW_H * 0.62;

// Plot geometry — separate SVG below.
const PLOT_W = 720;
const PLOT_H = 180;
const PLOT_PAD_L = 40;
const PLOT_PAD_R = 8;
const PLOT_PAD_T = 14;
const PLOT_PAD_B = 24;
const PLOT_HISTORY_S = 4.0;          // seconds shown on scope

// Default robot parameters
const DEFAULTS = {
  L1: 0.5, L2: 0.5,
  m1: 1.0, m2: 1.0,
  g: 9.81,
  Kp: 80, Kv: 14,
};

function fmt(n, d = 2) {
  if (Math.abs(n) < 1e-10) return (0).toFixed(d);
  return n.toFixed(d);
}

// Forward kinematics — used only for rendering.
function fk(q1, q2, L1, L2) {
  const ex = L1 * Math.cos(q1);
  const ey = L1 * Math.sin(q1);
  const tx = ex + L2 * Math.cos(q1 + q2);
  const ty = ey + L2 * Math.sin(q1 + q2);
  return { ex, ey, tx, ty };
}

// Mass matrix D(q), 2x2.
function massMatrix(q1, q2, p) {
  const c2 = Math.cos(q2);
  const D11 = (p.m1 + p.m2) * p.L1 * p.L1 + p.m2 * p.L2 * p.L2 + 2 * p.m2 * p.L1 * p.L2 * c2;
  const D12 = p.m2 * p.L2 * p.L2 + p.m2 * p.L1 * p.L2 * c2;
  const D22 = p.m2 * p.L2 * p.L2;
  return [D11, D12, D12, D22];
}

// Coriolis/centrifugal vector h(q, q̇), 2x1.
function coriolis(q1, q2, qd1, qd2, p) {
  const s2 = Math.sin(q2);
  const h1 = -p.m2 * p.L1 * p.L2 * s2 * (2 * qd1 * qd2 + qd2 * qd2);
  const h2 =  p.m2 * p.L1 * p.L2 * s2 * (qd1 * qd1);
  return [h1, h2];
}

// Gravity vector c(q), 2x1.
function gravity(q1, q2, p) {
  const c1 = (p.m1 + p.m2) * p.g * p.L1 * Math.cos(q1)
           + p.m2 * p.g * p.L2 * Math.cos(q1 + q2);
  const c2 =  p.m2 * p.g * p.L2 * Math.cos(q1 + q2);
  return [c1, c2];
}

// 2x2 matrix inverse. det = D11 D22 - D12 D21.
function invD(D) {
  const det = D[0] * D[3] - D[1] * D[2];
  return [ D[3] / det, -D[1] / det, -D[2] / det, D[0] / det ];
}

// Forward dynamics: q̈ = D⁻¹(τ − h − c).
function accel(q1, q2, qd1, qd2, tau1, tau2, p) {
  const D = massMatrix(q1, q2, p);
  const h = coriolis(q1, q2, qd1, qd2, p);
  const c = gravity(q1, q2, p);
  const r1 = tau1 - h[0] - c[0];
  const r2 = tau2 - h[1] - c[1];
  const Di = invD(D);
  return [
    Di[0] * r1 + Di[1] * r2,
    Di[2] * r1 + Di[3] * r2,
  ];
}

// Trajectory: smooth cosine-blend between two configurations.
// Returns q_d, q̇_d, q̈_d at time t (in seconds), with period T.
function trajectory(t, T, qa, qb) {
  // s(t) ∈ [0, 1] using a (1 − cos) blend, repeated each period.
  const tau = (t % T) / T;        // 0 .. 1
  const omega = 2 * Math.PI / T;
  const s   = 0.5 * (1 - Math.cos(2 * Math.PI * tau));
  const sd  = Math.PI / T * Math.sin(2 * Math.PI * tau);
  const sdd = 2 * Math.PI * Math.PI / (T * T) * Math.cos(2 * Math.PI * tau);
  return {
    q:   [qa[0] + (qb[0] - qa[0]) * s,   qa[1] + (qb[1] - qa[1]) * s  ],
    qd:  [(qb[0] - qa[0]) * sd,           (qb[1] - qa[1]) * sd         ],
    qdd: [(qb[0] - qa[0]) * sdd,          (qb[1] - qa[1]) * sdd        ],
  };
}

// Single RK4 step for the 2-link arm under torques τ.
function rk4Step(q1, q2, qd1, qd2, tau1, tau2, p, dt) {
  const f = (q1, q2, qd1, qd2) => {
    const a = accel(q1, q2, qd1, qd2, tau1, tau2, p);
    return [qd1, qd2, a[0], a[1]];
  };
  const k1 = f(q1, q2, qd1, qd2);
  const k2 = f(q1 + 0.5*dt*k1[0], q2 + 0.5*dt*k1[1], qd1 + 0.5*dt*k1[2], qd2 + 0.5*dt*k1[3]);
  const k3 = f(q1 + 0.5*dt*k2[0], q2 + 0.5*dt*k2[1], qd1 + 0.5*dt*k2[2], qd2 + 0.5*dt*k2[3]);
  const k4 = f(q1 +     dt*k3[0], q2 +     dt*k3[1], qd1 +     dt*k3[2], qd2 +     dt*k3[3]);
  return [
    q1  + (dt / 6) * (k1[0] + 2*k2[0] + 2*k3[0] + k4[0]),
    q2  + (dt / 6) * (k1[1] + 2*k2[1] + 2*k3[1] + k4[1]),
    qd1 + (dt / 6) * (k1[2] + 2*k2[2] + 2*k3[2] + k4[2]),
    qd2 + (dt / 6) * (k1[3] + 2*k2[3] + 2*k3[3] + k4[3]),
  ];
}

function worldToPxLeft(x, y) {
  return [ORIGIN_LX + x * PIX_PER_M, ORIGIN_Y - y * PIX_PER_M];
}
function worldToPxRight(x, y) {
  return [ORIGIN_RX + x * PIX_PER_M, ORIGIN_Y - y * PIX_PER_M];
}

export function mountDynamicComparison(host) {
  host.classList.add('dynamic-comparison');
  host.innerHTML = `
    <div class="dynamic-comparison-canvas">
      <svg viewBox="0 0 ${VIEW_W} ${VIEW_H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="kinematic vs dynamic comparison">
        <defs>
          <pattern id="dc-grid" width="22" height="22" patternUnits="userSpaceOnUse">
            <path d="M 22 0 L 0 0 0 22" fill="none" stroke="#eef1f4" stroke-width="0.5"/>
          </pattern>
        </defs>
        <rect x="0" y="0" width="${HALF_W}"            height="${VIEW_H}" fill="url(#dc-grid)" />
        <rect x="${HALF_W + ARM_GAP}" y="0" width="${HALF_W}" height="${VIEW_H}" fill="url(#dc-grid)" />
        <line x1="${HALF_W + ARM_GAP/2}" y1="10" x2="${HALF_W + ARM_GAP/2}" y2="${VIEW_H - 10}"
              stroke="#cbd2d8" stroke-dasharray="3 4" stroke-width="1" />
        <text x="${HALF_W/2}"            y="22" text-anchor="middle"
              font-family="ui-sans-serif, sans-serif" font-size="13" font-weight="600" fill="#a83232">
          Kinematic PD only
        </text>
        <text x="${HALF_W + ARM_GAP + HALF_W/2}" y="22" text-anchor="middle"
              font-family="ui-sans-serif, sans-serif" font-size="13" font-weight="600" fill="#1f6f3a">
          Computed-torque (with dynamics)
        </text>
        <g data-target></g>
        <g data-arm-l></g>
        <g data-arm-r></g>
      </svg>

      <svg class="dc-plot" viewBox="0 0 ${PLOT_W} ${PLOT_H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="torque plot">
        <text x="${PLOT_PAD_L}" y="14" font-family="ui-sans-serif, sans-serif" font-size="11" fill="#5e6770">Joint torques τ₁ (solid), τ₂ (dashed) — N·m</text>
        <g data-plot-axes></g>
        <g data-plot-l></g>
        <g data-plot-r></g>
      </svg>
    </div>

    <div class="dynamic-comparison-controls">
      <div class="slider-section-heading">Trajectory</div>
      <div class="slider-row">
        <div class="slider-label"><span>Cycle period</span><span class="slider-value" data-T-val>1.5 s</span></div>
        <input type="range" data-T min="0.5" max="4.0" step="0.1" value="1.5">
      </div>
      <div class="slider-section-heading">Payload</div>
      <div class="slider-row">
        <div class="slider-label"><span>Tip mass m<sub>2</sub></span><span class="slider-value" data-m2-val>1.0 kg</span></div>
        <input type="range" data-m2 min="0.1" max="5.0" step="0.1" value="1.0">
      </div>
      <div class="slider-section-heading">Controller gains</div>
      <div class="slider-row">
        <div class="slider-label"><span>K<sub>p</sub></span><span class="slider-value" data-Kp-val>80</span></div>
        <input type="range" data-Kp min="20" max="300" step="5" value="80">
      </div>
      <div class="slider-row">
        <div class="slider-label"><span>K<sub>v</sub></span><span class="slider-value" data-Kv-val>14</span></div>
        <input type="range" data-Kv min="2" max="60" step="1" value="14">
      </div>
      <div class="slider-section-heading">Tracking error</div>
      <div class="dc-error-card">
        <div class="dc-err-row">
          <span class="dc-err-label" style="color:#a83232">Kinematic RMS</span>
          <span class="mono" data-err-l>0.000 rad</span>
        </div>
        <div class="dc-err-row">
          <span class="dc-err-label" style="color:#1f6f3a">Dynamic RMS</span>
          <span class="mono" data-err-r>0.000 rad</span>
        </div>
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" data-play>Play ▶</button>
        <button class="btn" data-reset>Reset</button>
      </div>
      <div class="dc-hint">
        Both arms start in the same place and chase the same target. Increase the payload or shrink the period — the kinematic arm sags under gravity, overshoots its turn-around, and oscillates. The computed-torque arm pre-compensates and stays on the line.
      </div>
    </div>
  `;

  // ---- bindings ----
  const svgRoot   = host.querySelector('svg');
  const armLG     = svgRoot.querySelector('[data-arm-l]');
  const armRG     = svgRoot.querySelector('[data-arm-r]');
  const targetG   = svgRoot.querySelector('[data-target]');
  const plotSvg   = host.querySelector('.dc-plot');
  const plotAxes  = plotSvg.querySelector('[data-plot-axes]');
  const plotL     = plotSvg.querySelector('[data-plot-l]');
  const plotR     = plotSvg.querySelector('[data-plot-r]');

  const TSlider   = host.querySelector('[data-T]');
  const m2Slider  = host.querySelector('[data-m2]');
  const KpSlider  = host.querySelector('[data-Kp]');
  const KvSlider  = host.querySelector('[data-Kv]');
  const TVal      = host.querySelector('[data-T-val]');
  const m2Val     = host.querySelector('[data-m2-val]');
  const KpVal     = host.querySelector('[data-Kp-val]');
  const KvVal     = host.querySelector('[data-Kv-val]');
  const errLEl    = host.querySelector('[data-err-l]');
  const errREl    = host.querySelector('[data-err-r]');
  const playBtn   = host.querySelector('[data-play]');
  const resetBtn  = host.querySelector('[data-reset]');

  // ---- state ----
  // Two configurations to swing between (radians).
  const QA = [ 70 * D2R,  -45 * D2R];
  const QB = [110 * D2R,   45 * D2R];

  const state = {
    t: 0,
    running: false,
    L: { q1: QA[0], q2: QA[1], qd1: 0, qd2: 0 },
    R: { q1: QA[0], q2: QA[1], qd1: 0, qd2: 0 },
    history: [],         // {t, tauL1, tauL2, tauR1, tauR2}
    errSqL: 0, errSqR: 0, samples: 0,
    params: { ...DEFAULTS },
  };

  function readParams() {
    const T = parseFloat(TSlider.value);
    state.params.m2 = parseFloat(m2Slider.value);
    state.params.Kp = parseFloat(KpSlider.value);
    state.params.Kv = parseFloat(KvSlider.value);
    TVal.textContent  = `${T.toFixed(1)} s`;
    m2Val.textContent = `${state.params.m2.toFixed(1)} kg`;
    KpVal.textContent = state.params.Kp.toFixed(0);
    KvVal.textContent = state.params.Kv.toFixed(0);
    return T;
  }

  // ---- controllers ----
  // Kinematic (PD-only) controller: τ = Kp(q_d − q) + Kv(q̇_d − q̇).
  function tauKinematic(arm, ref, p) {
    const e1 = ref.q[0]  - arm.q1, e2 = ref.q[1]  - arm.q2;
    const ed1 = ref.qd[0] - arm.qd1, ed2 = ref.qd[1] - arm.qd2;
    return [p.Kp * e1 + p.Kv * ed1, p.Kp * e2 + p.Kv * ed2];
  }
  // Computed-torque controller: τ = D(q̈_d + Kp·e + Kv·ė) + h + c.
  function tauComputedTorque(arm, ref, p) {
    const e1 = ref.q[0]  - arm.q1,  e2 = ref.q[1]  - arm.q2;
    const ed1 = ref.qd[0] - arm.qd1, ed2 = ref.qd[1] - arm.qd2;
    const v1 = ref.qdd[0] + p.Kp * e1 + p.Kv * ed1;
    const v2 = ref.qdd[1] + p.Kp * e2 + p.Kv * ed2;
    const D = massMatrix(arm.q1, arm.q2, p);
    const h = coriolis(arm.q1, arm.q2, arm.qd1, arm.qd2, p);
    const c = gravity(arm.q1, arm.q2, p);
    return [D[0]*v1 + D[1]*v2 + h[0] + c[0],
            D[2]*v1 + D[3]*v2 + h[1] + c[1]];
  }

  // ---- simulation step (called from rAF loop) ----
  const SUBSTEPS = 4;
  const DT_MAX   = 1 / 60;

  function step(realDt) {
    const T = readParams();
    const dt = Math.min(realDt, DT_MAX) / SUBSTEPS;

    for (let i = 0; i < SUBSTEPS; i++) {
      const ref = trajectory(state.t, T, QA, QB);

      // Kinematic arm
      const tauL = tauKinematic(state.L, ref, state.params);
      const stL = rk4Step(state.L.q1, state.L.q2, state.L.qd1, state.L.qd2,
                          tauL[0], tauL[1], state.params, dt);
      state.L = { q1: stL[0], q2: stL[1], qd1: stL[2], qd2: stL[3] };

      // Dynamic arm
      const tauR = tauComputedTorque(state.R, ref, state.params);
      const stR = rk4Step(state.R.q1, state.R.q2, state.R.qd1, state.R.qd2,
                          tauR[0], tauR[1], state.params, dt);
      state.R = { q1: stR[0], q2: stR[1], qd1: stR[2], qd2: stR[3] };

      // Error stats (RMS over running window)
      const eL1 = state.L.q1 - ref.q[0], eL2 = state.L.q2 - ref.q[1];
      const eR1 = state.R.q1 - ref.q[0], eR2 = state.R.q2 - ref.q[1];
      state.errSqL += eL1*eL1 + eL2*eL2;
      state.errSqR += eR1*eR1 + eR2*eR2;
      state.samples++;

      // Push torque history (decimated to 1 per substep cluster)
      if (i === SUBSTEPS - 1) {
        state.history.push({
          t: state.t,
          tauL1: tauL[0], tauL2: tauL[1],
          tauR1: tauR[0], tauR2: tauR[1],
        });
        // trim
        const keepFrom = state.t - PLOT_HISTORY_S;
        while (state.history.length && state.history[0].t < keepFrom) state.history.shift();
      }

      state.t += dt;
    }
  }

  // ---- rendering ----
  function renderArms() {
    const ref = trajectory(state.t, parseFloat(TSlider.value), QA, QB);
    const refFkL = fk(ref.q[0], ref.q[1], state.params.L1, state.params.L2);
    const refFkR = fk(ref.q[0], ref.q[1], state.params.L1, state.params.L2);
    const [tlx, tly] = worldToPxLeft (refFkL.tx, refFkL.ty);
    const [trx, try_] = worldToPxRight(refFkR.tx, refFkR.ty);
    targetG.innerHTML = `
      <circle cx="${tlx}" cy="${tly}" r="6" fill="none" stroke="#7a8590" stroke-dasharray="3 3" />
      <circle cx="${trx}" cy="${try_}" r="6" fill="none" stroke="#7a8590" stroke-dasharray="3 3" />
    `;

    armLG.innerHTML = drawArm(state.L, '#a83232', worldToPxLeft);
    armRG.innerHTML = drawArm(state.R, '#1f6f3a', worldToPxRight);
  }

  function drawArm(arm, colour, mapper) {
    const f = fk(arm.q1, arm.q2, state.params.L1, state.params.L2);
    const [bx, by] = mapper(0, 0);
    const [ex, ey] = mapper(f.ex, f.ey);
    const [tx, ty] = mapper(f.tx, f.ty);
    return `
      <line x1="${bx}" y1="${by}" x2="${ex}" y2="${ey}" stroke="${colour}" stroke-width="6" stroke-linecap="round" opacity="0.85" />
      <line x1="${ex}" y1="${ey}" x2="${tx}" y2="${ty}" stroke="${colour}" stroke-width="5" stroke-linecap="round" opacity="0.85" />
      <circle cx="${bx}" cy="${by}" r="6" fill="${colour}" stroke="white" stroke-width="2" />
      <circle cx="${ex}" cy="${ey}" r="5" fill="${colour}" stroke="white" stroke-width="2" />
      <circle cx="${tx}" cy="${ty}" r="5" fill="${colour}" stroke="white" stroke-width="2" />
    `;
  }

  function renderPlot() {
    if (state.history.length < 2) {
      plotL.innerHTML = ''; plotR.innerHTML = ''; plotAxes.innerHTML = '';
      return;
    }
    const tNow = state.t;
    const tStart = Math.max(0, tNow - PLOT_HISTORY_S);
    const xRange = PLOT_W - PLOT_PAD_L - PLOT_PAD_R;
    const xMap = t => PLOT_PAD_L + (t - tStart) / PLOT_HISTORY_S * xRange;

    // y range — symmetric, auto-scaled to history
    let yMax = 5;
    for (const r of state.history) {
      yMax = Math.max(yMax, Math.abs(r.tauL1), Math.abs(r.tauL2),
                            Math.abs(r.tauR1), Math.abs(r.tauR2));
    }
    yMax *= 1.1;
    const yRange = PLOT_H - PLOT_PAD_T - PLOT_PAD_B;
    const yMid   = PLOT_PAD_T + yRange / 2;
    const yMap = v => yMid - (v / yMax) * (yRange / 2);

    // Axes
    plotAxes.innerHTML = `
      <line x1="${PLOT_PAD_L}" y1="${yMid}" x2="${PLOT_W - PLOT_PAD_R}" y2="${yMid}" stroke="#cbd2d8" stroke-width="0.5" />
      <line x1="${PLOT_PAD_L}" y1="${PLOT_PAD_T}" x2="${PLOT_PAD_L}" y2="${PLOT_H - PLOT_PAD_B}" stroke="#cbd2d8" stroke-width="0.5" />
      <text x="${PLOT_PAD_L - 4}" y="${PLOT_PAD_T + 8}" text-anchor="end" font-family="ui-monospace, monospace" font-size="9" fill="#7a8590">${yMax.toFixed(0)}</text>
      <text x="${PLOT_PAD_L - 4}" y="${yMid + 3}"        text-anchor="end" font-family="ui-monospace, monospace" font-size="9" fill="#7a8590">0</text>
      <text x="${PLOT_PAD_L - 4}" y="${PLOT_H - PLOT_PAD_B}" text-anchor="end" font-family="ui-monospace, monospace" font-size="9" fill="#7a8590">−${yMax.toFixed(0)}</text>
      <text x="${PLOT_W - PLOT_PAD_R}" y="${PLOT_H - 6}" text-anchor="end" font-family="ui-sans-serif, sans-serif" font-size="9" fill="#7a8590">last ${PLOT_HISTORY_S.toFixed(1)}s →</text>
    `;

    const buildPath = (key) => {
      let d = '';
      state.history.forEach((r, i) => {
        const x = xMap(r.t), y = yMap(r[key]);
        d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
      });
      return d;
    };
    plotL.innerHTML = `
      <path d="${buildPath('tauL1')}" stroke="#a83232" stroke-width="1.5" fill="none" />
      <path d="${buildPath('tauL2')}" stroke="#a83232" stroke-width="1.2" stroke-dasharray="3 2" fill="none" opacity="0.8" />
    `;
    plotR.innerHTML = `
      <path d="${buildPath('tauR1')}" stroke="#1f6f3a" stroke-width="1.5" fill="none" />
      <path d="${buildPath('tauR2')}" stroke="#1f6f3a" stroke-width="1.2" stroke-dasharray="3 2" fill="none" opacity="0.8" />
    `;
  }

  function renderErrors() {
    if (state.samples === 0) { errLEl.textContent = '0.000 rad'; errREl.textContent = '0.000 rad'; return; }
    const rmsL = Math.sqrt(state.errSqL / state.samples / 2);
    const rmsR = Math.sqrt(state.errSqR / state.samples / 2);
    errLEl.textContent = `${rmsL.toFixed(3)} rad`;
    errREl.textContent = `${rmsR.toFixed(3)} rad`;
  }

  // ---- animation loop ----
  let lastTs = 0, raf = null;
  function loop(ts) {
    if (!state.running) { raf = null; return; }
    const realDt = lastTs ? Math.min((ts - lastTs) / 1000, DT_MAX) : 1/60;
    lastTs = ts;
    step(realDt);
    renderArms();
    renderPlot();
    renderErrors();
    raf = requestAnimationFrame(loop);
  }

  // ---- controls ----
  function play() {
    if (state.running) return;
    state.running = true;
    lastTs = 0;
    playBtn.textContent = 'Pause ⏸';
    raf = requestAnimationFrame(loop);
  }
  function pause() {
    state.running = false;
    playBtn.textContent = 'Play ▶';
  }
  function reset() {
    pause();
    state.t = 0;
    state.L = { q1: QA[0], q2: QA[1], qd1: 0, qd2: 0 };
    state.R = { q1: QA[0], q2: QA[1], qd1: 0, qd2: 0 };
    state.history = [];
    state.errSqL = 0; state.errSqR = 0; state.samples = 0;
    renderArms(); renderPlot(); renderErrors();
  }

  playBtn.addEventListener('click', () => state.running ? pause() : play());
  resetBtn.addEventListener('click', reset);
  [TSlider, m2Slider, KpSlider, KvSlider].forEach(s => s.addEventListener('input', () => {
    readParams();
    if (!state.running) renderArms();
  }));

  readParams();
  renderArms();
  renderPlot();
  renderErrors();
  return { play, pause, reset };
}
