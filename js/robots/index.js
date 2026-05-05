// ============================================================
// js/robots/index.js
//
// Standard-DH parameters and forward kinematics for a small fleet
// of serial manipulators. Used by Module 2 (forward kinematics)
// and Module 3 (Jacobian / inverse kinematics) lectures.
//
// Source: Eamonn Merchán-Cruz et al., IK_benchmark_2026
//   https://github.com/eamcmx/IK_benchmark_2026
// (MIT licence; same author as this course.)
//
// Convention: standard (distal) DH parameters.
// Each joint contributes the elementary transform
//   T_i = Rz(theta_i) · Tz(d_i) · Tx(a_i) · Rx(alpha_i)
// with theta_i = q_i + theta_offset_i for revolute joints.
//
// All four robots in this file have all-revolute joint chains.
// Panda8 and Panda12 are synthetic redundancy variants of the
// Franka Emika Panda; UR5 and Panda are physical robots.
// ============================================================

const PI = Math.PI;

/** A single robot's DH parameters and limits. */
export const ROBOTS = {
  UR5: {
    name: 'UR5',
    description: 'Universal Robots UR5 (6 DOF, all revolute). Standard DH from the UR5 manual.',
    n: 6,
    dh: {
      a:     [0,         -0.425,    -0.39225,  0,          0,          0      ],
      alpha: [PI / 2,     0,         0,        PI / 2,    -PI / 2,     0      ],
      d:     [0.089159,   0,         0,        0.10915,    0.09465,    0.0823 ],
      thetaOffset: [0, 0, 0, 0, 0, 0],
    },
    tool: identity4(),
    qMin:  [-2 * PI, -2 * PI, -2 * PI, -2 * PI, -2 * PI, -2 * PI],
    qMax:  [ 2 * PI,  2 * PI,  2 * PI,  2 * PI,  2 * PI,  2 * PI],
    qHome: [0, -PI / 2, PI / 2, -PI / 2, -PI / 2, 0],
  },

  Panda: {
    name: 'Panda',
    description: 'Franka Emika Panda (7 DOF, all revolute). Standard-DH form of the Franka Panda; 0.107 m flange offset captured via the tool transform.',
    n: 7,
    dh: {
      a:     [0,        0,       0.0825, -0.0825, 0,       0.088, 0  ],
      alpha: [-PI / 2,  PI / 2,  PI / 2, -PI / 2, PI / 2,  PI / 2, 0  ],
      d:     [0.333,    0,       0.316,   0,      0.384,   0,     0  ],
      thetaOffset: [0, 0, 0, 0, 0, 0, 0],
    },
    tool: translation4(0, 0, 0.107),
    qMin: [-2.8973, -1.7628, -2.8973, -3.0718, -2.8973, -0.0175, -2.8973],
    qMax: [ 2.8973,  1.7628,  2.8973, -0.0698,  2.8973,  3.7525,  2.8973],
    qHome: [0, -PI / 4, 0, -3 * PI / 4, 0, PI / 2, PI / 4],
  },

  Panda8: {
    name: 'Panda8',
    description: 'Synthetic 8-DOF redundant arm: Panda + an extra elbow-twist joint between joints 4 and 5. Useful for studying redundancy.',
    n: 8,
    dh: {
      a:     [0,        0,       0.0825, -0.0825, 0,       0,       0.088, 0  ],
      alpha: [-PI / 2,  PI / 2,  PI / 2, -PI / 2, -PI / 2, PI / 2,  PI / 2, 0  ],
      d:     [0.333,    0,       0.316,   0,      0.10,    0.284,   0,     0  ],
      thetaOffset: [0, 0, 0, 0, 0, 0, 0, 0],
    },
    tool: translation4(0, 0, 0.107),
    qMin: [-2.8973, -1.7628, -2.8973, -3.0718, -2.8973, -2.8973, -0.0175, -2.8973],
    qMax: [ 2.8973,  1.7628,  2.8973, -0.0698,  2.8973,  2.8973,  3.7525,  2.8973],
    qHome: [0, -PI / 4, 0, -3 * PI / 4, 0, 0, PI / 2, PI / 4],
  },

  Panda12: {
    name: 'Panda12',
    description: 'Hyper-redundant 12-DOF synthetic arm. Panda8 with four additional revolute joints. Used for stress-testing 12-vec Newton IK.',
    n: 12,
    dh: {
      a:     [0,        0,       0,       0.0825, 0,       -0.0825, 0,       0,       0,       0.088, 0,       0   ],
      alpha: [-PI / 2,  PI / 2,  PI / 2,  PI / 2, -PI / 2, -PI / 2, PI / 2,  PI / 2, -PI / 2,  PI / 2, PI / 2,  0   ],
      d:     [0.333,    0,       0.316,   0,      0,        0,      0.05,    0.10,    0.234,   0,     0.05,    0   ],
      thetaOffset: new Array(12).fill(0),
    },
    tool: translation4(0, 0, 0.107),
    qMin: [-2.8973, -2.8973, -1.7628, -2.8973, -2.8973, -3.0718, -2.8973, -2.8973, -2.8973, -2.8973, -0.0175, -2.8973],
    qMax: [ 2.8973,  2.8973,  1.7628,  2.8973,  2.8973, -0.0698,  2.8973,  2.8973,  2.8973,  2.8973,  3.7525,  2.8973],
    qHome: [0, 0, -PI / 4, 0, 0, -3 * PI / 4, 0, 0, 0, 0, PI / 2, PI / 4],
  },
};

