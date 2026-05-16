import { DEFAULT_EYE } from "./config.js";
import { createAudioController } from "./audio.js";
import { createFaceTracker, extractFaceMeasurement } from "./face-tracking.js";
import { createScene, drawScene } from "./scene.js";
import { deriveFaceEye, derivePointerEye, lerp, makeScreen } from "./projection.js";

const canvas = document.querySelector("#stage");
const ctx = canvas.getContext("2d", { alpha: false });
const video = document.querySelector("#webcam");
const statusDot = document.querySelector("#statusDot");
const statusText = document.querySelector("#statusText");
const cameraButton = document.querySelector("#cameraButton");
const pointerButton = document.querySelector("#pointerButton");
const touchButton = document.querySelector("#touchButton");
const calibrateButton = document.querySelector("#calibrateButton");
const nextQuestionButton = document.querySelector("#nextQuestionButton");
const exitExperienceButton = document.querySelector("#exitExperienceButton");
const cookieBanner = document.querySelector("#cookieBanner");
const cookieAcceptButton = document.querySelector("#cookieAcceptButton");
const depthSlider = document.querySelector("#depthSlider");
const sensitivitySlider = document.querySelector("#sensitivitySlider");
const xReadout = document.querySelector("#xReadout");
const yReadout = document.querySelector("#yReadout");
const zReadout = document.querySelector("#zReadout");

let dpr = 1;
let viewport = { width: 1, height: 1 };
let screen = makeScreen(1, 1);
let scene = null;
let stream = null;
let faceTracker = null;
let cameraMode = false;
let lastVideoTime = -1;
let lastFace = null;
let startTime = performance.now();
let previousFrameTime = startTime;
let questionIndex = 0;
let motionStability = 0;
let readingHold = 0;
let readingGrace = 0;
let revealFlash = 0;
let readingCaptured = false;
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
scene = createScene(screen);
hydrateCookieBanner();
hydrateQaMode();
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
nextQuestionButton.addEventListener("click", nextQuestion);
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
  scene = createScene(screen);
});

async function startCamera({ enterOnReady = false } = {}) {
  setStatus("Loading face model", "idle");

  try {
    faceTracker = await createFaceTracker();
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 540 } },
      audio: false,
    });

    video.srcObject = stream;
    await video.play();
    cameraMode = true;
    neutralFace.ready = false;
    document.body.classList.add("camera-on");
    cameraButton.textContent = "Stop camera";
    setStatus("Looking for face", "idle");
    audio.start();
    if (enterOnReady) enterExperience();
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
  lastFace = null;
  document.body.classList.remove("camera-on");
  cameraButton.textContent = "Use camera";
  setStatus("Choose a mode to enter", "idle");
}

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const time = (now - startTime) * 0.001;
  const dt = Math.min((now - previousFrameTime) * 0.001, 0.05);
  previousFrameTime = now;

  if (cameraMode) detectFace(now);

  const follow = 1 - Math.exp(-dt * 3.4);
  eye.x = lerp(eye.x, targetEye.x, follow);
  eye.y = lerp(eye.y, targetEye.y, follow);
  eye.z = lerp(eye.z, targetEye.z, follow);

  updateReadingState(dt);
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
    revealFlash,
    eyeMotion: {
      x: motionX,
      y: motionY,
      stretch: motionStretch,
    },
  });
  updateReadout();
}

function detectFace(now) {
  if (!faceTracker || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
  if (video.currentTime === lastVideoTime) return;

  lastVideoTime = video.currentTime;
  const measurement = extractFaceMeasurement(faceTracker.detectForVideo(video, now));

  if (!measurement) {
    setStatus("Looking for face", "idle");
    return;
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
  setStatus("Tracking face", "live");
}

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
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

function updateReadingState(dt) {
  const distance = Math.hypot(
    eye.x - previousEye.x,
    eye.y - previousEye.y,
    (eye.z - previousEye.z) * 0.34,
  );
  const speed = distance / Math.max(dt, 0.001);
  const instantX = clampMotion((eye.x - previousEye.x) / Math.max(dt, 0.001));
  const instantY = clampMotion((eye.y - previousEye.y) / Math.max(dt, 0.001));
  const instantStretch = Math.min(1, speed * 2.4);
  const aligned = 1 - Math.min(1, Math.hypot(eye.x * 0.72, eye.y * 1.02));
  const stableTarget = speed < 0.14 ? 1 : 0;
  const previousHold = readingHold;

  motionX = lerp(motionX, instantX, 1 - Math.exp(-dt * 7.5));
  motionY = lerp(motionY, instantY, 1 - Math.exp(-dt * 7.5));
  motionStretch = lerp(motionStretch, instantStretch, 1 - Math.exp(-dt * 5.5));
  motionStability = lerp(motionStability, stableTarget, 1 - Math.exp(-dt * 4.2));
  const lockTarget = aligned > 0.48 && motionStability > 0.48 ? 1 : 0;
  const rate = lockTarget ? 0.92 : readingGrace > 0 ? -0.12 : -0.74;
  readingHold = Math.min(1, Math.max(0, readingHold + dt * rate));

  if (readingHold > 0.72 && previousHold <= 0.72 && !readingCaptured) {
    readingGrace = 3;
    revealFlash = 1;
    readingCaptured = true;
    audio.playReveal();
    setStatus("Question resolved", "live");
  }

  if (readingGrace > 0) {
    readingGrace = Math.max(0, readingGrace - dt);
    readingHold = Math.max(readingHold, 0.78);
  }

  if (readingHold < 0.18) readingCaptured = false;

  previousEye.x = eye.x;
  previousEye.y = eye.y;
  previousEye.z = eye.z;
}

function clampMotion(value) {
  return Math.min(1.8, Math.max(-1.8, value));
}

function nextQuestion() {
  if (!scene?.questionPlanes?.length) return;
  questionIndex = (questionIndex + 1) % scene.questionPlanes.length;
  pointer.x = 0;
  pointer.y = 0;
  Object.assign(targetEye, DEFAULT_EYE);
  readingHold = 0;
  readingGrace = 0;
  revealFlash = 0;
  readingCaptured = false;
  motionStability = 0;
  audio.playNext();
  setStatus("Next question", "live");
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
