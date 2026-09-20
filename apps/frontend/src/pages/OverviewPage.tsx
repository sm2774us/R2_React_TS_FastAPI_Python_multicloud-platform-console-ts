import { useQuery } from "@tanstack/react-query";
import { fetchSummary, fetchWorkstreams } from "../api/client";
import { SummaryBar } from "../components/SummaryBar";
import { WorkstreamsGrid } from "../components/WorkstreamsGrid";
import type { Workstream } from "../types";

export function OverviewPage({ onApprove }: { onApprove: (id: string) => void }) {
  const summaryQuery = useQuery({ queryKey: ["summary"], queryFn: fetchSummary });
  const workstreamsQuery = useQuery({ queryKey: ["workstreams"], queryFn: fetchWorkstreams });

  const topRisk: Workstream[] = (workstreamsQuery.data ?? [])
    .slice()
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 5);

  return (
    <div className="page">
      {summaryQuery.data && <SummaryBar summary={summaryQuery.data} />}
      {workstreamsQuery.isLoading && <p>Loading workstreams…</p>}
      {workstreamsQuery.error && <p role="alert">Failed to load workstreams.</p>}
      {workstreamsQuery.data && (
        <>
          <h2>Highest-risk workstreams</h2>
          <WorkstreamsGrid workstreams={topRisk} onApprove={onApprove} />
        </>
      )}
    </div>
  );
}
