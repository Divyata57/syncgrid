"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Building, Plus, ArrowRight, Loader2, User } from "lucide-react";

interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export default function OrgsPage() {
  const router = useRouter();

  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        throw new Error("Failed to fetch user");
      }
      const data = await res.json();
      setUser(data.user);
      setOrgs(data.organizations);
    } catch (err) {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newOrgName }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create organization");
      }

      setOrgs((prev) => [...prev, data.organization]);
      setNewOrgName("");
      // Redirect to the newly created organization dashboard
      router.push(`/org/${data.organization.slug}/dashboard`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050506]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
          <p className="text-zinc-500 text-sm">Loading workspaces...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050506] py-16 px-4 relative overflow-hidden flex flex-col justify-between">
      {/* Background glow accents */}
      <div className="absolute top-[-30%] right-[-20%] w-[600px] h-[600px] rounded-full bg-rose-950/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-30%] left-[-20%] w-[600px] h-[600px] rounded-full bg-red-950/5 blur-[150px] pointer-events-none" />

      <div className="max-w-4xl w-full mx-auto flex-1">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-zinc-900 pb-6 mb-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800">
              <User className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-white font-medium text-sm">{user?.name}</h2>
              <p className="text-zinc-500 text-xs">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-900 bg-zinc-950 text-zinc-400 hover:text-white hover:border-zinc-800 text-xs transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>

        {/* Title area */}
        <div className="text-center md:text-left mb-10">
          <h1 className="font-display text-3xl font-bold tracking-tight text-white mb-2">
            Select your workspace
          </h1>
          <p className="text-zinc-500 text-sm">
            Choose an organization to enter or spin up a new tenant workspace.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* List of Orgs */}
          <div className="space-y-4">
            <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
              Workspaces ({orgs.length})
            </h3>
            
            {orgs.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-zinc-950/50 border border-zinc-900 text-zinc-600 text-sm">
                No workspaces found. Create one to get started!
              </div>
            ) : (
              orgs.map((org) => (
                <button
                  key={org.id}
                  onClick={() => router.push(`/org/${org.slug}/dashboard`)}
                  className="w-full flex items-center justify-between p-5 rounded-2xl bg-zinc-950 hover:bg-[#0a0a0c] border border-zinc-900 hover:border-red-900/40 text-left transition-all duration-300 group cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-950/20 border border-red-900/30 flex items-center justify-center text-red-500 group-hover:scale-105 transition-transform">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-white font-medium group-hover:text-red-500 transition-colors">
                        {org.name}
                      </h4>
                      <p className="text-zinc-500 text-xs mt-0.5 capitalize">
                        Role: {org.role.toLowerCase()}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
                </button>
              ))
            )}
          </div>

          {/* Create new Org Form */}
          <div className="glass-panel rounded-2xl p-6 border border-zinc-900 relative">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-red-500" /> Create Workspace
            </h3>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-950/40 border border-red-900/50 text-red-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div>
                <label className="block text-zinc-400 text-xs mb-2">
                  Organization Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Initech Solutions"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="w-full bg-[#0d0d10] border border-zinc-800 rounded-xl py-3 px-4 text-white placeholder-zinc-700 text-sm focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create and Launch"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="mt-12 text-center text-xs text-zinc-700">
        © 2026 SyncGrid SaaS. All rights reserved.
      </div>
    </div>
  );
}
