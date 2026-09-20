import { useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState
} from "@tanstack/react-table";
import type { Workstream } from "../types";

const columnHelper = createColumnHelper<Workstream>();

export function WorkstreamsGrid({
  workstreams,
  onApprove
}: {
  workstreams: Workstream[];
  onApprove: (id: string) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "risk_score", desc: true }]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", { header: "Workstream" }),
      columnHelper.accessor("cloud", {
        header: "Cloud",
        cell: (info) => <span className={`cloud-pill cloud-${info.getValue()}`}>{info.getValue()}</span>
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => <span className={`status-pill status-${info.getValue()}`}>{info.getValue()}</span>
      }),
      columnHelper.accessor("owner", { header: "Owner" }),
      columnHelper.accessor("risk_score", {
        header: "Risk",
        cell: (info) => `${info.getValue().toFixed(0)}%`
      }),
      columnHelper.accessor("deploy_latency_ms", {
        header: "Deploy latency",
        cell: (info) => `${info.getValue().toFixed(0)} ms`
      }),
      columnHelper.accessor("monthly_cost_usd", {
        header: "Monthly cost",
        cell: (info) => `$${info.getValue().toFixed(2)}`
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (info) =>
          info.row.original.status === "in_review" ? (
            <button onClick={() => onApprove(info.row.original.id)}>Approve</button>
          ) : null
      })
    ],
    [onApprove]
  );

  const table = useReactTable({
    data: workstreams,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel()
  });

  return (
    <div className="workstreams-grid" data-testid="workstreams-grid">
      <input
        className="grid-filter"
        placeholder="Filter workstreams by name, cloud, owner, or status…"
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        aria-label="Filter workstreams"
      />
      <table className="run-table">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} onClick={header.column.getToggleSortingHandler()}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {{ asc: " ▲", desc: " ▼" }[header.column.getIsSorted() as string] ?? ""}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className={`status-${row.original.status}`}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
              ))}
            </tr>
          ))}
          {table.getRowModel().rows.length === 0 && (
            <tr>
              <td colSpan={columns.length}>No workstreams match "{globalFilter}".</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
