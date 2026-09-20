import { NavLink } from "react-router-dom";

const TABS = [
  { to: "/", label: "Overview", end: true },
  { to: "/workstreams", label: "Workstreams" },
  { to: "/analytics", label: "Analytics" },
  { to: "/reports", label: "Reports" },
  { to: "/governance", label: "Governance" }
];

export function TabNav() {
  return (
    <nav className="tab-nav" aria-label="Primary">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) => (isActive ? "tab active" : "tab")}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
