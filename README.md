# Stereolove

Stereolove is a head-coupled op-art installation about perception, perspective, and different ways of constructing reality.

The browser estimates the viewer's head position with MediaPipe Face Landmarker and changes the projection so the monitor behaves like an unstable optical volume behind glass. MediaPipe Hand Landmarker adds one ritual gesture: raising an open hand near the face opens another question. Without a camera, the same perspective effect works with mouse, trackpad, or touch navigation.

The current scene treats the monitor as a portal into a star tube. Rings, perspective spokes, and background stars use a restrained white-to-cyan palette and stay physically organized behind the screen. Small particles drift slowly outward from the vanishing point. One active introspective question is built as a brighter cyan point cloud: the same fixed 3D points read as text from the reveal viewpoint and disperse through parallax as the viewpoint changes.

## Live Site

Production deployment:

```text
https://sinaida-space.github.io/stereolove/
```

## Concept

The piece is called **The Reality Negotiator**. It uses psychedelic geometry, op-art line interference, a head-coupled star tunnel, and anamorphic text to explore a simple question: what changes when reality is viewed from another position?

Read the full concept in [docs/CONCEPT.md](docs/CONCEPT.md).

For a reusable product blueprint, read [docs/PRD.md](docs/PRD.md). It describes the requirements for recreating VOOIDY-style perceptual web installations with different themes, content, or visual systems.

## Quick Start

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL printed by Vite. It will include the project base path, for example:

```text
http://127.0.0.1:4173/stereolove/
```

## Scripts

```bash
npm run dev      # local Vite development server
npm run build    # production build
npm run preview  # preview the production build
npm run test     # unit tests
npm run lint     # ESLint
npm run format   # Prettier
npm run check    # lint, test, and build
```

## Deployment

The site is deployed to GitHub Pages by `.github/workflows/deploy-pages.yml` whenever `main` is updated. Vite is configured with `base: "/stereolove/"` so production assets resolve correctly from the project page path.

## Experience Flow

The public page starts with a short onboarding screen. The viewer chooses one of three modes:

- `Use camera` starts camera tracking, enters fullscreen, and shows a short face-alignment calibration moment before the artwork becomes fully responsive.
- `Use mouse` enters the artwork with pointer-based perspective.
- `Use touch` enters the artwork with touch-based perspective.

The header, footer, cookie notice, and controls are hidden while the artwork is active. The `Exit` button returns to the onboarding screen.

On mobile portrait screens, the interface recommends rotating the phone to landscape. Landscape gives the head-coupled projection enough horizontal space and makes the text cloud easier to resolve.

Questions do not advance on a timer. The viewer can hold still to let the point field resolve; edge points from the same cloud form a thin glowing contour hint, then the viewer can raise an open hand near the face, use `Next question`, or press the `N` key when ready. The app avoids repeating questions until the current shuffled question deck has been exhausted.

When the question resolves, the text remains readable for at least three seconds and a quiet Web Audio chime marks the moment. After the hold period, the points and contour dissolve into a smoke-like drift. A hand gesture triggers a controlled spiral transition with a small crystalline cue. Ambient sound is generated in the browser after the viewer chooses an interaction mode; no audio files are loaded, and the active artwork includes a sound toggle.

Camera mode requires `getUserMedia`, which works on `localhost` or HTTPS. Camera processing runs locally in the browser. The first stable face position is treated as neutral, and `Recenter view` is available in optional tuning. Hand tracking is a secondary gesture layer and never replaces head tracking or pointer fallback.

MediaPipe is loaded only when camera mode starts, so the artwork still runs if camera access is blocked.

The renderer adapts to device load. It measures frame cost, lowers frame rate and DPR when needed, reduces particle and text-dot detail, cuts extra glow passes, and pauses work when the tab is hidden. Camera and hand detection are throttled and never run in the same animation frame.

## Project Structure

```text
src/
  config.js         shared constants
  audio.js          small Web Audio ambience and reveal cues
  face-tracking.js  dynamic MediaPipe loader and face measurement
  hand-tracking.js  dynamic MediaPipe loader and near-face hand gesture detection
  main.js           app lifecycle and interaction state
  projection.js     pure head-coupled projection math
  questions.js      question prompts rendered as optical constellations
  scene.js          canvas rendering and visual system
  text-sampler.js   anamorphic text point sampling
test/
  projection.test.js
docs/
  ARCHITECTURE.md
  CONCEPT.md
```

## Research Notes

- This is head-coupled perspective, also called off-axis perspective.
- It is not an autostereogram and does not require the viewer to fuse two images.
- The effect relies on motion parallax and a projection that responds to viewpoint.

References:

- [MediaPipe Face Landmarker for Web](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js)
- [MediaPipe Hand Landmarker for Web](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js)
- [Head-coupled perspective](https://en.wikipedia.org/wiki/Head-coupled_perspective)
- [Google Chrome Experiment: Head-Coupled 3D Transforms](https://experiments.withgoogle.com/chrome/head-coupled-3d-transforms)
