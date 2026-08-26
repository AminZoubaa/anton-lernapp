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

  // Kein "Gummiband"-Scrollen (iOS zieht sonst die ganze Seite mit):
  // Wischen wird nur durchgelassen, wenn ein Element wirklich scrollen kann
  // und noch nicht an seinem Rand ist.
  useEffect(() => {
    let startY = 0;
    const scrollable = (el) => {
      while (el && el !== document.body && el !== document.documentElement) {
        const st = getComputedStyle(el);
        if (/(auto|scroll)/.test(st.overflowY) && el.scrollHeight > el.clientHeight + 1) return el;
        el = el.parentElement;
      }
      const doc = document.scrollingElement || document.documentElement;
      return doc.scrollHeight > doc.clientHeight + 1 ? doc : null;
    };
    const onStart = (e) => { startY = e.touches[0].clientY; };
    const onMove = (e) => {
      if (e.touches.length !== 1) return;
      const el = scrollable(e.target);
      if (!el) { e.preventDefault(); return; }
      const dy = e.touches[0].clientY - startY;
      const atTop = el.scrollTop <= 0, atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
      if ((dy > 0 && atTop) || (dy < 0 && atBottom)) e.preventDefault();
    };
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: false });
    return () => { document.removeEventListener("touchstart", onStart); document.removeEventListener("touchmove", onMove); };
  }, []);
  return null;
}
