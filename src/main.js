import { DEFAULT_EYE } from "./config.js";
import { createAudioController } from "./audio.js";
import { createFaceTracker, extractFaceMeasurement } from "./face-tracking.js";
import { createHandTracker, extractNearFaceHand } from "./hand-tracking.js";
import { QUESTIONS } from "./questions.js";
import { createScene, drawScene, selectActiveQuestion } from "./scene.js";
import { deriveFaceEye, derivePointerEye, lerp, makeScreen } from "./projection.js";

const canvas = document.querySelector("#stage");
const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
const video = document.querySelector("#webcam");
const statusDot = document.querySelector("#statusDot");
const statusText = document.querySelector("#statusText");
const cameraButton = document.querySelector("#cameraButton");
const pointerButton = document.querySelector("#pointerButton");
const touchButton = document.querySelector("#touchButton");
const calibrateButton = document.querySelector("#calibrateButton");
const nextQuestionButton = document.querySelector("#nextQuestionButton");
const cameraOffButton = document.querySelector("#cameraOffButton");
const soundToggleButton = document.querySelector("#soundToggleButton");
const exitExperienceButton = document.querySelector("#exitExperienceButton");
const gestureOverlay = document.querySelector("#gestureOverlay");
const calibrationMeter = document.querySelector("#calibrationMeter");
const cookieBanner = document.querySelector("#cookieBanner");
const cookieAcceptButton = document.querySelector("#cookieAcceptButton");
const depthSlider = document.querySelector("#depthSlider");
const sensitivitySlider = document.querySelector("#sensitivitySlider");
const xReadout = document.querySelector("#xReadout");
const yReadout = document.querySelector("#yReadout");
const zReadout = document.querySelector("#zReadout");
const FRAME_PROFILES = [
  { name: "high", desktopFps: 60, compactFps: 40, faceMs: 120, handMs: 260 },
  { name: "balanced", desktopFps: 48, compactFps: 32, faceMs: 170, handMs: 360 },
  { name: "low", desktopFps: 36, compactFps: 26, faceMs: 240, handMs: 520 },
  { name: "panic", desktopFps: 28, compactFps: 20, faceMs: 340, handMs: 760 },
];
const READINESS_FRAMES = 8;

let dpr = 1;
let viewport = { width: 1, height: 1 };
let screen = makeScreen(1, 1);
let scene = null;
let stream = null;
let faceTracker = null;
let handTracker = null;
let cameraMode = false;
let lastVideoTime = -1;
let lastHandVideoTime = -1;
let lastFace = null;
let startTime = performance.now();
let previousFrameTime = startTime;
let nextFaceDetectAt = 0;
let nextHandDetectAt = 0;
let nextReadoutAt = 0;
let performanceLevel = getInitialPerformanceLevel();
let renderCostAverage = 0;
let readinessCostAverage = 0;
let readinessFrames = 0;
let deviceReady = false;
let coolFrames = 0;
let questionDeck = [];
let questionDeckCursor = 0;
let currentQuestionBatch = [];
let questionIndex = 0;
let motionStability = 0;
let readingHold = 0;
let readingGrace = 0;
let readingSmoke = 0;
let revealFlash = 0;
let readingCaptured = false;
let gestureCooldown = 0;
let gestureTransition = 0;
let gestureOverlayTimer = 0;
let pendingGestureQuestion = false;
let calibrationActive = false;
let calibrationProgress = 0;
let handHint = 0;
let handSeen = false;
let lastQuestionChangeAt = performance.now();
let motionX = 0;
let motionY = 0;
let motionStretch = 0;

const pointer = { x: 0, y: 0 };
const eye = { ...DEFAULT_EYE };
const targetEye = { ...DEFAULT_EYE };
const previousEye = { ...DEFAULT_EYE };
const neutralFace = { x: 0.5, y: 0.48, eyeSep: 0.17, ready: false };
const audio = createAudioController();

resize();
resetQuestionDeck();
currentQuestionBatch = takeQuestionBatch();
scene = createScene(screen, Math.random, getSceneQuality(), currentQuestionBatch);
hydrateCookieBanner();
hydrateQaMode();
syncSoundButton();
if (!document.body.classList.contains("experience-active")) {
  setInteractionReady(false);
  setStatus("Checking device capacity", "idle");
}
setTimeout(() => {
  if (!deviceReady) markDeviceReady();
}, 2400);
animate();

