import { redirect } from "next/navigation";

// The messenger moved to CareCore One; old links keep working.
export default function TeamMessagesPage() {
  redirect("/c/carecore-one/messenger");
}
