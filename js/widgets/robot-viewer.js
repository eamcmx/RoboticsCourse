// ============================================================
// robot-viewer.js
// Render a serial-link manipulator from its DH parameters
// (loaded from js/robots/index.js) and let the student drive
// every joint with a slider. Live FK readout updates as the
// joints move.
//
// Usage:
//   <div data-robot-viewer
//        data-robot="UR5"
//        data-show-frames="true"></div>
// ============================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  ROBOTS, chainFrames, position, format4x4
} from '../robots/index.js';

const COLOR = {
  link: 0x4a6fb0,
  joint: 0xfde36b,
  baseAxis: { x: 0xe53935, y: 0x43a047, z: 0x1e88e5 },
  toolAxis: { x: 0xff8a00, y: 0x8e24aa, z: 0x00acc1 },
  jointAxis: 0x9aa3b8,
  trail: 0x2F5496,
};

// Convert a row-major 4x4 (from js/robots) into a THREE.Matrix4.
// Three.js Matrix4 elements are column-major.
function toThreeMatrix(row16) {
  const m = new THREE.Matrix4();
  // .set takes ROW-major arguments — convenient.
  m.set(
    row16[0],  row16[1],  row16[2],  row16[3],
    row16[4],  row16[5],  row16[6],  row16[7],
    row16[8],  row16[9],  row16[10], row16[11],
    row16[12], row16[13], row16[14], row16[15],
  );
  return m;
}

function makeArrow(dir, color, length = 0.1) {
  return new THREE.ArrowHelper(
    dir.clone().normalize(),
    new THREE.Vector3(0, 0, 0),
    length, color, length * 0.35, length * 0.25,
  );
}

function makeMiniFrame(size = 0.08) {
  const g = new THREE.Group();
  g.add(makeArrow(new THREE.Vector3(1, 0, 0), COLOR.baseAxis.x, size));
  g.add(makeArrow(new THREE.Vector3(0, 1, 0), COLOR.baseAxis.y, size));
  g.add(makeArrow(new THREE.Vector3(0, 0, 1), COLOR.baseAxis.z, size));
  return g;
}

function makeBigFrame(size = 0.18) {
  const g = new THREE.Group();
  g.add(makeArrow(new THREE.Vector3(1, 0, 0), COLOR.toolAxis.x, size));
  g.add(makeArrow(new THREE.Vector3(0, 1, 0), COLOR.toolAxis.y, size));
  g.add(makeArrow(new THREE.Vector3(0, 0, 1), COLOR.toolAxis.z, size));
  return g;
}

function radiansToDegrees(r) { return r * 180 / Math.PI; }

