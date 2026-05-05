// ============================================================
// frame-viewer.js
// Two coordinate frames in 3D — fixed (xyz) and mobile (uvw) —
// with sliders to rotate the mobile frame around any of the
// fixed axes, and a live readout of the resulting 3x3 rotation.
// ------------------------------------------------------------
// Usage (in a lecture page):
//
//   <div data-frame-viewer
//        data-axes="x,y,z"
//        data-show-matrix="true"
//        data-initial="0,0,0"></div>
//
//   import { mountFrameViewer } from '../js/widgets/frame-viewer.js';
//   document.querySelectorAll('[data-frame-viewer]').forEach(mountFrameViewer);
// ============================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const RADIUS = 0.04;
const HEAD = 0.12;
const HEAD_W = 0.08;

const COLOR = {
  x: 0xe53935, y: 0x43a047, z: 0x1e88e5,
  u: 0xff8a00, v: 0x8e24aa, w: 0x00acc1,
};

const AXIS_LABELS = {
  fixed: ['x', 'y', 'z'],
  mobile: ['u', 'v', 'w'],
};

function makeArrow(dir, color, length = 1) {
  const arrow = new THREE.ArrowHelper(
    dir.clone().normalize(),
    new THREE.Vector3(0, 0, 0),
    length,
    color,
    HEAD,
    HEAD_W,
  );
  // thicken the line
  arrow.line.material = new THREE.LineBasicMaterial({ color, linewidth: 2 });
  return arrow;
}

function makeLabel(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 44px Inter, sans-serif';
  ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 32, 32);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.18, 0.18, 1);
  return sprite;
}

function makeFrame(labels, colors, length = 1) {
  const group = new THREE.Group();
  const dirs = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, 1),
  ];
  dirs.forEach((dir, i) => {
    const arrow = makeArrow(dir, colors[i], length);
    group.add(arrow);
    const label = makeLabel(labels[i], colors[i]);
    label.position.copy(dir).multiplyScalar(length + 0.18);
    group.add(label);
  });
  return group;
}

// Build a rotation matrix Rx*Ry*Rz given Euler angles (degrees).
// We compose right-to-left like the course: result = Rx · Ry · Rz
function composeRotation(rxDeg, ryDeg, rzDeg) {
  const m = new THREE.Matrix4();
  const ex = new THREE.Matrix4().makeRotationX(THREE.MathUtils.degToRad(rxDeg));
  const ey = new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(ryDeg));
  const ez = new THREE.Matrix4().makeRotationZ(THREE.MathUtils.degToRad(rzDeg));
  m.copy(ex).multiply(ey).multiply(ez);
  return m;
}

function format(num) {
  if (Math.abs(num) < 1e-4) return ' 0.0000';
  return (num >= 0 ? ' ' : '') + num.toFixed(4);
}

function formatMatrix(m) {
  // m is THREE.Matrix4; we want the 3x3 rotation block.
  const e = m.elements; // column-major
  const rows = [
    [e[0], e[4], e[8]],
    [e[1], e[5], e[9]],
    [e[2], e[6], e[10]],
  ];
  return rows.map(r => r.map(format).join('  ')).join('\n');
}

