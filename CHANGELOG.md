# Changelog

## v0.2.0 - En cours

### Ajoute
- Interface de gestion memoire locale `/memory`.

## v0.1.0 - Initial stable release

### Ajoute
- Application Next.js 15 avec TypeScript strict.
- Interface moderne responsive.
- 5 agents IA fonctionnels : analyste, architecte, automatisation, redacteur, coach.
- API chat, conversations, memoire, exports et statut IA.
- SQLite avec Prisma.
- Exports Markdown, PDF et JSON.
- Dashboard avec statistiques.
- Mode local/offline avec fallback local.
- Support Ollama, OpenAI, Anthropic et Mistral.
- Script Windows `start-dunia-ai.bat`.
- Dockerfile et docker-compose.
- PWA, drag & drop, voix, synthese vocale et notifications.
- CI GitHub Actions avec lint, tests et build.
- Badge CI dans README.md.

### Valide
- `pnpm install`
- `pnpm prisma generate`
- `pnpm prisma db push`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm dev`
