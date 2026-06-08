"use server";

import { prisma } from "@/lib/prisma";
import { todayIST } from "@/lib/workout";
import { revalidatePath } from "next/cache";

export async function toggleHabit(habitId: string, done: boolean) {
  const date = todayIST();
  await prisma.habitLog.upsert({
    where: { habitId_date: { habitId, date } },
    update: { done, doneAt: new Date() },
    create: { habitId, date, done },
  });
  revalidatePath(`/day/${habitId}`);
  revalidatePath("/");
}
