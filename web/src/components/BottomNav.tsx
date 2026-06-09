"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./BottomNav.module.css";

function TodayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 18h18" />
      <path d="M7 18a5 5 0 0 1 10 0" />
      <path d="M12 3.5v2.5M5 8.8l1.6 1.6M19 8.8l-1.6 1.6" />
    </svg>
  );
}

function WorkoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11" />
    </svg>
  );
}

function FoodIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8h16l-1.3 10.2a2 2 0 0 1-2 1.8H7.3a2 2 0 0 1-2-1.8z" />
      <path d="M8.5 8 12 3.5 15.5 8" />
      <path d="M9.8 12v4M14.2 12v4" />
    </svg>
  );
}

function JournalIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3.5h11a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1H6.5A1.5 1.5 0 0 1 5 19.5v-14A2 2 0 0 1 6 3.5z" />
      <path d="M9 8h6M9 11.5h6" />
    </svg>
  );
}

const items = [
  { href: "/", label: "Today", Icon: TodayIcon, isActive: (p: string) => p === "/" },
  {
    href: "/workout",
    label: "Workout",
    Icon: WorkoutIcon,
    isActive: (p: string) => p.startsWith("/workout"),
  },
  {
    href: "/food",
    label: "Food",
    Icon: FoodIcon,
    isActive: (p: string) => p.startsWith("/food"),
  },
  {
    href: "/journal",
    label: "Journal",
    Icon: JournalIcon,
    isActive: (p: string) => p.startsWith("/journal"),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Keep the full-screen composer and the sign-in page distraction-free.
  if (pathname === "/journal/new" || pathname === "/signin") return null;

  return (
    <nav className={styles.nav} aria-label="Primary">
      <div className={styles.inner}>
        {items.map(({ href, label, Icon, isActive }) => {
          const active = isActive(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={`${styles.item} ${active ? styles.active : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <Icon />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
