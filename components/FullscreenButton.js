"use client";

// Vollbild an/aus – wird ausgeblendet, wenn der Browser es nicht kann (z.B. iPhone)
import { useEffect, useState } from "react";

export default function FullscreenButton() {
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    setSupported(
      typeof document !== "undefined" &&
        !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen)
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

  if (!supported) return null;

  function toggle() {
    const el = document.documentElement;
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
    }
  }

  return (
    <button
      className="music-btn"
      aria-label={active ? "Vollbild beenden" : "Vollbild"}
      title={active ? "Vollbild beenden" : "Vollbild"}
      onClick={toggle}
    >
      {active ? "🔙" : "⛶"}
    </button>
  );
}
