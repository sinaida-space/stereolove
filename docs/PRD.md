# Product Requirements Document: Stereolove-Style Perceptual Web Installation

## 1. Product Summary

Stereolove is an interactive browser-based perceptual artwork that treats the screen as a responsive optical volume rather than a flat image. The viewer changes the virtual viewpoint through head tracking, mouse movement, or touch. A hidden anamorphic text constellation becomes readable only from specific viewing angles, then dissolves back into scattered light.

This PRD is written as a reusable blueprint for recreating similar projects: browser-native, head-coupled, camera-optional, visually immersive artworks about perception, spatial illusion, memory, identity, or the instability of reality.

## 2. Product Vision

The project should make the viewer feel that the monitor has depth behind it. The artwork should not behave like a decorative animation or a simple mouse-following graphic. It should feel like a perceptual instrument: the viewer searches the space, finds an angle, resolves a hidden message, pauses with it, and then shifts into another perspective.

The core emotional loop is:

1. Enter a dark optical field.
2. Move slowly to search for a hidden angle.
3. See scattered points gather into readable language.
4. Hold still while the message remains readable.
5. Use a ritual gesture or fallback control to open the next question.

## 3. Target Audience

Primary users:

- visitors to an artist website or online portfolio,
- viewers interested in digital art, op art, illusion, psychology, perception, and interactive installations,
- gallery, festival, or performance audiences previewing a web-native artwork,
- collaborators who may reuse the pattern for future spatial-text projects.

Secondary users:

- users on mobile devices who cannot or do not want to use camera tracking,
- users who prefer mouse, trackpad, keyboard, or touch accessibility fallbacks,
- developers recreating the experience with a new theme, visual language, or question set.

## 4. Product Goals

- Create a convincing head-coupled spatial illusion on a normal 2D screen.
- Make hidden text feel discovered rather than simply displayed.
- Keep camera tracking optional and privacy-preserving.
- Preserve the artwork on devices with limited CPU/GPU capacity through adaptive quality.
- Provide a clear onboarding flow so users understand what to do before entering the experience.
- Keep the product deployable as a static site on GitHub Pages or similar hosting.
- Document the concept, architecture, privacy behavior, and testing workflow well enough for future reuse.

## 5. Non-Goals

- Do not require VR, AR, stereoscopic glasses, or autostereogram eye fusion.
- Do not upload camera frames or biometric data to a server.
- Do not make the hand gesture the primary navigation method; it is a ritual layer for changing questions.
- Do not rely on heavy external assets, video files, or large image textures for the core effect.
- Do not prioritize maximum visual density over reliable loading and interaction.
- Do not make a marketing landing page as the primary screen; the first screen must explain and enter the artwork.

## 6. Core Experience

### 6.1 Onboarding

The first screen must explain the artwork in concise, poetic, usable language:

- what the project is,
- why the screen responds to movement,
- how to interact,
- what happens with the camera,
- what fallback modes are available.

Required onboarding copy pattern:

- Project title in a distinctive display font.
- One short conceptual paragraph.
- One short interaction paragraph.
- Three direct instructions:
  - move your head to search for the hidden angle,
  - raise an open hand near your face to open another question,
  - no camera means mouse or touch can explore the same space.

The onboarding panel should sit over the live visual field, but the background must be darkened enough for readability. The panel should feel like translucent glass: blur, bloom, subtle shadow, and a restrained border.

### 6.2 Entry Modes

The user must be able to enter through:

- Camera mode: face tracking drives head-coupled perspective.
- Mouse mode: pointer position simulates head movement.
- Touch mode: touch position simulates head movement on mobile/tablet.

Visible controls must remain available as fallbacks:

- Next question,
- Camera off,
- Sound on/off,
- Exit.

### 6.3 Calibration

Camera mode must begin with a short alignment moment. The system should ask the viewer to align their face and wait briefly until the portal stabilizes. The first stable face position becomes the neutral viewpoint.

Calibration should be short. It should communicate that the screen responds to the viewer’s position, not feel like a technical setup screen.

### 6.4 Main Spatial Interaction

The scene must use head-coupled or pointer-coupled off-axis perspective:

- When the viewer is centered, the tunnel or spatial field should have a stable vanishing point.
- When the viewer moves, the projection shifts as if looking into a volume behind glass.
- The whole world should not rotate like a 2D object following the mouse.
- Motion should be smooth and slightly damped.
- When the viewer is still, the main structure should calm down; only subtle ambient drift may continue.

### 6.5 Hidden Text

Each question must be represented by dispersed 3D points. The text should not simply appear as flat text.

Required behavior:

- One active question at a time.
- The question appears as a point cloud distributed through depth.
- From the reveal viewpoint, the same points align into readable text.
- A thin glowing outline hint may appear when the user is close enough to the correct angle.
- When the text resolves, it should hold for at least 3 seconds.
- When the text disappears, it should dissolve like smoke or scattered particles.
- Question changes should avoid immediate repetition within a session.

### 6.6 Hand Gesture

If camera mode is available, hand tracking should add one ritual action:

- An open hand near the face triggers the next question.
- The scene performs a short controlled spiral transition.
- Text and points scatter.
- A message such as `Shifting perspective...` appears briefly.
- The next question opens after the transition.

The hand gesture must not replace head tracking. It only changes the question.

### 6.7 Sound

Sound must start only after a user action. It must never autoplay before consent.

Sound layers:

- quiet ambient drone after entering,
- soft glow sound when text resolves,
- short crystalline shimmer when a hand gesture changes the question.

The user must be able to mute sound.

## 7. Visual Requirements

The visual system should feel meditative, futuristic, precise, and gallery-grade. It should avoid clutter, excessive color, and fast motion.

Required visual direction:

