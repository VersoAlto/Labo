# Contrat · lot 01 · les deux forfaits

## 1. La demande

Ruben, le 11 novembre 2026 : « L'idée est d'avoir une logique de forfait.
Le forfait de base = simple. Forfait MV = base + pédagogie des Maisons
Vaillantes, le site actuel. » Le pilotage doit pouvoir suivre des patros
qui utilisent MV et d'autres qui n'utilisent l'outil que pour s'organiser.

État des lieux : `../carte-forfaits.md`.

## 2. Ce que le lot construit

En trois étapes, chacune montrable seule.

**A. Le forfait dans la base, et son verrou.**
- Un endroit où vit le forfait de chaque patro : `patronage` ou `mv`.
- Une fonction qui répond « quel est le forfait de mon patro ? ».
- Le refus, par la base, de tout geste du jeu pour un patro `patronage`.
- Tous les patros existants passent en `mv`. Rien ne change pour eux.

**B. L'application en forfait Patronage.**
- Le menu et la barre du téléphone sans les écrans du jeu.
- Les écrans mêlés sans leurs parties de jeu.
- Le mot « enfants » partout où le forfait MV dit « Vaillants ».
- Une mise en route sans les étapes des foyers.

**C. Un patro de démonstration en forfait Patronage.**

## 3. Ce qu'il ne construit pas

- **Le pilotage.** La migration 061 n'est pas dans le dépôt. Le lot rend
  le forfait lisible par une future console, rien de plus.
- **La vitrine.** Elle reste celle de Maisons Vaillantes (décision 9).
- **Le prix, la facturation, le paiement.** Ruben décidera après.
- **Le changement de forfait par le directeur.** Seul Verso Alto le fait.
- **Le renommage des tables.** La table des enfants s'appelle toujours
  `vaillants` dans la base : la règle du mot vaut pour ce qui se lit à
  l'écran et sur le papier, pas pour les noms internes.

## 4. Le périmètre d'écriture

- On écrit sous `v2/` et dans une migration neuve, numérotée **069** ou
  au-delà. Le numéro 061 reste réservé au pilotage.
- On ne touche pas à `mv-app-v11_6.html`, `audit/`, `juridique/`.
- **Aucun commit, aucun envoi, rien d'appliqué à Supabase sans l'accord
  explicite de Ruben.** Le travail se fait sur une branche à part.

## 5. Les règles permanentes

Celles du contrat de pilotage de `mv-app` valent ici. En particulier :
- Une table neuve est fermée par défaut, sans politique d'écriture.
- Une colonne qui décide ne s'écrit que par une fonction qui vérifie le
  droit de l'appelant.
- Une fonction existante se réécrit à partir de sa dernière définition
  dans le dépôt.
- Un test par garde, et son mutant : garde retirée, le test échoue.
- Le miroir de démonstration rend la même forme et les mêmes phrases.
- Vérification en vrai navigateur : 390 px en clair et en sombre, 1280 px.

## 6. Les décisions par défaut

**Le forfait**

1. **Deux valeurs : `patronage` et `mv`.** À l'écran : « Patronage » et
   « Maisons Vaillantes ».
2. **Le forfait ne vit pas dans `patros`.** Le directeur peut écrire toutes
   les colonnes de cette table. Il vit dans une table à part, que seul
   Verso Alto écrit, par une fonction réservée aux administrateurs de la
   plateforme.
3. **Un patro sans ligne de forfait est en `mv`.** C'est ce qui garantit
   que rien ne change pour les patros d'aujourd'hui.
4. **Un patro neuf est fondé avec le forfait que Verso Alto a choisi en
   l'invitant.** À défaut : `mv`, comme aujourd'hui.

**Le verrou**

5. **La base refuse le jeu à un patro `patronage`**, avec une phrase
   claire : « Ce geste appartient au forfait Maisons Vaillantes. » Sont
   concernées les fonctions des foyers, des objectifs, des validations,
   du classement, de la progression, du grand frère et du chemin de
   l'éducateur, ainsi que les règles d'accès direct aux tables `foyers`,
   `objectifs`, `validations`, `foyers_responsables` et
   `droits_valider_tous`. La liste exacte s'établit fonction par fonction
   en ouvrant l'étape A.
6. **Le menu suit le forfait, il ne garde rien.** Une adresse du jeu tapée
   à la main en forfait Patronage montre une page qui dit ce qu'est le
   forfait MV, sans rien charger.

**Changer de forfait**

7. **De Patronage à MV, rien ne se perd.** Les enfants, les familles, les
   séances et les papiers restent. Les foyers se créent à ce moment.
8. **De MV à Patronage, rien ne s'efface.** La progression, les foyers et
   les badges sont gelés et masqués. Un retour en MV les retrouve.

**Ce qui se voit**

9. **La vitrine ne change pas dans ce lot.** Elle s'appelle Maisons
   Vaillantes et présente les Maisons. Voir la question 1.
10. **En forfait Patronage, l'application ne dit jamais « Vaillant ».** Elle
    porte le nom du patro, et le mot « enfants ».
11. **La tranche d'âge reste, sans nom de Maison ni couleur.** Les groupes
    d'une séance se font toujours par âge. La feuille d'appel et le Jour J
    rangent les enfants par tranche d'âge.
