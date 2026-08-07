import type { Rider, RideGroup } from "@prisma/client";
import { prisma } from "./db";
import { AREA_BY_KEY, CORRIDORS, CorridorKey } from "./areas";

// Groups are stored (admin-curated), but every derived detail — labels,
// seats left, leave-by times, corridor sections — is computed on each read.

export type Day = "SAT" | "SUN";

export interface MemberView {
  id: string;
  name: string;
  phone: string;
  areaName: string;
  isDriver: boolean;
  vehicleType: string | null;
  spareSeats: number;
}

export interface GroupView {
  id: string;
  kind: "car" | "cab";
  label: string;
  corridor: CorridorKey;
  auto: boolean;
  members: MemberView[];
  seatsLeft: number;
  leaveBy: string;
  fromArea: string;
  fromCode: string;
}

export interface CorridorView {
  key: CorridorKey;
  name: string;
  routeHint: string;
  code: string;
  groups: GroupView[];
  riderCount: number;
}

export interface DayView {
  day: Day;
  corridors: CorridorView[];
  waiting: MemberView[];
  totalRiders: number;
}

export interface BoardView {
  sat: DayView;
  sun: DayView;
  stats: { riders: number; sharing: number; savedPerDay: number; co2Kg: number };
}

const EVENT_START_MIN = 9 * 60;
const BUFFER_MIN = 25;
export const CAB_SIZE = 4;

export function areaLabel(r: Pick<Rider, "area" | "customArea">): string {
  if (r.area === "other" && r.customArea) return r.customArea;
  return AREA_BY_KEY[r.area]?.name ?? r.area;
}
export function corridorOf(r: Pick<Rider, "area">): CorridorKey {
  return (AREA_BY_KEY[r.area]?.corridor ?? "other") as CorridorKey;
}
function areaMinutes(r: Pick<Rider, "area">): number {
  return AREA_BY_KEY[r.area]?.minutes ?? 60;
}
export function onDay(r: Pick<Rider, "days">, day: Day): boolean {
  return r.days === day || r.days === "BOTH";
}
export function anchorCapacity(r: Pick<Rider, "vehicleType" | "spareSeats">): number {
  return r.vehicleType === "BIKE" ? Math.min(r.spareSeats, 1) : Math.min(r.spareSeats, 6);
}
export function leaveByFor(riders: Pick<Rider, "area">[]): string {
  const worst = Math.max(...riders.map(areaMinutes));
  let t = EVENT_START_MIN - worst - BUFFER_MIN;
  if (t < 0) t = 0;
  const h24 = Math.floor(t / 60);
  const m = t % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h24 >= 12 ? "PM" : "AM"}`;
}
export function seatsLeftFor(g: RideGroup, members: Rider[]): number {
  if (g.kind === "car") {
    const anchor = members.find((m) => m.id === g.anchorId);
    const cap = anchor ? anchorCapacity(anchor) : 0;
    return Math.max(0, cap - (members.length - 1));
  }
  return Math.max(0, CAB_SIZE - members.length);
}

function toMember(r: Rider, g: RideGroup | null): MemberView {
  const isDriver = !!g && g.kind === "car" && g.anchorId === r.id;
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    areaName: areaLabel(r),
    isDriver,
    vehicleType: r.hasVehicle ? r.vehicleType : null,
    spareSeats: r.hasVehicle ? r.spareSeats : 0,
  };
}

function sortMembers(g: RideGroup, members: Rider[]): Rider[] {
  return [...members].sort((a, b) => {
    if (a.id === g.anchorId) return -1;
    if (b.id === g.anchorId) return 1;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

export function membersOf(g: RideGroup & { satMembers: Rider[]; sunMembers: Rider[] }): Rider[] {
  return g.day === "SAT" ? g.satMembers : g.sunMembers;
}

export async function getBoard(): Promise<BoardView> {
  const [riders, groups] = await Promise.all([
    prisma.rider.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.rideGroup.findMany({
      include: { satMembers: true, sunMembers: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  function dayView(day: Day): DayView {
    const dayRiders = riders.filter((r) => onDay(r, day));
    const dayGroups = groups.filter((g) => g.day === day && membersOf(g).length > 0);
    const groupedIds = new Set(dayGroups.flatMap((g) => membersOf(g).map((m) => m.id)));

    const cabCount: Record<string, number> = {};
    const views: GroupView[] = dayGroups.map((g) => {
      const members = sortMembers(g, membersOf(g));
      let label: string;
      if (g.kind === "car") {
        const anchor = members.find((m) => m.id === g.anchorId);
        label = anchor
          ? `${anchor.name}'s ${anchor.vehicleType === "BIKE" ? "bike" : "car"}`
          : "Car group";
      } else {
        cabCount[g.corridor] = (cabCount[g.corridor] ?? 0) + 1;
        label = `Cab group ${cabCount[g.corridor]}`;
      }
      const from = areaLabel(members[0]);
      return {
        id: g.id,
        kind: g.kind as "car" | "cab",
        label,
        corridor: g.corridor as CorridorKey,
        auto: g.auto,
        members: members.map((m) => toMember(m, g)),
        seatsLeft: seatsLeftFor(g, members),
        leaveBy: leaveByFor(members),
        fromArea: from,
        fromCode: (from.replace(/[^A-Za-z]/g, "").slice(0, 3) || "BLR").toUpperCase(),
      };
    });

    const corridors: CorridorView[] = CORRIDORS.map((c) => {
      const cg = views.filter((v) => v.corridor === c.key);
      return {
        key: c.key,
        name: c.name,
        routeHint: c.routeHint,
        code: c.code,
        groups: cg,
        riderCount: cg.reduce((n, g) => n + g.members.length, 0),
      };
    }).filter((c) => c.groups.length > 0);

    const waiting = dayRiders
      .filter((r) => !groupedIds.has(r.id))
      .map((r) => toMember(r, null));

    return { day, corridors, waiting, totalRiders: dayRiders.length };
  }

  const sharing = new Set(
    groups
      .filter((g) => membersOf(g).length > 1)
      .flatMap((g) => membersOf(g).map((m) => m.id))
  ).size;

  return {
    sat: dayView("SAT"),
    sun: dayView("SUN"),
    stats: {
      riders: riders.length,
      sharing,
      savedPerDay: sharing * 450,
      co2Kg: Math.round(sharing * 2.1),
    },
  };
}

/** Delete groups that have no members left. */
export async function pruneEmptyGroups(): Promise<void> {
  const groups = await prisma.rideGroup.findMany({
    include: { _count: { select: { satMembers: true, sunMembers: true } } },
  });
  const empty = groups
    .filter((g) =>
      g.day === "SAT" ? g._count.satMembers === 0 : g._count.sunMembers === 0
    )
    .map((g) => g.id);
  if (empty.length) await prisma.rideGroup.deleteMany({ where: { id: { in: empty } } });
}

/** If a rider left/changed, fix any group that had them as anchor. */
export async function demoteAnchorIfNeeded(riderId: string): Promise<void> {
  await prisma.rideGroup.updateMany({
    where: { anchorId: riderId },
    data: { anchorId: null, kind: "cab" },
  });
}
