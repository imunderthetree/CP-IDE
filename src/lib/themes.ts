// lib/themes.ts — Theme definitions for CP-IDE Appearance settings.
//
// Each theme is a set of CSS variable overrides applied to :root.
// The "Midnight" theme is the default and matches the original CSS.

export interface ThemeDefinition {
  id: string;
  name: string;
  preview: {
    bg: string;
    surface: string;
    accent: string;
    text: string;
  };
  vars: Record<string, string>;
}

export const THEMES: ThemeDefinition[] = [
  {
    id: "midnight",
    name: "Midnight",
    preview: { bg: "#0a0e14", surface: "#0f1319", accent: "#00e5a0", text: "#e6edf3" },
    vars: {
      "--bg-base": "#0a0e14",
      "--bg-surface": "#0f1319",
      "--bg-elevated": "#151a22",
      "--bg-overlay": "#1a202a",
      "--bg-hover": "#1e2530",
      "--bg-active": "#242c38",
      "--border-subtle": "#1e2530",
      "--border-default": "#2a3240",
      "--border-strong": "#3a4555",
      "--text-primary": "#e6edf3",
      "--text-secondary": "#8b949e",
      "--text-muted": "#555d68",
      "--text-disabled": "#3a4555",
      "--accent": "#00e5a0",
      "--accent-hover": "#00cc8e",
      "--accent-muted": "rgba(0, 229, 160, 0.15)",
      "--accent-border": "rgba(0, 229, 160, 0.3)",
    },
  },
  {
    id: "monokai",
    name: "Monokai Pro",
    preview: { bg: "#2d2a2e", surface: "#221f22", accent: "#a9dc76", text: "#fcfcfa" },
    vars: {
      "--bg-base": "#2d2a2e",
      "--bg-surface": "#221f22",
      "--bg-elevated": "#363337",
      "--bg-overlay": "#403e41",
      "--bg-hover": "#4a474b",
      "--bg-active": "#545154",
      "--border-subtle": "#3b383c",
      "--border-default": "#4a474b",
      "--border-strong": "#5b5860",
      "--text-primary": "#fcfcfa",
      "--text-secondary": "#c1c0c0",
      "--text-muted": "#727072",
      "--text-disabled": "#5b5860",
      "--accent": "#a9dc76",
      "--accent-hover": "#95c864",
      "--accent-muted": "rgba(169, 220, 118, 0.15)",
      "--accent-border": "rgba(169, 220, 118, 0.3)",
    },
  },
  {
    id: "nord",
    name: "Nord",
    preview: { bg: "#2e3440", surface: "#272c36", accent: "#88c0d0", text: "#eceff4" },
    vars: {
      "--bg-base": "#2e3440",
      "--bg-surface": "#272c36",
      "--bg-elevated": "#3b4252",
      "--bg-overlay": "#434c5e",
      "--bg-hover": "#4c566a",
      "--bg-active": "#556178",
      "--border-subtle": "#3b4252",
      "--border-default": "#4c566a",
      "--border-strong": "#5e6a82",
      "--text-primary": "#eceff4",
      "--text-secondary": "#d8dee9",
      "--text-muted": "#7b88a1",
      "--text-disabled": "#5e6a82",
      "--accent": "#88c0d0",
      "--accent-hover": "#7ab4c4",
      "--accent-muted": "rgba(136, 192, 208, 0.15)",
      "--accent-border": "rgba(136, 192, 208, 0.3)",
    },
  },
  {
    id: "dracula",
    name: "Dracula",
    preview: { bg: "#282a36", surface: "#21222c", accent: "#bd93f9", text: "#f8f8f2" },
    vars: {
      "--bg-base": "#282a36",
      "--bg-surface": "#21222c",
      "--bg-elevated": "#343746",
      "--bg-overlay": "#3e4155",
      "--bg-hover": "#454864",
      "--bg-active": "#4d5072",
      "--border-subtle": "#343746",
      "--border-default": "#454864",
      "--border-strong": "#575b7c",
      "--text-primary": "#f8f8f2",
      "--text-secondary": "#c4c7d4",
      "--text-muted": "#6272a4",
      "--text-disabled": "#575b7c",
      "--accent": "#bd93f9",
      "--accent-hover": "#ab7ef0",
      "--accent-muted": "rgba(189, 147, 249, 0.15)",
      "--accent-border": "rgba(189, 147, 249, 0.3)",
    },
  },
  {
    id: "github-dark",
    name: "GitHub Dark",
    preview: { bg: "#0d1117", surface: "#161b22", accent: "#58a6ff", text: "#c9d1d9" },
    vars: {
      "--bg-base": "#0d1117",
      "--bg-surface": "#161b22",
      "--bg-elevated": "#1c2129",
      "--bg-overlay": "#21262d",
      "--bg-hover": "#292e36",
      "--bg-active": "#30363d",
      "--border-subtle": "#21262d",
      "--border-default": "#30363d",
      "--border-strong": "#484f58",
      "--text-primary": "#c9d1d9",
      "--text-secondary": "#8b949e",
      "--text-muted": "#6e7681",
      "--text-disabled": "#484f58",
      "--accent": "#58a6ff",
      "--accent-hover": "#4393e6",
      "--accent-muted": "rgba(88, 166, 255, 0.15)",
      "--accent-border": "rgba(88, 166, 255, 0.3)",
    },
  },
  {
    id: "catppuccin",
    name: "Catppuccin",
    preview: { bg: "#1e1e2e", surface: "#181825", accent: "#cba6f7", text: "#cdd6f4" },
    vars: {
      "--bg-base": "#1e1e2e",
      "--bg-surface": "#181825",
      "--bg-elevated": "#28283d",
      "--bg-overlay": "#313244",
      "--bg-hover": "#3a3a52",
      "--bg-active": "#45475a",
      "--border-subtle": "#28283d",
      "--border-default": "#45475a",
      "--border-strong": "#585b70",
      "--text-primary": "#cdd6f4",
      "--text-secondary": "#bac2de",
      "--text-muted": "#6c7086",
      "--text-disabled": "#585b70",
      "--accent": "#cba6f7",
      "--accent-hover": "#b892e8",
      "--accent-muted": "rgba(203, 166, 247, 0.15)",
      "--accent-border": "rgba(203, 166, 247, 0.3)",
    },
  },
];

