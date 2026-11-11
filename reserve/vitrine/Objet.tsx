import { useEffect, useRef, type RefObject } from "react";
import type { Univers } from "./univers";

/**
 * L'objet central : une seule forme, fixe, qui change d'état avec la descente.
 *
 * Canvas 2D et non WebGL. Le site généré doit s'ouvrir sur le téléphone d'un
 * directeur d'école ou d'un artisan, sans rien télécharger de lourd : cet
 * objet pèse quelques kilo-octets et ne dépend d'aucune bibliothèque.
 *
 * `progres` va de 0 (haut de page) à 1 (sommet). `eclat` va de 0 à 1 selon les
 * sceaux réunis : l'objet répond aussi à ce que le visiteur a fait, pas
 * seulement à ce qu'il a fait défiler.
 */

interface Props {
  univers: Univers;
  progres: RefObject<number>;
  eclat: number;
}

/** Générateur déterministe : le même univers dessine toujours la même figure. */
function alea(graine: number) {
  let a = graine;
  return () => {
    a = (a * 1664525 + 1013904223) % 4294967296;
    return a / 4294967296;
  };
}

const lisse = (t: number) => t * t * (3 - 2 * t);

export default function Objet({ univers, progres, eclat }: Props) {
  const toile = useRef<HTMLCanvasElement>(null);
  const eclatRef = useRef(eclat);
  eclatRef.current = eclat;

  useEffect(() => {
    const canvas = toile.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const immobile = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tirage = alea(7);
    const grains = Array.from({ length: 64 }, () => ({
      x: tirage(),
      y: tirage(),
      phase: tirage() * Math.PI * 2,
      taille: 0.6 + tirage() * 1.4,
    }));

    let l = 0;
    let h = 0;
    const mesurer = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      l = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(l * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    mesurer();

    const dessiner = (t: number) => {
      const p = lisse(Math.max(0, Math.min(1, progres.current ?? 0)));
      const e = eclatRef.current;
      ctx.clearRect(0, 0, l, h);
      // Sur grand écran l'objet se tient à droite du texte, sur téléphone
      // derrière lui : c'est le CSS qui règle alors son opacité.
      const large = l > 900;
      const cx = large ? l * 0.72 : l * 0.5;
      const cy = h * 0.5;
      const r = Math.min(l, h) * (large ? 0.34 : 0.42);

      if (univers.objet === "cernes") {
        const n = 3 + Math.round(p * 15);
        for (let i = 0; i < n; i++) {
          const rayon = (r * (i + 1)) / 18;
          ctx.beginPath();
          for (let a = 0; a <= 64; a++) {
            const angle = (a / 64) * Math.PI * 2;
            const onde =
              Math.sin(angle * 3 + i * 0.7 + t * 0.15) * 0.035 +
              Math.sin(angle * 5 - i * 0.4) * 0.02;
            const rr = rayon * (1 + onde);
            const x = cx + Math.cos(angle) * rr;
            const y = cy + Math.sin(angle) * rr * 0.94;
            if (a === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          const dernier = i === n - 1;
          ctx.strokeStyle = dernier ? univers.accent : univers.doux;
          ctx.globalAlpha = dernier ? 0.5 + e * 0.5 : 0.16 + (i / n) * 0.3;
          ctx.lineWidth = dernier ? 1.6 + e * 1.4 : 1;
          ctx.stroke();
        }
      } else if (univers.objet === "constellation") {
        const pts = grains.map((g, i) => {
          const angle = (i / grains.length) * Math.PI * 2;
          const anneau = i % 3 === 0 ? 0.5 : 1;
          const x0 = cx + (g.x - 0.5) * r * 3.2;
          const y0 = cy + (g.y - 0.5) * r * 2.6;
          const x1 = cx + Math.cos(angle) * r * anneau;
          const y1 = cy + Math.sin(angle) * r * anneau;
          const flotte = Math.sin(t * 0.4 + g.phase) * 4 * (1 - p);
          return { x: x0 + (x1 - x0) * p, y: y0 + (y1 - y0) * p + flotte, g };
        });
        const portee = r * (0.16 + p * 0.3);
        ctx.strokeStyle = univers.accent;
        ctx.lineWidth = 0.8;
        for (let i = 0; i < pts.length; i++) {
          for (let j = i + 1; j < pts.length; j++) {
            const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
            if (d > portee) continue;
            ctx.globalAlpha = (1 - d / portee) * (0.12 + p * 0.3 + e * 0.25);
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
        for (const { x, y, g } of pts) {
          ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 0.8 + g.phase);
          ctx.fillStyle = univers.texte;
          ctx.beginPath();
          ctx.arc(x, y, g.taille, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        const visibles = 14 + Math.round(p * 50);
        for (let i = 0; i < visibles; i++) {
          const g = grains[i];
          const monte = (g.y + t * 0.012 * g.taille) % 1;
          const x0 = cx + (g.x - 0.5) * r * 3;
          const x1 = cx + Math.sin(g.phase + monte * 6) * r * 0.22;
          const x = x0 + (x1 - x0) * p + Math.sin(t * 0.5 + g.phase) * 6;
          const y = cy + r * 1.2 - monte * r * 2.4;
          const fondu = Math.sin(monte * Math.PI);
          ctx.globalAlpha = fondu * (0.35 + e * 0.4);
          ctx.fillStyle = i % 4 === 0 ? univers.accent : univers.doux;
          ctx.beginPath();
          ctx.arc(x, y, g.taille * (1.4 + e), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    };

    let image = 0;
    let visible = true;
    const boucle = (ms: number) => {
      if (visible) dessiner(ms / 1000);
      image = requestAnimationFrame(boucle);
    };

    const surRedim = () => {
      mesurer();
      if (immobile) dessiner(0);
    };
    const surDefilement = () => dessiner(0);
    const surVisibilite = () => (visible = !document.hidden);

    window.addEventListener("resize", surRedim);
    document.addEventListener("visibilitychange", surVisibilite);
    if (immobile) {
      // Sans animation, l'objet ne bouge que si le visiteur bouge.
      dessiner(0);
      window.addEventListener("scroll", surDefilement, { passive: true });
    } else {
      image = requestAnimationFrame(boucle);
    }

    return () => {
      cancelAnimationFrame(image);
      window.removeEventListener("resize", surRedim);
      window.removeEventListener("scroll", surDefilement);
      document.removeEventListener("visibilitychange", surVisibilite);
    };
  }, [univers, progres]);

  return <canvas ref={toile} className="sg-objet" aria-hidden="true" />;
}