12. **L'écran Valider disparaît en forfait Patronage.** L'appel tient déjà
    les présences seul. La barre du téléphone montre Préparer, Jour J et
    l'appel.
13. **La fiche d'un enfant** garde l'identité, la famille, les papiers, la
    santé et les présences. Elle perd les objectifs, le palier et le foyer.
14. **L'espace des parents** garde les séances, les inscriptions et les
    papiers. Il perd les objectifs de l'enfant.
15. **Le chemin de l'éducateur est MV.** En forfait Patronage, la fiche d'un
    éducateur garde son rôle et ses attestations.
16. **La cérémonie, le classement, les foyers, la carte de l'enfant et
    l'espace du grand frère sont MV.**

**La démonstration**

17. **Deux patros fictifs**, un par forfait, choisis à l'entrée de la
    démonstration. Celui du forfait Patronage reprend les mêmes enfants et
    les mêmes séances, sans rien du jeu.

## 7. L'ordre du travail

0. **Une carte ligne à ligne des écrans mêlés.** La carte actuelle les a
   classés sans les lire en entier. Avant d'écrire, lire `fiche.js`,
   `tiroir-fiche.js`, `piloter.js`, `equipe.js`, `vaillants.js`,
   `espaces.js`, `documents.js` et `mise-en-route.js`, et noter chaque
   endroit à retoucher.
1. Étape A, avec son banc et ses mutants.
2. Étape B, écran par écran, vérifiée au navigateur.
3. Étape C.
4. Un audit par une session neuve, sur une seule question : un patro
   `patronage` peut-il, par n'importe quel chemin, lire ou écrire une
   donnée du jeu ?

## 8. Les questions pour Ruben

Chacune a un défaut. Le lot avance sans attendre.

**Q1. Le nom du produit entier.** Avec deux forfaits, il faut un nom
au-dessus des deux. Aujourd'hui tout s'appelle Maisons Vaillantes : la
vitrine, le titre, les courriels, le dossier juridique. Un patro du
forfait Patronage entrerait donc dans un outil qui porte le mot
« Vaillantes », contre ta propre règle.
*Défaut : ne rien renommer dans ce lot. En forfait Patronage,
l'application ne montre que le nom du patro.*

**Q2. « Patronage » comme nom de forfait.** Il est juste, mais il se
confond avec le lieu : « le forfait Patronage du patronage Saint-Jean ».
*Défaut : « Patronage », comme tu l'as proposé.*

**Q3. Le dossier juridique.** Le contrat signé avec chaque patro décrit
ce que l'outil fait de ses données. Un forfait qui en traite moins
demande-t-il une annexe à part ? À faire confirmer par un professionnel.
*Défaut : ne rien changer au dossier dans ce lot, et le noter comme dû.*

**Q4. Le premier patro du forfait Patronage.** En as-tu un en vue ? Son
directeur est le meilleur juge de ce qui manque.
*Défaut : construire sur le patro de démonstration.*

## 9. État et limites, au 11 novembre 2026

### Fait et prouvé : l'étape A

- La migration `069_forfaits.sql` est écrite. Une copie est dans
  `01-forfaits/`. Dans `mv-app`, elle est sur une branche locale
  `forfaits`, **non poussée et non appliquée à Supabase**.
- Elle ne réécrit aucune fonction existante : les gardes sont des
  déclencheurs et des politiques restrictives, posés à côté de l'existant.
- Le banc (`01-forfaits/lot-forfaits.mjs`, socle dans `reserve/banc/`)
  rejoue les 68 migrations sur une base en mémoire, puis :
  - **30 affirmations sur 30 tenues** ;
  - **10 mutants sur 10 tués** : chaque garde retirée fait échouer le test
    qui la surveille.
- Les tests du client passent comme avant : 225 sur 226. Le seul échec
  (`garde-mdp-provisoire.test.js`) échoue aussi sur `main` : il lui manque
  les dépendances installées, sans rapport avec ce lot.

### Trois limites assumées de l'étape A

1. **Les lectures par fonction ne sont pas masquées.** `progression_vaillants`,
   `classement_foyers` et les espaces par code lisent sans passer par les
   politiques. Un patro Patronage n'a aucune donnée de jeu à y lire, sauf
   s'il revient du forfait MV. Ce cas est à fermer avant de proposer ce
   retour à un vrai patro (décision 8).
2. **On peut encore retirer ce qui existe.** Retirer une validation ou un
   foyer reste possible par les fonctions prévues pour cela. Le geler
   aurait bloqué les purges et l'effacement d'un enfant, qui passent par
   les mêmes tables. L'écran ne le proposera pas.
3. **Le forfait d'une invitation se règle après l'avoir créée**, par une
   fonction à part. L'écran de la plateforme n'a pas encore ce réglage.

### Deux découvertes à part

- **La migration 055 ne se rejoue pas sur une base neuve.** Elle change le
  type de retour de `sante_reperes()` sans la retirer d'abord, ce que
  Postgres refuse. En production cela a pu passer selon l'histoire de la
  base. À regarder avant de fonder un environnement de test ou de secours.
- **La migration 061 (pilotage) est absente du dépôt**, et il n'y a qu'une
  branche, `main`.

### Reste à faire

- Étape 0 : la carte ligne à ligne des écrans mêlés.
- Étape B : l'application en forfait Patronage.
- Étape C : le patro de démonstration.
- L'audit par une session neuve.
