"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Archive, Check, ClipboardText, PencilSimple, Plus, Prohibit, Sparkle } from "@phosphor-icons/react";
import ModulePageShell, { ModuleIcon } from "@/app/components/module-page-shell";
import { SidebarTooltip } from "@/app/components/app-sidebar";
import { CareSelect } from "@/app/components/care-form-controls";

type Product = {
  id: string;
  item_name: string;
  category: string;
  unit: string;
  description: string | null;
  default_target_quantity: number;
  current_stock_quantity: number;
  status: "active" | "blocked" | "archived";
  created_at: string;
  updated_at: string;
};
type Draft = {
  itemName: string;
  category: string;
  unit: string;
  description: string;
  defaultTargetQuantity: number;
  currentStockQuantity: number;
  status: Product["status"];
};
const emptyDraft: Draft = {
  itemName: "",
  category: "Pflege & Hygiene",
  unit: "Stück",
  description: "",
  defaultTargetQuantity: 0,
  currentStockQuantity: 0,
  status: "active",
};
const categories = [
  "Pflege & Hygiene",
  "Inkontinenz",
  "Mobilität",
  "Ernährung",
  "Mundpflege",
  "Hilfsmittel",
  "Sonstiges",
];
const units = ["Stück", "Packung", "Flasche", "Tube", "Paar", "Rolle", "ml", "g"];

