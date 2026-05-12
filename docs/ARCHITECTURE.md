# Architecture Dunia AI

Dunia AI est une application Next.js 15 locale-first. L'interface App Router consomme des API routes qui orchestrent les agents, les providers IA et la memoire SQLite via Prisma.

## Modules

- `agents/`: definition des agents, prompts systeme, capacites, modeles et temperatures.
- `lib/ai.ts`: resolution de provider, detection Ollama, appels OpenAI, Anthropic, Mistral et Ollama.
- `memory/store.ts`: conversations, messages, recherche memoire, statistiques.
- `exports/exporters.ts`: generation Markdown, JSON et PDF.
- `app/api/*`: routes HTTP validees avec Zod.
- `components/`: UI shadcn-style reutilisable.

## Flux Chat

1. L'utilisateur envoie un message et des fichiers optionnels.
2. `/api/chat` valide le payload avec Zod.
3. Le message est sauvegarde en SQLite.
4. Le provider est choisi automatiquement: Ollama si disponible, sinon API cloud configuree.
5. La reponse est sauvegardee puis renvoyee a l'UI.

## Offline

Ollama est detecte via `GET /api/tags`. Les modeles recommandes sont `llama3`, `mistral`, `deepseek-coder` et `phi`.
