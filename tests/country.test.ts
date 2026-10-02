import { test } from "node:test";
import assert from "node:assert/strict";
import { COUNTRIES, careLevelOptions, countryCode, insuranceNumberError, socialNumberError } from "../lib/country.ts";
import { austrianHolidays, countryHolidays, germanHolidays } from "../lib/roster/time.ts";

test("Einstufung je Land: CH 12 Pflegestufen, DE 5 Pflegegrade, AT 7 Pflegegeldstufen", () => {
  const ch = COUNTRIES.CH.careLevels.levels;
  assert.equal(ch.length, 12);
  assert.deepEqual(ch[0], { value: "Pflegestufe 1", detail: "bis 20 Minuten" });
  assert.equal(ch[1].detail, "21 bis 40 Minuten");
  assert.equal(ch[11].detail, "mehr als 220 Minuten");
  const de = COUNTRIES.DE.careLevels.levels;
  assert.deepEqual(
    de.map((level) => level.value),
    ["Pflegegrad 1", "Pflegegrad 2", "Pflegegrad 3", "Pflegegrad 4", "Pflegegrad 5"],
  );
  assert.match(de[2].detail, /^47,5 bis unter 70 Punkte/);
  const at = COUNTRIES.AT.careLevels.levels;
  assert.equal(at.length, 7);
  assert.equal(at[0].detail, "mehr als 65 Stunden");
  assert.equal(at[1].detail, "mehr als 95 Stunden");
});

test("Auswahl behält einen Wert aus einem anderen Land; unbekanntes Land ist die Schweiz", () => {
  assert.equal(careLevelOptions("DE", "Pflegestufe 4")[0], "Pflegestufe 4");
  assert.equal(careLevelOptions("DE", "Pflegegrad 2").length, 5);
  assert.equal(countryCode("FR"), "CH");
  assert.equal(countryCode("AT"), "AT");
});

test("Sozialversicherungsnummer im Format des Landes", () => {
  assert.equal(socialNumberError("CH", "756.1234.5678.97"), null);
  assert.match(socialNumberError("CH", "123.4567.8901.23") ?? "", /AHV/);
  assert.equal(socialNumberError("DE", "12 010150 M 123"), null);
  assert.notEqual(socialNumberError("DE", "1201015012"), null);
  // Österreich: Prüfziffer an vierter Stelle.
  assert.equal(socialNumberError("AT", "1237 010180"), null);
  assert.match(socialNumberError("AT", "1234 010180") ?? "", /Prüfziffer/);
  assert.notEqual(socialNumberError("AT", "12345"), null);
  assert.equal(insuranceNumberError("DE", "A123456789"), null);
  assert.notEqual(insuranceNumberError("DE", "123456789"), null);
  assert.equal(insuranceNumberError("CH", "beliebig"), null);
});

test("Feiertage: Deutschland bundesweit, Österreich gesetzlich", () => {
  const de = germanHolidays(2026);
  assert.equal(de.length, 9);
  assert.ok(de.some((h) => h.date === "2026-10-03" && h.name === "Tag der Deutschen Einheit"));
  assert.ok(de.some((h) => h.date === "2026-04-03" && h.name === "Karfreitag"));
  const at = austrianHolidays(2026);
  assert.equal(at.length, 13);
  assert.ok(at.some((h) => h.date === "2026-06-04" && h.name === "Fronleichnam"));
  assert.ok(at.some((h) => h.date === "2026-10-26" && h.name === "Nationalfeiertag"));
  assert.equal(countryHolidays("CH", 2026).find((h) => h.date === "2026-08-01")?.name, "Bundesfeier");
});
