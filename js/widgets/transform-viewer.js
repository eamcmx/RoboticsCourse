// ============================================================
// transform-viewer.js
// Full 4×4 homogeneous-transform viewer. Six sliders drive
// rotation around the fixed x, y, z axes (under the same
// fixed-axis convention as frame-viewer.js) plus translation
// along x, y, z. The 3D scene shows the fixed frame and the
// mobile frame at T. The numeric 4×4 is displayed live.
//
// Optional features:
//   data-show-inverse="true"
//     Display T⁻¹ alongside T.
//   data-show-roundtrip="true"
//     Render a third frame at T⁻¹·T applied to the fixed frame.
//     If everything is correct it always overlays the fixed
//     frame exactly — a visual proof that T·T⁻¹ = I.
//   data-axes="x,y,z"           which rotation sliders to show
//   data-translate-axes="x,y,z" which translation sliders to show
//   data-initial-r="0,0,0"      initial rotation angles (deg)
//   data-initial-t="0,0,0"      initial translation values
//   data-tracked-point="0.3,0.4,0.5"
//     If set, render a tracked point in the mobile frame (sphere
//     + dashed line from origin) and display its A-frame coords.
// ============================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const COLOR = {
  x: 0xe53935, y: 0x43a047, z: 0x1e88e5,
  u: 0xff8a00, v: 0x8e24aa, w: 0x00acc1,
  rt_u: 0x6c8ab8, rt_v: 0x6c8ab8, rt_w: 0x6c8ab8,
  point: 0x2F5496,
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

function makeFrame(labels, colors, length = 1, opacity = 1) {
  const group = new THREE.Group();
  const dirs = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
  dirs.forEach((dir, i) => {
    const arrow = makeArrow(dir, colors[i], length);
    if (opacity < 1) {
      arrow.line.material.transparent = true;
      arrow.line.material.opacity = opacity;
      arrow.cone.material.transparent = true;
      arrow.cone.material.opacity = opacity;
    }
    group.add(arrow);
    if (labels[i]) {
      const lbl = makeLabel(labels[i], colors[i]);
      lbl.position.copy(dir).multiplyScalar(length + 0.18);
      group.add(lbl);
    }
  });
  return group;
}

// Fixed-axis composition: M_rot = Rz · Ry · Rx (so each rotation slider
// rotates around its corresponding world axis). Then T = Translation · M_rot.
function composeT(rx, ry, rz, tx, ty, tz) {
  const m = new THREE.Matrix4();
  const ex = new THREE.Matrix4().makeRotationX(D2R(rx));
  const ey = new THREE.Matrix4().makeRotationY(D2R(ry));
  const ez = new THREE.Matrix4().makeRotationZ(D2R(rz));
  m.copy(ez).multiply(ey).multiply(ex);
  m.setPosition(tx, ty, tz);
  return m;
}

