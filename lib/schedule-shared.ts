// Duty schedule definitions shared by the API and the client workspace.

export const ABSENCE_KINDS = {
  vacation: "Ferien",
  sick: "Krankheit",
  training: "Weiterbildung",
  personal: "Persönlicher Termin",
} as const;
export type AbsenceKind = keyof typeof ABSENCE_KINDS;

export const ABSENCE_STATUS = {
  requested: { label: "Beantragt", tone: "attention" },
  approved: { label: "Bewilligt", tone: "stable" },
  rejected: { label: "Abgelehnt", tone: "critical" },
  withdrawn: { label: "Zurückgezogen", tone: "archived" },
  revoked: { label: "Aufgehoben", tone: "archived" },
} as const;
export type AbsenceStatus = keyof typeof ABSENCE_STATUS;

export const ASSIGNMENT_STATUS = {
  scheduled: { label: "Geplant", tone: "info" },
  confirmed: { label: "Bestätigt", tone: "stable" },
  absent: { label: "Abwesend", tone: "archived" },
  completed: { label: "Geleistet", tone: "stable" },
} as const;
export type AssignmentStatus = keyof typeof ASSIGNMENT_STATUS;

export const DUTY_ROLES = [
  "Pflegefachperson HF",
  "Fachperson Gesundheit",
  "Pflegeassistenz",
  "Teamleitung",
  "Lernende:r",
  "Mitarbeitende:r",
] as const;

export const DUTY_REPEAT = {
  none: "Einmalig",
  weekdays: "Wochentags (Mo–Fr)",
  daily: "Täglich",
  weekly: "Wöchentlich",
} as const;
export type DutyRepeat = keyof typeof DUTY_REPEAT;

export type ScheduleAssignment = {
  id: string;
  userId: string;
  name: string;
  role: string | null;
  status: AssignmentStatus;
  absenceReason: string | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
};

export type ScheduleShift = {
  id: string;
  name: string;
  day: string;
  startsAt: string;
  endsAt: string;
  careUnitId: string | null;
  careUnit: string | null;
  requiredStaff: number;
  note: string | null;
  highlight: boolean;
  status: string;
  assignments: ScheduleAssignment[];
};

export type Absence = {
  id: string;
  userId: string;
  name: string;
  kind: AbsenceKind;
  startsOn: string;
  endsOn: string;
  status: AbsenceStatus;
  urgent: boolean;
  substituteName: string | null;
  note: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
};

export type SchedulePerson = { id: string; name: string; role: string };

export type SchedulePayload = {
  from: string;
  to: string;
  today: string;
  shifts: ScheduleShift[];
  absences: Absence[];
  requests: Absence[];
  people: SchedulePerson[];
  careUnits: Array<{ id: string; name: string }>;
  currentUserId: string;
  canManage: boolean;
  vacationDaysThisYear: number;
};

// Active assignments fill a shift; absent people leave their slot open.
export const activeAssignments = (shift: ScheduleShift) => shift.assignments.filter((a) => a.status !== "absent");
export const openSlots = (shift: ScheduleShift) => Math.max(shift.requiredStaff - activeAssignments(shift).length, 0);

// Monday-to-Friday days between two ISO dates (inclusive).
export function weekdaysBetween(from: string, to: string) {
  let count = 0;
  for (
    let day = new Date(`${from}T12:00:00Z`);
    day <= new Date(`${to}T12:00:00Z`);
    day.setUTCDate(day.getUTCDate() + 1)
  )
    if (day.getUTCDay() !== 0 && day.getUTCDay() !== 6) count += 1;
  return count;
}
