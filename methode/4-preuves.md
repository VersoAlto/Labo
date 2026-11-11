# 4 · Les preuves

But : pouvoir dire « c'est fait » sans mentir. Une chose est faite quand
elle a été vue fonctionner, pas quand elle a été écrite.

## Les cinq preuves

1. **Des tests sur la règle du jeu.** La progression, les seuils, le
   classement : des fonctions pures, testées sans réseau. Les calculs se
   font en entiers (0,7 × 10 ne vaut pas 7 en JavaScript).
2. **Un banc sur la base.** Chaque garde de sécurité a son test, et son
   mutant : on retire la garde, le test doit échouer. Un test qui passe
   encore sans la garde ne prouvait rien.
3. **Un mode démonstration fidèle.** Un client fictif, complet et
   crédible, servi sans serveur. Il sert à montrer l'outil et à éprouver
   chaque écran avec des données réalistes plutôt qu'une base vide. Il
   rejoue la vraie règle, mot pour mot.
4. **Un vrai navigateur.** À 390 px en clair et en sombre, et à 1280 px.
   Le parcours entier, pas seulement l'écran modifié.
5. **Un audit par une session neuve.** Voir ci-dessous.

## L'audit ne se fait pas soi-même

Leçon de Maisons Vaillantes (`audit/BRIEF-etancheite-integrale.md`) : les
audits conduits par le modèle qui avait écrit le code étaient ciblés, donc
aveugles à ce qui se joue entre deux morceaux écrits à des moments
différents.

Avant qu'un deuxième client entre sur une plateforme, une session neuve
reçoit un brief d'audit qui dit :
- la mission, et ce que coûte une fuite ;
- **ce qu'elle ne doit pas croire** : toute affirmation « vérifié » déjà
  présente dans le dépôt est une hypothèse à réfuter ;
- le périmètre, à tenir en tête tout entier ;
- le modèle de menace, rôle par rôle.

## Dire où on en est

Dans chaque compte rendu, sépare : ce qui est vérifié et comment, ce qui
est écrit mais pas vérifié, ce qui n'est pas fait. Si un test échoue, on
le dit, avec la sortie.
