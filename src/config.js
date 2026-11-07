export const MEDIAPIPE_VERSION = "0.10.35";

export const DEFAULT_EYE = Object.freeze({
  x: 0,
  y: 0,
  z: 3.2,
});

export const PALETTE = Object.freeze({
  background: "#050609",
  ink: "245, 241, 232",
  cyan: "94, 242, 255",
  red: "255, 95, 86",
  gold: "240, 195, 91",
  violet: "184, 121, 255",
  green: "124, 255, 155",
});

// Absolute URL of a file under public/vendor/mediapipe/<version>/, served from this site.
export function mediapipeAsset(path) {
  return new URL(
    `${import.meta.env.BASE_URL}vendor/mediapipe/${MEDIAPIPE_VERSION}/${path}`,
    window.location.href,
  ).href;
}
