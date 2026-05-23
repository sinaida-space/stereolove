# Tasks: Performance and Perception Stability

**Input**: Design documents from `specs/001-performance-stability/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/performance-contract.md`, `quickstart.md`

**Tests**: Tests are included because the feature is performance-sensitive and release-gated by the project constitution.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files or independent verification paths
- **[Story]**: Maps the task to a user story from `spec.md`
- Each task names the exact file or verification target

## Phase 1: Setup

**Purpose**: Prepare the optimization phase without changing behavior.

- [ ] T001 Review `specs/001-performance-stability/spec.md` and confirm no scope changes are needed before implementation.
- [ ] T002 [P] Add or update performance notes in `docs/ARCHITECTURE.md` to reflect render profiles, tracking cadence, and release gates.
- [ ] T003 [P] Add QA route/query documentation in `docs/WEB_AUDIT.md` for screenshot and live verification.

---

## Phase 2: Foundational

**Purpose**: Establish shared budgets and tests before user-story implementation.

- [ ] T004 Define centralized render profile constants in `src/config.js` for desktop, mobile, low, and hidden-tab states.
- [ ] T005 [P] Add unit coverage in `test/scene-geometry.test.js` for profile-dependent geometry density and frame depth.
- [ ] T006 [P] Add unit coverage in `test/questions.test.js` for session-level non-repetition and deck exhaustion behavior.
- [ ] T007 Add a lightweight runtime timing helper in `src/main.js` or a new `src/performance.js` module to detect missed frame budgets without accumulating stale work.
- [ ] T008 Re-run `npm run format` and `npm run check` before starting user-story implementation.

**Checkpoint**: Budgets and regression tests are in place.

---

## Phase 3: User Story 1 - Smooth Entry on Real Devices (Priority: P1)

**Goal**: The site remains usable on mobile and older laptops without camera permission.

**Independent Test**: Enter the local preview with camera denied on desktop and mobile viewport; controls stay responsive and the scene remains spatial.

### Tests for User Story 1

- [ ] T009 [P] [US1] Add render-profile behavior tests in `test/scene-geometry.test.js`.
- [ ] T010 [P] [US1] Add input fallback tests or assertions around startup state in the most appropriate existing test file.

### Implementation for User Story 1

- [ ] T011 [US1] Update `src/main.js` so the render loop drops or coalesces late frames instead of building a backlog.
- [ ] T012 [US1] Update `src/scene.js` to use render profile budgets for ambient particles, tunnel frame density, line intensity, and bloom workload.
- [ ] T013 [US1] Update `src/main.js` to reduce or pause render and tracking work when `document.visibilityState` is hidden.
- [ ] T014 [US1] Update mobile startup behavior in `src/main.js` and `styles.css` so landscape guidance and fallback mode are clear without blocking controls.
- [ ] T015 [US1] Verify US1 in local preview on desktop and mobile viewport, recording notes in `docs/WEB_AUDIT.md`.

**Checkpoint**: User Story 1 is independently shippable.

---

## Phase 4: User Story 2 - Clean Bloom Without Banding (Priority: P2)

**Goal**: Bloom is smooth, monochrome white/cyan, and free of visible gradient staircase artifacts.

**Independent Test**: Capture local preview screenshots on desktop and mobile dimensions and inspect bloom, background, and portal frames.

### Tests for User Story 2

- [ ] T016 [P] [US2] Add deterministic scene parameter tests for bloom/profile selection in `test/scene-geometry.test.js`.

### Implementation for User Story 2

- [ ] T017 [US2] Refactor glow drawing in `src/scene.js` to avoid large banded gradients and repeated per-particle shadow blur.
- [ ] T018 [US2] Tune near-edge tunnel lines in `src/scene.js` so closer geometry is subtly brighter and thinner frames remain elegant.
- [ ] T019 [US2] Keep the palette constrained in `styles.css` and `src/scene.js` to white, near-white, and cyan tones.
- [ ] T020 [US2] Capture desktop and portrait/mobile-landscape screenshots from local preview and store temporary QA paths in release notes or `docs/WEB_AUDIT.md`.

**Checkpoint**: User Story 2 can be evaluated visually without camera mode.

---

## Phase 5: User Story 3 - Stable Camera and Gesture Layer (Priority: P3)

**Goal**: Head tracking searches the hidden angle; hand gesture advances the question; visible controls remain available.

**Independent Test**: Use camera mode if available, then verify hand gesture or simulated gesture transition, fallback next question, and camera-off controls.

### Tests for User Story 3

- [ ] T021 [P] [US3] Add question transition state tests in `test/questions.test.js` or a new focused test file.
- [ ] T022 [P] [US3] Add tracking signal smoothing tests for projection behavior in `test/projection.test.js`.

### Implementation for User Story 3

- [ ] T023 [US3] Update `src/face-tracking.js` so face inference cadence follows the active render profile and publishes smoothed signals.
- [ ] T024 [US3] Update `src/hand-tracking.js` so hand gestures are debounced, near-face scoped, and trigger one controlled spiral transition per gesture.
- [ ] T025 [US3] Update `src/main.js` so pointer and touch fallback controls remain active while camera mode is running.
- [ ] T026 [US3] Update `src/scene.js` so question transitions disperse point text as smoke-like motion and preserve the three-second text lock.
- [ ] T027 [US3] Verify camera-denied fallback and, when hardware is available, camera plus hand gesture behavior in local preview.

**Checkpoint**: Camera interaction is an enhancement, not a blocker.

---

## Phase 6: User Story 4 - Verifiable Release Quality (Priority: P4)

**Goal**: A maintainer can prove the release is ready and that the live site corresponds to the pushed commit.

**Independent Test**: Follow `specs/001-performance-stability/quickstart.md` from a clean working tree.

### Implementation for User Story 4

- [ ] T028 [US4] Update `README.md` with the current interaction model, privacy summary, and development commands.
- [ ] T029 [US4] Update `docs/WEB_AUDIT.md` with the final verification checklist and any known device limitations.
- [ ] T030 [US4] Run `npm run format`.
- [ ] T031 [US4] Run `npm run check`.
- [ ] T032 [US4] Run retired relationship prompt and Russian text scans from `quickstart.md`.
- [ ] T033 [US4] Build and preview locally, then verify the website in a browser.
- [ ] T034 [US4] Push to `main`, wait for GitHub Pages deployment, and verify `https://sinaida-space.github.io/stereolove/`.

**Checkpoint**: Release is documented, checked, and live.

---

## Dependencies & Execution Order

- **Phase 1** has no dependencies.
- **Phase 2** depends on Phase 1 and blocks all implementation stories.
- **US1** depends on Phase 2 and should ship first because it resolves core lag.
- **US2** depends on Phase 2 and can run after or alongside US1 once render profiles are stable.
- **US3** depends on Phase 2 and should begin after US1 because camera work benefits from stable frame pacing.
- **US4** depends on the selected implementation stories.

## Parallel Opportunities

- T002 and T003 can run together.
- T005 and T006 can run together.
- T009 and T010 can run together.
- T016 can run while US1 local verification is happening.
- T021 and T022 can run together.
- Documentation tasks T028 and T029 can run after implementation behavior is known.

## Implementation Strategy

Start with US1 as the MVP because it fixes the blocking lag problem. Then complete US2 to protect the visual quality, and US3 to refine camera and hand interaction once the base frame pacing is stable. Finish with US4 so every release is reproducible and live-verified.
