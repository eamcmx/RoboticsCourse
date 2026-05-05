// ============================================================
// composite-viewer.js
//
// Sequential transformation composer. Each step is one elementary
// motion: a rotation or translation around a chosen axis. The axis
// can be either a *fixed* world axis (X, Y, Z) or a *mobile* current
// frame axis (U, V, W) — and the difference is the whole point of
// this widget.
//
// Composition rule:
//   • X / Y / Z (fixed-axis):  composite = T_step · composite   (premultiply)
//   • U / V / W (mobile-axis): composite = composite · T_step   (postmultiply)
// Steps are applied in row order, top to bottom.
// ------------------------------------------------------------
// Usage:
//   <div data-composite-viewer
//        data-steps="3"
//        data-allow-translation="true"></div>
// ============================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const COLOR = {
  x: 0xe53935, y: 0x43a047, z: 0x1e88e5,
  u: 0xff8a00, v: 0x8e24aa, w: 0x00acc1,
};

const D2R = THREE.MathUtils.degToRad;

function makeArrow(dir, color, length = 1) {
  return new THREE.ArrowHelper(
    dir.clone().normalize(),
    new THREE.Vector3(0, 0, 0),
    length, color, 0.1, 0.07,
  );
}

function makeLabel(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 44px Inter, sans-serif';
  ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 32, 32);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sprite.scale.set(0.18, 0.18, 1);
  return sprite;
}

function makeFrame(labels, colors, length = 1) {
  const group = new THREE.Group();
  const dirs = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
  dirs.forEach((dir, i) => {
    group.add(makeArrow(dir, colors[i], length));
    if (labels[i]) {
      const lbl = makeLabel(labels[i], colors[i]);
      lbl.position.copy(dir).multiplyScalar(length + 0.18);
      group.add(lbl);
    }
  });
  return group;
}

function fmt(num) {
  if (Math.abs(num) < 1e-4) return ' 0.0000';
  return (num >= 0 ? ' ' : '') + num.toFixed(4);
}

function format4x4(m) {
  const e = m.elements;
  const rows = [
    [e[0], e[4], e[8], e[12]],
    [e[1], e[5], e[9], e[13]],
    [e[2], e[6], e[10], e[14]],
    [e[3], e[7], e[11], e[15]],
  ];
  return rows.map(r => r.map(fmt).join('  ')).join('\n');
}

