# Implementation Plan: Performance and Perception Stability

**Branch**: `main` | **Date**: 2026-05-23 | **Spec**: `specs/001-performance-stability/spec.md`

**Input**: Feature specification from `specs/001-performance-stability/spec.md`

## Summary

Optimize Stereolove so the public artwork stays smooth, readable, and spatial on real devices while preserving the hidden-angle point-text concept. The next implementation phase should keep the current static Vite and Canvas2D architecture, add stricter runtime budgets, reduce expensive visual work on weaker devices, keep camera and hand tracking as optional layers, and formalize release verification for GitHub Pages.

## Technical Context

**Language/Version**: JavaScript ES modules, browser APIs, Vite project targeting modern evergreen browsers

**Primary Dependencies**: Vite, MediaPipe Tasks Vision, Canvas2D, Web Audio, Vitest, ESLint, Prettier

**Storage**: Browser session/local state only for non-sensitive UI preferences and question memory; no backend storage

**Testing**: `npm run format`, `npm run check`, Vitest unit tests, local Vite preview, browser screenshot/manual interaction checks, GitHub Pages live verification

**Target Platform**: Static web app deployed to GitHub Pages at `https://sinaida-space.github.io/stereolove/`

**Project Type**: Single-project static browser artwork

**Performance Goals**: Maintain perceptually smooth motion through adaptive target frame intervals, keep UI controls responsive during active rendering, reduce hidden-tab work, throttle camera and hand inference independently from visual rendering

**Constraints**: No backend, no camera upload or storage, no autoplay audio, mobile must have a usable fallback path, visual language must remain monochrome white/cyan with cyan question particles unless a future spec changes it

**Scale/Scope**: One public interactive page plus privacy page and documentation; no accounts, analytics, server data, or multi-user features

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Perceptual Integrity First**: Pass. The plan optimizes the existing hidden-angle optical volume rather than replacing it with ordinary UI.
- **Performance Budgets Are Product Requirements**: Pass. Performance profiles, throttling, and verification are primary requirements.
- **Privacy-By-Design Camera Interaction**: Pass. Camera and hand tracking remain opt-in, local, and optional.
- **Accessible Fallbacks and Readability**: Pass. Fallback controls, three-second text lock, and mobile landscape behavior are in scope.
- **English-Only, Test-Gated Delivery**: Pass. Planning artifacts are English-only and define release gates.

Post-design re-check: Pass. The selected design adds no backend, no extra data collection, and no heavy runtime dependency. A future WebGL or worker migration remains deferred to a separate spec unless Canvas2D budgets cannot be met.

## Project Structure

### Documentation (this feature)

```text
specs/001-performance-stability/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── performance-contract.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── audio.js
├── config.js
├── face-tracking.js
├── hand-tracking.js
├── main.js
├── projection.js
├── questions.js
├── scene.js
└── text-sampler.js

test/
├── projection.test.js
├── questions.test.js
└── scene-geometry.test.js

docs/
├── ARCHITECTURE.md
├── CONCEPT.md
└── WEB_AUDIT.md

index.html
privacy.html
styles.css
vite.config.js
```

**Structure Decision**: Keep the existing single static web project. Optimization work should be scoped to `src/`, `test/`, and `docs/` unless a later task proves a new module is necessary.

## Complexity Tracking

No constitution violations are required for this plan.
