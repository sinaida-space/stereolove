import { MEDIAPIPE_VERSION } from "./config.js";

let handLandmarker = null;
let HandLandmarkerTask = null;
let FilesetResolverTask = null;

export async function createHandTracker() {
  if (handLandmarker) return handLandmarker;

  if (!HandLandmarkerTask || !FilesetResolverTask) {
    const visionTasks = await import(
      `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/vision_bundle.mjs`
    );
    HandLandmarkerTask = visionTasks.HandLandmarker;
    FilesetResolverTask = visionTasks.FilesetResolver;
  }

  const vision = await FilesetResolverTask.forVisionTasks(
    `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`,
  );

  handLandmarker = await HandLandmarkerTask.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task",
      delegate: "CPU",
    },
    runningMode: "VIDEO",
    numHands: 1,
    minHandDetectionConfidence: 0.52,
    minHandPresenceConfidence: 0.52,
    minTrackingConfidence: 0.52,
  });

  return handLandmarker;
}

export function extractNearFaceHand(result, face) {
  const landmarks = result.landmarks?.[0];
  if (!landmarks || !face) return null;

  const bounds = landmarks.reduce(
    (box, point) => ({
      minX: Math.min(box.minX, point.x),
      maxX: Math.max(box.maxX, point.x),
      minY: Math.min(box.minY, point.y),
      maxY: Math.max(box.maxY, point.y),
    }),
    { minX: 1, maxX: 0, minY: 1, maxY: 0 },
  );
  const center = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const faceScale = Math.max(0.12, face.eyeSep * 2.5);
  const distance = Math.hypot((center.x - face.x) / faceScale, (center.y - face.y) / faceScale);
  const besideOrAbove =
    Math.abs(center.x - face.x) > face.eyeSep * 0.62 || center.y < face.y + 0.08;
  const openEnough = width + height > Math.max(0.2, face.eyeSep * 1.55);

  if (distance > 2.35 || !besideOrAbove || !openEnough) return null;

  return {
    x: center.x,
    y: center.y,
    openness: Math.min(1, (width + height) / Math.max(0.24, face.eyeSep * 2.4)),
  };
}
