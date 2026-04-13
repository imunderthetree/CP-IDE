# Releasing CP-IDE

This project is packaged as a Windows desktop application with Tauri.

## 1. Update Release Metadata

Before cutting a release, make sure these files all reflect the same version:

- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`
- `CHANGELOG.md`

## 2. Run the Local Verification Suite

```sh
npm ci
npm run check
```

`npm run check` validates linting, frontend build output, release metadata, Rust formatting, and `cargo check`.

## 3. Prepare Optional Bundled Toolchains

If you want the installer to ship with portable compilers, place them in `src-tauri/compilers/` before building:

- `src-tauri/compilers/mingw/bin/g++.exe`
- `src-tauri/compilers/python/python.exe`
- `src-tauri/compilers/jdk/bin/javac.exe`

Those folders are intentionally gitignored so local release assets do not get committed by accident.

## 4. Build the Windows Installer Locally

```sh
npm run tauri:build
```

The release installer is generated locally at:

```text
src-tauri/target/release/bundle/msi/
```

## 5. Create and Push the Release Tag

Push a version tag that matches the app version:

```sh
git tag v1.0.0
git push origin v1.0.0
```

## 6. Draft the GitHub Release Manually

1. Open your repository's Releases page:
   `https://github.com/imunderthetree/CP-IDE/releases`
2. Click **Draft a new release**.
3. Choose the tag you pushed, for example `v1.0.0`.
4. Set the release title, for example `CP-IDE v1.0.0`.
5. Upload the MSI from `src-tauri/target/release/bundle/msi/`.
6. Copy the matching highlights from `CHANGELOG.md` into the release notes.
7. Add any install notes or known limitations you want at the top.
8. Click **Publish release**.

Your public release page will then live at:

```text
https://github.com/imunderthetree/CP-IDE/releases/tag/v1.0.0
```

The latest release page will always be:

```text
https://github.com/imunderthetree/CP-IDE/releases/latest
```

## 7. Final Release Review

Before publishing the draft release, verify:

- The installer launches correctly on a clean Windows machine.
- The changelog entry matches the shipped version.
- Release notes mention any bundled compiler expectations or known limitations.
