# Journal · Maisons Vaillantes

## 11 novembre 2026

- Carte des deux forfaits, puis contrat du lot 01, sur les réponses de Ruben.
- Étape A faite : migration 069, sur une branche locale de `mv-app`.
  Vérifiée sur le banc : 30 affirmations sur 30, 10 mutants sur 10.
- Accès en écriture à `mv-app` obtenu en fin de journée : la branche
  `forfaits` est poussée (migration 069, puis le socle de l'étape B).
- Socle de l'étape B fait : forfait dans la session, menu, routeur, page
  du forfait, entrée `/demo/patronage`. 234 tests sur 234, vu au navigateur.
- Rien n'est fusionné dans `main`, rien n'est appliqué à Supabase.
- Restent les douze écrans mêlés, l'étape C et l'audit.

## 12 novembre 2026

- Les écrans mêlés sont faits, un commit par groupe d'écrans, sur la
  branche `forfaits` de `mv-app`, poussée.
- Un contrôle au navigateur compare le forfait MV avant et après (aucun
  écart sur 54 écrans) et relève les mots du jeu en forfait Patronage
  (aucun pour les familles ; des faux positifs seulement pour l'équipe).
- Leçon : le premier contrôle ne lisait que le texte visible. Étendu aux
  libellés cachés, aux dialogues et à la recherche, il a trouvé une fuite
  de plus (la recherche proposait encore les écrans du jeu).
- Rien n'est fusionné dans `main`, rien n'est appliqué à Supabase.

## 13 novembre 2026 · le forfait dans la plateforme

- L'écran `/plateforme` choisit et change le forfait d'un patro ;
  `/demo/plateforme` le montre avec des patros fictifs.
- Banc : 35 sur 35, 11 mutants tués. Navigateur : 35 contrôles sur 35.
- Leçon : l'invitation et son forfait doivent naître dans un seul appel.
  En deux appels, un échec du second laisse le défaut, qui ici donnait
  plus que convenu.
- Toujours rien sur une vraie base.
