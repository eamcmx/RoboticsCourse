// ============================================================
// js/robots/index.js
//
// Standard-DH parameters and forward kinematics for a small fleet
// of serial manipulators. Used by Module 2 (forward kinematics)
// and Module 3 (Jacobian / inverse kinematics) lectures.
//
// Convention: standard (distal) DH parameters.
// Each joint contributes the elementary transform
//   T_i = Rz(theta_i) · Tz(d_i) · Tx(a_i) · Rx(alpha_i)
// For a revolute joint, theta_i is the joint variable + theta_offset_i.
// For a prismatic joint, d_i is the joint variable + d_offset_i.
//
// Real industrial robots in this file (UR5, Panda, Panda8, Panda12)
// are sourced from Merchán-Cruz et al., IK_benchmark_2026 (MIT, same
// author as this course). PPP and RPP are simplified educational
// robots used in the early Module 2 lectures.
// ============================================================

const PI = Math.PI;

// jointTypes: array of 'R' (revolute) or 'P' (prismatic), one per joint.
// The forward-kinematics function uses this to know which DH parameter
// (theta or d) to substitute the joint variable into.

export const ROBOTS = {

  // ---------------- Educational robots (Module 2 intro) ----------------

  PPP: {
    name: 'PPP',
    description: 'Cartesian gantry — three prismatic joints, all axes orthogonal. The simplest possible kinematic chain: end-effector position is just the sum of three slides.',
    n: 3,
    jointTypes: ['P', 'P', 'P'],
    dh: {
      // For prismatic joints d is the variable; theta is the constant orientation
      // shift between successive frames. The chain is x → y → z, each axis at
      // 90° to the previous.
      a:           [0,      0,      0    ],
      alpha:       [-PI/2,  PI/2,   0    ],
      d:           [0,      0,      0    ],   // base offsets (added to q[i])
      thetaOffset: [0,      PI/2,   0    ],   // orientation of each link
    },
    tool: identity4(),
    qMin:  [0, 0, 0],
    qMax:  [1.0, 1.0, 1.0],     // 1 m of travel per axis
    qHome: [0.3, 0.3, 0.3],
  },

  RPP: {
    name: 'RPP',
    description: 'One revolute base joint, two prismatic slides. The basis of a SCARA-style pick-and-place arm: turn the column, raise/lower, extend.',
    n: 3,
    jointTypes: ['R', 'P', 'P'],
    dh: {
      a:           [0,     0,      0   ],
      alpha:       [PI/2,  -PI/2,  0   ],
      d:           [0.2,   0,      0   ],   // base column height; q2 adds vertical slide
      thetaOffset: [0,     0,      0   ],
    },
    tool: identity4(),
    qMin:  [-PI,  0,    0  ],
    qMax:  [ PI,  0.6,  0.5],
    qHome: [0,    0.3,  0.2],
  },

  // ---------------- Real industrial robots ----------------

  CobraS800: {
    name: 'Adept Cobra s800',
    description: 'SCARA-style RRPR pick-and-place. Two horizontal revolute joints (shoulder + elbow), one vertical prismatic, one tool-rotation. Reach ~800 mm.',
    n: 4,
    jointTypes: ['R', 'R', 'P', 'R'],
    dh: {
      a:           [0.425,  0.375,  0,     0     ],
      alpha:       [0,      PI,     0,     0     ],
      d:           [0.387,  0,      0,     0     ],
      thetaOffset: [0,      0,      0,     0     ],
    },
    tool: identity4(),
    qMin:  [-2.88,  -2.62,  0,     -PI ],
    qMax:  [ 2.88,   2.62,  0.21,   PI ],
    qHome: [0,       0,     0.10,   0  ],
  },

  UR5: {
    name: 'UR5',
    description: 'Universal Robots UR5 (6 DOF, all revolute). Standard DH from the UR5 manual.',
    n: 6,
    jointTypes: ['R', 'R', 'R', 'R', 'R', 'R'],
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
    jointTypes: ['R', 'R', 'R', 'R', 'R', 'R', 'R'],
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
    jointTypes: ['R', 'R', 'R', 'R', 'R', 'R', 'R', 'R'],
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
    jointTypes: ['R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R'],
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
// 4×4 helpers (row-major, flat array of 16 numbers)
// ============================================================

export function identity4() {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];
}

export function translation4(dx, dy, dz) {
  return [
    1, 0, 0, dx,
    0, 1, 0, dy,
    0, 0, 1, dz,
    0, 0, 0, 1,
  ];
}

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
 * flat array of 16 numbers. Handles both revolute (theta variable) and
 * prismatic (d variable) joints via robot.jointTypes.
 */
export function forwardKinematics(q, robot) {
  let T = identity4();
  for (let i = 0; i < robot.n; i++) {
    const isPrismatic = robot.jointTypes && robot.jointTypes[i] === 'P';
    const a = robot.dh.a[i];
    const alpha = robot.dh.alpha[i];
    const d = isPrismatic
      ? (robot.dh.d[i] + q[i])
      : robot.dh.d[i];
    const theta = isPrismatic
      ? robot.dh.thetaOffset[i]
      : (robot.dh.thetaOffset[i] + q[i]);
    T = multiply4(T, dhTransform(a, alpha, d, theta));
  }
  T = multiply4(T, robot.tool);
  return T;
}

/**
 * Compute every intermediate frame along the chain — useful for drawing
 * the unifilial line representation and the per-joint axes.
 *
 * Returns frames[0..n+1]: base frame at index 0, joint i frame at index i,
 * tool frame at the end.
 */
export function chainFrames(q, robot) {
  const frames = [identity4()];
  let T = identity4();
  for (let i = 0; i < robot.n; i++) {
    const isPrismatic = robot.jointTypes && robot.jointTypes[i] === 'P';
    const a = robot.dh.a[i];
    const alpha = robot.dh.alpha[i];
    const d = isPrismatic
      ? (robot.dh.d[i] + q[i])
      : robot.dh.d[i];
    const theta = isPrismatic
      ? robot.dh.thetaOffset[i]
      : (robot.dh.thetaOffset[i] + q[i]);
    T = multiply4(T, dhTransform(a, alpha, d, theta));
    frames.push(T.slice());
  }
  frames.push(multiply4(T, robot.tool));
  return frames;
}

/** Extract translation column from a row-major 4x4. */
export function position(T) {
  return [T[3], T[7], T[11]];
}

/** Pretty-print a 4x4. */
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
