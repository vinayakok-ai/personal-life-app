import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function cleanPhone(req: NextRequest): string {
  return (req.nextUrl.searchParams.get("phone") ?? "")
    .replace(/\D/g, "")
    .replace(/^91/, "");
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
  await prisma.rider.deleteMany({ where: { phone } });
  return NextResponse.json({ ok: true });
}
