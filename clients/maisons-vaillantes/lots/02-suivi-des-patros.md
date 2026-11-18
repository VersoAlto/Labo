# Lot 02 · Le suivi des patros, dans la plateforme

*Contrat écrit le 18 novembre 2026, avant le code. Branche `suivi` de
`VersoAlto/mv-app`, partie de `forfaits` (le lot 01, non fusionné).*

## 1. La demande

Ruben, le 18 novembre : « Je parle de la plate-forme pour suivre les
différents patros, oui. » Puis, sur la proposition qui suit : « Go avec
tes choix. Code ce que tu veux pour que la plate-forme fonctionne. »

Aujourd'hui, l'écran `/plateforme` dit qu'un patro existe et quel est son
forfait. Il ne dit pas s'il vit. Le lot lui donne de quoi savoir qui
démarre, qui s'essouffle, et qui appeler.

## 2. Ce que le lot construit

- **Une fonction de lecture, `plateforme_suivi()`**, réservée aux
  administrateurs de la plateforme. Pour chaque patro, uniquement des
  chiffres et des dates :
  - enfants actifs, taille de l'équipe, familles ouvertes ;
  - séances des 30 derniers jours, dernière séance passée, dernier appel,
    dernière connexion de l'équipe ;
  - étapes de mise en route faites, sur combien ;
  - en forfait MV seulement : foyers, validations des 30 derniers jours ;
  - un **signal**, calculé par la base : `actif`, `a_relancer`,
    `pas_demarre` ou `en_pause`.
- **L'écran `/plateforme` réorganisé autour du suivi** : un bandeau qui
  compte les patros par signal, un filtre, et une carte par patro (ses
  chiffres, son signal, son forfait réglable). Les patros à relancer
  d'abord.
- **La démonstration** (`/demo/plateforme`) montre les quatre signaux.
- **Un banc** et un contrôle au navigateur, à 1280 et 390 px, en clair
  et en sombre.

## 3. Ce qu'il ne construit pas

- **Aucun nom de personne** : ni enfant, ni famille, ni membre de
  l'équipe. Aucune donnée de santé, de sacrement, de papier.
- **Aucune porte pour entrer dans un patro** à la place de son équipe.
  C'est un autre niveau de responsabilité sur des données de mineurs : à
  décider à part, avec un fondement écrit.
- **Pas de notes de Ruben par patro, pas de relances envoyées, pas de
  facturation.** Chacun est un lot à lui (voir § 7).
- **Pas de calendrier des vacances par zone.** Voir la décision 4.

## 4. Le périmètre d'écriture

- `supabase/migrations/070_suivi_des_patros.sql` (nouvelle) ;
- `v2/src/views/plateforme.js`, `v2/src/supabase.js`,
  `v2/src/demo-plateforme.js`, la feuille de style si besoin ;
- le dossier du lot dans le Labo.

Aucune fonction existante n'est réécrite. Aucune table n'est créée.

## 5. Les règles permanentes

- La règle du signal vit à un seul endroit, la base, calculée en
  entiers (des jours). L'écran affiche ce qu'elle rend.
- La fonction vérifie elle-même le droit de l'appelant ; elle n'est
  accordée qu'à `authenticated`, jamais à `anon`.
- Lisible sur téléphone, sans défilement horizontal.
- Rien d'inventé : une date absente s'affiche « jamais », pas zéro.

## 6. Les décisions par défaut

1. **Ce qui compte comme activité** : une séance créée, un appel saisi,
   une validation (en MV), une connexion de l'équipe. La plus récente
   donne la « dernière activité ».
2. **Pas démarré** : aucune séance créée et aucun enfant inscrit. C'est un
   état, pas une alarme : un patro fondé hier est « pas démarré ».
3. **À relancer** : démarré, et plus de **21 jours** sans activité. Trois
   semaines couvrent deux semaines de vacances scolaires et un rythme
   d'une séance par semaine.
4. **En pause** : du 14 juillet au 31 août, un patro sans activité depuis
   plus de 21 jours est « en pause », pas « à relancer ». Les petites
   vacances (deux semaines) tiennent dans le seuil ; un calendrier par
   zone serait plus juste, mais coûte plus qu'il ne rapporte ici.
