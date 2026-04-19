Here's a prompt you can use with Copilot / Cursor (or any AI-powered IDE) to complete the exercise **"Creación de tests unitarios para LTI"**. It's structured so the assistant has enough context, constraints, and acceptance criteria to produce a solid, review-ready test suite.

---

# Prompt: Unit tests for the "Insert Candidate" feature (LTI ATS)

## Role and context

You are a senior backend engineer with strong experience in **TypeScript, Node.js, Jest, ts-jest and Prisma**. You are pairing with me on the LTI project, an Applicant Tracking System (ATS). The repository is based on `AI4Devs-tdd`, which already has Jest + ts-jest configured. The backend lives in `backend/` and uses Prisma as ORM.

The feature under test is the **insertion of new candidates into the database**. Candidates can arrive from a web form used by HR/hiring managers, but also via API from multiple sources (direct candidate application, automated parsing systems, etc.). Because candidate data is the most valuable asset of an ATS, we want a solid unit test suite that guarantees the system behaves as expected.

## Your task

Generate a **Jest unit test suite in TypeScript** for the candidate insertion functionality. The deliverable is a single file located at:

```
backend/src/tests/tests-iniciales.test.ts
```

Before writing the tests, do the following:

1. Inspect the repository to find the code that handles candidate creation: the route/controller that receives the form data, the service/use-case that orchestrates the insertion, the validation layer, the DTO/model types, and the Prisma calls (e.g. `prisma.candidate.create`, any related tables such as education, work experience, resume, etc.).
2. Identify the exact function signatures, field names, and validation rules currently implemented — do **not invent fields** that don't exist in the codebase. If something is ambiguous, list the assumption explicitly at the top of the test file in a comment.
3. Summarize briefly (in a comment block at the top of the file) what you are going to test and why.

## Scope of the tests

According to the exercise, there are **two main families of tests**, and both MUST be covered with at least one test each:

### Family 1 — Reception and validation of form data
Write tests that verify the layer that receives candidate data (controller/service input validation) behaves correctly. At minimum:

- It accepts a valid candidate payload and returns/forwards the expected shape.
- It rejects payloads with missing required fields (e.g. name, surname/lastname, email).
- It rejects payloads with invalid formats (e.g. malformed email, invalid phone, invalid date of birth).
- It trims/normalizes inputs if the current implementation does so.
- It handles optional nested data (education, work experience, CV) correctly when present and when absent.

### Family 2 — Saving into the database (Prisma)
Write tests that verify the persistence layer correctly calls Prisma and handles its responses. At minimum:

- It calls `prisma.candidate.create` (or the equivalent used in the repo) with the correctly mapped data.
- It creates related records (education / work experience / resume) when provided, using the right relational structure.
- It returns the created entity as expected by the caller.
- It handles and propagates Prisma errors, in particular unique constraint violations (e.g. duplicated email → `P2002`) and generic DB errors, in a way consistent with the current implementation.

> Do NOT hit the real database. **Mock Prisma** using `jest.mock` (manual mock or `jest-mock-extended`'s `mockDeep<PrismaClient>()`). Reference: https://www.prisma.io/blog/testing-series-1-8eRB5p0Y8o#mock-prisma-client

## Technical constraints and best practices

- Use **Jest + ts-jest**; import types from `@jest/globals` if the project uses it, otherwise rely on `@types/jest`.
- Follow the **Arrange – Act – Assert** pattern; each `test`/`it` description must clearly state the behavior under test (e.g. `"rejects a candidate when email is missing"`).
- Group related tests with `describe` blocks: one for "validation / form reception" and one for "database persistence".
- Use `beforeEach` to reset mocks (`jest.clearAllMocks()`); avoid shared mutable state between tests.
- Prefer `toEqual` for object comparison, `toHaveBeenCalledWith` for verifying Prisma calls, and `rejects.toThrow` for error assertions.
- Keep the tests **deterministic, isolated and fast** — no network, no filesystem, no real DB.
- Do not write integration or E2E tests; this file is strictly for **unit tests**.
- Respect the existing code style of the repo (quotes, semicolons, import order).
- If you need small factories/builders for valid candidate payloads, declare them inside the test file at the top.

## Deliverables

Produce exactly two things:

1. **`backend/src/tests/tests-iniciales.test.ts`** — the complete test file, runnable with `npm test` from the `backend` folder. Include only code that compiles against the current project.
2. **`prompts/prompts-iniciales.md`** — a markdown file documenting the prompts used to generate the suite (this prompt plus any iterative follow-ups). Structure it as: *Context → Prompt → Output summary → Manual adjustments made*.

## What to return now

1. First, list the files you inspected in the repo and the key findings (function names, fields, validation rules, Prisma models).
2. Then produce the full content of `backend/src/tests/tests-iniciales.test.ts`.
3. Then produce the full content of `prompts/prompts-iniciales.md`.
4. Finally, give me the exact shell commands to:
   - create the `tests-iniciales` branch,
   - run the tests (`npm test`) and confirm they pass,
   - commit and push, and
   - open the pull request.

Do not modify production code unless strictly necessary to make the unit tests possible (e.g. exporting an already-existing function). If you propose any production change, flag it explicitly and justify it.