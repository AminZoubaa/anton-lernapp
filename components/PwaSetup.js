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
  return null;
}
