# Brief · audit du lot « suivi des patros »

*À donner tel quel à une session neuve, ouverte sur `VersoAlto/mv-app`,
branche `suivi`, et `VersoAlto/Labo`, branche `main`. Rédigé le
18 novembre 2026 par la session qui a écrit le code.*

## Ta mission

La migration `supabase/migrations/070_suivi_des_patros.sql` ajoute une
fonction, `plateforme_suivi()`, qui rend pour chaque patro des chiffres
et un signal (`actif`, `a_relancer`, `pas_demarre`, `en_pause`).
L'écran `v2/src/views/plateforme.js` l'affiche. La base sert plusieurs
patronages et tient des données de mineurs.

Tu cherches, dans cet ordre :

1. **Une fuite** : qui d'autre qu'un administrateur de la plateforme
   peut appeler la fonction, et ce qu'elle rend d'une personne (un nom,
   une adresse, une date qui désigne quelqu'un).
2. **Un signal faux** : un patro vivant dit « à relancer », ou un patro
   à l'arrêt dit « actif ». Cherche les activités oubliées et les dates
   qui trompent (fuseau, date de validation choisie par l'appelant,
   séance planifiée dans le futur).
3. **Un écart entre la démonstration, l'écran et la base.**

## Ce que tu ne dois pas croire

Le contrat (`clients/maisons-vaillantes/lots/02-suivi-des-patros.md`)
dit « 23 sur 23, 11 mutants, 49 contrôles ». C'est l'auteur qui l'a
écrit. Le banc est PGlite, pas Supabase : `auth.users` et
`auth.mfa_factors` y sont des doublures.

## Ce que tu rends

Un rapport, pas des correctifs : fichier, ligne, reproduction, gravité,
et ce que tu as exécuté séparé de ce que tu as lu. **Affiche-le en
entier dans la conversation**, pas dans un fichier.

Le banc : `reserve/banc/` et `clients/maisons-vaillantes/lots/02-suivi/`
dans le Labo.

**Tu ne modifies rien, tu ne pousses rien, tu n'appliques rien à
Supabase.**
