# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| latest `main` | Yes |
| older tags | No |

## Reporting a Vulnerability

Do **not** open a public GitHub issue for security vulnerabilities.

Send a report to: **security@YOUR_DOMAIN** (replace with your actual contact)

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fix (optional)

You will receive an acknowledgement within 48 hours and a resolution timeline within 7 days.

## Scope

- Authentication and authorization logic
- SQL injection or RLS bypass in Supabase queries
- JWT handling in `backend/src/middleware/`
- File upload handling in the ML service (`backend/ml-service/main.py`)
- Exposure of environment variables or secrets

## Out of Scope

- Vulnerabilities in third-party dependencies that have no published CVE
- Social engineering
- Physical attacks
