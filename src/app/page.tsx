"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  ArrowRight,
  Terminal,
  Activity,
  Database,
  Bell,
  Users,
  Lock,
  RefreshCw,
  FileText,
  CheckCircle2,
  Clock,
  Sparkles,
  Menu,
  X,
  ChevronRight,
  UserCheck
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // WebSocket Sandbox simulation states
  const [simTasks, setSimTasks] = useState([
    { id: "1", title: "Implement Auth Middleware", status: "DONE", assignee: "Sarah K." },
    { id: "2", title: "Optimize Database Queries", status: "IN_PROGRESS", assignee: "Alex M." },
    { id: "3", title: "Setup WebSocket server SSL", status: "TODO", assignee: "You (Simulated)" }
  ]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [wsLogs, setWsLogs] = useState<Array<{ timestamp: string; event: string; payload: string }>>([
    {
      timestamp: new Date().toLocaleTimeString(),
      event: "sys:connection",
      payload: JSON.stringify({ status: "connected", client: "guest_sim_client", transport: "websocket" }, null, 2)
    }
  ]);

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

  // WebSocket sandbox interactions
  const triggerSimTaskCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const taskObj = {
      id: Math.random().toString(36).substr(2, 4).toUpperCase(),
      title: newTaskTitle,
      status: "TODO",
      assignee: "You (Simulated)"
    };

    setSimTasks((prev) => [...prev, taskObj]);
    setNewTaskTitle("");

    // Log the simulated WS frame
    setWsLogs((prev) => [
      {
        timestamp: new Date().toLocaleTimeString(),
        event: "task:create",
        payload: JSON.stringify({ orgSlug: "sandbox-demo", task: taskObj, userName: "You (Guest)" }, null, 2)
      },
      ...prev
    ]);
  };

  const triggerSimStatusChange = (taskId: string, currentStatus: string) => {
    const nextStatusMap: Record<string, string> = {
      "TODO": "IN_PROGRESS",
      "IN_PROGRESS": "DONE",
      "DONE": "TODO"
    };
    const nextStatus = nextStatusMap[currentStatus];

    setSimTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t))
    );

    const updatedTask = simTasks.find((t) => t.id === taskId);
    if (!updatedTask) return;

    setWsLogs((prev) => [
      {
        timestamp: new Date().toLocaleTimeString(),
        event: "task:update",
        payload: JSON.stringify(
          {
            orgSlug: "sandbox-demo",
            task: { ...updatedTask, status: nextStatus },
            userName: "You (Guest)",
            changeType: `status_to_${nextStatus.toLowerCase()}`
          },
          null,
          2
        )
      },
      ...prev
    ]);
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
            <a href="#demo" className="text-xs text-zinc-400 hover:text-white transition-colors uppercase tracking-wider font-semibold">
              Interactive Demo
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
            <a
              href="#demo"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Interactive Demo
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
      <section className="relative pt-20 pb-24 md:pt-28 md:pb-32 px-6">
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
          <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-md mb-20">
            <Link
              href={user ? (orgs.length > 0 ? `/org/${orgs[0].slug}/dashboard` : "/orgs") : "/register"}
              className="py-4 px-8 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm shadow-xl hover:shadow-red-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer border border-red-500 hover:border-red-600 active:scale-[0.98]"
            >
              {user ? "Go to Workspace" : "Start Syncing Free"}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#demo"
              className="py-4 px-8 rounded-xl bg-[#0a0a0c] border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-950 text-zinc-300 hover:text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              Test Live Sandbox
            </a>
          </div>

          {/* Sleek CSS Mockup Dashboard Grid */}
          <div className="w-full relative glass-panel rounded-2xl border border-zinc-900/90 shadow-2xl p-4 sm:p-6 overflow-hidden max-w-4xl">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
            
            {/* Mock Dashboard Top Control Bar */}
            <div className="flex items-center justify-between border-b border-zinc-900/80 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                </div>
                <div className="h-5 w-40 bg-zinc-900/70 rounded-md border border-zinc-850/30" />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold font-display">Live Sync Connection</span>
              </div>
            </div>

            {/* Dashboard Mock Grid Content */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              {/* Box 1 */}
              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-900 flex flex-col gap-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Active Tasks</span>
                  <Activity className="w-3.5 h-3.5 text-red-500" />
                </div>
                <span className="text-2xl font-bold font-display text-white">14 / 20</span>
                <div className="w-full bg-zinc-900 rounded-full h-1.5">
                  <div className="bg-red-600 h-1.5 rounded-full" style={{ width: "70%" }} />
                </div>
              </div>

              {/* Box 2 */}
              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-900 flex flex-col gap-2">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">WebSocket Latency</span>
                <span className="text-2xl font-bold font-display text-emerald-400">12ms</span>
                <span className="text-[9px] text-zinc-500">Connected via persistent WSS secure protocol</span>
              </div>

              {/* Box 3 */}
              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-900 flex flex-col gap-2.5">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Recent Activity</span>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-[10px]">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <span className="text-zinc-300 font-medium truncate">Sarah moved Task #4 to DONE</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <span className="text-zinc-300 font-medium truncate">Alex edited Workspace Notes</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Glowing visual backdrop */}
            <div className="absolute inset-0 bg-gradient-to-t from-red-950/5 via-transparent to-transparent pointer-events-none" />
          </div>

        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="py-20 bg-zinc-950/40 border-y border-zinc-900/60 relative px-6">
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
            {/* Feature 1 */}
            <div className="glass-panel glass-panel-hover p-6 rounded-2xl flex flex-col gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-950/30 border border-red-900/30 flex items-center justify-center text-red-500">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white font-display uppercase tracking-wider">Multi-Tenant Isolation</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Separate workspaces secure your data completely. Dynamic routing and DB-level organization checks prevent compliance and security breaches.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-panel glass-panel-hover p-6 rounded-2xl flex flex-col gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-950/30 border border-red-900/30 flex items-center justify-center text-red-500">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white font-display uppercase tracking-wider">WebSocket Real-Time Engine</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                All team events—tasks created, updated, or deleted—broadcast instantly. Enjoy seamless coordination without reloading details.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-panel glass-panel-hover p-6 rounded-2xl flex flex-col gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-950/30 border border-red-900/30 flex items-center justify-center text-red-500">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white font-display uppercase tracking-wider">Granular Audit Logs</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Maintain compliance transparently. Full ledger records every workspace interaction, action, and modification with author identity.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="glass-panel glass-panel-hover p-6 rounded-2xl flex flex-col gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-950/30 border border-red-900/30 flex items-center justify-center text-red-500">
                <Bell className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white font-display uppercase tracking-wider">Automated Alerts Engine</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Background cron jobs continuously evaluate upcoming due dates, broadcasting alerts and logging notifications automatically before deadlines.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="glass-panel glass-panel-hover p-6 rounded-2xl flex flex-col gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-950/30 border border-red-900/30 flex items-center justify-center text-red-500">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white font-display uppercase tracking-wider">Collaborative Notes</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                A shared, real-time board scratchpad keeps everyone aligned. Debounced sync updates workspace notes cleanly across all team views.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="glass-panel glass-panel-hover p-6 rounded-2xl flex flex-col gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-950/30 border border-red-900/30 flex items-center justify-center text-red-500">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white font-display uppercase tracking-wider">Granular Team Roles</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Assign roles (ADMIN, MEMBER) cleanly. Restrict administrative routes, workspace management settings, and logs to approved admins only.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Interactive WebSocket Sandbox / Demo Section */}
      <section id="demo" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-5 flex flex-col justify-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/20 border border-emerald-900/40 text-[9px] uppercase font-bold tracking-widest text-emerald-500 mb-4 w-fit">
              <Terminal className="w-3 h-3" />
              <span>Interactive Sandbox</span>
            </div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-white mb-6">
              Experience the Live Synchronization Engine
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed mb-6">
              Use this sandbox widget to simulate creating and updating tasks. On the right, you can see the simulated WebSocket data packets that broadcast instantly to all connected clients in the workspace room.
            </p>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-red-950/30 border border-red-900/30 flex items-center justify-center text-red-500 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Event Broadcasts</h4>
                  <p className="text-[11px] text-zinc-500">Clients receive instant JSON formatted packet events.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-red-950/30 border border-red-900/30 flex items-center justify-center text-red-500 shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">No Pull Polling</h4>
                  <p className="text-[11px] text-zinc-500">Events are pushed actively, minimizing resource/CPU utilization.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sandbox Widget */}
          <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Form & Actions (Left) */}
            <div className="glass-panel p-5 rounded-2xl border border-zinc-900 flex flex-col justify-between min-h-[360px]">
              <div>
                <h3 className="text-xs uppercase font-bold text-zinc-500 tracking-wider mb-4 font-display">Task Workspace Dashboard</h3>
                
                {/* Form */}
                <form onSubmit={triggerSimTaskCreate} className="flex gap-2 mb-6">
                  <input
                    type="text"
                    required
                    placeholder="New task title..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-red-600 transition-colors"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all active:scale-[0.97]"
                  >
                    Add
                  </button>
                </form>

                {/* Simulated Task List */}
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {simTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-900 flex justify-between items-center text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate text-[11px]">{task.title}</p>
                        <p className="text-[9px] text-zinc-500">Assignee: {task.assignee}</p>
                      </div>
                      <button
                        onClick={() => triggerSimStatusChange(task.id, task.status)}
                        className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase transition-all cursor-pointer ${
                          task.status === "DONE"
                            ? "bg-emerald-950/50 border border-emerald-800/80 text-emerald-400"
                            : task.status === "IN_PROGRESS"
                            ? "bg-amber-950/50 border border-amber-800/80 text-amber-400"
                            : "bg-zinc-900 border border-zinc-850 text-zinc-400"
                        }`}
                      >
                        {task.status.replace("_", " ")}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-[9px] text-zinc-650 mt-4 border-t border-zinc-900/50 pt-2">
                *Click status buttons to cycle status and trigger WSS event logs.
              </div>
            </div>

            {/* Socket Console Logs (Right) */}
            <div className="bg-[#020203] border border-zinc-900 rounded-2xl p-4 flex flex-col justify-between font-mono text-[10px] text-zinc-400 min-h-[360px]">
              <div>
                <div className="flex justify-between items-center border-b border-zinc-900 pb-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-500 font-sans">WebSocket Client Console</span>
                  </div>
                  <button
                    onClick={() =>
                      setWsLogs([
                        {
                          timestamp: new Date().toLocaleTimeString(),
                          event: "sys:clear",
                          payload: JSON.stringify({ action: "cleared_log" }, null, 2)
                        }
                      ])
                    }
                    className="text-[9px] uppercase hover:text-white transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                </div>

                <div className="space-y-3.5 max-h-[280px] overflow-y-auto pr-1">
                  {wsLogs.map((log, index) => (
                    <div key={index} className="flex flex-col gap-1">
                      <div className="flex justify-between items-center text-[9px] text-zinc-500">
                        <span className="text-red-500">[{log.timestamp}] EVENT: {log.event}</span>
                        <span>ws://active</span>
                      </div>
                      <pre className="p-2 bg-[#09090c] border border-zinc-950 rounded-lg text-emerald-400 overflow-x-auto select-all max-w-full leading-relaxed">
                        {log.payload}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-[9px] text-zinc-600 mt-4 text-center font-sans">
                Real-time WebSocket Frames Log
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="py-24 px-6 border-t border-zinc-900 relative">
        <div className="max-w-4xl mx-auto glass-panel border border-zinc-900 rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-red-500 to-transparent" />
          
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white mb-4">
            Unify Your Workspace Environment Today
          </h2>
          <p className="text-zinc-400 text-sm max-w-lg mx-auto leading-relaxed mb-8">
            Create isolated, secure organizations for your developers and managers. Sync tasks seamlessly.
          </p>
          
          <div className="flex justify-center">
            <Link
              href={user ? (orgs.length > 0 ? `/org/${orgs[0].slug}/dashboard` : "/orgs") : "/register"}
              className="py-4 px-8 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs uppercase tracking-widest shadow-lg hover:shadow-red-950/20 transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              Get Started Now <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#020203] border-t border-zinc-950 py-12 px-6 mt-auto text-zinc-500 text-xs">
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
