# CP-IDE

Competitive programming desktop IDE built with Tauri, React, TypeScript, and Rust.

[![CI](https://img.shields.io/github/actions/workflow/status/imunderthetree/CP-IDE/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/imunderthetree/CP-IDE/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/imunderthetree/CP-IDE?display_name=tag&style=flat-square&label=Release)](https://github.com/imunderthetree/CP-IDE/releases)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%2F11-0078D4?style=flat-square&logo=windows&logoColor=white)](#platform-support)
[![License](https://img.shields.io/github/license/imunderthetree/CP-IDE?style=flat-square)](LICENSE)

## Why CP-IDE

CP-IDE keeps the core competitive-programming workflow in one desktop app:

- Monaco-based editor for C++, Python, and Java.
- Native compile-and-run flow with judge and debug modes.
- Batch test case execution with expected-output comparisons.
- Complexity analysis tools and charts.
- Dashboard integrations for Codeforces, LeetCode, and HackerRank.
- Local snippets and extension support.

## Platform Support

CP-IDE currently targets Windows 10 and Windows 11. Local release builds produce Windows desktop bundles through Tauri.

## Development

### Prerequisites

- Node.js `20.19+`
- npm `10+`
- Latest stable Rust toolchain
- WebView2 runtime on Windows

### Local Setup

```sh
git clone https://github.com/imunderthetree/CP-IDE.git
cd CP-IDE
npm ci
npm run tauri:dev
```

### Verification

```sh
npm run check
```

This validates linting, frontend build output, release metadata, Rust formatting, and `cargo check`.

## Building a Release

```sh
npm run tauri:build
```

The Windows installer is written to `src-tauri/target/release/bundle/msi/`. Release metadata is kept in sync by `npm run release:check`, and GitHub releases can be drafted manually by uploading the built MSI. The full checklist lives in [RELEASING.md](RELEASING.md).

## Optional Bundled Compilers

During development, CP-IDE can use toolchains on your system `PATH`. For self-contained release builds, place portable toolchains under `src-tauri/compilers/` before running `npm run tauri:build`.

Expected layout:

```text
src-tauri/compilers/
|-- mingw/bin/g++.exe
|-- python/python.exe
`-- jdk/bin/javac.exe
```

Those local toolchains are gitignored so they do not get committed accidentally.

## Repository Docs

- [CHANGELOG.md](CHANGELOG.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- [SECURITY.md](SECURITY.md)
- [RELEASING.md](RELEASING.md)

## License

MIT. See [LICENSE](LICENSE).
