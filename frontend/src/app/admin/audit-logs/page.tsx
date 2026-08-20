"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { API_BASE_URL } from "@/lib/api";
import { useRequireAuth } from "@/lib/use-require-auth";

interface AuditLogItem {
  log_id: string;
  performed_by: string | null;
  action: string;
  entity_affected: string;
  entity_id: string;
  ip_address: string | null;
  timestamp: string;
}

const SUPER_ADMIN_ROLES = ["SUPER_ADMIN"];

const ACTION_STYLES: Record<string, string> = {
  CREATE: "bg-success/10 text-success",
  READ: "bg-primary/10 text-primary",
  UPDATE: "bg-warning/10 text-warning",
  DELETE: "bg-destructive/10 text-destructive",
};

function ActionBadge({ action }: { action: string }) {
  const style = ACTION_STYLES[action] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${style}`}>{action}</span>
  );
}

function shortId(id: string | null): string {
  if (!id) return "—";
  return `${id.slice(0, 8)}…`;
}

export default function AdminAuditLogsPage() {
  const { token } = useRequireAuth(SUPER_ADMIN_ROLES);
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityId, setEntityId] = useState("");

  const fetchLogs = useCallback(
    (filterEntityId?: string) => {
      if (!token) return;
      setLoading(true);
      const url = filterEntityId
        ? `${API_BASE_URL}/api/v1/audit-logs?entity_id=${filterEntityId}`
        : `${API_BASE_URL}/api/v1/audit-logs`;
      fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setLogs(Array.isArray(data) ? data : []))
        .finally(() => setLoading(false));
    },
    [token]
  );

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  function handleFilter(event: React.FormEvent) {
    event.preventDefault();
    fetchLogs(entityId.trim() || undefined);
  }

  if (!token) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">Who accessed or changed clinical records, and when.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/doctors" className="text-sm text-muted-foreground underline">
            Doctors & Departments
          </Link>
          <Link href="/admin/billing" className="text-sm text-muted-foreground underline">
            Billing
          </Link>
        </div>
      </div>

      <form onSubmit={handleFilter} className="flex items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="entity_id" className="text-sm font-medium text-foreground">
            Entity ID
          </label>
          <input
            id="entity_id"
            value={entityId}
            onChange={(event) => setEntityId(event.target.value)}
            placeholder="Filter by patient, visit, or invoice ID"
            className="w-80 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="submit"
          className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground"
        >
          Filter
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No audit entries yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Timestamp</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Entity</th>
                <th className="px-3 py-2">Entity ID</th>
                <th className="px-3 py-2">Performed By</th>
                <th className="px-3 py-2">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.log_id} className="border-t border-border">
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-2">
                    <ActionBadge action={log.action} />
                  </td>
                  <td className="px-3 py-2 text-foreground">{log.entity_affected}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{shortId(log.entity_id)}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {shortId(log.performed_by)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{log.ip_address ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
