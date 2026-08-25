"use client";

// Einstellungs-Panel: deutsche System-Stimme auswählen und Probehören
import { useEffect, useState } from "react";
import { speak, getGermanVoices, getSavedVoiceURI, setPreferredVoice } from "@/lib/speech";

export default function VoicePicker({ onClose }) {
  const [voices, setVoices] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const load = () => setVoices(getGermanVoices());
    load();
    setSelected(getSavedVoiceURI());
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.addEventListener?.("voiceschanged", load);
      return () => window.speechSynthesis.removeEventListener?.("voiceschanged", load);
    }
  }, []);

  function choose(voice) {
    setPreferredVoice(voice.voiceURI);
    setSelected(voice.voiceURI);
    speak("Hallo! So klinge ich! A wie APFEL!");
  }

  function useAuto() {
    setPreferredVoice(null);
    setSelected(null);
    speak("Hallo! Ich bin die automatische Stimme!");
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-title">🗣️ Stimme auswählen</div>
        <div className="settings-hint">
          Tippe eine Stimme an, um sie zu hören und auszuwählen.
        </div>
        <div className="voice-list">
          <button
            className={`voice-row ${selected === null ? "active" : ""}`}
            onClick={useAuto}
          >
            <span className="voice-name">🤖 Automatisch (Standard)</span>
            {selected === null && <span>✅</span>}
          </button>
          {voices.map((v) => (
            <button
              key={v.voiceURI}
              className={`voice-row ${selected === v.voiceURI ? "active" : ""}`}
              onClick={() => choose(v)}
            >
              <span className="voice-name">
                🔊 {v.name}
                <span className="voice-lang"> ({v.lang}{v.localService ? "" : ", online"})</span>
              </span>
              {selected === v.voiceURI && <span>✅</span>}
            </button>
          ))}
          {voices.length === 0 && (
            <div className="settings-hint">
              Keine Stimmen gefunden – dein Browser lädt sie evtl. noch. Panel
              schließen und erneut öffnen.
            </div>
          )}
        </div>
        <button className="btn" onClick={onClose} style={{ marginTop: 14 }}>
          FERTIG ✅
        </button>
      </div>
    </div>
  );
}
