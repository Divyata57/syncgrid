"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  ArrowRight,
  LayoutDashboard,
  CheckSquare,
  Users,
  History,
  FileText,
  Sparkles,
  Menu,
  X,
  UserCheck
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    // Check auth status
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setOrgs(data.organizations || []);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setLoadingAuth(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setOrgs([]);
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#050506] text-white flex flex-col font-sans relative overflow-hidden selection:bg-red-500 selection:text-white">
      {/* Background neon grid patterns & radial light flares */}
      <div className="absolute top-[-10%] left-[-20%] w-[600px] h-[600px] rounded-full bg-rose-950/10 blur-[130px] animate-red-pulse pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-20%] w-[600px] h-[600px] rounded-full bg-red-950/10 blur-[130px] animate-red-pulse pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.002)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.002)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 border-b border-zinc-900/60 bg-[#050506]/70 backdrop-blur-md transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-rose-900 flex items-center justify-center glow-red transition-transform group-hover:scale-105">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold tracking-tight text-white text-lg">
              SYNC<span className="text-red-500 transition-colors group-hover:text-red-400">GRID</span>
            </span>
          </Link>

          {/* Desktop Nav Actions */}
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-xs text-zinc-400 hover:text-white transition-colors uppercase tracking-wider font-semibold">
              Features
            </a>
            <div className="w-[1px] h-4 bg-zinc-800" />

            {loadingAuth ? (
              <div className="w-24 h-8 bg-zinc-900/80 rounded-xl animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-4">
                <span className="text-xs text-zinc-400 flex items-center gap-1.5 bg-zinc-950 px-3 py-1.5 rounded-full border border-zinc-900">
                  <UserCheck className="w-3.5 h-3.5 text-red-500" />
                  Hi, {user.name}
                </span>
                <Link
                  href={orgs.length > 0 ? `/org/${orgs[0].slug}/dashboard` : "/orgs"}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs tracking-wide shadow-lg hover:shadow-red-950/20 transition-all flex items-center gap-1 cursor-pointer"
                >
                  Workspace <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-xs font-semibold text-zinc-400 hover:text-white hover:underline cursor-pointer transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link href="/login" className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors uppercase tracking-wider">
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs tracking-wider uppercase shadow-lg hover:shadow-red-950/20 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Get Started
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-zinc-400 hover:text-white focus:outline-none"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Panel */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-zinc-900 bg-[#070709] px-6 py-6 space-y-4">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Features
            </a>
            <div className="border-t border-zinc-900 pt-4 space-y-3">
              {loadingAuth ? (
                <div className="h-10 bg-zinc-900 rounded-xl animate-pulse" />
              ) : user ? (
                <>
                  <div className="text-xs text-zinc-400 px-1">Logged in as {user.name}</div>
                  <Link
                    href={orgs.length > 0 ? `/org/${orgs[0].slug}/dashboard` : "/orgs"}
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 text-white font-semibold text-sm transition-all"
                  >
                    Go to Workspace <ArrowRight className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-center py-3 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white text-sm font-semibold transition-all"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center py-3 rounded-xl border border-zinc-800 text-zinc-300 hover:text-white text-sm font-semibold transition-all"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center py-3 rounded-xl bg-red-600 text-white font-semibold text-sm transition-all"
                  >
                    Create Account
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-20 md:pt-28 md:pb-28 px-6">
        <div className="max-w-5xl mx-auto text-center flex flex-col items-center">
          
          {/* Animated Promo Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-950/20 border border-red-900/35 text-[10px] uppercase font-bold tracking-widest text-red-500 mb-8 animate-pulse shadow-[0_0_15px_rgba(225,29,72,0.05)]">
            <Sparkles className="w-3 h-3" />
            <span>Next-Gen Real-Time Engine Active</span>
          </div>

          {/* Primary Headline */}
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white max-w-4xl leading-[1.08] mb-6">
            Real-Time Collaboration.<br />
            <span className="bg-gradient-to-r from-red-500 to-rose-600 bg-clip-text text-transparent text-glow-red">
              Isolated Workspaces.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-zinc-400 text-base sm:text-lg max-w-2xl leading-relaxed mb-10">
            Securely run multi-tenant SaaS organizations. Track tasks, write collaborative team documents, and monitor change logs via fully synchronized audit trails.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-xs mb-8">
            <Link
              href={user ? (orgs.length > 0 ? `/org/${orgs[0].slug}/dashboard` : "/orgs") : "/register"}
              className="py-4 px-8 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm shadow-xl hover:shadow-red-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer border border-red-500 hover:border-red-600 active:scale-[0.98]"
            >
              {user ? "Go to Workspace" : "Start Syncing Free"}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="py-20 bg-zinc-950/40 border-t border-zinc-900/60 relative px-6 flex-1">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
              Designed for Speed. Engineered for Control.
            </h2>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
              SyncGrid integrates isolated client environments with a performance-first real-time synchronization architecture.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 - Dashboard */}
            <div className="glass-panel glass-panel-hover p-6 rounded-2xl flex flex-col gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-950/30 border border-red-900/30 flex items-center justify-center text-red-500">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white font-display uppercase tracking-wider">Workspace Dashboard</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Monitor workspace productivity at a glance. Access instant workspace summaries, metrics, and logs consolidated dynamically.
              </p>
            </div>

            {/* Feature 2 - Tasks */}
            <div className="glass-panel glass-panel-hover p-6 rounded-2xl flex flex-col gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-950/30 border border-red-900/30 flex items-center justify-center text-red-500">
                <CheckSquare className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white font-display uppercase tracking-wider">Task Management</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Create, delegate, and manage team tasks with instant WebSocket live-synchronization. Avoid page refreshes when task statuses change.
              </p>
            </div>

            {/* Feature 3 - Members */}
            <div className="glass-panel glass-panel-hover p-6 rounded-2xl flex flex-col gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-950/30 border border-red-900/30 flex items-center justify-center text-red-500">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white font-display uppercase tracking-wider">Team Management</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Securely manage organization members, user invitations, and assign granular permissions (ADMIN, MEMBER) cleanly.
              </p>
            </div>

            {/* Feature 4 - Audit Logs */}
            <div className="glass-panel glass-panel-hover p-6 rounded-2xl flex flex-col gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-950/30 border border-red-900/30 flex items-center justify-center text-red-500">
                <History className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white font-display uppercase tracking-wider">Granular Audit Logs</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Track security events and workspace activity records dynamically. Admins can audit every change, login event, and task state.
              </p>
            </div>

            {/* Feature 5 - Collaborative Notes */}
            <div className="glass-panel glass-panel-hover p-6 rounded-2xl flex flex-col gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-950/30 border border-red-900/30 flex items-center justify-center text-red-500">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white font-display uppercase tracking-wider">Collaborative Notes</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Brainstorm, draft, and modify ideas collaboratively. Dynamic WebSocket message propagation synchronizes edits across team views.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#020203] border-t border-zinc-950 py-12 px-6 text-zinc-500 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-600 to-rose-900 flex items-center justify-center glow-red">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold tracking-tight text-white">
              SYNC<span className="text-red-500">GRID</span>
            </span>
          </div>
          <div className="flex gap-6">
            <span className="hover:text-white transition-colors cursor-default">Security</span>
            <span className="hover:text-white transition-colors cursor-default">Privacy Policy</span>
            <span className="hover:text-white transition-colors cursor-default">Terms of Service</span>
          </div>
          <div>
            &copy; {new Date().getFullYear()} SyncGrid Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
