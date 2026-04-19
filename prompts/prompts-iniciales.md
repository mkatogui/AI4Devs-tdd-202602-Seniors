# Prompts iniciales — generation of `tests-iniciales.test.ts`

## Context

LTI repository (based on `AI4Devs-tdd`) — Express + Prisma + ts-jest backend.
Goal: produce a Jest unit test suite for candidate insertion covering two families — form reception/validation and database persistence — with **Prisma mocked** (no real DB calls).

Deliverable: a single file `backend/src/tests/tests-iniciales.test.ts` runnable via `npm test` from `backend/`.

---

## Main prompt

> See `prompts/initial_prompt.md` for the full prompt.
>
> Summary: You are a senior backend engineer with experience in TypeScript, Node.js, Jest, ts-jest, and Prisma. Generate a Jest unit test suite in TypeScript for the candidate insertion feature. Cover two families (reception/validation and persistence/Prisma). Do not touch the real DB — mock Prisma with `jest.mock` or `jest-mock-extended.mockDeep<PrismaClient>()`. Follow Arrange-Act-Assert, group with `describe`, reset mocks in `beforeEach`. Inspect the repo before writing and declare assumptions.

---

## Codebase inspection

Files reviewed before writing tests:

- `backend/src/routes/candidateRoutes.ts` — `POST /candidates` invokes `addCandidate` from the service **directly** (does not go through the controller).
- `backend/src/presentation/controllers/candidateController.ts` — `addCandidateController(req, res)` exists and returns `201 + { message, data }` or `400 + { message, error }`. It is not wired to the router currently; tested as a unit because it is still exported as part of the public contract.
- `backend/src/application/services/candidateService.ts` — `addCandidate(data)`:
  1. `validateCandidateData(data)`
  2. `new Candidate(data).save()`
  3. iterates `educations` → `new Education(...).save()` with the `candidateId` from step 2
  4. same for `workExperiences`
  5. if `cv` has keys → `new Resume(...).save()`
  6. catches `error.code === 'P2002'` → rethrows `Error('The email already exists in the database')`
- `backend/src/application/validator.ts` — rules: `firstName`/`lastName` 2-100 chars matching `^[a-zA-ZñÑáéíóúÁÉÍÓÚ ]+$`; standard email regex; optional phone `^(6|7|9)\d{8}$`; optional address ≤100; dates as `YYYY-MM-DD`. If `data.id` is present, **all validation is skipped**.
- `backend/src/domain/models/Candidate.ts` — class with `save()` calling `prisma.candidate.create({ data: { firstName, lastName, email, phone, address } })`. **Each model instantiates its own `PrismaClient` at module level.**
- `backend/src/domain/models/Education.ts`, `WorkExperience.ts`, `Resume.ts` — each exposes `save()`/`create()` which calls `prisma.<model>.create({ data })` with the `candidateId`.
- `backend/prisma/schema.prisma` — models: `Candidate`, `Education`, `WorkExperience`, `Resume`.

### Mocking strategy adopted

- `jest.mock('@prisma/client', factory)` with a **factory that shares a single `mockDeep()` instance** across all `new PrismaClient()` calls. This solves the fact that each domain model creates its own client: they all end up pointing at the same mock, and assertions can be made at the `prisma.<model>.create` level.
- The factory also exposes `Prisma.PrismaClientInitializationError` (an empty class extending `Error`) because `Candidate.ts` references it via `instanceof`.
- `mockReset(prismaMock)` in `beforeEach` to clear state and behavior between tests.

---

## Output summary

18 tests generated:

**Family 1 — Reception and validation (10 tests):**
- Controller (2): forwards body to the service and responds 201/data; responds 400 with `error.message` when the service throws.
- Service input validation (8): rejects missing `firstName`/`lastName`/`email`; rejects malformed email; rejects phone outside the regex; rejects malformed `startDate` in education; accepts a valid payload with and without nested data.

**Family 2 — Persistence with Prisma mocked (8 tests):**
- `prisma.candidate.create` is called once with the mapped fields.
- `prisma.education.create` receives the correct `candidateId`.
- `prisma.workExperience.create` receives the correct `candidateId`.
- `prisma.resume.create` receives `candidateId`/`filePath`/`fileType`.
- Nested creators are not invoked when no nested data is provided.
- Returns the entity created by Prisma.
- P2002 → `"The email already exists in the database"`.
- Other Prisma errors are propagated unchanged.

Result: `npm test` from `backend/` runs `52 passed` (also includes the previous 34 tests in `validator.test.ts`).

---

## Manual adjustments made

1. **Removed duplicate `import type { PrismaClient }`.** ts-jest rejects having both `import type` and a value `import` from the same module (`TS2300 Duplicate identifier`). Fix: keep only the value import.
2. **Assumption declared in the file header.** The controller is not wired to the router currently, but it is tested because it is exported and part of the public contract.
3. **Removed leftover `console.log(this)` from `Resume.create()`** in `domain/models/Resume.ts`. It was stray debug code that polluted test output; not part of any contract. Tests now run silently.
4. **`validateCandidateData` is not mocked** — it runs for real, so the service tests also verify that validation is wired (invalid payloads cannot bypass validation).
