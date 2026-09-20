import { useQuery } from "@tanstack/react-query";
import { fetchWorkstreams } from "../api/client";
import type { Workstream } from "../types";

function toCsv(items: Workstream[]): string {
  const header = ["id", "name", "status", "cloud", "owner", "risk_score", "deploy_latency_ms", "monthly_cost_usd"];
  const rows = items.map((w) => header.map((key) => String(w[key as keyof Workstream])).join(","));
  return [header.join(","), ...rows].join("\n");
}

function downloadCsv(items: Workstream[]) {
  const blob = new Blob([toCsv(items)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "workstreams-report.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const workstreamsQuery = useQuery({ queryKey: ["workstreams"], queryFn: fetchWorkstreams });
  const items = workstreamsQuery.data ?? [];

  const byCloud = items.reduce<Record<string, { count: number; cost: number }>>((acc, w) => {
    const bucket = acc[w.cloud] ?? { count: 0, cost: 0 };
    bucket.count += 1;
    bucket.cost += w.monthly_cost_usd;
    acc[w.cloud] = bucket;
    return acc;
  }, {});

  return (
    <div className="page">
      <div className="page-header-row">
        <h2>Workstream summary report</h2>
        <button onClick={() => downloadCsv(items)} disabled={items.length === 0}>
          Export CSV
        </button>
      </div>
      <table className="run-table" data-testid="reports-table">
        <thead>
          <tr>
            <th>Cloud</th>
            <th>Workstream count</th>
            <th>Total monthly cost</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(byCloud).map(([cloud, agg]) => (
            <tr key={cloud} className={`cloud-${cloud}`}>
              <td>{cloud}</td>
              <td>{agg.count}</td>
              <td>${agg.cost.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
