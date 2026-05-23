# Data Model: Performance and Perception Stability

## Render Profile

Represents the current quality and pacing budget for the scene.

- **name**: stable label such as `high`, `balanced`, `low`, or `mobile`
- **targetFrameIntervalMs**: intended minimum interval between visual frames
- **particleBudget**: maximum active particles for ambient and question systems
- **geometryBudget**: frame and depth-line density
- **bloomBudget**: permitted glow intensity and blur complexity
- **trackingIntervalMs**: minimum interval between camera or hand inference updates
- **transitionDurationMs**: duration range for question change transitions

## Tracking Signal

Represents a normalized input source that can move the virtual viewpoint.

- **source**: `face`, `hand`, `pointer`, `touch`, or `keyboard`
- **x**: horizontal normalized offset
- **y**: vertical normalized offset
- **confidence**: reliability level for camera-derived input
- **lastUpdatedAt**: timestamp used for smoothing and stale-signal handling
- **isFallback**: whether the signal comes from a non-camera mode

## Question Deck

Represents the session question order and repetition rules.

- **allQuestions**: active question corpus
- **remainingQuestionIds**: questions not yet shown in the current session
- **currentQuestionId**: question currently rendered in the cloud
- **previousQuestionId**: most recent prior question for transition effects
- **shuffleSeed**: optional value for reproducible QA runs

## Text Lock

Represents the moment a dispersed point cloud becomes readable.

- **questionId**: locked question
- **lockedAt**: timestamp when readability threshold was reached
- **minimumHoldMs**: minimum visible hold duration, at least 3000 ms
- **readabilityScore**: normalized score from the alignment logic
- **releaseMode**: particle dispersion behavior such as smoke, stretch, or drift

## Verification Run

Represents a release-readiness check.

- **commitSha**: commit under test
- **environment**: local preview, production GitHub Pages, or physical device
- **checksRun**: commands and manual checks completed
- **screenshots**: optional screenshot paths
- **result**: pass or fail
- **notes**: concise findings or follow-up items
