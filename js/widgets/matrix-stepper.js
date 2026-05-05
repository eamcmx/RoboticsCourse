// ============================================================
// matrix-stepper.js
// Click-to-reveal Socratic matrix derivation. Each cell starts
// as "?" with a question prompt; clicking reveals the entry and
// updates the prompt for the next cell.
// ------------------------------------------------------------
// Usage:
//
//   <div data-matrix-stepper data-id="rx"></div>
//
//   import { mountMatrixStepper, MATRIX_DEFS } from '.../matrix-stepper.js';
//   document.querySelectorAll('[data-matrix-stepper]').forEach(el =>
//     mountMatrixStepper(el, MATRIX_DEFS[el.dataset.id]));
// ============================================================

// Pre-baked Socratic chains for each foundational matrix in the course.
// Each cell has: { value, prompt, reveal } where prompt is the question
// shown before the cell is clicked, and reveal is the explanation.
export const MATRIX_DEFS = {
  identity: {
    title: 'The identity matrix — I₃',
    intro: 'Two coordinate frames living happily together: same origin, same orientation. Click each cell to fill in the rotation matrix that describes "nothing has changed."',
    cells: [
      { value: '1', prompt: 'How much of u (mobile x) lies along x (fixed)? — u is exactly along x, so the projection is …', reveal: 'u·x = 1. The mobile x-axis is fully aligned with the fixed x-axis.' },
      { value: '0', prompt: 'How much of v (mobile y) lies along x?', reveal: 'v·x = 0. They are perpendicular.' },
      { value: '0', prompt: 'How much of w (mobile z) lies along x?', reveal: 'w·x = 0. They are perpendicular.' },
      { value: '0', prompt: 'How much of u lies along y?', reveal: 'u·y = 0.' },
      { value: '1', prompt: 'How much of v lies along y?', reveal: 'v·y = 1. Fully aligned.' },
      { value: '0', prompt: 'How much of w lies along y?', reveal: 'w·y = 0.' },
      { value: '0', prompt: 'How much of u lies along z?', reveal: 'u·z = 0.' },
      { value: '0', prompt: 'How much of v lies along z?', reveal: 'v·z = 0.' },
      { value: '1', prompt: 'And finally, how much of w lies along z?', reveal: 'w·z = 1. The matrix is complete: it is the identity. Everywhere a frame matches itself, you get 1; everywhere axes are perpendicular, you get 0.' },
    ],
  },

  rx: {
    title: 'Rotation around x — Rx(θ)',
    intro: 'Now rotate the mobile frame by θ around the fixed x axis. u stays put; v and w tilt. Fill in the matrix entry by entry, the same way: project u, v, w onto x, y, z.',
    cells: [
      { value: '1', prompt: 'Rotation is around x, so u doesn\'t move. u·x = …', reveal: 'u·x = 1. Rotating around x leaves u unchanged.' },
      { value: '0', prompt: 'v is still perpendicular to x. v·x = …', reveal: 'v·x = 0.' },
      { value: '0', prompt: 'w is still perpendicular to x. w·x = …', reveal: 'w·x = 0. The whole first row is (1, 0, 0).' },
      { value: '0', prompt: 'u is along x, so u·y = …', reveal: 'u·y = 0.' },
      { value: 'cos θ', prompt: 'v has tilted. Its component along y is the adjacent side of the right triangle. That is …', reveal: 'v·y = cos θ. Adjacent over hypotenuse, with hypotenuse 1.' },
      { value: '−sin θ', prompt: 'w has tilted backwards along y. Its y-component is …', reveal: 'w·y = −sin θ. Negative because w tipped to the −y side.' },
      { value: '0', prompt: 'u·z = …', reveal: 'u·z = 0.' },
      { value: 'sin θ', prompt: 'v has acquired a z-component. It is the opposite side …', reveal: 'v·z = sin θ.' },
      { value: 'cos θ', prompt: 'And w·z = …', reveal: 'w·z = cos θ. Done — that is Rx(θ).' },
    ],
  },

  ry: {
    title: 'Rotation around y — Ry(θ)',
    intro: 'Same logic: rotate around y, project the mobile axes onto the fixed ones. v stays put; u and w move.',
    cells: [
      { value: 'cos θ', prompt: 'u·x = …', reveal: 'u·x = cos θ.' },
      { value: '0', prompt: 'v is along y, so v·x = …', reveal: 'v·x = 0.' },
      { value: 'sin θ', prompt: 'w·x = …', reveal: 'w·x = sin θ.' },
      { value: '0', prompt: 'u·y = …', reveal: 'u·y = 0. The middle row is the y-axis itself: (0, 1, 0).' },
      { value: '1', prompt: 'v·y = …', reveal: 'v·y = 1.' },
      { value: '0', prompt: 'w·y = …', reveal: 'w·y = 0.' },
      { value: '−sin θ', prompt: 'u·z = …', reveal: 'u·z = −sin θ.' },
      { value: '0', prompt: 'v·z = …', reveal: 'v·z = 0.' },
      { value: 'cos θ', prompt: 'w·z = …', reveal: 'w·z = cos θ.' },
    ],
  },

  rz: {
    title: 'Rotation around z — Rz(θ)',
    intro: 'And around z. w stays put; u and v rotate in the xy-plane.',
    cells: [
      { value: 'cos θ', prompt: 'u·x = …', reveal: 'u·x = cos θ.' },
      { value: '−sin θ', prompt: 'v·x = …', reveal: 'v·x = −sin θ.' },
      { value: '0', prompt: 'w is along z, so w·x = …', reveal: 'w·x = 0.' },
      { value: 'sin θ', prompt: 'u·y = …', reveal: 'u·y = sin θ.' },
      { value: 'cos θ', prompt: 'v·y = …', reveal: 'v·y = cos θ.' },
      { value: '0', prompt: 'w·y = …', reveal: 'w·y = 0.' },
      { value: '0', prompt: 'u·z = …', reveal: 'u·z = 0.' },
      { value: '0', prompt: 'v·z = …', reveal: 'v·z = 0.' },
      { value: '1', prompt: 'w·z = …', reveal: 'w·z = 1. The bottom row is (0, 0, 1) — z is unchanged.' },
    ],
  },
};

