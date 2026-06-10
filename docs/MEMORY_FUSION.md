# MEMORY_FUSION.md

## Objectif

Ce document explique le fonctionnement de la mémoire avancée de Dunia AI, en particulier la fusion intelligente des souvenirs via `memory/fusion.ts`.

La fonctionnalité permet à Dunia AI de ne pas stocker plusieurs fois les mêmes informations utilisateur. Lorsqu’un nouveau fait est extrait d’une conversation, le système vérifie s’il ressemble à un souvenir déjà présent. Selon le cas, il peut :

* ignorer un doublon exact ;
* fusionner deux souvenirs complémentaires ;
* remplacer une information ancienne par une plus récente ;
* créer un nouveau souvenir si l’information est réellement différente.

Cette version est volontairement **schema-safe** : elle fonctionne sans modifier le schéma Prisma et sans ajouter de champ `status` à la table mémoire.

---

## Fonctionnement général de Advanced Memory

Le système de mémoire avancée repose sur plusieurs étapes :

```text
Conversation utilisateur
        ↓
Extraction sémantique des faits durables
        ↓
Recherche de souvenirs similaires
        ↓
Décision de fusion
        ↓
Création ou mise à jour de la mémoire locale
```

Les faits extraits peuvent concerner :

* les préférences utilisateur ;
* les informations personnelles utiles à long terme ;
* les habitudes ;
* les projets en cours ;
* les contraintes techniques ;
* les choix déjà validés ;
* les informations répétées dans plusieurs conversations.

L’objectif est d’obtenir une mémoire utile, propre et durable, sans accumuler inutilement des doublons.

---

## Fichiers principaux

### `memory/extraction.ts`

Ce fichier est responsable de l’extraction des faits depuis les conversations.

Au lieu de sauvegarder uniquement des messages bruts, Dunia AI tente d’identifier des informations durables, par exemple :

```text
L’utilisateur préfère travailler avec Python.
L’utilisateur utilise Windows.
L’utilisateur veut protéger sa base locale dev.db.
```

Chaque fait extrait est ensuite envoyé au système de fusion avant d’être stocké.

---

### `memory/fusion.ts`

Ce fichier contient la logique principale de consolidation mémoire.

Il applique une stratégie en plusieurs étapes :

1. recevoir un nouveau fait ;
2. rechercher un souvenir existant proche via la recherche sémantique ;
3. comparer le nouveau fait avec le souvenir trouvé ;
4. décider de l’action à effectuer ;
5. créer ou mettre à jour la mémoire.

Les actions possibles sont :

```text
IGNORE   → le fait existe déjà, on ne fait rien.
MERGE    → le fait complète un souvenir existant, on fusionne.
REPLACE  → le nouveau fait remplace une ancienne information.
NEW      → le fait est distinct, on crée une nouvelle mémoire.
```

---

### `memory/store.ts`

Ce fichier gère l’écriture et la mise à jour des souvenirs.

Dans cette version schema-safe :

* `createMemoryItem` crée une nouvelle entrée mémoire ;
* `updateMemoryItem` met à jour un souvenir existant ;
* la fusion utilise la mise à jour directe de l’item existant ;
* aucun champ Prisma supplémentaire n’est requis.

Cette stratégie évite les migrations risquées et protège la base locale `dev.db`.

---

## Stratégie schema-safe

La première idée était d’ajouter un champ `status` dans Prisma :

```text
active
merged
obsolete
```

Ce champ aurait permis de garder l’historique complet des souvenirs fusionnés ou remplacés.

Cependant, cette approche nécessitait une modification du schéma Prisma. Sur le projet actuel, Prisma a demandé un reset de la base SQLite `dev.db` lors de la tentative de migration.

Comme le reset aurait supprimé les données locales, cette option a été abandonnée pour cette phase.

La version actuelle ne modifie donc pas Prisma et fonctionne avec le schéma existant.

---

## Pourquoi le champ `status` n’a pas été conservé

Le champ `status` aurait été utile pour :

* afficher les souvenirs actifs ;
* masquer les souvenirs obsolètes ;
* garder l’historique des fusions ;
* construire plus tard une interface de résolution des conflits.

Mais son ajout dans `prisma/schema.prisma` a provoqué un problème de migration.

Prisma a affiché un avertissement indiquant que la base SQLite `dev.db` devait être réinitialisée :

```text
All data will be lost
```

Cette opération était trop risquée, car `dev.db` contient les données locales du projet.

La décision retenue a donc été :

```text
Ne pas modifier Prisma maintenant.
Ne pas risquer dev.db.
Utiliser une fusion compatible avec le schéma actuel.
```

---

