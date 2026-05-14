# Concept

## Stereolove: The Reality Negotiator

Stereolove is a browser-based perceptual artwork about the instability of reality under observation. It begins with the emotional premise of stereograms: some viewers can see the hidden depth, some cannot, and the image seems to withhold a world from the viewer.

This project reverses that relationship. Instead of asking the viewer to adapt to a fixed illusion, the illusion adapts to the viewer. A webcam estimates head position, and the image shifts as if the monitor were a window into a responsive optical chamber.

## Visual Language

The work uses a psychedelic geometric language inspired by op art, moire interference, retinal afterimages, and fractal symmetry:

- concentric perspective frames create a cabinet-like tunnel,
- moving line fields create interference patterns,
- fractal rosettes rotate at different depths,
- colored point clouds create peripheral instability,
- anamorphic text fragments resolve from some viewpoints and break apart from others.

The visual system should feel precise rather than decorative. It is about cognition, not wallpaper: the artwork asks how much of reality is in the object and how much is constructed by the observer.

## Interaction

There are two modes:

- Pointer mode uses mouse or trackpad position to simulate head movement.
- Camera mode uses MediaPipe Face Landmarker to estimate the viewer's face position.

Camera mode treats the first stable face position as neutral. The viewer can recalibrate at any time.

## Theme

The core theme is negotiated perception: reality is not a single static picture, but a relationship between viewpoint, attention, memory, and expectation. The same image can be correct from multiple incompatible positions.
