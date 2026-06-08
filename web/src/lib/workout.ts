import { prisma } from "@/lib/prisma";

// Starter morning routine — tiny on purpose, ramps up as days are completed.
const STARTER = [
  { name: "Push-ups", unit: "reps", sets: 3, target: 5, increment: 1, position: 0 },
  { name: "Squats", unit: "reps", sets: 3, target: 10, increment: 2, position: 1 },
  { name: "Sit-ups", unit: "reps", sets: 3, target: 8, increment: 1, position: 2 },
  { name: "Plank", unit: "seconds", sets: 3, target: 20, increment: 5, position: 3 },
];

// Calendar date in IST, stored as UTC-midnight for Prisma @db.Date.
export function todayIST(): Date {
  const ymd = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  return new Date(`${ymd}T00:00:00.000Z`);
}

async function ensureExercises() {
  const count = await prisma.exercise.count();
  if (count === 0) {
    await prisma.exercise.createMany({ data: STARTER });
  }
}

export async function getTodayWorkout() {
  await ensureExercises();
  const date = todayIST();

  let day = await prisma.workoutDay.findUnique({
    where: { date },
    include: { items: { include: { exercise: true } } },
  });

  if (!day) {
    const exercises = await prisma.exercise.findMany({
      where: { active: true },
      orderBy: { position: "asc" },
    });
    // Progressive overload: today's target = base + (#completed days so far) * increment.
    const priorDone = await prisma.workoutDay.count({
      where: { status: "done", date: { lt: date } },
    });
    day = await prisma.workoutDay.create({
      data: {
        date,
        items: {
          create: exercises.map((e) => ({
            exerciseId: e.id,
            unit: e.unit,
            sets: e.sets,
            target: e.target + priorDone * e.increment,
          })),
        },
      },
      include: { items: { include: { exercise: true } } },
    });
  }

  day.items.sort((a, b) => a.exercise.position - b.exercise.position);
  const steps = await prisma.stepsLog.findUnique({ where: { date } });
  return { day, steps: steps?.steps ?? 0 };
}

export async function getTodaySteps() {
  const date = todayIST();
  const s = await prisma.stepsLog.findUnique({ where: { date } });
  return s?.steps ?? 0;
}
