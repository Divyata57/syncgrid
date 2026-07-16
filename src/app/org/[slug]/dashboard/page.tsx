"use client";

import { useEffect, useState } from "react";
import { useOrg } from "../layout";
import {
  CheckSquare,
  TrendingUp,
  Clock,
  Users,
  History,
  Loader2,
  Calendar,
  AlertTriangle,
  Edit3
} from "lucide-react";
import Link from "next/link";

interface AnalyticsData {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  statuses: { TODO: number; IN_PROGRESS: number; DONE: number };
  priorities: { LOW: number; MEDIUM: number; HIGH: number };
  memberDistribution: Array<{ userId: string; name: string; taskCount: number }>;
  totalMembers: number;
  totalAuditLogs: number;
}

export default function DashboardPage() {
  const { organization, user, socket } = useOrg();
  
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Notes states
  const [notes, setNotes] = useState("");
  const [initialNotes, setInitialNotes] = useState("");
  const [lastEditedMsg, setLastEditedMsg] = useState("");

  useEffect(() => {
    if (organization?.slug) {
      fetchDashboardData();
      fetchNotesData();
    }
  }, [organization?.slug]);

  // Real-time Notes Sync
  useEffect(() => {
    if (!socket || !organization?.slug) return;

    const handleNoteEdited = (data: any) => {
      setNotes(data.notes);
      setInitialNotes(data.notes);
      setLastEditedMsg(`Syncing: Edited by ${data.userName} just now`);
      setTimeout(() => setLastEditedMsg(""), 4000);
    };

    socket.on("note-edited", handleNoteEdited);
    return () => {
      socket.off("note-edited", handleNoteEdited);
    };
  }, [socket, organization?.slug]);

  // Debounced auto-save notes
  useEffect(() => {
    if (notes === undefined || notes === initialNotes) return;

    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`/api/orgs/notes`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orgSlug: organization?.slug, notes }),
        });
        if (res.ok) {
          setInitialNotes(notes);
          setLastEditedMsg("Draft saved automatically");
          setTimeout(() => setLastEditedMsg(""), 3000);
        }
      } catch (err) {
        console.error("Auto-save notes failed:", err);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [notes, organization?.slug, initialNotes]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError("");
    try {
      // Fetch Analytics
      const analRes = await fetch(`/api/analytics?orgSlug=${organization?.slug}`);
      const analData = await analRes.json();
      if (!analRes.ok) throw new Error(analData.error || "Failed to load analytics");
      setAnalytics(analData.analytics);

      // Fetch Recent Audit Logs (Admins only)
      if (organization?.role === "ADMIN") {
        const logsRes = await fetch(`/api/audit-logs?orgSlug=${organization?.slug}`);
        const logsData = await logsRes.json();
        if (logsRes.ok) {
          setRecentLogs(logsData.logs.slice(0, 5)); // recent 5
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotesData = async () => {
    try {
      const res = await fetch(`/api/orgs/notes?orgSlug=${organization?.slug}`);
      const data = await res.json();
      if (res.ok) {
        setNotes(data.notes || "");
        setInitialNotes(data.notes || "");
      }
    } catch (err) {
      console.error("Failed to load notes:", err);
    }
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextNotes = e.target.value;
    setNotes(nextNotes);

    // Broadcast in real-time
    if (socket) {
      socket.emit("note-edit", {
        orgSlug: organization?.slug,
        notes: nextNotes,
        userName: user?.name,
      });
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
          <p className="text-zinc-500 text-sm">Aggregating workspace metrics...</p>
        </div>
      </div>
    );
  }

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-900 pb-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">
            Workspace Hub
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Real-time analytics for your organization tenant.
          </p>
        </div>
        <div className="flex items-center gap-2 text-zinc-500 text-sm bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-900 self-start md:self-auto">
          <Calendar className="w-4 h-4 text-red-500" />
          <span>{currentDate}</span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-900/50 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Shared Notes / Scratchpad Section - Premium Bonus Feature! */}
      <div className="glass-panel rounded-2xl p-5 border border-zinc-900 border-glow-red relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/[0.015] rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between mb-3.5">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-red-500" /> Team Scratchpad <span className="text-[10px] text-zinc-600 font-normal normal-case">(shared & saved in real-time)</span>
          </h3>
          {lastEditedMsg && (
            <span className="text-[10px] text-red-400 animate-pulse font-medium bg-red-950/20 px-2 py-0.5 rounded border border-red-900/30">
              {lastEditedMsg}
            </span>
          )}
        </div>

        <textarea
          value={notes}
          onChange={handleNotesChange}
          placeholder="Type something here to collaborate with your team. Any changes will instantly sync across all active screens in this workspace..."
          className="w-full min-h-[90px] md:min-h-[110px] bg-[#070709] border border-zinc-850 hover:border-zinc-800 focus:border-red-900/50 rounded-xl p-4 text-xs md:text-sm text-zinc-350 placeholder-zinc-700 focus:outline-none focus:ring-0 resize-y transition-colors font-sans"
        />
      </div>

      {/* Analytics Card Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tasks */}
        <div className="glass-panel p-5 rounded-2xl border border-zinc-900 relative group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/2 rounded-full blur-xl group-hover:bg-red-500/5 transition-all pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Total Tasks</span>
            <div className="w-8 h-8 rounded-lg bg-zinc-900/80 border border-zinc-800 flex items-center justify-center text-zinc-400">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{analytics?.totalTasks || 0}</div>
          <div className="text-[10px] text-zinc-600 mt-1">Across all task lists</div>
        </div>

        {/* Completion Rate */}
        <div className="glass-panel p-5 rounded-2xl border border-zinc-900 relative group overflow-hidden border-glow-red">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Completion Rate</span>
            <div className="w-8 h-8 rounded-lg bg-red-950/20 border border-red-900/30 flex items-center justify-center text-red-500">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-red-500 tracking-tight text-glow-red">{analytics?.completionRate || 0}%</div>
          {/* Progress Mini-bar */}
          <div className="w-full bg-zinc-900 h-1.5 rounded-full mt-2 overflow-hidden border border-zinc-800/50">
            <div
              className="bg-gradient-to-r from-red-700 to-red-500 h-full rounded-full glow-red"
              style={{ width: `${analytics?.completionRate || 0}%` }}
            />
          </div>
        </div>

        {/* In Progress */}
        <div className="glass-panel p-5 rounded-2xl border border-zinc-900 relative group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/2 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Active Board</span>
            <div className="w-8 h-8 rounded-lg bg-zinc-900/80 border border-zinc-800 flex items-center justify-center text-zinc-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{analytics?.statuses.IN_PROGRESS || 0}</div>
          <div className="text-[10px] text-zinc-600 mt-1">Currently in progress</div>
        </div>

        {/* Total Members */}
        <div className="glass-panel p-5 rounded-2xl border border-zinc-900 relative group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/2 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Team Directory</span>
            <div className="w-8 h-8 rounded-lg bg-zinc-900/80 border border-zinc-800 flex items-center justify-center text-zinc-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{analytics?.totalMembers || 0}</div>
          <div className="text-[10px] text-zinc-600 mt-1">Joined user connections</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Custom Visual Styled Charts (CSS based progress meters) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Status Breakdown Panel */}
          <div className="glass-panel p-6 rounded-2xl border border-zinc-900">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-6">
              Status Distribution
            </h3>
            
            <div className="space-y-4">
              {/* TODO */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-zinc-400 font-medium">To Do</span>
                  <span className="text-white font-bold">{analytics?.statuses.TODO || 0} tasks</span>
                </div>
                <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-zinc-700 h-full rounded-full"
                    style={{
                      width: `${
                        analytics?.totalTasks
                          ? ((analytics.statuses.TODO) / analytics.totalTasks) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* IN_PROGRESS */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-zinc-400 font-medium">In Progress</span>
                  <span className="text-red-400 font-bold">{analytics?.statuses.IN_PROGRESS || 0} tasks</span>
                </div>
                <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-red-800 h-full rounded-full"
                    style={{
                      width: `${
                        analytics?.totalTasks
                          ? ((analytics.statuses.IN_PROGRESS) / analytics.totalTasks) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* DONE */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-zinc-400 font-medium">Completed</span>
                  <span className="text-emerald-400 font-bold">{analytics?.statuses.DONE || 0} tasks</span>
                </div>
                <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full"
                    style={{
                      width: `${
                        analytics?.totalTasks
                          ? ((analytics.statuses.DONE) / analytics.totalTasks) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Priority Distribution Panel */}
          <div className="glass-panel p-6 rounded-2xl border border-zinc-900">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-6">
              Task Priority Level
            </h3>

            <div className="space-y-4">
              {/* HIGH */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-rose-500 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> High Priority
                  </span>
                  <span className="text-white font-bold">{analytics?.priorities.HIGH || 0} tasks</span>
                </div>
                <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-600 h-full rounded-full glow-red"
                    style={{
                      width: `${
                        analytics?.totalTasks
                          ? ((analytics.priorities.HIGH) / analytics.totalTasks) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* MEDIUM */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-amber-500 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Medium Priority
                  </span>
                  <span className="text-white font-bold">{analytics?.priorities.MEDIUM || 0} tasks</span>
                </div>
                <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-600 h-full rounded-full"
                    style={{
                      width: `${
                        analytics?.totalTasks
                          ? ((analytics.priorities.MEDIUM) / analytics.totalTasks) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* LOW */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" /> Low Priority
                  </span>
                  <span className="text-white font-bold">{analytics?.priorities.LOW || 0} tasks</span>
                </div>
                <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-zinc-650 h-full rounded-full"
                    style={{
                      width: `${
                        analytics?.totalTasks
                          ? ((analytics.priorities.LOW) / analytics.totalTasks) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right column: Recent activities (Admin only) or Workspace overview */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-zinc-900 h-full flex flex-col justify-between min-h-[380px]">
            <div>
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-4">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <History className="w-3.5 h-3.5 text-red-500" /> Activity Stream
                </h3>
                {organization?.role === "ADMIN" && (
                  <Link
                    href={`/org/${organization.slug}/audit-logs`}
                    className="text-[10px] text-red-500 hover:text-red-400 hover:underline"
                  >
                    View All
                  </Link>
                )}
              </div>

              {organization?.role !== "ADMIN" ? (
                <div className="py-12 text-center text-zinc-600 text-xs flex flex-col items-center justify-center h-full">
                  <Users className="w-8 h-8 text-zinc-700 mb-2" />
                  <p>Audit logging is exclusive to organization administrators.</p>
                </div>
              ) : recentLogs.length === 0 ? (
                <div className="py-12 text-center text-zinc-600 text-xs">
                  No activity logged yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {recentLogs.map((log) => {
                    const actionLabel = log.action.replace(/_/g, " ");
                    const dateStr = new Date(log.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    return (
                      <div key={log.id} className="text-xs border-b border-zinc-900/50 pb-2">
                        <div className="flex justify-between font-medium text-zinc-300">
                          <span className="text-white capitalize">{actionLabel.toLowerCase()}</span>
                          <span className="text-zinc-600 text-[10px]">{dateStr}</span>
                        </div>
                        <p className="text-zinc-550 text-[10px] mt-0.5 truncate">
                          By {log.user?.name || "System Alert"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-900">
              <Link
                href={`/org/${organization?.slug}/tasks`}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-950/20 border border-red-900/20 text-red-500 hover:bg-red-950/30 text-xs font-semibold tracking-wide transition-colors cursor-pointer"
              >
                Go to Tasks Workspace
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
