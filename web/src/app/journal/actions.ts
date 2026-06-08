"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createJournalEntry(formData: FormData) {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  await prisma.journalEntry.create({
    data: { body, source: "text" },
  });
  await prisma.usageEvent.create({
    data: { eventType: "journal_entry_created" },
  });

  revalidatePath("/journal");
  redirect("/journal");
}
