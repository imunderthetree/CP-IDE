# Contributing to CP-IDE

First off, thank you for considering contributing to CP-IDE! It's people like you that make CP-IDE such a great tool.

## Development Setup

1. **Prerequisites**:
   - Node.js (v18+)
   - Rust (latest stable)
   - C++, Python, and Java compilers (if you plan to test all languages)

2. **Clone the repository**:
   ```sh
   git clone https://github.com/imunderthetree/CP-IDE.git
   cd CP-IDE
   ```

3. **Install dependencies**:
   ```sh
   npm install
   ```

4. **Run the development server**:
   ```sh
   npm run tauri dev
   ```

## Code Style

- We use ESLint and Prettier for frontend code. Run `npm run lint` before committing.
- We use `cargo fmt` and `cargo clippy` for Rust backend code.

## Pull Request Process

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. Ensure the test suite passes.
4. Make sure your code lints.
5. Issue that pull request!

## Adding New Platform Integrations
To add support for a new platform:
1. Identify the platform's parsing structure for test cases.
2. Implement an extension or an internal listener under `dashboard/` handling WebView extraction.
3. Hook the extraction logic to `pluginApi` or internal testcase state.
