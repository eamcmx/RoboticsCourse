// ============================================================
// code-sandbox.js
// In-browser MATLAB-equivalent. math.js evaluator with custom
// helpers (rotX, rotY, rotZ, eye, I3, T) preloaded so students
// can experiment with rotations the same way they would in
// MATLAB — but everything runs locally, in the page.
// ------------------------------------------------------------
// Usage:
//
//   <div data-code-sandbox
//        data-initial="rotX(30)"
//        data-hint="Try rotX(0), rotX(90), rotX(45)"></div>
//
//   import { mountCodeSandbox } from '.../code-sandbox.js';
//   document.querySelectorAll('[data-code-sandbox]').forEach(mountCodeSandbox);
// ============================================================

import { create, all } from 'mathjs';

const math = create(all, {});

const D2R = Math.PI / 180;

// Course-flavoured helpers. Angles in DEGREES by default, like MATLAB cosd/sind.
function rotX(theta) {
  const c = Math.cos(theta * D2R), s = Math.sin(theta * D2R);
  return math.matrix([[1, 0, 0], [0, c, -s], [0, s, c]]);
}
function rotY(theta) {
  const c = Math.cos(theta * D2R), s = Math.sin(theta * D2R);
  return math.matrix([[c, 0, s], [0, 1, 0], [-s, 0, c]]);
}
function rotZ(theta) {
  const c = Math.cos(theta * D2R), s = Math.sin(theta * D2R);
  return math.matrix([[c, -s, 0], [s, c, 0], [0, 0, 1]]);
}
function transl(dx, dy, dz) {
  return math.matrix([
    [1, 0, 0, dx],
    [0, 1, 0, dy],
    [0, 0, 1, dz],
    [0, 0, 0, 1],
  ]);
}
function homog(R, p) {
  // Build a 4x4 homogeneous transform from a 3x3 R and a 3-vector p.
  const r = math.matrix(R).valueOf();
  const t = math.matrix(p).valueOf();
  return math.matrix([
    [r[0][0], r[0][1], r[0][2], t[0]],
    [r[1][0], r[1][1], r[1][2], t[1]],
    [r[2][0], r[2][1], r[2][2], t[2]],
    [0, 0, 0, 1],
  ]);
}

// Round near-zero values for cleaner display.
function clean(v) {
  return Math.abs(v) < 1e-10 ? 0 : v;
}
function cleanMatrix(m) {
  if (m && m.toArray) {
    const arr = m.toArray();
    if (Array.isArray(arr[0])) {
      return math.matrix(arr.map(row => row.map(clean)));
    }
    return math.matrix(arr.map(clean));
  }
  return m;
}

const SCOPE = {
  rotX, rotY, rotZ,
  Rx: rotX, Ry: rotY, Rz: rotZ,
  transl,
  homog,
  eye: (n) => math.identity(n),
  I3: math.identity(3),
  I4: math.identity(4),
  pi: Math.PI,
  deg2rad: (d) => d * D2R,
  rad2deg: (r) => r / D2R,
};

function formatResult(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'number') return clean(value).toString();
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value.toString();

  // matrix
  if (value && value.toArray) {
    const arr = value.toArray();
    if (Array.isArray(arr[0])) {
      // 2D — pretty-print with column alignment
      const cleaned = arr.map(row => row.map(clean));
      const widths = [];
      cleaned.forEach(row => row.forEach((v, j) => {
        const s = formatNumber(v);
        widths[j] = Math.max(widths[j] || 0, s.length);
      }));
      return cleaned.map(row =>
        row.map((v, j) => formatNumber(v).padStart(widths[j])).join('   ')
      ).join('\n');
    }
    // 1D
    return arr.map(v => formatNumber(clean(v))).join('   ');
  }

  return String(value);
}

function formatNumber(n) {
  if (n === 0) return '0';
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(4);
}

export function mountCodeSandbox(host) {
  const initial = host.dataset.initial || 'rotX(30)';
  const hint = host.dataset.hint || 'Available: rotX, rotY, rotZ, transl, eye, I3, I4, deg2rad, rad2deg';
  const rows = parseInt(host.dataset.rows || '5', 10);

  host.innerHTML = '';

  const editor = document.createElement('div');
  editor.className = 'sandbox-editor';
  editor.innerHTML = `
    <div class="sandbox-toolbar">
      <span>browser sandbox · math.js</span>
      <button class="btn btn-primary" data-run>Run ⏎</button>
    </div>
    <textarea class="sandbox-textarea" rows="${rows}" spellcheck="false"></textarea>
  `;
  host.appendChild(editor);

  const out = document.createElement('div');
  out.className = 'sandbox-output';
  out.textContent = '— output appears here —';
  host.appendChild(out);

  const hintEl = document.createElement('div');
  hintEl.className = 'sandbox-hint';
  hintEl.innerHTML = hint;
  host.appendChild(hintEl);

  const ta = editor.querySelector('textarea');
  ta.value = initial;

  function run() {
    const code = ta.value.trim();
    if (!code) return;
    out.classList.remove('is-error');
    try {
      // Run line by line, show last non-empty result; ignore comment-only lines.
      const lines = code.split(/\n/);
      const results = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('%') || trimmed.startsWith('//')) continue;
        const node = math.parse(trimmed);
        const value = node.evaluate(SCOPE);
        results.push({ line: trimmed, value });
      }
      if (results.length === 0) {
        out.textContent = '(nothing to evaluate)';
        return;
      }
      out.textContent = results.map(r => {
        const valStr = formatResult(r.value);
        return valStr.includes('\n') ? `${r.line} =\n${valStr}` : `${r.line} = ${valStr}`;
      }).join('\n\n');
    } catch (e) {
      out.classList.add('is-error');
      out.textContent = `Error: ${e.message}`;
    }
  }

  editor.querySelector('[data-run]').addEventListener('click', run);
  ta.addEventListener('keydown', (e) => {
    // Cmd/Ctrl + Enter runs
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      run();
    }
    // Tab inserts two spaces instead of changing focus
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = ta.selectionStart, end = ta.selectionEnd;
      ta.value = ta.value.slice(0, start) + '  ' + ta.value.slice(end);
      ta.selectionStart = ta.selectionEnd = start + 2;
    }
  });

  // Auto-run on mount so the student sees output immediately
  run();

  return { run };
}