export function mountMatrixStepper(host, def) {
  if (!def) {
    host.innerHTML = '<p style="color:#b11200">matrix-stepper: missing definition</p>';
    return;
  }

  host.innerHTML = '';

  // Prompt zone
  const prompt = document.createElement('div');
  prompt.className = 'stepper-prompt';
  prompt.textContent = def.intro;
  host.appendChild(prompt);

  // 3x3 grid
  const grid = document.createElement('div');
  grid.className = 'stepper-grid';
  const cells = def.cells.map((cell, i) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'stepper-cell';
    el.textContent = '?';
    el.dataset.idx = i;
    grid.appendChild(el);
    return { el, def: cell, revealed: false };
  });
  host.appendChild(grid);

  // Mark first as active
  cells[0].el.classList.add('is-active');

  // Progress
  const progress = document.createElement('div');
  progress.className = 'stepper-progress';
  progress.innerHTML = `
    <span><span data-count>0</span> / ${cells.length} entries revealed</span>
    <button class="btn" data-reveal-all>Reveal all</button>
  `;
  host.appendChild(progress);

  function setActiveAt(idx) {
    cells.forEach(c => c.el.classList.remove('is-active'));
    if (idx >= 0 && idx < cells.length && !cells[idx].revealed) {
      cells[idx].el.classList.add('is-active');
      prompt.textContent = cells[idx].def.prompt;
    } else if (cells.every(c => c.revealed)) {
      prompt.innerHTML = '<strong>Done.</strong> The matrix is complete. Compare it against the picture — the columns are the mobile-frame axes expressed in the fixed frame. Does it match what you see?';
    }
  }

  function revealCell(idx, scrollToNext = true) {
    const c = cells[idx];
    if (c.revealed) return;
    c.el.textContent = c.def.value;
    c.el.classList.remove('is-active');
    c.el.classList.add('is-revealed');
    c.revealed = true;

    progress.querySelector('[data-count]').textContent = cells.filter(x => x.revealed).length;

    if (scrollToNext) {
      // Show the explanation for what was just clicked, then advance.
      prompt.textContent = c.def.reveal;
      const next = cells.findIndex(x => !x.revealed);
      if (next === -1) {
        setTimeout(() => setActiveAt(-1), 1200);
      } else {
        // brief delay so the student reads the reveal before the prompt changes
        setTimeout(() => setActiveAt(next), 1200);
      }
    }
  }

  cells.forEach((c, i) => {
    c.el.addEventListener('click', () => revealCell(i));
  });

  progress.querySelector('[data-reveal-all]').addEventListener('click', () => {
    cells.forEach((_, i) => revealCell(i, false));
    setActiveAt(-1);
  });

  return { reveal: revealCell };
}
