"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { setTheme, getTheme } from "@/components/ThemeLoader";

const SENSITIVITY_KEY = "click-target-sensitivity";
const MIN_SENSITIVITY = 0.5;
const MAX_SENSITIVITY = 2;
const DEFAULT_SENSITIVITY = 1;

function getStoredSensitivity(): number {
  if (typeof window === "undefined") return DEFAULT_SENSITIVITY;
  const s = localStorage.getItem(SENSITIVITY_KEY);
  const n = parseFloat(s ?? "");
  if (Number.isFinite(n) && n >= MIN_SENSITIVITY && n <= MAX_SENSITIVITY)
    return n;
  return DEFAULT_SENSITIVITY;
}

function setStoredSensitivity(value: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SENSITIVITY_KEY, String(value));
}

export default function SettingsPage() {
  const [theme, setThemeState] = useState<"light" | "dark">("light");
  const [sensitivity, setSensitivity] = useState(DEFAULT_SENSITIVITY);

  useEffect(() => {
    setThemeState(getTheme());
    setSensitivity(getStoredSensitivity());
  }, []);

  function handleThemeChange(next: "light" | "dark") {
    setThemeState(next);
    setTheme(next);
  }

  function handleSensitivityChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = parseFloat(e.target.value);
    if (Number.isFinite(value)) {
      const clamped = Math.min(MAX_SENSITIVITY, Math.max(MIN_SENSITIVITY, value));
      setSensitivity(clamped);
      setStoredSensitivity(clamped);
    }
  }

  return (
    <main
      style={{
        maxWidth: "420px",
        margin: "40px auto",
        padding: "0 20px",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        paddingBlock: "24px",
        paddingInline: "24px",
      }}
    >
      <h1 style={{ marginBottom: "24px", fontSize: "1.5rem" }}>Settings</h1>

      <section style={{ marginBottom: "28px" }}>
        <h2
          style={{
            fontSize: "1rem",
            fontWeight: 600,
            marginBottom: "12px",
            color: "var(--text)",
          }}
        >
          Theme
        </h2>
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            type="button"
            onClick={() => handleThemeChange("light")}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: `2px solid ${theme === "light" ? "var(--accent)" : "var(--border)"}`,
              background: theme === "light" ? "var(--accent)" : "transparent",
              color: theme === "light" ? "var(--bg)" : "var(--text)",
              cursor: "pointer",
              fontWeight: theme === "light" ? 600 : 400,
            }}
          >
            Light
          </button>
          <button
            type="button"
            onClick={() => handleThemeChange("dark")}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: `2px solid ${theme === "dark" ? "var(--accent)" : "var(--border)"}`,
              background: theme === "dark" ? "var(--accent)" : "transparent",
              color: theme === "dark" ? "var(--bg)" : "var(--text)",
              cursor: "pointer",
              fontWeight: theme === "dark" ? 600 : 400,
            }}
          >
            Dark
          </button>
        </div>
      </section>

      <section style={{ marginBottom: "28px" }}>
        <h2
          style={{
            fontSize: "1rem",
            fontWeight: 600,
            marginBottom: "12px",
            color: "var(--text)",
          }}
        >
          Sensitivity
        </h2>
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--text-muted)",
            marginBottom: "12px",
          }}
        >
          Higher = target jumps farther when you hit it (harder).
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <input
            type="range"
            min={MIN_SENSITIVITY}
            max={MAX_SENSITIVITY}
            step={0.1}
            value={sensitivity}
            onChange={handleSensitivityChange}
            style={{ flex: 1, accentColor: "var(--accent)" }}
          />
          <span
            style={{
              minWidth: "2.5rem",
              fontSize: "0.9rem",
              color: "var(--text)",
            }}
          >
            {sensitivity.toFixed(1)}
          </span>
        </div>
      </section>

      <Link
        href="/"
        style={{
          display: "inline-block",
          marginTop: "8px",
          color: "var(--text-muted)",
          fontSize: "0.9rem",
        }}
      >
        ← Back to game
      </Link>
    </main>
  );
}
