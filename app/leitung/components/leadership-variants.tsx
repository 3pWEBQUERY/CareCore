"use client";

import { Props } from "./leadership-variant-parts";
import { QualityVariant } from "./quality-variant";
import { InsightsVariant } from "./insights-variant";
import { AdminVariant } from "./admin-variant";

export function LeadershipVariant(props: Props) {
  if (props.view === "qualityEvents" || props.view === "qualityActions") return <QualityVariant {...props} />;
  if (props.view === "careInsights" || props.view === "leadershipInsights" || props.view === "workforceInsights")
    return <InsightsVariant {...props} />;
  return <AdminVariant {...props} />;
}
