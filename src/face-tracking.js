import { MEDIAPIPE_VERSION } from "./config.js";

let faceLandmarker = null;
let FaceLandmarkerTask = null;
let FilesetResolverTask = null;

export async function createFaceTracker() {
  if (faceLandmarker) return faceLandmarker;

  if (!FaceLandmarkerTask || !FilesetResolverTask) {
    const visionTasks = await import(
      `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/vision_bundle.mjs`
    );
    FaceLandmarkerTask = visionTasks.FaceLandmarker;
    FilesetResolverTask = visionTasks.FilesetResolver;
  }

  const vision = await FilesetResolverTask.forVisionTasks(
    `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`,
  );

  faceLandmarker = await FaceLandmarkerTask.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numFaces: 1,
    minFaceDetectionConfidence: 0.55,
    minFacePresenceConfidence: 0.55,
    minTrackingConfidence: 0.55,
  });

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
