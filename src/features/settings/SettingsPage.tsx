// features/settings/SettingsPage.tsx — Account connections, compiler detection, and app settings.
//
// Allows users to connect/disconnect platform accounts and view connection status.
// Uses WebView login for LeetCode/HackerRank, handle input for Codeforces.
// Shows detected compilers in the Compiler section.

import { useState, useEffect, useCallback } from "react";
import { Check, X, LogIn, Cpu, Palette } from "lucide-react";
import {
  THEMES, ACCENT_PRESETS, FONT_OPTIONS, FONT_LABELS,
  loadAppearance, saveAppearance, applyAppearance,
  type AppearanceSettings,
} from "../../lib/themes";
import {
  getCfHandle, setCfHandle,
  getSessionCookie,
  openLoginWindow,
  disconnectPlatform,
  detectCompilers,
  getExtensionsDirPath,
  type DetectedCompiler,
} from "../../lib/tauriClient";
import { listen } from "@tauri-apps/api/event";
import { openPath } from "@tauri-apps/plugin-opener";
import { useExtensions } from "../../context/ExtensionContext";
import { Puzzle } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlatformConnection {
  connected: boolean;
  identifier: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [cf, setCf] = useState<PlatformConnection>({ connected: false, identifier: "" });
  const [lc, setLc] = useState<PlatformConnection>({ connected: false, identifier: "" });
  const [hr, setHr] = useState<PlatformConnection>({ connected: false, identifier: "" });

  const [cfInput, setCfInput] = useState("");

  // Compiler detection state
  const [compilers, setCompilers] = useState<DetectedCompiler[]>([]);
  const [compilersLoading, setCompilersLoading] = useState(true);

  // Extension Context
  const { extensions, reloadExtensions } = useExtensions();

  // Appearance state
  const [appearance, setAppearance] = useState<AppearanceSettings>(loadAppearance);

  const updateAppearance = useCallback((patch: Partial<AppearanceSettings>) => {
    setAppearance((prev) => {
      const next = { ...prev, ...patch };
      saveAppearance(next);
      applyAppearance(next);
      return next;
    });
  }, []);

  // ── Load saved connections ──────────────────────────────────────────────
  useEffect(() => {
    getCfHandle().then((h) => {
      if (h) setCf({ connected: true, identifier: h });
    }).catch(() => {});

    getSessionCookie("leetcode").then(() => {
      setLc({ connected: true, identifier: "Connected" });
    }).catch(() => {});

    getSessionCookie("hackerrank").then(() => {
      setHr({ connected: true, identifier: "Connected" });
    }).catch(() => {});

    // Listen for WebView login events
    const unlistenConnected = listen<{ platform: string }>("platform_connected", (event) => {
      if (event.payload.platform === "leetcode") setLc({ connected: true, identifier: "Connected" });
      if (event.payload.platform === "hackerrank") setHr({ connected: true, identifier: "Connected" });
    });

    return () => {
      unlistenConnected.then((f) => f());
    };
  }, []);

  // ── Detect compilers on mount ───────────────────────────────────────────
  useEffect(() => {
    setCompilersLoading(true);
    detectCompilers()
      .then((found) => {
        setCompilers(found);
        setCompilersLoading(false);
      })
      .catch(() => {
        setCompilersLoading(false);
      });
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────
  const connectCf = useCallback(async () => {
    const h = cfInput.trim();
    if (!h) return;
    await setCfHandle(h);
    setCf({ connected: true, identifier: h });
    setCfInput("");
  }, [cfInput]);

  const doDisconnectCf = useCallback(async () => {
    await setCfHandle("");
    setCf({ connected: false, identifier: "" });
  }, []);

  const connectLc = useCallback(async () => {
    await openLoginWindow("leetcode");
  }, []);

  const doDisconnectLc = useCallback(async () => {
    await disconnectPlatform("leetcode");
    setLc({ connected: false, identifier: "" });
  }, []);

  const connectHr = useCallback(async () => {
    await openLoginWindow("hackerrank");
  }, []);

  const doDisconnectHr = useCallback(async () => {
    await disconnectPlatform("hackerrank");
    setHr({ connected: false, identifier: "" });
  }, []);

  const langIcons: Record<string, string> = {
    cpp: "⚡",
    python: "🐍",
    java: "☕",
  };

  const openExtensionsFolder = useCallback(async () => {
    try {
      const path = await getExtensionsDirPath();
      await openPath(path);
    } catch (err) {
      console.error("Failed to open extensions dir:", err);
    }
  }, []);

  const langLabels: Record<string, string> = {
    cpp: "C++",
    python: "Python",
    java: "Java",
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1 className="settings-title">Settings</h1>
        <p className="settings-subtitle">Manage your platform connections and preferences</p>
      </div>

      {/* Account Connections */}
      <div className="settings-section">
        <h2 className="settings-section-title">Platform Accounts</h2>

        {/* Codeforces */}
        <div className="settings-row">
          <div className="settings-row-left">
            <span className="settings-platform-icon" style={{ color: "#3B8BD4" }}>🏆</span>
            <div className="settings-platform-info">
              <span className="settings-platform-name">Codeforces</span>
              {cf.connected ? (
                <span className="settings-connected">
                  <Check size={12} /> Connected as <strong>{cf.identifier}</strong>
                </span>
              ) : (
                <span className="settings-disconnected">Not connected</span>
              )}
            </div>
          </div>
          <div className="settings-row-right">
            {cf.connected ? (
              <button className="btn btn-ghost btn-sm" onClick={doDisconnectCf}>
                <X size={12} /> Disconnect
              </button>
            ) : (
              <div className="settings-connect-form">
                <input
                  type="text"
                  className="settings-input"
                  placeholder="CF handle"
                  value={cfInput}
                  onChange={(e) => setCfInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && connectCf()}
                />
                <button className="btn btn-primary btn-sm" onClick={connectCf}>
                  Connect
                </button>
              </div>
            )}
          </div>
        </div>

        {/* LeetCode */}
        <div className="settings-row">
          <div className="settings-row-left">
            <span className="settings-platform-icon" style={{ color: "#EF9F27" }}>⚡</span>
            <div className="settings-platform-info">
              <span className="settings-platform-name">LeetCode</span>
              {lc.connected ? (
                <span className="settings-connected">
                  <Check size={12} /> {lc.identifier}
                </span>
              ) : (
                <span className="settings-disconnected">Not connected</span>
              )}
            </div>
          </div>
          <div className="settings-row-right">
            {lc.connected ? (
              <button className="btn btn-ghost btn-sm" onClick={doDisconnectLc}>
                <X size={12} /> Disconnect
              </button>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={connectLc}>
                <LogIn size={12} /> Sign in
              </button>
            )}
          </div>
        </div>

        {/* HackerRank */}
        <div className="settings-row">
          <div className="settings-row-left">
            <span className="settings-platform-icon" style={{ color: "#1D9E75" }}>💻</span>
            <div className="settings-platform-info">
              <span className="settings-platform-name">HackerRank</span>
              {hr.connected ? (
                <span className="settings-connected">
                  <Check size={12} /> {hr.identifier}
                </span>
              ) : (
                <span className="settings-disconnected">Not connected</span>
              )}
            </div>
          </div>
          <div className="settings-row-right">
            {hr.connected ? (
              <button className="btn btn-ghost btn-sm" onClick={doDisconnectHr}>
                <X size={12} /> Disconnect
              </button>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={connectHr}>
                <LogIn size={12} /> Sign in
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Compiler Detection */}
      <div className="settings-section">
        <h2 className="settings-section-title">
          <Cpu size={14} /> Compilers
        </h2>

        {compilersLoading ? (
          <div className="settings-row">
            <div className="settings-row-left">
              <div className="spinner" style={{ width: 14, height: 14 }} />
              <span className="settings-disconnected">Detecting compilers…</span>
            </div>
          </div>
        ) : compilers.length === 0 ? (
          <div className="settings-row">
            <div className="settings-row-left">
              <span className="settings-disconnected">
                No compilers detected. Install g++, Python, or Java on your system PATH.
              </span>
            </div>
          </div>
        ) : (
          compilers.map((compiler) => (
            <div key={`${compiler.language}-${compiler.source}`} className="settings-row">
              <div className="settings-row-left">
                <span className="settings-platform-icon">
                  {langIcons[compiler.language] ?? "🔧"}
                </span>
                <div className="settings-platform-info">
                  <span className="settings-platform-name">
                    {langLabels[compiler.language] ?? compiler.language}
                  </span>
                  <span className="settings-connected">
                    <Check size={12} /> {compiler.version}
                  </span>
                </div>
              </div>
              <div className="settings-row-right">
                <span className={`settings-compiler-badge ${compiler.is_bundled ? "bundled" : "system"}`}>
                  {compiler.source}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Extensions */}
      <div className="settings-section">
        <h2 className="settings-section-title">
          <Puzzle size={14} /> Extensions
        </h2>
        <p className="settings-subtitle" style={{marginBottom: "1rem"}}>
          Drop <code>.js</code> plugin files into the extensions folder to customize the IDE.
        </p>

        <div className="settings-row">
          <div className="settings-row-left">
            <button className="btn btn-secondary btn-sm" onClick={openExtensionsFolder}>
              Open Extensions Folder
            </button>
            <button className="btn btn-ghost btn-sm" style={{marginLeft: "0.5rem"}} onClick={reloadExtensions}>
              Reload Apps
            </button>
          </div>
        </div>

        {extensions.length === 0 ? (
          <div className="settings-row">
            <div className="settings-row-left">
              <span className="settings-disconnected">No extensions installed.</span>
            </div>
          </div>
        ) : (
          extensions.map(ext => (
            <div key={ext.id} className="settings-row">
              <div className="settings-row-left">
                <div className="settings-platform-info">
                  <span className="settings-platform-name">{ext.name}</span>
                  <span className="settings-connected" style={{color: "var(--text-muted)"}}>
                    {ext.id}.js
                  </span>
                </div>
              </div>
              <div className="settings-row-right">
                <span className="settings-compiler-badge system">Loaded</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Appearance */}
      <div className="settings-section">
        <h2 className="settings-section-title">
          <Palette size={14} /> Appearance
        </h2>

        {/* Theme Grid */}
        <div className="appearance-subsection">
          <label className="appearance-label">Theme</label>
          <div className="theme-grid">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                className={`theme-card ${appearance.themeId === theme.id ? "active" : ""}`}
                onClick={() => updateAppearance({ themeId: theme.id, useCustomAccent: false })}
              >
                <div className="theme-preview">
                  <div className="theme-preview-bg" style={{ background: theme.preview.bg }}>
                    <div className="theme-preview-sidebar" style={{ background: theme.preview.surface }} />
                    <div className="theme-preview-editor">
                      <div className="theme-preview-line" style={{ background: theme.preview.text, opacity: 0.6, width: "70%" }} />
                      <div className="theme-preview-line" style={{ background: theme.preview.accent, opacity: 0.8, width: "45%" }} />
                      <div className="theme-preview-line" style={{ background: theme.preview.text, opacity: 0.4, width: "60%" }} />
                      <div className="theme-preview-line" style={{ background: theme.preview.accent, opacity: 0.5, width: "35%" }} />
                    </div>
                  </div>
                </div>
                <span className="theme-card-name">{theme.name}</span>
                {appearance.themeId === theme.id && (
                  <span className="theme-check"><Check size={10} /></span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Accent Color */}
        <div className="appearance-subsection">
          <label className="appearance-label">Accent Color</label>
          <div className="accent-grid">
            {ACCENT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                className={`accent-swatch ${appearance.useCustomAccent && appearance.accentColor === preset.color ? "active" : ""}`}
                style={{ background: preset.color }}
                title={preset.name}
                onClick={() => updateAppearance({ accentColor: preset.color, useCustomAccent: true })}
              >
                {appearance.useCustomAccent && appearance.accentColor === preset.color && (
                  <Check size={10} color="#000" />
                )}
              </button>
            ))}
            <button
              className={`accent-swatch reset-swatch ${!appearance.useCustomAccent ? "active" : ""}`}
              title="Use theme default"
              onClick={() => updateAppearance({ useCustomAccent: false })}
            >
              {!appearance.useCustomAccent && <Check size={10} />}
            </button>
          </div>
        </div>

        {/* Font Size */}
        <div className="appearance-subsection">
          <label className="appearance-label">
            Font Size <span className="appearance-value">{appearance.fontSize}px</span>
          </label>
          <div className="font-size-row">
            <span className="font-size-label">12</span>
            <input
              type="range"
              min={12}
              max={20}
              step={1}
              value={appearance.fontSize}
              onChange={(e) => updateAppearance({ fontSize: Number(e.target.value) })}
              className="appearance-slider"
            />
            <span className="font-size-label">20</span>
          </div>
        </div>

        {/* Font Family */}
        <div className="appearance-subsection">
          <label className="appearance-label">Editor Font</label>
          <div className="font-family-grid">
            {FONT_OPTIONS.map((font) => (
              <button
                key={font}
                className={`font-option ${appearance.fontFamily === font ? "active" : ""}`}
                style={{ fontFamily: font }}
                onClick={() => updateAppearance({ fontFamily: font })}
              >
                {FONT_LABELS[font] || font}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
