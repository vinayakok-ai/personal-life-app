import { prisma } from "@/lib/prisma";
import { todayIST } from "@/lib/workout";

// Your ideal day as an anchor chain (no clock times). Grows via an editor later.
// `detail: true` = important item that taps into a detail screen (tasks live there);
// otherwise it's a simple one-tap inline check on the timeline.
const STARTER_HABITS = [
  { label: "Bathroom", cue: "out of bed", kind: "plain", period: "morning", position: 0 },
  { label: "Workout", cue: "after the bathroom", kind: "workout", link: "/workout", period: "morning", position: 1 },
  { label: "Brush & shower", cue: "after the workout", kind: "plain", period: "morning", position: 2 },
  { label: "Smoothie", cue: "after the shower", note: "spinach + cucumber", kind: "plain", period: "morning", position: 3 },
  { label: "Start work", cue: "after breakfast", kind: "plain", detail: true, period: "morning", position: 4 },
  { label: "Make lunch", cue: "midday break", kind: "plain", period: "midday", position: 5 },
  { label: "How are you feeling?", cue: "anytime", kind: "journal", link: "/journal/new", period: "midday", position: 6 },
  { label: "A project or call someone", cue: "after work", kind: "evening", detail: true, period: "evening", position: 7 },
  { label: "Steps", cue: "after dinner", kind: "steps", period: "evening", position: 8 },
  { label: "Read a little", cue: "before bed", kind: "plain", period: "night", position: 9 },
  { label: "Note tomorrow & sleep", cue: "before bed", kind: "plain", period: "night", position: 10 },
];

async function ensureHabits() {
  if ((await prisma.habit.count()) === 0) {
    await prisma.habit.createMany({ data: STARTER_HABITS });
  }
}

export type DayHabit = {
  id: string;
  label: string;
  cue: string;
  note: string | null;
  kind: string;
  link: string | null;
  detail: boolean;
  period: string;
  done: boolean;
};

export async function getTodayDay(): Promise<DayHabit[]> {
  await ensureHabits();
  const date = todayIST();

  const habits = await prisma.habit.findMany({
    where: { active: true },
    orderBy: { position: "asc" },
  });
  const [logs, workoutDay, stepsLog] = await Promise.all([
    prisma.habitLog.findMany({ where: { date, done: true } }),
    prisma.workoutDay.findUnique({ where: { date } }),
    prisma.stepsLog.findUnique({ where: { date } }),
  ]);
  const doneSet = new Set(logs.map((l) => l.habitId));

  return habits.map((h) => {
    let done = false;
    if (h.kind === "workout") done = workoutDay?.status === "done";
    else if (h.kind === "steps") done = (stepsLog?.steps ?? 0) > 0;
    else if (h.kind === "journal") done = false; // anytime capture, not checkable
    else done = doneSet.has(h.id);
    return {
      id: h.id,
      label: h.label,
      cue: h.cue,
      note: h.note ?? null,
      kind: h.kind,
      link: h.link ?? null,
      detail: h.detail,
      period: h.period,
      done,
    };
  });
}

export async function getHabit(id: string) {
  return prisma.habit.findUnique({ where: { id } });
}

export async function isHabitDoneToday(habitId: string) {
  const date = todayIST();
  const log = await prisma.habitLog.findUnique({
    where: { habitId_date: { habitId, date } },
  });
  return log?.done ?? false;
}
