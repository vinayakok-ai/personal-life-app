import { prisma } from "./db";
import { CORRIDORS } from "./areas";
import {
  CAB_SIZE,
  Day,
  anchorCapacity,
  corridorOf,
  membersOf,
  onDay,
  seatsLeftFor,
} from "./board";

// First-come-first-served auto-grouping of everyone not yet in a group for
// the day. Existing groups (manual or auto) keep their members; their open
// seats are topped up first, then vehicle owners anchor new groups, then
// whoever is left goes into cabs of 4 — corridor by corridor.

export async function autoGroupRest(day: Day): Promise<number> {
  const memberField = day === "SAT" ? "satGroupId" : "sunGroupId";
  const [riders, groups] = await Promise.all([
    prisma.rider.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.rideGroup.findMany({
      where: { day },
      include: { satMembers: true, sunMembers: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const pool = riders.filter((r) => onDay(r, day) && !(r as Record<string, unknown>)[memberField]);
  let made = 0;

  for (const c of CORRIDORS) {
    const here = pool.filter((r) => corridorOf(r) === c.key);
    const anchors = here.filter((r) => r.hasVehicle && anchorCapacity(r) > 0);
    const passengers = here.filter((r) => !(r.hasVehicle && anchorCapacity(r) > 0));

    for (const g of groups.filter((g) => g.corridor === c.key)) {
      let open = seatsLeftFor(g, membersOf(g));
      while (open > 0 && passengers.length > 0) {
        const p = passengers.shift()!;
        await prisma.rider.update({ where: { id: p.id }, data: { [memberField]: g.id } });
        open--;
      }
    }

    for (const a of anchors) {
      const take = passengers.splice(0, anchorCapacity(a));
      const g = await prisma.rideGroup.create({
        data: { day, corridor: c.key, kind: "car", anchorId: a.id, auto: true },
      });
      await prisma.rider.updateMany({
        where: { id: { in: [a.id, ...take.map((r) => r.id)] } },
        data: { [memberField]: g.id },
      });
      made++;
    }

    while (passengers.length > 0) {
      const take = passengers.splice(0, CAB_SIZE);
      const g = await prisma.rideGroup.create({
        data: { day, corridor: c.key, kind: "cab", auto: true },
      });
      await prisma.rider.updateMany({
        where: { id: { in: take.map((r) => r.id) } },
        data: { [memberField]: g.id },
      });
      made++;
    }
  }
  return made;
}
