import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SummaryBar } from "../../../src/components/SummaryBar";

describe("SummaryBar", () => {
  it("renders all seven stats", () => {
    render(
      <SummaryBar
        summary={{
          total_workstreams: 5,
          in_review: 1,
          blocked: 1,
          avg_risk_score: 37.6,
          avg_deploy_latency_ms: 1804,
          p95_deploy_latency_ms: 4100,
          total_monthly_cost_usd: 21850
        }}
      />
    );
    expect(screen.getByTestId("summary-bar")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("37.6%")).toBeInTheDocument();
  });
});
