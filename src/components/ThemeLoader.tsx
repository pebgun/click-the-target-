"use client";

import { useEffect } from "react";

const THEME_KEY = "click-target-theme";

export function setTheme(theme: "light" | "dark") {
  if (typeof window === "undefined") return;
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.dataset.theme = theme;
}

export function getTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const t = localStorage.getItem(THEME_KEY);
  return t === "dark" ? "dark" : "light";
}

export default function ThemeLoader() {
  useEffect(() => {
    const theme = getTheme();
    document.documentElement.dataset.theme = theme;
  }, []);
  return null;
}
