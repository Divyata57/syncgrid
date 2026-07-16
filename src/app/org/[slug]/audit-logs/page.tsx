"use client";

import { useEffect, useState } from "react";
import { useOrg } from "../layout";
import {
  History,
  ShieldAlert,
  Loader2,
  Calendar,
  User,
  Info
} from "lucide-react";

interface AuditLog {
  id: string;
  action: string;
  details: string;
  createdAt: string;
  userId: string | null;
  user: { name: string; email: string } | null;
}

export default function AuditLogsPage() {
  const { organization } = useOrg();
  const orgSlug = organization?.slug;
  const isAdmin = organization?.role === "ADMIN";

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (orgSlug) {
      fetchLogs();
    }
  }, [orgSlug]);

  const fetchLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/audit-logs?orgSlug=${orgSlug}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load audit logs");
      setLogs(data.logs);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="glass-panel max-w-xl mx-auto mt-12 p-8 rounded-2xl border border-zinc-900 text-center py-16">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-white mb-2">Access Denied</h2>
        <p className="text-zinc-550 text-sm">
          Audit logs contain highly sensitive system operations and are strictly restricted to organization administrators.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <History className="w-6 h-6 text-red-500" /> Audit Log Trails
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Review activity trails and configuration logs in this tenant.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-900/50 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Logs Feed */}
      {logs.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-zinc-950 border border-zinc-900 text-zinc-550 text-sm">
          No audit logs recorded for this workspace.
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => {
            const formattedAction = log.action.replace(/_/g, " ");
            let parsedDetails: any = null;
            try {
              parsedDetails = JSON.parse(log.details);
            } catch (e) {
              parsedDetails = log.details;
            }

            return (
              <div
                key={log.id}
                className="w-full glass-panel p-5 rounded-2xl border border-zinc-900 flex flex-col md:flex-row md:items-start md:justify-between gap-4 hover:border-zinc-800 transition-colors"
              >
                {/* Log Description */}
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-red-500 bg-red-950/20 border border-red-900/30 px-2.5 py-0.5 rounded-md">
                      {formattedAction}
                    </span>
                    <span className="text-[10px] text-zinc-550 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-zinc-600" />
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {/* Nested visual log details */}
                  <div className="bg-[#040405] border border-zinc-950 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-zinc-400 font-mono">
                    <Info className="w-4 h-4 text-zinc-655 shrink-0 mt-0.5" />
                    <div className="min-w-0 overflow-x-auto select-all">
                      {typeof parsedDetails === "object" ? (
                        <pre className="whitespace-pre-wrap">{JSON.stringify(parsedDetails, null, 2)}</pre>
                      ) : (
                        <p>{parsedDetails}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Operator info */}
                <div className="flex items-center gap-2.5 shrink-0 text-xs text-zinc-400 bg-zinc-950 border border-zinc-900 rounded-xl px-3.5 py-2.5 self-start md:self-auto">
                  <User className="w-3.5 h-3.5 text-red-500" />
                  <div className="text-left">
                    <span className="block font-medium text-white text-[11px]">
                      {log.user?.name || "System Automated"}
                    </span>
                    <span className="block text-[10px] text-zinc-500 font-mono">
                      {log.user?.email || "cron-job@system"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
