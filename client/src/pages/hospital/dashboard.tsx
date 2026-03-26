import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
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

  if (authLoading || statsLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-slate-500 text-sm font-medium">Loading dashboard…</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!user || !user.hospital) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <Building2 className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500 font-medium">Hospital profile not found.</p>
        </div>
      </AppLayout>
    );
  }




  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric" });

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center shadow-md shadow-green-500/25 shrink-0">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-display font-bold text-slate-900 leading-tight">{user.name}</h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[11px] font-mono text-slate-400">{user.hospital?.licenseNumber}</span>
                <span className="text-slate-300">&middot;</span>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  Accepting patients
                </span>
                <span className="text-[11px] text-slate-400">{dateStr}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Dashboard updated</p>
            <p className="text-sm font-semibold text-slate-700">{timeStr} &mdash; just now</p>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        {[
          { label: "Access requests", value: stats?.totalRequests ?? 0, sub: "From patients", icon: ShieldCheck, color: "from-blue-500 to-blue-600", bg: "bg-blue-50", iconColor: "text-blue-600" },
          { label: "Checked in today", value: stats?.checkedInActive ?? 0, sub: stats?.checkedInActive ? "Currently in ward" : "None active right now", icon: CalendarCheck, color: "from-amber-500 to-orange-500", bg: "bg-amber-50", iconColor: "text-amber-600" },
          { label: "Treatments completed", value: stats?.treatedCompleted ?? 0, sub: "Since activation", icon: CheckCircle, color: "from-green-500 to-teal-500", bg: "bg-green-50", iconColor: "text-green-600" },
          { label: "Pending patients", value: stats?.pendingToday ?? 0, sub: stats?.pendingToday ? "Awaiting check-in" : "Queue is clear", icon: Clock, color: "from-red-500 to-red-600", bg: "bg-red-50", iconColor: "text-red-600" },
        ].map((s, idx) => (
          <div key={idx} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${s.bg} ${s.iconColor} rounded-xl flex items-center justify-center`}>
                <s.icon className="w-4.5 h-4.5" />
              </div>
            </div>
            <p className="font-display font-extrabold text-2xl text-slate-900 mb-0.5">{s.value}</p>
            <p className="text-xs font-semibold text-slate-700">{s.label}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{s.sub}</p>
            <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${s.color} rounded-b-2xl`} />
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-7">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-500" /> Quick Actions
          </h2>
          <span className="text-[11px] text-slate-400">Tap to navigate</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { title: "Emergency Mode", desc: "Start unverified patient treatment", href: "/hospital/emergency-treatment", icon: AlertTriangle, bg: "bg-red-50 text-red-600" },
            { title: "Check In a Patient", desc: "Search by Health ID or QR code", href: "/hospital/patients", icon: Search, bg: "bg-blue-50 text-blue-600" },
            { title: "Process Check-Out", desc: "Complete an active visit", href: "/hospital/check-out", icon: LogOut, bg: "bg-green-50 text-green-600" },
            { title: "View Analytics", desc: "Dept-wise trends & charts", href: "/hospital/analytics", icon: BarChart2, bg: "bg-violet-50 text-violet-600" },
            { title: "Staff Directory", desc: "Doctors, depts & roles", href: "/hospital/staff", icon: Users, bg: "bg-teal-50 text-teal-600" },
          ].map((a, i) => (
            <Link key={i} href={a.href}>
              <div className="group bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-blue-200 transition-all duration-200 p-4 cursor-pointer h-full">
                <div className={`w-9 h-9 ${a.bg} rounded-xl flex items-center justify-center mb-3`}>
                  <a.icon className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm mb-1">{a.title}</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">{a.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Hospital Info */}
      <Card className="rounded-2xl border-slate-100 shadow-sm">
        <CardContent className="p-6">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500 fill-amber-400" /> Hospital Profile
          </h2>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            {[
              { label: "Hospital ID", value: user.hospital?.hospitalId || "—" },
              { label: "Address", value: user.hospital?.address || "—" },
              { label: "Phone", value: user.hospital?.phone || "—" },
            ].map((item, i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-xl">
                <p className="text-xs text-slate-400 mb-1 font-medium">{item.label}</p>
                <p className="font-semibold text-slate-800 truncate">{item.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
