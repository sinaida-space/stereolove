# Concept

## Stereolove: The Reality Negotiator

Stereolove is a browser-based perceptual artwork about the instability of reality under observation. It begins with the emotional premise of stereograms: some viewers can see the hidden depth, some cannot, and the image seems to withhold a world from the viewer.

This project reverses that relationship. Instead of asking the viewer to adapt to a fixed illusion, the illusion adapts to the viewer. A webcam, mouse, or touch input changes the image as if the monitor were a window into a responsive optical volume.

The current direction treats the monitor as glass over a luminous perceptual field. Behind the screen is a white-to-cyan star tube made from centered rings, perspective spokes, outward-flowing retinal point clouds, and one active anamorphic question at a time. The question is made from brighter cyan dots distributed through depth; it becomes language from the reveal viewpoint and dissolves back into scattered light as the viewer moves.

## Visual Language

The work uses a psychedelic geometric language inspired by op art, moire interference, retinal afterimages, and fractal symmetry:

- a screen-aligned aperture frames the monitor as glass,
- centered rectangular wireframe rings create a stable vanishing point when the viewer faces the screen,
- perspective spokes shift by off-axis projection when the viewer moves,
- white and pale-cyan star fields move slowly outward from the vanishing point,
- the question cloud is separated from the background through brighter cyan point tones,
- question text appears first as a cyan dot cloud, then compresses into a thin glowing outline with a soft flash and small audio cue when the viewer finds the reading position.

The visual system should feel precise rather than decorative. It is about cognition, not wallpaper: the artwork asks how much of reality is in the object and how much is constructed by the observer.

## Interaction

The work begins with an onboarding screen that frames the piece as an expanded-screen artwork and asks the viewer how the chamber should respond. There are three entry modes:

- Camera mode uses MediaPipe Face Landmarker to estimate the viewer's face position.
- Mouse mode uses pointer position to simulate head movement.
- Touch mode uses touch position for mobile and tablet navigation.

Looking left, right, up, or down changes the virtual eye position. The tunnel geometry and question constellation shift with motion parallax, making the flat screen behave like a volume that reacts to attention. The fixed structure stays calm while the star field moves through depth, so the sensation is closer to looking into a moving volume than watching a rotating graphic. Text points stretch with motion, compress into language when the viewpoint is found, and scatter back into fragments when the viewpoint is lost. On phones, the work recommends landscape orientation so the text has more horizontal room and resolves with less strain.

Camera mode treats the first stable face position as neutral. Optional tuning allows the viewer to recenter the view and adjust depth or sensitivity before entering again. Questions change only when the viewer asks for the next one. Once a question resolves, it remains readable for at least three seconds so the viewer can pause with it before moving on.

## Theme

The core theme is negotiated perception: reality is not a single static picture, but a relationship between viewpoint, attention, memory, and expectation. The same image can be correct from multiple incompatible positions.
