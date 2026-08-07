"use client";

import { useEffect, useState } from "react";
import type { BoardView, GroupView, MemberView } from "@/lib/board";

export const PHONE_KEY = "carpool_phone";

export function Star({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`inline-block size-[1em] align-[-0.12em] ${className}`}>
      <path
        fill="var(--coral)"
        d="M12 1l1.6 7.3 6-4.4-4.4 6L22.5 12l-7.3 1.6 4.4 6-6-4.4L12 22.5l-1.6-7.3-6 4.4 4.4-6L1.5 12l7.3-1.6-4.4-6 6 4.4z"
      />
    </svg>
  );
}

export function Confetti({ fireKey }: { fireKey: number }) {
  const [items, setItems] = useState<{ id: number; left: number; delay: number; emoji: string }[]>([]);
  useEffect(() => {
    if (!fireKey) return;
    const em = ["🎉", "✳️", "🚗", "🌱", "🧡", "✨"];
    setItems(
      Array.from({ length: 26 }, (_, i) => ({
        id: fireKey * 100 + i,
        left: 3 + ((i * 37) % 94),
        delay: (i % 9) * 0.09,
        emoji: em[i % em.length],
      }))
    );
    const t = setTimeout(() => setItems([]), 2600);
    return () => clearTimeout(t);
  }, [fireKey]);
  if (!items.length) return null;
  return (
    <div className="confetti">
      {items.map((c) => (
        <span key={c.id} style={{ left: `${c.left}vw`, animationDelay: `${c.delay}s` }}>
          {c.emoji}
        </span>
      ))}
    </div>
  );
}

export function MemberRow({ member }: { member: MemberView }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <p className="min-w-0 truncate text-[13.5px]">
        <span className="font-semibold">{member.name}</span>
        {member.isDriver && (
          <span className="ml-1.5 rounded-md bg-[var(--coral-soft)] px-1.5 py-0.5 text-[9.5px] font-bold tracking-wide text-[var(--coral-deep)]">
            {member.vehicleType === "BIKE" ? "BIKE" : "DRIVER"}
          </span>
        )}
        <span className="text-[var(--soft)]"> · {member.areaName}</span>
      </p>
      <a
        href={`https://wa.me/91${member.phone}`}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 rounded-lg bg-[var(--eco)] px-2.5 py-1 text-[11px] font-bold text-[var(--surface)]"
      >
        WhatsApp
      </a>
    </div>
  );
}

export function Ticket({ group, routeHint }: { group: GroupView; routeHint: string }) {
  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
      <div className={`h-[7px] ${group.kind === "cab" ? "bg-[var(--eco)]" : "bg-[var(--coral)]"}`} />
      <div className="px-4 pb-3 pt-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="serif text-[26px] font-bold leading-none">
            {group.fromCode}
            <small className="mt-1 block font-sans text-[10px] font-semibold uppercase tracking-widest text-[var(--soft)]">
              {group.fromArea}
            </small>
          </span>
          <span className="flex-1 text-center text-[17px] text-[var(--coral)]">✳ – – – – ➤</span>
          <span className="serif text-right text-[26px] font-bold leading-none">
            PST
            <small className="mt-1 block font-sans text-[10px] font-semibold uppercase tracking-widest text-[var(--soft)]">
              Whitefield
            </small>
          </span>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5">
          <Meta k="Ride" v={group.label} />
          <Meta k="Boarding" v={group.leaveBy} />
          <Meta k="Route" v={routeHint} />
          <Meta
            k="Crew"
            v={`${group.members.length}${group.seatsLeft > 0 ? ` · ${group.seatsLeft} open` : ""}`}
          />
        </div>
      </div>
      <div className="ticket-perf" />
      <div className="px-4 pb-1 pt-2.5">
        <p className="mb-1 text-[9.5px] font-bold uppercase tracking-widest text-[var(--soft)]">
          Crew manifest
        </p>
        {group.members.map((m) => (
          <MemberRow key={m.id} member={m} />
        ))}
      </div>
      <div className="barcode mx-4 mb-3.5 mt-2" title="Purely decorative — do not scan at airports." />
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-[72px]">
      <div className="text-[9.5px] font-bold uppercase tracking-widest text-[var(--soft)]">{k}</div>
      <div className="text-[13.5px] font-bold tabular-nums">{v}</div>
    </div>
  );
}

export function GroupCard({ group }: { group: GroupView }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[13.5px] font-bold">
          <span
            className={`mr-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${
              group.kind === "car"
                ? "bg-[var(--coral-soft)] text-[var(--coral-deep)]"
                : "bg-[var(--eco-soft)] text-[var(--eco)]"
            }`}
          >
            {group.kind === "car" ? "OWN VEHICLE" : "SHARED CAB"}
          </span>
          {group.label}
        </span>
        <span className="whitespace-nowrap text-[12.5px] font-bold text-[var(--coral-deep)]">
          Leave by {group.leaveBy}
        </span>
      </div>
      {group.members.map((m) => (
        <MemberRow key={m.id} member={m} />
      ))}
      {group.seatsLeft > 0 && (
        <p className="mt-1 text-[11.5px] font-semibold text-[var(--eco)]">
          {group.seatsLeft} seat{group.seatsLeft > 1 ? "s" : ""} still open
        </p>
      )}
    </div>
  );
}

export function useBoard(pollMs = 30000) {
  const [board, setBoard] = useState<BoardView | null>(null);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/board", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const json = await res.json();
        if (alive) {
          setBoard(json);
          setError(false);
        }
      } catch {
        if (alive) setError(true);
      }
    })();
    const t = setInterval(() => setTick((n) => n + 1), pollMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [tick, pollMs]);
  return { board, error, refresh: () => setTick((n) => n + 1) };
}
