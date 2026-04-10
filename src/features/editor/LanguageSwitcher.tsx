// features/editor/LanguageSwitcher.tsx — Language selector for the editor toolbar.
//
// Provides a segmented control to switch between C++, Python, and Java.
// Updates the Monaco editor language mode and shows file extension badges.

// ─── Types ────────────────────────────────────────────────────────────────────

export type Language = "cpp" | "python" | "java";

interface LanguageSwitcherProps {
  /** Currently selected language. */
  language: Language;
  /** Called when the user selects a different language. */
  onLanguageChange: (lang: Language) => void;
}

// ─── Language Definitions ─────────────────────────────────────────────────────

interface LangDef {
  id: Language;
  label: string;
  ext: string;
}

const LANGUAGES: LangDef[] = [
  { id: "cpp", label: "C++", ext: ".cpp" },
  { id: "python", label: "Python", ext: ".py" },
  { id: "java", label: "Java", ext: ".java" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function LanguageSwitcher({ language, onLanguageChange }: LanguageSwitcherProps) {
  return (
    <div className="language-switcher" role="tablist" aria-label="Language selector">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.id}
          className={`lang-option ${language === lang.id ? "active" : ""}`}
          onClick={() => onLanguageChange(lang.id)}
          role="tab"
          aria-selected={language === lang.id}
          title={`Switch to ${lang.label} (${lang.ext})`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
