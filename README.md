<div align="center">

# ⚡ CP-IDE

**A desktop IDE built for competitive programmers.**

Built with [Tauri](https://tauri.app) · [React](https://react.dev) · [TypeScript](https://typescriptlang.org) · [Rust](https://rust-lang.org)

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
- **🔐 WebView Login** — Sign in to LeetCode & HackerRank via popup browser window (cookies stored securely in Windows Credential Manager)
- **💾 Smart Caching** — Platform data cached in SQLite with 5-minute TTL to avoid API rate limits
- **🎨 Industrial Terminal Aesthetic** — Dark theme inspired by WezTerm and Zed

---

## Screenshots

> Coming soon — the app is under active development.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   React Frontend                │
│  ┌──────────┐ ┌───────────┐ ┌────────────────┐  │
│  │  Editor   │ │ Dashboard │ │   Settings     │  │
│  │  Monaco   │ │ 3 Cards   │ │   Accounts     │  │
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
git clone https://github.com/YOUR_USERNAME/cpide.git
cd cpide

# Install frontend dependencies
npm install

# Run in development mode (compiles Rust + starts Vite dev server)
npm run tauri dev
```

### Build for Production

```bash
npm run tauri build
```

The installer will be in `src-tauri/target/release/bundle/`.

---

## Project Structure

```
cpide/
├── src/                          # React frontend
│   ├── App.tsx                   # Main app shell + routing
│   ├── App.css                   # Full design system
│   ├── features/
│   │   ├── editor/               # Monaco editor + terminal + test cases
│   │   ├── dashboard/            # Platform cards + charts
│   │   └── settings/             # Account management
│   └── lib/
│       ├── tauriClient.ts        # Typed IPC wrappers
│       └── platformApi.ts        # Unified platform data types
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── lib.rs                # Command registration
│   │   └── commands/
│   │       ├── compiler.rs       # C++/Python/Java compilation
│   │       ├── auth.rs           # WebView login + keyring
│   │       ├── codeforces.rs     # CF API integration
│   │       ├── leetcode.rs       # LC GraphQL integration
│   │       ├── hackerrank.rs     # HR REST API integration
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
- [ ] **v0.5** — Competitive Companion integration (auto-parse test cases)
- [ ] **v0.6** — Snippets library + contest mode
- [ ] **v0.7** — Stress testing + random test generation

---

## Contributing

This project is under active development. Contributions are welcome!

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <sub>Built with ❤️ for the competitive programming community</sub>
</div>
