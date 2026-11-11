/**
 * Le Labo : du brief client au site gamifié.
 *
 * La chaîne tient en trois objets. Le `Brief` est ce que dit le client, le
 * `Diagnostic` est ce qu'on en déduit, la `Partition` est ce que le moteur
 * joue. Seule la partition atteint le site généré : tout ce qui est visible
 * par le visiteur final y est écrit, donc tout y est retouchable.
 */

export type Secteur =
  | "ecole"
  | "artisan"
  | "association"
  | "independant"
  | "culture"
  | "entreprise";

export type Public = "jeunes" | "familles" | "decideurs" | "grand-public" | "communaute";
export type Action = "rdv" | "inscription" | "devis" | "don" | "achat" | "visite";
export type Ton = "sobre" | "chaleureux" | "audacieux";
export type Frein = "mefiance" | "temps" | "incomprehension" | "prix" | "indifference";
export type UniversId = "atelier" | "nocturne" | "clairiere";

export interface Brief {
  nom: string;
  secteur: Secteur;
  public: Public;
  /** Les profils de visiteurs, séparés par des virgules. */
  profils: string;
  action: Action;
  promesse: string;
  /** Une étape par ligne, « Titre : description ». */
  etapes: string;
  ton: Ton;
  frein: Frein;
  /** Un témoignage par ligne, « Qui : citation ». */
  temoignages: string;
  /** Un chiffre par ligne, « valeur : légende ». */
  chiffres: string;
  /** Ce que le client peut réellement offrir. Vide = pas de quête. */
  recompense: string;
  /** Adresse électronique ou lien de prise de contact. */
  contact: string;
}

export type RessortId = "cd1" | "cd2" | "cd3" | "cd4" | "cd5" | "cd6" | "cd7" | "cd8";

export interface Ressort {
  id: RessortId;
  nom: string;
  score: number;
}

export type MecaniqueId = "seuil" | "parcours" | "epreuve" | "collection" | "preuves" | "recompense";

export interface Mecanique {
  id: MecaniqueId;
  nom: string;
  ressorts: RessortId[];
  retenue: boolean;
  raison: string;
}

export interface Diagnostic {
  ressorts: Ressort[];
  mecaniques: Mecanique[];
  univers: UniversId;
  raisonUnivers: string;
}

export interface Partition {
  v: 1;
  nom: string;
  univers: UniversId;
  contact: string;
  hero: { surtitre: string; titre: string; sous: string };
  seuil: { actif: boolean; question: string; profils: { nom: string; accroche: string }[] };
  parcours: { actif: boolean; titre: string; etapes: { titre: string; texte: string }[] };
  epreuve: { actif: boolean; titre: string; questions: { q: string; options: string[] }[] };
  preuves: {
    actif: boolean;
    titre: string;
    temoignages: { qui: string; quoi: string }[];
    chiffres: { valeur: string; legende: string }[];
  };
  collection: { actif: boolean; nb: number };
  sommet: { titre: string; texte: string; cta: string; recompense: string };
}
