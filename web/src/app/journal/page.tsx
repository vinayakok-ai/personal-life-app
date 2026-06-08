import Link from "next/link";
import { prisma } from "@/lib/prisma";
import styles from "./journal.module.css";

export const dynamic = "force-dynamic";

function formatWhen(d: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(d);
}

export default async function JournalPage() {
  const entries = await prisma.journalEntry.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className={styles.list}>
      <header className={styles.header}>
        <div>
          <Link href="/" className={styles.back}>
            ← Today
          </Link>
          <h1 className={styles.title}>Journal</h1>
        </div>
        <Link href="/journal/new" className={styles.newBtn}>
          ＋ New
        </Link>
      </header>

      {entries.length === 0 ? (
        <p className={styles.empty}>
          Nothing here yet. Tap{" "}
          <Link href="/journal/new" className={styles.inlineLink}>
            New
          </Link>{" "}
          and get the first thing off your chest.
        </p>
      ) : (
        <ul className={styles.entries}>
          {entries.map((e) => (
            <li key={e.id} className={styles.entry}>
              <time className={styles.entryTime}>{formatWhen(e.createdAt)}</time>
              <p className={styles.entryBody}>{e.body}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
