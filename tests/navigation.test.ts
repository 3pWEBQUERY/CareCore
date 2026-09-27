import { test } from "node:test";
import assert from "node:assert/strict";
import { activePage, navigation, navigationFor, routeFor, sidebarNavigation } from "../app/components/navigation.ts";

const modules = navigation.flatMap((group) => group.modules);

test("every tab of the sidebar has a route", () => {
  for (const entry of modules)
    for (const child of entry.children) assert.ok(routeFor(entry.id, child), `${entry.id} · ${child}`);
});

test("no two tabs share an address", () => {
  const seen = new Map<string, string>();
  for (const entry of modules)
    for (const child of entry.children) {
      const route = routeFor(entry.id, child)!;
      assert.equal(seen.get(route), undefined, `${route} used twice`);
      seen.set(route, `${entry.id} · ${child}`);
    }
});

test("the address decides module and tab", () => {
  assert.deepEqual(activePage("/c/medikation/runde"), { moduleId: "med", child: "Medikamentenrunde" });
  assert.deepEqual(activePage("/c/ernaehrung/trinkprotokoll"), { moduleId: "vitals", child: "Trinkprotokoll" });
  assert.deepEqual(activePage("/c/betrieb/uebergabe/letzter-dienst"), {
    moduleId: "shift",
    child: "Seit letztem Dienst",
  });
  // Detail pages below a tab keep the tab active; without /c prefix too.
  assert.deepEqual(activePage("/bewohner/verlauf/123"), { moduleId: "residents", child: "Verlauf & Archiv" });
  assert.equal(activePage("/c"), null);
  assert.equal(activePage("/c/unbekannt"), null);
});

test("modules and tabs follow the permissions", () => {
  const care = navigationFor(["residents.read", "residents.write", "documentation.write", "medication.manage"]);
  const ids = care.flatMap((group) => group.modules.map((module) => module.id));
  assert.ok(ids.includes("med"));
  assert.ok(!ids.includes("admin"));
  assert.ok(!ids.includes("rai"));
  assert.ok(!ids.includes("staff"), "no tab of Mitarbeitende & Dienste without team or admin rights");
  const quality = care.flatMap((group) => group.modules).find((module) => module.id === "quality");
  assert.deepEqual(quality?.children, ["Ereignisse"]);

  const admin = navigationFor(["administration.manage"]);
  const staff = admin.flatMap((group) => group.modules).find((module) => module.id === "staff");
  assert.deepEqual(staff?.children, ["Profile & Rollen"]);
});

test("CareCore KI is reached from the header, not the sidebar", () => {
  const ids = sidebarNavigation(["ai.use"]).flatMap((group) => group.modules.map((module) => module.id));
  assert.ok(!ids.includes("ai"));
  assert.deepEqual(activePage("/c/intelligenz/entwuerfe"), { moduleId: "ai", child: "KI-Entwürfe" });
});