export function mountFrameViewer(host) {
  const axes = (host.dataset.axes || 'x,y,z').split(',').map(s => s.trim());
  const showMatrix = host.dataset.showMatrix !== 'false';
  const initial = (host.dataset.initial || '0,0,0').split(',').map(Number);
  const isWide = host.dataset.wide !== 'false';

  // ---- DOM scaffold ----
  host.classList.add('frame-viewer');
  if (isWide) host.classList.add('is-wide');

  const canvasWrap = document.createElement('div');
  canvasWrap.className = 'frame-viewer-canvas';
  host.appendChild(canvasWrap);

  const legend = document.createElement('div');
  legend.className = 'frame-viewer-legend';
  legend.innerHTML = `
    <div class="frame-viewer-legend-row"><span class="frame-viewer-swatch" style="background:#e53935"></span>x · y · z (fixed)</div>
    <div class="frame-viewer-legend-row"><span class="frame-viewer-swatch" style="background:#ff8a00"></span>u · v · w (mobile)</div>
  `;
  canvasWrap.appendChild(legend);

  const controls = document.createElement('div');
  controls.className = 'frame-viewer-controls';
  host.appendChild(controls);

  // sliders
  const sliders = {};
  const axisColors = { x: '#e53935', y: '#43a047', z: '#1e88e5' };
  axes.forEach((axis, i) => {
    const row = document.createElement('div');
    row.className = 'slider-row';
    row.innerHTML = `
      <label class="slider-label">
        <span>Rotate around <strong style="color:${axisColors[axis]}">${axis}</strong></span>
        <span class="slider-value" data-value-${axis}>0°</span>
      </label>
      <input type="range" min="-180" max="180" step="1" value="${initial[i] || 0}" data-axis="${axis}">
    `;
    controls.appendChild(row);
    sliders[axis] = {
      input: row.querySelector('input'),
      value: row.querySelector(`[data-value-${axis}]`),
    };
  });

  // matrix display
  let matrixOut;
  if (showMatrix) {
    const wrap = document.createElement('div');
    wrap.className = 'slider-row';
    wrap.innerHTML = `
      <div class="slider-label"><span>Rotation matrix R</span></div>
      <pre class="matrix-display" data-matrix></pre>
    `;
    controls.appendChild(wrap);
    matrixOut = wrap.querySelector('[data-matrix]');
  }

  // reset
  const btnRow = document.createElement('div');
  btnRow.className = 'btn-row';
  btnRow.innerHTML = `<button class="btn" data-reset>Reset</button>`;
  controls.appendChild(btnRow);

  // ---- Three.js scene ----
  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(2.4, 2.0, 2.8);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  canvasWrap.appendChild(renderer.domElement);

  // resize observer keeps it sharp on layout changes
  const ro = new ResizeObserver(() => {
    const r = canvasWrap.getBoundingClientRect();
    if (r.width === 0) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
  });
  ro.observe(canvasWrap);

  // grid floor (subtle)
  const grid = new THREE.GridHelper(4, 16, 0xc8c2b4, 0xddd6c4);
  grid.position.y = -0.001;
  scene.add(grid);

  // origin dot
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.025, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x333333 }),
  );
  scene.add(dot);

  // fixed frame
  const fixedFrame = makeFrame(AXIS_LABELS.fixed, [COLOR.x, COLOR.y, COLOR.z], 1.0);
  scene.add(fixedFrame);

  // mobile frame
  const mobileFrame = makeFrame(AXIS_LABELS.mobile, [COLOR.u, COLOR.v, COLOR.w], 0.95);
  scene.add(mobileFrame);

  // orbit controls (for the camera)
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.1;
  orbit.enablePan = false;
  orbit.minDistance = 1.5;
  orbit.maxDistance = 8;

  // ---- update loop ----
  function update() {
    const angles = { x: 0, y: 0, z: 0 };
    Object.keys(sliders).forEach(axis => {
      angles[axis] = parseFloat(sliders[axis].input.value);
      sliders[axis].value.textContent = `${Math.round(angles[axis])}°`;
    });
    const m = composeRotation(angles.x, angles.y, angles.z);
    mobileFrame.matrix.copy(m);
    mobileFrame.matrixAutoUpdate = false;

    if (matrixOut) matrixOut.textContent = formatMatrix(m);
  }

  Object.values(sliders).forEach(s => {
    s.input.addEventListener('input', update);
  });
  btnRow.querySelector('[data-reset]').addEventListener('click', () => {
    Object.values(sliders).forEach(s => { s.input.value = 0; });
    update();
  });

  update();

  // animate
  function animate() {
    orbit.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();

  return { update };
}
