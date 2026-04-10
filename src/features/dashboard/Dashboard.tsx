// features/dashboard/Dashboard.tsx — Main dashboard with 3 platform cards.
//
// Manages connection state for Codeforces, LeetCode, and HackerRank.
// Uses WebView login for LC/HR and direct handle input for CF.
// Listens for Tauri events from the auth system.

import { useState, useEffect, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import type { PlatformProfile } from "../../lib/platformApi";
import {
  fetchCodeforcesProfile,
  getCfHandle,
  setCfHandle,
  fetchLeetCodeProfile,
  fetchHackerRankProfile,
  openLoginWindow,
  getSessionCookie,
  disconnectPlatform,
} from "../../lib/tauriClient";
import PlatformCard from "./PlatformCard";

// ─── Types ────────────────────────────────────────────────────────────────────

type CardState = "idle" | "connecting" | "loading" | "loaded" | "error";

interface PlatformState {
  profile: PlatformProfile | null;
  state: CardState;
  error: string;
}

const INITIAL: PlatformState = { profile: null, state: "idle", error: "" };

// ─── Component ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  // ── Codeforces state ────────────────────────────────────────────────────
  const [cfHandle, setCfHandleState] = useState("");
  const [cfInput, setCfInput] = useState("");
  const [cf, setCf] = useState<PlatformState>(INITIAL);

  const loadCf = useCallback(async (handle: string) => {
    setCf({ profile: null, state: "loading", error: "" });
    try {
      const p = await fetchCodeforcesProfile(handle);
      setCf({ profile: p, state: "loaded", error: "" });
    } catch (err) {
      setCf({ profile: null, state: "error", error: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  const connectCf = useCallback(async () => {
    const h = cfInput.trim();
    if (!h) return;
    await setCfHandle(h).catch(() => {});
    setCfHandleState(h);
    loadCf(h);
  }, [cfInput, loadCf]);

  const disconnectCf = useCallback(async () => {
    await setCfHandle("").catch(() => {});
    setCfHandleState("");
    setCfInput("");
    setCf(INITIAL);
  }, []);

  // ── LeetCode state ──────────────────────────────────────────────────────
  const [lc, setLc] = useState<PlatformState>(INITIAL);

  const loadLc = useCallback(async () => {
    setLc({ profile: null, state: "loading", error: "" });
    try {
      const p = await fetchLeetCodeProfile();
      setLc({ profile: p, state: "loaded", error: "" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Sentinel errors from Rust — silently reset to idle (stale/missing credential)
      if (msg.includes("NOT_CONNECTED") || msg.includes("SESSION_EXPIRED") || msg.includes("Not connected")) {
        setLc(INITIAL);
      } else {
        setLc({ profile: null, state: "error", error: msg });
      }
    }
  }, []);

  const connectLc = useCallback(async () => {
    setLc({ profile: null, state: "connecting", error: "" });
    try {
      await openLoginWindow("leetcode");
    } catch (err) {
      setLc({ profile: null, state: "error", error: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  const disconnectLc = useCallback(async () => {
    await disconnectPlatform("leetcode").catch(() => {});
    setLc(INITIAL);
  }, []);

  // ── HackerRank state ────────────────────────────────────────────────────
  const [hr, setHr] = useState<PlatformState>(INITIAL);

  const loadHr = useCallback(async () => {
    setHr({ profile: null, state: "loading", error: "" });
    try {
      const p = await fetchHackerRankProfile();
      setHr({ profile: p, state: "loaded", error: "" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("NOT_CONNECTED") || msg.includes("SESSION_EXPIRED") || msg.includes("Not connected")) {
        setHr(INITIAL);
      } else {
        setHr({ profile: null, state: "error", error: msg });
      }
    }
  }, []);

  const connectHr = useCallback(async () => {
    setHr({ profile: null, state: "connecting", error: "" });
    try {
      await openLoginWindow("hackerrank");
    } catch (err) {
      setHr({ profile: null, state: "error", error: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  const disconnectHr = useCallback(async () => {
    await disconnectPlatform("hackerrank").catch(() => {});
    setHr(INITIAL);
  }, []);

  // ── Load saved connections on mount + listen for auth events ─────────────
  useEffect(() => {
    // Codeforces — check saved handle
    getCfHandle().then((h) => {
      if (h) {
        setCfHandleState(h);
        setCfInput(h);
        loadCf(h);
      }
    }).catch(() => {});

    // LeetCode — check if session exists in keyring
    getSessionCookie("leetcode").then(() => {
      loadLc();
    }).catch(() => {});

    // HackerRank — check if session exists in keyring
    getSessionCookie("hackerrank").then(() => {
      loadHr();
    }).catch(() => {});

    // Listen for WebView login success events
    const unlistenConnected = listen<{ platform: string }>("platform_connected", (event) => {
      const p = event.payload.platform;
      if (p === "leetcode") loadLc();
      if (p === "hackerrank") loadHr();
    });

    // Listen for login cancelled events
    const unlistenCancelled = listen<{ platform: string }>("login_cancelled", (event) => {
      const p = event.payload.platform;
      if (p === "leetcode") setLc((prev) => prev.state === "connecting" ? INITIAL : prev);
      if (p === "hackerrank") setHr((prev) => prev.state === "connecting" ? INITIAL : prev);
    });

    // Listen for login timeout events
    const unlistenTimeout = listen<{ platform: string }>("login_timeout", (event) => {
      const p = event.payload.platform;
      const err = { profile: null as PlatformProfile | null, state: "error" as CardState, error: "Login timed out — try again" };
      if (p === "leetcode") setLc(err);
      if (p === "hackerrank") setHr(err);
    });

    return () => {
      unlistenConnected.then((f) => f());
      unlistenCancelled.then((f) => f());
      unlistenTimeout.then((f) => f());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard</h1>
        <p className="dashboard-subtitle">
          Track your competitive programming progress across platforms
        </p>
      </div>

      <div className="dashboard-grid">
        {/* Codeforces — handle input */}
        <PlatformCard
          platform="codeforces"
          profile={cf.profile}
          state={cf.state === "connecting" ? "loading" : cf.state}
          error={cf.error}
          onRefresh={() => cfHandle && loadCf(cfHandle)}
          onDisconnect={disconnectCf}
          connectForm={
            <div className="connect-form">
              <input
                type="text"
                className="connect-input"
                placeholder="e.g. tourist"
                value={cfInput}
                onChange={(e) => setCfInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && connectCf()}
              />
              <button className="btn btn-primary" onClick={connectCf}>
                Connect
              </button>
            </div>
          }
        />

        {/* LeetCode — WebView login */}
        <PlatformCard
          platform="leetcode"
          profile={lc.profile}
          state={lc.state === "connecting" ? "loading" : lc.state}
          error={lc.error}
          onRefresh={loadLc}
          onDisconnect={disconnectLc}
          connectForm={
            <div className="connect-form">
              <button
                className="btn btn-primary connect-webview-btn"
                onClick={connectLc}
                disabled={lc.state === "connecting"}
                style={{ width: "100%" }}
              >
                {lc.state === "connecting" ? "Waiting for login..." : "Sign in with LeetCode"}
              </button>
            </div>
          }
        />

        {/* HackerRank — WebView login */}
        <PlatformCard
          platform="hackerrank"
          profile={hr.profile}
          state={hr.state === "connecting" ? "loading" : hr.state}
          error={hr.error}
          onRefresh={loadHr}
          onDisconnect={disconnectHr}
          connectForm={
            <div className="connect-form">
              <button
                className="btn btn-primary connect-webview-btn"
                onClick={connectHr}
                disabled={hr.state === "connecting"}
                style={{ width: "100%" }}
              >
                {hr.state === "connecting" ? "Waiting for login..." : "Sign in with HackerRank"}
              </button>
            </div>
          }
        />
      </div>
    </div>
  );
}
