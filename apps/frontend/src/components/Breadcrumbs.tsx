import { Link, useLocation } from "react-router-dom";

const LABELS: Record<string, string> = {
  "": "Overview",
  workstreams: "Workstreams",
  analytics: "Analytics",
  reports: "Reports",
  governance: "Governance"
};

export function Breadcrumbs() {
  const location = useLocation();
  const segment = location.pathname.replace(/^\/+/, "");
  const label = LABELS[segment] ?? segment;

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <Link to="/">Home</Link>
      <span className="crumb-sep">/</span>
      <span aria-current="page">{label}</span>
    </nav>
  );
}
