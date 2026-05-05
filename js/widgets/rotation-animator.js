// ============================================================
// rotation-animator.js
// Take a point a in the mobile frame, watch it move as the
// frame rotates around one of the fixed axes. Single slider
// for theta, live numeric readout of a_xyz = R(theta) · a_uvw,
// and a 3D scene with the moving frame plus the point.
// ------------------------------------------------------------
// Usage:
//
//   <div data-rotation-animator
//        data-axis="x"
//        data-point="0.3,0.4,0.5"></div>
// ============================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const COLOR = {
  x: 0xe53935, y: 0x43a047, z: 0x1e88e5,
  u: 0xff8a00, v: 0x8e24aa, w: 0x00acc1,
  point: 0x2F5496,
};

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
    const lbl = makeLabel(labels[i], colors[i]);
    lbl.position.copy(dir).multiplyScalar(length + 0.18);
    group.add(lbl);
  });
  return group;
}

function rotMatrix(axis, thetaDeg) {
  const m = new THREE.Matrix4();
  if (axis === 'x') m.makeRotationX(THREE.MathUtils.degToRad(thetaDeg));
  else if (axis === 'y') m.makeRotationY(THREE.MathUtils.degToRad(thetaDeg));
  else m.makeRotationZ(THREE.MathUtils.degToRad(thetaDeg));
  return m;
}

function applyMatrix(m, v) {
  return v.clone().applyMatrix4(m);
}

export function mountRotationAnimator(host) {
  const axis = (host.dataset.axis || 'x').toLowerCase();
  const point = (host.dataset.point || '0.3,0.4,0.5').split(',').map(Number);
  const a_uvw = new THREE.Vector3(...point);

  // ---- DOM ----
  host.classList.add('animator');

  const canvasWrap = document.createElement('div');
  canvasWrap.className = 'frame-viewer-canvas';
  host.appendChild(canvasWrap);

  const stats = document.createElement('div');
  stats.className = 'animator-stats';
  stats.innerHTML = `
    <div class="slider-row">
      <label class="slider-label">
        <span>θ around <strong style="color:${'#' + COLOR[axis].toString(16).padStart(6, '0')}">${axis}</strong></span>
        <span class="slider-value" data-theta>0°</span>
      </label>
      <input type="range" min="0" max="360" step="1" value="0" data-slider>
    </div>
    <div>
      <div class="slider-label" style="margin-bottom:6px"><span>a (mobile, fixed input)</span></div>
      <div class="stat-row"><span class="stat-label">a_u</span><span class="stat-value">${point[0]}</span></div>
      <div class="stat-row"><span class="stat-label">a_v</span><span class="stat-value">${point[1]}</span></div>
      <div class="stat-row"><span class="stat-label">a_w</span><span class="stat-value">${point[2]}</span></div>
    </div>
    <div>
      <div class="slider-label" style="margin-bottom:6px"><span>a (fixed-frame coords)</span></div>
      <div class="stat-row"><span class="stat-label">a_x</span><span class="stat-value" data-ax>—</span></div>
      <div class="stat-row"><span class="stat-label">a_y</span><span class="stat-value" data-ay>—</span></div>
      <div class="stat-row"><span class="stat-label">a_z</span><span class="stat-value" data-az>—</span></div>
    </div>
    <div class="btn-row">
      <button class="btn" data-play>▶ Play</button>
      <button class="btn" data-reset>Reset</button>
    </div>
  `;
  host.appendChild(stats);

  const slider = stats.querySelector('[data-slider]');
  const thetaLabel = stats.querySelector('[data-theta]');
  const axOut = stats.querySelector('[data-ax]');
  const ayOut = stats.querySelector('[data-ay]');
  const azOut = stats.querySelector('[data-az]');
  const btnPlay = stats.querySelector('[data-play]');
  const btnReset = stats.querySelector('[data-reset]');

  // ---- Scene ----
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(2.4, 2.0, 2.8);

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

  const grid = new THREE.GridHelper(4, 16, 0xc8c2b4, 0xddd6c4);
  scene.add(grid);

  const fixed = makeFrame(['x', 'y', 'z'], [COLOR.x, COLOR.y, COLOR.z], 1.0);
  scene.add(fixed);

  const mobile = makeFrame(['u', 'v', 'w'], [COLOR.u, COLOR.v, COLOR.w], 0.95);
  scene.add(mobile);

  // The point a — sphere + line from origin
  const pointSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 24, 24),
    new THREE.MeshBasicMaterial({ color: COLOR.point }),
  );
  scene.add(pointSphere);

  const pointLine = (() => {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0), a_uvw.clone(),
    ]);
    const mat = new THREE.LineDashedMaterial({ color: COLOR.point, dashSize: 0.05, gapSize: 0.04, linewidth: 2 });
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    return line;
  })();
  scene.add(pointLine);

  // Trail of where the point has been (visual breadcrumb)
  const trailGeo = new THREE.BufferGeometry();
  const trailMat = new THREE.LineBasicMaterial({ color: COLOR.point, transparent: true, opacity: 0.45 });
  const trailPositions = new Float32Array(361 * 3);
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
  trailGeo.setDrawRange(0, 0);
  const trail = new THREE.Line(trailGeo, trailMat);
  scene.add(trail);

  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true;
  orbit.enablePan = false;
  orbit.minDistance = 1.5;
  orbit.maxDistance = 8;

  function update(theta) {
    thetaLabel.textContent = `${Math.round(theta)}°`;

    const m = rotMatrix(axis, theta);
    mobile.matrix.copy(m);
    mobile.matrixAutoUpdate = false;

    const a_xyz = applyMatrix(m, a_uvw);
    pointSphere.position.copy(a_xyz);

    // Rebuild dashed line from origin to point
    pointLine.geometry.setFromPoints([new THREE.Vector3(0, 0, 0), a_xyz.clone()]);
    pointLine.computeLineDistances();

    // Update trail up to the current angle
    const count = Math.floor(theta) + 1;
    for (let i = 0; i < count; i++) {
      const v = applyMatrix(rotMatrix(axis, i), a_uvw);
      trailPositions[i * 3 + 0] = v.x;
      trailPositions[i * 3 + 1] = v.y;
      trailPositions[i * 3 + 2] = v.z;
    }
    trail.geometry.attributes.position.needsUpdate = true;
    trail.geometry.setDrawRange(0, count);

    axOut.textContent = a_xyz.x.toFixed(4);
    ayOut.textContent = a_xyz.y.toFixed(4);
    azOut.textContent = a_xyz.z.toFixed(4);
  }

  slider.addEventListener('input', () => update(parseFloat(slider.value)));
  btnReset.addEventListener('click', () => { slider.value = 0; update(0); });

  // Play loop
  let playing = false;
  let raf;
  btnPlay.addEventListener('click', () => {
    playing = !playing;
    btnPlay.textContent = playing ? '⏸ Pause' : '▶ Play';
    if (playing) tick();
  });
  function tick() {
    if (!playing) return;
    let v = (parseFloat(slider.value) + 1) % 361;
    slider.value = v;
    update(v);
    raf = requestAnimationFrame(tick);
  }

  update(0);

  function animate() {
    orbit.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();

  return { update };
}
