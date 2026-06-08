"use client";

import { useEffect, useState } from "react";
import styles from "@/app/home.module.css";

const THEMES = ["dawn", "sage"] as const;
type Theme = (typeof THEMES)[number];

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dawn");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("pla-theme");
      if (stored === "dawn" || stored === "sage") setTheme(stored);
    } catch {
      /* ignore */
    }
  }, []);

  function toggle() {
    const next: Theme = theme === "dawn" ? "sage" : "dawn";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("pla-theme", next);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      className={styles.themeBtn}
      onClick={toggle}
      aria-label="Switch palette"
      type="button"
    >
      <span className={styles.swatch} />
      {theme}
    </button>
  );
}
