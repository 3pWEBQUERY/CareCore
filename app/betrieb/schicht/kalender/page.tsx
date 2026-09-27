import { redirect } from "next/navigation";

// The calendar moved to CareCore One; old links keep working.
export default function ShiftCalendarPage() {
  redirect("/c/carecore-one/kalender");
}
