<!--
Sync Impact Report
Version change: 0.0.0 -> 1.0.0
Modified principles:
- Added Perceptual Integrity First
- Added Performance Budgets Are Product Requirements
- Added Privacy-By-Design Camera Interaction
- Added Accessible Fallbacks and Readability
- Added English-Only, Test-Gated Delivery
Added sections:
- Project Constraints
- Development Workflow and Quality Gates
Removed sections:
- None
Templates requiring updates:
- .specify/templates/plan-template.md: Reviewed, no project override required
- .specify/templates/spec-template.md: Reviewed, no project override required
- .specify/templates/tasks-template.md: Reviewed, no project override required
Follow-up items:
- None
-->

# Stereolove Constitution

## Core Principles

### I. Perceptual Integrity First

Every significant change MUST preserve Stereolove as an optical art experience where the monitor appears to open into a responsive spatial volume. Visual elements MUST support the core concept: hidden-angle perception, dispersed point text, depth illusion, and the psychological act of searching for meaning in space. Decorative effects that distract from this concept, obscure the question cloud, or make the camera response feel like a flat pan are not acceptable without a documented rationale and visual verification.

### II. Performance Budgets Are Product Requirements

Smooth interaction is part of the artwork, not an implementation detail. Rendering, tracking, audio, and UI work MUST have explicit performance budgets and graceful degradation paths before release. Interactive rendering MUST avoid unbounded frame backlogs, hidden-tab work, and expensive effects that cannot scale down on mobile or older laptops. Camera and hand inference MUST be throttled separately from visual rendering, and the application MUST keep accessible controls responsive while the experience is active.

### III. Privacy-By-Design Camera Interaction

Camera and hand tracking MUST be opt-in, local to the browser, and clearly explained before use. The project MUST NOT upload, store, or transmit camera frames, biometric signals, gestures, or interaction traces. A non-camera interaction path MUST remain available for visitors who deny camera permission, use unsupported devices, or prefer mouse, touch, or keyboard navigation.

### IV. Accessible Fallbacks and Readability

The hidden text can be mysterious, but the experience MUST remain usable. A captured question MUST hold long enough to read, controls for next question, camera off, and sound on/off MUST remain available, and mobile users MUST receive clear landscape guidance when portrait orientation harms the interaction. Motion, bloom, and sound SHOULD be subtle enough to support extended viewing without eye strain.

### V. English-Only, Test-Gated Delivery

All committed project UI, documentation, code comments, test names, and planning artifacts MUST be in English. Every release MUST run the repository checks, verify that no retired relationship-oriented prompts remain, and verify that no Russian text was introduced into project files. Website changes MUST be checked in a live or local browser preview before they are considered complete.

## Project Constraints

Stereolove is a static browser artwork deployed through GitHub Pages. The runtime stack is Vite, JavaScript ES modules, Canvas2D, MediaPipe Tasks Vision, Web Audio, and local browser APIs. The project has no backend and MUST NOT introduce server-side dependencies for the public experience without a new specification and privacy review.

Runtime dependencies MUST stay minimal. Heavy libraries, WebGL migrations, workers for vision inference, or new build tooling require a written plan explaining the user-visible benefit, fallback behavior, and verification strategy. Canvas2D remains acceptable when performance budgets are met; if those budgets cannot be met, the rendering architecture MUST be reconsidered through a dedicated specification.

## Development Workflow and Quality Gates

Significant features and optimization phases MUST follow the Spec Kit flow: constitution alignment, feature specification, implementation plan, task breakdown, implementation, and verification. The plan MUST identify independently testable user stories and measurable success criteria before code changes begin.

Before release, the following gates MUST pass:

- `npm run format`
- `npm run check`
- A search proving retired relationship-oriented prompts are absent from active source, tests, and docs
- A search proving no Russian text appears in committed project files
- A local preview or deployed GitHub Pages check confirming the website loads

Visual or interaction changes MUST include at least one browser-based verification path. For camera and hand-tracking work, verification MUST cover camera-denied fallback behavior and a non-camera input path.

## Governance

This constitution supersedes conflicting local practices and planning documents. Changes to these principles require a documented amendment, a version change, and a Sync Impact Report describing affected templates, specs, and tasks.

Versioning follows semantic intent: MAJOR for governance or principle changes, MINOR for new required gates or constraints, and PATCH for clarifications that do not change requirements. Every feature plan MUST include a Constitution Check before research and again after design.

**Version**: 1.0.0 | **Ratified**: 2026-05-23 | **Last Amended**: 2026-05-23
