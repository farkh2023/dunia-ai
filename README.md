# Dunia AI

[![CI](https://github.com/farkh2023/dunia-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/farkh2023/dunia-ai/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000)](https://nextjs.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ed)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

Dunia AI est un assistant IA personnel multi-agents, local-first et extensible. Il centralise discussion, memoire, synthese documentaire, plans d'action, ideation, exports et automatisations dans une application moderne compatible Windows 11.

## Version actuelle

Version stable : `v0.1.0`

Voir lhistorique dans [CHANGELOG.md](./CHANGELOG.md).

## Fonctionnalites

- Chat moderne inspire ChatGPT, Claude et Perplexity.
- 5 agents specialises: Analyste, Architecte, Automatisation, Redacteur, Coach IA.
- Mode offline avec Ollama et fallback cloud OpenAI, Anthropic ou Mistral.
- Memoire persistante SQLite via Prisma: conversations, messages, tags, favoris et recherche.
- Upload drag & drop de documents texte.
- Exports Markdown, PDF et JSON avec date, agent, provider et modele.
- Dashboard statistiques avec Recharts.
- Mode sombre, animations Framer Motion, notifications toast.
- Bonus inclus: PWA, reconnaissance vocale, synthese vocale, architecture automation.

## Captures d'ecran

Placeholders pour GitHub:

- `docs/screenshots/chat.png`
- `docs/screenshots/dashboard.png`
- `docs/screenshots/offline-status.png`

## Installation locale

Prerequis:

- Node.js 22+
- pnpm 9+
- SQLite local via Prisma
- Ollama optionnel pour le mode offline

```bash
cd dunia-ai
pnpm install
copy .env.example .env
pnpm db:push
pnpm dev
```

Application: http://localhost:3000

Sur Windows, vous pouvez aussi lancer:

```bat
start-dunia-ai.bat
```

## Configuration IA

Par defaut, Dunia AI essaie Ollama sur `http://localhost:11434`.
Si Ollama est joignable mais qu'aucun modele n'est installe, Dunia AI bascule en mode `local minimal`: le chat, SQLite et les exports restent testables, avec un message clair expliquant comment installer un modele.

```bash
ollama pull llama3
ollama pull mistral
ollama pull deepseek-coder
ollama pull phi
```

Pour les providers cloud, renseigner `.env`:

```env
OPENAI_API_KEY="..."
ANTHROPIC_API_KEY="..."
MISTRAL_API_KEY="..."
```

## Commandes

```bash
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm db:push
pnpm daily-summary
```

## Qualite automatique

La CI GitHub Actions s'execute sur chaque `push` vers `main` et chaque `pull_request` vers `main`.
Elle installe Node.js 22 et pnpm, restaure le cache pnpm, installe les dependances avec le lockfile, genere le client Prisma, puis lance lint, tests et build.

La CI utilise SQLite local avec `DATABASE_URL="file:./test.db"` et des variables IA vides. Elle ne lance ni Ollama ni le serveur de developpement.

Commandes locales equivalentes:

```bash
copy .env.test .env
pnpm install --frozen-lockfile
pnpm prisma generate
pnpm lint
pnpm test
pnpm build
```

## Docker

```bash
docker compose up --build
```

Services:

- `app`: application Next.js.
- `ollama`: inference locale.
- `sqlite-data`: volume persistant SQLite.

## Architecture

```text
dunia-ai/
  app/          UI Next.js et API routes
  components/   composants UI reutilisables
  lib/          providers IA, Prisma, validation, utilitaires
  agents/       agents specialises extensibles
  memory/       stockage conversations et memoire
  exports/      Markdown, PDF, JSON
  prisma/       schema SQLite
  public/       PWA et assets
  docs/         documentation
  scripts/      automatisations
  tests/        tests Vitest
  docker/       image Docker
```

Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Roadmap

- Embeddings locaux avec recherche semantique.
- Connecteurs calendrier, fichiers et navigateur.
- Automatisations planifiees avec interface dediee.
- Mode desktop Tauri.
- Chiffrement local de la memoire.

## Roadmap v0.2.0

La prochaine version vise à transformer Dunia AI en assistant IA personnel avancé avec mémoire intelligente, automatisation, agents spécialisés, IA locale améliorée, multimodalité et organisation personnelle.

Voir la roadmap détaillée dans [ROADMAP.md](./ROADMAP.md).

## Contribution

Les contributions doivent conserver TypeScript strict, validation Zod, tests Vitest et architecture modulaire. Ajouter un agent implique un fichier dedie dans `agents/` et une entree dans le registre.
