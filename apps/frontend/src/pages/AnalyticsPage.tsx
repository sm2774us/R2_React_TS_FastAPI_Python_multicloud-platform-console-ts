import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { fetchHistory, fetchWorkstreams } from "../api/client";

export function AnalyticsPage() {
  const historyQuery = useQuery({ queryKey: ["history"], queryFn: fetchHistory });
  const workstreamsQuery = useQuery({ queryKey: ["workstreams"], queryFn: fetchWorkstreams });

  const historyData = (historyQuery.data ?? []).map((point) => ({
    ...point,
    time: new Date(point.timestamp).toLocaleTimeString()
  }));

  const costByCloud = Object.entries(
    (workstreamsQuery.data ?? []).reduce<Record<string, number>>((acc, w) => {
      acc[w.cloud] = (acc[w.cloud] ?? 0) + w.monthly_cost_usd;
      return acc;
    }, {})
  ).map(([cloud, cost]) => ({ cloud, cost: Number(cost.toFixed(2)) }));

  return (
    <div className="page">
      <h2>Risk &amp; blocked-workstream trend</h2>
      <div className="chart-card">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={historyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#24303d" />
            <XAxis dataKey="time" stroke="#8b98a5" fontSize={12} />
            <YAxis stroke="#8b98a5" fontSize={12} />
            <Tooltip contentStyle={{ background: "#121821", border: "1px solid #24303d" }} />
            <Line type="monotone" dataKey="avg_risk_score" stroke="#f5a524" name="Avg risk %" />
            <Line type="monotone" dataKey="blocked" stroke="#ff5c5c" name="Blocked workstreams" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <h2>Monthly cost by cloud</h2>
      <div className="chart-card">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={costByCloud}>
            <CartesianGrid strokeDasharray="3 3" stroke="#24303d" />
            <XAxis dataKey="cloud" stroke="#8b98a5" fontSize={12} />
            <YAxis stroke="#8b98a5" fontSize={12} />
            <Tooltip contentStyle={{ background: "#121821", border: "1px solid #24303d" }} />
            <Bar dataKey="cost" fill="#4f9dff" name="Monthly cost (USD)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
