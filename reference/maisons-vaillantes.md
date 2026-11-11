# Référence · Maisons Vaillantes

Dépôt : `VersoAlto/mv-app`. Lu le 11 novembre 2026, en lecture seule, de
façon partielle : le schéma de départ, la règle de progression, les
en-têtes des écrans de jeu, le dossier de pilotage, le brief d'audit et le
sommaire juridique. Ce qui suit ne dit que ce qui a été lu. Tout le reste
est à vérifier dans le dépôt avant de s'appuyer dessus.

## Ce que c'est

Une plateforme pour patronages, faite à la main avec Claude. Une seule
base sert plusieurs patronages cloisonnés. Elle tient des données
d'enfants mineurs, dont des données de santé et des convictions
religieuses.

Ordre de grandeur de la version 2 : 35 écrans, 67 migrations de base de
données, environ 48 000 lignes de code, une douzaine de suites de tests,
un mode démonstration, un mode sans réseau, un dossier juridique en six
pièces.

## Le jeu

| Élément | Ce qu'il est |
|---|---|
| Les quatre Maisons | Corps (6–8 ans), Âme (9–11), Cœur (12–14), Esprit (15–17). Une Maison est une tranche d'âge. |
| Le vaillant | L'enfant. Il a un âge de progression, distinct de son âge réel. |
| Le foyer | Un groupe d'enfants d'une Maison, confié à un grand frère ou à un animateur. |
| Les objectifs | Rangés par âge et par axe, avec des points. Un modèle commun, copié et modifiable par chaque patro. |
| Les paliers | Bronze vers 40 % des objectifs de l'âge, Argent vers 70 %. L'Or, quand tout est validé, donne le badge de la Maison et fait passer à l'âge suivant. |
| La validation | Faite par l'éducateur, ou par le grand frère pour son seul foyer. Retirable par son auteur ou le directeur. |
| Le classement | Celui des foyers, sur la part des objectifs franchis et non sur les points bruts. |
| La cérémonie | Le programme se compose à l'écran comme il s'imprimera. L'appel des Maisons et la remise des badges se remplissent seuls. |
| Les éducateurs | Ils ont leurs propres paliers : apprenti, confirmé, vaillant. |
| Les familles | Un espace à elles, où elles suivent leur enfant et répondent aux inscriptions. |

## La fabrique

- Un contrat écrit par lot, précédé de cartes d'état des lieux.
- Les décisions par défaut dans le contrat ; les questions qui engagent
  Ruben à part.
- La règle du jeu dans un module pur, testé, calculé en entiers.
- Un banc sur la base, avec un mutant par garde de sécurité.
- Un mode démonstration qui rejoue la vraie règle.
- La vérification dans un vrai navigateur, téléphone et ordinateur, clair
  et sombre.
- Un audit d'étanchéité confié à une session neuve, à qui l'on dit de ne
  rien croire des audits précédents.

## Où regarder

| Sujet | Fichier dans `mv-app` |
|---|---|
| Règle de progression | `v2/src/progression.js` |
| Classement des foyers | `v2/src/views/classement.js` |
| Cérémonie | `v2/src/views/ceremonie.js` |
| Mode démonstration | `v2/src/demo.js` |
| Mode sans réseau | `v2/src/horsligne.js` |
| Schéma de départ | `supabase/migrations/001_schema.sql` |
| Contrat d'un lot | `v2/docs/pilotage/contrat-pilotage.md` |
| Brief d'audit | `audit/BRIEF-etancheite-integrale.md` |
| Dossier juridique | `juridique/README.md` |
