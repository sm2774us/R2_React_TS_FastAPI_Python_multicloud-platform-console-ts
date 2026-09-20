import { useQuery } from "@tanstack/react-query";
import { fetchAudit, fetchConfig } from "../api/client";

const ROADMAP: { item: string; port: string; activeWhen: string }[] = [
  {
    item: "Postgres-backed workstream registry + ADR audit log",
    port: "workstream_repository",
    activeWhen: "ADAPTER_WORKSTREAM_REPOSITORY=postgres"
  },
  {
    item: "Real AWS/Azure/GCP cost & usage sync",
    port: "cloud_provider",
    activeWhen: "ADAPTER_CLOUD_CREDENTIALS_PATH=<path>"
  },
  {
    item: "OpenTelemetry traces → Grafana/Tempo",
    port: "telemetry",
    activeWhen: "ADAPTER_TELEMETRY=otel"
  },
  {
    item: "OIDC role-scoped auth",
    port: "auth",
    activeWhen: "ADAPTER_AUTH=oidc"
  }
];

export function GovernancePage() {
  const configQuery = useQuery({ queryKey: ["config"], queryFn: fetchConfig });
  const auditQuery = useQuery({ queryKey: ["audit"], queryFn: fetchAudit });

  return (
    <div className="page">
      <h2>Active adapters</h2>
      <p className="muted">
        This platform is built around swappable adapters (see README.md → "Adapter / Plugin
        Architecture"). This table reflects what is actually wired in right now, not what could be.
      </p>
      <table className="run-table" data-testid="governance-table">
        <thead>
          <tr>
            <th>Roadmap item</th>
            <th>Port</th>
            <th>Currently active</th>
            <th>Activate via</th>
          </tr>
        </thead>
        <tbody>
          {ROADMAP.map((row) => (
            <tr key={row.port}>
              <td>{row.item}</td>
              <td>
                <code>{row.port}</code>
              </td>
              <td>{configQuery.data?.[row.port as keyof typeof configQuery.data] ?? "…"}</td>
              <td>
                <code>{row.activeWhen}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Audit trail</h2>
      <table className="run-table" data-testid="audit-table">
        <thead>
          <tr>
            <th>Event</th>
            <th>Actor</th>
            <th>Detail</th>
            <th>At</th>
          </tr>
        </thead>
        <tbody>
          {(auditQuery.data ?? []).map((event, idx) => (
            <tr key={idx}>
              <td>{event.event}</td>
              <td>{event.actor}</td>
              <td>{JSON.stringify(event.detail)}</td>
              <td>{new Date(event.at).toLocaleString()}</td>
            </tr>
          ))}
          {auditQuery.data?.length === 0 && (
            <tr>
              <td colSpan={4}>No governance events yet — approve a workstream to generate one.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
