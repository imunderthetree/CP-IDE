# Bundled Compilers

CP-IDE resolves compiler binaries from this directory at runtime.
During development, it falls back to system PATH if these aren't present.

## Expected Directory Layout

```
compilers/
├── mingw/
│   └── bin/
│       ├── g++.exe          ← MinGW-w64 C++ compiler
│       ├── gcc.exe
│       └── ... (MinGW runtime DLLs)
├── python/
│   ├── python.exe           ← CPython interpreter
│   └── ... (standard library)
└── jdk/
    └── bin/
        ├── javac.exe        ← Java compiler
        ├── java.exe         ← Java runtime
        └── ...
```

## Recommended Versions

| Language | Toolchain            | Version    | Download                                         |
|----------|----------------------|------------|--------------------------------------------------|
| C++      | MinGW-w64 (UCRT)     | 13.x+      | https://github.com/niXman/mingw-builds-binaries   |
| Python   | CPython (embeddable) | 3.11+      | https://www.python.org/downloads/windows/          |
| Java     | Eclipse Temurin JDK  | 17 LTS     | https://adoptium.net/                              |

## Setup Instructions

### For Development (easiest)
Just ensure `g++`, `python`, and `javac`/`java` are on your system PATH.
CP-IDE will auto-detect them.

### For Production Bundling
1. Download the portable/embeddable versions listed above
2. Extract into the corresponding subdirectory under `compilers/`
3. The Tauri build will bundle them as app resources

## Notes
- On Windows, CP-IDE passes `CREATE_NO_WINDOW` (0x08000000) to prevent
  console window flashes when spawning compiler processes.
- Compiler resolution: bundled path → system PATH (fallback).
- Temp files are written to `%TEMP%\cpide_<pid>\` and cleaned up after execution.