## Pourquoi `prisma migrate dev` demandait un reset

Le projet utilisait principalement :

```bash
pnpm db:push
```

au lieu d’un historique complet de migrations Prisma dans :

```text
prisma/migrations
```

Quand `prisma migrate dev` a été lancé, Prisma a détecté un écart entre :

* le schéma Prisma actuel ;
* la base SQLite déjà existante ;
* l’absence d’historique de migrations ;
* les changements proposés sur certaines tables.

Dans ce cas, Prisma peut proposer de réinitialiser la base pour repartir d’un état propre.

Pour une base locale contenant des données utiles, cette opération ne doit pas être acceptée sans sauvegarde.

Règle retenue :

```text
Si Prisma affiche “All data will be lost”, répondre N.
```

---

## Pourquoi `pnpm db:push` est utilisé localement

`pnpm db:push` synchronise rapidement le schéma Prisma avec la base locale.

C’est pratique en développement local, surtout avec SQLite.

Cependant, `db:push` ne remplace pas une vraie stratégie de migrations versionnées pour un projet en production.

Dans ce projet, il est acceptable temporairement parce que :

* Dunia AI est local-first ;
* la base est SQLite ;
* la priorité est de préserver `dev.db` ;
* les migrations Prisma n’étaient pas encore stabilisées ;
* la fonctionnalité actuelle fonctionne sans modification du schéma.

---

## Limites de la version actuelle

La version schema-safe évite les risques Prisma, mais elle a quelques limites.

### Pas d’historique complet des fusions

Lorsqu’un souvenir est fusionné ou remplacé, l’ancien contenu peut être mis à jour directement.

Cela signifie que le système ne garde pas encore une trace structurée comme :

```text
ancien souvenir → nouveau souvenir
raison de la fusion
date de remplacement
statut obsolete
```

### Pas d’interface de résolution des conflits

L’utilisateur ne peut pas encore valider manuellement une fusion incertaine dans `/memory`.

Cette fonctionnalité devra être ajoutée plus tard.

### Pas de champ `status`

Sans champ `status`, l’interface ne peut pas encore afficher clairement :

```text
active
merged
obsolete
```

---

## Ajouter plus tard un champ `status` sans perte de données

Pour ajouter proprement un champ `status` plus tard, il faudra éviter de relancer directement :

```bash
npx prisma migrate dev
```

sur la base locale principale `dev.db`.

Méthode recommandée :

### Option 1 — Sauvegarder `dev.db`

Avant toute opération de migration :

```powershell
Copy-Item prisma/dev.db prisma/dev.backup.db
```

Puis vérifier que la sauvegarde existe.

### Option 2 — Tester sur une base séparée

Créer une copie de test :

```powershell
Copy-Item prisma/dev.db prisma/dev_test.db
```

Puis configurer temporairement Prisma pour tester la migration sur cette copie.

### Option 3 — Script SQL contrôlé

Pour SQLite, un ajout simple de colonne peut être effectué avec une commande SQL contrôlée :

```sql
ALTER TABLE MemoryItem ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
CREATE INDEX IF NOT EXISTS MemoryItem_status_idx ON MemoryItem(status);
```

Cette option doit être exécutée uniquement après sauvegarde.

### Option 4 — Migration Prisma propre sur environnement neuf

Une autre solution consiste à créer une base vide, générer les migrations Prisma proprement, puis migrer progressivement les données.

Cette approche est plus durable pour une future version stable.

---

## Commandes de vérification

Après modification de la mémoire, toujours lancer :

```bash
npx tsc --noEmit
pnpm test
pnpm lint
```

Résultat attendu :

```text
TypeScript : aucune erreur
Tests : tous les tests passent
Lint : aucune erreur
```

---

## État validé de la phase actuelle

La phase actuelle a été validée avec :

```text
Advanced Memory : OK
Fusion intelligente : OK
Schéma Prisma : non modifié
dev.db : préservé
TypeScript : OK
Tests : OK
Lint : OK
Push GitHub : OK
```

Dernier commit validé :

```text
feat(memory): add schema-safe intelligent memory fusion
```

---

## Prochaine étape recommandée

Avant d’ajouter une interface avancée dans `/memory`, il est recommandé de stabiliser la documentation et de définir clairement la future stratégie Prisma.

Prochaine amélioration possible :

```text
Interface /memory pour visualiser les souvenirs fusionnés, doublons et conflits.
```

Mais cette interface sera réellement complète seulement après l’ajout contrôlé d’un champ comme :

```text
status
mergedFrom
mergeReason
supersededBy
```

Ces champs devront être ajoutés plus tard avec une stratégie de migration sûre.
