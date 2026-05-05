# Kinematics & Dynamics of Robot Manipulators — Interactive Course

An interactive companion to a 21-lecture robotics course at TSI. Live 3D coordinate frames, click-to-reveal matrix derivations, and a browser-based MATLAB-style sandbox — all static HTML, no build step, hostable on GitHub Pages.

**Live site (after deploy):** `https://eamcmx.github.io/RoboticsCourse/`

---

## What's in this repo

```
RoboticsCourse/
├── index.html                       # Course landing + 21-lecture syllabus
├── .nojekyll                        # disable Jekyll on GitHub Pages
├── README.md                        # this file
├── css/
│   └── main.css                     # Visual system: typography, layout, widgets
├── js/
│   └── widgets/
│       ├── frame-viewer.js          # Three.js — two coordinate frames + sliders
│       ├── matrix-stepper.js        # Click-to-reveal Socratic matrix derivation
│       ├── code-sandbox.js          # math.js — MATLAB-style helpers in browser
│       └── rotation-animator.js     # Animated point under a rotation
├── lectures/
│   └── 01-frames-of-reference.html  # First lecture (complete prototype)
└── assets/                          # Images / icons (currently empty)
```

No build step, no bundler, no node_modules. Three.js, math.js, and KaTeX are loaded from `cdn.jsdelivr.net` via an [import map](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap), so each lecture page is a single self-contained HTML file.

---

## How to view it locally

You can't `file://` open it because ES modules require an HTTP server. Easiest options:

**macOS / Linux (bash, zsh):**
```bash
cd RoboticsCourse
python3 -m http.server 8000
# → open http://localhost:8000
```

**Windows (PowerShell):**
```powershell
cd RoboticsCourse
python -m http.server 8000
# or, if 'python' isn't recognised:
py -m http.server 8000
# → open http://localhost:8000
```

PowerShell does not understand the bash `&&` operator — run each line on its own.

**Or with Node (any OS):**
```bash
npx serve .
```

Stop the server with `Ctrl+C`.

---

## Deploying to GitHub Pages

The first time:

```bash
cd RoboticsCourse
git init
git branch -m main
git add -A
git commit -m "Initial commit: course landing + Lecture 01 prototype"
git remote add origin https://github.com/eamcmx/RoboticsCourse.git
git push -u origin main
```

Then on GitHub: **Settings → Pages → Source = "Deploy from a branch" → Branch = main, root `/`**.
Pages will publish at `https://eamcmx.github.io/RoboticsCourse/` within a minute or two.

For subsequent updates:

```bash
git add -A && git commit -m "..." && git push
```

The site auto-redeploys on push.

---

## How to add a new lecture

Each lecture is one HTML file in `lectures/`. The template is the same for all 21 lectures — copy `01-frames-of-reference.html`, change the title, swap the section content, and reuse the widgets.

### 1. Copy the template

```bash
cp lectures/01-frames-of-reference.html lectures/02-rotations-y-z.html
```

### 2. Update the page header

Edit the `<title>`, `<h1 class="lecture-title">`, eyebrow, subtitle, and the side ToC list.

### 3. Drop in widgets

The four widgets are designed to be reusable. Each one mounts itself onto any element with the right `data-*` attribute. To use them, the page needs the import map (already in the template) and this mount script at the bottom (also already there):

```js
import { mountFrameViewer } from '../js/widgets/frame-viewer.js';
import { mountMatrixStepper, MATRIX_DEFS } from '../js/widgets/matrix-stepper.js';
import { mountCodeSandbox } from '../js/widgets/code-sandbox.js';
import { mountRotationAnimator } from '../js/widgets/rotation-animator.js';

document.querySelectorAll('[data-frame-viewer]').forEach(mountFrameViewer);
document.querySelectorAll('[data-matrix-stepper]').forEach(el =>
  mountMatrixStepper(el, MATRIX_DEFS[el.dataset.id]));
document.querySelectorAll('[data-code-sandbox]').forEach(mountCodeSandbox);
document.querySelectorAll('[data-rotation-animator]').forEach(mountRotationAnimator);
```

#### Frame viewer

```html
<div data-frame-viewer
     data-axes="x,y,z"          <!-- which sliders to show -->
     data-show-matrix="true"     <!-- show numeric R live -->
     data-initial="0,0,0">       <!-- initial angles in degrees -->
</div>
```

#### Matrix stepper (Socratic click-to-reveal)

```html
<div data-matrix-stepper data-id="rx"></div>
```

