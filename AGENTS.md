# AGENTS.md

Guidance for working in this repo. See [README.md](README.md) for setup/commands and [PRD.md](PRD.md) for the product spec.

## Key facts

- **PostgreSQL, not MySQL.** [PRD.md](PRD.md) specifies MySQL, but this implementation uses PostgreSQL 18. All stored procedures are PL/pgSQL; never write MySQL syntax. DB credentials come from `.env` (see `.env.example`): db `empdata_manager`, role `empdata_app`.
- **ESM/CJS split.** `package.json` has `"type": "module"`. Electron main, services, models are ESM. The preload must stay CommonJS (`electron/preload.cjs`) and migrations/seeders must stay `.cjs` (sequelize-cli/umzug `require()`s them). Do not rename to `.js`.
- **IPC requires plain JSON.** Electron cannot clone Sequelize model instances over IPC (`An object could not be cloned`, screens stuck on "Loading…"). All services return `.toJSON()`/plain objects (see `services/employeeService.js`). Any new handler returning DB rows must do the same.
- **All DB access lives in the main process.** Renderer never touches the DB; it calls `window.api.*` (exposed via `contextBridge` in `electron/preload.cjs`). Adding an IPC channel means touching both `electron/ipc.js` (handler) and `electron/preload.cjs` (bridge) with identical names.
- **Architecture flow:** renderer → `window.api` → IPC → `electron/ipc.js` → `services/` → Sequelize/PostgreSQL.

## Commands

```bash
npm run db:setup     # migrations + seeders + stored procedures (run once after DB create)
npm run db:procs     # re-creates all stored procedures idempotently — run after editing the SQL
npm run build:web    # build React renderer into dist/
npm start            # launch Electron (loads dist/)
npm run dev          # Vite dev server :5173 — then run: VITE_DEV_SERVER_URL=http://localhost:5173 npx electron .
```

Verification (no lint/test runner exists):
- `node scripts/verify-services.js` — end-to-end service check against a live DB
- `SMOKE_TEST=1 npx electron .` — headless IPC smoke test (auto-quits, prints `[smoke] ...`)

## Stored procedures

- Source of truth: `db/procedures/create_stored_procedures.sql` (PL/pgSQL, re-runnable).
- Called via raw `sequelize.query` in `services/storedProcService.js`: functions with `SELECT * FROM "Name"(...)`, procedures with `CALL "Name"(...)`.
- `TransferEmployee` writes to `transfer_log` (created by migration `003`, not in the PRD's original schema).
- Tables use camelCase `"createdAt"`/`"updatedAt"` columns — SQL that references them must quote the identifiers.

## Gotchas

- **Schema permission:** on PostgreSQL 15+, the app role needs `GRANT ALL ON SCHEMA public TO empdata_app;` or migrations fail with `permission denied for schema public`.
- **Declare DECIMAL returns explicitly:** stored proc columns like `salary`/`avg_salary` come back as strings via Sequelize raw queries; the UI handles them with `Number(...)`.
- **Sequelize DECIMAL fields** also arrive as strings from model queries — normalize before display/export.
- Sample Excel files live in `sample-data/`; regenerate with `node scripts/create-sample-excel.js` (gitignored).