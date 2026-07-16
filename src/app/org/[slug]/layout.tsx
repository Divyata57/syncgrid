"use client";

import { useEffect, useState, createContext, useContext, use } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { io, Socket } from "socket.io-client";
import {
  ShieldCheck,
  LayoutDashboard,
  CheckSquare,
  Users,
  History,
  LogOut,
  Building,
  Menu,
  X,
  Wifi,
  WifiOff,
  Bell,
  ChevronDown,
  Loader2
} from "lucide-react";

// Create context for sharing user role, org details and active socket client
interface OrgContextType {
  user: any;
  organization: { id: string; name: string; slug: string; role: string } | null;
  socket: Socket | null;
  orgs: any[];
}

const OrgContext = createContext<OrgContextType>({
  user: null,
  organization: null,
  socket: null,
  orgs: [],
});

export const useOrg = () => useContext(OrgContext);

export default function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { slug } = use(params); // Next.js 16 async params hook

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [activeOrg, setActiveOrg] = useState<any>(null);
  const [allOrgs, setAllOrgs] = useState<any[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);

  // Notification states
  const [notifications, setNotifications] = useState<Array<{ id: string; message: string; type: string }>>([]);

  useEffect(() => {
    fetchWorkspaceData();
  }, [slug]);

  const fetchWorkspaceData = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        throw new Error("Unauthorized");
      }
      const data = await res.json();
      setUserData(data.user);
      setAllOrgs(data.organizations);

      const matchedOrg = data.organizations.find((o: any) => o.slug === slug);
      if (!matchedOrg) {
        // User not authorized or org not found, redirect to org selection
        router.push("/orgs");
        return;
      }
      setActiveOrg(matchedOrg);
      setLoading(false);
    } catch (err) {
      router.push("/login");
    }
  };

  // Socket.io initialization
  useEffect(() => {
    if (!slug || loading) return;

    // Connect to WebSocket server on port 3001
    const socketClient = io("http://localhost:3001");

    socketClient.on("connect", () => {
      console.log("WebSocket client connected");
      setConnected(true);
      socketClient.emit("join-org", slug);
    });

    socketClient.on("disconnect", () => {
      console.log("WebSocket client disconnected");
      setConnected(false);
    });

    // Handle real-time updates from other members
    socketClient.on("task-created", (data: any) => {
      showToast(`NEW TASK: "${data.task.title}" created by ${data.userName}`, "info");
    });

    socketClient.on("task-updated", (data: any) => {
      showToast(`UPDATE: "${data.task.title}" moved to ${data.task.status} by ${data.userName}`, "success");
    });

    socketClient.on("task-deleted", (data: any) => {
      showToast(`DELETED: Task "${data.taskTitle}" was deleted by ${data.userName}`, "warning");
    });

    // Listen for background cron notifications
    socketClient.on("due-soon-alert", (data: any) => {
      showToast(`🚨 DUE SOON: ${data.message}`, "alert");
    });

    setSocket(socketClient);

    return () => {
      socketClient.emit("leave-org", slug);
      socketClient.disconnect();
    };
  }, [slug, loading]);

  const showToast = (message: string, type: string) => {
    const id = Math.random().toString();
    setNotifications((prev) => [...prev, { id, message, type }]);
    
    // Automatically dismiss after 5 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
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
          <p className="text-zinc-500 text-sm">Loading workspace shell...</p>
        </div>
      </div>
    );
  }

  const isAdmin = activeOrg?.role === "ADMIN";

  const navigation = [
    { name: "Dashboard", href: `/org/${slug}/dashboard`, icon: LayoutDashboard },
    { name: "Tasks", href: `/org/${slug}/tasks`, icon: CheckSquare },
    { name: "Members", href: `/org/${slug}/members`, icon: Users },
  ];

  // Only Admins can see Audit Logs link
  if (isAdmin) {
    navigation.push({ name: "Audit Logs", href: `/org/${slug}/audit-logs`, icon: History });
  }

  return (
    <OrgContext.Provider value={{ user: userData, organization: activeOrg, socket, orgs: allOrgs }}>
      <div className="min-h-screen flex bg-[#050506] text-white">
        
        {/* Sidebar for Desktop */}
        <aside className="hidden md:flex md:w-64 md:flex-col fixed md:inset-y-0 bg-[#0a0a0c] border-r border-zinc-900 z-30">
          <div className="flex flex-col flex-1 min-h-0">
            
            {/* Logo */}
            <div className="flex items-center gap-3 px-6 h-16 border-b border-zinc-900 justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-rose-900 flex items-center justify-center glow-red">
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
                <span className="font-display font-bold tracking-tight text-white text-base">
                  SYNC<span className="text-red-500">GRID</span>
                </span>
              </div>

              {/* WebSocket Status Indicator */}
              <div className="flex items-center">
                {connected ? (
                  <span title="Connected to Real-Time Server">
                    <Wifi className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                  </span>
                ) : (
                  <span title="Disconnected from Real-Time Server">
                    <WifiOff className="w-3.5 h-3.5 text-zinc-650" />
                  </span>
                )}
              </div>
            </div>

            {/* Workspace Select */}
            <div className="px-4 py-4 relative border-b border-zinc-900">
              <button
                onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-900 hover:border-zinc-800 text-left transition-colors cursor-pointer text-xs"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Building className="w-4 h-4 text-red-500 shrink-0" />
                  <span className="font-medium text-white truncate">{activeOrg?.name}</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${showOrgDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showOrgDropdown && (
                <div className="absolute left-4 right-4 mt-2 py-1 bg-zinc-950 border border-zinc-900 rounded-xl shadow-2xl z-40">
                  <div className="px-3 py-1.5 text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                    Switch Workspace
                  </div>
                  {allOrgs.map((o) => (
                    <Link
                      key={o.id}
                      href={`/org/${o.slug}/dashboard`}
                      onClick={() => setShowOrgDropdown(false)}
                      className={`flex items-center justify-between px-3 py-2 text-xs hover:bg-[#0f0f12] transition-colors ${o.slug === slug ? 'text-red-500 font-medium' : 'text-zinc-400'}`}
                    >
                      <span className="truncate">{o.name}</span>
                    </Link>
                  ))}
                  <div className="border-t border-zinc-900 my-1" />
                  <Link
                    href="/orgs"
                    onClick={() => setShowOrgDropdown(false)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-[#0f0f12] transition-colors"
                  >
                    <span>Manage Workspaces</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Nav Menu */}
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group ${
                      isActive
                        ? "bg-red-950/20 text-red-500 border-l-2 border-red-500"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-950"
                    }`}
                  >
                    <item.icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-red-500' : 'text-zinc-400 group-hover:text-red-500'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Profile & Logout */}
            <div className="p-4 border-t border-zinc-900 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 text-zinc-400 font-semibold text-xs shrink-0">
                  {userData?.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-white text-xs font-semibold truncate">{userData?.name}</h4>
                  <p className="text-[10px] text-zinc-500 truncate capitalize">{activeOrg?.role.toLowerCase()}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-zinc-900 hover:border-red-950/30 hover:bg-red-950/10 text-zinc-400 hover:text-red-500 text-xs transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>

          </div>
        </aside>

        {/* Sidebar Mobile Menu Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar for Mobile */}
        <aside
          className={`fixed inset-y-0 left-0 w-64 bg-[#0a0a0c] border-r border-zinc-900 z-50 transform md:hidden transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-6 h-16 border-b border-zinc-900">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
                <span className="font-display font-bold tracking-tight text-white text-base">
                  SYNCGRID
                </span>
              </div>
              <button onClick={() => setSidebarOpen(false)}>
                <X className="w-5 h-5 text-zinc-400 hover:text-white" />
              </button>
            </div>

            {/* Nav Menu Mobile */}
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      isActive ? "bg-red-950/20 text-red-500" : "text-zinc-400 hover:text-white hover:bg-zinc-950"
                    }`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Profile & Logout Mobile */}
            <div className="p-4 border-t border-zinc-900 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 text-zinc-400 font-semibold text-xs">
                  {userData?.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-white text-xs font-semibold truncate">{userData?.name}</h4>
                  <p className="text-[10px] text-zinc-500 truncate capitalize">{activeOrg?.role.toLowerCase()}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-zinc-900 text-zinc-400 hover:text-red-500 hover:bg-red-950/10 text-xs transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col md:pl-64 min-w-0">
          
          {/* Top Bar for Mobile/Desktop */}
          <header className="h-16 border-b border-zinc-900 bg-[#050506]/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden p-1.5 rounded-lg border border-zinc-850 hover:bg-zinc-950 text-zinc-400 hover:text-white"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h2 className="text-sm font-semibold tracking-tight text-zinc-300 md:block hidden">
                Workspace &rarr; <span className="text-white">{activeOrg?.name}</span>
              </h2>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                  {connected ? 'Live Sync' : 'Offline'}
                </span>
              </div>
            </div>
          </header>

          {/* Inner Content */}
          <main className="flex-1 p-6 md:p-8 overflow-y-auto">
            {children}
          </main>
        </div>

        {/* REAL-TIME NOTIFICATION TOASTS CAROUSEL (Absolute Overlay) */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 rounded-xl shadow-2xl border text-xs flex items-start gap-3 backdrop-blur-md transition-all transform translate-y-0 duration-300 animate-bounce ${
                notif.type === "success"
                  ? "bg-emerald-950/80 border-emerald-800 text-emerald-300"
                  : notif.type === "warning"
                  ? "bg-amber-950/80 border-amber-800 text-amber-300"
                  : notif.type === "alert"
                  ? "bg-red-950/90 border-red-700 text-red-200 border-glow-red"
                  : "bg-zinc-900/90 border-zinc-800 text-zinc-300"
              }`}
            >
              <Bell className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <div>{notif.message}</div>
            </div>
          ))}
        </div>

      </div>
    </OrgContext.Provider>
  );
}
