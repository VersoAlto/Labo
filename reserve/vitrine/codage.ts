import type { Partition, UniversId } from "./types";

/**
 * La partition voyage dans le fragment de l'URL.
 *
 * Pas de serveur, pas de base : le lien envoyé au client contient son site. Le
 * revers est que ce fragment est une entrée non fiable, n'importe qui peut en
 * fabriquer un. `assainir` reconstruit donc la partition champ par champ au
 * lieu de faire confiance à ce qui arrive.
 */

export function coder(p: Partition): string {
  const octets = new TextEncoder().encode(JSON.stringify(p));
  let brut = "";
  octets.forEach((o) => (brut += String.fromCharCode(o)));
  return btoa(brut).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decoder(code: string): Partition | null {
  try {
    const brut = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
    const octets = Uint8Array.from(brut, (c) => c.charCodeAt(0));
    return assainir(JSON.parse(new TextDecoder().decode(octets)));
  } catch {
    return null;
  }
}

const txt = (v: unknown, max = 400) => (typeof v === "string" ? v.slice(0, max) : "");
const oui = (v: unknown) => v === true;
const liste = (v: unknown, max: number): Record<string, unknown>[] =>
  Array.isArray(v) ? v.filter((x) => x && typeof x === "object").slice(0, max) : [];
const UNIVERS_CONNUS: UniversId[] = ["atelier", "nocturne", "clairiere"];

export function assainir(x: unknown): Partition | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, Record<string, unknown>> & { v?: unknown; nom?: unknown; univers?: unknown; contact?: unknown };
  if (o.v !== 1) return null;
  const hero = o.hero ?? {};
  const seuil = o.seuil ?? {};
  const parcours = o.parcours ?? {};
  const epreuve = o.epreuve ?? {};
  const preuves = o.preuves ?? {};
  const collection = o.collection ?? {};
  const sommet = o.sommet ?? {};
  const nb = Number(collection.nb);

  return {
    v: 1,
    nom: txt(o.nom, 80),
    univers: UNIVERS_CONNUS.includes(o.univers as UniversId) ? (o.univers as UniversId) : "atelier",
    contact: txt(o.contact, 300),
    hero: { surtitre: txt(hero.surtitre, 80), titre: txt(hero.titre, 200), sous: txt(hero.sous) },
    seuil: {
      actif: oui(seuil.actif),
      question: txt(seuil.question, 160),
      profils: liste(seuil.profils, 4).map((p) => ({ nom: txt(p.nom, 60), accroche: txt(p.accroche) })),
    },
    parcours: {
      actif: oui(parcours.actif),
      titre: txt(parcours.titre, 160),
      etapes: liste(parcours.etapes, 5).map((e) => ({ titre: txt(e.titre, 100), texte: txt(e.texte) })),
    },
    epreuve: {
      actif: oui(epreuve.actif),
      titre: txt(epreuve.titre, 160),
      questions: liste(epreuve.questions, 3).map((q) => ({
        q: txt(q.q, 160),
        options: (Array.isArray(q.options) ? q.options : []).slice(0, 4).map((op) => txt(op, 80)),
      })),
    },
    preuves: {
      actif: oui(preuves.actif),
      titre: txt(preuves.titre, 160),
      temoignages: liste(preuves.temoignages, 3).map((t) => ({ qui: txt(t.qui, 80), quoi: txt(t.quoi) })),
      chiffres: liste(preuves.chiffres, 3).map((c) => ({ valeur: txt(c.valeur, 20), legende: txt(c.legende, 120) })),
    },
    collection: { actif: oui(collection.actif), nb: Number.isFinite(nb) ? Math.max(2, Math.min(4, Math.round(nb))) : 3 },
    sommet: {
      titre: txt(sommet.titre, 160),
      texte: txt(sommet.texte),
      cta: txt(sommet.cta, 60),
      recompense: txt(sommet.recompense, 200),
    },
  };
}

/**
 * Le contact vient lui aussi du fragment : seuls `https`, `http` et `mailto`
 * sont admis, pour qu'un lien fabriqué ne puisse pas porter de script.
 */
export function lienContact(contact: string): string | null {
  const c = contact.trim();
  if (/^https?:\/\/[^\s]+$/i.test(c)) return c;
  if (/^[^\s@:/]+@[^\s@:/]+\.[^\s@:/]+$/.test(c)) return `mailto:${c}`;
  return null;
}
