<div align="center">

# ⚡ CP-IDE

**A desktop IDE built for competitive programmers.**

Built with [Tauri](https://tauri.app) · [React](https://react.dev) · [TypeScript](https://typescriptlang.org) · [Rust](https://rust-lang.org)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](CODE_OF_CONDUCT.md)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

![Windows](https://img.shields.io/badge/Windows-0078D6?style=flat&logo=windows&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-000000?style=flat&logo=rust&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)

</div>

---

## What is CP-IDE?

CP-IDE is a lightweight, purpose-built desktop IDE for competitive programming. It combines a fast code editor, integrated compilers, and real-time platform tracking into a single window — no browser tabs, no context switching.

### Key Features

- **🖥️ Monaco Editor** — VS Code's editor engine with syntax highlighting, autocomplete, and keybindings
- **⚙️ Bundled Compilers** — C++, Python, and Java compilation with debug (`-g`) and judge (`-O2`) modes
- **📊 Platform Dashboard** — Track your Codeforces, LeetCode, and HackerRank profiles in one place
- **🧪 Test Cases Panel** — Run multiple test cases with expected vs actual output diffing
- **🔐 WebView Login** — Sign in to platform integrations safely
- **💾 Smart Caching** — SQLite cache to avoid API rate limits
- **🎨 Custom Themes** — 6 distinct themes with appearance configurations
- **📦 Extension System** — Build your own community plugins
- **🧠 Complexity Analysis** — Live heuristic and empirical complexity curves
- **✂️ Snippet Library** — Fast template management

---

## ⬇️ Download

Download the latest version of CP-IDE from the [GitHub Releases](https://github.com/imunderthetree/CP-IDE/releases) page.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   React Frontend                │
│  ┌──────────┐ ┌───────────┐ ┌────────────────┐  │
│  │  Editor   │ │ Dashboard │ │   Settings     │  │
│  │ Plugins/UI│ │ 3 Cards   │ │   Accounts     │  │
│  └──────────┘ └───────────┘ └────────────────┘  │
│                      │ invoke()                  │
├──────────────────────┼──────────────────────────┤
│                 Rust Backend                     │
│  ┌──────────┐ ┌───────────┐ ┌────────────────┐  │
│  │ Compiler │ │ Platform  │ │   Auth         │  │
│  │ C++/Py/J │ │ CF/LC/HR  │ │   WebView      │  │
│  └──────────┘ └───────────┘ └────────────────┘  │
│                      │                           │
│              ┌───────┴────────┐                  │
│              │  SQLite Cache  │                  │
│              │  + Keyring     │                  │
│              └────────────────┘                  │
└─────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Tauri v2](https://tauri.app) — Rust + WebView2 |
| **Frontend** | React 19 + TypeScript |
| **Editor** | Monaco Editor (via `@monaco-editor/react`) |
| **Charts** | Recharts |
| **Backend** | Rust (reqwest, serde, tokio, rusqlite) |
| **Credentials** | Windows Credential Manager via `keyring` |
| **Cache** | SQLite (bundled via `rusqlite`) |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Rust** ≥ 1.70 (install via [rustup](https://rustup.rs))
- **Windows 10/11** with WebView2 runtime (pre-installed on modern Windows)

### Setup

```bash
# Clone the repo
git clone https://github.com/imunderthetree/CP-IDE.git
cd CP-IDE

# Install frontend dependencies
npm install

# Run in development mode (compiles Rust + starts Vite dev server)
npm run tauri dev
```

### Build for Production

```bash
npm run tauri build
```

---

## Project Structure

```
cpide/
├── src/                          # React frontend
│   ├── App.tsx                   # Main app shell + routing
│   ├── context/                  # React contexts (Editor, Extensions)
│   ├── features/                 
│   │   ├── editor/               # Monaco editor + terminal + test cases
│   │   ├── dashboard/            # Platform cards + charts
│   │   ├── settings/             # Settings & Appearance
│   │   ├── snippets/             # Snippet library
│   │   └── complexity/           # Complexity analysis panel
│   └── lib/
│       ├── tauriClient.ts        # Typed IPC wrappers
│       ├── pluginApi.ts          # Extension API
│       └── themes.ts             # Appearance configurations
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── lib.rs                # Command registration
│   │   └── commands/
│   │       ├── compiler.rs       # C++/Python/Java compilation
│   │       ├── auth.rs           # WebView login + keyring
│   │       ├── codeforces.rs     # CF API integration
│   │       ├── leetcode.rs       # LC GraphQL integration
│   │       ├── hackerrank.rs     # HR REST API integration
│   │       ├── snippets.rs       # Local snippet database
│   │       └── cache.rs          # SQLite caching layer
│   └── Cargo.toml
└── package.json
```

---

## Platform Integrations

| Platform | Auth Method | Data Fetched |
|----------|------------|-------------|
| **Codeforces** | Handle (public API) | Rating, contests, submissions, tags, heatmap |
| **LeetCode** | WebView login (session cookie) | Rating, difficulty breakdown, tags, calendar |
| **HackerRank** | WebView login (session cookie) | Badges, submission history, ELO scores |

---

## Roadmap

- [x] **v0.1** — Tauri skeleton, Monaco editor, local compilation
- [x] **v0.2** — Dashboard + Codeforces integration
- [x] **v0.3** — Test cases panel + diff viewer
- [x] **v0.4** — LeetCode + HackerRank + WebView login + Settings
- [x] **v0.5** — Snippets Library
- [x] **v0.6** — Complexity Analysis system
- [x] **v0.7** — Extension System & Plugins
- [x] **v1.0** — Initial open source release

## Future Plans
- Competitive Companion browser extension integration
- Stress testing & automated random case generation
- Contest mode

---

## Contributing

This project is under active development. Contributions are welcome!
Please review our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md).

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <sub>Built with ❤️ for the competitive programming community</sub>
</div>
