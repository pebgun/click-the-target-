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
        minHeight: "100vh",
        padding: "32px 20px",
        maxWidth: "440px",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          padding: "28px",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <h1 style={{ marginBottom: "28px", fontSize: "1.4rem", fontWeight: 700 }}>Settings</h1>

        <section style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Theme
          </h2>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={() => handleThemeChange("light")}
              style={{
                padding: "10px 20px",
                borderRadius: "var(--radius-md)",
                border: `2px solid ${theme === "light" ? "var(--accent)" : "var(--border)"}`,
                background: theme === "light" ? "var(--accent)" : "transparent",
                color: theme === "light" ? "#fff" : "var(--text)",
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
                borderRadius: "var(--radius-md)",
                border: `2px solid ${theme === "dark" ? "var(--accent)" : "var(--border)"}`,
                background: theme === "dark" ? "var(--accent)" : "transparent",
                color: theme === "dark" ? "#fff" : "var(--text)",
                fontWeight: theme === "dark" ? 600 : 400,
              }}
            >
              Dark
            </button>
          </div>
        </section>

        <section style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Mouse sensitivity
          </h2>
          <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "12px" }}>
            Higher = crosshair moves more per mouse movement.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <input
              type="range"
              min={MIN_SENSITIVITY}
              max={MAX_SENSITIVITY}
              step={0.05}
              value={sensitivity}
              onChange={handleSensitivityChange}
              style={{ flex: 1, accentColor: "var(--accent)" }}
            />
            <span style={{ minWidth: "3rem", fontSize: "0.9rem", fontWeight: 600 }}>
              {sensitivity.toFixed(2)}
            </span>
          </div>
        </section>

        <Link href="/" style={{ fontSize: "0.9rem", color: "var(--accent)", fontWeight: 500 }}>
          ← Back to game
        </Link>
      </div>
    </main>
  );
}
