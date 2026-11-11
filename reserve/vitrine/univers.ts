import type { UniversId } from "./types";

/**
 * Trois univers, et ils ne diffèrent pas que par la couleur.
 *
 * Le risque d'un générateur est l'uniformité : si deux clients reçoivent le
 * même site repeint, on a refait un gabarit. Chaque univers change donc quatre
 * choses à la fois : la lumière (clair ou nuit), la lettre, la forme des
 * angles et l'objet central.
 */
export interface Univers {
  id: UniversId;
  nom: string;
  resume: string;
  sombre: boolean;
  fond: string;
  surface: string;
  texte: string;
  doux: string;
  accent: string;
  surAccent: string;
  display: string;
  graisse: number;
  italique: boolean;
  rayon: string;
  objet: "cernes" | "constellation" | "lucioles";
}

const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export const UNIVERS: Record<UniversId, Univers> = {
  atelier: {
    id: "atelier",
    nom: "Atelier",
    resume: "Papier chaud, lettre à empattements, angles vifs. Des cernes de bois qui s'ajoutent.",
    sombre: false,
    fond: "#f3ede2",
    surface: "#e9e0d0",
    texte: "#211b14",
    doux: "#5c5145",
    accent: "#a4461f",
    surAccent: "#fff8ee",
    display: '"EB Garamond Variable", "EB Garamond", Georgia, serif',
    graisse: 500,
    italique: false,
    rayon: "2px",
    objet: "cernes",
  },
  nocturne: {
    id: "nocturne",
    nom: "Nocturne",
    resume: "Nuit bleue, lettre droite et serrée, pilules. Une constellation qui se relie.",
    sombre: true,
    fond: "#0c111d",
    surface: "#151c2c",
    texte: "#e9edf6",
    doux: "#9aa6bd",
    accent: "#f0b959",
    surAccent: "#0c111d",
    display: SANS,
    graisse: 650,
    italique: false,
    rayon: "999px",
    objet: "constellation",
  },
  clairiere: {
    id: "clairiere",
    nom: "Clairière",
    resume: "Vert tendre, italique, angles ronds. Des lucioles qui se rassemblent.",
    sombre: false,
    fond: "#e8efe4",
    surface: "#dbe6d5",
    texte: "#14261b",
    doux: "#48604f",
    accent: "#24603f",
    surAccent: "#f2f7ef",
    display: '"EB Garamond Variable", "EB Garamond", Georgia, serif',
    graisse: 500,
    italique: true,
    rayon: "20px",
    objet: "lucioles",
  },
};

export const LISTE_UNIVERS = Object.values(UNIVERS);

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const canal = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
}

/** Rapport de contraste WCAG entre deux couleurs hexadécimales. */
export function contraste(a: string, b: string) {
  const [haut, bas] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (haut + 0.05) / (bas + 0.05);
}