// ─── Accent Color Presets ─────────────────────────────────────────────────────

export interface AccentPreset {
  id: string;
  name: string;
  color: string;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { id: "teal",    name: "Electric Teal",  color: "#00e5a0" },
  { id: "blue",    name: "Ocean Blue",     color: "#58a6ff" },
  { id: "purple",  name: "Lavender",       color: "#bd93f9" },
  { id: "pink",    name: "Hot Pink",       color: "#ff79c6" },
  { id: "orange",  name: "Sunset",         color: "#ffb86c" },
  { id: "red",     name: "Crimson",        color: "#ff5555" },
  { id: "green",   name: "Forest",         color: "#50fa7b" },
  { id: "yellow",  name: "Gold",           color: "#f1fa8c" },
];

// ─── Font Options ─────────────────────────────────────────────────────────────

export const FONT_OPTIONS = [
  "'JetBrains Mono', monospace",
  "'Fira Code', monospace",
  "'Cascadia Code', monospace",
  "'Consolas', monospace",
  "'Source Code Pro', monospace",
  "'IBM Plex Mono', monospace",
  "'Ubuntu Mono', monospace",
];

export const FONT_LABELS: Record<string, string> = {
  "'JetBrains Mono', monospace": "JetBrains Mono",
  "'Fira Code', monospace": "Fira Code",
  "'Cascadia Code', monospace": "Cascadia Code",
  "'Consolas', monospace": "Consolas",
  "'Source Code Pro', monospace": "Source Code Pro",
  "'IBM Plex Mono', monospace": "IBM Plex Mono",
  "'Ubuntu Mono', monospace": "Ubuntu Mono",
};

// ─── Persistence ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "cpide-appearance";

export interface AppearanceSettings {
  themeId: string;
  accentColor: string;  // hex color, overrides theme accent
  fontSize: number;     // editor font size in px (12-20)
  fontFamily: string;   // editor font-family string
  useCustomAccent: boolean; // whether to apply custom accent over theme default
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  themeId: "midnight",
  accentColor: "#00e5a0",
  fontSize: 14,
  fontFamily: "'JetBrains Mono', monospace",
  useCustomAccent: false,
};

export function loadAppearance(): AppearanceSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...DEFAULT_APPEARANCE, ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return { ...DEFAULT_APPEARANCE };
}

export function saveAppearance(settings: AppearanceSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

/**
 * Apply appearance settings to the DOM by setting CSS variables on :root.
 */
export function applyAppearance(settings: AppearanceSettings) {
  const root = document.documentElement;
  const theme = THEMES.find((t) => t.id === settings.themeId) ?? THEMES[0];

  // Apply theme color variables
  for (const [key, value] of Object.entries(theme.vars)) {
    root.style.setProperty(key, value);
  }

  // Override accent if user picked a custom color
  if (settings.useCustomAccent) {
    const c = settings.accentColor;
    root.style.setProperty("--accent", c);
    // Derive hover (darken slightly) and muted/border variants
    root.style.setProperty("--accent-hover", c);
    root.style.setProperty("--accent-muted", hexToRgba(c, 0.15));
    root.style.setProperty("--accent-border", hexToRgba(c, 0.3));
  }

  // Apply font settings
  root.style.setProperty("--font-mono", settings.fontFamily);
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
