# Stereolove

Stereolove is a head-coupled op-art installation about perception, perspective, and different ways of constructing reality.

The browser estimates the viewer's head position with MediaPipe Face Landmarker and changes the projection so the monitor behaves like an unstable optical volume behind glass. Without a camera, the same effect works with mouse, trackpad, or touch navigation.

The current scene avoids a literal room or corridor. It uses floating wireframe panes, retinal point fields, light rays, and one active anamorphic question at a time. The question is not drawn as ordinary text; it is built from 3D points that align from the reveal viewpoint and scatter as the viewpoint changes.

## Live Site

Production deployment:

```text
https://sinaida-space.github.io/stereolove/
```

## Concept

The piece is called **The Reality Negotiator**. It uses psychedelic geometry, op-art line interference, fractal rosettes, and anamorphic text to explore a simple question: what changes when reality is viewed from another position?

Read the full concept in [docs/CONCEPT.md](docs/CONCEPT.md).

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

- `Use camera` starts camera tracking, then enters the fullscreen artwork.
- `Use mouse` enters the artwork with pointer-based perspective.
- `Use touch` enters the artwork with touch-based perspective.

The header, footer, cookie notice, and controls are hidden while the artwork is active. The `Exit` button returns to the onboarding screen.

Camera mode requires `getUserMedia`, which works on `localhost` or HTTPS. Camera processing runs locally in the browser. The first stable face position is treated as neutral, and `Recenter view` is available in optional tuning.

MediaPipe is loaded only when camera mode starts, so the artwork still runs if camera access is blocked.

## Project Structure

```text
src/
  config.js         shared constants
  face-tracking.js  dynamic MediaPipe loader and face measurement
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
- [Head-coupled perspective](https://en.wikipedia.org/wiki/Head-coupled_perspective)
- [Google Chrome Experiment: Head-Coupled 3D Transforms](https://experiments.withgoogle.com/chrome/head-coupled-3d-transforms)
