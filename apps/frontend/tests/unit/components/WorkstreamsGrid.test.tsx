import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { WorkstreamsGrid } from "../../../src/components/WorkstreamsGrid";
import type { Workstream } from "../../../src/types";

const workstreams: Workstream[] = [
  {
    id: "ws-a",
    name: "Alpha migration",
    status: "in_review",
    cloud: "aws",
    risk_score: 10,
    monthly_cost_usd: 100,
    deploy_latency_ms: 500,
    owner: "team-a",
    updated_at: "2026-01-01T00:00:00Z"
  },
  {
    id: "ws-b",
    name: "Beta rollout",
    status: "approved",
    cloud: "gcp",
    risk_score: 50,
    monthly_cost_usd: 200,
    deploy_latency_ms: 800,
    owner: "team-b",
    updated_at: "2026-01-01T00:00:00Z"
  }
];

describe("WorkstreamsGrid", () => {
  it("renders rows and filters by text", () => {
    render(<WorkstreamsGrid workstreams={workstreams} onApprove={() => {}} />);
    expect(screen.getByText("Alpha migration")).toBeInTheDocument();
    expect(screen.getByText("Beta rollout")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Filter workstreams"), { target: { value: "Alpha" } });
    expect(screen.getByText("Alpha migration")).toBeInTheDocument();
    expect(screen.queryByText("Beta rollout")).not.toBeInTheDocument();
  });

  it("calls onApprove for in-review workstreams", () => {
    const onApprove = vi.fn();
    render(<WorkstreamsGrid workstreams={workstreams} onApprove={onApprove} />);
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(onApprove).toHaveBeenCalledWith("ws-a");
  });
});