cameraButton.addEventListener("click", () => {
  if (cameraMode) stopCamera();
  else startCamera({ enterOnReady: true });
});

pointerButton.addEventListener("click", () => {
  if (cameraMode) stopCamera();
  pointer.x = 0;
  pointer.y = 0;
  Object.assign(targetEye, DEFAULT_EYE);
  setStatus("Pointer navigation", "idle");
  audio.start();
  enterExperience();
});

touchButton.addEventListener("click", () => {
  if (cameraMode) stopCamera();
  pointer.x = 0;
  pointer.y = 0;
  Object.assign(targetEye, DEFAULT_EYE);
  setStatus("Touch navigation", "idle");
  audio.start();
  enterExperience();
});

calibrateButton.addEventListener("click", () => {
  if (lastFace) {
    neutralFace.x = lastFace.x;
    neutralFace.y = lastFace.y;
    neutralFace.eyeSep = lastFace.eyeSep;
    neutralFace.ready = true;
    setStatus("Calibrated", "live");
    return;
  }

  pointer.x = 0;
  pointer.y = 0;
  Object.assign(targetEye, DEFAULT_EYE);
  setStatus(cameraMode ? "Looking for face" : "Pointer centered", "idle");
});

exitExperienceButton.addEventListener("click", exitExperience);
nextQuestionButton.addEventListener("click", () => nextQuestion());
cameraOffButton.addEventListener("click", switchCameraOff);
soundToggleButton.addEventListener("click", toggleSound);
cookieAcceptButton.addEventListener("click", acceptCookieNotice);

document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement) document.body.classList.remove("experience-active");
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") exitExperience();
  if (event.key.toLowerCase() === "n") nextQuestion();
});

window.addEventListener("pointermove", (event) => {
  if (cameraMode) return;
  updatePointerEye(event);
});

window.addEventListener("pointerdown", (event) => {
  if (cameraMode) return;
  updatePointerEye(event);
});

window.addEventListener("pointerleave", () => {
  if (!cameraMode) Object.assign(targetEye, DEFAULT_EYE);
});

window.addEventListener("resize", () => {
  resize();
  scene = createScene(screen, Math.random, getSceneQuality(), currentQuestionBatch);
});

document.addEventListener("visibilitychange", () => {
  previousFrameTime = performance.now();
});

async function startCamera({ enterOnReady = false } = {}) {
  setStatus("Loading face model", "idle");

  try {
    faceTracker = await createFaceTracker();
    const compact = isCompactViewport();
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: compact ? 480 : 640 },
        height: { ideal: compact ? 270 : 360 },
        frameRate: { ideal: compact ? 18 : 24, max: compact ? 24 : 30 },
      },
      audio: false,
    });

    video.srcObject = stream;
    await video.play();
    cameraMode = true;
    neutralFace.ready = false;
    calibrationActive = true;
    calibrationProgress = 0;
    handSeen = false;
    document.body.classList.add("camera-on");
    document.body.classList.add("calibrating");
    cameraButton.textContent = "Stop camera";
    setStatus("Align your face", "idle");
    audio.start();
    if (enterOnReady) enterExperience();
    loadHandTracker();
  } catch (error) {
    cameraMode = false;
    setStatus(
      error.name === "NotAllowedError"
        ? "Camera blocked. Use mouse or touch."
        : "Camera unavailable",
      "error",
    );
    console.error(error);
  }
}

