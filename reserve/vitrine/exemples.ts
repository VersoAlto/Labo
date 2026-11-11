import type { Brief } from "./types";

/**
 * Deux briefs d'essai. Tout y est inventé, noms, chiffres et témoignages
 * compris : ils servent à éprouver le moteur, pas à être montrés à un client.
 */

export const BRIEF_VIDE: Brief = {
  nom: "",
  secteur: "artisan",
  public: "grand-public",
  profils: "",
  action: "rdv",
  promesse: "",
  etapes: "",
  ton: "sobre",
  frein: "incomprehension",
  temoignages: "",
  chiffres: "",
  recompense: "",
  contact: "",
};

export const EXEMPLES: { titre: string; brief: Brief }[] = [
  {
    titre: "Collège Saint-Martin",
    brief: {
      nom: "Collège Saint-Martin",
      secteur: "ecole",
      public: "familles",
      profils: "Parent, Futur élève, Enseignant",
      action: "rdv",
      promesse: "Un collège où chaque élève sait où il va.",
      etapes:
        "Accueillir : chaque sixième est confié à un parrain de troisième.\nExiger : des objectifs clairs, revus chaque trimestre avec la famille.\nÉlever : des responsabilités réelles, du foyer à la chorale.",
      ton: "sobre",
      frein: "mefiance",
      temoignages:
        "Une mère de cinquième : Mon fils sait enfin pourquoi il travaille.\nUn ancien élève : On m'a fait confiance avant que je la mérite.",
      chiffres: "240 : élèves, pas un de plus\n1 pour 12 : un adulte référent pour douze élèves",
      recompense: "",
      contact: "accueil@college-saint-martin.example",
    },
  },
  {
    titre: "Menuiserie Aubrac",
    brief: {
      nom: "Menuiserie Aubrac",
      secteur: "artisan",
      public: "grand-public",
      profils: "Particulier, Architecte",
      action: "devis",
      promesse: "Des meubles faits pour durer plus longtemps que vous.",
      etapes:
        "Écouter : une visite chez vous, mètre en main.\nDessiner : un plan à l'échelle, retouché jusqu'à votre accord.\nFabriquer : chêne et noyer du Massif central, assemblés à l'atelier.\nPoser : livré et ajusté sur place.",
      ton: "chaleureux",
      frein: "prix",
      temoignages: "Claire, Rodez : La bibliothèque a déjà survécu à deux déménagements.",
      chiffres: "",
      recompense: "Le plan de votre meuble, dessiné à la main, offert avec le devis",
      contact: "atelier@menuiserie-aubrac.example",
    },
  },
];
