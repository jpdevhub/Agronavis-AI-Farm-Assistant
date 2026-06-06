# Contributing to AgroNavis

Thank you for your interest in contributing to AgroNavis! This guide will help you get started.

---

## Getting Started

1. Fork the repository and clone your fork.
2. Follow the Quick Start setup steps in the [README.md](README.md) to get your `.env` file and local Supabase instance running.
3. Create a new branch for your feature or bug fix:
   ```bash
   git checkout -b type/short-description
   # Examples: feat/crop-export, fix/auth-token-refresh, docs/api-examples
   ```

---

## How to Contribute

### Reporting Bugs
- Search existing issues before opening a new one.
- Include: steps to reproduce, expected behavior, actual behavior, environment (OS, Node/Python version, browser).

### Requesting Features
- Open a GitHub Discussion or issue with the `enhancement` label.
- Describe the problem you want to solve, not just the solution.

### Submitting Pull Requests
- Keep PRs focused — one logical change per PR.
- Write or update tests for your change (if applicable).
- Ensure all CI checks pass before requesting review.
- Reference the related issue in your PR description (`Closes #123`).

---

## Code Standards

### TypeScript (Frontend)
- Next.js 14 Pages router structure is used.
- Strict mode is enabled — avoid `any` unless absolutely necessary.
- Prefer named exports.
- Use existing patterns (glassmorphism UI, React Hooks) in the codebase for consistency.

### Python (Backend)
- FastAPI is used for all backend endpoints.
- Follow PEP 8 style guidelines.
- Use Pydantic models for request/response typing.
- All endpoints must include correct type annotations and dependency injection for auth.
- ML models (ResNet18) should be instantiated at startup or lazily loaded outside the request handlers.

### Commits
Use [Conventional Commits](https://www.conventionalcommits.org/). Format: `type(optional-scope): description`

**Commit types:**
- `feat` — new feature
- `fix` — bug fix
- `docs` — documentation only
- `style` — code style (whitespace, formatting, missing semicolons)
- `refactor` — code change that doesn't fix a bug or add a feature
- `test` — add or update tests
- `chore` — dependency updates, config changes, build system
- `perf` — performance improvements
- `ci` — CI/CD pipeline changes
- `revert` — revert a previous commit

**Scopes** (optional, but recommended):
- `frontend` — Next.js UI changes
- `backend` — FastAPI endpoints, business logic
- `auth` — authentication/authorization
- `ml` — machine learning model, inference
- `db` — database, Supabase migrations
- `infra` — deployment, Docker, environment setup

**Examples (good):**
```
feat(ml): add ResNet18 confidence threshold filter
fix(auth): handle expired JWT token on refresh
docs: add fastapi local setup steps to README
chore(deps): update torch to 2.4.0
feat(frontend): add crop calendar view
fix(db): correct migration for nullable timestamp
perf(backend): cache model weights on startup
feat!: replace Pages Router with App Router
```

**Examples (bad):**
- `"fixed stuff"` — vague, missing type
- `"WIP"` — not descriptive
- `"feat: updated the crop model and fixed auth bug and added docs"` — multiple unrelated changes
- `"feat(frontend): add feature"` — empty description

**Keep commits single-line** — no multi-line body or footer. One logical change per commit.

---

## Project-Specific Notes

- **Model weights** (`.pth`, `.pt`, `.onnx`) are deliberately ignored by `.gitignore`. Do not commit large binary weights.
- **Secrets / `.env` files** are `.gitignore`d. Never commit real credentials.
- **Supabase migrations** go in `backend/supabase/migrations/` and must be reviewed carefully — they define the schema for both local and production databases.
- **Offline/PWA behavior** — changes to the Next.js PWA manifest or service workers require manual testing on mobile.

---

## Review Process

- At least one maintainer approval is required to merge.
- Maintainers may request changes or close PRs that don't fit the project direction.
- We aim to review PRs within 5 business days.
