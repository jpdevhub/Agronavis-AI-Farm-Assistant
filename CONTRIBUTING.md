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
Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add crop export to CSV
fix: handle null farm location gracefully
docs: add fastapi setup notes
chore: update torch to 2.4
```

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