5. **Actif** : tout le reste.
6. **La fenêtre des chiffres** est de 30 jours glissants, pas le mois
   civil : un 2 du mois ne doit pas faire croire qu'un patro s'est arrêté.
7. **La mise en route** reprend les étapes et les règles de l'écran du
   directeur (`mise-en-route.js`) : identité de l'association, double
   authentification d'un directeur, enfants, équipe (plus d'une
   personne), honorabilité de toute l'équipe, première séance, mot aux
   familles, familles ouvertes. En MV s'y ajoutent les foyers et les
   grands frères : 10 étapes en MV, 8 en Patronage.
8. **Un enfant actif** est un enfant non archivé et non provisoire.
9. **La dernière connexion** est la plus récente de l'équipe du patro :
   une seule date par patro, jamais qui.
10. **L'ordre de l'écran** : à relancer, puis pas démarré, puis actif,
    puis en pause ; à signal égal, le plus longtemps silencieux d'abord.
11. **La fonction prend un jour de référence**, `p_jour`, qui vaut
    aujourd'hui par défaut. Elle sert au banc à éprouver la pause d'été ;
    réservée à l'administrateur, elle n'ouvre rien.
12. **Base d'avant la 070** : l'écran garde la liste des patros et de
    leur forfait, sans le suivi. Une panne de la lecture du suivi
    l'affiche, sans bloquer le reste de l'écran.

## 7. Les questions pour Ruben

- **Des notes à toi par patro** (« appelé le 12, rappeler en janvier ») :
  utile pour suivre, mais c'est une donnée nouvelle à garder. Défaut :
  pas dans ce lot.
- **Relancer depuis l'écran** (un courriel préparé au directeur) : défaut,
  pas dans ce lot ; on voit d'abord si le signal est juste.
- **Le seuil de 21 jours** : à corriger après un trimestre réel.
- **Entrer dans un patro pour l'aider** : défaut, non. Si un jour c'est
  oui, il faut l'accord écrit du patro et une trace de chaque entrée.

## 8. État, au 18 novembre 2026

Branche `suivi` de `mv-app`, poussée, non fusionnée. Rien n'est appliqué
à Supabase.

### Vérifié, et comment

- **Banc du lot** (`02-suivi/lot-suivi.mjs`) : 23 affirmations sur 23 ;
  11 mutants, tous tués par leur affirmation. Ils défont un à un la garde
  de la plateforme, le refus des anonymes, le seuil, sa borne (21 jours
  tout juste reste actif), la pause d'été, le masque du jeu en
  Patronage, l'exclusion des archivés et des provisoires, l'ordre, l'état
  « pas démarré », et ajoutent un prénom ou une clé de trop.
- **Rien d'une personne** : le banc cherche dans la réponse entière les
  prénoms, noms et adresses du scénario, et n'y admet que les clés
  prévues.
- **Le banc des forfaits** se rejoue avec la 070 : 67 sur 67, 29 mutants.
- **Tests de `mv-app`** : 238 sur 238 (quatre nouveaux sur la
  démonstration du suivi).
- **Navigateur** (`02-suivi/controle-suivi.cjs`) : 49 contrôles sur 49, à
  1280 et 390 px, clair et sombre, panne de la lecture simulée (le
  portillon reste utilisable). L'ancien contrôle de la plateforme :
  35 sur 35.
- Captures regardées : lisibles à 390 px dans les deux lumières.

### Corrigé en passant

- Les chiffres du portillon (« invitations ouvertes »…) portaient la
  mauvaise classe et s'affichaient en petit. Ils ont repris leur taille.

### Pas vérifié

- Rien sur une vraie base. En particulier `auth.users.last_sign_in_at` et
  `auth.mfa_factors` sont des doublures dans le banc : leur forme réelle
  est celle de Supabase, à constater.
- Les performances : une ligne par patro, une dizaine de sous-requêtes
  chacune. Sans souci pour quelques dizaines de patros ; à revoir au-delà
  de quelques centaines.
- La justesse du seuil et des signaux face à de vrais patros.
- Un audit par une autre session : `02-suivi/brief-audit.md`.
