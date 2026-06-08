"use client";

import { useState, useTransition } from "react";
import styles from "./workout.module.css";
import { setSetsDone } from "./actions";

type Item = {
  id: string;
  name: string;
  unit: string;
  sets: number;
  target: number;
  setsDone: number;
  done: boolean;
};

export default function WorkoutToday({
  items: initialItems,
}: {
  items: Item[];
}) {
  const [items, setItems] = useState(initialItems);
  const [, startTransition] = useTransition();

  const totalSets = items.reduce((s, i) => s + i.sets, 0);
  const doneSets = items.reduce((s, i) => s + i.setsDone, 0);
  const allDone = items.length > 0 && items.every((i) => i.done);

  function tapDot(item: Item, dotIndex: number) {
    const next = dotIndex < item.setsDone ? dotIndex : dotIndex + 1;
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, setsDone: next, done: next >= i.sets } : i,
      ),
    );
    startTransition(() => setSetsDone(item.id, next));
  }

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Morning routine · after the bathroom</p>
        <h1 className={styles.title}>Move a little.</h1>
        <div className={styles.progress}>
          <div className={styles.bar}>
            <span
              style={{
                width: `${totalSets ? (doneSets / totalSets) * 100 : 0}%`,
              }}
            />
          </div>
          <span className={styles.progressLabel}>
            {doneSets} / {totalSets} sets
          </span>
        </div>
      </header>

      <ul className={styles.list}>
        {items.map((item) => (
          <li
            key={item.id}
            className={`${styles.exercise} ${item.done ? styles.exDone : ""}`}
          >
            <div className={styles.exHead}>
              <span className={styles.exName}>{item.name}</span>
              <span className={styles.exTarget}>
                {item.sets} × {item.target}
                {item.unit === "seconds" ? "s" : ""}
              </span>
            </div>
            <div className={styles.dots}>
              {Array.from({ length: item.sets }).map((_, d) => (
                <button
                  key={d}
                  type="button"
                  aria-label={`${item.name} set ${d + 1}`}
                  className={`${styles.dot} ${d < item.setsDone ? styles.dotOn : ""}`}
                  onClick={() => tapDot(item, d)}
                />
              ))}
            </div>
          </li>
        ))}
      </ul>

      {allDone ? (
        <p className={styles.doneNote}>
          Done for today — tomorrow nudges up a little. 💪
        </p>
      ) : null}
    </main>
  );
}
