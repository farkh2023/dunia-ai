# CLAUDE.md

Ce fichier sert de guide de travail pour les assistants IA qui modifient Dunia AI.

## Commandes

- `pnpm install`: installe les dependances.
- `pnpm db:push`: cree ou met a jour la base SQLite Prisma.
- `pnpm dev`: lance Next.js en developpement.
- `pnpm build`: genere Prisma puis construit l'application.
- `pnpm lint`: verifie le style.
- `pnpm test`: lance Vitest.
- `pnpm daily-summary`: cree un resume quotidien dans `AutomationRun`.

## Conventions

- TypeScript strict partout.
- Validation d'entree avec Zod dans `lib/validation.ts`.
- Acces base uniquement via Prisma ou helpers de `memory/store.ts`.
- Ajouter un agent en creant un fichier dans `agents/`, puis en l'enregistrant dans `agents/index.ts`.
- Les prompts systeme doivent etre explicites, actionnables et en francais.

## Structure Agents

Chaque agent expose:

- `id`
- `name`
- `description`
- `systemPrompt`
- `capabilities`
- `preferredProvider`
- `model`
- `temperature`
- `maxTokens`

## Memoire

Les conversations et messages sont stockes dans SQLite. Les tags sont serialises en JSON pour rester compatibles SQLite simple. Les embeddings sont prevus par extension du modele `MemoryItem`.

## Exports

Les exports sont dans `exports/exporters.ts`. Les formats supportes sont Markdown, PDF et JSON. Les exports incluent date, agent, provider et modele.

## Workflow

1. Lire les modules concernes.
2. Garder les changements scopes.
3. Ajouter ou mettre a jour les tests Vitest.
4. Lancer `pnpm test`, `pnpm lint`, puis `pnpm build` quand les dependances sont installees.
