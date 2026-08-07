import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AREA_BY_KEY } from "@/lib/areas";
import { demoteAnchorIfNeeded, pruneEmptyGroups } from "@/lib/board";

export const dynamic = "force-dynamic";

const PHONE_RE = /^[6-9]\d{9}$/;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const phone = String(body.phone ?? "").replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  const area = String(body.area ?? "");
  const customArea = String(body.customArea ?? "").trim() || null;
  const hasVehicle = Boolean(body.hasVehicle);
  const vehicleType = hasVehicle ? String(body.vehicleType ?? "CAR") : null;
  const spareSeatsRaw = Number(body.spareSeats ?? 0);
  const days = String(body.days ?? "BOTH");

  if (!name || name.length > 60) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  }
  if (!PHONE_RE.test(phone)) {
    return NextResponse.json(
      { error: "That doesn't look like a 10-digit Indian mobile number." },
      { status: 400 }
    );
  }
  if (!AREA_BY_KEY[area]) {
    return NextResponse.json({ error: "Please pick your area." }, { status: 400 });
  }
  if (area === "other" && !customArea) {
    return NextResponse.json({ error: "Please type your area name." }, { status: 400 });
  }
  if (!["SAT", "SUN", "BOTH"].includes(days)) {
    return NextResponse.json({ error: "Please pick your day(s)." }, { status: 400 });
  }
  if (vehicleType && !["CAR", "BIKE"].includes(vehicleType)) {
    return NextResponse.json({ error: "Invalid vehicle type." }, { status: 400 });
  }
  const maxSeats = vehicleType === "BIKE" ? 1 : 6;
  const spareSeats = hasVehicle
    ? Math.max(0, Math.min(maxSeats, Math.floor(spareSeatsRaw) || 0))
    : 0;

  const requiredCode = process.env.EVENT_CODE;
  if (requiredCode && String(body.eventCode ?? "").trim() !== requiredCode) {
    return NextResponse.json(
      { error: "Wrong event code — check the WhatsApp group." },
      { status: 403 }
    );
  }

  const data = { name, area, customArea, hasVehicle, vehicleType, spareSeats, days };
  const existing = await prisma.rider.findUnique({ where: { phone } });

  let rider;
  if (existing) {
    // Dropping a day also drops that day's group; losing the vehicle
    // demotes any group anchored on this rider to a cab group.
    const clears: { satGroupId?: null; sunGroupId?: null } = {};
    if (days === "SUN") clears.satGroupId = null;
    if (days === "SAT") clears.sunGroupId = null;
    if (!hasVehicle && existing.hasVehicle) await demoteAnchorIfNeeded(existing.id);
    rider = await prisma.rider.update({ where: { phone }, data: { ...data, ...clears } });
    await pruneEmptyGroups();
  } else {
    rider = await prisma.rider.create({ data: { ...data, phone } });
  }

  return NextResponse.json({ ok: true, updated: Boolean(existing), rider });
}