function stopCamera() {
  if (stream) stream.getTracks().forEach((track) => track.stop());
  stream = null;
  cameraMode = false;
  calibrationActive = false;
  calibrationProgress = 0;
  lastFace = null;
  handSeen = false;
  document.body.classList.remove("camera-on");
  document.body.classList.remove("calibrating");
  cameraButton.textContent = "Use camera";
  setStatus("Choose a mode to enter", "idle");
}

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  if (document.hidden) {
    previousFrameTime = now;
    return;
  }

  const frameInterval = getFrameInterval();
  if (now - previousFrameTime < frameInterval) return;

  const renderStart = performance.now();
  const time = (now - startTime) * 0.001;
  const dt = Math.min((now - previousFrameTime) * 0.001, 0.07);
  previousFrameTime = now;

  if (cameraMode) {
    const faceDetectedThisFrame = detectFace(now);
    if (!faceDetectedThisFrame) detectHand(now);
  }

  const follow = 1 - Math.exp(-dt * 1.95);
  eye.x = lerp(eye.x, targetEye.x, follow);
  eye.y = lerp(eye.y, targetEye.y, follow);
  eye.z = lerp(eye.z, targetEye.z, follow);

  updateReadingState(dt, selectActiveQuestion(scene.questionPlanes, questionIndex));
  updateGestureState(dt, now);
  updateCalibrationState(dt);
  revealFlash = Math.max(0, revealFlash - dt * 0.82);

  drawScene(ctx, scene, {
    viewport,
    dpr,
    screen,
    eye,
    time,
    depth: Number(depthSlider.value),
    questionIndex,
    stability: motionStability,
    readingHold,
    readingGrace,
    readingSmoke,
    revealFlash,
    transitionSpin: gestureTransition,
    handHint,
    isCompact: isCompactViewport(),
    performanceLevel,
    quality: getSceneQuality(),
    eyeMotion: {
      x: motionX,
      y: motionY,
      stretch: motionStretch,
    },
  });
  if (now >= nextReadoutAt) {
    updateReadout();
    nextReadoutAt = now + 180;
  }
  const renderCost = performance.now() - renderStart;
  updatePerformanceBudget(renderCost, frameInterval);
  updateReadiness(renderCost, frameInterval);
}

function detectFace(now) {
  const detectInterval = getCurrentProfile().faceMs;
  if (now < nextFaceDetectAt) return false;
  nextFaceDetectAt = now + detectInterval;

  if (!faceTracker || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return false;
  if (video.currentTime === lastVideoTime) return false;

  lastVideoTime = video.currentTime;
  const measurement = extractFaceMeasurement(faceTracker.detectForVideo(video, now));

  if (!measurement) {
    if (calibrationActive) {
      calibrationProgress = Math.max(0, calibrationProgress - 0.035);
      setStatus("Align your face", "idle");
    } else {
      setStatus("Looking for face", "idle");
    }
    return true;
  }

  lastFace = measurement;

  if (!neutralFace.ready) {
    neutralFace.x = measurement.x;
    neutralFace.y = measurement.y;
    neutralFace.eyeSep = measurement.eyeSep;
    neutralFace.ready = true;
  }

  Object.assign(
    targetEye,
    deriveFaceEye(measurement, neutralFace, screen, Number(sensitivitySlider.value)),
  );
  if (!calibrationActive)
    setStatus(handTracker ? "Tracking face and hand" : "Tracking face", "live");
  return true;
}

async function loadHandTracker() {
  try {
    handTracker = await createHandTracker();
  } catch (error) {
    handTracker = null;
    console.error(error);
  }
}

function detectHand(now) {
  const detectInterval = getCurrentProfile().handMs;
  if (!handTracker || !lastFace || now < nextHandDetectAt) return;
  nextHandDetectAt = now + detectInterval;

  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
  if (video.currentTime === lastHandVideoTime) return;
  lastHandVideoTime = video.currentTime;

  const gesture = extractNearFaceHand(handTracker.detectForVideo(video, now), lastFace);
  handSeen = Boolean(gesture);
  if (gesture && gestureCooldown <= 0 && !pendingGestureQuestion && !calibrationActive) {
    triggerGestureQuestion();
  }
}

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, getMaxDpr());
  viewport = {
    width: Math.floor(window.innerWidth * dpr),
    height: Math.floor(window.innerHeight * dpr),
  };
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  screen = makeScreen(window.innerWidth, window.innerHeight);
}

function getCurrentProfile() {
  return FRAME_PROFILES[performanceLevel] ?? FRAME_PROFILES.at(-1);
}

function getMaxDpr() {
  if (isCompactViewport()) return 1;
  if (performanceLevel >= 3) return 1;
  if (performanceLevel >= 2) return 1;
  return 1.35;
}

function getFrameInterval() {
  const profile = getCurrentProfile();
  return 1000 / (isCompactViewport() ? profile.compactFps : profile.desktopFps);
}

