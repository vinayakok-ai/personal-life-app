"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { GroupView, MemberView } from "@/lib/board";
import { MemberRow, PHONE_KEY, Star, useBoard } from "@/components/shared";
import {
  CREW_ROUTES,
  CrewRoute,
  MAP_META,
  STOP_NAMES,
  VENUE,
  ZONE_COLORS,
} from "@/lib/crewroutes";

/* Web Mercator → stitched-basemap pixels */
function px(lat: number, lon: number): [number, number] {
  const n = 2 ** MAP_META.z;
  const x = ((lon + 180) / 360) * n * 256 - MAP_META.tx0 * 256;
  const y =
    ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * n * 256 -
    MAP_META.ty0 * 256;
  return [x, y];
}
const dpath = (pts: [number, number][]) =>
  pts.map((p, i) => (i ? "L" : "M") + px(p[1], p[0]).map((v) => v.toFixed(1)).join(" ")).join("");

interface Crew {
  group: GroupView;
  route: CrewRoute | null;
  label: string;
  leave: string;
}

/* Match a DB group to a curated route by member-phone overlap */
function matchRoute(g: GroupView): CrewRoute | null {
  let best: CrewRoute | null = null;
  let bestScore = 0;
  const phones = new Set(g.members.map((m) => m.phone));
  for (const r of CREW_ROUTES) {
    const score = r.phones.filter((p) => phones.has(p)).length;
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return bestScore > 0 ? best : null;
}

export default function BoardPage() {
  const { board, error } = useBoard();
  const [myPhone, setMyPhone] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null); // crew index
  const [showAll, setShowAll] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMyPhone(localStorage.getItem(PHONE_KEY));
  }, []);

  const view = board?.sat; // crews are identical Sat & Sun for this event

  const crews: Crew[] = useMemo(() => {
    if (!view) return [];
    const flat = view.corridors.flatMap((c) => c.groups);
    const list = flat.map((g) => {
      const route = matchRoute(g);
      return {
        group: g,
        route,
        label: route?.n ?? g.label,
        leave: route?.leave ?? g.leaveBy,
      };
    });
    list.sort((a, b) => {
      const ai = a.route ? CREW_ROUTES.indexOf(a.route) : 99;
      const bi = b.route ? CREW_ROUTES.indexOf(b.route) : 99;
      return ai - bi;
    });
    return list;
  }, [view]);

  const myCrewIdx = useMemo(() => {
    if (!myPhone) return null;
    const i = crews.findIndex((c) => c.group.members.some((m) => m.phone === myPhone));
    return i === -1 ? null : i;
  }, [crews, myPhone]);
  const meWaiting: MemberView | null =
    (myPhone && view?.waiting.find((m) => m.phone === myPhone)) || null;
  const myName =
    (myCrewIdx !== null && crews[myCrewIdx].group.members.find((m) => m.phone === myPhone)?.name) ||
    meWaiting?.name ||
    null;

  // personalized default: zoom to my crew
  useEffect(() => {
    if (myCrewIdx !== null && !showAll) setSelected(myCrewIdx);
  }, [myCrewIdx, showAll]);

  const activeRoute = selected !== null ? crews[selected]?.route ?? null : null;

  const worldTransform = useMemo(() => {
    if (!activeRoute) return "none";
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (const p of activeRoute.pts) {
      const [x, y] = px(p[1], p[0]);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const pad = 90;
    minX -= pad; minY -= pad; maxX += pad; maxY += pad;
    const s = Math.min(MAP_META.w / (maxX - minX), MAP_META.h / (maxY - minY), 3.2);
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    return `translate(${(((MAP_META.w / 2 - s * cx) / MAP_META.w) * 100).toFixed(3)}%, ${(((MAP_META.h / 2 - s * cy) / MAP_META.h) * 100).toFixed(3)}%) scale(${s.toFixed(3)})`;
  }, [activeRoute]);

  function pick(i: number | null, scroll = false) {
    setSelected(i);
    if (scroll) mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const [vx, vy] = px(VENUE.lat, VENUE.lon);
  const totalRiders = view ? view.totalRiders : 0;

  const focusList: Crew[] =
    myCrewIdx !== null && !showAll ? [crews[myCrewIdx]] : crews;

  return (
    <main className="mx-auto max-w-2xl px-4 pb-20 pt-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="serif text-[24px] font-bold leading-tight">
            <Star /> Ride board
          </h1>
          <p className="mt-0.5 text-[13px] text-[var(--soft)]">
            Polaris School of Technology, Whitefield · be there by 9:00 AM · Sat &amp; Sun
          </p>
        </div>
        <Link
          href="/"
          className="shrink-0 rounded-xl bg-[var(--coral)] px-3.5 py-2 text-[13px] font-bold text-[var(--on-coral)]"
        >
          Join / edit
        </Link>
      </header>

      {myName && myCrewIdx !== null && (
        <div className="mt-3.5 flex items-center justify-between gap-2 rounded-xl bg-[var(--coral-soft)] px-3.5 py-2 text-[13.5px]">
          <span>
            🎟️ Riding as <b className="text-[var(--coral-deep)]">{myName}</b> — your crew:{" "}
            <b className="text-[var(--coral-deep)]">{crews[myCrewIdx].label}</b>
          </span>
        </div>
      )}
      {meWaiting && (
        <div className="mt-3.5 rounded-xl border-[1.5px] border-dashed border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 text-[13.5px]">
          🎫 <b>{meWaiting.name}</b>, you&apos;re on the standby list — the organizer will slot you
          into a crew shortly.
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-xl bg-[var(--danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--danger)]">
          Couldn&apos;t load the board — check your connection; it retries automatically.
        </p>
      )}

      {/* ---- map ---- */}
      <div
        ref={mapRef}
        className="mt-4 scroll-mt-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2.5 shadow-[var(--shadow)]"
      >
        <div className="flex gap-1.5 overflow-x-auto pb-2.5 pl-0.5 pt-0.5 [scrollbar-width:thin]">
          <Pill on={selected === null} onClick={() => { setShowAll(true); pick(null); }}>
            🗺️ All
          </Pill>
          {crews.map((c, i) => (
            <Pill key={c.group.id} on={selected === i} color={c.route ? ZONE_COLORS[c.route.zone] : undefined} onClick={() => pick(i)}>
              {c.label}
            </Pill>
          ))}
        </div>
        <div
          className="relative overflow-hidden rounded-xl bg-[#e8e4d8]"
          style={{ aspectRatio: `${MAP_META.w}/${MAP_META.h}` }}
        >
          <div
            className="absolute inset-0 origin-top-left motion-safe:transition-transform motion-safe:duration-500"
            style={{ transform: worldTransform }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/basemap.jpg" alt="Map of Bangalore" className="absolute inset-0 block h-full w-full" />
            <svg
              viewBox={`0 0 ${MAP_META.w} ${MAP_META.h}`}
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
            >
              {crews.map((c, i) => {
                if (!c.route) return null;
                if (selected !== null && selected !== i) return null;
                const r = c.route;
                const d = dpath(r.pts);
                const col = ZONE_COLORS[r.zone];
                return (
                  <g key={c.group.id}>
                    <path d={d} fill="none" stroke="#fff" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
                    <path
                      d={d}
                      fill="none"
                      stroke={col}
                      strokeWidth={6}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray={r.dash ? r.dash.split(" ").map((x) => Number(x) * 2.2).join(" ") : undefined}
                    />
                    {r.stops.map((s) => {
                      const [x, y] = px(s.lat, s.lon);
                      return (
                        <g key={s.k}>
                          <circle cx={x} cy={y} r={9 + s.n * 2.5} fill={col} stroke="#fff" strokeWidth={3} />
                          {selected === i && (
                            <text
                              x={x + 16}
                              y={y - 10}
                              fontSize={22}
                              fontWeight={700}
                              fill="#141413"
                              stroke="#fff"
                              strokeWidth={4}
                              paintOrder="stroke"
                            >
                              {STOP_NAMES[s.k] ?? s.k}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </g>
                );
              })}
              <circle cx={vx} cy={vy} r={15} fill="#d97757" stroke="#fff" strokeWidth={5} />
              <text
                x={vx}
                y={vy - 24}
                textAnchor="middle"
                fontSize={36}
                fontWeight={800}
                fill="#b85c3e"
                stroke="#fff"
                strokeWidth={6}
                paintOrder="stroke"
              >
                ✳ POLARIS · PST
              </text>
            </svg>
          </div>
          <span className="absolute bottom-1 right-1.5 rounded-md bg-white/75 px-1.5 text-[10px] text-[#333]">
            Map © OpenStreetMap contributors
          </span>
        </div>
        <div className="flex min-h-[30px] flex-wrap items-baseline gap-x-4 gap-y-1 px-1.5 pt-2.5 text-[13px]">
          {selected === null ? (
            <>
              <b className="text-[14px]">All crews</b>
              <span className="text-[var(--soft)]">
                {crews.length} routes · {totalRiders} riders · tap a pill or a crew below
              </span>
            </>
          ) : (
            <>
              <b className="text-[14px]" style={{ color: crews[selected]?.route ? ZONE_COLORS[crews[selected].route!.zone] : undefined }}>
                {crews[selected]?.label}
                {myCrewIdx === selected ? " · your ride" : ""}
              </b>
              <span className="text-[var(--soft)]">
                leave {crews[selected]?.leave}
                {crews[selected]?.route ? ` · ${crews[selected].route!.km} km by road` : ""}
              </span>
            </>
          )}
        </div>
      </div>

      {/* ---- crew cards ---- */}
      {!board && !error && <p className="mt-10 text-center text-[var(--soft)]">Loading crews…</p>}
      {view && crews.length === 0 && (
        <div className="mt-10 text-center text-[var(--soft)]">
          <p className="text-4xl">🌱</p>
          <p className="mt-2">Crews haven&apos;t been formed yet — check back soon.</p>
        </div>
      )}

      {focusList.length > 0 && (
        <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-widest text-[var(--soft)]">
          {myCrewIdx !== null && !showAll ? "Your crew" : "All crews · same for Sat & Sun"}
        </p>
      )}
      {focusList.map((c) => {
        const i = crews.indexOf(c);
        const mine = i === myCrewIdx;
        const col = c.route ? ZONE_COLORS[c.route.zone] : "var(--coral)";
        return (
          <div
            key={c.group.id}
            onClick={() => pick(i, true)}
            className={`mb-3.5 cursor-pointer overflow-hidden rounded-2xl border bg-[var(--surface)] shadow-[var(--shadow)] ${
              mine ? "border-[var(--coral)]" : "border-[var(--line)]"
            }`}
          >
            <div className="h-1.5" style={{ background: col }} />
            <div className="flex items-baseline justify-between gap-2 px-4 pt-2.5">
              <span className="text-[15px] font-bold">
                <span
                  className={`mr-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${
                    c.group.kind === "car"
                      ? "bg-[var(--coral-soft)] text-[var(--coral-deep)]"
                      : "bg-[var(--eco-soft)] text-[var(--eco)]"
                  }`}
                >
                  {c.group.kind === "car" ? "OWN VEHICLE" : "SHARED CAB"}
                </span>
                {c.label}
              </span>
              <span className="whitespace-nowrap text-[12.5px] font-bold text-[var(--coral-deep)]">
                Leave {c.leave}
              </span>
            </div>
            <p className="px-4 pb-1.5 pt-0.5 text-[12px] text-[var(--soft)]">
              {c.route ? `${c.route.km} km by road · ` : ""}tap to see the route ⤴
            </p>
            <div className="px-4 pb-1">
              {c.group.members.map((m) => (
                <MemberRow key={m.id} member={m} />
              ))}
            </div>
            {c.group.seatsLeft > 0 ? (
              <p className="mx-4 mb-3 mt-1 rounded-lg bg-[var(--eco-soft)] px-3 py-1.5 text-[12px] font-semibold text-[var(--eco)]">
                {c.group.seatsLeft} seat{c.group.seatsLeft > 1 ? "s" : ""} open
              </p>
            ) : (
              <div className="h-2.5" />
            )}
          </div>
        );
      })}
      {myCrewIdx !== null && !showAll && crews.length > 1 && (
        <button
          onClick={() => { setShowAll(true); pick(null); }}
          className="mt-1 block w-full rounded-[13px] border-[1.5px] border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-[13.5px] font-bold"
        >
          Show all {crews.length} crews ↓
        </button>
      )}

      {view && view.waiting.length > 0 && (
        <section className="mt-6 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
          <div className="flex items-baseline justify-between gap-2 bg-[var(--surface-2)] px-3.5 py-2.5">
            <span className="text-[13.5px] font-bold">⏳ Waiting for grouping</span>
            <span className="text-[11px] text-[var(--soft)]">{view.waiting.length}</span>
          </div>
          <div className="p-3.5">
            <p className="mb-2 rounded-xl border-[1.5px] border-dashed border-[var(--line)] px-3 py-2 text-[12.5px] text-[var(--soft)]">
              Joined after the crews were formed — the organizer will slot you in.
            </p>
            {view.waiting.map((m) => (
              <MemberRow key={m.id} member={m} />
            ))}
          </div>
        </section>
      )}

      <p className="mt-7 text-center text-[11.5px] text-[var(--soft)]">
        Tap WhatsApp on a crew-mate to fix pickup points &amp; split the fare.
        <br />🌱 Every shared ride is one less car on Whitefield roads.
      </p>
    </main>
  );
}

function Pill({
  on,
  color,
  onClick,
  children,
}: {
  on: boolean;
  color?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] px-3 py-1.5 text-[12.5px] font-semibold ${
        on
          ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)]"
          : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink)]"
      }`}
    >
      {color && <span className="size-2 flex-none rounded-full" style={{ background: color }} />}
      {children}
    </button>
  );
}
