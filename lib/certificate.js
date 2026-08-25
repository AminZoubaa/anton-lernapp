// Urkunde als Canvas zeichnen und als PNG oder PDF herunterladen
import { jsPDF } from "jspdf";

const NAME_KEY = "anton-lernapp-name";

export function loadName() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(NAME_KEY) || "";
}

export function saveName(name) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NAME_KEY, name);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Postkarten-/Fotoformat 15 × 10 cm bei 300 dpi (1772 × 1181 px) – passt
// randlos auf Fotodrucker (10x15) und als Postkarte.
export const CERT_W = 1772;
export const CERT_H = 1181;

export function drawCertificate({ name, chapterTitle, chapterEmoji, stars, points }) {
  const canvas = document.createElement("canvas");
  canvas.width = CERT_W;
  canvas.height = CERT_H;
  const ctx = canvas.getContext("2d");
  // Layout ist für 1400 × 990 entworfen → auf Fotoformat skalieren
  const W = 1400;
  const H = 990;
  ctx.setTransform(CERT_W / W, 0, 0, CERT_H / H, 0, 0);

  // Hintergrund
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#fff9e6");
  g.addColorStop(1, "#e8f6ff");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Doppelter bunter Rahmen
  ctx.strokeStyle = "#ffc800";
  ctx.lineWidth = 18;
  roundRect(ctx, 30, 30, W - 60, H - 60, 40);
  ctx.stroke();
  ctx.strokeStyle = "#1cb0f6";
  ctx.lineWidth = 6;
  roundRect(ctx, 62, 62, W - 124, H - 124, 28);
  ctx.stroke();

  ctx.textAlign = "center";

  // Deko in den Ecken
  ctx.font = "64px serif";
  ctx.fillText("🎈", 150, 170);
  ctx.fillText("🌟", W - 150, 170);
  ctx.fillText("🌈", 150, H - 110);
  ctx.fillText("🎉", W - 150, H - 110);

  // Pokal
  ctx.font = "120px serif";
  ctx.fillText("🏆", W / 2, 220);

  // Titel
  ctx.fillStyle = "#3b3355";
  ctx.font = "700 92px Arial, sans-serif";
  ctx.fillText("URKUNDE", W / 2, 340);

  // Name
  ctx.font = "400 42px Arial, sans-serif";
  ctx.fillStyle = "#8a84a3";
  ctx.fillText("für", W / 2, 410);
  ctx.font = "700 76px Arial, sans-serif";
  ctx.fillStyle = "#ff9600";
  ctx.fillText((name || "DICH").toUpperCase(), W / 2, 495);

  // Kapitel
  ctx.font = "400 42px Arial, sans-serif";
  ctx.fillStyle = "#8a84a3";
  ctx.fillText("hat das Kapitel", W / 2, 565);
  ctx.font = "700 66px Arial, sans-serif";
  ctx.fillStyle = "#1cb0f6";
  ctx.fillText(`${chapterEmoji}  ${chapterTitle}  ${chapterEmoji}`, W / 2, 650);
  ctx.font = "400 42px Arial, sans-serif";
  ctx.fillStyle = "#8a84a3";
  ctx.fillText("super gemeistert!", W / 2, 715);

  // Sterne
  ctx.font = "90px serif";
  const starStr = "⭐".repeat(stars) + "☆".repeat(3 - stars);
  ctx.fillText(starStr, W / 2, 825);

  // Punkte
  ctx.font = "700 46px Arial, sans-serif";
  ctx.fillStyle = "#58cc02";
  ctx.fillText(`${points} Punkte 🪙`, W / 2, 895);

  // Fußzeile
  ctx.font = "400 28px Arial, sans-serif";
  ctx.fillStyle = "#8a84a3";
  ctx.textAlign = "left";
  ctx.fillText("ABC & 123 – Lernspaß", 100, H - 55);
  ctx.textAlign = "right";
  const date = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  ctx.fillText(date, W - 100, H - 55);

  return canvas;
}

function fileName(chapterTitle, ext) {
  const clean = chapterTitle.replace(/[^\wÄÖÜäöüß\- ]/g, "").replace(/\s+/g, "-");
  return `Urkunde-${clean}.${ext}`;
}

export function downloadCertificatePNG(opts) {
  const canvas = drawCertificate(opts);
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = fileName(opts.chapterTitle, "png");
  a.click();
}

// PDF exakt 150 × 100 mm (Postkarte / Foto 10x15), randlos
export function downloadCertificatePDF(opts) {
  const canvas = drawCertificate(opts);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [150, 100] });
  doc.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, 150, 100);
  doc.save(fileName(opts.chapterTitle, "pdf"));
}

function toBlob(canvas) {
  return new Promise((r) => canvas.toBlob(r, "image/png"));
}

// Teilen über das System-Menü (AirDrop, Nachrichten, Fotos speichern …)
export async function shareCertificate(opts) {
  const canvas = drawCertificate(opts);
  const blob = await toBlob(canvas);
  const file = new File([blob], fileName(opts.chapterTitle, "png"), { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Urkunde", text: `Urkunde: ${opts.chapterTitle}` });
      return true;
    } catch {
      return false;
    }
  }
  downloadCertificatePNG(opts);
  return false;
}

// Drucken: eigenes Fenster mit @page 150mm × 100mm, Bild randlos
export function printCertificate(opts) {
  const canvas = drawCertificate(opts);
  const url = canvas.toDataURL("image/png");
  const w = window.open("", "_blank");
  if (!w) return downloadCertificatePDF(opts);
  w.document.write(`<!doctype html><html><head><title>Urkunde</title><style>
    @page { size: 150mm 100mm; margin: 0; }
    html, body { margin: 0; padding: 0; }
    img { width: 150mm; height: 100mm; display: block; }
  </style></head><body><img src="${url}" onload="setTimeout(function(){window.print();}, 200)"></body></html>`);
  w.document.close();
}
