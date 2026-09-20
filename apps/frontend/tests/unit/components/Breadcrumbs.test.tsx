import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Breadcrumbs } from "../../../src/components/Breadcrumbs";

describe("Breadcrumbs", () => {
  it("shows Overview at the root path", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Breadcrumbs />
      </MemoryRouter>
    );
    expect(screen.getByText("Overview")).toBeInTheDocument();
  });

  it("shows Analytics at /analytics", () => {
    render(
      <MemoryRouter initialEntries={["/analytics"]}>
        <Breadcrumbs />
      </MemoryRouter>
    );
    expect(screen.getByText("Analytics")).toBeInTheDocument();
  });
});
