export type WorkstreamStatus = "draft" | "in_review" | "approved" | "blocked" | "done";
export type CloudProvider = "aws" | "azure" | "gcp";

export interface Workstream {
  id: string;
  name: string;
  status: WorkstreamStatus;
  cloud: CloudProvider;
  risk_score: number; // 0-100
  monthly_cost_usd: number;
  deploy_latency_ms: number;
  owner: string;
  updated_at: string;
}

export interface ConsoleSummary {
  total_workstreams: number;
  in_review: number;
  blocked: number;
  avg_risk_score: number;
  avg_deploy_latency_ms: number;
  p95_deploy_latency_ms: number;
  total_monthly_cost_usd: number;
}

export interface HistoryPoint {
  timestamp: string;
  total_workstreams: number;
  blocked: number;
  in_review: number;
  avg_risk_score: number;
  total_monthly_cost_usd: number;
}

export interface AdapterConfig {
  workstream_repository: string;
  telemetry: string;
  auth: string;
  cloud_provider: string;
}

export interface AuditEvent {
  event: string;
  actor: string;
  detail: Record<string, unknown>;
  at: string;
}
