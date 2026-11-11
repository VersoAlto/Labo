# La réserve

Les pièces éprouvées. Une pièce de la réserve est un point de départ : on
la reprend, on l'adapte, ou on la dépasse. Elle n'est jamais un plafond.

## Ce qu'il y a

### `vitrine/` · le générateur de vitrines

Écrit le 11 novembre 2026 dans le dépôt `verso-alto` (route `/labo`).
Vérifié dans un navigateur sur deux briefs fictifs, pas sur un vrai
client, pas en production.

Un brief en treize champs, un diagnostic par règles sur les huit ressorts,
une partition retouchable, et une page publique générée avec six
mécaniques (seuil, parcours, épreuve, collection, preuves, récompense) et
trois univers visuels. La page tient dans un lien, sans serveur.

À quoi ça sert ici : la façade publique d'une plateforme, pas la
plateforme. Ses limites : textes de gabarit, immersion modeste, barèmes
qui sont des hypothèses.

Les fichiers sont une copie. Ils dépendent de React et des polices du
dépôt `verso-alto` : ils ne tournent pas seuls depuis ce dossier.

### `banc/` · le banc de test des bases

Une base en mémoire qui rejoue les migrations d'un projet Supabase et
permet d'éprouver chaque garde avec son mutant. Voir `banc/README.md`.

## Ce qui manque, et qui pèse le plus

**Un socle commun.** Les comptes, les rôles, le cloisonnement entre
clients, la règle de progression, le mode démonstration : tout cela existe
dans Maisons Vaillantes, écrit pour les patronages. Rien n'en a été
extrait. Tant que ce socle n'existe pas, chaque nouvelle plateforme
repart de loin.

L'extraire est un chantier à part entière, à décider avec Ruben : c'est
lui qui dira si le deuxième client justifie de le faire maintenant.
