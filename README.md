# Kinematics & Dynamics of Robot Manipulators — Interactive Course

An interactive companion to a robotics course at TSI. Live 3D coordinate frames, click-to-reveal matrix derivations, a browser-based MATLAB-style sandbox, and animated forward/inverse-kinematics and dynamics demos — all static HTML, no build step, hosted on GitHub Pages.

**Live site:** **https://eamcmx.github.io/RoboticsCourse/**

The arc follows the lecture course one-for-one: geometry first, code second, animation third. Modules 1–4 (kinematics, lectures 01–20) are complete; Module 5 (dynamics) has begun; Module 6 is the wrap-up.

---

## Lecture index

Every lecture below is a single self-contained HTML page. Click **▶ Open** to view the published page; the title links to the source file.

### Module 1 · Frames, rotations, transforms

| # | Lecture | Live |
|---|---|---|
| 01 | [Frames of reference, the identity matrix, rotation around X](lectures/01-frames-of-reference.html) | [▶ Open](https://eamcmx.github.io/RoboticsCourse/lectures/01-frames-of-reference.html) |
| 02 | [Rotation around Y and Z, composite rotations](lectures/02-rotations-y-z.html) | [▶ Open](https://eamcmx.github.io/RoboticsCourse/lectures/02-rotations-y-z.html) |
| 03 | [Translations and homogeneous transforms](lectures/03-translations-homogeneous-transforms.html) | [▶ Open](https://eamcmx.github.io/RoboticsCourse/lectures/03-translations-homogeneous-transforms.html) |
| 04 | [Inverse of a homogeneous transform](lectures/04-inverse-of-a-transform.html) | [▶ Open](https://eamcmx.github.io/RoboticsCourse/lectures/04-inverse-of-a-transform.html) |

### Module 2 · Forward kinematics

| # | Lecture | Live |
|---|---|---|
| 05 | [Rigid-body motion: a reusable box function](lectures/05-rigid-body-motion.html) | [▶ Open](https://eamcmx.github.io/RoboticsCourse/lectures/05-rigid-body-motion.html) |
| 06 | [PPP robot — three prismatic joints](lectures/06-ppp-robot.html) | [▶ Open](https://eamcmx.github.io/RoboticsCourse/lectures/06-ppp-robot.html) |
| 07 | [RPP robot and the GUI with sliders](lectures/07-rpp-and-gui.html) | [▶ Open](https://eamcmx.github.io/RoboticsCourse/lectures/07-rpp-and-gui.html) |
| 08 | [SCARA: Adept Cobra S800](lectures/08-scara-cobra.html) | [▶ Open](https://eamcmx.github.io/RoboticsCourse/lectures/08-scara-cobra.html) |
| 09 | [Universal Robots UR5](lectures/09-ur5.html) | [▶ Open](https://eamcmx.github.io/RoboticsCourse/lectures/09-ur5.html) |
| 10 | [The Denavit–Hartenberg convention](lectures/10-dh-convention.html) | [▶ Open](https://eamcmx.github.io/RoboticsCourse/lectures/10-dh-convention.html) |

### Module 3 · Inverse kinematics

| # | Lecture | Live |
|---|---|---|
| 11 | [The Jacobian — joint space ↔ task space](lectures/11-jacobian.html) | [▶ Open](https://eamcmx.github.io/RoboticsCourse/lectures/11-jacobian.html) |
| 12 | [Newton–Raphson for inverse kinematics](lectures/12-newton-raphson-ik.html) | [▶ Open](https://eamcmx.github.io/RoboticsCourse/lectures/12-newton-raphson-ik.html) |
| 13 | [Joint limits and singularities](lectures/13-limits-singularities.html) | [▶ Open](https://eamcmx.github.io/RoboticsCourse/lectures/13-limits-singularities.html) |

### Module 4 · Trajectory planning & integration

| # | Lecture | Live |
|---|---|---|
| 14 | [move J — free joint motion](lectures/14-move-j.html) | [▶ Open](https://eamcmx.github.io/RoboticsCourse/lectures/14-move-j.html) |
| 15 | [move L — linear motion in task space](lectures/15-move-l.html) | [▶ Open](https://eamcmx.github.io/RoboticsCourse/lectures/15-move-l.html) |
| 16 | [move C — circular motion](lectures/16-move-c.html) | [▶ Open](https://eamcmx.github.io/RoboticsCourse/lectures/16-move-c.html) |
| 17 | [Arduino + joysticks: a homemade teach-pendant](lectures/17-arduino-teach-pendant.html) | [▶ Open](https://eamcmx.github.io/RoboticsCourse/lectures/17-arduino-teach-pendant.html) |
| 18 | [RoboDK API — MATLAB ↔ simulator](lectures/18-robodk-api.html) | [▶ Open](https://eamcmx.github.io/RoboticsCourse/lectures/18-robodk-api.html) |
| 19 | [Trajectories on a moving plate](lectures/19-trajectories-on-moving-plate.html) | [▶ Open](https://eamcmx.github.io/RoboticsCourse/lectures/19-trajectories-on-moving-plate.html) |
| 20 | [Master–slave: two robots, one task](lectures/20-master-slave.html) | [▶ Open](https://eamcmx.github.io/RoboticsCourse/lectures/20-master-slave.html) |

### Module 5 · Dynamics

| # | Lecture | Status | Live |
|---|---|---|---|
| 22 | [Introduction to robot dynamics](lectures/22-intro-dynamics.html) | **Ready** | [▶ Open](https://eamcmx.github.io/RoboticsCourse/lectures/22-intro-dynamics.html) |
| 23 | Energy-based approach & the Lagrangian | Coming | — |
| 24 | Worked example: 2-link planar arm with tip masses | Coming | — |
| 25 | Extended 2-DOF simulator: feel the equations | Coming | — |
| 26 | Lagrangian formulation for the general robot | Coming | — |
| 27 | Case study: Mitsubishi MoveMaster RV-M1 | Coming | — |
| 28 | Understanding D, h, and c term by term | Coming | — |

### Module 6 · Wrap-up

| # | Lecture | Live |
|---|---|---|
| 29 | [Course wrap-up & portfolio review](lectures/29-wrap-up.html) | [▶ Open](https://eamcmx.github.io/RoboticsCourse/lectures/29-wrap-up.html) |

> **Alternate build:** an expanded, long-form build of Lecture 01 lives at
> [`lectures/lecture-01-frames-of-reference-the-identity-matrix-rotation-around-x/`](lectures/lecture-01-frames-of-reference-the-identity-matrix-rotation-around-x/index.html)
> ([▶ Open](https://eamcmx.github.io/RoboticsCourse/lectures/lecture-01-frames-of-reference-the-identity-matrix-rotation-around-x/)).

---

## What's in this repo

```
RoboticsCourse/
├── index.html                       # Course landing + full syllabus (all modules)
├── .nojekyll                        # disable Jekyll on GitHub Pages
├── deploy.sh                        # one-shot deploy helper
├── README.md                        # this file
├── css/
│   └── main.css                     # Visual system: typography, layout, widgets
├── js/
│   ├── widgets/
│   │   ├── frame-viewer.js          # Three.js — two coordinate frames + sliders
│   │   ├── composite-viewer.js      # Composite Rx·Ry·Rz rotations
│   │   ├── transform-viewer.js      # 4×4 homogeneous transforms
│   │   ├── matrix-stepper.js        # Click-to-reveal Socratic matrix derivation
│   │   ├── code-sandbox.js          # math.js — MATLAB-style helpers in browser
│   │   ├── rotation-animator.js     # Animated point under a rotation
│   │   ├── robot-viewer.js          # Articulated forward-kinematics chains
│   │   ├── jacobian-viewer.js       # 2-link Jacobian columns + det(J) gauge
│   │   └── dynamic-comparison.js    # Twin 2-link arms: kinematic vs full dynamics
│   └── robots/
│       └── index.js                 # Shared robot models (PPP, RPP, SCARA, UR5, …)
└── lectures/
    ├── 01-frames-of-reference.html … 20-master-slave.html
    ├── 22-intro-dynamics.html
    ├── 29-wrap-up.html
    └── lecture-01-…/index.html      # alternate long-form Lecture 01 build
```

No build step, no bundler, no `node_modules`. Three.js, math.js, and KaTeX are loaded from `cdn.jsdelivr.net` via an [import map](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap), so each lecture page is a single self-contained HTML file.

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

The site is already published from the `main` branch root at
`https://eamcmx.github.io/RoboticsCourse/` (**Settings → Pages → Source = "Deploy from a branch" → Branch = main, root `/`**). It auto-redeploys on every push:

```bash
git add -A && git commit -m "..." && git push
```

`deploy.sh` wraps the add/commit/push for convenience.

---

## How to add a new lecture

Each lecture is one HTML file in `lectures/`. Copy the closest existing lecture of the same kind (a rotation lecture, a robot lecture, a trajectory lecture…), change the title, swap the section content, and reuse the widgets.

### 1. Copy a template

```bash
cp lectures/01-frames-of-reference.html lectures/02-rotations-y-z.html
```

### 2. Update the page header

Edit the `<title>`, `<h1 class="lecture-title">`, eyebrow, subtitle, and the side ToC list.

### 3. Drop in widgets

Each widget mounts itself onto any element carrying the right `data-*` attribute. The page needs the import map (already in the template) and a mount script at the bottom. The original four widgets mount like this:

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

The later modules add more widgets that follow the same `data-*` + `mount*` pattern —
`composite-viewer.js` (composite rotations), `transform-viewer.js` (4×4 transforms),
`robot-viewer.js` (articulated FK chains, backed by `js/robots/index.js`),
`jacobian-viewer.js` (Jacobian columns + `det(J)` gauge), and `dynamic-comparison.js`
(twin-arm kinematic-vs-dynamic demo). Copy the relevant lecture to see the exact mount call and `data-*` attributes for each.

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

`data-id` must match a key in `MATRIX_DEFS` (defined in `matrix-stepper.js`). To add a new one (for example, the SCARA forward kinematics), open `matrix-stepper.js` and add an entry:

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

Find the matching card in `index.html` and:
- Change `class="lecture-card is-disabled"` to `class="lecture-card"`
- Point its `<a href="lectures/…html">` at the new file
- Switch the chip from `○ Coming` to `● Ready`

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

## Status at a glance

| Module | Lectures | Status |
|---|---|---|
| 1 · Frames, rotations, transforms | 01–04 | **Live** |
| 2 · Forward kinematics | 05–10 | **Live** |
| 3 · Inverse kinematics | 11–13 | **Live** |
| 4 · Trajectory planning & integration | 14–20 | **Live** |
| 5 · Dynamics | 22 live; 23–28 coming | In progress |
| 6 · Wrap-up | 29 | **Live** |

---

## License & credits

Course content based on the 2022 lecture corpus from TSI.
Code uses [Three.js](https://threejs.org/), [math.js](https://mathjs.org/), and [KaTeX](https://katex.org/), all via CDN.
