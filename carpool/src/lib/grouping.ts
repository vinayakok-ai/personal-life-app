import { AREA_BY_KEY, CORRIDORS, CorridorKey } from "./areas";

// Groups are a pure function of the rider list: recomputed on every read,
// first-come-first-served by join time within each corridor. No group state
// is stored, so joins/edits/drop-outs can never leave stale groups behind.

export interface RiderInput {
  id: string;
  name: string;
  phone: string;
  area: string;
  customArea: string | null;
  hasVehicle: boolean;
  vehicleType: string | null;
  spareSeats: number;
  days: string; // SAT | SUN | BOTH
  createdAt: Date;
}

export interface Member {
  id: string;
  name: string;
  phone: string;
  areaName: string;
  isDriver: boolean;
  vehicleType: string | null;
}

export interface Group {
  id: string;
  kind: "vehicle" | "cab";
  label: string;
  members: Member[];
  seatsLeft: number;
  leaveBy: string;
}

export interface CorridorBoard {
  key: CorridorKey;
  name: string;
  routeHint: string;
  groups: Group[];
  solo: Member[]; // own vehicle, no spare seats
  riderCount: number;
}

export interface DayBoard {
  day: "SAT" | "SUN";
  corridors: CorridorBoard[];
  totalRiders: number;
}

const EVENT_START_MIN = 9 * 60; // 9:00 AM
const BUFFER_MIN = 25; // arrival + pickup-coordination buffer
const CAB_SIZE = 4;

function areaName(r: RiderInput): string {
  if (r.area === "other" && r.customArea) return r.customArea;
  return AREA_BY_KEY[r.area]?.name ?? r.area;
}

function areaMinutes(r: RiderInput): number {
  return AREA_BY_KEY[r.area]?.minutes ?? 60;
}

function formatLeaveBy(minutesToVenue: number): string {
  let t = EVENT_START_MIN - minutesToVenue - BUFFER_MIN;
  if (t < 0) t = 0;
  const h24 = Math.floor(t / 60);
  const m = t % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function toMember(r: RiderInput, isDriver: boolean): Member {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    areaName: areaName(r),
    isDriver,
    vehicleType: isDriver ? r.vehicleType : null,
  };
}

function groupLeaveBy(riders: RiderInput[]): string {
  const worst = Math.max(...riders.map(areaMinutes));
  return formatLeaveBy(worst);
}

export function buildDayBoard(all: RiderInput[], day: "SAT" | "SUN"): DayBoard {
  const riders = all
    .filter((r) => r.days === day || r.days === "BOTH")
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const corridors: CorridorBoard[] = CORRIDORS.map((c) => {
    const inCorridor = riders.filter(
      (r) => (AREA_BY_KEY[r.area]?.corridor ?? "other") === c.key
    );

    const anchors = inCorridor.filter((r) => r.hasVehicle && r.spareSeats > 0);
    const solo = inCorridor.filter((r) => r.hasVehicle && r.spareSeats <= 0);
    const passengers = inCorridor.filter((r) => !r.hasVehicle);

    const groups: Group[] = [];
    let pi = 0;

    for (const anchor of anchors) {
      const seats = Math.min(anchor.spareSeats, anchor.vehicleType === "BIKE" ? 1 : 6);
      const taken = passengers.slice(pi, pi + seats);
      pi += taken.length;
      const groupRiders = [anchor, ...taken];
      groups.push({
        id: `${day}-${c.key}-v-${anchor.id}`,
        kind: "vehicle",
        label:
          anchor.vehicleType === "BIKE"
            ? `${anchor.name}'s bike`
            : `${anchor.name}'s car`,
        members: [toMember(anchor, true), ...taken.map((r) => toMember(r, false))],
        seatsLeft: seats - taken.length,
        leaveBy: groupLeaveBy(groupRiders),
      });
    }

    let cabIndex = 1;
    while (pi < passengers.length) {
      const chunk = passengers.slice(pi, pi + CAB_SIZE);
      pi += chunk.length;
      groups.push({
        id: `${day}-${c.key}-cab-${cabIndex}`,
        kind: "cab",
        label: `Cab group ${cabIndex}`,
        members: chunk.map((r) => toMember(r, false)),
        seatsLeft: CAB_SIZE - chunk.length,
        leaveBy: groupLeaveBy(chunk),
      });
      cabIndex++;
    }

    return {
      key: c.key,
      name: c.name,
      routeHint: c.routeHint,
      groups,
      solo: solo.map((r) => toMember(r, true)),
      riderCount: inCorridor.length,
    };
  }).filter((c) => c.riderCount > 0);

  return { day, corridors, totalRiders: riders.length };
}
