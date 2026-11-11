# Carte · deux forfaits dans Maisons Vaillantes

Demande de Ruben, le 11 novembre 2026 : une logique de forfait.
- **Forfait de base** : l'outil pour organiser un patro, sans la pédagogie.
- **Forfait MV** : la base, plus la pédagogie des Maisons Vaillantes. C'est
  le site actuel.

Le pilotage doit suivre les deux sortes de patros.

Cette carte dit ce que la demande touche dans `mv-app`. Lecture seule, rien
n'a été modifié. Elle ne propose pas encore de contrat.

**Limite de cette carte.** Le classement des écrans repose sur leurs
en-têtes, sur le menu, et sur un comptage des mots du jeu (foyer, Maison,
palier, badge, objectif, validation, classement) fichier par fichier. Les
écrans n'ont pas été lus ligne à ligne. Ce qui est marqué « à vérifier »
doit l'être avant le contrat.

## 0. En bref

- **La séparation est faisable, et le dépôt y est déjà à moitié prêt.**
  Depuis novembre, les groupes d'une séance se font par âge et par
  fidélité, sans équipe fixe. L'en-tête de `v2/src/groupes-seance.js` le
  dit : « Les foyers restent pour le jeu (points, classement, cérémonie). »
- **Rien dans le dépôt ne connaît de forfait.** Ni table, ni colonne, ni
  fonction. Le mot n'existe que dans les cartes de pilotage, rangé dans
  « plus tard ».
- **Ce n'est pas un interrupteur.** Cinq écrans sont du jeu pur, une
  vingtaine sont de l'organisation pure, et une dizaine mêlent les deux.
  C'est dans ces écrans mêlés qu'est le travail.
- **Le verrou doit être dans la base, pas dans le menu.** Cacher une entrée
  de menu ne ferme rien.

## 1. Les écrans, triés

### Organisation pure (forfait de base, sans retouche attendue)

| Écran | Fichier |
|---|---|
| Préparer (la saison, les séances) | `views/saison.js`, `views/preparer.js` |
| Archives | `views/archives.js` |
| Les familles | `views/familles.js` |
| Les papiers, le classeur des autorisations | `views/papiers.js`, `views/classeur.js` |
| Inscriptions en ligne | `views/inscriptions-en-ligne.js` |
| Importer | `views/importer.js` |
| Bibliothèque, Galerie | `views/bibliotheque.js`, `views/galerie.js` |
| Le patro, Conformité, Sécurité | `views/patro.js`, `views/conformite.js`, `views/securite.js` |
| Connexion, création du patro, mode sans réseau | `views/connexion.js`, `views/creer-patro.js`, `views/horsligne.js` |

Préparer cite les foyers dans ses modèles de séance (« vie de foyer »,
« stands tenus par les foyers ») : c'est du texte, pas de la mécanique.

### Jeu pur (forfait MV seulement)

| Écran | Fichier | Ce qu'il fait |
|---|---|---|
| Valider | `views/valider.js` | Valider les objectifs après la séance |
| Les Foyers | `views/foyers.js` | Composer les foyers, nommer les grands frères |
| Classement | `views/classement.js` | Le classement des foyers |
| Cérémonie | `views/ceremonie.js` | L'appel des Maisons, la remise des badges |
| La carte de l'enfant | `views/carte.js` | Sa progression, ses paliers |
| L'espace du grand frère | `views/espaces.js`, `pin.js` | Valider son foyer sous son code |

« Valider » est l'un des trois gestes de la semaine, sous le pouce sur
téléphone. Sans lui, la barre du bas n'a plus que deux moments.
**À vérifier** : `valider.js` enregistre aussi des présences. Il faut
s'assurer que l'appel suffit à les tenir sans cet écran.

### Écrans mêlés (le vrai travail)

