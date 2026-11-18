# Rapport d'audit · lot « forfaits »

*Rendu par une session neuve, qui n'a pas écrit le code. Premier passage
le 13 novembre 2026 (commit `0cf4441`), second passage le 15 novembre
(commit `5c2d179`). Consigné ici par la session auteur, en résumé fidèle
des tableaux du rapport ; les scénarios `a1` à `a4` sont restés dans la
conversation de Ruben. Les numéros de ligne renvoient au commit audité.*

## Premier passage

- **Fuite entre patros** : aucune (exécuté, tout le modèle de menace).
- **Porte utile fermée** : aucune sur le banc. **P1** : la purge de nuit
  lancée par l'API échouait pour tous les patros si un seul enfant
  archivé d'un patro Patronage arrivait à échéance.
- **Contournements** :
  - **C1** : chef de foyer écrit par `defaire_repartition` (064:250) ;
  - **C2** : code de grand frère posé ou retiré (`set_pin`,
    `supprimer_pin`) ;
  - **C3** : le jeu en sommeil lu par la famille (`parent_enfants`,
    `get_espace_parent`) et par l'équipe (`progression_vaillants`,
    `mes_droits_de_valider`, `mise_en_route`, `familles_seance`,
    `corbeille_vaillants`, entrée par `login_pin`) ;
  - **C4** : une invitation retombe en « mv » par l'ancien chemin.
- **« Tout revient tel quel » est faux** dans trois cas : C1, C2, E1.
- **Écarts mineurs** :
  - **E1** : un grand frère archivé puis réintégré perd son rôle, sa place
    et son code (aussi en MV) ;
  - **E2** : aucune trace d'un changement de forfait ;
  - **E3** : réinviter une adresse déjà utilisée réussit sans rien faire ;
  - **E4** : l'en-tête de la 069 contredisait son contenu ;
  - **E5** : le commentaire de `plateforme_forfaits` était inexact ;
  - **E6** : `forfait_public` dit le forfait de tout patro dont on a
    l'identifiant (voulu) ;
  - **E7** : sans réponse de `mon_forfait`, l'écran retient « mv » ;
  - **E8** : deux gardes tiennent par construction, pas par preuve ;
  - **E9** : la migration 055 est saine sur la branche.

## Second passage

| Constat | État après les corrections du 13 novembre |
|---|---|
| C1, C2, C4, P1 | fermés (exécuté) |
| C3 | fermé pour la famille et `progression_vaillants` ; ouvert pour quatre lectures de l'équipe et `login_pin` |
| E1 | ouvert, devenu **N2** : en Patronage, le directeur ne peut plus rendre le code |
| E2 | à moitié : la trace s'efface par `purger_journal` (**N1**) |
| E3, E5, E7 | ouverts |
| E4 | fermé |
| E6 | ouvert, voulu |
| E8 | ouvert, élargi ; aucun chemin trouvé en attaquant les exceptions |
| E9 | sain |

Constats neufs : **N1** (trace effaçable par le directeur, et absente à la
fondation), **N2** (ci-dessus), **N3** (une panne dont le message
contient « does not exist » passait pour une base ancienne), **N4** (les
invitations ouvertes au jour de la migration restent en MV, voulu).

Les trois exceptions (« fiche archivée », « retour au foyer d'avant »,
« dans la corbeille ») ont été attaquées exprès : aucune ne se laisse
fabriquer. Les cinq fonctions reprises sont identiques à la garde près.

La limite des colonnes du jeu de `vaillants` est jugée acceptable, si le
contrat d'un patro qui passe de MV à Patronage dit que sa progression
est conservée et reste lisible par son équipe.

Non regardé : la vraie base et sa version de PostgREST ; la production ;
les écrans autres que `/plateforme` ; la concurrence, le temps réel, le
stockage.

## Suite donnée

Voir le contrat du lot, § 13 (décisions 34 à 40).
