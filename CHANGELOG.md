# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-04-16

### Fixed
- Restore lint dependency compatibility so clean `npm ci` installs succeed on the release branch.
- Refresh Rust networking and database dependencies to newer stable releases for a more reliable Windows package.
- Update the release and CI workflows to current GitHub Action versions used by the project.
- Correct the local release documentation so manual Windows installer builds and GitHub release uploads follow the current process.

### Changed
- Refresh frontend tooling dependencies used to build and validate the desktop app while keeping the lint toolchain on compatible versions.
- Keep release metadata in sync for the `1.0.1` maintenance build.

## [1.0.0] - 2026-04-12

### Added
- **Core Editor**: Monaco editor integration with support for C++, Python, and Java.
- **Compiler Integration**: Local compilation and execution capabilities with standard streams handling.
- **Dashboard**: Read-only integration with competitive programming platforms (Codeforces, HackerRank, LeetCode) via WebView auth system.
- **Test Case Management**: Add, run, and manage custom test cases.
- **Snippets**: Local snippet management and insertion tools.
- **Complexity Analysis**: Static, recurrence, and empirical runtime complexity analysis natively in Rust and UI.
- **Extensions**: Custom plugin and extension system with settings-based UI for managing them.
- **Themes**: Support for 6 distinct themes and customizable aesthetics.
- **Open-source release configurations**: Readying CP-IDE for the community!
- **Repository automation**: Added CI, Dependabot, and draft release workflows for publish-ready maintenance.
- **Release guardrails**: Added a release consistency checker plus explicit security and release documentation.

### Changed
- Sync versions to `1.0.0`.
- Update placeholder metadata to final project configurations.
- Clarify Windows support, compiler bundling behavior, and contributor verification steps in the docs.
