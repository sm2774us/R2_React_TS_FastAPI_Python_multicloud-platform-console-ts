import type { AdapterConfig, AuditEvent, ConsoleSummary, HistoryPoint, Workstream } from "../types";

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init
  });
  if (!res.ok) {
    throw new Error(`Request to ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export function fetchWorkstreams(): Promise<Workstream[]> {
  return request<Workstream[]>("/workstreams");
}

export function fetchSummary(): Promise<ConsoleSummary> {
  return request<ConsoleSummary>("/summary");
}

export function fetchHistory(): Promise<HistoryPoint[]> {
  return request<HistoryPoint[]>("/history");
}

export function fetchConfig(): Promise<AdapterConfig> {
  return request<AdapterConfig>("/config");
}

export function fetchAudit(): Promise<AuditEvent[]> {
  return request<AuditEvent[]>("/audit");
}

export function approveWorkstream(id: string): Promise<Workstream> {
  return request<Workstream>(`/workstreams/${id}/approve`, { method: "POST" });
}

export function liveSocketUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/ws/workstreams`;
}
