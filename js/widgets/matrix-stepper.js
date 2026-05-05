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

// `cols` defaults to 3; set to 4 for 4×4 homogeneous transforms.
export const MATRIX_DEFS = {
  identity: {
    title: "The identity matrix — I₃",
    intro: "Two coordinate frames living happily together: same origin, same orientation. Click each cell to fill in the rotation matrix that describes \"nothing has changed.\"",
    cells: [
      { value: "1", prompt: "How much of u (mobile x) lies along x (fixed)? — u is exactly along x, so the projection is …", reveal: "u·x = 1. The mobile x-axis is fully aligned with the fixed x-axis." },
      { value: "0", prompt: "How much of v (mobile y) lies along x?", reveal: "v·x = 0. They are perpendicular." },
      { value: "0", prompt: "How much of w (mobile z) lies along x?", reveal: "w·x = 0. They are perpendicular." },
      { value: "0", prompt: "How much of u lies along y?", reveal: "u·y = 0." },
      { value: "1", prompt: "How much of v lies along y?", reveal: "v·y = 1. Fully aligned." },
      { value: "0", prompt: "How much of w lies along y?", reveal: "w·y = 0." },
      { value: "0", prompt: "How much of u lies along z?", reveal: "u·z = 0." },
      { value: "0", prompt: "How much of v lies along z?", reveal: "v·z = 0." },
      { value: "1", prompt: "And finally, how much of w lies along z?", reveal: "w·z = 1. The matrix is complete: it is the identity. Everywhere a frame matches itself, you get 1; everywhere axes are perpendicular, you get 0." },
    ],
  },

  rx: {
    title: "Rotation around x — Rx(θ)",
    intro: "Now rotate the mobile frame by θ around the fixed x axis. u stays put; v and w tilt. Fill in the matrix entry by entry, the same way: project u, v, w onto x, y, z.",
    cells: [
      { value: "1", prompt: "Rotation is around x, so u doesn't move. u·x = …", reveal: "u·x = 1. Rotating around x leaves u unchanged." },
      { value: "0", prompt: "v is still perpendicular to x. v·x = …", reveal: "v·x = 0." },
      { value: "0", prompt: "w is still perpendicular to x. w·x = …", reveal: "w·x = 0. The whole first row is (1, 0, 0)." },
      { value: "0", prompt: "u is along x, so u·y = …", reveal: "u·y = 0." },
      { value: "cos θ", prompt: "v has tilted. Its component along y is the adjacent side of the right triangle. That is …", reveal: "v·y = cos θ. Adjacent over hypotenuse, with hypotenuse 1." },
      { value: "−sin θ", prompt: "w has tilted backwards along y. Its y-component is …", reveal: "w·y = −sin θ. Negative because w tipped to the −y side." },
      { value: "0", prompt: "u·z = …", reveal: "u·z = 0." },
      { value: "sin θ", prompt: "v has acquired a z-component. It is the opposite side …", reveal: "v·z = sin θ." },
      { value: "cos θ", prompt: "And w·z = …", reveal: "w·z = cos θ. Done — that is Rx(θ)." },
    ],
  },

  ry: {
    title: "Rotation around y — Ry(θ)",
    intro: "Same logic: rotate around y, project the mobile axes onto the fixed ones. v stays put; u and w move.",
    cells: [
      { value: "cos θ", prompt: "u·x = …", reveal: "u·x = cos θ." },
      { value: "0", prompt: "v is along y, so v·x = …", reveal: "v·x = 0." },
      { value: "sin θ", prompt: "w·x = …", reveal: "w·x = sin θ." },
      { value: "0", prompt: "u·y = …", reveal: "u·y = 0. The middle row is (0, 1, 0)." },
      { value: "1", prompt: "v·y = …", reveal: "v·y = 1." },
      { value: "0", prompt: "w·y = …", reveal: "w·y = 0." },
      { value: "−sin θ", prompt: "u·z = …", reveal: "u·z = −sin θ." },
      { value: "0", prompt: "v·z = …", reveal: "v·z = 0." },
      { value: "cos θ", prompt: "w·z = …", reveal: "w·z = cos θ." },
    ],
  },

  rz: {
    title: "Rotation around z — Rz(θ)",
    intro: "And around z. w stays put; u and v rotate in the xy-plane.",
    cells: [
      { value: "cos θ", prompt: "u·x = …", reveal: "u·x = cos θ." },
      { value: "−sin θ", prompt: "v·x = …", reveal: "v·x = −sin θ." },
      { value: "0", prompt: "w is along z, so w·x = …", reveal: "w·x = 0." },
      { value: "sin θ", prompt: "u·y = …", reveal: "u·y = sin θ." },
      { value: "cos θ", prompt: "v·y = …", reveal: "v·y = cos θ." },
      { value: "0", prompt: "w·y = …", reveal: "w·y = 0." },
      { value: "0", prompt: "u·z = …", reveal: "u·z = 0." },
      { value: "0", prompt: "v·z = …", reveal: "v·z = 0." },
      { value: "1", prompt: "w·z = …", reveal: "w·z = 1. The bottom row is (0, 0, 1) — z is unchanged." },
    ],
  },

  // Lecture 03 — translation & homogeneous transforms (4×4)

  tx: {
    title: "Translation along x — Tx(d)",
    intro: "Pure translation: keep the orientation, slide the origin by d along the fixed x. The 3×3 rotation block is the identity. The right-most column carries the translation.",
    cols: 4,
    cells: [
      { value: "1", prompt: "Rotation block, top-left. No rotation, so this is …", reveal: "1." },
      { value: "0", prompt: "…", reveal: "0." },
      { value: "0", prompt: "…", reveal: "0." },
      { value: "d", prompt: "Top of the translation column — translation along x is …", reveal: "d." },
      { value: "0", prompt: "…", reveal: "0." },
      { value: "1", prompt: "…", reveal: "1." },
      { value: "0", prompt: "…", reveal: "0." },
      { value: "0", prompt: "Translation has no y-component, so …", reveal: "0." },
      { value: "0", prompt: "…", reveal: "0." },
      { value: "0", prompt: "…", reveal: "0." },
      { value: "1", prompt: "…", reveal: "1." },
      { value: "0", prompt: "Translation has no z-component, so …", reveal: "0." },
      { value: "0", prompt: "Bottom row, the homogeneous fixer. Always …", reveal: "0." },
      { value: "0", prompt: "…", reveal: "0." },
      { value: "0", prompt: "…", reveal: "0." },
      { value: "1", prompt: "And the corner is …", reveal: "1. That bottom row is what makes 4×4 homogeneous transforms compose under matrix multiplication." },
    ],
  },

  homog_general: {
    title: "A general homogeneous transform — T",
    intro: "Rotation R packed into the top-left 3×3, translation p stacked into the right column, the homogeneous bottom row [0 0 0 1]. This single 4×4 captures both orientation and position of one frame relative to another.",
    cols: 4,
    cells: [
      { value: "R₁₁", prompt: "Top-left 3×3 is the rotation matrix R. So this entry is …", reveal: "R₁₁ — the (1,1) entry of R." },
      { value: "R₁₂", prompt: "…", reveal: "R₁₂." },
      { value: "R₁₃", prompt: "…", reveal: "R₁₃." },
      { value: "pₓ", prompt: "Right column, top: x-component of the translation …", reveal: "pₓ." },
      { value: "R₂₁", prompt: "…", reveal: "R₂₁." },
      { value: "R₂₂", prompt: "…", reveal: "R₂₂." },
      { value: "R₂₃", prompt: "…", reveal: "R₂₃." },
      { value: "p_y", prompt: "Right column, middle: …", reveal: "p_y." },
      { value: "R₃₁", prompt: "…", reveal: "R₃₁." },
      { value: "R₃₂", prompt: "…", reveal: "R₃₂." },
      { value: "R₃₃", prompt: "…", reveal: "R₃₃." },
      { value: "p_z", prompt: "Right column, bottom: …", reveal: "p_z." },
      { value: "0", prompt: "Bottom row, fixed by convention …", reveal: "0." },
      { value: "0", prompt: "…", reveal: "0." },
      { value: "0", prompt: "…", reveal: "0." },
      { value: "1", prompt: "…", reveal: "1. T encodes both orientation and position, and composes by matrix multiplication." },
    ],
  },

  // Lecture 04 — inverse of a homogeneous transform

  homog_inverse: {
    title: "Inverse of a homogeneous transform — T⁻¹",
    intro: "If T sends a vector from frame B to frame A, T⁻¹ sends it back. There is a beautiful shortcut: the rotation block flips to its transpose, and the translation block becomes −Rᵀ·p. No matrix-inversion algorithm needed.",
    cols: 4,
    cells: [
      { value: "R₁₁", prompt: "Top-left 3×3 is now Rᵀ — the transpose of R. The (1,1) entry of Rᵀ equals R₁₁ (diagonals are unchanged by transpose). What is it?", reveal: "(Rᵀ)₁₁ = R₁₁." },
      { value: "R₂₁", prompt: "Transpose swaps off-diagonal entries. (Rᵀ)₁₂ = …", reveal: "(Rᵀ)₁₂ = R₂₁. Original column 1 becomes new row 1." },
      { value: "R₃₁", prompt: "(Rᵀ)₁₃ = …", reveal: "(Rᵀ)₁₃ = R₃₁." },
      { value: "−(Rᵀp)ₓ", prompt: "Translation column: −Rᵀ·p, x-component. This is …", reveal: "−(Rᵀp)ₓ = −(R₁₁pₓ + R₂₁p_y + R₃₁p_z). The negative dot-product of column 1 of R with p." },
      { value: "R₁₂", prompt: "(Rᵀ)₂₁ = …", reveal: "(Rᵀ)₂₁ = R₁₂." },
      { value: "R₂₂", prompt: "(Rᵀ)₂₂ = …", reveal: "R₂₂." },
      { value: "R₃₂", prompt: "(Rᵀ)₂₃ = …", reveal: "R₃₂." },
      { value: "−(Rᵀp)_y", prompt: "Translation column, y …", reveal: "−(R₁₂pₓ + R₂₂p_y + R₃₂p_z)." },
      { value: "R₁₃", prompt: "(Rᵀ)₃₁ = …", reveal: "R₁₃." },
      { value: "R₂₃", prompt: "(Rᵀ)₃₂ = …", reveal: "R₂₃." },
      { value: "R₃₃", prompt: "(Rᵀ)₃₃ = …", reveal: "R₃₃." },
      { value: "−(Rᵀp)_z", prompt: "Translation column, z …", reveal: "−(R₁₃pₓ + R₂₃p_y + R₃₃p_z)." },
      { value: "0", prompt: "Bottom row …", reveal: "0." },
      { value: "0", prompt: "…", reveal: "0." },
      { value: "0", prompt: "…", reveal: "0." },
      { value: "1", prompt: "…", reveal: "1. That is the whole inverse, no Gaussian elimination required. Try multiplying T·T⁻¹ in the sandbox — you should get I₄." },
    ],
  },
};

