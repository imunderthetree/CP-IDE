# Optional Bundled Compilers

CP-IDE can bundle portable compiler toolchains inside the desktop app for release builds.

The repository only tracks this README. Actual toolchains should be placed locally under this folder when you want a self-contained build, and those directories are gitignored on purpose.

## Expected Layout

```text
compilers/
|-- mingw/bin/g++.exe
|-- python/python.exe
`-- jdk/bin/
    |-- javac.exe
    `-- java.exe
```

## How It Works

- During development, CP-IDE falls back to compilers on the system `PATH`.
- During packaged builds, Tauri includes `compilers/` as bundled resources when the folder contains local toolchains.
- If a bundled compiler is present, CP-IDE prefers it over the system installation.

## Recommended Toolchains

- C++: MinGW-w64 (UCRT)
- Python: CPython embeddable package
- Java: Eclipse Temurin JDK 17 LTS or newer
