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
  `01-forfaits/`. Dans `mv-app`, elle est sur la branche `forfaits`,
  **poussée, non fusionnée dans `main`, non appliquée à Supabase**.
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

### Fait et vérifié : le socle de l'étape B

Sur la branche `forfaits` de `mv-app`, **poussée**, deux commits.

- `v2/src/forfait.js` : module pur. Le forfait courant, la liste des écrans
  du jeu, la règle du mot (`motEnfants`, `titreEnfants`).
- La session lit le forfait au chargement (`mon_forfait`). Sans réponse du
  serveur, elle retient « mv ».
- Le menu et la barre du téléphone ne proposent plus les écrans du jeu en
  forfait Patronage. « Les Vaillants » y devient « Les enfants », et le
  sous-titre « Maisons Vaillantes » devient « Patronage ».
- Un chemin du jeu ouvert à la main montre la page du forfait
  (`v2/src/views/forfait.js`), sans rien charger.
- La démonstration s'ouvre en forfait Patronage par `/demo/patronage`.
- Tests : 234 sur 234, dont 5 nouveaux (`v2/tests/forfait.test.js`).
- Vu au navigateur, à 1280 px et 390 px : en MV rien ne change ; en
  Patronage, le menu, les onglets et les quatre écrans du jeu répondent
  comme prévu, sans erreur.

### Fait et vérifié : les écrans mêlés (12 novembre 2026)

Demande de Ruben : finir les écrans, et vérifier que les éducateurs et les
parents ne voient rien qui touche à MV ou au mot « vaillant ».

**Ce qui a changé, en forfait Patronage**
- L'espace des familles : ni Maison, ni foyer, ni palier, ni points, ni
  objectifs. La page de connexion par code du patro (`/p/<slug>`) ne nomme
  plus Maisons Vaillantes ni le grand frère, et n'a qu'un bouton.
- La liste des enfants et la fiche : la tranche d'âge à la place de la
  Maison ; plus de foyer, de palier, de points, d'objectifs, de carte ni
  de code de grand frère.
- Piloter : enfants, équipe, séances à venir, fiches provisoires, et les
  enfants par âge.
- L'équipe et la fiche d'un éducateur : l'habilitation reste, le chemin
  apprenti, confirmé, vaillant disparaît.
- Préparer, le Jour J, l'appel, Mes rôles : les groupes par âge, la
  feuille d'appel par tranche d'âge, les modèles et les carrés sans foyer.
- La recherche, la mise en route, Documents, Conformité, Le patro, les
  inscriptions en ligne, l'import, les familles, les feuilles imprimées.
- La démonstration retire les données du jeu au lieu de les cacher, et
  s'ouvre en Patronage côté directeur, éducateur et famille.
- Migration 069 : `forfait_public`, pour qu'un espace ouvert par code
  connaisse le forfait de son patro.

**La preuve** (`01-forfaits/controle-navigateur.cjs`, un vrai navigateur)
- Forfait MV : 54 écrans comparés avant et après, directeur, éducateur et
  famille. **Aucun écart de texte.**
