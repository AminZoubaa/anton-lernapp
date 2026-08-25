// GSAP-Effekte: Explosionen, Konfetti, Pop-Animationen
import gsap from "gsap";

function makeLayer() {
  const layer = document.createElement("div");
  layer.style.cssText =
    "position:fixed;left:0;top:0;width:0;height:0;z-index:100;pointer-events:none;";
  document.body.appendChild(layer);
  return layer;
}

// Partikel-Explosion an Bildschirmposition
export function burstAt(x, y, emojis = ["⭐", "✨", "🌟"], count = 14) {
  if (typeof document === "undefined") return;
  const layer = makeLayer();
  for (let i = 0; i < count; i++) {
    const s = document.createElement("span");
    s.textContent = emojis[i % emojis.length];
    s.style.cssText = `position:fixed;left:${x}px;top:${y}px;font-size:${
      16 + Math.random() * 16
    }px;transform:translate(-50%,-50%);will-change:transform,opacity;`;
    layer.appendChild(s);
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.6;
    const dist = 70 + Math.random() * 110;
    gsap.to(s, {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist - 40,
      rotation: gsap.utils.random(-220, 220),
      scale: gsap.utils.random(0.5, 1.6),
      opacity: 0,
      duration: 0.7 + Math.random() * 0.6,
      ease: "power2.out",
    });
  }
  setTimeout(() => layer.remove(), 1600);
}

export function burstFromElement(el, emojis, count) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  burstAt(r.left + r.width / 2, r.top + r.height / 2, emojis, count);
}

// Konfetti-Regen von oben (Abschluss)
export function confettiRain(
  emojis = ["🎉", "⭐", "🎈", "🌟", "🎊", "💛", "💙", "💚"],
  count = 36
) {
  if (typeof document === "undefined") return;
  const layer = makeLayer();
  const w = window.innerWidth;
  for (let i = 0; i < count; i++) {
    const s = document.createElement("span");
    s.textContent = emojis[i % emojis.length];
    s.style.cssText = `position:fixed;left:${Math.random() * w}px;top:-40px;font-size:${
      18 + Math.random() * 18
    }px;will-change:transform,opacity;`;
    layer.appendChild(s);
    gsap.to(s, {
      y: window.innerHeight + 80,
      x: `+=${gsap.utils.random(-120, 120)}`,
      rotation: gsap.utils.random(-540, 540),
      duration: gsap.utils.random(2, 3.6),
      delay: Math.random() * 0.9,
      ease: "power1.in",
      opacity: 0.7,
    });
  }
  setTimeout(() => layer.remove(), 5200);
}

// Element federnd einblenden
export function popIn(el, vars = {}) {
  if (!el) return;
  gsap.fromTo(
    el,
    { scale: 0.4, opacity: 0, y: 24 },
    { scale: 1, opacity: 1, y: 0, duration: 0.55, ease: "back.out(2.2)", ...vars }
  );
}

// Von oben hereinfallen mit Bounce (großer Buchstabe / Zahl)
export function dropIn(el, vars = {}) {
  if (!el) return;
  gsap.fromTo(
    el,
    { y: -160, scale: 0.6, rotation: -14, opacity: 0 },
    {
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
      duration: 0.8,
      ease: "bounce.out",
      ...vars,
    }
  );
}

// Antwort-Optionen nacheinander hereinspringen lassen
export function staggerIn(els, vars = {}) {
  if (!els || !els.length) return;
  gsap.fromTo(
    els,
    { y: 40, opacity: 0, scale: 0.7 },
    {
      y: 0,
      opacity: 1,
      scale: 1,
      duration: 0.45,
      stagger: 0.1,
      ease: "back.out(1.9)",
      ...vars,
    }
  );
}

export function pulseEl(el) {
  if (!el) return;
  gsap.fromTo(el, { scale: 1 }, { scale: 1.18, yoyo: true, repeat: 1, duration: 0.13 });
}