export function mountMatrixStepper(host, def) {
  if (!def) {
    host.innerHTML = '<p style="color:#b11200">matrix-stepper: missing definition</p>';
    return;
  }

  host.innerHTML = "";

  const prompt = document.createElement("div");
  prompt.className = "stepper-prompt";
  prompt.textContent = def.intro;
  host.appendChild(prompt);

  const cols = def.cols || 3;
  const grid = document.createElement("div");
  grid.className = "stepper-grid";
  if (cols !== 3) {
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    grid.style.maxWidth = cols === 4 ? "480px" : "380px";
  }
  const cells = def.cells.map((cell, i) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "stepper-cell";
    el.textContent = "?";
    el.dataset.idx = i;
    grid.appendChild(el);
    return { el, def: cell, revealed: false };
  });
  host.appendChild(grid);

  cells[0].el.classList.add("is-active");

  const progress = document.createElement("div");
  progress.className = "stepper-progress";
  progress.innerHTML = `
    <span><span data-count>0</span> / ${cells.length} entries revealed</span>
    <button class="btn" data-reveal-all>Reveal all</button>
  `;
  host.appendChild(progress);

  function setActiveAt(idx) {
    cells.forEach(c => c.el.classList.remove("is-active"));
    if (idx >= 0 && idx < cells.length && !cells[idx].revealed) {
      cells[idx].el.classList.add("is-active");
      prompt.textContent = cells[idx].def.prompt;
    } else if (cells.every(c => c.revealed)) {
      prompt.innerHTML = "<strong>Done.</strong> The matrix is complete. Compare it against the picture — does it match what you see?";
    }
  }

  function revealCell(idx, scrollToNext = true) {
    const c = cells[idx];
    if (c.revealed) return;
    c.el.textContent = c.def.value;
    c.el.classList.remove("is-active");
    c.el.classList.add("is-revealed");
    c.revealed = true;
    progress.querySelector("[data-count]").textContent = cells.filter(x => x.revealed).length;
    if (scrollToNext) {
      prompt.textContent = c.def.reveal;
      const next = cells.findIndex(x => !x.revealed);
      if (next === -1) {
        setTimeout(() => setActiveAt(-1), 1200);
      } else {
        setTimeout(() => setActiveAt(next), 1200);
      }
    }
  }

  cells.forEach((c, i) => {
    c.el.addEventListener("click", () => revealCell(i));
  });

  progress.querySelector("[data-reveal-all]").addEventListener("click", () => {
    cells.forEach((_, i) => revealCell(i, false));
    setActiveAt(-1);
  });

  return { reveal: revealCell };
}
