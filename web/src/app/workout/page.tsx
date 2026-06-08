import { getTodayWorkout } from "@/lib/workout";
import WorkoutToday from "./WorkoutToday";

export const dynamic = "force-dynamic";

export default async function WorkoutPage() {
  const { day } = await getTodayWorkout();
  const items = day.items.map((i) => ({
    id: i.id,
    name: i.exercise.name,
    unit: i.unit,
    sets: i.sets,
    target: i.target,
    setsDone: i.setsDone,
    done: i.done,
  }));
  return <WorkoutToday items={items} />;
}
