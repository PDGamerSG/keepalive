"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef } from "ag-grid-community";
import { STATE_LABEL, STATE_TONE, subscriberState, type SubscriberState } from "@/lib/subscriber-state";
import type { Subscriber } from "@/lib/types";
import { adminAction } from "./admin";
import { planName } from "./labels";

ModuleRegistry.registerModules([AllCommunityModule]);

const gridTheme = themeQuartz.withParams({
  browserColorScheme: "light",
  accentColor: "#0a0a0a",
  backgroundColor: "#ffffff",
  foregroundColor: "#0a0a0a",
  headerBackgroundColor: "#fafafa",
  headerTextColor: "#6b6b6b",
  headerFontWeight: 500,
  borderColor: "#e7e7e7",
  rowHoverColor: "#f4f4f4",
  fontFamily: "inherit",
  fontSize: 13,
  wrapperBorderRadius: 12,
});

const FILTERS: [value: SubscriberState | "all", label: string][] = [
  ["all", "All"],
  ["active", "Active"],
  ["paused", "Paused"],
  ["offer", "Discount"],
  ["pending", "Switching"],
  ["cancelled", "Cancelled"],
];

export function SubscriberGrid({ rows }: { rows: Subscriber[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [state, setState] = useState<SubscriberState | "all">("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shown = useMemo(() => (state === "all" ? rows : rows.filter((r) => subscriberState(r) === state)), [rows, state]);

  const cols = useMemo<ColDef<Subscriber>[]>(() => {
    async function resume(id: string) {
      setBusy(true);
      setError(null);
      try {
        await adminAction({ action: "resume", id });
        router.refresh();
      } catch (e) {
        setError(`Resume failed: ${e instanceof Error ? e.message : e}`);
      } finally {
        setBusy(false);
      }
    }
    return [
      { field: "name", headerName: "Subscriber", flex: 1.2, minWidth: 150 },
      { field: "email", flex: 1.3, minWidth: 190 },
      { field: "tier", headerName: "Plan", width: 110, valueFormatter: (p) => planName(String(p.value)) },
      {
        headerName: "State",
        width: 200,
        valueGetter: (p) => (p.data ? STATE_LABEL[subscriberState(p.data)] : ""),
        cellRenderer: (p: { data?: Subscriber; value: string }) =>
          p.data ? <span className={`badge badge-${STATE_TONE[subscriberState(p.data)]}`}>{p.value}</span> : null,
      },
      { field: "priceUsd", headerName: "Price a month", width: 130, valueFormatter: (p) => `$${Number(p.value).toFixed(2)}` },
      {
        headerName: "Retention",
        flex: 1.2,
        minWidth: 180,
        valueGetter: (p) =>
          p.data?.resumeAt
            ? `Paused until ${new Date(p.data.resumeAt).toLocaleDateString()}`
            : p.data?.discountUntil
              ? `Discount until ${new Date(p.data.discountUntil).toLocaleDateString()}`
              : p.data?.pendingRevise
                ? `Waiting for PayPal approval to switch to ${planName(p.data.pendingRevise.toTier)}`
                : "",
      },
      { field: "id", headerName: "PayPal subscription", width: 170, cellClass: "mono" },
      {
        field: "createdAt",
        headerName: "Since",
        width: 120,
        sort: "desc",
        valueFormatter: (p) => new Date(p.value).toLocaleDateString(),
      },
      {
        headerName: "",
        width: 160,
        sortable: false,
        cellRenderer: (p: { data: Subscriber }) => (
          <span className="grid-actions">
            <a href={`/account/${p.data.id}`}>Account</a>
            {p.data.status === "SUSPENDED" && (
              <button disabled={busy} onClick={() => resume(p.data.id)}>
                Resume
              </button>
            )}
          </span>
        ),
      },
    ];
  }, [busy, router]);

  return (
    <>
      <div className="dash-tools">
        <input
          className="field"
          type="search"
          aria-label="Search subscribers"
          placeholder="Search by name, email or subscription"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="seg" role="radiogroup" aria-label="Filter by state">
          {FILTERS.map(([value, label]) => (
            <button key={value} type="button" role="radio" aria-checked={state === value} onClick={() => setState(value)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
      <div className="grid-wrap">
        <AgGridReact<Subscriber>
          theme={gridTheme}
          rowData={shown}
          columnDefs={cols}
          quickFilterText={search}
          defaultColDef={{ sortable: true, resizable: true }}
          pagination
          paginationPageSize={20}
          getRowId={(p) => p.data.id}
          overlayNoRowsTemplate="No subscribers match. Subscribe in the Brewbox shop to add one."
        />
      </div>
    </>
  );
}