- dark background,
- monochrome white with cyan accents for spatial geometry,
- brighter cyan tones for text points,
- thin rectangular wireframe portal geometry,
- star-field depth,
- subtle comet-like trails on only a small subset of particles,
- soft bloom and blur, not harsh gradient banding,
- point-cloud text with a magical outline hint,
- restrained UI outside the artwork.

The scene should evoke op art, perception studies, head-coupled perspective experiments, and luminous spatial installations. It should not look like a generic screensaver, stock sci-fi tunnel, or fast music visualizer.

## 8. Content Requirements

Questions should support the theme of self-perception and negotiated reality. They should focus on the individual viewer, not on a romantic pair or shared relationship.

Question themes:

- being seen or misunderstood,
- emotional safety,
- memory,
- attention,
- trust,
- intensity,
- sensitivity,
- inner change,
- reality and viewpoint.

Question rules:

- No prompts that require a romantic pair or second participant.
- No prompts requiring another person to answer.
- No medical, diagnostic, or manipulative language.
- Keep each question short enough to resolve into readable multi-line text.

## 9. Privacy Requirements

Camera processing must happen locally in the browser.

Required privacy behavior:

- Do not record video.
- Do not send camera frames to a server.
- Do not store biometric data.
- Do not start the camera without user action.
- Provide camera-off and non-camera modes.
- Provide a privacy policy.
- Use only essential local storage unless analytics or tracking is explicitly added later.

Cookie/local storage behavior:

- Essential local storage may remember cookie notice acceptance.
- Essential local storage may remember sound preference.
- If non-essential analytics are added, a proper consent flow must be added first.

## 10. Performance Requirements

The system must prioritize loading and responsiveness over visual density.

Required performance behavior:

- Start in a conservative quality mode.
- Run a short readiness check before enabling interaction.
- Adapt frame rate, DPR, particle count, and render passes based on measured frame cost.
- Throttle camera inference.
- Do not run face and hand inference every animation frame.
- Avoid expensive Canvas2D operations on every particle.
- Reduce glow, shadows, trails, and text detail on low-performance devices.
- Pause rendering and inference when the tab is hidden.
- Keep camera and hand tracking optional and lazily loaded.

Performance acceptance targets:

- The onboarding screen must load and become usable on desktop and mobile.
- The app must not freeze when camera mode is unavailable or blocked.
- Mobile should prefer light mode by default.
- The visual system should remain coherent even when quality is reduced.

## 11. Accessibility and Fallbacks

Required fallbacks:

- Mouse mode.
- Touch mode.
- Visible next-question button.
- Camera off button.
- Sound toggle.
- Exit button.
- Keyboard shortcut for next question where appropriate.
- Landscape recommendation on portrait mobile.

The artwork may be visually experimental, but basic controls must remain understandable and reachable.

## 12. Technical Requirements

Recommended stack:

- static Vite app,
- browser Canvas2D or WebGL renderer,
- MediaPipe Face Landmarker for camera-based head tracking,
- MediaPipe Hand Landmarker for near-face gesture detection,
- Web Audio API for generated sound,
- GitHub Pages deployment.

Core modules should separate:

- app lifecycle and UI state,
- projection math,
- face tracking,
- hand tracking,
- rendering,
- text sampling,
- question content,
- audio.

Camera libraries should load only after the viewer chooses camera mode.

## 13. Deployment Requirements

The app should deploy as a static site.

For GitHub Pages:

- configure the correct base path,
- run lint/test/build in CI,
- deploy from `main` or a controlled release branch,
- verify the live URL after deployment.

Production URL format:

```text
https://<owner>.github.io/<repo>/
```

## 14. QA and Acceptance Criteria

Before shipping any meaningful change:

- Run formatter.
- Run lint.
- Run tests.
- Run production build.
- Run production preview locally.
- Verify desktop viewport visually.
- Verify mobile viewport visually.
- Verify the live deployment after push.

Functional acceptance criteria:

- Onboarding loads and controls become available after readiness check.
- Camera mode asks for permission only after user action.
- Camera failure does not break mouse/touch modes.
- Text resolves from a hidden point cloud, not from a flat text-only overlay.
- Resolved text holds long enough to read.
- Next question does not repeat immediately.
- Hand gesture changes question only when camera/hand tracking is active.
- Sound starts only after user interaction.
- Mobile portrait shows a landscape recommendation.
- Site has no horizontal overflow on mobile.

Visual acceptance criteria:

- The screen reads as a spatial volume, not a flat animation.
- The background is dark enough behind onboarding text.
- The panel has a translucent glass feel with blur/bloom/shadow.
- The title has enough spacing before and after it.
- Motion is smooth and not too fast.
- Bloom is soft, not a harsh gradient ladder.
- Particle density does not make the app unusable.

## 15. Reuse Checklist for Similar Projects

To recreate this pattern for another artwork:

1. Define the conceptual theme.
2. Choose the hidden content type: questions, poems, memories, names, fragments, or symbols.
3. Decide the visual language: star field, architectural volume, liquid light, grid, botanical geometry, etc.
4. Keep one primary spatial interaction: head/pointer/touch viewpoint.
5. Add one secondary ritual gesture only if it supports the concept.
6. Build all non-camera fallbacks first.
7. Add camera tracking as an enhancement.
8. Add adaptive performance before increasing visual complexity.
9. Verify desktop and mobile every iteration.
10. Document privacy, deployment, and QA requirements.

## 16. Open Future Improvements

Possible future directions:

- WebGL renderer for more efficient bloom and particle rendering.
- Worker-based vision inference if browser support and project complexity justify it.
- More advanced calibration scene.
- Curated visual presets for different exhibitions.
- Optional offline/gallery mode.
- More robust performance telemetry shown only in developer mode.
- Localized onboarding copy if the project later needs multiple languages.
