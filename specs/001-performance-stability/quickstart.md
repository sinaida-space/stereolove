# Quickstart: Performance and Perception Stability

## Local Verification

1. Install dependencies if needed:

   ```bash
   npm install
   ```

2. Run formatting:

   ```bash
   npm run format
   ```

3. Run project checks:

   ```bash
   npm run check
   ```

4. Start a local preview:

   ```bash
   npm run build
   npm run preview
   ```

5. Open the preview URL in a browser and verify:
   - The intro explains the artwork and input modes.
   - Pointer or touch mode works without camera permission.
   - Camera mode remains optional.
   - The visible next-question control works.
   - Sound does not start before a user action.
   - Locked text remains readable for at least three seconds.
   - The portal bloom has no obvious gradient staircase artifact.

## Content Verification

Run searches before release:

```bash
rg -n "[Pp]artner(s)?" src test docs index.html privacy.html README.md specs .specify/memory AGENTS.md
rg -n -P "\\p{Cyrillic}" src test docs index.html privacy.html README.md specs .specify/memory AGENTS.md
```

Both searches should return no active project content requiring removal. The command text intentionally avoids embedding the retired prompt text or non-English characters in documentation.

## Live Verification

After pushing to `main`, verify the GitHub Pages deployment:

1. Check the latest successful Pages or deploy workflow for the commit.
2. Open `https://sinaida-space.github.io/stereolove/`.
3. Confirm the served bundle corresponds to the pushed commit.
4. Repeat one desktop and one mobile or mobile-emulated interaction check.

## Manual Device Notes

Camera and hand tracking require physical browser verification when possible. If a device cannot be used during implementation, record that limitation in the release notes and verify the non-camera fallback path before shipping.
