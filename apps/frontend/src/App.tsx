import { Route, Routes } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { approveWorkstream } from "./api/client";
import { useLiveSocket } from "./hooks/useLiveSocket";
import { TabNav } from "./components/TabNav";
import { Breadcrumbs } from "./components/Breadcrumbs";
import { LiveBadge } from "./components/LiveBadge";
import { OverviewPage } from "./pages/OverviewPage";
import { WorkstreamsPage } from "./pages/WorkstreamsPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { GovernancePage } from "./pages/GovernancePage";
import "./index.css";

export function App() {
  const qc = useQueryClient();
  const liveStatus = useLiveSocket();

  const approveMutation = useMutation({
    mutationFn: approveWorkstream,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workstreams"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      qc.invalidateQueries({ queryKey: ["history"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
    }
  });

  const onApprove = (id: string) => approveMutation.mutate(id);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Multi-Cloud Platform Console</h1>
        <LiveBadge status={liveStatus} />
      </header>

      <TabNav />
      <Breadcrumbs />

      <Routes>
        <Route path="/" element={<OverviewPage onApprove={onApprove} />} />
        <Route path="/workstreams" element={<WorkstreamsPage onApprove={onApprove} />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/governance" element={<GovernancePage />} />
      </Routes>
    </div>
  );
}