function getSceneQuality() {
  const compact = isCompactViewport();
  const cores = navigator.hardwareConcurrency || 4;
  if (performanceLevel >= 3) return "panic";
  if (performanceLevel >= 2) return compact ? "mobileLow" : "low";
  if (compact) return cores <= 4 ? "mobileLow" : "mobile";
  if (performanceLevel >= 1 || cores <= 4) return "balanced";
  return "high";
}

function getInitialPerformanceLevel() {
  const compact =
    window.innerWidth <= 820 ||
    window.innerHeight <= 480 ||
    window.matchMedia?.("(pointer: coarse)").matches === true;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;
  const saveData = navigator.connection?.saveData === true;

  if (saveData || memory <= 2 || cores <= 2) return 3;
  if (compact || memory <= 4 || cores <= 4) return 2;
  return 1;
}

function updatePerformanceBudget(renderCost, frameInterval) {
  renderCostAverage = renderCostAverage ? renderCostAverage * 0.92 + renderCost * 0.08 : renderCost;
  const overload = renderCostAverage > frameInterval * 0.94 || renderCost > frameInterval * 1.45;

  if (overload && performanceLevel < FRAME_PROFILES.length - 1) {
    setPerformanceLevel(performanceLevel + 1);
    coolFrames = 0;
    return;
  }

  if (renderCostAverage < frameInterval * 0.42 && performanceLevel > 0) {
    coolFrames += 1;
    if (coolFrames > 150) {
      setPerformanceLevel(performanceLevel - 1);
      coolFrames = 0;
    }
  } else {
    coolFrames = 0;
  }
}

function updateReadiness(renderCost, frameInterval) {
  if (deviceReady || document.body.classList.contains("experience-active")) return;

  readinessCostAverage = readinessCostAverage
    ? readinessCostAverage * 0.72 + renderCost * 0.28
    : renderCost;
  readinessFrames += 1;

  if (readinessFrames >= 3 && readinessCostAverage > frameInterval * 0.72) {
    if (performanceLevel < FRAME_PROFILES.length - 1) {
      setPerformanceLevel(performanceLevel + 1);
      readinessCostAverage = 0;
      readinessFrames = 0;
      setStatus("Reducing visual load", "idle");
      return;
    }
    markDeviceReady("Light mode ready");
    return;
  }

  if (readinessFrames >= READINESS_FRAMES) markDeviceReady();
}

function markDeviceReady(message = performanceLevel >= 2 ? "Light mode ready" : "Ready") {
  deviceReady = true;
  setInteractionReady(true);
  if (!document.body.classList.contains("experience-active")) setStatus(message, "live");
}

function setInteractionReady(ready) {
  for (const button of [cameraButton, pointerButton, touchButton]) {
    button.disabled = !ready;
  }
}

function setPerformanceLevel(nextLevel) {
  const level = Math.min(FRAME_PROFILES.length - 1, Math.max(0, nextLevel));
  if (level === performanceLevel) return;
  performanceLevel = level;
  resize();
  scene = createScene(screen, Math.random, getSceneQuality(), currentQuestionBatch);
  questionIndex = Math.min(questionIndex, scene.questionPlanes.length - 1);
}

function setStatus(text, state) {
  statusText.textContent = text;
  statusDot.className = `status-dot ${state}`;
}

function updateReadout() {
  xReadout.textContent = `x ${eye.x.toFixed(2)}`;
  yReadout.textContent = `y ${eye.y.toFixed(2)}`;
  zReadout.textContent = `z ${eye.z.toFixed(2)}`;
}

function updatePointerEye(event) {
  if (event.target.closest?.(".experience-toolbar")) return;
  pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
  pointer.y = -(event.clientY / window.innerHeight - 0.5) * 2;
  Object.assign(targetEye, derivePointerEye(pointer, Number(sensitivitySlider.value)));
}

