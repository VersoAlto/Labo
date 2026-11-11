# 3 · Le lot

But : ne jamais écrire de code sans contrat. Un lot est un morceau de
plateforme qu'on peut construire, vérifier et montrer seul.

C'est la façon de travailler de Maisons Vaillantes (voir dans `mv-app` :
`v2/docs/pilotage/contrat-pilotage.md` et les trois cartes du même dossier).

## Avant le contrat : les cartes

Quand le lot touche à de l'existant, commence par un état des lieux en
lecture seule. Une carte dit ce qui est, avec le fichier et la ligne, et
sépare ce qui est vérifié de ce qui est « à confirmer ». Elle ne propose
rien.

## Le contrat

Un fichier `clients/<nom>/lots/<numéro>-<nom>.md`, dans cet ordre :

1. **La demande**, avec les mots de celui qui demande et la date.
2. **Ce que le lot construit**, en une liste courte.
3. **Ce qu'il ne construit pas**, et ce qu'il attend pour le faire.
4. **Le périmètre d'écriture** : les dossiers qu'on a le droit de toucher,
   et ceux qu'on ne touche jamais.
5. **Les règles permanentes** qui s'appliquent à ce lot (sécurité, style,
   accessibilité, vérification).
6. **Les décisions par défaut**, numérotées. Chacune est prise : le lot se
   construit sans attendre.
7. **Les questions qui engagent Ruben**, à part et à la fin : une relation
   avec un tiers, un coût, un choix juridique. Chacune a un défaut.

## Pendant le lot

- Une décision qui change en route se corrige dans le contrat, pas
  seulement dans le code.
- Aucun envoi en production sans accord explicite de Ruben.
- Une fonction existante ne se réécrit qu'à partir de sa dernière version
  dans le dépôt.

## Ce que tu rends

Le contrat, puis le code, puis les preuves du temps 4, puis une ligne dans
le journal du client.
