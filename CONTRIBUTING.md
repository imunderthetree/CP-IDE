# Contributing to CP-IDE

Thanks for helping improve CP-IDE.

## Before You Start

- CP-IDE currently targets Windows 10/11.
- Use Node.js `20.19+` and the latest stable Rust toolchain.
- Install local C++, Python, and Java toolchains if you want to verify all run paths during development.

## Local Setup

```sh
git clone https://github.com/imunderthetree/CP-IDE.git
cd CP-IDE
npm ci
npm run tauri:dev
```

## Quality Checks

Run this before opening a pull request:

```sh
npm run check
```

That command covers linting, frontend build verification, release metadata validation, Rust formatting, and `cargo check`.

## Pull Requests

1. Create your branch from `main`.
2. Keep changes focused and update docs when behavior or release steps change.
3. Add tests when you introduce behavior that can be covered automatically.
4. If you touched release metadata, make sure `CHANGELOG.md` still matches the current version.
5. Open the pull request with a short summary of what changed and how you verified it.

## Adding Platform Integrations

1. Identify the platform data you need and how it can be fetched safely.
2. Add the backend command or extension hook needed to retrieve and normalize that data.
3. Surface the result through `src/lib/tauriClient.ts` and the relevant dashboard UI.
4. Document any new credentials, cookies, or rate-limit considerations.
