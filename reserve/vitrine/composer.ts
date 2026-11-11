import { lignes, profilsDe } from "./diagnostic";
import type { Action, Brief, Diagnostic, Frein, Partition, Secteur } from "./types";

/**
 * Du brief et du diagnostic à la partition.
 *
 * Les textes sortent de gabarits, donc ils sont justes mais génériques. C'est
 * le point d'entrée prévu pour une rédaction par IA : remplacer cette fonction
 * par un appel qui rend la même `Partition`, et rien d'autre ne bouge.
 */

export const CTA: Record<Action, string> = {
  rdv: "Prendre rendez-vous",
  inscription: "S'inscrire",
  devis: "Demander un devis",
  don: "Faire un don",
  achat: "Commander",
  visite: "Préparer ma visite",
};

const SOUS_TITRE: Record<Frein, string> = {
  mefiance: "Ne nous croyez pas sur parole. Parcourez, vérifiez, puis décidez.",
  temps: "Trois minutes suffisent pour savoir si c'est pour vous.",
  incomprehension: "Faites le parcours : en bas, vous saurez exactement ce que nous faisons pour vous.",
  prix: "Voyez d'abord ce que vous obtenez. Le prix se juge après.",
  indifference: "Descendez. Quelque chose vous attend en bas.",
};

const CE_QUI_COMPTE: Record<Secteur, string[]> = {
  ecole: ["Un cadre qui tient", "Des progrès visibles", "Un enfant qui s'épanouit"],
  artisan: ["Un travail qui dure", "Un délai tenu", "Un conseil sur mesure"],
  association: ["Donner du sens", "Rencontrer des gens", "Être utile concrètement"],
  independant: ["Y voir clair", "Aller vite", "Être accompagné"],
  culture: ["Être surpris", "Partager un moment", "Apprendre quelque chose"],
  entreprise: ["Réduire un risque", "Gagner du temps", "Mesurer un résultat"],
};

function couper(ligne: string): [string, string] {
  const i = ligne.indexOf(":");
  if (i === -1) return [ligne.trim(), ""];
  // « Titre : description » : la description devient une phrase à part
  // entière sur le site, donc elle prend sa majuscule.
  const suite = ligne.slice(i + 1).trim();
  return [ligne.slice(0, i).trim(), suite.charAt(0).toUpperCase() + suite.slice(1)];
}

export function composer(brief: Brief, diagnostic: Diagnostic): Partition {
  const retenue = (id: string) => diagnostic.mecaniques.find((m) => m.id === id)?.retenue ?? false;
  const cta = CTA[brief.action];
  const recompense = brief.recompense.trim();

  return {
    v: 1,
    nom: brief.nom.trim() || "Sans nom",
    univers: diagnostic.univers,
    contact: brief.contact.trim(),
    hero: {
      surtitre: brief.nom.trim(),
      titre: brief.promesse.trim() || "Votre promesse, en une phrase.",
      sous: SOUS_TITRE[brief.frein],
    },
    seuil: {
      actif: retenue("seuil"),
      question: "Avant d'entrer : qui êtes-vous ?",
      profils: profilsDe(brief).map((nom) => ({
        nom,
        accroche: `Vous venez en tant que ${nom.toLowerCase()}. La suite va droit à ce qui vous concerne.`,
      })),
    },
    parcours: {
      actif: retenue("parcours"),
      titre: "Le chemin, palier par palier",
      etapes: lignes(brief.etapes)
        .slice(0, 5)
        .map((l) => {
          const [titre, texte] = couper(l);
          return { titre, texte };
        }),
    },
    epreuve: {
      actif: retenue("epreuve"),
      titre: "Trois questions pour trouver votre point d'entrée",
      questions: [
        { q: "Où en êtes-vous ?", options: ["Je découvre", "Je compare", "Je suis décidé"] },
        { q: "Qu'est-ce qui compte le plus pour vous ?", options: CE_QUI_COMPTE[brief.secteur] },
        { q: "C'est pour quand ?", options: ["Maintenant", "Dans l'année", "Je me renseigne"] },
      ],
    },
    preuves: {
      actif: retenue("preuves"),
      titre: "Ce que d'autres en disent",
      temoignages: lignes(brief.temoignages)
        .slice(0, 3)
        .map((l) => {
          const [qui, quoi] = couper(l);
          return { qui, quoi };
        }),
      chiffres: lignes(brief.chiffres)
        .slice(0, 3)
        .map((l) => {
          const [valeur, legende] = couper(l);
          return { valeur, legende };
        }),
    },
    collection: { actif: retenue("collection"), nb: 3 },
    sommet: {
      titre: "Vous êtes arrivé en haut.",
      texte: "Il reste un seul geste.",
      cta,
      recompense,
    },
  };
}
