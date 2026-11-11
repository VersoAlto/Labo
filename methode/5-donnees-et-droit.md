# 5 · Les données et le droit

But : qu'aucune plateforme du Labo ne mette un client, une famille ou
Verso Alto en faute.

Ce fichier n'est pas un avis juridique. Il dit ce que la méthode impose ;
les points de droit se font confirmer par un professionnel.

## Dès l'entretien

Liste les données de personnes que la plateforme tiendra, et classe-les :
ordinaires, sensibles (santé, convictions religieuses), de mineurs. Moins
on en tient, mieux c'est : une donnée qu'on ne collecte pas ne fuit pas.

## Le cloisonnement entre clients

Une plateforme sert plusieurs structures qui ne doivent jamais se voir.
Les leçons retenues dans Maisons Vaillantes, à appliquer à chaque table et
chaque fonction neuve :

- Une table neuve est fermée par défaut : aucun droit pour le public ni
  pour les comptes connectés, aucune politique d'écriture générale.
- Les colonnes qui décident (rôle, rattachement, partage) ne s'écrivent que
  par une fonction qui vérifie le droit de l'appelant.
- Toute fonction qui reçoit un identifiant le rapproche du droit de celui
  qui l'appelle.
- Ce qui sort vers un tiers est **agrégé par la base, pas par l'écran** :
  jamais une personne nommée.
- La clé de service ne va jamais dans le code livré au navigateur.

## Sur l'appareil

Des données d'enfants gardées sur un téléphone pour travailler sans
réseau : rien sans un geste explicite, tout s'efface à la déconnexion
volontaire, et s'efface seul peu après l'usage.

## Le dossier avant le deuxième client

Héberger les données d'un tiers sans contrat écrit est une infraction en
soi. Maisons Vaillantes tient six pièces (dossier `juridique/` de
`mv-app`), à reprendre comme modèle :

1. Le contrat de sous-traitance, sur les clauses types de la Commission
   européenne : on ne touche pas aux clauses, on remplit les annexes.
2. Le registre des traitements.
3. La politique de signature.
4. L'analyse sur les données de santé et l'hébergement.
5. L'information des familles.
6. Ce qui reste à décider, et qui ne peut l'être que par Ruben.

Règle d'or de l'annexe de sécurité : elle ne décrit que des mécanismes qui
existent dans le code et se vérifient. Promettre ce que le produit ne fait
pas est pire que ne rien promettre.
