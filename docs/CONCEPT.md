# Concept

## Stereolove: The Reality Negotiator

Stereolove is a browser-based perceptual artwork about the instability of reality under observation. It begins with the emotional premise of stereograms: some viewers can see the hidden depth, some cannot, and the image seems to withhold a world from the viewer.

This project reverses that relationship. Instead of asking the viewer to adapt to a fixed illusion, the illusion adapts to the viewer. A webcam estimates head position, and the image shifts as if the monitor were a window into a responsive optical chamber.

The current direction treats the monitor as the front opening of a deep box. The edges of the screen become a physical aperture. Behind it are walls, floor, ceiling, and a back plane. As the viewer moves, the planes reveal different questions and appear to unfold, making the flat monitor feel like a spatial object.

## Visual Language

The work uses a psychedelic geometric language inspired by op art, moire interference, retinal afterimages, and fractal symmetry:

- a screen-aligned aperture frames the monitor as a window,
- side walls, ceiling, and floor recede into a deep perceptual chamber,
- moving line fields create interference patterns on the walls,
- fractal rosettes rotate inside the chamber,
- colored point clouds create peripheral instability,
- question text appears as dot typography attached to the tunnel walls.

The visual system should feel precise rather than decorative. It is about cognition, not wallpaper: the artwork asks how much of reality is in the object and how much is constructed by the observer.

## Interaction

There are two modes:

- Pointer mode uses mouse or trackpad position to simulate head movement.
- Camera mode uses MediaPipe Face Landmarker to estimate the viewer's face position.

Looking left, right, up, or down changes the virtual eye position. The corresponding wall becomes more legible, and the tunnel opens slightly in that direction.

Camera mode treats the first stable face position as neutral. The viewer can recalibrate at any time.

## Theme

The core theme is negotiated perception: reality is not a single static picture, but a relationship between viewpoint, attention, memory, and expectation. The same image can be correct from multiple incompatible positions.
