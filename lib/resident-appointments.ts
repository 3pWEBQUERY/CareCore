export const appointmentCategories = [
  "Arzttermin",
  "Therapie",
  "Untersuchung",
  "Besuch",
  "Transport",
  "Sonstiges",
] as const;
export const careUnitTaskCategories = [
  "Organisation",
  "Pflege",
  "Material",
  "Reinigung",
  "Besprechung",
  "Sonstiges",
] as const;
export const appointmentStatuses = ["scheduled", "completed", "cancelled"] as const;

export type AppointmentStatus = (typeof appointmentStatuses)[number];
export type AppointmentKind = "resident" | "care_unit_task";

export type ResidentAppointment = {
  id: string;
  resident_id: string | null;
  resident_name: string | null;
  resident_status: string | null;
  kind: AppointmentKind;
  care_unit_id: string | null;
  care_unit_name: string | null;
  room_name: string | null;
  title: string;
  category: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  notes: string | null;
  status: AppointmentStatus;
  created_at: string;
  updated_at: string;
};

export type AppointmentResident = {
  id: string;
  name: string;
  status: string;
  care_unit_id: string | null;
  care_unit_name: string | null;
  room_name: string | null;
};

export type AppointmentCareUnit = { id: string; name: string; floor: string | null };

export type AppointmentDraft = {
  kind: AppointmentKind;
  residentId: string;
  careUnitId: string;
  title: string;
  category: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  notes: string;
  status: AppointmentStatus;
};

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Zurich",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function appointmentLocalParts(value: string | number | Date) {
  const parts = Object.fromEntries(dateFormatter.formatToParts(new Date(value)).map((part) => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

// Convert the facility's wall time to UTC, independent of the device timezone.
export function zurichTimeToIso(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  if (!year || !month || !day || !Number.isInteger(hour) || !Number.isInteger(minute)) return "";
  const wallTime = Date.UTC(year, month - 1, day, hour, minute);
  let timestamp = wallTime;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const local = appointmentLocalParts(new Date(timestamp));
    const [localYear, localMonth, localDay] = local.date.split("-").map(Number);
    const [localHour, localMinute] = local.time.split(":").map(Number);
    const offset = Date.UTC(localYear, localMonth - 1, localDay, localHour, localMinute) - timestamp;
    const next = wallTime - offset;
    if (next === timestamp) break;
    timestamp = next;
  }
  const result = new Date(timestamp);
  const local = appointmentLocalParts(result);
  return local.date === date && local.time === time ? result.toISOString() : "";
}

export function appointmentDateLabel(value: string, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("de-CH", { timeZone: "Europe/Zurich", ...options }).format(new Date(value));
}

export function initialAppointmentDraft(
  residentId = "",
  date = appointmentLocalParts(new Date()).date,
  startTime = "09:00",
): AppointmentDraft {
  const [hour, minute] = startTime.split(":").map(Number);
  const endMinutes = Math.min(23 * 60 + 45, hour * 60 + minute + 60);
  return {
    kind: "resident",
    residentId,
    careUnitId: "",
    title: "",
    category: "Arzttermin",
    date,
    startTime,
    endTime: `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`,
    location: "",
    notes: "",
    status: "scheduled",
  };
}

export function draftFromAppointment(appointment: ResidentAppointment): AppointmentDraft {
  const start = appointmentLocalParts(appointment.starts_at);
  const end = appointmentLocalParts(appointment.ends_at);
  return {
    kind: appointment.kind,
    residentId: appointment.resident_id ?? "",
    careUnitId: appointment.kind === "care_unit_task" ? (appointment.care_unit_id ?? "") : "",
    title: appointment.title,
    category: appointment.category,
    date: start.date,
    startTime: start.time,
    endTime: end.time,
    location: appointment.location ?? "",
    notes: appointment.notes ?? "",
    status: appointment.status,
  };
}

export const appointmentTargetLabel = (appointment: ResidentAppointment) =>
  appointment.kind === "care_unit_task"
    ? (appointment.care_unit_name ?? "Wohnbereich")
    : (appointment.resident_name ?? "Bewohner");
