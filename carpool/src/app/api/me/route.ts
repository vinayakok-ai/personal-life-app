import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { demoteAnchorIfNeeded, pruneEmptyGroups } from "@/lib/board";

export const dynamic = "force-dynamic";

function cleanPhone(req: NextRequest): string {
  return (req.nextUrl.searchParams.get("phone") ?? "")
    .replace(/\D/g, "")
    .replace(/^91(?=\d{10}$)/, "");
}

export async function GET(req: NextRequest) {
  const phone = cleanPhone(req);
  if (!phone) return NextResponse.json({ rider: null });
  const rider = await prisma.rider.findUnique({ where: { phone } });
  return NextResponse.json({ rider });
}

export async function DELETE(req: NextRequest) {
  const phone = cleanPhone(req);
  if (!phone) return NextResponse.json({ ok: false }, { status: 400 });
  const rider = await prisma.rider.findUnique({ where: { phone } });
  if (rider) {
    await demoteAnchorIfNeeded(rider.id);
    await prisma.rider.delete({ where: { id: rider.id } });
    await pruneEmptyGroups();
  }
  return NextResponse.json({ ok: true });
}
