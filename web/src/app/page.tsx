import Link from "next/link";
import styles from "./home.module.css";
import ThemeToggle from "@/components/ThemeToggle";

type Step = {
  time: string;
  lead?: string;
  title: string;
  note?: string;
  state?: "done" | "now" | "eve" | "night";
  chips?: string[];
  cap?: boolean;
};

// Placeholder data — wired to the DB in a later slice.
const steps: Step[] = [
  { time: "7:00", title: "Out of bed", state: "done" },
  { time: "7:05", title: "Bathroom", state: "done" },
  {
    time: "7:10",
    lead: "Workout",
    title: " — 5 min",
    note: "after the bathroom · do it before you sit down",
    state: "now",
  },
  { time: "7:25", title: "Brush & shower" },
  { time: "7:40", title: "Smoothie", note: "spinach + cucumber" },
  { time: "8:00", title: "Start work" },
  { time: "—", title: "How are you feeling?", cap: true },
  { time: "13:00", title: "Break → make lunch" },
  {
    time: "18:30",
    title: "Free this evening?",
    chips: ["Movie trailer", "Call family", "This app"],
    state: "eve",
  },
  {
    time: "23:00",
    title: "Read, then sleep",
    note: "aiming earlier than last night",
    state: "night",
  },
];

const stateClass: Record<NonNullable<Step["state"]>, string> = {
  done: styles.done,
  now: styles.now,
  eve: styles.eve,
  night: styles.night,
};

export default function Home() {
  return (
    <main className={styles.app}>
      <header className={styles.header}>
        <div>
          <p className={styles.date}>Sunday · 7 June</p>
          <h1 className={styles.greeting}>Good morning, Vinayak</h1>
        </div>
        <ThemeToggle />
      </header>

      <div className={styles.timeline}>
        {steps.map((s, i) => (
          <div
            key={i}
            className={`${styles.stop} ${s.state ? stateClass[s.state] : ""}`}
          >
            <span className={styles.time}>{s.time}</span>
            <span className={styles.dot} />
            <h3 className={styles.title}>
              {s.lead ? <b>{s.lead}</b> : null}
              {s.title}
            </h3>
            {s.note ? <p className={styles.note}>{s.note}</p> : null}
            {s.cap ? (
              <Link href="/journal/new" className={styles.cap}>
                <b>hold to talk</b> anytime
              </Link>
            ) : null}
            {s.chips ? (
              <div className={styles.chips}>
                {s.chips.map((c) => (
                  <span key={c} className={styles.chip}>
                    {c}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </main>
  );
}