// Inverse using the homogeneous shortcut: T⁻¹ = [Rᵀ, −Rᵀp; 0, 1].
function inverseT(m) {
  const e = m.elements; // column-major
  // Rotation block (3×3) — read columns 0,1,2 of the upper-left 3×3.
  const r11 = e[0], r21 = e[1], r31 = e[2];
  const r12 = e[4], r22 = e[5], r32 = e[6];
  const r13 = e[8], r23 = e[9], r33 = e[10];
  const px = e[12], py = e[13], pz = e[14];
  const inv = new THREE.Matrix4();
  // Set Rᵀ in column-major: original rows become columns.
  inv.set(
    r11, r21, r31, -(r11 * px + r21 * py + r31 * pz),
    r12, r22, r32, -(r12 * px + r22 * py + r32 * pz),
    r13, r23, r33, -(r13 * px + r23 * py + r33 * pz),
    0, 0, 0, 1,
  );
  return inv;
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

export function mountTransformViewer(host) {
  // Use hasAttribute so an empty data-axes="" parses to no rotation sliders
  // (rather than falling through to the default x,y,z because '' is falsy).
  const rotAxes = host.hasAttribute('data-axes')
    ? host.dataset.axes.split(',').map(s => s.trim()).filter(Boolean)
    : ['x', 'y', 'z'];
  const transAxes = host.hasAttribute('data-translate-axes')
    ? host.dataset.translateAxes.split(',').map(s => s.trim()).filter(Boolean)
    : ['x', 'y', 'z'];
  const initialR = (host.dataset.initialR || '0,0,0').split(',').map(Number);
  const initialT = (host.dataset.initialT || '0,0,0').split(',').map(Number);
  const showInverse = host.dataset.showInverse === 'true';
  const showRoundtrip = host.dataset.showRoundtrip === 'true';
  const trackedPoint = host.dataset.trackedPoint
    ? host.dataset.trackedPoint.split(',').map(Number)
    : null;

  // ---- DOM ----
  host.classList.add('transform-viewer');

  const canvasWrap = document.createElement('div');
  canvasWrap.className = 'frame-viewer-canvas';
  host.appendChild(canvasWrap);

  const legend = document.createElement('div');
  legend.className = 'frame-viewer-legend';
  let legendHTML = `
    <div class="frame-viewer-legend-row"><span class="frame-viewer-swatch" style="background:#e53935"></span>fixed (x · y · z)</div>
    <div class="frame-viewer-legend-row"><span class="frame-viewer-swatch" style="background:#ff8a00"></span>mobile B at T</div>
  `;
  if (showRoundtrip) {
    legendHTML += `<div class="frame-viewer-legend-row"><span class="frame-viewer-swatch" style="background:#6c8ab8"></span>T⁻¹·T applied (round-trip)</div>`;
  }
  if (trackedPoint) {
    legendHTML += `<div class="frame-viewer-legend-row"><span class="frame-viewer-swatch" style="background:#2F5496"></span>tracked point</div>`;
  }
  legend.innerHTML = legendHTML;
  canvasWrap.appendChild(legend);

  const controls = document.createElement('div');
  controls.className = 'frame-viewer-controls transform-viewer-controls';
  host.appendChild(controls);

  // sliders — rotation
  const sliders = { rx: null, ry: null, rz: null, tx: null, ty: null, tz: null };
  const axisColors = { x: '#e53935', y: '#43a047', z: '#1e88e5' };

  function makeSlider(key, axis, kind, initial) {
    const row = document.createElement('div');
    row.className = 'slider-row';
    const isRot = kind === 'rot';
    const label = isRot
      ? `Rotate around <strong style="color:${axisColors[axis]}">${axis}</strong>`
      : `Translate along <strong style="color:${axisColors[axis]}">${axis}</strong>`;
    const min = isRot ? -180 : -2;
    const max = isRot ? 180 : 2;
    const step = isRot ? 1 : 0.05;
    const unit = isRot ? '°' : '';
    row.innerHTML = `
      <label class="slider-label">
        <span>${label}</span>
        <span class="slider-value" data-key="${key}">${initial}${unit}</span>
      </label>
      <input type="range" min="${min}" max="${max}" step="${step}" value="${initial}" data-key="${key}">
    `;
    controls.appendChild(row);
    return {
      input: row.querySelector('input'),
      value: row.querySelector('.slider-value'),
      kind,
      unit,
    };
  }

  if (rotAxes.length) {
    const heading = document.createElement('div');
    heading.className = 'slider-section-heading';
    heading.textContent = 'Rotation';
    controls.appendChild(heading);
    rotAxes.forEach((ax, i) => {
      sliders['r' + ax] = makeSlider('r' + ax, ax, 'rot', initialR[i] || 0);
    });
  }
  if (transAxes.length) {
    const heading = document.createElement('div');
    heading.className = 'slider-section-heading';
    heading.textContent = 'Translation';
    controls.appendChild(heading);
    transAxes.forEach((ax, i) => {
      sliders['t' + ax] = makeSlider('t' + ax, ax, 'trans', initialT[i] || 0);
    });
  }

  // matrix display
  const matWrap = document.createElement('div');
  matWrap.className = 'slider-row';
  matWrap.innerHTML = `
    <div class="slider-label"><span>Transform T</span></div>
    <pre class="matrix-display" data-matrix-T></pre>
  `;
  controls.appendChild(matWrap);

  let invOut;
  if (showInverse) {
    const w = document.createElement('div');
    w.className = 'slider-row';
    w.innerHTML = `
      <div class="slider-label"><span>Inverse T⁻¹</span></div>
      <pre class="matrix-display" data-matrix-Tinv></pre>
    `;
    controls.appendChild(w);
    invOut = w.querySelector('[data-matrix-Tinv]');
  }

  let trackedOut;
  if (trackedPoint) {
    const w = document.createElement('div');
    w.className = 'slider-row';
    w.innerHTML = `
      <div class="slider-label"><span>Tracked point</span></div>
      <div class="stat-row"><span class="stat-label">in B</span><span class="stat-value">(${trackedPoint.join(', ')})</span></div>
      <div class="stat-row"><span class="stat-label">in A</span><span class="stat-value" data-track-A>—</span></div>
      ${showInverse ? '<div class="stat-row"><span class="stat-label">T⁻¹·(A-coords)</span><span class="stat-value" data-track-back>—</span></div>' : ''}
    `;
    controls.appendChild(w);
    trackedOut = {
      A: w.querySelector('[data-track-A]'),
      back: w.querySelector('[data-track-back]'),
    };
  }

  const matrixOut = matWrap.querySelector('[data-matrix-T]');

  const btnRow = document.createElement('div');
  btnRow.className = 'btn-row';
  btnRow.innerHTML = '<button class="btn" data-reset>Reset</button>';
  controls.appendChild(btnRow);

  // ---- Three.js ----
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(3, 2.4, 3.4);

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

  const grid = new THREE.GridHelper(6, 24, 0xc8c2b4, 0xddd6c4);
  scene.add(grid);

  const fixedFrame = makeFrame(['x', 'y', 'z'], [COLOR.x, COLOR.y, COLOR.z], 1.0);
  scene.add(fixedFrame);

  const mobileFrame = makeFrame(['u', 'v', 'w'], [COLOR.u, COLOR.v, COLOR.w], 0.95);
  scene.add(mobileFrame);

  let roundtripFrame;
  if (showRoundtrip) {
    roundtripFrame = makeFrame(['', '', ''], [COLOR.rt_u, COLOR.rt_v, COLOR.rt_w], 0.85, 0.5);
    scene.add(roundtripFrame);
  }

  let pointSphere, pointLine;
  if (trackedPoint) {
    pointSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 24, 24),
      new THREE.MeshBasicMaterial({ color: COLOR.point }),
    );
    scene.add(pointSphere);
    pointLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineDashedMaterial({ color: COLOR.point, dashSize: 0.05, gapSize: 0.04 }),
    );
    scene.add(pointLine);
  }

  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true;
  orbit.enablePan = false;
  orbit.minDistance = 2;
  orbit.maxDistance = 10;

  function readVal(key, def = 0) {
    return sliders[key] ? parseFloat(sliders[key].input.value) : def;
  }

  function update() {
    const rx = readVal('rx'), ry = readVal('ry'), rz = readVal('rz');
    const tx = readVal('tx'), ty = readVal('ty'), tz = readVal('tz');
    Object.entries(sliders).forEach(([k, s]) => {
      if (!s) return;
      const v = parseFloat(s.input.value);
      const display = s.kind === 'rot' ? Math.round(v) : v.toFixed(2);
      s.value.textContent = `${display}${s.unit}`;
    });

    const T = composeT(rx, ry, rz, tx, ty, tz);
    mobileFrame.matrix.copy(T);
    mobileFrame.matrixAutoUpdate = false;

    matrixOut.textContent = format4x4(T);

    let Tinv;
    if (showInverse) {
      Tinv = inverseT(T);
      invOut.textContent = format4x4(Tinv);
    }

    if (showRoundtrip && roundtripFrame) {
      // Apply T then T⁻¹ → should be identity. Render so the third frame
      // sits where the round-trip lands; if math is right it overlays the
      // fixed frame perfectly.
      const RT = (Tinv || inverseT(T)).clone().multiply(T);
      roundtripFrame.matrix.copy(RT);
      roundtripFrame.matrixAutoUpdate = false;
    }

    if (trackedPoint && pointSphere) {
      const aB = new THREE.Vector3(...trackedPoint);
      const aA = aB.clone().applyMatrix4(T);
      pointSphere.position.copy(aA);
      pointLine.geometry.setFromPoints([new THREE.Vector3(0, 0, 0), aA]);
      pointLine.computeLineDistances();
      if (trackedOut.A) trackedOut.A.textContent = `(${aA.x.toFixed(3)}, ${aA.y.toFixed(3)}, ${aA.z.toFixed(3)})`;
      if (trackedOut.back && Tinv) {
        const back = aA.clone().applyMatrix4(Tinv);
        trackedOut.back.textContent = `(${back.x.toFixed(3)}, ${back.y.toFixed(3)}, ${back.z.toFixed(3)})`;
      }
    }
  }

  Object.values(sliders).forEach(s => {
    if (s) s.input.addEventListener('input', update);
  });
  btnRow.querySelector('[data-reset]').addEventListener('click', () => {
    Object.values(sliders).forEach(s => { if (s) s.input.value = 0; });
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
