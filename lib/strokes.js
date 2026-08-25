// Schreibbahnen für Großbuchstaben und Ziffern (Grundschul-Schreibrichtung),
// als Polylinien in einem 100×100-Kasten. Jeder Eintrag = ein Strich (Stift
// wird zwischen Strichen abgesetzt). Bögen werden aus Punkten gebaut.
function arc(cx, cy, r, a0, a1, n = 24) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}
const line = (...pts) => pts;

export const STROKES = {
  A: [line([12, 90], [50, 10]), line([50, 10], [88, 90]), line([27, 62], [73, 62])],
  B: [line([22, 10], [22, 90]), [[22, 10], ...arc(48, 30, 20, -90, 90), [22, 50]], [[22, 50], ...arc(50, 70, 20, -90, 90), [22, 90]]],
  C: [arc(50, 50, 38, -45, 225)],
  D: [line([22, 10], [22, 90]), [[22, 10], [45, 10], ...arc(45, 50, 40, -90, 90), [22, 90]]],
  E: [line([22, 10], [22, 90]), line([22, 10], [80, 10]), line([22, 50], [70, 50]), line([22, 90], [80, 90])],
  F: [line([22, 10], [22, 90]), line([22, 10], [80, 10]), line([22, 50], [70, 50])],
  G: [[...arc(50, 50, 38, -45, 90), [88, 50], [58, 50]]],
  H: [line([20, 10], [20, 90]), line([80, 10], [80, 90]), line([20, 50], [80, 50])],
  I: [line([50, 10], [50, 90])],
  J: [[[62, 10], [62, 65], ...arc(42, 65, 20, 0, 180)]],
  K: [line([22, 10], [22, 90]), line([75, 10], [22, 58]), line([38, 45], [80, 90])],
  L: [line([22, 10], [22, 90]), line([22, 90], [80, 90])],
  M: [line([14, 90], [14, 10]), line([14, 10], [50, 62]), line([50, 62], [86, 10]), line([86, 10], [86, 90])],
  N: [line([20, 90], [20, 10]), line([20, 10], [80, 90]), line([80, 90], [80, 10])],
  O: [arc(50, 50, 40, -90, 270)],
  P: [line([22, 10], [22, 90]), [[22, 10], ...arc(50, 32, 22, -90, 90), [22, 54]]],
  Q: [arc(50, 48, 38, -90, 270), line([58, 62], [86, 92])],
  R: [line([22, 10], [22, 90]), [[22, 10], ...arc(50, 32, 22, -90, 90), [22, 54]], line([45, 54], [82, 90])],
  S: [[...arc(50, 30, 20, 30, -180), ...arc(50, 70, 20, -90, 150)]],
  T: [line([15, 10], [85, 10]), line([50, 10], [50, 90])],
  U: [[[20, 10], [20, 60], ...arc(50, 60, 30, 180, 360), [80, 10]]],
  V: [line([15, 10], [50, 90]), line([50, 90], [85, 10])],
  W: [line([8, 10], [28, 90]), line([28, 90], [50, 28]), line([50, 28], [72, 90]), line([72, 90], [92, 10])],
  X: [line([20, 10], [80, 90]), line([80, 10], [20, 90])],
  Y: [line([18, 10], [50, 52]), line([82, 10], [50, 52]), line([50, 52], [50, 90])],
  Z: [line([20, 10], [80, 10]), line([80, 10], [20, 90]), line([20, 90], [80, 90])],
  1: [line([32, 30], [55, 10]), line([55, 10], [55, 90])],
  2: [[...arc(50, 30, 22, -160, 40), [28, 90], [78, 90]]],
  4: [line([62, 10], [22, 62]), line([22, 62], [82, 62]), line([62, 10], [62, 90])],
  5: [line([75, 10], [30, 10]), [[30, 10], [26, 48], ...arc(50, 66, 24, -110, 160)]],
  7: [line([22, 10], [80, 10]), line([80, 10], [40, 90])],
};

STROKES[6] = [[[72, 12], ...arc(50, 64, 24, -120, 240)]];
STROKES[8] = [[...arc(50, 30, 20, 45, -315), ...arc(50, 70, 21, -90, 270)]];
STROKES[9] = [[...arc(50, 33, 22, 0, -360), [72, 33], [55, 90]]];
STROKES[3] = [[...arc(50, 30, 20, -140, 90), ...arc(50, 70, 20, -90, 140)]];
STROKES[0] = [arc(50, 50, 40, -90, 270).map(([x, y]) => [50 + (x - 50) * 0.75, y])];

// Wörter fürs Schreiben (kurz, Großbuchstaben)
export const WRITE_WORDS = ["MAMA", "PAPA", "HALLO", "HAUS", "SONNE", "BLUME", "WELT", "ERDE", "OMA", "OPA", "AUTO", "BALL"];

// Punkte gleichmäßig entlang eines Strichs (für die Auswertung)
export function samplePath(pts, step = 3) {
  const out = [];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const d = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.round(d / step));
    for (let k = 0; k < n; k++) out.push([x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// Bewertung: Wie viel der Bahn ist abgedeckt, wie viel liegt daneben?
export function scoreStroke(drawn, path, tol = 9) {
  if (drawn.length < 3) return { score: 0, coverage: 0, precision: 0 };
  const ref = samplePath(path, 2.5);
  const near = (p, list) => list.some(([x, y]) => Math.hypot(x - p[0], y - p[1]) <= tol);
  const covered = ref.filter((p) => near(p, drawn)).length / ref.length;
  const precise = drawn.filter((p) => near(p, ref)).length / drawn.length;
  const score = covered * 0.65 + precise * 0.35;
  return { score, coverage: covered, precision: precise };
}
