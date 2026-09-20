import { http, HttpResponse, ws } from "msw";
import type { AdapterConfig, AuditEvent, ConsoleSummary, HistoryPoint, Workstream } from "../../src/types";

const liveFeed = ws.link("ws://localhost:3000/api/ws/workstreams");

export const mockWorkstreams: Workstream[] = [
  {
    id: "ws-001",
    name: "Migrate EKS to AKS",
    status: "blocked",
    cloud: "azure",
    risk_score: 78.5,
    monthly_cost_usd: 14200.0,
    deploy_latency_ms: 4100,
    owner: "platform-infra",
    updated_at: "2026-01-01T00:00:00Z"
  },
  {
    id: "ws-002",
    name: "Consolidate observability",
    status: "in_review",
    cloud: "aws",
    risk_score: 34.0,
    monthly_cost_usd: 3800.0,
    deploy_latency_ms: 1600,
    owner: "sre",
    updated_at: "2026-01-01T00:00:00Z"
  }
];

const summary: ConsoleSummary = {
  total_workstreams: 2,
  in_review: 1,
  blocked: 1,
  avg_risk_score: 56.25,
  avg_deploy_latency_ms: 2850,
  p95_deploy_latency_ms: 4100,
  total_monthly_cost_usd: 18000
};

const history: HistoryPoint[] = [
  {
    timestamp: "2026-01-01T00:00:00Z",
    total_workstreams: 2,
    blocked: 1,
    in_review: 1,
    avg_risk_score: 56.25,
    total_monthly_cost_usd: 18000
  }
];

const config: AdapterConfig = {
  workstream_repository: "memory",
  telemetry: "noop",
  auth: "open",
  cloud_provider: "not configured"
};

let auditEvents: AuditEvent[] = [];

export const handlers = [
  liveFeed.addEventListener("connection", () => {
    // No-op: integration tests exercise the REST API; the live socket is
    // covered separately by the Playwright E2E suite against the real
    // backend. Accepting the connection here just silences MSW's
    // "unhandled WebSocket" warning.
  }),
  http.get("/api/workstreams", () => HttpResponse.json(mockWorkstreams)),
  http.get("/api/summary", () => HttpResponse.json(summary)),
  http.get("/api/history", () => HttpResponse.json(history)),
  http.get("/api/config", () => HttpResponse.json(config)),
  http.get("/api/audit", () => HttpResponse.json(auditEvents)),
  http.post("/api/workstreams/:id/approve", ({ params }) => {
    const ws = mockWorkstreams.find((w) => w.id === params.id);
    if (!ws) {
      return HttpResponse.json({ detail: "not found" }, { status: 404 });
    }
    ws.status = "approved";
    auditEvents = [
      ...auditEvents,
      { event: "workstream.approved", actor: "anonymous", detail: { workstream_id: ws.id }, at: new Date().toISOString() }
    ];
    return HttpResponse.json(ws);
  })
];
