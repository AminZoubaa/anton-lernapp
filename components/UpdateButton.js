"use client";

// "Update laden": löscht alle Caches, meldet den Service Worker ab und
// lädt die Seite frisch vom Server – bricht so jede alte Offline-Version.
import { useEffect, useState } from "react";

export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "dev";

export default function UpdateButton({ className = "btn btn-blue" }) {
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  async function update() {
    setBusy(true);
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {}
    const url = new URL(window.location.href);
    url.searchParams.set("v", String(Date.now()));
    window.location.replace(url.toString());
  }

  return (
    <button className={className} onClick={update} disabled={busy || !online}>
      {busy ? "⏳ Lade neu…" : online ? "🔄 Update laden" : "📴 Offline"}
      <span style={{ fontSize: "0.75rem", opacity: 0.7, marginLeft: 8 }}>v{APP_VERSION}</span>
    </button>
  );
}