function updateReadingState(dt, activeQuestion) {
  const distance = Math.hypot(
    eye.x - previousEye.x,
    eye.y - previousEye.y,
    (eye.z - previousEye.z) * 0.34,
  );
  const speed = distance / Math.max(dt, 0.001);
  const instantX = clampMotion((eye.x - previousEye.x) / Math.max(dt, 0.001));
  const instantY = clampMotion((eye.y - previousEye.y) / Math.max(dt, 0.001));
  const isCompact = isCompactViewport();
  const previousGrace = readingGrace;
  const instantStretch = Math.min(0.74, speed * (isCompact ? 0.95 : 1.35));
  const revealEye = activeQuestion?.revealEye ?? DEFAULT_EYE;
  const aligned =
    1 - Math.min(1, Math.hypot((eye.x - revealEye.x) * 0.58, (eye.y - revealEye.y) * 0.82));
  const stableTarget = speed < (isCompact ? 0.24 : 0.16) ? 1 : 0;
  const previousHold = readingHold;

  motionX = lerp(motionX, instantX, 1 - Math.exp(-dt * 4.2));
  motionY = lerp(motionY, instantY, 1 - Math.exp(-dt * 4.2));
  motionStretch = lerp(motionStretch, instantStretch, 1 - Math.exp(-dt * 2.35));
  motionStability = lerp(motionStability, stableTarget, 1 - Math.exp(-dt * 2.6));
  const lockTarget =
    aligned > (isCompact ? 0.25 : 0.38) && motionStability > (isCompact ? 0.34 : 0.42) ? 1 : 0;
  const rate = lockTarget ? (isCompact ? 1.28 : 0.94) : readingGrace > 0 ? -0.08 : -0.55;
  readingHold = Math.min(1, Math.max(0, readingHold + dt * rate));

  if (readingHold > 0.72 && previousHold <= 0.72 && !readingCaptured) {
    readingGrace = 3.35;
    readingSmoke = 0;
    revealFlash = 1;
    readingCaptured = true;
    audio.playReveal();
    setStatus("Question resolved", "live");
  }

  if (readingGrace > 0) {
    readingGrace = Math.max(0, readingGrace - dt);
    readingHold = Math.max(readingHold, 0.88);
    if (previousGrace > 0 && readingGrace === 0) readingSmoke = 1;
  }

  readingSmoke = Math.max(0, readingSmoke - dt * 0.46);

  if (readingHold < 0.18) readingCaptured = false;

  previousEye.x = eye.x;
  previousEye.y = eye.y;
  previousEye.z = eye.z;
}

function updateGestureState(dt, now) {
  gestureCooldown = Math.max(0, gestureCooldown - dt);
  gestureTransition = Math.max(0, gestureTransition - dt * 1.45);
  gestureOverlayTimer = Math.max(0, gestureOverlayTimer - dt);
  if (gestureOverlay) gestureOverlay.classList.toggle("visible", gestureOverlayTimer > 0);

  if (pendingGestureQuestion && gestureTransition < 0.58) {
    pendingGestureQuestion = false;
    advanceQuestion({ playSound: false, recenter: false });
  }

  const idleLongEnough = now - lastQuestionChangeAt > 11500;
  const hintTarget =
    cameraMode &&
    document.body.classList.contains("experience-active") &&
    idleLongEnough &&
    !handSeen
      ? 1
      : 0;
  handHint = lerp(handHint, hintTarget, 1 - Math.exp(-dt * 1.4));
}

function updateCalibrationState(dt) {
  if (!calibrationActive) return;

  const stable = lastFace && Math.hypot(targetEye.x, targetEye.y) < 0.48;
  calibrationProgress = Math.min(1, Math.max(0, calibrationProgress + dt * (stable ? 2.6 : -0.52)));
  if (calibrationMeter) calibrationMeter.style.transform = `scaleX(${calibrationProgress})`;

  if (calibrationProgress >= 1) {
    calibrationActive = false;
    document.body.classList.remove("calibrating");
    setStatus(
      handTracker ? "Move your head. Raise a hand for another question." : "Move your head",
      "live",
    );
  }
}

function triggerGestureQuestion() {
  gestureCooldown = 3.8;
  gestureTransition = 1;
  gestureOverlayTimer = 2;
  pendingGestureQuestion = true;
  handHint = 0;
  readingSmoke = 1;
  readingHold = Math.max(readingHold, 0.42);
  readingGrace = 0;
  revealFlash = 1;
  audio.playGesture();
  setStatus("Opening another question", "live");
}

function clampMotion(value) {
  return Math.min(1.15, Math.max(-1.15, value));
}

function isCompactViewport() {
  return (
    window.innerWidth <= 820 ||
    window.innerHeight <= 480 ||
    window.matchMedia?.("(pointer: coarse)").matches === true
  );
}

function nextQuestion() {
  advanceQuestion();
}

