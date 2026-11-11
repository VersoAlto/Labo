import type {
  Action,
  Brief,
  Diagnostic,
  Frein,
  Mecanique,
  Public,
  Ressort,
  RessortId,
  Secteur,
  Ton,
  UniversId,
} from "./types";

/**
 * Le diagnostic Octalysis, par règles.
 *
 * Aucune IA ici, et c'est voulu : chaque décision doit pouvoir être expliquée
 * au client en une phrase. Les barèmes ci-dessous sont des hypothèses de
 * travail, pas des mesures. Ils sont faits pour être corrigés à mesure que de
 * vrais sites livrent de vrais taux de conversion.
 */

export const NOMS_RESSORTS: Record<RessortId, string> = {
  cd1: "Sens épique",
  cd2: "Accomplissement",
  cd3: "Créativité et choix",
  cd4: "Possession",
  cd5: "Lien social",
  cd6: "Rareté",
  cd7: "Curiosité",
  cd8: "Peur de perdre",
};

type Bareme = Partial<Record<RessortId, number>>;

const PAR_PUBLIC: Record<Public, Bareme> = {
  jeunes: { cd2: 3, cd3: 2, cd4: 2, cd5: 3, cd7: 3 },
  familles: { cd1: 2, cd2: 1, cd5: 3, cd8: 1 },
  decideurs: { cd1: 1, cd2: 3, cd6: 1, cd7: -1, cd8: 2 },
  "grand-public": { cd3: 1, cd4: 2, cd7: 3 },
  communaute: { cd1: 4, cd5: 4 },
};

const PAR_SECTEUR: Record<Secteur, Bareme> = {
  ecole: { cd1: 2, cd2: 2, cd5: 1 },
  artisan: { cd3: 2, cd4: 2, cd7: 1 },
  association: { cd1: 3, cd5: 2 },
  independant: { cd2: 2, cd3: 2 },
  culture: { cd3: 1, cd6: 1, cd7: 3 },
  entreprise: { cd2: 2, cd8: 1 },
};

const PAR_FREIN: Record<Frein, Bareme> = {
  mefiance: { cd5: 3 },
  temps: { cd2: 1, cd3: -1, cd7: -2 },
  incomprehension: { cd3: 3, cd7: 1 },
  prix: { cd4: 2, cd6: 1 },
  indifference: { cd1: 2, cd7: 3 },
};

const PAR_TON: Record<Ton, Bareme> = {
  sobre: { cd1: 1, cd7: -1 },
  chaleureux: { cd5: 1 },
  audacieux: { cd3: 1, cd7: 1 },
};

const PAR_ACTION: Record<Action, Bareme> = {
  rdv: { cd3: 1 },
  inscription: { cd5: 1 },
  devis: { cd2: 1 },
  don: { cd1: 2 },
  achat: { cd4: 2 },
  visite: { cd7: 1 },
};

export const lignes = (texte: string) =>
  texte
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

export const profilsDe = (brief: Brief) =>
  brief.profils
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 4);

const UNIVERS_PAR_SECTEUR: Record<Secteur, UniversId> = {
  ecole: "nocturne",
  artisan: "atelier",
  association: "clairiere",
  independant: "clairiere",
  culture: "nocturne",
  entreprise: "nocturne",
};

function choisirUnivers(brief: Brief): { univers: UniversId; raison: string } {
  let univers = UNIVERS_PAR_SECTEUR[brief.secteur];
  let raison = "Choix par défaut pour ce secteur.";
  if (brief.ton === "chaleureux" && univers === "nocturne") {
    univers = "atelier";
    raison = "Le ton chaleureux écarte la nuit : on passe au papier chaud.";
  } else if (brief.ton === "audacieux" && univers === "clairiere") {
    univers = "nocturne";
    raison = "Le ton audacieux demande plus de contraste que la clairière.";
  }
  return { univers, raison };
}

