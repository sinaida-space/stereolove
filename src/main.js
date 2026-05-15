import { DEFAULT_EYE } from "./config.js";
import { createFaceTracker, extractFaceMeasurement } from "./face-tracking.js";
import { createScene, drawScene } from "./scene.js";
import { deriveFaceEye, derivePointerEye, lerp, makeScreen } from "./projection.js";

const canvas = document.querySelector("#stage");
const ctx = canvas.getContext("2d", { alpha: false });
const video = document.querySelector("#webcam");
const statusDot = document.querySelector("#statusDot");
const statusText = document.querySelector("#statusText");
const cameraButton = document.querySelector("#cameraButton");
const calibrateButton = document.querySelector("#calibrateButton");
const experienceButton = document.querySelector("#experienceButton");
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

const pointer = { x: 0, y: 0 };
const eye = { ...DEFAULT_EYE };
const targetEye = { ...DEFAULT_EYE };
const neutralFace = { x: 0.5, y: 0.48, eyeSep: 0.17, ready: false };

resize();
scene = createScene(screen);
hydrateCookieBanner();
animate();

cameraButton.addEventListener("click", () => {
  if (cameraMode) stopCamera();
  else startCamera();
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

experienceButton.addEventListener("click", enterExperience);
exitExperienceButton.addEventListener("click", exitExperience);
cookieAcceptButton.addEventListener("click", acceptCookieNotice);

document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement) document.body.classList.remove("experience-active");
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") exitExperience();
});

window.addEventListener("pointermove", (event) => {
  if (cameraMode) return;
  pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
  pointer.y = -(event.clientY / window.innerHeight - 0.5) * 2;
  Object.assign(targetEye, derivePointerEye(pointer, Number(sensitivitySlider.value)));
});

window.addEventListener("pointerleave", () => {
  if (!cameraMode) Object.assign(targetEye, DEFAULT_EYE);
});

window.addEventListener("resize", () => {
  resize();
  scene = createScene(screen);
});

async function startCamera() {
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
  } catch (error) {
    cameraMode = false;
    setStatus(error.name === "NotAllowedError" ? "Camera blocked" : "Camera unavailable", "error");
    console.error(error);
  }
}

function stopCamera() {
  if (stream) stream.getTracks().forEach((track) => track.stop());
  stream = null;
  cameraMode = false;
  lastFace = null;
  document.body.classList.remove("camera-on");
  cameraButton.textContent = "Start camera";
  setStatus("Pointer mode", "idle");
}

function animate() {
  requestAnimationFrame(animate);
  const time = (performance.now() - startTime) * 0.001;

  if (cameraMode) detectFace(performance.now());

  eye.x = lerp(eye.x, targetEye.x, 0.16);
  eye.y = lerp(eye.y, targetEye.y, 0.16);
  eye.z = lerp(eye.z, targetEye.z, 0.16);

  drawScene(ctx, scene, {
    viewport,
    dpr,
    screen,
    eye,
    time,
    depth: Number(depthSlider.value),
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

async function enterExperience() {
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

function acceptCookieNotice() {
  localStorage.setItem("stereolove_cookie_notice", "accepted");
  cookieBanner.hidden = true;
}
