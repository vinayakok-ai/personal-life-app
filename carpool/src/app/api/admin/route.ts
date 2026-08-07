import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { autoGroupRest } from "@/lib/autogroup";
import { anchorCapacity, corridorOf, pruneEmptyGroups } from "@/lib/board";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const action = String(body.action ?? "");

  if (action === "login") {
    return isAdmin(req)
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "Wrong passcode." }, { status: 403 });
  }
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const day = String(body.day ?? "");
  if (!["SAT", "SUN"].includes(day)) {
    return NextResponse.json({ error: "Invalid day." }, { status: 400 });
  }
  const memberField = day === "SAT" ? "satGroupId" : "sunGroupId";

  if (action === "group") {
    const ids = Array.isArray(body.riderIds) ? body.riderIds.map(String) : [];
    if (!ids.length) {
      return NextResponse.json({ error: "Select at least one rider." }, { status: 400 });
    }
    const selected = await prisma.rider.findMany({ where: { id: { in: ids } } });
    const anchor = selected
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .find((r) => r.hasVehicle && anchorCapacity(r) > 0);
    const counts: Record<string, number> = {};
    for (const r of selected) counts[corridorOf(r)] = (counts[corridorOf(r)] ?? 0) + 1;
    const corridor = anchor
      ? corridorOf(anchor)
      : Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    const g = await prisma.rideGroup.create({
      data: { day, corridor, kind: anchor ? "car" : "cab", anchorId: anchor?.id ?? null, auto: false },
    });
    await prisma.rider.updateMany({
      where: { id: { in: ids } },
      data: { [memberField]: g.id },
    });
    return NextResponse.json({ ok: true, groupId: g.id });
  }

  if (action === "auto") {
    const made = await autoGroupRest(day as "SAT" | "SUN");
    return NextResponse.json({ ok: true, made });
  }

  if (action === "removeMember") {
    const riderId = String(body.riderId ?? "");
    await prisma.rider.update({ where: { id: riderId }, data: { [memberField]: null } });
    await prisma.rideGroup.updateMany({
      where: { day, anchorId: riderId },
      data: { anchorId: null, kind: "cab" },
    });
    await pruneEmptyGroups();
    return NextResponse.json({ ok: true });
  }

  if (action === "ungroupAll") {
    await prisma.rider.updateMany({ where: {}, data: { [memberField]: null } });
    await prisma.rideGroup.deleteMany({ where: { day } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
