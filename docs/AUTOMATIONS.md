# Automatisations

Dunia AI expose une base simple pour automatiser le travail personnel:

- sauvegarde automatique des conversations par `/api/chat`;
- export automatique via `/api/exports`;
- resume quotidien via `pnpm daily-summary`;
- historique des executions dans `AutomationRun`.

## Compatibilite n8n, Make, Zapier

Les routes HTTP peuvent etre appelees par des outils externes:

- `GET /api/status`
- `GET /api/conversations`
- `POST /api/chat`
- `POST /api/exports`

Les payloads sont JSON et valides par Zod.
