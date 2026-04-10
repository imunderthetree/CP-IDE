// features/settings/SettingsPage.tsx — Account connections and app settings.
//
// Allows users to connect/disconnect platform accounts and view connection status.
// Uses WebView login for LeetCode/HackerRank, handle input for Codeforces.

import { useState, useEffect, useCallback } from "react";
import { Check, X, LogIn } from "lucide-react";
import {
  getCfHandle, setCfHandle,
  getSessionCookie,
  openLoginWindow,
  disconnectPlatform,
} from "../../lib/tauriClient";
import { listen } from "@tauri-apps/api/event";

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

      {/* Future Settings */}
      <div className="settings-section settings-section-disabled">
        <h2 className="settings-section-title">
          Appearance
          <span className="settings-coming-badge">Coming Soon</span>
        </h2>
        <p className="settings-disabled-text">Theme selection, font size, and editor preferences</p>
      </div>

      <div className="settings-section settings-section-disabled">
        <h2 className="settings-section-title">
          Compiler
          <span className="settings-coming-badge">Coming Soon</span>
        </h2>
        <p className="settings-disabled-text">Custom compiler paths, time limits, and memory limits</p>
      </div>
    </div>
  );
}
