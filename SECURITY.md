# Security policy

## Reporting a vulnerability

Please do not open a public issue for security problems.

Report vulnerabilities privately through GitHub: open the **Security** tab of this repository and choose **Report a vulnerability** (private vulnerability reporting). If that option is not available to you, contact a maintainer of the Urbiva organization directly on GitHub.

Include what you found, how to reproduce it and the impact you expect. We will acknowledge the report, investigate and keep you informed until it is resolved.

## Scope

- The Next.js application and the `/api/vision` route handler.
- Handling of uploaded images (validation, re-encoding, metadata removal).
- Handling of the server-side `ANTHROPIC_API_KEY`.

## Practices in this repository

- Secrets are read only on the server and never exposed with `NEXT_PUBLIC_`.
- `.env` files are ignored by Git; `.env.example` lists variable names without values.
- CI runs with read-only repository permissions and no secrets.
- Images are not stored or logged; EXIF and GPS metadata are removed in the browser before upload.

## Supported versions

Only the latest commit on `main` is supported during the MVP phase.
