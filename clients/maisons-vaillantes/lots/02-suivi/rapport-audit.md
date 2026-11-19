# Rapport d'audit · lot « suivi des patros »

*Rendu le 19 novembre 2026 par une session neuve, qui n'a pas écrit le
code (`mv-app` `suivi` commit `8637854`, Labo `main` commit `5f05dac`).
Consigné ici par la session auteur, en résumé fidèle ; les scénarios
`s1` à `s4` sont restés dans la conversation de Ruben. Les numéros de
ligne renvoient à `070_suivi_des_patros.sql` de ce commit.*

## Verdict

- **Fuite** : aucune hors de la plateforme. Seul un administrateur lit
  le suivi (exécuté pour tous les rôles, la clé de service comprise).
  **F1, faible** : dans un patro où une seule personne se connecte, la
  « dernière connexion de l'équipe » et l'étape « double
  authentification » désignent le directeur, dont l'adresse figure plus
  bas dans le portillon. Dans une équipe de deux, « honorabilité non
  faite » désigne l'autre.
- **Signal faux, dans les deux sens** :
  - **SF1** (grave, probable) : un patro vivant dit « à relancer ».
    `last_sign_in_at` ne bouge pas tant que la session reste ouverte (lu
    dans le code de Supabase Auth) ; la feuille d'appel imprimée, les
    réponses des familles, le déroulé, l'inscription d'un enfant, la
    présence de l'équipe ne comptent pas.
  - **SF2** (grave) : un directeur peut écrire `seances.created_at` dans
    le futur ; le patro est alors « actif » pour toujours.
  - **SF3** : 21 jours ne couvrent pas les petites vacances d'un patro du
    samedi (trois samedis).
  - **SF4** : l'été, un patro mort depuis un an dit « en pause » ; un
    patro arrêté mi-juin est « à relancer » avant le 14 juillet ; tous
    sonnent le 1er septembre.
  - **SF5** : les inscriptions en ligne arrivent provisoires, donc
    « pas démarré » avec 30 enfants ; un patro fondé et abandonné reste
    « pas démarré » sans jamais remonter.
  - **SF6** (faible) : passer en Patronage fait sonner un patro qui ne
    vivait que par les validations.
- **Écarts** :
  - **E1** : la démonstration ne montre jamais « en pause » ; le contrat
    dit qu'elle montre les quatre signaux.
  - **E2** : la base rend les étapes dans l'ordre des clés `jsonb`
    (identité en avant-dernier).
  - **E3** : une date seule recule d'un jour à l'ouest de Greenwich
    (`util.js:66`).
  - **E4** : « enfants » ne compte pas comme l'écran du directeur.
  - **E5** : la double authentification est cochée si un seul directeur
    l'a ; une famille avec compte et code compte pour deux.
  - **E6** : un signal inconnu s'affiche « Actif » et sort des filtres.
  - **E7** : le jour de référence ne borne pas les dates d'activité.
  - Mineur : 0,7 px de débord à 390 px, dans l'en-tête.
- **Hors lot** : la politique `admins_lecture` de `plateforme_admins`
  (037:31) se lit elle-même ; un `select` direct finit en récursion
  infinie. Sans danger aujourd'hui.

## Ce qui tient (exécuté)

Le fuseau de la session ; les validations antidatées ou postdatées (le
suivi lit `valide_le`, posé par le serveur) ; la séance planifiée dans le
futur ; la garde. Le banc de l'auteur se rejoue (23 sur 23, 11 mutants),
les tests aussi (238 sur 238).

## Non regardé

Une vraie base (doublures de `auth.users` et `auth.mfa_factors` ; les
codes de secours de Supabase naissent peut-être « vérifiés ») ; le
calendrier scolaire revérifié ; le contrôle au navigateur de l'auteur ;
les performances ; le contraste du sombre ; les autres écrans.

## Suite donnée

Voir le contrat du lot, § 9.
