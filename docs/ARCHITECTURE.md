# Architecture

Stereolove is intentionally lightweight. It is a Vite application with a canvas renderer and a small set of pure math modules that are covered by unit tests.

## Modules

- `src/main.js` wires DOM controls, camera state, pointer fallback, resize handling, and the animation loop.
- `src/scene.js` creates and renders the op-art spatial chamber: screen aperture, tunnel walls, line fields, rosettes, particles, and wall-bound question typography.
- `src/questions.js` contains the English question prompts rendered on the chamber walls.
- `src/projection.js` contains the head-coupled projection math. This module is pure and unit-tested.
- `src/face-tracking.js` dynamically loads MediaPipe only when camera mode starts.
- `src/text-sampler.js` samples canvas text into points that can be distributed through depth.
- `src/config.js` holds shared constants.

## Projection Model

The project uses head-coupled perspective. The virtual eye sits in front of the screen. Each world point is projected through that eye onto the physical screen plane. When the eye moves, the projected coordinates shift as if the display were a window.

The chamber geometry is built around that idea. The front aperture is aligned to the screen plane, while the side walls, floor, ceiling, and back wall exist behind it. This makes motion parallax legible: the viewer is not just moving a poster, but looking into a constructed interior.

This is different from a stereogram. It does not create binocular disparity. It creates motion parallax and off-axis perspective.

## Camera Dependency

The first render does not depend on MediaPipe. MediaPipe is loaded dynamically when the user presses `Start camera`. This keeps the artwork usable when camera access, model loading, or a CDN request fails.

## Browser Requirements

- Pointer mode works in any modern browser with Canvas 2D support.
- Camera mode requires `getUserMedia`, which works on `localhost` or HTTPS.
- GitHub Pages is suitable for deployment because it serves HTTPS.
