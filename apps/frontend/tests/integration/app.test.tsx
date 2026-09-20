import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "../../src/App";

function renderApp() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Multi-Cloud Platform Console — integration", () => {
  it("loads the Overview tab and shows summary + risk grid from the mocked API", async () => {
    renderApp();
    expect(await screen.findByText("Migrate EKS to AKS")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // total_workstreams stat
  });

  it("navigates to the Workstreams tab via the tab bar and shows breadcrumbs", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Migrate EKS to AKS");

    await user.click(screen.getByRole("link", { name: "Workstreams" }));
    expect(await screen.findByText("All workstreams")).toBeInTheDocument();
    expect(document.querySelector('[aria-current="page"]')).toHaveTextContent("Workstreams");
  });

  it("approving a workstream on the Workstreams tab is reflected in the Governance audit trail", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(await screen.findByRole("link", { name: "Workstreams" }));
    await screen.findByText("Consolidate observability");

    await user.click(screen.getByRole("button", { name: "Approve" }));

    await user.click(screen.getByRole("link", { name: "Governance" }));
    await waitFor(() => {
      expect(screen.getByText("workstream.approved")).toBeInTheDocument();
    });
  });

  it("navigates to Analytics and Reports tabs without crashing", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText("Migrate EKS to AKS");

    await user.click(screen.getByRole("link", { name: "Analytics" }));
    expect(await screen.findByText("Monthly cost by cloud", { exact: false })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Reports" }));
    expect(await screen.findByText("Workstream summary report")).toBeInTheDocument();
  });
});
