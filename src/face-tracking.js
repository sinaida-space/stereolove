import { mediapipeAsset } from "./config.js";

let faceLandmarker = null;
let FaceLandmarkerTask = null;
let FilesetResolverTask = null;

export async function createFaceTracker() {
  if (faceLandmarker) return faceLandmarker;

  if (!FaceLandmarkerTask || !FilesetResolverTask) {
    const visionTasks = await import(/* @vite-ignore */ mediapipeAsset("vision_bundle.mjs"));
    FaceLandmarkerTask = visionTasks.FaceLandmarker;
    FilesetResolverTask = visionTasks.FilesetResolver;
  }

  const vision = await FilesetResolverTask.forVisionTasks(
    mediapipeAsset("wasm"),
  );

  const optionsForDelegate = (delegate) => ({
    baseOptions: {
      modelAssetPath:
        mediapipeAsset("models/face_landmarker.task"),
      delegate,
    },
    runningMode: "VIDEO",
    numFaces: 1,
    minFaceDetectionConfidence: 0.55,
    minFacePresenceConfidence: 0.55,
    minTrackingConfidence: 0.55,
  });

  try {
    faceLandmarker = await FaceLandmarkerTask.createFromOptions(
      vision,
      optionsForDelegate("GPU"),
    );
  } catch {
    faceLandmarker = await FaceLandmarkerTask.createFromOptions(
      vision,
      optionsForDelegate("CPU"),
    );
  }

  return faceLandmarker;
}

export function extractFaceMeasurement(result) {
  const landmarks = result.faceLandmarks?.[0];
  if (!landmarks) return null;

  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const nose = landmarks[1];

  return {
    x: (leftEye.x + rightEye.x + nose.x) / 3,
    y: (leftEye.y + rightEye.y + nose.y) / 3,
    eyeSep: Math.hypot(leftEye.x - rightEye.x, leftEye.y - rightEye.y),
  };
}
