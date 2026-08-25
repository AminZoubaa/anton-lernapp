"use client";

// Vollbild an/aus. Auf Geräten ohne Vollbild-API (z.B. iPhone) zeigt der
// Button stattdessen eine Anleitung: App zum Home-Bildschirm hinzufügen –
// dann startet sie immer im Vollbild (PWA).
import { useEffect, useState } from "react";

export default function FullscreenButton() {
  const [supported, setSupported] = useState(true);
  const [active, setActive] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const el = document.documentElement;
    setSupported(!!(el.requestFullscreen || el.webkitRequestFullscreen));
    setIsIOS(/iPhone|iPad|iPod/i.test(navigator.userAgent));
    setStandalone(
      window.matchMedia?.("(display-mode: standalone)").matches ||
        window.matchMedia?.("(display-mode: fullscreen)").matches ||
        window.navigator.standalone === true
    );
    const onChange = () =>
      setActive(!!(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  // Läuft schon als installierte App im Vollbild → Button unnötig
  if (standalone && !supported) return null;

  function toggle() {
    if (!supported) {
      setShowHint(true);
      return;
    }
    const el = document.documentElement;
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      req.call(el).catch?.(() => setShowHint(true));
    }
  }

  return (
    <>
      <button
        className="music-btn"
        aria-label={active ? "Vollbild beenden" : "Vollbild"}
        title={active ? "Vollbild beenden" : "Vollbild"}
        onClick={toggle}
      >
        {active ? "🔙" : "⛶"}
      </button>

      {showHint && (
        <div className="settings-overlay" onClick={() => setShowHint(false)}>
          <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
            <div className="settings-title">📱 Vollbild auf dem Handy</div>
            <div className="settings-hint" style={{ fontSize: "1.05rem", lineHeight: 1.6 }}>
              Dein Browser erlaubt hier kein direktes Vollbild. So bekommst du
              es trotzdem – installiere die App auf dem Home-Bildschirm:
              <br />
              <br />
              {isIOS ? (
                <>
                  1. Tippe unten auf <b>Teilen</b> (Viereck mit Pfeil ⬆️)
                  <br />
                  2. Wähle <b>„Zum Home-Bildschirm"</b> ➕
                  <br />
                  3. Starte die App über das neue Symbol – sie läuft dann im
                  Vollbild! 🎉
                </>
              ) : (
                <>
                  1. Öffne das Browser-Menü <b>⋮</b> (oben rechts)
                  <br />
                  2. Wähle <b>„App installieren"</b> oder{" "}
                  <b>„Zum Startbildschirm hinzufügen"</b>
                  <br />
                  3. Starte die App über das neue Symbol – sie läuft dann im
                  Vollbild! 🎉
                </>
              )}
            </div>
            <button className="btn" onClick={() => setShowHint(false)} style={{ marginTop: 16 }}>
              ALLES KLAR ✅
            </button>
          </div>
        </div>
      )}
    </>
  );
}
