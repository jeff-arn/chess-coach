# Commit conventions

This repo uses Conventional Commits 1.0. Every commit on `main` must follow the format.

## Format

```
<type>(<scope>): <short summary>

[optional body]

[optional footer(s)]
```

- **`type`** — one of: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`, `revert`.
- **`scope`** — optional, lowercase, describes the area of the codebase: `engine`, `coach`, `db`, `ui`, `api`, `auth`, `pgn`, `chesscom`, `deps`.
- **`short summary`** — imperative mood, lowercase start, no trailing period, 72 chars max. "add blunder detection" not "Added blunder detection."
- **`body`** — optional. Wrap at 72 chars. Explain *why*, not *what*. Reference issues with `Fixes #N` or `Closes #N`.
- **`footer`** — optional. `BREAKING CHANGE: <description>` for breaking changes. `Co-authored-by: Name <email>` for co-authors.

## Type semantics

| Type | When to use |
|------|-------------|
| `feat` | A new user-visible feature or capability |
| `fix` | A bug fix |
| `docs` | Documentation only — no code change |
| `style` | Formatting, whitespace, semicolons — no logic change |
| `refactor` | Code restructuring with no behavior change |
| `test` | Adding or updating tests |
| `chore` | Tooling, config, dependencies, project scaffolding |
| `perf` | Performance improvement |
| `ci` | CI/CD pipeline changes |
| `build` | Build system or external dependency changes |
| `revert` | Reverts a previous commit |

## Examples

```
feat(engine): add blunder detection using CP_LOSS_THRESHOLDS

fix(coach): fall back to rules-based coach when API key is absent

docs: add repo conventions and rules files

test(engine): add unit tests for classifyMove boundary cases

refactor(db): extract migration runner into separate module

chore(deps): pin better-sqlite3 to 9.6.0
```

## Breaking changes

Breaking changes must appear in the commit footer:

```
feat(db): rename tagFrequency column to weaknessFrequency

BREAKING CHANGE: existing databases must run migration 0003 before upgrade
```

A breaking change also bumps the major version in any versioned API contract.

## What CI enforces

- Commit message format is linted by a CI job (commitlint or equivalent). A non-conforming message fails the PR check.
- **There is no local `commit-msg` git hook.** Do not add one. `core.hooksPath` is set to `.beads/hooks` and is owned by beads. CI is the quality gate for commit message format.

## Commit hygiene

- One logical change per commit. A commit that adds a feature and fixes an unrelated bug is two commits.
- Do not commit commented-out code, debug `console.log` statements, or `TODO` stubs unless they are immediately actionable (with an issue reference).
- Do not commit `.env` files, secrets, or generated artifacts (`node_modules/`, `.next/`, `*.db`).
- Squash fixup commits before merging to `main`. A merge commit is acceptable; a chain of "fix: typo" commits is not.

## When to break a rule

1. Name the rule you are breaking, in a code comment or PR description.
2. Explain why the alternative is worse for this specific case.
3. Be willing to defend it in review.

The `core.hooksPath` rule has no exceptions — beads owns it.