| Écran | Fichier | Ce qui relève du jeu |
|---|---|---|
| La fiche d'un enfant | `views/fiche.js`, `components/tiroir-fiche.js` | Objectifs, palier, foyer, Maison. Le plus imbriqué. |
| Les Vaillants | `views/vaillants.js` | Maison, foyer, points dans la liste |
| Piloter | `views/piloter.js` | Indicateurs de progression et de paliers |
| L'équipe | `views/equipe.js` | Qui répond de quel foyer, le droit de valider |
| Jour J, l'appel, la feuille d'appel | `views/jourj.js`, `views/appel.js`, `feuille-appel.js` | La liste est groupée par foyer. Un groupe « sans foyer » existe déjà. |
| Mes rôles | `views/mes-roles.js` | L'en-tête cite les foyers |
| La venue des familles | `components/venir-familles.js` | Réponses groupées par foyer |
| L'espace des parents | `views/espaces.js` | Les objectifs de l'enfant |
| Documents | `views/documents.js` | Des imprimés liés aux Maisons et aux paliers |
| La mise en route | `mise-en-route.js` | Des étapes « créer les foyers », « confier un foyer » |
| La recherche, le menu | `components/recherche.js`, `components/shell.js` | Des entrées vers les écrans du jeu |
| La vitrine | `views/vitrine.js` | Elle présente les Maisons et s'appelle Maisons Vaillantes |

### Deux cas à part

- **La Maison est aussi une tranche d'âge.** Elle sert à l'organisation
  (groupes par âge), pas seulement au jeu. En forfait de base, la tranche
  d'âge reste utile ; c'est son nom et sa couleur qui relèvent de la
  pédagogie.
- **Le chemin de l'éducateur** (`views/educateur.js` : apprenti, confirmé,
  vaillant). Ni tout à fait jeu des enfants, ni organisation. Sa place est
  une question pour Ruben.

## 2. La base de données

- 43 des 67 migrations citent un foyer, un objectif, un palier ou un badge.
  Le jeu n'est pas dans un coin : il traverse la base.
- **Aucune fonction ne refuse aujourd'hui un geste du jeu selon le patro.**
  Tout patro peut tout faire.
- La carte des maquettes de pilotage a déjà tranché un point
  (`v2/docs/pilotage/carte-maquettes.md`, § 0.4) : le directeur peut écrire
  toutes les colonnes de `patros`. Un forfait décide d'un accès : **il ne
  doit donc pas être une colonne de `patros`**. Il vit ailleurs, et seul
  Verso Alto l'écrit.

## 3. Le mode démonstration

`demo.js` fait 5 230 lignes et joue un patro fictif complet, jeu compris.
Vendre le forfait de base demande de pouvoir le montrer : il faut un
second patro de démonstration, sans foyers ni badges. À chiffrer.

## 4. Le pilotage

Le contrat du premier lot de pilotage (`contrat-pilotage.md`) construit un
étage « fonctionnement » : séances tenues, enfants présents, équipe, usage
de l'outil. Cet étage ne dépend pas du jeu : il vaut pour les deux
forfaits. L'observatoire pédagogique, lui, ne concernera que le forfait MV.

Le pilotage doit donc savoir quel forfait a chaque patro, et ne jamais
compter comme « en retard » un patro de base qui n'a ni foyers ni badges.

## 5. Décisions proposées par défaut

1. Le forfait vit dans une table à part, écrite par Verso Alto seul.
2. Le verrou est dans la base : les fonctions du jeu refusent un patro de
   base, avec une phrase claire. Le menu suit, il ne garde rien.
3. Passer de base à MV ne perd rien : les enfants, les familles et les
   séances restent, les foyers se créent à ce moment.
4. Revenir de MV à base ne détruit rien : la progression est gelée et
   masquée, pas effacée.
5. En forfait de base, la feuille d'appel et le Jour J rangent les enfants
   par tranche d'âge.
6. Un patro existant reste en forfait MV : rien ne change pour lui.

## 6. Questions pour Ruben

1. **Le nom.** Le forfait de base s'appelle « Esprit de Patro ». Est-ce le
   nom du mouvement Esprit de Patronage ? Si oui, l'utiliser engage ta
   relation avec lui.
2. **Le vocabulaire.** En forfait de base, dit-on encore « les Vaillants »,
   ou « les enfants » ?
3. **La vitrine.** Une seule façade pour les deux forfaits, ou deux ?
4. **Le chemin de l'éducateur** : base ou MV ?
5. **L'espace des parents** : que voit une famille en forfait de base ?
6. **Le prix.** Une maquette porte « Forfait Base 24 €/mois ». Est-ce une
   donnée fictive ou ton intention ?
7. **Qui change le forfait d'un patro** : toi seul, ou le directeur peut-il
   le demander depuis l'outil ?
