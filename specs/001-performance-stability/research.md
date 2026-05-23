# Research: Performance and Perception Stability

## Decision 1: Optimize Canvas2D Before a WebGL Rewrite

**Decision**: Continue with Canvas2D for the next optimization phase and make rendering budgets explicit before considering WebGL.

**Rationale**: The current site is already built around Canvas2D, Vite, and testable geometry helpers. A full WebGL rewrite would be high-risk and could delay fixes for lag, bloom banding, and readability. The immediate user problem is uncontrolled workload, not a proven inability of Canvas2D to render the desired art.

**Alternatives considered**:

- Immediate WebGL migration: deferred because it changes the rendering architecture, requires new shader QA, and should have its own specification.
- CSS-only effects: rejected because the hidden-angle particle text and spatial tunnel require direct coordinate control.

## Decision 2: Use Adaptive Render Profiles

**Decision**: Define render profiles that adjust particle counts, frame cadence, bloom intensity, geometry detail, and tracking cadence.

**Rationale**: One fixed quality level cannot serve phones, older laptops, and current desktops. Adaptive profiles let the artwork remain legible and spatial under pressure rather than freezing.

**Alternatives considered**:

- Single global quality slider: rejected as too manual for first-time visitors.
- Full auto-disable of effects: rejected because it can destroy the art concept.

## Decision 3: Separate Tracking Cadence from Render Cadence

**Decision**: Camera and hand inference should run on their own schedule and publish smoothed tracking signals to the scene.

**Rationale**: Vision inference is expensive and should not run every visual frame. Decoupling it prevents camera mode from turning the page into a stress test while preserving responsive head and gesture input.

**Alternatives considered**:

- Run inference every animation frame: rejected because it competes with rendering and UI work.
- Remove camera mode: rejected because head-tracked spatial perception is central to the project.

## Decision 4: Treat Bloom as a Bounded Visual Layer

**Decision**: Bloom should be implemented with bounded, low-bandwidth glow passes and quality fallbacks rather than large gradients or repeated expensive shadows.

**Rationale**: The reported gradient staircase indicates that glow must be smoother and less dependent on large radial alpha bands. Bloom should enhance nearby points, frames, and text locks without repainting costly effects for every particle on every frame.

**Alternatives considered**:

- Per-particle shadow blur each frame: rejected as too expensive at current particle counts.
- Hard-edged no-glow rendering: rejected because the requested visual language depends on luminous haze.

## Decision 5: Formalize Visual and Live QA

**Decision**: Every visual release should include local preview verification, at least one screenshot path, and a live GitHub Pages check after deploy.

**Rationale**: The work is visual and interactive. Unit tests can protect geometry and data rules, but browser verification is required for banding, text readability, mobile orientation, and deployment correctness.

**Alternatives considered**:

- Unit tests only: rejected because they cannot catch visual artifacts.
- Manual live checking only: rejected because it misses regressions before deployment.
