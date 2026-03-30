import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useLocation } from "wouter";
import { useAppointments } from "@/hooks/use-appointments";
import { format } from "date-fns";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader,
  DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Plus, Building2, CheckCircle2, Clock,
  Users, ClipboardList, Activity, Pill, Stethoscope,
  CalendarCheck, HeartPulse, ArrowRight
} from "lucide-react";
import { useState } from "react";

export default function DoctorDashboard() {
  const { user, isLoading } = useAuth();
  const { data: appointments } = useAppointments();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);

  const { data: prescriptions } = useQuery({
    queryKey: ["/api/prescriptions"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/prescriptions"); return r.json(); }
  });

  const specialization = user?.doctor?.specialization;
  const { data: deptVisits } = useQuery({
    queryKey: [`/api/visits/department/${specialization}`],
    queryFn: async () => {
      if (!specialization) return [];
      const r = await apiRequest("GET", `/api/visits/department/${specialization}`);
      return r.json();
    },
    enabled: !!specialization
  });

  const { data: hospitals } = useQuery({
    queryKey: ["/api/hospitals"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/hospitals"); return r.json(); }
  });

  if (isLoading) return (
    <AppLayout>
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading dashboard…</p>
        </div>
      </div>
    </AppLayout>
  );

  const patientArrivals = deptVisits?.length || 0;

  return (
    <AppLayout>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-7">
        <div className="w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-lg shrink-0">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Dr. {user?.name}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
              {user?.doctor?.specialization}
            </span>
            <span className="text-xs text-slate-400 font-mono">{user?.doctor?.doctorId}</span>
          </div>
        </div>
      </div>

      {/* — Stat Cards — */}
      <div className="grid md:grid-cols-3 gap-5 mb-8">
        {[
          { label: "Today's Patients", value: patientArrivals, sub: patientArrivals > 0 ? "In the clinic today" : "No appointments yet", accent: "border-l-emerald-500" },
          { label: "Prescriptions Issued", value: prescriptions?.length || 0, sub: "Since your last shift", accent: "border-l-sky-500" },
          { label: "Hospital Status", value: user?.doctor?.joinStatus || "Independent", sub: user?.doctor?.currentHospitalId ? "Currently connected" : "Not affiliated", accent: "border-l-violet-500" },
        ].map((s, i) => (
          <div key={i} className={`bg-white rounded-2xl border-l-[6px] ${s.accent} border border-slate-100 p-6 shadow-sm shadow-slate-200/50`}>
            <p className="text-4xl font-black text-slate-900 tracking-tight">{s.value}</p>
            <p className="text-base font-bold text-slate-700 mt-1">{s.label}</p>
            <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* ── Quick Actions ─────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-50">
            <h2 className="text-sm font-bold text-slate-900">Quick Actions</h2>
          </div>
          <div className="p-3 space-y-1">
            {[
              { href: "/doctor/patients", icon: Users, title: "Patient Lookup", desc: "Search patient by Health ID", accent: "text-emerald-600 bg-emerald-50" },
              { href: "/doctor/drug-checker", icon: Pill, title: "Drug Checker", desc: "Check medication interactions", accent: "text-violet-600 bg-violet-50" },
              { href: "/doctor/ai-assistant", icon: Activity, title: "AI Assistant", desc: "Get diagnostic support", accent: "text-sky-600 bg-sky-50" },
              { href: "/emergency", icon: HeartPulse, title: "Emergency Access", desc: "View emergency patient data", accent: "text-red-600 bg-red-50" },
            ].map((item) => (
              <div
                key={item.href}
                onClick={() => setLocation(item.href)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group"
              >
                <div className={`w-8 h-8 ${item.accent} rounded-lg flex items-center justify-center shrink-0`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
            ))}
          </div>
        </div>

        {/* ── Hospital Association ───────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Hospital Association</h2>
            <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs h-8">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Join Hospital
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] rounded-2xl bg-white">
                <DialogHeader>
                  <DialogTitle className="font-bold text-slate-900">Join a Hospital</DialogTitle>
                  <DialogDescription className="text-slate-500 text-sm">
                    Search for a hospital to request to join their staff.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search hospital name..."
                      className="pl-10 rounded-lg h-10"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="max-h-[280px] overflow-y-auto divide-y divide-slate-50">
                    {hospitals?.filter((h: any) =>
                      h.user.name.toLowerCase().includes(search.toLowerCase())
                    ).map((h: any) => (
                      <div key={h.id} className="flex items-center justify-between py-3 px-1 hover:bg-slate-50 rounded-lg transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-slate-500" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">{h.user.name}</p>
                            <p className="text-xs text-slate-400 truncate max-w-[200px]">{h.address}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                          onClick={async () => {
                            try {
                              const res = await apiRequest("POST", "/api/doctor/request-join", { hospitalId: h.id });
                              const data = await res.json();
                              if (res.ok) {
                                toast({ title: "Success", description: data.message });
                                setIsJoinDialogOpen(false);
                              } else {
                                toast({ title: "Error", description: data.message, variant: "destructive" });
                              }
                            } catch (e) {
                              toast({ title: "Error", description: "Failed to send request", variant: "destructive" });
                            }
                          }}
                        >
                          Request
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="p-5">
            {user?.doctor?.currentHospitalId ? (
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
                <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Active Hospital</p>
                  <p className="font-bold text-slate-900 text-sm">Connected to hospital</p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-600 ml-auto" />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center mb-3">
                  <Building2 className="w-6 h-6 text-slate-300" />
                </div>
                <p className="font-bold text-slate-900 text-sm mb-1">Not affiliated</p>
                <p className="text-xs text-slate-400 max-w-[200px] mb-4">
                  Join a hospital to access shared patient records and appointments.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg text-sm border-slate-200 text-slate-700 hover:bg-slate-50"
                  onClick={() => setIsJoinDialogOpen(true)}
                >
                  Find a Hospital
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Patient Queue ─────────────────────────────────── */}
      <div className="mt-6 bg-white rounded-xl border border-slate-100 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-900">Patient Queue</h2>
          <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 text-xs font-bold">{patientArrivals}</span>
          <span className="text-xs text-slate-400 ml-auto">Auto-refreshes on check-in</span>
        </div>

        {patientArrivals === 0 ? (
          <div className="py-14 text-center flex flex-col items-center">
            <CheckCircle2 className="w-8 h-8 text-slate-200 mb-2" />
            <p className="font-bold text-slate-700 text-sm">Queue is clear</p>
            <p className="text-xs text-slate-400 mt-0.5">No patients waiting for {user?.doctor?.specialization}.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {deptVisits?.map((visit: any) => (
              <div key={visit.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                <div className="w-9 h-9 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm">Patient {visit.patient?.healthId || `#${visit.patientId}`}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    Checked in at {format(new Date(visit.checkInTime), "h:mm a")}
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-100 px-2.5 py-1 rounded-full">
                  Waiting
                </span>
                <Button
                  size="sm"
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                  onClick={() => setLocation(`/doctor/patients?id=${visit.patient?.healthId || ''}`)}
                >
                  Call →
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