// ============================================================
// 4×4 helpers (column-major, like THREE.Matrix4 — entry-major
// here for readability; conversion is straightforward).
// ============================================================

/** Build a 4x4 identity matrix as a flat row-major array of 16 numbers. */
export function identity4() {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];
}

/** Build a 4x4 pure translation matrix (row-major, 16 numbers). */
export function translation4(dx, dy, dz) {
  return [
    1, 0, 0, dx,
    0, 1, 0, dy,
    0, 0, 1, dz,
    0, 0, 0, 1,
  ];
}

/** 4x4 row-major multiplication: returns A * B. */
export function multiply4(A, B) {
  const out = new Array(16).fill(0);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      let s = 0;
      for (let k = 0; k < 4; k++) {
        s += A[i * 4 + k] * B[k * 4 + j];
      }
      out[i * 4 + j] = s;
    }
  }
  return out;
}

/**
 * One joint's elementary transform in standard DH:
 *   T = Rz(theta) · Tz(d) · Tx(a) · Rx(alpha)
 * Returns a row-major 4x4.
 */
export function dhTransform(a, alpha, d, theta) {
  const ct = Math.cos(theta), st = Math.sin(theta);
  const ca = Math.cos(alpha), sa = Math.sin(alpha);
  return [
    ct,  -st * ca,   st * sa,   a * ct,
    st,   ct * ca,  -ct * sa,   a * st,
    0,    sa,        ca,        d,
    0,    0,         0,         1,
  ];
}

/**
 * Forward kinematics. Returns the 4x4 end-effector pose as a row-major
 * flat array of 16 numbers.
 *   q       — array of joint angles (radians) of length robot.n
 *   robot   — entry from ROBOTS
 */
export function forwardKinematics(q, robot) {
  let T = identity4();
  for (let i = 0; i < robot.n; i++) {
    const theta = q[i] + robot.dh.thetaOffset[i];
    const Ti = dhTransform(
      robot.dh.a[i],
      robot.dh.alpha[i],
      robot.dh.d[i],
      theta,
    );
    T = multiply4(T, Ti);
  }
  T = multiply4(T, robot.tool);
  return T;
}

/**
 * Compute every intermediate frame along the chain — useful for drawing
 * the unifilial line representation and the per-joint axes.
 *
 * Returns an array of length robot.n + 2 (one per joint, plus the base
 * frame at index 0 and the tool frame at the end). Each entry is a
 * 4x4 row-major matrix giving that frame's pose in the world.
 */
export function chainFrames(q, robot) {
  const frames = [identity4()];
  let T = identity4();
  for (let i = 0; i < robot.n; i++) {
    const theta = q[i] + robot.dh.thetaOffset[i];
    const Ti = dhTransform(
      robot.dh.a[i],
      robot.dh.alpha[i],
      robot.dh.d[i],
      theta,
    );
    T = multiply4(T, Ti);
    frames.push(T.slice());
  }
  // tool frame
  frames.push(multiply4(T, robot.tool));
  return frames;
}

/** Convenience: extract the translation column from a row-major 4x4. */
export function position(T) {
  return [T[3], T[7], T[11]];
}

/** Convenience: format a row-major 4x4 for display (4 lines of 4 numbers). */
export function format4x4(T, precision = 4) {
  const rows = [];
  for (let i = 0; i < 4; i++) {
    const row = [];
    for (let j = 0; j < 4; j++) {
      const v = Math.abs(T[i * 4 + j]) < 1e-10 ? 0 : T[i * 4 + j];
      row.push((v >= 0 ? ' ' : '') + v.toFixed(precision));
    }
    rows.push(row.join('  '));
  }
  return rows.join('\n');
}

// Tiny self-test (only runs if loaded outside a browser):
// For the UR5 home pose, the end-effector should sit roughly at
//   (-0.81725, -0.19145, -0.005491) with a known orientation.
// We don't run it in the browser — it's here as a comment for trust.
