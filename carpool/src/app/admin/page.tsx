"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Day, MemberView } from "@/lib/board";
import { Star, useBoard } from "@/components/shared";

const ADMIN_KEY = "carpool_admin_code";

export default function AdminPage() {
  const { board, refresh } = useBoard();
  const [code, setCode] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [day, setDay] = useState<Day>("SAT");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setCode(localStorage.getItem(ADMIN_KEY));
  }, []);

  async function call(payload: Record<string, unknown>): Promise<boolean> {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-code": code ?? "" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "That didn't work — try again.");
        if (res.status === 403 && payload.action !== "login") {
          localStorage.removeItem(ADMIN_KEY);
          setCode(null);
        }
        return false;
      }
      refresh();
      return true;
    } catch {
      setMsg("Network error — try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const view = board?.[day === "SAT" ? "sat" : "sun"];
  const waiting = useMemo(() => view?.waiting ?? [], [view]);
  const selMembers = waiting.filter((m) => sel.has(m.id));

  useEffect(() => {
    setSel((old) => {
      const keep = new Set([...old].filter((id) => waiting.some((m) => m.id === id)));
      return keep.size === old.size ? old : keep;
    });
  }, [waiting]);

  const btn =
    "rounded-[10px] bg-[var(--coral)] px-3.5 py-2 text-[13px] font-bold text-[var(--on-coral)] disabled:opacity-40";
  const ghost =
    "rounded-[10px] border-[1.5px] border-[var(--line)] bg-[var(--surface)] px-3.5 py-2 text-[13px] font-semibold disabled:opacity-40";

  if (code === null) {
    return (
      <main className="mx-auto max-w-md px-5 pt-10 text-center">
        <div className="text-[36px]">🔐</div>
        <h1 className="serif mt-2 text-[22px] font-bold">Organizer access</h1>
        <p className="mt-1.5 text-[13px] text-[var(--soft)]">
          Enter the organizer passcode. Riders don&apos;t need this — it&apos;s only for the folks
          forming groups.
        </p>
        {msg && (
          <p className="mt-3 rounded-xl bg-[var(--danger-soft)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--danger)]">
            {msg}
          </p>
        )}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && unlock()}
          placeholder="Passcode"
          className="mt-4 w-full rounded-xl border-[1.5px] border-[var(--line)] bg-[var(--surface)] px-3.5 py-2.5 text-center outline-none focus:border-[var(--coral)]"
        />
        <button className={`${btn} mt-3 w-full py-3 text-[15px]`} disabled={busy} onClick={unlock}>
          Unlock
        </button>
        <Link href="/board" className="mt-4 inline-block text-[13px] font-semibold text-[var(--coral-deep)] underline">
          ← Back to the board
        </Link>
      </main>
    );
  }

  async function unlock() {
    const attempt = input.trim();
    if (!attempt) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-code": attempt },
        body: JSON.stringify({ action: "login" }),
      });
      if (res.ok) {
        localStorage.setItem(ADMIN_KEY, attempt);
        setCode(attempt);
        setMsg(null);
      } else {
        setMsg("Wrong passcode.");
      }
    } catch {
      setMsg("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  const selCaptains = selMembers.filter((m) => m.vehicleType && m.spareSeats > 0);

  return (
    <main className="mx-auto max-w-xl px-5 pb-20 pt-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="serif text-[24px] font-bold leading-tight">
            <Star /> Organizer console
          </h1>
          <p className="mt-0.5 text-[13px] text-[var(--soft)]">
            Tick riders → group them. Auto-group handles whoever&apos;s left.
          </p>
        </div>
        <Link href="/board" className={ghost}>
          Board
        </Link>
      </header>

      <div className="mt-4 flex gap-2">
        {(["SAT", "SUN"] as const).map((d) => (
          <button
            key={d}
            onClick={() => {
              setDay(d);
              setSel(new Set());
            }}
            className={`flex-1 rounded-xl border-[1.5px] px-3 py-2.5 text-[13.5px] font-bold ${
              day === d
                ? "border-[var(--coral)] bg-[var(--coral-soft)] text-[var(--coral-deep)]"
                : "border-[var(--line)] bg-[var(--surface)] text-[var(--soft)]"
            }`}
          >
            {d === "SAT" ? "Saturday" : "Sunday"}
          </button>
        ))}
      </div>

      <div className="mt-3.5 flex flex-wrap gap-2">
        <button
          className={btn}
          disabled={busy || sel.size === 0}
          onClick={async () => {
            if (await call({ action: "group", day, riderIds: [...sel] })) {
              setSel(new Set());
              setMsg("Crew formed ✳️");
            }
          }}
        >
          Group selected ({sel.size})
        </button>
        <button
          className={ghost}
          disabled={busy || waiting.length === 0}
          onClick={async () => {
            if (await call({ action: "auto", day })) setMsg("⚡ Auto-grouped the rest");
          }}
        >
          ⚡ Auto-group the rest ({waiting.length})
        </button>
        <button
          className={ghost}
          disabled={busy || !view || view.corridors.length === 0}
          onClick={async () => {
            if (await call({ action: "ungroupAll", day }))
              setMsg("Groups cleared — everyone's back in the pool");
          }}
        >
          Ungroup all
        </button>
      </div>

      {msg && (
        <p className="mt-3 rounded-xl bg-[var(--surface-2)] px-3.5 py-2.5 text-[13px] font-semibold">
          {msg}
        </p>
      )}
      {selCaptains.length > 1 && (
        <p className="mt-3 rounded-xl bg-[var(--danger-soft)] px-3.5 py-2.5 text-[13px] font-semibold text-[var(--danger)]">
          {selCaptains.length} vehicle owners selected — they&apos;d land in one crew. Usually pick
          one per group.
        </p>
      )}

      <h2 className="mt-6 text-[11px] font-bold uppercase tracking-widest text-[var(--soft)]">
        Waiting · first-come-first-served order
      </h2>
      {!board && <p className="mt-3 text-[var(--soft)]">Loading…</p>}
      {board && waiting.length === 0 && (
        <p className="mt-2 rounded-xl border-[1.5px] border-dashed border-[var(--line)] px-3.5 py-3 text-[13px] text-[var(--soft)]">
          Everyone for {day === "SAT" ? "Saturday" : "Sunday"} is grouped 🎉
        </p>
      )}
      <div className="mt-2 flex flex-col gap-1.5">
        {waiting.map((m) => (
          <WaitRow
            key={m.id}
            m={m}
            selected={sel.has(m.id)}
            onToggle={() =>
              setSel((old) => {
                const next = new Set(old);
                if (next.has(m.id)) next.delete(m.id);
                else next.add(m.id);
                return next;
              })
            }
          />
        ))}
      </div>

      <h2 className="mt-7 text-[11px] font-bold uppercase tracking-widest text-[var(--soft)]">
        Crews ({view?.corridors.reduce((n, c) => n + c.groups.length, 0) ?? 0})
      </h2>
      <div className="mt-2 flex flex-col gap-2.5">
        {view?.corridors.flatMap((c) =>
          c.groups.map((g) => (
            <div key={g.id} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 py-3">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="text-[13.5px] font-bold">
                  <span
                    className={`mr-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${
                      g.kind === "car"
                        ? "bg-[var(--coral-soft)] text-[var(--coral-deep)]"
                        : "bg-[var(--eco-soft)] text-[var(--eco)]"
                    }`}
                  >
                    {g.kind === "car" ? "OWN VEHICLE" : "SHARED CAB"}
                  </span>
                  {g.label}
                  {g.auto && (
                    <span className="ml-1.5 rounded-md bg-[var(--surface-2)] px-1.5 py-0.5 text-[9.5px] font-bold text-[var(--soft)]">
                      AUTO
                    </span>
                  )}
                </span>
                <span className="whitespace-nowrap text-[12.5px] font-bold text-[var(--coral-deep)]">
                  Leave {g.leaveBy}
                </span>
              </div>
              <p className="mb-1 text-[11px] text-[var(--soft)]">{c.name}</p>
              {g.members.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 py-0.5">
                  <span className="min-w-0 truncate text-[13.5px]">
                    <b>{m.name}</b>
                    {m.isDriver && (
                      <span className="ml-1.5 rounded-md bg-[var(--coral-soft)] px-1.5 py-0.5 text-[9.5px] font-bold text-[var(--coral-deep)]">
                        DRIVER
                      </span>
                    )}
                    <span className="text-[var(--soft)]"> · {m.areaName}</span>
                  </span>
                  <button
                    className="text-[11px] font-bold text-[var(--danger)]"
                    disabled={busy}
                    onClick={() => call({ action: "removeMember", day, riderId: m.id })}
                  >
                    remove
                  </button>
                </div>
              ))}
              {g.seatsLeft > 0 && (
                <p className="mt-1 text-[11.5px] font-semibold text-[var(--eco)]">
                  {g.seatsLeft} seat{g.seatsLeft > 1 ? "s" : ""} open — removed riders go back to the
                  pool
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </main>
  );
}

function WaitRow({ m, selected, onToggle }: { m: MemberView; selected: boolean; onToggle: () => void }) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2.5 rounded-xl border-[1.5px] px-3 py-2 ${
        selected ? "border-[var(--coral)] bg-[var(--coral-soft)]" : "border-[var(--line)] bg-[var(--surface)]"
      }`}
    >
      <input type="checkbox" checked={selected} onChange={onToggle} className="size-4 accent-[var(--coral)]" />
      <span className="min-w-0 flex-1 text-[13.5px]">
        <b>{m.name}</b>
        {m.vehicleType && (
          <span className="ml-1.5 rounded-md bg-[var(--coral-soft)] px-1.5 py-0.5 text-[9.5px] font-bold text-[var(--coral-deep)]">
            {m.vehicleType} · {m.spareSeats} seat{m.spareSeats === 1 ? "" : "s"}
          </span>
        )}
        <span className="block text-[11.5px] text-[var(--soft)]">{m.areaName}</span>
      </span>
    </label>
  );
}
