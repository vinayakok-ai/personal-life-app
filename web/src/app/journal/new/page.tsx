import Link from "next/link";
import styles from "../journal.module.css";
import { createJournalEntry } from "../actions";

export default function NewJournalEntry() {
  return (
    <main className={styles.composer}>
      <header className={styles.cHeader}>
        <Link href="/journal" className={styles.back}>
          ← Cancel
        </Link>
      </header>

      <form action={createJournalEntry} className={styles.form}>
        <textarea
          name="body"
          className={styles.textarea}
          placeholder="What's on your mind? Type, or tap the mic on your keyboard and just talk."
          rows={10}
          autoFocus
          required
        />
        <button type="submit" className={styles.save}>
          Save entry
        </button>
      </form>
    </main>
  );
}
