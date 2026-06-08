"use client";

import { useTransition } from "react";
import styles from "./home.module.css";
import { saveSteps } from "@/app/workout/actions";

export default function StepsNode({ initialSteps }: { initialSteps: number }) {
  const [, startTransition] = useTransition();

  function commit(value: string) {
    const n = Math.max(0, parseInt(value.replace(/\D/g, ""), 10) || 0);
    startTransition(() => saveSteps(n));
  }

  return (
    <div className={styles.stepsNode}>
      <input
        className={styles.stepsField}
        inputMode="numeric"
        defaultValue={initialSteps || ""}
        placeholder="—"
        aria-label="Steps today"
        onBlur={(e) => commit(e.target.value)}
      />
      <span className={styles.stepsUnit}>steps</span>
    </div>
  );
}
