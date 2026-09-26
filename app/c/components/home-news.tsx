"use client";

import { Icon } from "./dashboard-shared";
import type { DashboardState } from "./use-dashboard";

export function HomeNews({ r }: { r: DashboardState }) {
  const { router, residentNews, newsScope, newsLoading, newsError } = r;
  return (
    <section className="home-news" aria-labelledby="home-news-title">
      <div className="home-news-head">
        <div>
          <p className="eyebrow">Bewohner im Blick</p>
          <h2 id="home-news-title">Neues aus {newsScope}</h2>
          <p>Letzte Dokumentation und aktuelle Hinweise für jeden Bewohner in deinem Arbeitsbereich.</p>
        </div>
        <span>{residentNews.length} Bewohner</span>
      </div>
      {newsError ? (
        <div className="home-news-empty" role="alert">
          {newsError}
        </div>
      ) : newsLoading ? (
        <div className="home-news-empty">Bewohner-Neuigkeiten werden geladen…</div>
      ) : residentNews.length ? (
        <div className="home-news-list">
          {residentNews.map((resident) => {
            const importance =
              resident.importance === "critical" || resident.flag_severity === "critical"
                ? "critical"
                : resident.importance === "important" || resident.flag_severity === "attention"
                  ? "attention"
                  : "normal";
            return (
              <article
                className="home-news-row"
                key={resident.id}
                role="link"
                tabIndex={0}
                onClick={() => router.push(`/c/bewohner?resident=${resident.id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") router.push(`/c/bewohner?resident=${resident.id}`);
                }}
              >
                <span className={`resident-avatar ${importance === "critical" ? "critical" : ""}`}>
                  {resident.first_name[0]}
                  {resident.last_name[0]}
                </span>
                <div className="home-news-person">
                  <strong>
                    {resident.first_name} {resident.last_name}
                  </strong>
                  <small>
                    {resident.room} · {resident.care_unit_name || "ohne Wohnbereich"}
                  </small>
                </div>
                <div className="home-news-entry">
                  <strong>{resident.title || resident.flag_label || "Keine neuen Einträge"}</strong>
                  <p>
                    {resident.body ||
                      (resident.flag_label
                        ? "Aktuellen Hinweis in der Bewohnerakte prüfen."
                        : "Aktuell liegt keine Pflegedokumentation vor.")}
                  </p>
                </div>
                <div className="home-news-meta">
                  <span className={`home-news-status ${importance}`}>
                    {importance === "critical" ? "Wichtig" : importance === "attention" ? "Beachten" : "Aktuell"}
                  </span>
                  <time>
                    {resident.occurred_at
                      ? new Date(resident.occurred_at).toLocaleDateString("de-CH", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </time>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="home-news-empty">In diesem Wohnbereich sind aktuell keine aktiven Bewohner erfasst.</div>
      )}
      <div className="home-news-foot">
        <button type="button" onClick={() => router.push("/c/bewohner")}>
          Bewohnerverzeichnis öffnen <Icon name="chevron" />
        </button>
        <button type="button" onClick={() => router.push("/c/pflegedokumentation/verlauf")}>
          Pflegeverlauf ansehen <Icon name="chevron" />
        </button>
      </div>
    </section>
  );
}
