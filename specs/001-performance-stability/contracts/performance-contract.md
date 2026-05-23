# Performance and Interaction Contract

This project has no external API contract. This file defines the observable runtime contract that implementation work must preserve.

## Rendering Contract

- The scene MUST expose a bounded render profile with target frame pacing.
- The render loop MUST avoid accumulating visual work when frames are missed.
- Hidden or backgrounded pages MUST pause or substantially reduce expensive rendering.
- Reduced profiles MUST preserve portal depth, dispersed point text, and monochrome white/cyan visual identity.
- Bloom MUST remain smooth enough to avoid visible gradient staircase artifacts in QA screenshots.

## Interaction Contract

- Camera mode MUST be opt-in and local.
- Pointer, touch, or visible controls MUST remain available even when camera mode is active.
- Hand gestures MAY advance the question, but they MUST NOT be the only next-question mechanism.
- A question lock MUST remain readable for at least three seconds after it is first captured.
- Question changes MUST not repeat a question in the same session until the deck is exhausted.

## Sound Contract

- Sound MUST NOT begin before a user action.
- Ambient sound MUST be optional and controllable.
- Gesture and text-lock sounds MUST be short, subtle, and synchronized with the visual event.

## Verification Contract

- `npm run format` and `npm run check` MUST pass before release.
- Active source, tests, docs, and planning artifacts MUST remain English-only.
- Retired relationship-oriented prompts MUST NOT appear in active project content.
- A local preview or live GitHub Pages URL MUST be checked before a website change is considered complete.