`data-id` must match a key in `MATRIX_DEFS` (defined in `matrix-stepper.js`). Today the available IDs are `identity`, `rx`, `ry`, `rz`. To add a new one (for example, the SCARA forward kinematics), open `matrix-stepper.js` and add an entry:

```js
export const MATRIX_DEFS = {
  // ...existing
  scara_t1_0: {
    title: 'T₁⁰ for the SCARA robot',
    intro: 'Step through the entries of the transform from joint 1 to base.',
    cells: [
      { value: 'cos θ₁', prompt: '...', reveal: '...' },
      // ... 9 entries for a 3x3, or 16 for a 4x4
    ],
  },
};
```

#### Code sandbox

```html
<div data-code-sandbox
     data-rows="6"
     data-initial="rotX(30) * rotY(45)"
     data-hint="Try composing rotations: rotX(30) * rotY(45)">
</div>
```

The sandbox has `rotX`, `rotY`, `rotZ`, `transl(dx,dy,dz)`, `homog(R, p)`, `eye(n)`, `I3`, `I4`, `deg2rad`, `rad2deg` predefined.

#### Rotation animator

```html
<div data-rotation-animator
     data-axis="x"
     data-point="0.3,0.4,0.5">
</div>
```

### 4. Margin notes in instructor's voice

Use the `<div class="voice">` block to drop in things you'd actually say in the lecture:

```html
<div class="voice">
  <p>Believe me, there are no bad guesses. Just try it.</p>
</div>
```

These render with a yellow left border and italic serif type, distinct from the body prose, marked with an **In class** chip.

### 5. Math

Inline math: `$R_x(\theta)$`. Display math: wrap a `<div class="math-display" id="...">` and render via the KaTeX block at the bottom of the page (see `01-frames-of-reference.html` for the pattern).

### 6. Add the lecture to the syllabus on `index.html`

Find the matching card in `index.html` (it's already stubbed for all 21 lectures) and:
- Change `class="lecture-card is-disabled"` to `class="lecture-card"`
- Wrap it in `<a href="lectures/02-...html">` (the existing template card uses `<a>` for ready lectures)
- Change the `is-soon` chip to `is-ready`

---

## Visual conventions (use these every lecture)

- **Axes:** `--axis-x: #e53935` (red), `--axis-y: #43a047` (green), `--axis-z: #1e88e5` (blue).
- **Mobile-frame axes (when distinct):** `--axis-u: #ff8a00` (orange), `--axis-v: #8e24aa` (purple), `--axis-w: #00acc1` (cyan).
- **Course brand blue:** `--color-primary: #2F5496`. Used for headings, links, and primary buttons.
- **Margin-note yellow:** `--bg-margin: #fff8e1`. Reserved for instructor-voice callouts.
- **Default 3D camera:** azimuth 130°, elevation 30° (matches the lectures' MATLAB `view(130, 30)`).
- **Body type:** Source Serif 4. **UI/code type:** Inter / JetBrains Mono.

---

## Pedagogical conventions (encoded in the template)

- **Geometry first, code second.** Every concept gets a 3D widget *before* a sandbox.
- **Socratic step-throughs.** Matrix entries are revealed by clicking, with a per-cell prompt → reveal sequence. Don't drop the matrix on the page — make the student do the projection.
- **Three deliverables per homework.** Sketch + code + 60-second video. The video is non-negotiable; it's how you verify the work is theirs. The homework block at the bottom of each lecture has built-in slots for these.

---

## What's done & what's next

| Lecture | Title | Status |
|---|---|---|
| 01 | Frames of reference, identity matrix, Rx | **Ready** |
| 02 | Rotation around y and z, composite rotations | Stub on syllabus |
| 03 | Translations & homogeneous transforms | Stub |
| 04 | Inverse of a homogeneous transform | Stub |
| 05–10 | Module 2: forward kinematics (PPP, RPP, SCARA, UR5, DH) | Stubs |
| 11–13 | Module 3: inverse kinematics (Jacobian, Newton-Raphson, limits) | Stubs |
| 14–21 | Module 4: trajectories, Arduino, RoboDK, master-slave | Stubs |

The 20 stub cards are visible in the syllabus; replacing each one is the same template-fill operation.

---

## License & credits

Course content based on the 2022 lecture corpus from TSI.
Code uses [Three.js](https://threejs.org/), [math.js](https://mathjs.org/), and [KaTeX](https://katex.org/), all via CDN.
