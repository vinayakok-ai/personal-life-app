"use client";

import { useState, useTransition } from "react";
import styles from "./home.module.css";
import { toggleHabit } from "@/app/habit-actions";

export default function HabitCheck({
  id,
  label,
  cue,
  periodCls,
  initialDone,
}: {
  id: string;
  label: string;
  cue: string;
  periodCls: string;
  initialDone: boolean;
}) {
  const [done, setDone] = useState(initialDone);
  const [, startTransition] = useTransition();

  function toggle() {
    const next = !done;
    setDone(next);
    startTransition(() => toggleHabit(id, next));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={done}
      className={`${styles.stop} ${styles.checkBtn} ${done ? styles.done : ""} ${periodCls}`}
    >
      <span className={styles.dot} />
      <h3 className={styles.title}>{label}</h3>
      <p className={styles.cue}>{cue}</p>
    </button>
  );
}
