"use client";

// Registriert den Service Worker (nur im Produktions-Deployment)
import { useEffect } from "react";

export default function PwaSetup({ prefix = "" }) {
  useEffect(() => {
    if (
      typeof navigator !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker
        .register(`${prefix}/sw.js`, { scope: `${prefix}/` })
        .catch(() => {});
    }
  }, [prefix]);

  // Kein "Gummiband"-Scrollen (iOS zieht sonst die ganze Seite mit).
  // Wichtig für flüssiges Zeichnen: die teure Prüfung (welches Element scrollt?)
  // passiert EINMAL bei touchstart; bei touchmove nur noch Arithmetik.
  useEffect(() => {
    let startY = 0, el = null, block = false;
    const findScrollable = (t) => {
      while (t && t !== document.body && t !== document.documentElement) {
        if (t.classList?.contains("race-area") || t.tagName === "CANVAS" || t.tagName === "svg") return null; // Spielflächen: nie scrollen
        const st = getComputedStyle(t);
        if (/(auto|scroll)/.test(st.overflowY) && t.scrollHeight > t.clientHeight + 1) return t;
        t = t.parentElement;
      }
      const doc = document.scrollingElement || document.documentElement;
      return doc.scrollHeight > doc.clientHeight + 1 ? doc : null;
    };
    const onStart = (e) => { startY = e.touches[0].clientY; el = findScrollable(e.target); block = !el; };
    const onMove = (e) => {
      if (e.touches.length !== 1) return;
      if (block) { e.preventDefault(); return; }
      const dy = e.touches[0].clientY - startY;
      if ((dy > 0 && el.scrollTop <= 0) || (dy < 0 && el.scrollTop + el.clientHeight >= el.scrollHeight - 1)) e.preventDefault();
    };
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: false });
    return () => { document.removeEventListener("touchstart", onStart); document.removeEventListener("touchmove", onMove); };
  }, []);
  return null;
}
