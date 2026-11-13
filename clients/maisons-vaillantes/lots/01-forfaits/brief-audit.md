# Brief · audit du lot « forfaits » de Maisons Vaillantes

*À donner tel quel à une session neuve, ouverte sur `VersoAlto/mv-app`,
branche `forfaits`. Rédigé le 13 novembre 2026 par la session qui a écrit
le code : c'est précisément pour ça qu'elle ne peut pas faire cet audit.*

---

## Ta mission

Maisons Vaillantes sert plusieurs patronages sur une seule base Postgres
(Supabase). Elle tient des données d'enfants mineurs, dont des données de
santé et des convictions religieuses.

La branche `forfaits` ajoute deux forfaits par patro :

- **Patronage** : l'outil pour s'organiser (enfants, familles, séances,
  appel, papiers, équipe) ;
- **Maisons Vaillantes** (`mv`) : le même, plus la pédagogie (foyers,
  objectifs, paliers, classement, cérémonie, grand frère).

Tout tient dans une migration, `supabase/migrations/069_forfaits.sql`, et
dans des retouches d'écran sous `v2/src/`.

Tu cherches trois choses, dans cet ordre :

1. **Une fuite entre patros** que ce lot aurait ouverte. Une fuite ici
   n'est pas un bug : c'est une notification à la CNIL et un patronage
   qui perd la confiance de ses familles.
2. **Une porte utile fermée.** Le forfait Patronage ne doit jamais
   empêcher un geste qui n'est pas du jeu : inscrire, archiver,
   réintégrer, effacer, exporter, purger à l'échéance, changer de saison.
3. **Un contournement du forfait** : un patro en Patronage qui obtient,
   écrit ou défait du jeu.

Le premier coûte le plus cher. Le deuxième est le plus probable.

## Ce que tu ne dois pas croire

Le contrat du lot (`clients/maisons-vaillantes/lots/01-forfaits.md`, dans
le dépôt `VersoAlto/Labo`) et les messages de commit disent « vérifié »,
« 47 affirmations sur 47 », « 18 mutants tués », « aucun écart sur
54 écrans ». **Ces vérifications ont été écrites par l'auteur du code.**
Elles éprouvent ce à quoi il a pensé. Traite chacune comme une hypothèse
à réfuter.

En particulier :

- **Le banc n'est pas Supabase.** C'est Postgres en mémoire (PGlite) avec
  des doublures pour les comptes, les rôles et les droits par défaut.
  Rien de la branche n'a tourné sur une vraie base.
- **`appel_de_l_api()`** suppose que PostgREST pose `request.jwt.claims`
  sur chaque requête, anonyme comprise, et que la tâche de nuit ne l'a
  jamais. Si c'est faux dans un sens, des retraits passent ; dans
  l'autre, la purge de nuit échoue pour tous les patros. Vérifie-le dans
  la documentation de PostgREST et de Supabase, pas dans ce dépôt.
- **`pg_trigger_depth() = 1`** est censé distinguer un retrait direct
  d'une cascade. Cherche un chemin où un retrait légitime arrive au
  premier niveau, ou un retrait de jeu au second.
- **Cinq fonctions de lecture ont été « reprises au caractère près »**
  avec une ligne de garde. Compare chacune à sa dernière définition
  d'avant la 069. Une seule, `classement_foyers`, est éprouvée par le
  banc ; les quatre autres ne le sont pas.
- **Le recensement des fonctions qui touchent au jeu** a été fait par une
  expression régulière sur le texte des migrations. Une fonction écrite
  autrement (SQL dynamique, `execute format`) lui échappe.
- **La démonstration ne prouve rien sur la base.** Elle cache le jeu ;
  elle ne refuse pas les gestes comme la base le fait.

## Le périmètre, à tenir en tête tout entier

- `supabase/migrations/069_forfaits.sql`, ligne à ligne.
- Toutes les fonctions `SECURITY DEFINER` des migrations 001 à 068 qui
  lisent ou écrivent `foyers`, `validations`, `objectifs`,
  `foyers_responsables`, `droits_valider_tous`, ou les colonnes
  `foyer_id`, `est_grand_frere`, `palier`, `total_points`,
  `badges_acquis` de `vaillants`. Prends la **dernière** définition de
  chacune.
- Les fonctions Edge sous `supabase/functions/` : elles agissent avec la
  clé de service et passent au-dessus des politiques.
- `supabase/migrations/055_archiver_un_enfant.sql` : `sante_reperes` y est
  maintenant retirée puis reposée. Vérifie que ses droits sont bien
  rendus, et que rien n'en dépendait.
- Côté écran : `v2/src/forfait.js`, `v2/src/main.js` (la garde des
  routes), `v2/src/views/plateforme.js`, et chaque appel à `jeuOuvert()`.

**La faille que tu cherches n'est probablement pas dans la 069 seule.**
Elle est entre la 069 et une fonction écrite bien avant, qui touche au
jeu par un chemin que les déclencheurs ne voient pas.

## Le modèle de menace, rôle par rôle

| Qui | Ce qu'il tente |
|---|---|
| Directeur d'un patro en Patronage | Appeler à la main les fonctions du jeu ; écrire dans les tables du jeu ; lire ou changer son forfait ; lire celui d'un autre patro |
| Éducateur d'un patro en Patronage | Les mêmes, avec moins de droits |
| Famille connectée, ou entrée par son code | Lire la progression de son enfant ; lire quoi que ce soit d'un autre enfant |
| Grand frère entré par son code, patro passé de MV à Patronage | Valider, dévalider, lire son foyer |
| Directeur d'un patro en MV | Lire ou changer le forfait d'un autre patro ; s'inviter lui-même |
| Compte neuf, sans patro | Fonder un patro sans invitation ; choisir son forfait |
| Anonyme | Lire `forfait_public` pour en tirer autre chose que le forfait |
| Administrateur de la plateforme | Lire, par `plateforme_forfaits`, autre chose qu'un nom, une ville, une date et un forfait |

Et les scénarios de bascule, qui sont les plus fragiles :

- un patro vit en MV, passe en Patronage, puis revient en MV : tout
  revient-il **tel quel** ?
- pendant le passage en Patronage, on archive un enfant, on le
  réintègre, on le met à la corbeille, on le rend, un éducateur quitte
  l'équipe, une famille demande son effacement, la saison change, la
  purge de nuit tourne. Chacun de ces gestes passe-t-il, et laisse-t-il
  le jeu en sommeil cohérent ?

## Ce que tu rends

Un rapport, pas des correctifs. Pour chaque constat :

- ce que tu as trouvé, avec le fichier et la ligne ;
- comment le reproduire (la requête, le rôle) ;
- sa gravité : fuite, porte fermée, contournement, ou simple écart ;
- ce que tu as **vérifié en l'exécutant**, séparé de ce que tu as
  seulement lu.

Dis aussi ce que tu n'as pas pu regarder. Un audit qui ne dit pas ses
limites vaut ceux qu'il remplace.

Le banc est dans `VersoAlto/Labo`, `reserve/banc/` ; celui du lot dans
`clients/maisons-vaillantes/lots/01-forfaits/lot-forfaits.mjs`. Sers-t'en
pour exécuter tes hypothèses, sans te fier à ses affirmations.

**Tu ne modifies rien, tu ne pousses rien, tu n'appliques rien à
Supabase.**
