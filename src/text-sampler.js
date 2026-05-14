export function sampleTextPoints(text, options = {}) {
  const {
    maxPoints = 1500,
    screen,
    subtitle = "perception is a camera with habits",
    random = Math.random,
  } = options;

  const textCanvas = document.createElement("canvas");
  textCanvas.width = 1200;
  textCanvas.height = 420;
  const textCtx = textCanvas.getContext("2d", { willReadFrequently: true });

  textCtx.fillStyle = "#000";
  textCtx.fillRect(0, 0, textCanvas.width, textCanvas.height);
  textCtx.fillStyle = "#fff";
  textCtx.font = "900 118px Arial, sans-serif";
  textCtx.textAlign = "center";
  textCtx.textBaseline = "middle";
  textCtx.fillText(text, textCanvas.width / 2, textCanvas.height / 2);

  textCtx.font = "700 40px Arial, sans-serif";
  textCtx.fillText(subtitle, textCanvas.width / 2, textCanvas.height / 2 + 98);

  const image = textCtx.getImageData(0, 0, textCanvas.width, textCanvas.height).data;
  const candidates = [];

  for (let y = 0; y < textCanvas.height; y += 5) {
    for (let x = 0; x < textCanvas.width; x += 5) {
      if (image[(y * textCanvas.width + x) * 4] > 80 && random() > 0.28) {
        candidates.push({
          x: (x / textCanvas.width - 0.5) * screen.width * 0.92,
          y: -(y / textCanvas.height - 0.5) * screen.height * 0.62,
        });
      }
    }
  }

  return shuffle(candidates, random).slice(0, maxPoints);
}

function shuffle(items, random) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
