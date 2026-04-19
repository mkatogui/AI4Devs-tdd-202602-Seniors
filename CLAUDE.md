# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

Two independent Node packages with their own `package.json` and `node_modules`:

- `backend/` — Express + TypeScript API on port **3010**, Prisma ORM against PostgreSQL.
- `frontend/` — Create React App (TypeScript) on port **3000**, Bootstrap UI.
- Root `package.json` is intentionally minimal; its only role is pointing Prisma CLI invocations at `backend/prisma/schema.prisma` (see `prisma.schema` field). Always run `npm install` inside `backend/` and `frontend/` separately.

## Common commands

All commands are run from the relevant package directory unless noted.

**Backend (`cd backend`)**
- `npm run dev` — ts-node-dev with auto-reload (preferred for development).
- `npm run build` — `tsc` → `dist/`.
- `npm start` — runs the compiled `dist/index.js` (requires `npm run build` first).
- `npm test` — Jest. **No test files exist yet** — this is a TDD exercise repo, so creating the first `*.test.ts` files is part of the work. Run a single test with `npx jest path/to/file.test.ts -t "test name"`.
- `npm run prisma:generate` — regenerate Prisma client after editing `prisma/schema.prisma`.
- `npx prisma migrate dev` — apply migrations (the `prisma/migrations/` folder currently only contains `migration_lock.toml`; the initial migration must be created locally).

**Frontend (`cd frontend`)**
- `npm start` — CRA dev server.
- `npm test` — `jest --config jest.config.js`. **`jest.config.js` does not exist yet** — `npm test` will fail until it is created. Tests are not wired up.

**Database (root)**
- `docker-compose up -d` — starts PostgreSQL using values from root `.env` (`DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`).
- `DATABASE_URL` in `.env` is composed by interpolating those vars. Some shells/tools won't expand `${VAR}` inside a `.env` value — if Prisma fails to connect, hardcode the full URL in `.env` or directly in `schema.prisma`.

## Architecture

### Backend — layered (DDD-flavored)

Request flow: `routes/` → `presentation/controllers/` → `application/services/` → `domain/models/` → Prisma.

- `src/index.ts` — Express bootstrap. Attaches a single `PrismaClient` instance to every request via `req.prisma` middleware, wires `/candidates` routes, registers `POST /upload` directly to the multer handler, configures CORS for `http://localhost:3000`.
- `src/routes/candidateRoutes.ts` — currently bypasses the controller layer and calls `addCandidate` from `application/services/candidateService` directly. `presentation/controllers/candidateController.ts` exists and re-exports `addCandidate` but is **not wired into the router** — be aware when adding endpoints.
- `src/application/services/candidateService.ts` — orchestrates persistence: validates input, instantiates `Candidate`, then iterates `educations`/`workExperiences`/`cv` and saves each child entity individually after the parent. Translates Prisma error code `P2002` into a user-friendly "email already exists" message.
- `src/application/services/fileUploadService.ts` — multer-based `POST /upload`. Writes to `../uploads/` (relative to CWD when the server runs — typically `backend/`, so files land in repo-root `uploads/`). Accepts only `application/pdf` and DOCX; 10 MB limit.
- `src/application/validator.ts` — pure validation functions throwing `Error` on failure. Phone regex is Spain-specific (`^(6|7|9)\d{8}$`); name regex allows Spanish accented characters only. If `data.id` is present, validation is skipped (treated as edit).
- `src/domain/models/` — hand-rolled active-record style classes (`Candidate`, `Education`, `WorkExperience`, `Resume`) that each instantiate their **own** `PrismaClient`. This means tests need to be careful about Prisma client mocking, and in production multiple clients exist. Each model exposes a `save()` that branches on `this.id` to update vs. create.

### Frontend

- `src/index.tsx` imports `./App`. Both `App.tsx` (the unmodified CRA template) and `App.js` (the real router with `RecruiterDashboard` and `AddCandidateForm`) exist. CRA's module resolution prefers `.tsx` over `.js`, so **`App.tsx` is what actually renders** — the routing in `App.js` is dead code unless `App.tsx` is deleted/replaced. Worth flagging if a task touches routing.
- Components are plain JS (`.js`), not TypeScript, despite the project being CRA-TypeScript.
- `src/services/candidateService.js` is the API client layer.

## Conventions and gotchas

- Error messages and code comments mix Spanish and English — match whatever the surrounding file uses rather than normalizing.
- The `Candidate` domain model's constructor reads `data.education` / `data.workExperience` (singular property names), but the API/service layer uses `educations` / `workExperiences` (plural). The service works around this by pushing onto `candidate.education` / `candidate.workExperience` after saving children — preserve both naming conventions when editing.
- Prisma client is instantiated in two places: once per request (in `index.ts` middleware) and once per domain-model file. The service layer uses the model's client, not `req.prisma`.
- `prisma/schema.prisma` declares `binaryTargets = ["native", "debian-openssl-3.0.x"]` for Docker compatibility — don't remove the Debian target.
