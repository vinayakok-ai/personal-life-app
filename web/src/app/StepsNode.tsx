"use client";

import { useState, useTransition } from "react";
import styles from "./home.module.css";
import { saveSteps } from "@/app/workout/actions";

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 20h7" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function StepsNode({ initialSteps }: { initialSteps: number }) {
  const [steps, setSteps] = useState(initialSteps);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(initialSteps || ""));
  const [, startTransition] = useTransition();

  function startEdit() {
    setDraft(steps ? String(steps) : "");
    setEditing(true);
  }

  function save() {
    const n = Math.max(0, parseInt(draft.replace(/\D/g, ""), 10) || 0);
    setSteps(n);
    setEditing(false);
    startTransition(() => saveSteps(n));
  }

  return (
    <div className={styles.stepsNode}>
      {editing ? (
        <>
          <input
            className={styles.stepsField}
            inputMode="numeric"
            autoFocus
            value={draft}
            placeholder="—"
            aria-label="Steps today"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
            }}
          />
          <span className={styles.stepsUnit}>steps</span>
          <button
            type="button"
            className={styles.stepsBtn}
            onClick={save}
            aria-label="Save steps"
          >
            <CheckIcon />
          </button>
        </>
      ) : (
        <>
          <span className={styles.stepsValue}>
            {steps ? steps.toLocaleString("en-IN") : "—"}
          </span>
          <span className={styles.stepsUnit}>steps</span>
          <button
            type="button"
            className={styles.stepsBtn}
            onClick={startEdit}
            aria-label="Edit steps"
          >
            <PencilIcon />
          </button>
        </>
      )}
    </div>
  );
}
