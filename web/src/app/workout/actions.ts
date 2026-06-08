"use server";

import { prisma } from "@/lib/prisma";
import { todayIST } from "@/lib/workout";
import { revalidatePath } from "next/cache";

export async function setSetsDone(itemId: string, setsDone: number) {
  const item = await prisma.workoutItem.findUnique({ where: { id: itemId } });
  if (!item) return;
  const clamped = Math.max(0, Math.min(setsDone, item.sets));
  await prisma.workoutItem.update({
    where: { id: itemId },
    data: { setsDone: clamped, done: clamped >= item.sets },
  });
  await refreshDayStatus(item.workoutDayId);
  revalidatePath("/workout");
  revalidatePath("/");
}

// Mark the day done (or back to active) based on whether every set is complete.
async function refreshDayStatus(workoutDayId: string) {
  const day = await prisma.workoutDay.findUnique({
    where: { id: workoutDayId },
    include: { items: true },
  });
  if (!day) return;
  const allDone = day.items.length > 0 && day.items.every((i) => i.done);
  const status = allDone ? "done" : "active";
  if (day.status !== status) {
    await prisma.workoutDay.update({
      where: { id: day.id },
      data: { status },
    });
    if (allDone) {
      await prisma.usageEvent.create({
        data: { eventType: "workout_completed" },
      });
    }
  }
}

export async function saveSteps(steps: number) {
  const date = todayIST();
  const n = Number.isFinite(steps) ? Math.max(0, Math.floor(steps)) : 0;
  await prisma.stepsLog.upsert({
    where: { date },
    update: { steps: n },
    create: { date, steps: n },
  });
  revalidatePath("/workout");
  revalidatePath("/");
}