export function mountRobotViewer(host) {
  const robotId = host.dataset.robot || 'UR5';
  const robot = ROBOTS[robotId];
  if (!robot) {
    host.innerHTML = `<p style="color:#b11200">Unknown robot id: ${robotId}</p>`;
    return;
  }
  const showFrames = host.dataset.showFrames !== 'false';
  const showMatrix = host.dataset.showMatrix !== 'false';

  host.classList.add('robot-viewer');

  // ---- DOM ----
  const canvasWrap = document.createElement('div');
  canvasWrap.className = 'frame-viewer-canvas';
  host.appendChild(canvasWrap);

  const legend = document.createElement('div');
  legend.className = 'frame-viewer-legend';
  legend.innerHTML = `
    <div class="frame-viewer-legend-row"><strong>${robot.name}</strong> · ${robot.n} DOF</div>
    <div class="frame-viewer-legend-row"><span class="frame-viewer-swatch" style="background:#4a6fb0"></span>links</div>
    <div class="frame-viewer-legend-row"><span class="frame-viewer-swatch" style="background:#fde36b"></span>joints</div>
    <div class="frame-viewer-legend-row"><span class="frame-viewer-swatch" style="background:#ff8a00"></span>tool frame</div>
  `;
  canvasWrap.appendChild(legend);

  const controls = document.createElement('div');
  controls.className = 'frame-viewer-controls robot-viewer-controls';
  host.appendChild(controls);

  // ---- joint sliders ----
  const sliders = [];
  const heading = document.createElement('div');
  heading.className = 'slider-section-heading';
  heading.textContent = `Joints (${robot.n})`;
  controls.appendChild(heading);

  for (let i = 0; i < robot.n; i++) {
    const isPris = robot.jointTypes[i] === 'P';
    const min = robot.qMin[i];
    const max = robot.qMax[i];
    const initial = robot.qHome[i];
    const step = isPris ? (max - min) / 200 : (max - min) / 360;

    const row = document.createElement('div');
    row.className = 'slider-row';
    const labelText = isPris
      ? `q<sub>${i + 1}</sub> · prismatic`
      : `q<sub>${i + 1}</sub> · revolute`;

    row.innerHTML = `
      <label class="slider-label">
        <span>${labelText}</span>
        <span class="slider-value" data-i="${i}">…</span>
      </label>
      <input type="range" min="${min}" max="${max}" step="${step.toPrecision(3)}" value="${initial}" data-i="${i}">
    `;
    controls.appendChild(row);
    sliders.push({
      input: row.querySelector('input'),
      value: row.querySelector('.slider-value'),
      isPris,
    });
  }

  // ---- end-effector readout ----
  const eeWrap = document.createElement('div');
  eeWrap.className = 'slider-row';
  eeWrap.innerHTML = `
    <div class="slider-label"><span>End-effector pose T</span></div>
    <pre class="matrix-display" data-T></pre>
    <div class="stat-row"><span class="stat-label">position</span><span class="stat-value" data-pos>—</span></div>
  `;
  controls.appendChild(eeWrap);

  const btnRow = document.createElement('div');
  btnRow.className = 'btn-row';
  btnRow.innerHTML = `
    <button class="btn" data-home>Home pose</button>
    <button class="btn" data-zero>All zeros</button>
  `;
  controls.appendChild(btnRow);

  // ---- Three.js scene ----
  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100);
  // Fit the camera to the robot's reach.
  const reach = Math.max(...robot.dh.a.map(Math.abs), ...robot.dh.d.map(Math.abs)) * robot.n + 0.5;
  camera.position.set(reach * 0.9, reach * 0.7, reach * 1.1);
  camera.up.set(0, 0, 1);

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

  // Floor
  const grid = new THREE.GridHelper(reach * 4, 32, 0xc8c2b4, 0xddd6c4);
  grid.rotation.x = Math.PI / 2;
  scene.add(grid);

  // Lighting (for the meshes — links and joint spheres are MeshBasic so
  // they don't strictly need lights, but keep the scene cinematic)
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const sun = new THREE.DirectionalLight(0xffffff, 0.6);
  sun.position.set(2, 4, 3);
  scene.add(sun);

  // Base frame (always shown at the origin)
  const baseFrame = makeMiniFrame(0.18);
  scene.add(baseFrame);

  // Joint spheres — created upfront, repositioned each tick
  const jointSpheres = [];
  for (let i = 0; i < robot.n; i++) {
    const s = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 24, 24),
      new THREE.MeshStandardMaterial({ color: COLOR.joint, roughness: 0.45 }),
    );
    scene.add(s);
    jointSpheres.push(s);
  }

  // Link cylinders — geometry rebuilt each tick (cheap for n<12)
  const links = [];
  for (let i = 0; i <= robot.n; i++) {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 1, 16),
      new THREE.MeshStandardMaterial({ color: COLOR.link, roughness: 0.5 }),
    );
    scene.add(m);
    links.push(m);
  }

  // Per-joint mini frames (optional)
  const jointFrames = [];
  if (showFrames) {
    for (let i = 0; i < robot.n; i++) {
      const f = makeMiniFrame(0.08);
      scene.add(f);
      jointFrames.push(f);
    }
  }

  // Tool frame — bigger, more colorful
  const toolFrame = makeBigFrame(0.16);
  scene.add(toolFrame);

  // Tool sphere (small) for clarity
  const toolBall = new THREE.Mesh(
    new THREE.SphereGeometry(0.025, 24, 24),
    new THREE.MeshStandardMaterial({ color: 0xff8a00, roughness: 0.4 }),
  );
  scene.add(toolBall);

  // Orbit
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.1;
  orbit.minDistance = 0.5;
  orbit.maxDistance = 30;
  orbit.target.set(0, 0, reach * 0.25);

  // Storage for output elements
  const matrixOut = eeWrap.querySelector('[data-T]');
  const posOut = eeWrap.querySelector('[data-pos]');

  function placeLinkBetween(mesh, p0, p1) {
    const a = new THREE.Vector3(...p0);
    const b = new THREE.Vector3(...p1);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const dir = b.clone().sub(a);
    const len = dir.length();
    if (len < 1e-6) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    mesh.position.copy(mid);
    mesh.scale.set(1, len, 1);
    // Default cylinder is along +Y; rotate to align with dir
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize());
    mesh.setRotationFromQuaternion(q);
  }

  function update() {
    // Read joint values
    const q = sliders.map((s, i) => {
      const v = parseFloat(s.input.value);
      const display = s.isPris
        ? `${v.toFixed(2)} m`
        : `${Math.round(radiansToDegrees(v))}°`;
      s.value.textContent = display;
      return v;
    });

    // Compute all chain frames in world space
    const frames = chainFrames(q, robot);  // [base, joint1, joint2, ..., jointN, tool]
    const positions = frames.map(position);

    // Position the joint spheres (frames[1..n] are at joint origins)
    for (let i = 0; i < robot.n; i++) {
      const p = positions[i + 1];
      jointSpheres[i].position.set(p[0], p[1], p[2]);
      if (showFrames && jointFrames[i]) {
        jointFrames[i].matrix.copy(toThreeMatrix(frames[i + 1]));
        jointFrames[i].matrixAutoUpdate = false;
      }
    }

    // Place links: link i connects positions[i] to positions[i+1]
    for (let i = 0; i <= robot.n; i++) {
      placeLinkBetween(links[i], positions[i], positions[i + 1]);
    }

    // Tool frame and tool ball
    const toolM = toThreeMatrix(frames[frames.length - 1]);
    toolFrame.matrix.copy(toolM);
    toolFrame.matrixAutoUpdate = false;
    const tp = positions[positions.length - 1];
    toolBall.position.set(tp[0], tp[1], tp[2]);

    // Numeric readouts
    if (showMatrix) {
      matrixOut.textContent = format4x4(frames[frames.length - 1]);
    }
    posOut.textContent = `(${tp[0].toFixed(3)}, ${tp[1].toFixed(3)}, ${tp[2].toFixed(3)})`;
  }

  sliders.forEach(s => s.input.addEventListener('input', update));
  btnRow.querySelector('[data-home]').addEventListener('click', () => {
    sliders.forEach((s, i) => { s.input.value = robot.qHome[i]; });
    update();
  });
  btnRow.querySelector('[data-zero]').addEventListener('click', () => {
    sliders.forEach(s => { s.input.value = 0; });
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
