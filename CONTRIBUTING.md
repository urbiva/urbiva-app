# Contributing to urbiva-app

Thank you for helping build Urbiva. This guide covers how we work in this repository.

## Branches

- `main` is always releasable and protected by review and CI.
- Create short-lived branches from `main`:
  - `feat/<topic>` for features
  - `fix/<topic>` for bug fixes
  - `docs/<topic>` for documentation
  - `chore/<topic>` for tooling and maintenance
- Open a pull request into `main`. Do not push directly to `main` and never force-push shared branches.

## Local checks

Run the same checks as CI before you open a pull request:

```bash
npm install
npm run typecheck
npm test
npm run build
```

`npm run verify` runs all three in sequence.

## Commits

- Write the subject in the imperative mood, at most 72 characters (for example `Add wheelchair penalty for unknown segments`).
- Explain the why in the body when it is not obvious.
- Keep one logical change per commit.

## Product rules

- The routing engine is the source of truth for every number on screen. Never hardcode a metric, distance or count.
- Sample data must stay labelled as sample data in the UI.
- AI output is an estimate until a person confirms it. Keep the manual fallback working without an API key.
- Follow the Figma design system v1.0 (tokens, components, Azerbaijani copy). The brand name is written "Urbiva".
- User-facing copy is Azerbaijani; code, comments and documentation are English.

## Secrets and data

- Never commit `.env` files, API keys, tokens or personal data. Use `.env.example` for variable names only.
- Do not add real photos of people or private property to the repository.

## Reviews

Every pull request needs one approving review and a green CI run. Reviewers check behaviour, accessibility (contrast, focus, labels), copy and tests.
