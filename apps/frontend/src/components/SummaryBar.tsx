import type { ConsoleSummary } from "../types";

export function SummaryBar({ summary }: { summary: ConsoleSummary }) {
  return (
    <div className="summary-bar" data-testid="summary-bar">
      <Stat label="Workstreams" value={summary.total_workstreams} />
      <Stat label="In review" value={summary.in_review} />
      <Stat label="Blocked" value={summary.blocked} />
      <Stat label="Avg risk" value={`${summary.avg_risk_score.toFixed(1)}%`} />
      <Stat label="Avg deploy latency" value={`${summary.avg_deploy_latency_ms.toFixed(0)} ms`} />
      <Stat label="p95 deploy latency" value={`${summary.p95_deploy_latency_ms.toFixed(0)} ms`} />
      <Stat label="Total monthly cost" value={`$${summary.total_monthly_cost_usd.toFixed(2)}`} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
