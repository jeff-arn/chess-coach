# Security rules

Threat model: a Next.js app exposed to the internet. Server-side API routes hold the API key and database. The browser client never touches secrets.

## API key handling — the single most important rule

`ANTHROPIC_API_KEY` is a **server-side secret** only.

- Read it exclusively from `process.env.ANTHROPIC_API_KEY` inside `app/api/` route handlers or Server Actions.
- **Never** prefix it with `NEXT_PUBLIC_`. Any `NEXT_PUBLIC_` variable is compiled into the client bundle and sent to every visitor.
- **Never** log it, include it in error messages, or echo it in API responses.
- **Never** pass it through a client component, a URL parameter, or `localStorage`.
- It must not appear in `git log`, in a `.env` file that is committed, or in any test fixture file.
- `.env` is gitignored. `.env.example` documents the key name with a placeholder value — never a real key.

If you see `NEXT_PUBLIC_ANTHROPIC_API_KEY` anywhere in the codebase, treat it as a critical security bug and fix it immediately.

## Environment variables in general

- `NEXT_PUBLIC_*` = client-visible config only (e.g., the chess.com API base URL). No secrets.
- Server-only env vars (API keys, DB path) are accessed only in server-side code. Next.js will throw a build error if you import a module that reads a non-`NEXT_PUBLIC_` env var from a Client Component — treat that error as a signal, not a nuisance.
- Validate all required env vars at server startup (e.g., in a `lib/env.ts` module that throws with a clear message if a required variable is missing). Fail fast rather than silently degrading.

## Input validation

- **Every API route and Server Action validates its input with zod** before touching the database or calling the LLM.
- Trust no client input. Request bodies, URL params, and headers are all untrusted until parsed and validated.
- Return `400 Bad Request` with a user-safe error message on validation failure. Never include raw zod error details or stack traces in the response body sent to the client.

## SQLite / better-sqlite3

- **No string-interpolated SQL.** Use parameterized statements exclusively (`db.prepare('SELECT * FROM games WHERE id = ?').get(id)`).
- The database file path comes from `CHESS_COACH_DB` env var. Validate it at startup; reject paths that escape the allowed directory.
- Never expose raw database errors to the client. Log them server-side; return a generic error to the browser.

## XSS

- React's JSX escapes by default — keep it that way. Avoid raw HTML injection patterns; use safe React alternatives instead.
- PGN and FEN strings from chess.com are rendered into the board via chess.js, not as raw HTML. Never inject them into `innerHTML`.
- User-supplied text (usernames, game names) is rendered as React text nodes only.
- If a future feature genuinely requires rendering HTML from an external source, sanitize with **DOMPurify** configured with a strict allowlist, document the call site with a comment naming the threat model, and require an explicit review approval.

## Dependencies

- `pnpm audit` runs in CI on every PR. A high-severity advisory blocks merge until addressed (fix, mitigate, or accept-with-justification in the PR).
- The lockfile (`pnpm-lock.yaml`) is committed. It is the source of truth for installed versions.
- Pinned versions in `package.json` — no `^` ranges. Renovate handles bumps with a PR per dependency.
- Before adding a new dependency: check maintenance status, release activity, and download stats. Prefer packages from established maintainers over single-author hobby projects for load-bearing code.

## Secrets scanning

- No secret detection tool is currently wired to the local commit path. **Do not add or modify `core.hooksPath`** — it is owned by beads and must stay `.beads/hooks`. CI is the quality gate.
- If a real key is accidentally committed, rotate it immediately and scrub the git history before pushing.

## Data hygiene

- No PII in server logs beyond what is strictly needed for debugging (user ID is acceptable; email and username should be minimized).
- chess.com game data is stored locally for the user's own review. It is not transmitted to any third party other than the Anthropic API (for coach explanations). Coach prompts must not include data unrelated to the current game analysis.

## When to break a rule

1. Name the rule you are breaking, in a code comment or PR description.
2. Explain why the alternative is worse for this specific case.
3. Be willing to defend it in review.

The API key rule (never `NEXT_PUBLIC_`, never logged) has no exceptions.
