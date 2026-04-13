import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const failures = [];

function readText(relativePath) {
  const fullPath = path.join(root, relativePath);

  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }

  return readFileSync(fullPath, "utf8");
}

function readJson(relativePath) {
  try {
    return JSON.parse(readText(relativePath));
  } catch (error) {
    failures.push(
      `Could not parse ${relativePath}: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
}

function readCargoValue(cargoToml, key) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = cargoToml.match(new RegExp(`^${escapedKey}\\s*=\\s*"([^"]+)"`, "m"));
  return match?.[1] ?? null;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const requiredFiles = [
  "README.md",
  "LICENSE",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  "SECURITY.md",
  "RELEASING.md",
];

for (const file of requiredFiles) {
  if (!existsSync(path.join(root, file))) {
    failures.push(`Missing required file: ${file}`);
  }
}

const packageJson = readJson("package.json");
const tauriConfig = readJson(path.join("src-tauri", "tauri.conf.json"));
const cargoToml = readText(path.join("src-tauri", "Cargo.toml"));
const changelog = readText("CHANGELOG.md");

if (packageJson && tauriConfig) {
  const packageVersion = packageJson.version;
  const tauriVersion = tauriConfig.version;
  const cargoVersion = readCargoValue(cargoToml, "version");

  if (!packageJson.description) {
    failures.push("package.json is missing a description.");
  }

  if (!packageJson.license) {
    failures.push("package.json is missing a license field.");
  }

  if (!packageJson.repository?.url) {
    failures.push("package.json is missing repository metadata.");
  }

  if (!packageJson.bugs?.url) {
    failures.push("package.json is missing a bugs URL.");
  }

  if (!packageJson.homepage) {
    failures.push("package.json is missing a homepage.");
  }

  if (!Array.isArray(packageJson.keywords) || packageJson.keywords.length === 0) {
    failures.push("package.json should include at least one keyword.");
  }

  if (packageVersion !== tauriVersion) {
    failures.push(
      `Version mismatch: package.json (${packageVersion}) != tauri.conf.json (${tauriVersion}).`
    );
  }

  if (cargoVersion && packageVersion !== cargoVersion) {
    failures.push(
      `Version mismatch: package.json (${packageVersion}) != Cargo.toml (${cargoVersion}).`
    );
  }

  if (!new RegExp(`^## \\[${escapeRegExp(packageVersion)}\\](?:\\s|-|$)`, "m").test(changelog)) {
    failures.push(`CHANGELOG.md does not contain an entry for version ${packageVersion}.`);
  }

  const resources = tauriConfig.bundle?.resources;
  if (
    !Array.isArray(resources) ||
    !resources.some((resource) => typeof resource === "string" && resource.startsWith("compilers"))
  ) {
    failures.push("src-tauri/tauri.conf.json should bundle the optional compilers/ resources.");
  }

  if (!tauriConfig.productName) {
    failures.push("src-tauri/tauri.conf.json is missing productName.");
  }

  if (!tauriConfig.identifier) {
    failures.push("src-tauri/tauri.conf.json is missing identifier.");
  }
}

if (failures.length > 0) {
  console.error("Release readiness checks failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Release readiness checks passed.");
