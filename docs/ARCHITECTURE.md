# Architecture

Stereolove is intentionally lightweight. It is a Vite application with a canvas renderer and a small set of pure math modules that are covered by unit tests.

## Modules

- `src/main.js` wires DOM controls, camera state, pointer fallback, resize handling, and the animation loop.
- `src/scene.js` creates and renders the op-art spatial field: screen aperture, floating wireframe panes, line fields, rosettes, particles, light rays, and active anamorphic question constellations.
- `src/questions.js` contains the English question prompts rendered as optical constellations.
- `src/projection.js` contains the head-coupled projection math. This module is pure and unit-tested.
- `src/face-tracking.js` dynamically loads MediaPipe only when camera mode starts.
- `src/text-sampler.js` samples canvas text into points that can be distributed through depth.
- `src/config.js` holds shared constants.

## Projection Model

The project uses head-coupled perspective. The virtual eye sits in front of the screen. Each world point is projected through that eye onto the physical screen plane. When the eye moves, the projected coordinates shift as if the display were a window.

The scene geometry is built around that idea. The front aperture is aligned to the screen plane, while floating frames, particles, rays, and question points exist behind it at different depths. Each question point lies on a sightline from a reveal eye through a target letter position, so the prompt assembles from dots at the reveal viewpoint and disperses through parallax as the viewpoint changes. The artwork avoids a literal corridor; depth is produced by off-axis projection, motion parallax, and layered optical structure rather than walls.

This is different from a stereogram. It does not create binocular disparity. It creates motion parallax and off-axis perspective.

## Camera Dependency

The first render does not depend on MediaPipe. MediaPipe is loaded dynamically when the user presses `Start camera`. This keeps the artwork usable when camera access, model loading, or a CDN request fails.

## Browser Requirements

- Pointer mode works in any modern browser with Canvas 2D support.
- Camera mode requires `getUserMedia`, which works on `localhost` or HTTPS.
- GitHub Pages is suitable for deployment because it serves HTTPS.