export function diagnostiquer(brief: Brief): Diagnostic {
  const scores: Record<RessortId, number> = {
    cd1: 3, cd2: 3, cd3: 3, cd4: 3, cd5: 3, cd6: 3, cd7: 3, cd8: 3,
  };
  for (const bareme of [
    PAR_PUBLIC[brief.public],
    PAR_SECTEUR[brief.secteur],
    PAR_FREIN[brief.frein],
    PAR_TON[brief.ton],
    PAR_ACTION[brief.action],
  ]) {
    for (const [id, delta] of Object.entries(bareme)) scores[id as RessortId] += delta;
  }
  const ressorts: Ressort[] = (Object.keys(scores) as RessortId[]).map((id) => ({
    id,
    nom: NOMS_RESSORTS[id],
    score: Math.max(0, Math.min(10, scores[id])),
  }));
  const s = (id: RessortId) => ressorts.find((r) => r.id === id)!.score;

  const nbProfils = profilsDe(brief).length;
  const nbEtapes = lignes(brief.etapes).length;
  const aPreuves = lignes(brief.temoignages).length + lignes(brief.chiffres).length > 0;
  const aRecompense = brief.recompense.trim().length > 0;
  const presse = brief.frein === "temps";

  const parcours = nbEtapes >= 2;
  const epreuve = parcours && !presse && (s("cd3") >= 6 || s("cd7") >= 6);
  const collection =
    aRecompense && !presse && brief.public !== "decideurs" && s("cd4") + s("cd7") >= 11;

  const mecaniques: Mecanique[] = [
    {
      id: "seuil",
      nom: "Le seuil : le visiteur dit qui il est",
      ressorts: ["cd3"],
      retenue: nbProfils >= 2,
      raison:
        nbProfils >= 2
          ? `${nbProfils} profils distincts : le premier geste du visiteur règle le discours qui suit.`
          : "Un seul profil de visiteur : lui demander qui il est serait une question pour rien.",
    },
    {
      id: "parcours",
      nom: "Le parcours : des paliers qu'on franchit",
      ressorts: ["cd2"],
      retenue: parcours,
      raison: parcours
        ? `${nbEtapes} étapes : la descente de la page devient une progression visible.`
        : "Moins de deux étapes fournies : pas de progression à montrer.",
    },
    {
      id: "epreuve",
      nom: "L'épreuve : trois questions, une réponse sur mesure",
      ressorts: ["cd3", "cd7"],
      retenue: epreuve,
      raison: epreuve
        ? "Le visiteur ne sait pas encore ce qui est pour lui : on le lui fait trouver plutôt que de le lui dire."
        : presse
          ? "Visiteur pressé : trois questions de plus lui coûteraient la conversion."
          : !parcours
            ? "L'épreuve oriente vers une étape du parcours, et il n'y a pas de parcours."
            : "Ni le choix ni la curiosité ne dominent chez ce public : l'épreuve serait un détour.",
    },
    {
      id: "collection",
      nom: "La collection : des sceaux cachés dans la page",
      ressorts: ["cd4", "cd7"],
      retenue: collection,
      raison: collection
        ? "Public joueur et récompense réelle à la clé : la quête a un prix, donc un sens."
        : !aRecompense
          ? "Aucune récompense réelle fournie : une quête sans prix est un gadget."
          : presse || brief.public === "decideurs"
            ? "Public qui n'a pas le temps de chercher : la récompense est donnée d'emblée au sommet."
            : "Possession et curiosité trop faibles chez ce public pour justifier une chasse.",
    },
    {
      id: "preuves",
      nom: "Les preuves : chiffres et témoignages",
      ressorts: ["cd5"],
      retenue: aPreuves,
      raison: aPreuves
        ? "Des preuves réelles sont fournies : elles passent avant la demande finale."
        : "Aucune preuve fournie. Le Labo n'en invente pas : la section est retirée.",
    },
    {
      id: "recompense",
      nom: "La récompense au sommet",
      ressorts: ["cd6"],
      retenue: aRecompense,
      raison: aRecompense
        ? collection
          ? "Elle se débloque quand les sceaux sont réunis. Le contact, lui, reste toujours ouvert."
          : "Offerte directement à la prise de contact."
        : "Rien à offrir : pas de fausse rareté, pas de compte à rebours simulé.",
    },
  ];

  const { univers, raison } = choisirUnivers(brief);
  return { ressorts, mecaniques, univers, raisonUnivers: raison };
}
