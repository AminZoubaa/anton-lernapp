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
  ctx.textBaseline = "alphabetic";

  // Deko nur in den oberen Ecken (unten steht die Fußzeile – nichts überlappt)
  ctx.font = "60px serif";
  ctx.fillText("🎈", 140, 150);
  ctx.fillText("🌟", W - 140, 150);

  // Layout in drei Spalten: Pokal | Text | Medaille
  const midX = W / 2;
  const leftX = 250;
  const rightX = W - 250;

  // Pokal links, groß, mit Sockel
  ctx.fillStyle = "#ffe9a8";
  ctx.beginPath();
  ctx.ellipse(leftX, 560, 150, 190, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = "230px serif";
  ctx.fillText("🏆", leftX, 640);
  ctx.font = "700 30px Arial, sans-serif";
  ctx.fillStyle = "#8a6d00";
  ctx.fillText("POKAL", leftX, 780);

  // Medaille rechts – Gold/Silber/Bronze je nach Sternen
  const medal = stars >= 3 ? "🥇" : stars === 2 ? "🥈" : "🥉";
  const medalName = stars >= 3 ? "GOLD" : stars === 2 ? "SILBER" : "BRONZE";
  ctx.fillStyle = stars >= 3 ? "#fff1b5" : stars === 2 ? "#eeeeee" : "#f3dcc7";
  ctx.beginPath();
  ctx.ellipse(rightX, 560, 150, 190, 0, 0, Math.PI * 2);
  ctx.fill();
  // Band
  ctx.fillStyle = "#ff4b4b";
  ctx.fillRect(rightX - 60, 380, 40, 150);
  ctx.fillStyle = "#1cb0f6";
  ctx.fillRect(rightX + 20, 380, 40, 150);
  ctx.font = "230px serif";
  ctx.fillText(medal, rightX, 660);
  ctx.font = "700 30px Arial, sans-serif";
  ctx.fillStyle = "#8a6d00";
  ctx.fillText(`${medalName}-MEDAILLE`, rightX, 780);

  // Titel
  ctx.fillStyle = "#3b3355";
  ctx.font = "700 88px Arial, sans-serif";
  ctx.fillText("URKUNDE", midX, 250);

  // Name
  ctx.font = "400 36px Arial, sans-serif";
  ctx.fillStyle = "#8a84a3";
  ctx.fillText("für", midX, 320);
  ctx.font = "700 72px Arial, sans-serif";
  ctx.fillStyle = "#ff9600";
  ctx.fillText((name || "DICH").toUpperCase(), midX, 400);

  // Kapitel
  ctx.font = "400 36px Arial, sans-serif";
  ctx.fillStyle = "#8a84a3";
  ctx.fillText("hat das Kapitel", midX, 470);
  ctx.font = "700 58px Arial, sans-serif";
  ctx.fillStyle = "#1cb0f6";
  ctx.fillText(`${chapterEmoji}  ${chapterTitle}  ${chapterEmoji}`, midX, 545);
  ctx.font = "400 36px Arial, sans-serif";
  ctx.fillStyle = "#8a84a3";
  ctx.fillText("super gemeistert!", midX, 605);

  // Sterne
  ctx.font = "84px serif";
  ctx.fillText("⭐".repeat(stars) + "☆".repeat(3 - stars), midX, 705);

  // Punkte
  ctx.font = "700 44px Arial, sans-serif";
  ctx.fillStyle = "#58cc02";
  ctx.fillText(`${points} Punkte 🪙`, midX, 775);

  // Fußzeile – eigene Zeile, nichts darüber
  ctx.font = "400 26px Arial, sans-serif";
  ctx.fillStyle = "#8a84a3";
  ctx.textAlign = "left";
  ctx.fillText("ABC & 123 – Lernspaß", 110, H - 90);
  ctx.textAlign = "right";
  const date = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  ctx.fillText(date, W - 110, H - 90);

  return canvas;
}

function fileName(chapterTitle, ext) {
  const clean = chapterTitle.replace(/[^\wÄÖÜäöüß\- ]/g, "").replace(/\s+/g, "-");
  return `Urkunde-${clean}.${ext}`;
}

export function downloadCertificatePNG(opts) {
  if (isStandalone()) return shareCertificate(opts);
  const canvas = drawCertificate(opts);
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = fileName(opts.chapterTitle, "png");
  a.click();
}

// PDF exakt 150 × 100 mm (Postkarte / Foto 10x15), randlos
export async function downloadCertificatePDF(opts) {
  const canvas = drawCertificate(opts);
  if (isStandalone()) {
    // PDF ebenfalls über das Teilen-Menü (kein neuer Tab in der Web-App)
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [150, 100] });
    doc.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, 150, 100);
    const file = new File([doc.output("blob")], fileName(opts.chapterTitle, "pdf"), { type: "application/pdf" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Urkunde" });
      } catch {}
      return;
    }
  }
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

export function isStandalone() {
  return typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true);
}

// Drucken: In der Home-Bildschirm-App gibt es keine Tabs und keinen
// Zurück-Knopf – ein neues Fenster wäre eine Sackgasse. Dort geht es über
// das System-Teilen-Menü (dort steht "Drucken"). Im Browser: eigenes Fenster
// mit @page 150mm × 100mm, Bild randlos.
export function printCertificate(opts) {
  if (isStandalone()) return shareCertificate(opts);
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
