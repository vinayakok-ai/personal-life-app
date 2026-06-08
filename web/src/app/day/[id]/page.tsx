import Link from "next/link";
import { notFound } from "next/navigation";
import { getHabit, isHabitDoneToday } from "@/lib/time";
import { toggleHabit } from "./actions";
import styles from "./day.module.css";

export const dynamic = "force-dynamic";

export default async function HabitDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const habit = await getHabit(id);
  if (!habit) notFound();

  const done = await isHabitDoneToday(id);

  return (
    <main className={styles.screen}>
      <Link href="/" className={styles.back}>
        ← Today
      </Link>

      <p className={styles.cue}>{habit.cue}</p>
      <h1 className={styles.title}>{habit.label}</h1>
      {habit.note ? <p className={styles.note}>{habit.note}</p> : null}

      {habit.link ? (
        <Link href={habit.link} className={styles.openLink}>
          Open →
        </Link>
      ) : null}

      <form action={toggleHabit.bind(null, id, !done)} className={styles.form}>
        <button
          type="submit"
          className={`${styles.doneBtn} ${done ? styles.doneActive : ""}`}
        >
          {done ? "✓ Done today" : "Mark as done"}
        </button>
      </form>

      <p className={styles.future}>
        Tasks & details for this will live here soon.
      </p>
    </main>
  );
}