function advanceQuestion({ playSound = true, recenter = true } = {}) {
  if (!scene?.questionPlanes?.length) return;

  if (questionIndex >= scene.questionPlanes.length - 1) {
    currentQuestionBatch = takeQuestionBatch();
    scene = createScene(screen, Math.random, getSceneQuality(), currentQuestionBatch);
    questionIndex = 0;
  } else {
    questionIndex += 1;
  }

  if (recenter) {
    pointer.x = 0;
    pointer.y = 0;
    Object.assign(targetEye, DEFAULT_EYE);
  }
  readingHold = 0;
  readingGrace = 0;
  readingSmoke = 0;
  revealFlash = 0;
  readingCaptured = false;
  motionStability = 0;
  lastQuestionChangeAt = performance.now();
  if (playSound) audio.playNext();
  setStatus("Next question", "live");
}

function resetQuestionDeck() {
  questionDeck = shuffle([...QUESTIONS]);
  questionDeckCursor = 0;
}

function takeQuestionBatch(size = 12) {
  if (!questionDeck.length || questionDeckCursor >= questionDeck.length) resetQuestionDeck();

  const batch = [];
  while (batch.length < size) {
    if (questionDeckCursor >= questionDeck.length) resetQuestionDeck();
    batch.push(questionDeck[questionDeckCursor]);
    questionDeckCursor += 1;
  }
  return batch;
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function switchCameraOff() {
  if (cameraMode) stopCamera();
  pointer.x = 0;
  pointer.y = 0;
  Object.assign(targetEye, DEFAULT_EYE);
  setStatus("Camera off. Use mouse or touch.", "idle");
}

function toggleSound() {
  audio.toggleMuted();
  syncSoundButton();
}

function syncSoundButton() {
  soundToggleButton.textContent = audio.isMuted() ? "Sound off" : "Sound on";
  soundToggleButton.setAttribute("aria-pressed", String(!audio.isMuted()));
}

async function enterExperience() {
  document.body.classList.remove("fullscreen-unavailable");
  document.body.classList.add("experience-active");
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    }
  } catch {
    document.body.classList.add("fullscreen-unavailable");
  }
}

async function exitExperience() {
  document.body.classList.remove("experience-active");
  document.body.classList.remove("fullscreen-unavailable");
  try {
    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen();
    }
  } catch {
    document.body.classList.remove("experience-active");
  }
}

function hydrateCookieBanner() {
  if (localStorage.getItem("stereolove_cookie_notice") === "accepted") {
    cookieBanner.hidden = true;
  }
}

function hydrateQaMode() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("qa") !== "experience") return;

  pointer.x = 0;
  pointer.y = 0;
  Object.assign(targetEye, DEFAULT_EYE);
  if (params.get("qaLock") === "1") {
    const activeQuestion = selectActiveQuestion(scene.questionPlanes, questionIndex);
    if (activeQuestion) {
      Object.assign(targetEye, activeQuestion.revealEye);
      Object.assign(eye, activeQuestion.revealEye);
      Object.assign(previousEye, activeQuestion.revealEye);
      readingHold = 1;
      readingGrace = 3.35;
      readingSmoke = 0;
      revealFlash = 1;
      readingCaptured = true;
    }
  }
  if (params.get("qaSmoke") === "1") {
    const activeQuestion = selectActiveQuestion(scene.questionPlanes, questionIndex);
    if (activeQuestion) {
      Object.assign(targetEye, activeQuestion.revealEye);
      Object.assign(eye, activeQuestion.revealEye);
      Object.assign(previousEye, activeQuestion.revealEye);
      readingHold = 0.42;
      readingGrace = 0;
      readingSmoke = 0.86;
      revealFlash = 0;
      readingCaptured = true;
    }
  }
  if (params.get("qaHandHint") === "1") handHint = 1;
  if (params.get("qaGesture") === "1") {
    gestureTransition = 1;
    gestureOverlayTimer = 2;
    readingSmoke = 1;
    revealFlash = 1;
  }
  document.body.classList.add("experience-active");
  document.querySelector("#instructions").hidden = true;
  document.querySelector(".site-header").hidden = true;
  document.querySelector(".site-footer").hidden = true;
  setStatus("Pointer navigation", "idle");
}

function acceptCookieNotice() {
  localStorage.setItem("stereolove_cookie_notice", "accepted");
  cookieBanner.hidden = true;
}
