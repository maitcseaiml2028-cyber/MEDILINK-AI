import { ReactNode, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { UserProfileModal } from "@/components/UserProfileModal";
import {
  LogOut, Activity, User, Calendar, FileText, Search, Menu,
  Stethoscope, Bot, HeartPulse, Users, Building2, ShieldCheck,
  Upload, BarChart2, Pill, ChevronRight, Bell, Wifi, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SidebarProvider, Sidebar, SidebarContent, SidebarGroup,
  SidebarGroupContent, SidebarMenu, SidebarMenuItem,
  SidebarMenuButton, SidebarTrigger
} from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

function getInitials(name?: string) {
  if (!name) return "U";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getRoleColor(role?: string) {
  switch (role) {
    case "patient": return "from-blue-500 to-violet-600";
    case "doctor": return "from-teal-500 to-blue-600";
    case "hospital": return "from-green-500 to-teal-600";
    default: return "from-slate-500 to-slate-600";
  }
}

function getRoleBadgeColor(role?: string) {
  switch (role) {
    case "patient": return "bg-blue-500/20 text-blue-300 border-blue-500/20";
    case "doctor": return "bg-teal-500/20 text-teal-300 border-teal-500/20";
    case "hospital": return "bg-green-500/20 text-green-300 border-green-500/20";
    default: return "bg-slate-500/20 text-slate-300 border-slate-500/20";
  }
}

function formatPageTitle(path: string) {
  const segment = path.split("/").filter(Boolean).pop() || "Dashboard";
  return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Friendly greetings based on time of day
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// Human-feel last-seen text
function getLastActive() {
  const minute = new Date().getMinutes();
  if (minute < 5) return "Active just now";
  if (minute < 30) return `Active ${minute}m ago`;
  return "Active today";
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);

  const { data: permissions } = useQuery({
    queryKey: ["/api/permissions"],
    queryFn: async () => {
      const r = await apiRequest("GET", "/api/permissions");
      return r.json();
    },
    enabled: !!user && user.role === "patient",
    refetchInterval: 5000,
  });

  const pendingCount = permissions?.filter((p: any) => p.accessStatus === "pending").length || 0;

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-slate-500 font-medium text-sm">Setting up your workspace…</p>
      </div>
    </div>
  );

  const getMenuItems = () => {
    if (user.role === "patient") {
      return [
        { title: "My Dashboard", url: "/patient/dashboard", icon: User },
        { title: "Appointments", url: "/patient/appointments", icon: Calendar },
        { title: "Health Journey", url: "/patient/records", icon: Activity },
        { title: "Lab Reports", url: "/patient/lab-upload", icon: Upload },
        { title: "Emergency Card", url: "/patient/emergency", icon: HeartPulse },
        { title: "AI Health Chat", url: "/patient/ai-chat", icon: Bot },
        { title: "Data Permissions", url: "/patient/access-control", icon: ShieldCheck, badge: pendingCount > 0 ? pendingCount : undefined },
      ];
    } else if (user.role === "doctor") {
      return [
        { title: "Overview", url: "/doctor/dashboard", icon: Activity },
        { title: "Patient Lookup", url: "/doctor/patients", icon: Search },
        { title: "Drug Checker", url: "/doctor/drug-checker", icon: Pill },
        { title: "AI Assistant", url: "/doctor/ai-assistant", icon: Bot },
        { title: "Emergency Access", url: "/emergency", icon: HeartPulse },
      ];
    } else if (user.role === "hospital") {
      return [
        { title: "Overview", url: "/hospital/dashboard", icon: Building2 },
        { title: "Analytics", url: "/hospital/analytics", icon: BarChart2 },
        { title: "Appointments", url: "/hospital/appointments", icon: Calendar },
        { title: "Check-In Patients", url: "/hospital/patients", icon: Search },
        { title: "Check-Out", url: "/hospital/check-out", icon: LogOut },
        { title: "Staff Directory", url: "/hospital/staff", icon: Users },
        { title: "Emergency Access", url: "/emergency", icon: HeartPulse },
        { title: "Emergency Treatment", url: "/hospital/emergency-treatment", icon: AlertTriangle },
      ];
    } else {
      return [{ title: "System Admin", url: "/admin/dashboard", icon: ShieldCheck }];
    }
  };

  const style = { "--sidebar-width": "16rem" };
  const gradient = getRoleColor(user.role);
  const badgeColor = getRoleBadgeColor(user.role);

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex min-h-screen w-full bg-[#f8fafc]">

        {/* Sidebar */}
        <Sidebar className="border-r-0 z-20" style={{ background: "hsl(222 47% 9%)" }}>

          {/* Logo area */}
          <div className="px-5 pt-5 pb-4 border-b border-white/8">
            <div className="flex items-center gap-2.5">
              <div className="bg-gradient-to-br from-blue-500 to-violet-600 p-2 rounded-xl shadow-lg shadow-blue-500/20">
                <Stethoscope className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="font-display font-bold text-white text-base tracking-tight leading-none">
                  MEDLINK <span className="text-blue-400">AI</span>
                </span>
                <div className="flex items-center gap-1 mt-0.5">
                  <Wifi className="w-2.5 h-2.5 text-green-400" />
                  <span className="text-[10px] text-green-400 font-medium">All systems live</span>
                </div>
              </div>
            </div>
          </div>

          {/* User identity card */}
          <div className="px-4 py-3 border-b border-white/8">
            <div 
              role="button"
              onClick={() => setProfileOpen(true)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer group"
              title="Edit Profile & Settings"
            >
              <div className="relative shrink-0 transition-transform group-hover:scale-105">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                  {getInitials(user.name)}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-[hsl(222_47%_9%)] rounded-full" title="Active now" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate leading-none mb-0.5 group-hover:text-blue-200 transition-colors">{user.name}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${badgeColor}`}>
                    {user.role}
                  </span>
                  <span className="text-[10px] text-slate-500">{getLastActive()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <SidebarContent className="px-3 py-3">
            <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 mb-2">
              Navigation
            </div>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {getMenuItems().map((item) => {
                    const isActive = location === item.url;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          className={`rounded-xl px-3 py-2.5 transition-all duration-150 ${
                            isActive
                              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25 hover:bg-blue-600 hover:text-white"
                              : "text-slate-400 hover:bg-white/6 hover:text-white"
                          }`}
                        >
                          <Link href={item.url} className="flex items-center gap-3 font-medium w-full relative">
                            <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-500"}`} />
                            <span className="text-sm">{item.title}</span>
                            {isActive && (
                              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />
                            )}
                            {(item as any).badge !== undefined && (
                              <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm">
                                {(item as any).badge}
                              </span>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          {/* Bottom section */}
          <div className="p-4 border-t border-white/8 mt-auto space-y-2">
            <div className="px-3 py-2 rounded-xl bg-white/5 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Local time</span>
              <span className="text-[11px] text-slate-300 font-mono font-semibold">{timeStr}</span>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150 text-sm font-medium group"
            >
              <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Sign out of {user.role} portal
            </button>
          </div>
        </Sidebar>

        {/* Main */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Top header */}
          <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl px-5 shadow-sm">
            <SidebarTrigger className="md:hidden text-slate-500 hover:text-slate-900">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>

            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="font-medium text-slate-400 capitalize hidden sm:block">{user.role}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:block" />
              <span className="font-semibold text-slate-700 capitalize">{formatPageTitle(location)}</span>
            </div>

            <div className="ml-auto flex items-center gap-2.5">
              <span className="hidden sm:block text-[11px] text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg font-medium">
                {getGreeting()}, {user.name.split(" ")[0]}
              </span>
              <div className="relative">
                <button className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                  <Bell className="w-4 h-4" />
                </button>
                {pendingCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white">
                    {pendingCount}
                  </span>
                )}
              </div>
              <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-xs shadow-sm`}>
                {getInitials(user.name)}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scrollbar-thin">
            <div className="mx-auto max-w-6xl animate-fade-in-up">
              {children}
            </div>
          </main>
        </div>

        {/* Profile Editing Modal */}
        <UserProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
      </div>
    </SidebarProvider>
  );
}
