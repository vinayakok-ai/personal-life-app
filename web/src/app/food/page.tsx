import { prisma } from "@/lib/prisma";
import { addItemForm, adjust, remove } from "./actions";
import styles from "./food.module.css";

export const dynamic = "force-dynamic";

export default async function FoodPage() {
  const items = await prisma.pantryItem.findMany({ orderBy: { name: "asc" } });

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Food · pantry</p>
        <h1 className={styles.title}>What&apos;s in stock</h1>
      </header>

      <form action={addItemForm} className={styles.addRow}>
        <input
          name="name"
          className={styles.nameInput}
          placeholder="Add a grocery…"
          autoComplete="off"
          required
        />
        <input
          name="qty"
          className={styles.qtyInput}
          inputMode="decimal"
          defaultValue="1"
          aria-label="Quantity"
        />
        <button type="submit" className={styles.addBtn}>
          Add
        </button>
      </form>

      {items.length === 0 ? (
        <p className={styles.empty}>
          Your pantry&apos;s empty. Add what you buy — and tap − as you cook.
        </p>
      ) : (
        <ul className={styles.list}>
          {items.map((item) => (
            <li
              key={item.id}
              className={`${styles.item} ${item.quantity === 0 ? styles.out : ""}`}
            >
              <span className={styles.itemName}>{item.name}</span>
              <form className={styles.stepper}>
                <button
                  className={styles.step}
                  formAction={adjust.bind(null, item.id, -1)}
                  aria-label={`Use one ${item.name}`}
                >
                  −
                </button>
                <span className={styles.qty}>{item.quantity}</span>
                <button
                  className={styles.step}
                  formAction={adjust.bind(null, item.id, 1)}
                  aria-label={`Add one ${item.name}`}
                >
                  +
                </button>
                <button
                  className={styles.remove}
                  formAction={remove.bind(null, item.id)}
                  aria-label={`Remove ${item.name}`}
                >
                  ×
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
