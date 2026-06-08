import Link from "next/link";
import styles from "./home.module.css";
import ThemeToggle from "@/components/ThemeToggle";
import StepsNode from "./StepsNode";
import { getTodayDay } from "@/lib/time";
import { getTodaySteps } from "@/lib/workout";

export const dynamic = "force-dynamic";

function periodClass(period: string) {
  if (period === "evening") return styles.eve;
  if (period === "night") return styles.night;
  return "";
}

function hrefFor(kind: string, id: string) {
  if (kind === "workout") return "/workout";
  if (kind === "journal") return "/journal/new";
  return `/day/${id}`;
}

export default async function Home() {
  const [habits, todaySteps] = await Promise.all([
    getTodayDay(),
    getTodaySteps(),
  ]);

  const now = new Date();
  const weekday = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    timeZone: "Asia/Kolkata",
  }).format(now);
  const dayMonth = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    timeZone: "Asia/Kolkata",
  }).format(now);
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hour12: false,
      timeZone: "Asia/Kolkata",
    }).format(now),
  );
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <main className={styles.app}>
      <header className={styles.header}>
        <div>
          <p className={styles.date}>
            {weekday} · {dayMonth}
          </p>
          <h1 className={styles.greeting}>{greeting}, Vinayak</h1>
        </div>
        <ThemeToggle />
      </header>

      <div className={styles.timeline}>
        {habits.map((h) => {
          const base = `${styles.stop} ${h.done ? styles.done : ""} ${periodClass(h.period)}`;

          if (h.kind === "steps") {
            return (
              <div key={h.id} className={base}>
                <span className={styles.dot} />
                <h3 className={styles.title}>{h.label}</h3>
                <p className={styles.cue}>{h.cue}</p>
                <StepsNode initialSteps={todaySteps} />
              </div>
            );
          }

          return (
            <Link
              key={h.id}
              href={hrefFor(h.kind, h.id)}
              className={`${base} ${styles.stopLink}`}
            >
              <span className={styles.dot} />
              <h3 className={styles.title}>{h.label}</h3>
              <p className={styles.cue}>{h.cue}</p>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
