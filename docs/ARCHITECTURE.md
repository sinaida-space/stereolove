# Architecture

Stereolove is intentionally lightweight. It is a Vite application with a canvas renderer and a small set of pure math modules that are covered by unit tests.

## Modules

- `src/main.js` wires DOM controls, camera state, pointer fallback, resize handling, and the animation loop.
- `src/audio.js` creates quiet Web Audio ambience and short reveal or navigation cues after a user gesture.
- `src/scene.js` creates and renders the op-art spatial field: screen aperture, centered portal rings, perspective spokes, monochrome particles, glow passes, and active cyan anamorphic question constellations.
- `src/questions.js` contains the English question prompts rendered as optical constellations.
- `src/projection.js` contains the head-coupled projection math. This module is pure and unit-tested.
- `src/face-tracking.js` dynamically loads MediaPipe only when camera mode starts.
- `src/text-sampler.js` samples canvas text into points that can be distributed through depth.
- `src/config.js` holds shared constants.

## Projection Model

The project uses head-coupled perspective. The virtual eye sits in front of the screen. Each world point is projected through that eye onto the physical screen plane. When the eye moves, the projected coordinates shift as if the display were a window.

The scene geometry is built around that idea. The front aperture is aligned to the screen plane, while portal rings, perspective spokes, particles, and question points exist behind it at different depths. The rings are centered, rectangular, and not rotated, so a viewer facing the screen sees the structure converge toward the screen center. Nearer rings and edge lines are rendered with stronger alpha and line width to reinforce depth. When the eye moves, the same fixed world geometry shifts by off-axis projection, as if the monitor were a window into space behind it. Each question point lies on a sightline from a reveal eye through a target letter position, so the prompt assembles from cyan dots at the reveal viewpoint and disperses through parallax as the viewpoint changes.

The structural geometry avoids autonomous drift. Rings and spokes do not rotate or translate on a timer. The star field does animate through depth: white and pale-cyan particles move slowly from the far vanishing point toward the viewer, producing outward screen motion and a restrained flight sensation. The app also derives a smoothed eye-motion vector so moving particles can stretch subtly in the direction of motion without sharp jumps.

The read lock is handled in `src/main.js`. Eye movement is smoothed with time-based damping. When the eye is near the reveal position and remains still, `readingHold` rises and `src/scene.js` pulls a cyan point cloud into letterforms, then fades in a thin glowing outline over it. The lock is intentionally forgiving: once the prompt resolves, `readingGrace` keeps it readable for at least three seconds before movement can fully dissolve it again. As the lock falls, the same points scatter back to per-point offsets with elastic stretch and compression. Compact screens use wider lock thresholds and reduced scatter amplitude to reduce visual strain.

This is different from a stereogram. It does not create binocular disparity. It creates motion parallax and off-axis perspective.

## Camera Dependency

The first render does not depend on MediaPipe. MediaPipe is loaded dynamically when the user presses `Start camera`. This keeps the artwork usable when camera access, model loading, or a CDN request fails.

## Browser Requirements

- Pointer mode works in any modern browser with Canvas 2D support.
- Camera mode requires `getUserMedia`, which works on `localhost` or HTTPS.
- GitHub Pages is suitable for deployment because it serves HTTPS.
