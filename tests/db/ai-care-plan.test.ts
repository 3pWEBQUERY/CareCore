import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ApiError } from "@/lib/api-context";
import { generateDraft, residentContext } from "@/lib/ai";
import { termsFor } from "@/lib/terminology";
import { apiContextFor, createResident, fixture, q } from "../support/db";

// KI-Planungsassistenz: Datengrundlage (ohne Namen) und nur für eine Person.
test("Pflegeplanung: Einschätzungen, Probleme, Massnahmen und zwei Wochen Berichte – pseudonymisiert", async () => {
  const f = await fixture();
  const ctx = await apiContextFor(f, "anna");
  const resident = await createResident(f, "Erna Muster");
  const plan = randomUUID();
  const goal = randomUUID();
  const assessment = randomUUID();
  await q(`INSERT INTO carecore_care_plans (id, resident_id) VALUES ($1, $2)`, [plan, resident]);
  await q(
    `INSERT INTO carecore_care_goals (id, care_plan_id, category, statement, problem, resources)
     VALUES ($1, $2, 'Mobilität', 'Geht mit Rollator zum Speisesaal', 'Gangunsicherheit', 'Motiviert, nutzt Rollator')`,
    [goal, plan],
  );
  await q(
    `INSERT INTO carecore_interventions (id, care_goal_id, title, frequency) VALUES ($1, $2, 'Gehtraining im Flur', 'täglich')`,
    [randomUUID(), goal],
  );
  await q(`INSERT INTO carecore_assessments (id, organization_id, code, name) VALUES ($1, $2, $3, 'Sturzrisiko')`, [
    assessment,
    f.org,
    `sturz-${assessment.slice(0, 6)}`,
  ]);
  await q(
    `INSERT INTO carecore_assessment_records (id, assessment_id, resident_id, status, completed_at, score, risk_level, summary)
     VALUES ($1, $2, $3, 'completed', NOW() - INTERVAL '3 days', 12, 'erhöht', 'Zwei Stürze im letzten Quartal')`,
    [randomUUID(), assessment, resident],
  );
  await q(
    `INSERT INTO carecore_documentation_entries (id, resident_id, category, body, occurred_at)
     VALUES ($1, $2, 'Pflege', 'Unsicher beim Aufstehen, braucht Hilfe', NOW() - INTERVAL '10 days')`,
    [randomUUID(), resident],
  );

  const terms = termsFor(undefined);
  const planning = await residentContext(ctx, [resident], terms, true);
  assert.match(planning, /EM \(/, "nur Kürzel");
  assert.equal(planning.includes("Erna") || planning.includes("Muster"), false, "kein Name");
  assert.match(planning, /Problem: Gangunsicherheit/);
  assert.match(planning, /Ressourcen: Motiviert, nutzt Rollator/);
  assert.match(planning, /Massnahme \(Mobilität\): Gehtraining im Flur, täglich/);
  assert.match(planning, /Einschätzung .*Sturzrisiko, Punkte 12, erhöht – Zwei Stürze/);
  assert.match(planning, /Unsicher beim Aufstehen/, "Bericht von vor 10 Tagen gehört zur Planung");

  // Übliche Aufträge bleiben bei 48 Stunden und ohne Planungsdetails.
  const usual = await residentContext(ctx, [resident], terms);
  assert.equal(usual.includes("Unsicher beim Aufstehen"), false);
  assert.equal(usual.includes("Gehtraining"), false);
  assert.equal(usual.includes("Sturzrisiko"), false);
});

test("Pflegeplanung: ohne gewählte Person abgelehnt, bevor etwas an die KI geht", async () => {
  const f = await fixture();
  const ctx = await apiContextFor(f, "anna");
  const previous = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = "test-ohne-aufruf";
  try {
    const error = await generateDraft(ctx, { task: "carePlan", careUnitId: f.units.a }).catch((cause) => cause);
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 400);
    const drafts = await q(`SELECT 1 FROM carecore_ai_drafts WHERE organization_id = $1`, [f.org]);
    assert.equal(drafts.length, 0);
  } finally {
    if (previous === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = previous;
  }
});
