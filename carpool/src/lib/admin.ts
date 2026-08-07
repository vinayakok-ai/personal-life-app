import { NextRequest } from "next/server";

// Shared organizer passcode, set via the ADMIN_CODE env var on Railway.
// Falls back to "polaris" only so local dev works out of the box.
export function adminCode(): string {
  return process.env.ADMIN_CODE || "polaris";
}

export function isAdmin(req: NextRequest): boolean {
  return req.headers.get("x-admin-code") === adminCode();
}
