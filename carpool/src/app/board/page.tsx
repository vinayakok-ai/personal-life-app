"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { DayBoard, Group, Member } from "@/lib/grouping";

interface BoardData {
  sat: DayBoard;
  sun: DayBoard;
}

export default function BoardPage() {
  const [data, setData] = useState<BoardData | null>(null);
  const [day, setDay] = useState<"sat" | "sun">("sat");
  const [query, setQuery] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch("/api/board", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const json = await res.json();
        if (alive) {
          setData(json);
          setError(false);
        }
      } catch {
        if (alive) setError(true);
      }
    }
    load();
    const t = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const board = data?.[day];
  const q = query.trim().toLowerCase();

  const corridors = useMemo(() => {
    if (!board) return [];
    if (!q) return board.corridors;
    const matches = (m: Member) =>
      m.name.toLowerCase().includes(q) || m.areaName.toLowerCase().includes(q);
    return board.corridors
      .map((c) => ({
        ...c,
        groups: c.groups.filter((g) => g.members.some(matches)),
        solo: c.solo.filter(matches),
      }))
      .filter((c) => c.groups.length > 0 || c.solo.length > 0);
  }, [board, q]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 pb-16">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🚗 Ride board</h1>
          <p className="text-sm text-stone-600">
            Polaris School of Technology, Whitefield · be there by 9:00 AM
          </p>
        </div>
        <Link
          href="/"
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700"
        >
          Join / edit
        </Link>
      </header>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {(["sat", "sun"] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDay(d)}
            className={`rounded-xl border px-4 py-2.5 font-semibold ${
              day === d
                ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                : "border-stone-300 bg-white text-stone-600"
            }`}
          >
            {d === "sat" ? "Saturday" : "Sunday"}
            {data && (
              <span className="ml-1.5 text-xs font-normal">
                ({data[d].totalRiders})
              </span>
            )}
          </button>
        ))}
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search your name or area…"
        className="mt-3 w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 outline-none focus:border-emerald-600"
      />

      {error && (
        <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          Couldn't load the board — check your connection and refresh.
        </p>
      )}
      {!data && !error && (
        <p className="mt-10 text-center text-stone-500">Loading ride groups…</p>
      )}
      {board && board.totalRiders === 0 && (
        <div className="mt-10 text-center text-stone-500">
          <p className="text-4xl">🌱</p>
          <p className="mt-2">
            Nobody has joined for this day yet — be the first!
          </p>
        </div>
      )}
      {board && board.totalRiders > 0 && corridors.length === 0 && q && (
        <p className="mt-10 text-center text-stone-500">
          No riders match “{query}”.
        </p>
      )}

      <div className="mt-5 space-y-4">
        {corridors.map((c) => (
          <details key={c.key} open className="group rounded-2xl border border-stone-200 bg-white">
            <summary className="flex cursor-pointer items-center justify-between px-4 py-3">
              <div>
                <span className="font-semibold">{c.name}</span>
                <span className="ml-2 text-xs text-stone-500">{c.routeHint}</span>
              </div>
              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                {c.riderCount}
              </span>
            </summary>
            <div className="space-y-3 px-4 pb-4">
              {c.groups.map((g) => (
                <GroupCard key={g.id} group={g} />
              ))}
              {c.solo.length > 0 && (
                <div className="rounded-xl border border-dashed border-stone-300 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Riding solo (own vehicle)
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {c.solo.map((m) => (
                      <MemberRow key={m.id} member={m} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </details>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-stone-500">
        Groups are first-come-first-served and update live as people join. Tap
        the WhatsApp icon on a group member to coordinate pickup points and
        fare split. 🌱 Every shared ride is one less car on Whitefield roads.
      </p>
    </main>
  );
}

function GroupCard({ group }: { group: Group }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold">
          {group.kind === "vehicle" ? "🚙 " : "🚕 "}
          {group.label}
        </p>
        <p className="text-sm font-semibold text-emerald-700">
          Leave by {group.leaveBy}
        </p>
      </div>
      <div className="mt-2 space-y-1.5">
        {group.members.map((m) => (
          <MemberRow key={m.id} member={m} />
        ))}
      </div>
      {group.seatsLeft > 0 && (
        <p className="mt-2 text-xs font-medium text-emerald-700">
          {group.seatsLeft} seat{group.seatsLeft > 1 ? "s" : ""} still open
        </p>
      )}
    </div>
  );
}

function MemberRow({ member }: { member: Member }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="min-w-0 truncate text-sm">
        <span className="font-medium">{member.name}</span>
        {member.isDriver && (
          <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
            {member.vehicleType === "BIKE" ? "BIKE" : "DRIVER"}
          </span>
        )}
        <span className="ml-1.5 text-stone-500">· {member.areaName}</span>
      </p>
      <a
        href={`https://wa.me/91${member.phone}`}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
      >
        WhatsApp
      </a>
    </div>
  );
}