export function mountCompositeViewer(host) {
  const numSteps = parseInt(host.dataset.steps || '3', 10);
  const allowTranslation = host.dataset.allowTranslation !== 'false';
  const showMatrix = host.dataset.showMatrix !== 'false';

  host.classList.add('composite-viewer');

  // ---- DOM ----
  const canvasWrap = document.createElement('div');
  canvasWrap.className = 'frame-viewer-canvas';
  host.appendChild(canvasWrap);

  const legend = document.createElement('div');
  legend.className = 'frame-viewer-legend';
  legend.innerHTML = `
    <div class="frame-viewer-legend-row"><span class="frame-viewer-swatch" style="background:#e53935"></span>fixed (X · Y · Z)</div>
    <div class="frame-viewer-legend-row"><span class="frame-viewer-swatch" style="background:#ff8a00"></span>mobile (U · V · W)</div>
  `;
  canvasWrap.appendChild(legend);

  const sidebar = document.createElement('div');
  sidebar.className = 'composite-viewer-sidebar';
  host.appendChild(sidebar);

  const stepsBox = document.createElement('div');
  stepsBox.className = 'composite-steps';
  sidebar.appendChild(stepsBox);

  const stepEls = [];
  for (let i = 0; i < numSteps; i++) {
    const step = document.createElement('div');
    step.className = 'composite-step';
    step.innerHTML = `
      <div class="composite-step-header">
        <span class="composite-step-num">Step ${i + 1}</span>
        ${allowTranslation
          ? `<select data-key="kind">
               <option value="rot">Rotate</option>
               <option value="trans">Translate</option>
             </select>`
          : `<span class="composite-step-fixedlabel">Rotate</span>`}
        <span class="composite-step-around">around</span>
        <div class="composite-axis-row" data-key="axis">
          <label class="composite-axis fixed"><input type="radio" name="axis-${i}" value="x" checked><span style="color:#e53935">X</span></label>
          <label class="composite-axis fixed"><input type="radio" name="axis-${i}" value="y"><span style="color:#43a047">Y</span></label>
          <label class="composite-axis fixed"><input type="radio" name="axis-${i}" value="z"><span style="color:#1e88e5">Z</span></label>
          <span class="composite-axis-divider">|</span>
          <label class="composite-axis mobile"><input type="radio" name="axis-${i}" value="u"><span style="color:#ff8a00">U</span></label>
          <label class="composite-axis mobile"><input type="radio" name="axis-${i}" value="v"><span style="color:#8e24aa">V</span></label>
          <label class="composite-axis mobile"><input type="radio" name="axis-${i}" value="w"><span style="color:#00acc1">W</span></label>
        </div>
      </div>
      <div class="slider-row">
        <label class="slider-label">
          <span class="composite-step-tag" data-key="tag">…</span>
          <span class="slider-value" data-key="value">0°</span>
        </label>
        <input type="range" data-key="slider" min="-180" max="180" step="1" value="0">
      </div>
    `;
    stepsBox.appendChild(step);
    stepEls.push(step);
  }

  let matrixOut;
  if (showMatrix) {
    const m = document.createElement('div');
    m.className = 'slider-row';
    m.innerHTML = `
      <div class="slider-label"><span>Composite transform M</span></div>
      <pre class="matrix-display" data-matrix></pre>
    `;
    sidebar.appendChild(m);
    matrixOut = m.querySelector('[data-matrix]');
  }

  const btnRow = document.createElement('div');
  btnRow.className = 'btn-row';
  btnRow.innerHTML = '<button class="btn" data-reset>Reset all steps</button>';
  sidebar.appendChild(btnRow);

  // ---- Scene ----
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(2.6, 2.2, 3.0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  canvasWrap.appendChild(renderer.domElement);

  const ro = new ResizeObserver(() => {
    const r = canvasWrap.getBoundingClientRect();
    if (r.width === 0) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
  });
  ro.observe(canvasWrap);

  scene.add(new THREE.GridHelper(6, 24, 0xc8c2b4, 0xddd6c4));
  const fixedFrame = makeFrame(['X', 'Y', 'Z'], [COLOR.x, COLOR.y, COLOR.z], 1.0);
  scene.add(fixedFrame);
  const mobileFrame = makeFrame(['U', 'V', 'W'], [COLOR.u, COLOR.v, COLOR.w], 0.95);
  scene.add(mobileFrame);

  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true;
  orbit.enablePan = false;
  orbit.minDistance = 1.5;
  orbit.maxDistance = 10;

  // ---- Per-step control logic ----
  const steps = stepEls.map((el, i) => ({
    el,
    kindEl:  el.querySelector('select[data-key="kind"]'),
    axisInputs: el.querySelectorAll(`input[name="axis-${i}"]`),
    slider:  el.querySelector('input[data-key="slider"]'),
    tag:     el.querySelector('[data-key="tag"]'),
    value:   el.querySelector('[data-key="value"]'),
  }));

  function readStep(s) {
    const kind = s.kindEl ? s.kindEl.value : 'rot';
    const checked = [...s.axisInputs].find(r => r.checked);
    const axis = checked ? checked.value : 'x';
    const v = parseFloat(s.slider.value);
    return { kind, axis, value: v };
  }

  function elementaryMatrix({ kind, axis, value }) {
    const m = new THREE.Matrix4();
    if (kind === 'rot') {
      const rad = D2R(value);
      switch (axis) {
        case 'x': case 'u': m.makeRotationX(rad); break;
        case 'y': case 'v': m.makeRotationY(rad); break;
        case 'z': case 'w': m.makeRotationZ(rad); break;
      }
    } else { // translation
      switch (axis) {
        case 'x': case 'u': m.makeTranslation(value / 100, 0, 0); break;
        case 'y': case 'v': m.makeTranslation(0, value / 100, 0); break;
        case 'z': case 'w': m.makeTranslation(0, 0, value / 100); break;
      }
    }
    return m;
  }

  function isFixedAxis(axis) {
    return axis === 'x' || axis === 'y' || axis === 'z';
  }

  function update() {
    const composite = new THREE.Matrix4(); // identity

    steps.forEach(s => {
      const { kind, axis, value } = readStep(s);

      // Sync slider range/units to current step kind:
      const isRot = kind === 'rot';
      if (isRot && s.slider.min !== '-180') {
        s.slider.min = '-180'; s.slider.max = '180'; s.slider.step = '1';
        if (parseFloat(s.slider.value) > 180) s.slider.value = '180';
        if (parseFloat(s.slider.value) < -180) s.slider.value = '-180';
      } else if (!isRot && s.slider.min !== '-200') {
        s.slider.min = '-200'; s.slider.max = '200'; s.slider.step = '5';
      }

      const axisLabel = axis.toUpperCase();
      const fixed = isFixedAxis(axis);
      s.tag.innerHTML = isRot
        ? `Rotate around <strong>${axisLabel}</strong> (${fixed ? 'fixed' : 'mobile'})`
        : `Translate along <strong>${axisLabel}</strong> (${fixed ? 'fixed' : 'mobile'})`;
      s.value.textContent = isRot
        ? `${Math.round(value)}°`
        : `${(value / 100).toFixed(2)}`;

      const T = elementaryMatrix({ kind, axis, value: parseFloat(s.slider.value) });
      if (fixed) {
        // premultiply: composite = T · composite
        composite.premultiply(T);
      } else {
        // postmultiply: composite = composite · T
        composite.multiply(T);
      }
    });

    mobileFrame.matrix.copy(composite);
    mobileFrame.matrixAutoUpdate = false;

    if (matrixOut) matrixOut.textContent = format4x4(composite);
  }

  steps.forEach(s => {
    if (s.kindEl) s.kindEl.addEventListener('change', update);
    s.axisInputs.forEach(r => r.addEventListener('change', update));
    s.slider.addEventListener('input', update);
  });

  btnRow.querySelector('[data-reset]').addEventListener('click', () => {
    steps.forEach(s => {
      if (s.kindEl) s.kindEl.value = 'rot';
      [...s.axisInputs].forEach((r, j) => { r.checked = j === 0; });
      s.slider.value = 0;
    });
    update();
  });

  update();

  function animate() {
    orbit.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();

  return { update };
}
