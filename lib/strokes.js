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

// Bilder zu den Schreib-Wörtern
export const WORD_EMOJI = { MAMA: "👩", PAPA: "👨", HALLO: "👋", HAUS: "🏠", SONNE: "☀️", BLUME: "🌸", WELT: "🌍", ERDE: "🌎", OMA: "👵", OPA: "👴", AUTO: "🚗", BALL: "⚽" };

// ---------- Bewertung (Prinzip wie bei Hanzi-Writer: pro Strich prüfen) ----------
// Die Kinderspur (beliebig viele Züge, auch alles in einem Zug) wird in
// Abschnitte zerlegt: jeder Punkt gehört zu dem Soll-Strich, dem er am
// nächsten liegt. Dann wird JEDER Soll-Strich einzeln geprüft:
//   • Abdeckung: wie viel des Strichs wurde getroffen (fehlender Strich → durchgefallen)
//   • Genauigkeit: wie viele Punkte liegen daneben
//   • Richtung: Anfang → Ende des Abschnitts zeigt in Strich-Richtung
//   • Reihenfolge: die Abschnitte kommen in der Soll-Reihenfolge
export function scoreGlyph(drawnStrokes, strokes, tol = 10) {
  const drawn = drawnStrokes.flat();
  const fail = (why, extra = {}) => ({ score: 0, pass: false, why, ...extra });
  if (drawn.length < 4 || !strokes.length) return fail("Da fehlt noch etwas.");
  const refs = strokes.map((st) => samplePath(st, 2.5));
  const nearestStroke = (p) => {
    let bi = -1, bd = Infinity;
    refs.forEach((r, i) => {
      for (const [x, y] of r) {
        const d = Math.hypot(x - p[0], y - p[1]);
        if (d < bd) { bd = d; bi = i; }
      }
    });
    return { i: bi, d: bd };
  };
  // Punkte zuordnen (Reihenfolge der Kinderspur bleibt erhalten)
  const assigned = drawn.map((p) => ({ p, ...nearestStroke(p) }));
  const onPath = assigned.filter((a) => a.d <= tol * 1.6);
  const precision = assigned.filter((a) => a.d <= tol).length / assigned.length;
  // Abschnitte bilden
  const runs = [];
  for (const a of onPath) {
    const last = runs[runs.length - 1];
    if (last && last.i === a.i) last.pts.push(a.p);
    else runs.push({ i: a.i, pts: [a.p] });
  }
  const real = runs.filter((r) => r.pts.length >= 3);
  // Pro Soll-Strich
  const per = strokes.map((st, i) => {
    const pts = real.filter((r) => r.i === i).flatMap((r) => r.pts);
    const ref = refs[i];
    const covered = ref.filter(([x, y]) => pts.some((p) => Math.hypot(p[0] - x, p[1] - y) <= tol)).length / ref.length;
    let dir = 0;
    const main = real.filter((r) => r.i === i).sort((a, b) => b.pts.length - a.pts.length)[0];
    if (main) {
      const a = main.pts[0], b = main.pts[main.pts.length - 1];
      const sv = [st[st.length - 1][0] - st[0][0], st[st.length - 1][1] - st[0][1]];
      const uv = [b[0] - a[0], b[1] - a[1]];
      const closed = Math.hypot(sv[0], sv[1]) < 8; // Kreise (O, 0): Richtung über Bahnfortschritt statt Vektor
      if (closed) {
        const idx = (p) => { let bi = 0, bd = Infinity; ref.forEach(([x, y], k) => { const d = Math.hypot(x - p[0], y - p[1]); if (d < bd) { bd = d; bi = k; } }); return bi; };
        let fwd = 0, tot = 0, last = -1;
        for (const p of main.pts) { const k = idx(p); if (last >= 0) { tot++; if ((k - last + ref.length) % ref.length < ref.length / 2) fwd++; } last = k; }
        dir = tot ? fwd / tot : 0;
      } else {
        const dot = (sv[0] * uv[0] + sv[1] * uv[1]) / ((Math.hypot(...sv) * Math.hypot(...uv)) || 1);
        dir = dot > 0.3 ? 1 : dot > -0.3 ? 0.5 : 0;
      }
    }
    return { covered, dir };
  });
  // Reihenfolge der Abschnitte
  const seq = real.map((r) => r.i);
  let ok = 0, tot = 0;
  for (let k = 1; k < seq.length; k++) { tot++; if (seq[k] >= seq[k - 1]) ok++; }
  const order = tot ? ok / tot : 1;
  const minCov = Math.min(...per.map((x) => x.covered));
  const avgCov = per.reduce((a, x) => a + x.covered, 0) / per.length;
  const dirOk = per.filter((x) => x.dir >= 0.5).length / per.length;
  const startOk = Math.hypot(drawn[0][0] - strokes[0][0][0], drawn[0][1] - strokes[0][0][1]) <= tol * 2;

  // Harte Kriterien zuerst
  const missing = per.findIndex((x) => x.covered < 0.6);
  if (missing >= 0) return fail(`Strich ${missing + 1} fehlt noch oder ist zu kurz.`, { minCov, precision, order });
  if (precision < 0.55) return fail("Bleib auf der grauen Bahn.", { minCov, precision, order });
  if (!startOk) return fail("Fang beim grünen Punkt 1 an.", { minCov, precision, order });
  if (order < 0.6) return fail("Achte auf die Reihenfolge: 1, dann 2, dann 3.", { minCov, precision, order });
  if (dirOk < 0.6) return fail("Zieh die Striche in Pfeilrichtung.", { minCov, precision, order });

  const score = avgCov * 0.4 + precision * 0.25 + order * 0.15 + dirOk * 0.2;
  return { score, pass: true, minCov, avgCov, precision, order, dirOk, why: "" };
}
