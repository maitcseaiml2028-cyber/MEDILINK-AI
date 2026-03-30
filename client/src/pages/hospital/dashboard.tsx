import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Activity, Users, CalendarCheck, LogOut, CheckCircle, Clock,
  ArrowRight, BarChart2, Search, Building2, Star, ShieldCheck, AlertTriangle
} from "lucide-react";
import { Link } from "wouter";

export default function HospitalDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/hospital/dashboard-stats"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/hospital/dashboard-stats"); return r.json(); },
    enabled: !!user?.hospital
  });

  if (authLoading || statsLoading) return (
    <AppLayout>
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading dashboard…</p>
        </div>
      </div>
    </AppLayout>
  );

  if (!user || !user.hospital) return (
    <AppLayout>
      <div className="text-center py-20">
        <Building2 className="w-10 h-10 mx-auto mb-3 text-slate-200" />
        <p className="text-slate-500 font-medium text-sm">Hospital profile not found.</p>
      </div>
    </AppLayout>
  );

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric" });

  return (
    <AppLayout>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-7">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-violet-600 flex items-center justify-center text-white font-black text-lg shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">{user.name}</h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs font-mono text-slate-400">{user.hospital?.licenseNumber}</span>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Accepting patients
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Last updated</p>
          <p className="text-sm font-semibold text-slate-700">{timeStr} — {dateStr}</p>
        </div>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {[
          { label: "Access requests", value: stats?.totalRequests ?? 0, sub: "From patients", accent: "border-l-sky-500" },
          { label: "Checked in today", value: stats?.checkedInActive ?? 0, sub: stats?.checkedInActive ? "Currently in ward" : "None active right now", accent: "border-l-amber-500" },
          { label: "Treatments completed", value: stats?.treatedCompleted ?? 0, sub: "Since activation", accent: "border-l-emerald-500" },
          { label: "Pending patients", value: stats?.pendingToday ?? 0, sub: stats?.pendingToday ? "Awaiting check-in" : "Queue is clear", accent: "border-l-red-500" },
        ].map((s, i) => (
          <div key={i} className={`bg-white rounded-2xl border-l-[6px] ${s.accent} border border-slate-100 p-6 shadow-sm`}>
            <p className="text-4xl font-black text-slate-900 tracking-tight">{s.value}</p>
            <p className="text-base font-bold text-slate-700 mt-1">{s.label}</p>
            <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Quick Actions ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm mb-6">
        <div className="px-5 py-4 border-b border-slate-50">
          <h2 className="text-sm font-bold text-slate-900">Quick Actions</h2>
        </div>
        <div className="p-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-1">
            {[
              { title: "Emergency Mode", desc: "Start unverified patient treatment", href: "/hospital/emergency-treatment", icon: AlertTriangle, accent: "text-red-600 bg-red-50" },
              { title: "Check In a Patient", desc: "Search by Health ID or QR code", href: "/hospital/patients", icon: Search, accent: "text-sky-600 bg-sky-50" },
              { title: "Process Check-Out", desc: "Complete an active visit", href: "/hospital/check-out", icon: LogOut, accent: "text-emerald-600 bg-emerald-50" },
              { title: "View Analytics", desc: "Dept-wise trends & charts", href: "/hospital/analytics", icon: BarChart2, accent: "text-violet-600 bg-violet-50" },
              { title: "Appointments", desc: "Manage upcoming bookings", href: "/hospital/appointments", icon: CalendarCheck, accent: "text-amber-600 bg-amber-50" },
              { title: "Staff Directory", desc: "Doctors, depts & roles", href: "/hospital/staff", icon: Users, accent: "text-teal-600 bg-teal-50" },
            ].map((a, i) => (
              <Link key={i} href={a.href}>
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group">
                  <div className={`w-8 h-8 ${a.accent} rounded-lg flex items-center justify-center shrink-0`}>
                    <a.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{a.title}</p>
                    <p className="text-xs text-slate-400">{a.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Hospital Profile ─────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-bold text-slate-900">Hospital Profile</h2>
        </div>
        <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-50">
          {[
            { label: "Hospital ID", value: user.hospital?.hospitalId || "—" },
            { label: "Address", value: user.hospital?.address || "—" },
            { label: "Phone", value: user.hospital?.phone || "—" },
          ].map((item, i) => (
            <div key={i} className="px-5 py-4">
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1">{item.label}</p>
              <p className="text-sm font-semibold text-slate-800 truncate">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
