import { useQuery } from "@tanstack/react-query";
import { fetchWorkstreams } from "../api/client";
import { WorkstreamsGrid } from "../components/WorkstreamsGrid";

export function WorkstreamsPage({ onApprove }: { onApprove: (id: string) => void }) {
  const workstreamsQuery = useQuery({ queryKey: ["workstreams"], queryFn: fetchWorkstreams });

  return (
    <div className="page">
      <h2>All workstreams</h2>
      {workstreamsQuery.isLoading && <p>Loading workstreams…</p>}
      {workstreamsQuery.error && <p role="alert">Failed to load workstreams.</p>}
      {workstreamsQuery.data && (
        <WorkstreamsGrid workstreams={workstreamsQuery.data} onApprove={onApprove} />
      )}
    </div>
  );
}
