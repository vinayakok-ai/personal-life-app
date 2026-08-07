import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildDayBoard } from "@/lib/grouping";

export const dynamic = "force-dynamic";

export async function GET() {
  const riders = await prisma.rider.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({
    sat: buildDayBoard(riders, "SAT"),
    sun: buildDayBoard(riders, "SUN"),
  });
}
