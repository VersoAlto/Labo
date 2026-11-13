# Le banc

Une base Postgres en mémoire qui rejoue les migrations d'un projet
Supabase, pour éprouver les droits sans toucher à la vraie base.

Écrit le 11 novembre 2026 pour Maisons Vaillantes. Il rejoue ses 68
migrations sans échec.

## Ce qu'il fait

`socle.mjs` remplace par des doublures minimales ce qui est propre à
Supabase : les comptes (`auth.users`, `auth.uid()`), le stockage, les
tâches de nuit, les rôles de l'API et leurs droits par défaut.

- `monterBase(dossier)` rejoue les migrations dans l'ordre, chacune dans
  une transaction, et rend la base, les échecs et les retraits forcés.
- `enTantQue(base, identifiant, sql)` exécute une requête comme le ferait
  l'API pour un compte connecté. Une requête passée directement à la
  base tient lieu de tâche de nuit.

## S'en servir

```sh
cd reserve/banc && npm install
node monter.mjs /chemin/vers/supabase/migrations
```

Un banc de lot (voir `clients/maisons-vaillantes/lots/01-forfaits/`) joue
un scénario, puis le rejoue sur des bases où l'on a retiré une garde :
chaque mutant doit faire échouer l'affirmation qui le surveille.

## Ses limites

- Ce n'est pas Supabase. Les doublures ne vérifient ni les courriels, ni
  les jetons, ni le stockage réel, ni le temps réel.
- Une fonction dont le type de retour change sans être retirée d'abord est
  retirée d'office, et le banc le signale. C'est une tolérance, pas une
  preuve que la migration passe en production.
