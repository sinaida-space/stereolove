# Concept

## Stereolove: The Reality Negotiator

Stereolove is a browser-based perceptual artwork about the instability of reality under observation. It begins with the emotional premise of stereograms: some viewers can see the hidden depth, some cannot, and the image seems to withhold a world from the viewer.

This project reverses that relationship. Instead of asking the viewer to adapt to a fixed illusion, the illusion adapts to the viewer. A webcam, mouse, or touch input changes the image as if the monitor were a window into a responsive optical volume.

The current direction treats the monitor as glass over a luminous perceptual field. Behind the screen is a star tube made from centered rings, perspective spokes, retinal point clouds, and one active anamorphic question at a time. The question is made from dots distributed through depth; it becomes language from the reveal viewpoint and dissolves back into scattered light as the viewer moves.

## Visual Language

The work uses a psychedelic geometric language inspired by op art, moire interference, retinal afterimages, and fractal symmetry:

- a screen-aligned aperture frames the monitor as glass,
- centered wireframe rings create a stable vanishing point when the viewer faces the screen,
- perspective spokes shift by off-axis projection when the viewer moves,
- star fields and tiny halos make the volume feel suspended in space,
- colored point clouds create peripheral instability,
- question text appears only as a dot-typography constellation, with glow and light scatter replacing ordinary text rendering.

The visual system should feel precise rather than decorative. It is about cognition, not wallpaper: the artwork asks how much of reality is in the object and how much is constructed by the observer.

## Interaction

The work begins with an onboarding screen that frames the piece as an expanded-screen artwork and asks the viewer how the chamber should respond. There are three entry modes:

- Camera mode uses MediaPipe Face Landmarker to estimate the viewer's face position.
- Mouse mode uses pointer position to simulate head movement.
- Touch mode uses touch position for mobile and tablet navigation.

Looking left, right, up, or down changes the virtual eye position. The tunnel geometry and question constellation shift with motion parallax, making the flat screen behave like a volume that reacts to attention. The scene avoids autonomous animation: if the viewer is still, the space stays still, and only the reading state can settle into a clearer glowing prompt.

Camera mode treats the first stable face position as neutral. Optional tuning allows the viewer to recenter the view and adjust depth or sensitivity before entering again. Questions change only when the viewer asks for the next one, so the work can pause long enough for reading and reflection.

## Theme

The core theme is negotiated perception: reality is not a single static picture, but a relationship between viewpoint, attention, memory, and expectation. The same image can be correct from multiple incompatible positions.
