# Contributing to AgroNavis

Thank you for your interest in contributing. Please read this document before submitting issues or pull requests.

---

## Getting Started

1. Fork the repository and clone your fork.
2. Follow the setup steps in [README.md](README.md).
3. Create a new branch for your change:
   ```bash
   git checkout -b type/short-description
   # Examples: feat/crop-export, fix/auth-token-refresh, docs/api-examples
   ```

---

## How to Contribute

### Reporting Bugs

- Search existing issues before opening a new one.
- Include: steps to reproduce, expected behavior, actual behavior, environment (OS, Node version, browser).

### Requesting Features

- Open a GitHub Discussion or issue with the `enhancement` label.
- Describe the problem you want to solve, not just the solution.

### Submitting Pull Requests

- Keep PRs focused — one logical change per PR.
- Write or update tests for your change.
- Ensure all CI checks pass before requesting review.
- Reference the related issue in your PR description (`Closes #123`).

---

## Code Standards

### TypeScript (frontend & backend)

- Strict mode enabled — no `any` unless unavoidable.
- Prefer named exports.
- Use existing patterns in the codebase for consistency.

### Python (ML service)

- Follow PEP 8.
- Type-annotate function signatures.
- Keep model loading outside request handlers.

### Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add crop export to CSV
fix: handle null farm location gracefully
docs: add ml-service setup notes
chore: update ultralytics to 8.3
```

---

## Project-Specific Notes

- **Model weights** (`.pt`, `.onnx`) are not committed. Do not add them.
- **Secrets / env files** are gitignored. Never commit credentials.
- **Supabase migrations** go in `backend/supabase/migrations/` and must be reviewed carefully — they affect production schema.
- **Offline/PWA behavior** — changes to service workers require manual testing on mobile.

---

## Development Workflow

```bash
# Run all linting
cd frontend && npm run lint
cd backend && npm run build  # catches TypeScript errors

# Run tests
cd backend && npm test
cd frontend && npm test
```

---

## Review Process

- At least one maintainer approval is required to merge.
- Maintainers may request changes or close PRs that don't fit the project direction.
- Response time target: 5 business days.
