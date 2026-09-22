import { appointmentCategories, appointmentStatuses, type AppointmentStatus } from "@/lib/resident-appointments";

type AppointmentInput = Record<string, unknown>;

const text = (value: unknown, length: number) => typeof value === "string" ? value.trim().slice(0, length) : "";

export function parseAppointmentInput(input: AppointmentInput) {
  const residentId = text(input.residentId, 80);
  const title = text(input.title, 180);
  const category = text(input.category, 40);
  const startsAt = text(input.startsAt, 40);
  const endsAt = text(input.endsAt, 40);
  const location = text(input.location, 180);
  const notes = text(input.notes, 4000);
  const status = text(input.status, 24) as AppointmentStatus;
  const starts = Date.parse(startsAt);
  const ends = Date.parse(endsAt);
  if (!/^[0-9a-f-]{36}$/i.test(residentId)) return { error: "Bitte einen Bewohner auswählen." } as const;
  if (!title) return { error: "Bitte eine Terminbezeichnung eingeben." } as const;
  if (!appointmentCategories.includes(category as typeof appointmentCategories[number])) return { error: "Bitte eine gültige Kategorie auswählen." } as const;
  if (!Number.isFinite(starts) || !Number.isFinite(ends) || ends <= starts) return { error: "Die Endzeit muss nach der Startzeit liegen." } as const;
  if (!appointmentStatuses.includes(status)) return { error: "Bitte einen gültigen Status auswählen." } as const;
  return { residentId, title, category, startsAt: new Date(starts).toISOString(), endsAt: new Date(ends).toISOString(), location, notes, status };
}
