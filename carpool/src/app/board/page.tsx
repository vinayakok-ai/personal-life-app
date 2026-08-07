"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Day, GroupView, MemberView } from "@/lib/board";
import { GroupCard, MemberRow, PHONE_KEY, Star, Ticket, useBoard } from "@/components/shared";

export default function BoardPage() {
  const { board, error } = useBoard();
  const [day, setDay] = useState<Day>("SAT");
  const [query, setQuery] = useState("");
  const [myPhone, setMyPhone] = useState<string | null>(null);

  useEffect(() => {
    setMyPhone(localStorage.getItem(PHONE_KEY));
  }, []);

  const view = board?.[day === "SAT" ? "sat" : "sun"];
  const q = query.trim().toLowerCase();

  const myGroup: GroupView | null = useMemo(() => {
    if (!view || !myPhone) return null;
    for (const c of view.corridors)
      for (const g of c.groups)
        if (g.members.some((m) => m.phone === myPhone)) return g;
    return null;
  }, [view, myPhone]);
  const meWaiting: MemberView | null =
    (myPhone && view?.waiting.find((m) => m.phone === myPhone)) || null;

  const matches = (m: MemberView) =>
    !q || m.name.toLowerCase().includes(q) || m.areaName.toLowerCase().includes(q);

  return (
    <main className="mx-auto max-w-xl px-5 pb-20 pt-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="serif text-[24px] font-bold leading-tight">
            <Star /> Ride board
          </h1>
          <p className="mt-0.5 text-[13px] text-[var(--soft)]">
            Polaris School of Technology, Whitefield · be there by 9:00 AM
          </p>
        </div>
        <Link
          href="/"
          className="shrink-0 rounded-xl bg-[var(--coral)] px-3.5 py-2 text-[13px] font-bold text-[var(--on-coral)]"
        >
          Join / edit
        </Link>
      </header>

      <div className="mt-4 flex gap-2">
        {(["SAT", "SUN"] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDay(d)}
            className={`flex-1 rounded-xl border-[1.5px] px-3 py-2.5 text-[13.5px] font-bold ${
              day === d
                ? "border-[var(--coral)] bg-[var(--coral-soft)] text-[var(--coral-deep)]"
                : "border-[var(--line)] bg-[var(--surface)] text-[var(--soft)]"
            }`}
          >
            {d === "SAT" ? "Saturday" : "Sunday"}
            {board && (
              <span className="ml-1 font-normal">
                ({board[d === "SAT" ? "sat" : "sun"].totalRiders})
              </span>
            )}
          </button>
        ))}
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search your name or area…"
        className="mt-3 w-full rounded-xl border-[1.5px] border-[var(--line)] bg-[var(--surface)] px-3.5 py-2.5 outline-none focus:border-[var(--coral)]"
      />

      {error && (
        <p className="mt-5 rounded-xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--danger)]">
          Couldn&apos;t load the board — check your connection; it retries automatically.
        </p>
      )}
      {!board && !error && (
        <p className="mt-12 text-center text-[var(--soft)]">Loading ride crews…</p>
      )}

      {meWaiting && (
        <div className="mt-4 rounded-2xl border-[1.5px] border-dashed border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-[13.5px]">
          🎫 <b>{meWaiting.name}</b>, your ticket is at the printers — the organizer is forming
          crews. It&apos;ll appear right here.
        </div>
      )}
      {myGroup && (
        <div className="mt-4">
          <p className="mb-1.5 text-[11.5px] font-bold uppercase tracking-widest text-[var(--soft)]">
            Your ticket
          </p>
          <Ticket
            group={myGroup}
            routeHint={view!.corridors.find((c) => c.key === myGroup.corridor)?.routeHint ?? ""}
          />
        </div>
      )}

      {view && view.totalRiders === 0 && (
        <div className="mt-12 text-center text-[var(--soft)]">
          <p className="text-4xl">🌱</p>
          <p className="mt-2">Nobody has joined for this day yet — be the first!</p>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3.5">
        {view?.corridors.map((c) => {
          const shown = c.groups.filter((g) => g !== myGroup && g.members.some(matches));
          if (!shown.length) return null;
          return (
            <section key={c.key} className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
              <div className="flex items-baseline justify-between gap-2 bg-[var(--surface-2)] px-3.5 py-2.5">
                <span className="text-[13.5px] font-bold">
                  {c.name}{" "}
                  <span className="text-[11px] font-normal text-[var(--soft)]">{c.routeHint}</span>
                </span>
                <span className="text-[11px] text-[var(--soft)]">{c.riderCount}</span>
              </div>
              <div className="flex flex-col gap-2.5 p-3.5">
                {shown.map((g) => (
                  <GroupCard key={g.id} group={g} />
                ))}
              </div>
            </section>
          );
        })}

        {view && view.waiting.filter(matches).length > 0 && (
          <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
            <div className="flex items-baseline justify-between gap-2 bg-[var(--surface-2)] px-3.5 py-2.5">
              <span className="text-[13.5px] font-bold">⏳ Waiting for grouping</span>
              <span className="text-[11px] text-[var(--soft)]">{view.waiting.length}</span>
            </div>
            <div className="p-3.5">
              <p className="mb-2 rounded-xl border-[1.5px] border-dashed border-[var(--line)] px-3 py-2 text-[12.5px] text-[var(--soft)]">
                The organizer places new joiners into crews — usually within a few hours.
              </p>
              {view.waiting.filter(matches).map((m) => (
                <MemberRow key={m.id} member={m} />
              ))}
            </div>
          </section>
        )}
      </div>

      {board && (
        <p className="mt-7 text-center text-[11.5px] text-[var(--soft)]">
          Tap WhatsApp on a crew-mate to fix pickup points &amp; split the fare.
          <br />🌱 {board.stats.co2Kg} kg CO₂ saved by sharing · every shared ride is one less car on
          Whitefield roads.
        </p>
      )}
    </main>
  );
}