export default function CareSupplyCatalog() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Alle");
  const [editor, setEditor] = useState<{ id: string | null; draft: Draft } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/care-supply-products", { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Pflegeprodukte konnten nicht geladen werden.");
      setProducts(data.products ?? []);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Pflegeprodukte konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    fetch("/api/work-context", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const currentRole = data?.profile?.role ?? null;
        if (currentRole && currentRole !== "admin") router.replace("/c");
      })
      .catch(() => undefined);
    return () => window.clearTimeout(timer);
  }, [load, router]);

  const visibleProducts = useMemo(
    () =>
      products.filter((product) => {
        const matchesFilter =
          filter === "Alle" ||
          (filter === "Aktiv"
            ? product.status === "active"
            : filter === "Gesperrt"
              ? product.status === "blocked"
              : product.status === "archived");
        const haystack = `${product.item_name} ${product.category} ${product.description ?? ""}`.toLocaleLowerCase(
          "de-CH",
        );
        return matchesFilter && haystack.includes(query.trim().toLocaleLowerCase("de-CH"));
      }),
    [filter, products, query],
  );

  function openEditor(product?: Product) {
    setError("");
    setEditor(
      product
        ? {
            id: product.id,
            draft: {
              itemName: product.item_name,
              category: product.category,
              unit: product.unit,
              description: product.description ?? "",
              defaultTargetQuantity: product.default_target_quantity,
              currentStockQuantity: product.current_stock_quantity,
              status: product.status,
            },
          }
        : { id: null, draft: { ...emptyDraft } },
    );
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/care-supply-products", {
        method: editor.id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...editor.draft, id: editor.id }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Pflegeprodukt konnte nicht gespeichert werden.");
      setProducts((current) =>
        editor.id
          ? current.map((product) => (product.id === editor.id ? data.product : product))
          : [...current, data.product],
      );
      setEditor(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Pflegeprodukt konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  }

  async function setProductStatus(product: Product, status: Product["status"]) {
    setError("");
    try {
      const response = await fetch("/api/care-supply-products", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: product.id,
          itemName: product.item_name,
          category: product.category,
          unit: product.unit,
          description: product.description ?? "",
          defaultTargetQuantity: product.default_target_quantity,
          currentStockQuantity: product.current_stock_quantity,
          status,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Status konnte nicht geändert werden.");
      setProducts((current) => current.map((item) => (item.id === product.id ? data.product : item)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Status konnte nicht geändert werden.");
    }
  }

  const activeCount = products.filter((product) => product.status === "active").length;
  const blockedCount = products.filter((product) => product.status === "blocked").length;
  const archivedCount = products.filter((product) => product.status === "archived").length;

  return (
    <ModulePageShell
      activeModule="admin"
      activeChild="Pflegebedarf"
      pageClass="leadership-page leadership-users admin-supply-catalog-page"
    >
      {() => (
        <main className="workspace leadership-workspace leadership-users care-supply-catalog">
          <header className="leadership-heading page-heading">
            <div className="heading-copy">
              <p className="eyebrow">CareCore Admin</p>
              <h1>Pflegebedarf</h1>
              <p>Pflegeprodukte zentral pflegen und für die Bewohnerakte bereitstellen.</p>
            </div>
            <button className="primary-button" type="button" onClick={() => openEditor()}>
              <ModuleIcon name="plus" className="button-icon" />
              Produkt anlegen
            </button>
          </header>
          <section className="leadership-kpis" aria-label="Katalogübersicht">
            <article className="leadership-kpi info">
              <span className="leadership-kpi-value">{products.length}</span>
              <strong>Produkte im Katalog</strong>
              <small>alle erfassten Pflegeprodukte</small>
            </article>
            <article className="leadership-kpi stable">
              <span className="leadership-kpi-value">{activeCount}</span>
              <strong>Aktiv und buchbar</strong>
              <small>für Bewohnerakten verfügbar</small>
            </article>
            <article className="leadership-kpi attention">
              <span className="leadership-kpi-value">{blockedCount}</span>
              <strong>Gesperrt</strong>
              <small>derzeit nicht auswählbar</small>
            </article>
            <article className="leadership-kpi">
              <span className="leadership-kpi-value">{archivedCount}</span>
              <strong>Archiviert</strong>
              <small>nicht mehr im aktiven Katalog</small>
            </article>
          </section>
          <section className="card admin-users-card care-supply-catalog-card">
            <header className="admin-table-header care-supply-card-head">
              <div>
                <p className="eyebrow">Produktkatalog</p>
                <h2 className="card-title">Material und Hilfsmittel</h2>
                <p className="card-subtitle">
                  {visibleProducts.length} von {products.length} Produkten
                </p>
              </div>
              <label className="resident-search">
                <ModuleIcon name="search" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Produkt suchen…"
                  aria-label="Pflegeprodukt suchen"
                />
              </label>
            </header>
            <div className="care-supply-filters" role="group" aria-label="Produkte filtern">
              {["Alle", "Aktiv", "Gesperrt", "Archiviert"].map((label) => (
                <button
                  type="button"
                  key={label}
                  className={filter === label ? "active" : ""}
                  aria-pressed={filter === label}
                  onClick={() => setFilter(label)}
                >
                  {label}
                </button>
              ))}
            </div>
            {error && !editor && (
              <p className="supplies-error" role="alert">
                {error}
              </p>
            )}
            <div className="care-supply-table-wrap">
              <div className="care-supply-table-head">
                <span>Produkt</span>
                <span>Kategorie</span>
                <span>Einheit</span>
                <span>Sollmenge</span>
                <span>Bestand</span>
                <span>Status</span>
                <span>Aktionen</span>
              </div>
              {loading ? (
                <p className="care-supply-state">Katalog wird geladen…</p>
              ) : visibleProducts.length ? (
                <div className="care-supply-products">
                  {visibleProducts.map((product) => (
                    <article className="care-supply-product" key={product.id}>
                      <span className="care-supply-product-icon">
                        <ClipboardText />
                      </span>
                      <div className="care-supply-product-name">
                        <strong>{product.item_name}</strong>
                        <small>{product.description || "Keine Zusatzinformation"}</small>
                      </div>
                      <span>{product.category}</span>
                      <span>{product.unit}</span>
                      <span>
                        {product.default_target_quantity} {product.unit}
                      </span>
                      <span className="care-supply-product-stock">
                        {product.current_stock_quantity} {product.unit}
                      </span>
                      <span className={`care-supply-product-status ${product.status}`}>
                        {product.status === "active"
                          ? "Aktiv"
                          : product.status === "blocked"
                            ? "Gesperrt"
                            : "Archiviert"}
                      </span>
                      <div className="care-supply-product-actions">
                        <button
                          type="button"
                          aria-label={`${product.item_name} bearbeiten`}
                          onClick={() => openEditor(product)}
                        >
                          <PencilSimple />
                          <SidebarTooltip label="Produkt bearbeiten" placement="top" />
                        </button>
                        {product.status === "active" ? (
                          <button
                            type="button"
                            aria-label={`${product.item_name} sperren`}
                            onClick={() => void setProductStatus(product, "blocked")}
                          >
                            <Prohibit />
                            <SidebarTooltip label="Produkt sperren" placement="top" />
                          </button>
                        ) : product.status === "blocked" ? (
                          <button
                            type="button"
                            aria-label={`${product.item_name} aktivieren`}
                            onClick={() => void setProductStatus(product, "active")}
                          >
                            <Check />
                            <SidebarTooltip label="Produkt aktivieren" placement="top" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            aria-label={`${product.item_name} wiederherstellen`}
                            onClick={() => void setProductStatus(product, "active")}
                          >
                            <Sparkle />
                            <SidebarTooltip label="Produkt wiederherstellen" placement="top" />
                          </button>
                        )}
                        {product.status !== "archived" && (
                          <button
                            type="button"
                            aria-label={`${product.item_name} archivieren`}
                            onClick={() => void setProductStatus(product, "archived")}
                          >
                            <Archive />
                            <SidebarTooltip label="Produkt archivieren" placement="top" />
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="care-supply-empty">
                  <ClipboardText />
                  <strong>{products.length ? "Keine passenden Produkte" : "Der Katalog ist noch leer"}</strong>
                  <p>
                    {products.length
                      ? "Passe Suche oder Filter an."
                      : "Lege die benötigten Pflegeprodukte an. Mitarbeitende können sie danach direkt Bewohnern zuweisen."}
                  </p>
                  {!products.length && (
                    <button className="secondary-button" type="button" onClick={() => openEditor()}>
                      <Plus /> Erstes Produkt anlegen
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>

          {editor && (
            <div
              className="area-editor-overlay"
              role="presentation"
              onMouseDown={(event) => event.currentTarget === event.target && setEditor(null)}
            >
              <section
                className="area-editor-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="care-supply-editor-title"
              >
                <header className="area-editor-header">
                  <div>
                    <p className="eyebrow">CareCore Administration · Pflegebedarf</p>
                    <h2 id="care-supply-editor-title">
                      {editor.id ? "Pflegeprodukt bearbeiten" : "Pflegeprodukt anlegen"}
                    </h2>
                    <p>Der Katalog wird für die Pflegebedarfsbuchung in allen Bewohnerakten verwendet.</p>
                  </div>
                  <button
                    className="area-editor-close"
                    type="button"
                    aria-label="Editor schließen"
                    onClick={() => setEditor(null)}
                  >
                    ×
                  </button>
                </header>
                <form className="area-editor-form" onSubmit={save}>
                  <div className="area-editor-intro">
                    <span className="area-editor-icon">
                      <ClipboardText />
                    </span>
                    <div>
                      <strong>Produktstammdaten</strong>
                      <p>Name, Einheit und Sollmenge erscheinen bei der Buchung an Bewohner.</p>
                    </div>
                  </div>
                  <div className="area-editor-grid care-supply-editor-grid">
                    <label className="area-editor-wide">
                      <span>Produktname</span>
                      <input
                        required
                        maxLength={180}
                        autoFocus
                        value={editor.draft.itemName}
                        onChange={(event) =>
                          setEditor((current) =>
                            current
                              ? { ...current, draft: { ...current.draft, itemName: event.target.value } }
                              : current,
                          )
                        }
                        placeholder="z. B. Inkontinenzeinlage M"
                      />
                    </label>
                    <label>
                      <span>Kategorie</span>
                      <CareSelect
                        label="Kategorie"
                        value={editor.draft.category}
                        options={categories}
                        onChange={(value) =>
                          setEditor((current) =>
                            current ? { ...current, draft: { ...current.draft, category: value } } : current,
                          )
                        }
                      />
                    </label>
                    <label>
                      <span>Einheit</span>
                      <CareSelect
                        label="Einheit"
                        value={editor.draft.unit}
                        options={units}
                        onChange={(value) =>
                          setEditor((current) =>
                            current ? { ...current, draft: { ...current.draft, unit: value } } : current,
                          )
                        }
                      />
                    </label>
                    <label>
                      <span>Vorgeschlagene Sollmenge pro Bewohner</span>
                      <input
                        type="number"
                        min="0"
                        max="100000"
                        step="1"
                        value={editor.draft.defaultTargetQuantity}
                        onChange={(event) =>
                          setEditor((current) =>
                            current
                              ? {
                                  ...current,
                                  draft: { ...current.draft, defaultTargetQuantity: Number(event.target.value) || 0 },
                                }
                              : current,
                          )
                        }
                      />
                    </label>
                    <label>
                      <span>Vorhandener Bestand</span>
                      <input
                        type="number"
                        min="0"
                        max="100000"
                        step="1"
                        value={editor.draft.currentStockQuantity}
                        onChange={(event) =>
                          setEditor((current) =>
                            current
                              ? {
                                  ...current,
                                  draft: { ...current.draft, currentStockQuantity: Number(event.target.value) || 0 },
                                }
                              : current,
                          )
                        }
                        aria-describedby="care-supply-stock-help"
                      />
                      <small id="care-supply-stock-help">
                        Aktuell verfügbare Menge im Haus, gemessen in {editor.draft.unit.toLocaleLowerCase("de-CH")}.
                      </small>
                    </label>
                    {editor.id && (
                      <label>
                        <span>Katalogstatus</span>
                        <CareSelect
                          label="Katalogstatus"
                          value={
                            editor.draft.status === "active"
                              ? "Aktiv"
                              : editor.draft.status === "blocked"
                                ? "Gesperrt"
                                : "Archiviert"
                          }
                          options={["Aktiv", "Gesperrt", "Archiviert"]}
                          onChange={(value) =>
                            setEditor((current) =>
                              current
                                ? {
                                    ...current,
                                    draft: {
                                      ...current.draft,
                                      status:
                                        value === "Gesperrt"
                                          ? "blocked"
                                          : value === "Archiviert"
                                            ? "archived"
                                            : "active",
                                    },
                                  }
                                : current,
                            )
                          }
                        />
                      </label>
                    )}
                    <label className="area-editor-wide">
                      <span>Beschreibung oder Hinweise</span>
                      <textarea
                        rows={4}
                        maxLength={1200}
                        value={editor.draft.description}
                        onChange={(event) =>
                          setEditor((current) =>
                            current
                              ? { ...current, draft: { ...current.draft, description: event.target.value } }
                              : current,
                          )
                        }
                        placeholder="Grösse, Anwendung oder interne Hinweise …"
                      />
                    </label>
                  </div>
                  {error && (
                    <p className="supplies-error" role="alert">
                      {error}
                    </p>
                  )}
                  <footer className="area-editor-actions">
                    <button className="secondary-button" type="button" onClick={() => setEditor(null)}>
                      Abbrechen
                    </button>
                    <button className="primary-button" type="submit" disabled={saving}>
                      <Check /> {saving ? "Speichern…" : editor.id ? "Änderungen speichern" : "Produkt anlegen"}
                    </button>
                  </footer>
                </form>
              </section>
            </div>
          )}
        </main>
      )}
    </ModulePageShell>
  );
}