- Forfait Patronage : directeur, éducateur, famille par compte et par
  code, à 1280 px et 390 px. Le contrôle lit le texte, les libellés
  cachés, les dialogues d'inscription et de modification, et la recherche.
  - Familles : **0 mot du jeu.**
  - Éducateur : 3 relevés, tous faux positifs (« le corps » d'une lettre,
    et le marqueur du contrôle lui-même).
  - Directeur : 8 relevés, tous faux positifs (les mêmes, « faire le
    point », et le nom d'une couleur, « Rouge Esprit de Patronage »).
- Tests : 234 sur 234. Banc de la base : 31 affirmations, 10 mutants.

**Ce que ce contrôle ne couvre pas**
1. **Les adresses.** La barre du navigateur dit encore `/vaillants` et
   `/vaillant/…`. Un éducateur le voit. Les renommer touche tous les liens.
2. **Avant la connexion.** Réglé pour l'essentiel le 12 novembre, sur
   décision de Ruben (« mets simplement Patronage ») : la page de connexion
   générale, le code à six chiffres, la création d'un patro et l'onglet du
   navigateur disent « Patronage ». Restent : la vitrine (`/accueil`), qui
   présente toujours Maisons Vaillantes ; le nom de l'application une fois
   installée sur un téléphone (`manifest.webmanifest`, « Vaillantes ») ; et
   l'en-tête « Esprit de Patronage », avec son logo, en haut des pages de
   connexion, qui existait avant ce lot.
3. **Les messages après un geste** n'ont pas tous été déclenchés. Ceux
   repérés à la lecture du code sont corrigés ; il peut en rester.
4. **Les courriels** envoyés par Supabase et le contenu détaillé des PDF
   n'ont pas été relus.
5. **La vraie base.** Tout est vérifié en démonstration et sur le banc.
   La migration 069 n'est pas appliquée.

### Reste à faire

- Les cinq points non couverts ci-dessus.
- Le miroir de démonstration ne refuse pas encore les gestes du jeu comme
  la base le fait : il n'en a simplement plus les données ni les écrans.
- L'audit par une session neuve.

## 10. L'écran de la plateforme, le 13 novembre 2026

Demande de Ruben : « Il faut créer l'organe de pilotage. Un pilotage qui
encadre et "base" et "mv". On reste sur un seul site, qui s'ouvre
différemment. » Accord donné (« Go ») pour la première marche : le
forfait dans l'écran `/plateforme`, qui existait déjà.

### Ce qui est construit

- Deux fonctions à la fin de la migration 069, réservées à la plateforme :
  `inviter_patro` (l'invitation et son forfait dans le même geste) et
  `plateforme_forfaits` (le forfait de chaque invitation ouverte et de
  chaque patro : un nom, une ville, une date, rien d'une personne).
- L'écran : le forfait se choisit à l'invitation, se règle sur une
  invitation ouverte, se change sur un patro fondé après confirmation.
- `/demo/plateforme` : le même écran, avec des patros fictifs.

### Décisions par défaut

18. Le forfait proposé d'abord à l'invitation est « Patronage » : se
    tromper dans ce sens n'ouvre rien de trop.
19. Changer le forfait d'un patro fondé demande une confirmation qui dit
    ce que son équipe verra, et que rien n'est effacé.
20. Sur une base d'avant la 069, l'écran reste celui d'avant.

### Vérifié, et comment

- Banc : 35 affirmations sur 35, 11 mutants tués
  (`lots/01-forfaits/lot-forfaits.mjs`).
- Navigateur : 35 contrôles sur 35 à 1280 px, 390 px clair et sombre
  (`lots/01-forfaits/controle-plateforme.cjs`), en démonstration.
- Tests de `mv-app` : 234 sur 234.
- Non-régression rejouée après ce changement : aucun écart de texte sur
  les 54 écrans du forfait MV ; en forfait Patronage, aucun mot du jeu
  pour les familles, et les mêmes faux positifs qu'avant pour l'équipe
  (3 pour l'éducateur, 8 pour le directeur).

### Pas vérifié

- Rien sur une vraie base : les appels réels de l'écran aux quatre
  fonctions n'ont jamais tourné.
- La garde de `inviter_patro` n'a pas de mutant : `autoriser_acces`,
  qu'elle appelle, refuse déjà un non-administrateur.

### Ce que ce lot ne fait pas

Le suivi du fonctionnement des patros (contrat
`v2/docs/pilotage/contrat-pilotage.md` de `mv-app`). Sa migration 061
n'est pas dans le dépôt.

## 11. Le verrou achevé, le 13 novembre 2026

Accord de Ruben (« Go ») pour trois chantiers : fermer les deux trous
connus du verrou, réparer la migration 055, écrire le brief d'audit.

### Un défaut trouvé en chemin

Dans un patro passé de MV à Patronage, **réintégrer un enfant archivé ou
le rendre depuis la corbeille était refusé** : ces deux gestes reposent
l'enfant dans son foyer d'avant et lui rendent ses validations, ce que le
verrou prenait pour du jeu neuf. C'était contraire à la règle « le jeu ne
ferme jamais une porte utile ». Corrigé, et couvert par deux mutants.

### Décisions par défaut

21. **Ce qui dort ne se défait pas.** En forfait Patronage, retirer une
    validation, un foyer, un responsable ou un droit de valider est
    refusé pour un geste venu de l'API. Un enfant ne sort pas non plus de
    son foyer, sauf en étant archivé.
22. **Deux retraits passent toujours** : la cascade d'un effacement
    (enfant, famille, éducateur, patro) et la tâche de nuit qui réduit
    les fiches archivées à l'échéance.
23. **Trois gestes utiles passent toujours** : archiver, réintégrer dans
    le foyer d'avant, rendre depuis la corbeille.
24. **Cinq lectures du jeu ne rendent plus rien** en forfait Patronage,
    sans erreur : le classement, les objectifs d'un enfant vus par sa
    famille (par compte, par code), l'espace du grand frère et sa feuille
    de validation. Chacune est reprise de sa dernière définition, avec
    une ligne de garde.
25. **Les exports du droit d'accès ne sont pas masqués** (`exporter_patro`,
    `parent_mes_donnees`) : une famille et un directeur ont droit à tout
    ce qui est tenu sur eux, jeu en sommeil compris.
26. **Migration 055** : `sante_reperes` change de type de retour. Elle est
    retirée avant d'être reposée, et ses droits lui sont rendus. La suite
    des migrations se rejoue maintenant sans échec sur une base neuve.

### Vérifié, et comment

- Banc : 47 affirmations sur 47, 18 mutants tués.
- Les 68 migrations se rejouent sur une base neuve, sans échec ni
  retrait forcé.
- Tests de `mv-app` : 234 sur 234.

### Pas vérifié

- Rien sur une vraie base. En particulier, la garde des retraits suppose
  que l'API pose `request.jwt.claims` sur chaque requête et que la tâche
  de nuit ne l'a jamais. C'est le comportement documenté ; il reste à
  constater sur le projet d'essai. S'il était faux, la purge de nuit
  pourrait échouer : **à vérifier avant toute mise en production.**
- Des cinq lectures masquées, seul le classement est éprouvé par le
  banc. Les quatre autres passent par un code ou un compte de famille,
  que le scénario ne monte pas.
- La migration 055 a peut-être déjà été appliquée en production : dans
  ce cas, la corriger ne change rien là-bas, et c'est sans risque.
- L'écran n'a pas changé, donc le contrôle au navigateur n'a pas été
  rejoué.

### Limites qui restent

- Les lectures mêlées (le nom du foyer dans l'espace famille, par
  exemple) partent encore vers le navigateur d'un patro revenu de MV.
  L'écran ne les montre pas.
- `mes_droits_de_valider` et `peut_valider` répondent encore : ce sont
  des oui ou non sur des droits en sommeil.

### L'audit

Le brief est écrit : `lots/01-forfaits/brief-audit.md`. Il se donne tel
quel à une session neuve ouverte sur `mv-app`, branche `forfaits`.
