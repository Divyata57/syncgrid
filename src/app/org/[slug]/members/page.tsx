"use client";

import { useEffect, useState } from "react";
import { useOrg } from "../layout";
import {
  UserPlus,
  Shield,
  UserCheck,
  Building,
  Mail,
  AlertTriangle,
  Loader2,
  X,
  Plus
} from "lucide-react";

interface Member {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
}

export default function MembersPage() {
  const { organization } = useOrg();
  const orgSlug = organization?.slug;
  const isAdmin = organization?.role === "ADMIN";

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (orgSlug) {
      fetchMembers();
    }
  }, [orgSlug]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/members?orgSlug=${orgSlug}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMembers(data.members);
    } catch (err) {
      console.error("Failed to load members:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgSlug, email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add member");

      setSuccess(`Successfully added user ${data.member.name} to the workspace!`);
      setInviteEmail("");
      setInviteRole("MEMBER");
      fetchMembers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, nextRole: string) => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgSlug, userId, role: nextRole }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(`Role updated successfully for member: ${data.member.name}`);
      fetchMembers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">Team Directory</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage tenant users and workspace permission roles.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-900/50 text-red-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4.5 h-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 text-xs flex items-center gap-2">
          <UserCheck className="w-4.5 h-4.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        {/* Members List (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
            Active Members ({members.length})
          </h3>

          <div className="space-y-3">
            {members.map((m) => {
              const isCurrentAdmin = m.role === "ADMIN";
              return (
                <div
                  key={m.id}
                  className="glass-panel p-5 rounded-2xl border border-zinc-900 flex items-center justify-between gap-4 transition-all duration-300 hover:border-zinc-800"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-850 text-zinc-400 font-semibold text-xs shrink-0">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-white text-sm font-semibold truncate flex items-center gap-2">
                        {m.name}
                        {isCurrentAdmin ? (
                          <span title="Administrator">
                            <Shield className="w-3.5 h-3.5 text-red-500" />
                          </span>
                        ) : (
                          <span title="Member">
                            <Building className="w-3.5 h-3.5 text-zinc-650" />
                          </span>
                        )}
                      </h4>
                      <p className="text-zinc-550 text-xs truncate">{m.email}</p>
                    </div>
                  </div>

                  {/* Role Changer (Admin only) */}
                  <div className="shrink-0">
                    {isAdmin ? (
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                        className="bg-zinc-950 border border-zinc-900 rounded-xl px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none cursor-pointer"
                      >
                        <option value="MEMBER">Member</option>
                        <option value="ADMIN">Administrator</option>
                      </select>
                    ) : (
                      <span className={`text-[10px] uppercase font-semibold px-2 py-1 rounded-md border ${isCurrentAdmin ? 'bg-red-950/20 text-red-500 border-red-900/30' : 'bg-zinc-950 text-zinc-500 border-zinc-900'}`}>
                        {m.role}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add/Invite panel (Admin only) */}
        <div className="space-y-6">
          {isAdmin ? (
            <div className="glass-panel rounded-2xl p-6 border border-zinc-900 relative">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-red-500" /> Add Team Member
              </h3>
              
              <p className="text-zinc-500 text-xs mb-6">
                Users must register an account under their email first before they can be added to the workspace.
              </p>

              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-zinc-400 text-xs mb-2">Member Email</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Mail className="w-4 h-4 text-zinc-700" />
                    </span>
                    <input
                      type="email"
                      required
                      placeholder="teammate@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full bg-[#0d0d10] border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white placeholder-zinc-700 text-xs focus:outline-none focus:border-red-600 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-xs mb-2">Role Type</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full bg-[#0d0d10] border border-zinc-800 rounded-xl py-3 px-4 text-white text-xs focus:outline-none focus:border-red-650"
                  >
                    <option value="MEMBER">Member (Read/Write Tasks)</option>
                    <option value="ADMIN">Administrator (Full Admin Access)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={inviting}
                  className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {inviting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adding member...
                    </>
                  ) : (
                    "Add Member"
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="glass-panel p-6 rounded-2xl border border-zinc-900 text-center py-12 text-zinc-550 text-xs">
              <Shield className="w-8 h-8 text-zinc-750 mx-auto mb-2" />
              <p>Team directory invites and role changes are limited to workspace Administrators only.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
