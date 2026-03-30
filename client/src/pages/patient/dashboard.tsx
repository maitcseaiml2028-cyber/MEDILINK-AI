import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import QRCode from "react-qr-code";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import {
  UserCircle, Phone, Calendar, HeartPulse, Pill,
  ArrowRight, Clock, Activity, CheckCircle2, AlertCircle, FileText, Download
} from "lucide-react";
import { format } from "date-fns";

const safeDate = (dateVal: any) => {
  if (!dateVal) return "Unknown Date";
  try {
    const parsed = new Date(Number(dateVal) < 1e10 ? Number(dateVal) * 1000 : Number(dateVal));
    return isNaN(parsed.getTime()) ? format(new Date(dateVal), "MMM d, yyyy") : format(parsed, "MMM d, yyyy");
  } catch (e) { return "Unknown Date"; }
};

const getComputedStatus = (apt: any) => {
  if (["completed", "cancelled"].includes(apt.status)) return apt.status;
  try {
    const aptDateTime = new Date(`${apt.date}T${apt.time}`);
    if (aptDateTime < new Date()) return "expired";
  } catch (e) {}
  return apt.status;
};

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="py-2.5 border-b border-slate-50 last:border-0">
      <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">{icon}{value}</p>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: any; sub: string; color: string }) {
  return (
    <div className={`bg-white rounded-xl border-l-4 border-l-${color} border border-slate-100 p-4 shadow-sm`}>
      <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
      <p className="text-sm font-semibold text-slate-700 mt-0.5">{label}</p>
      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
    </div>
  );
}

export default function PatientDashboard() {
  const { user, isLoading: authLoading } = useAuth();

  const { data: prescriptions = [] } = useQuery({
    queryKey: ["/api/prescriptions"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/prescriptions"); return r.json(); },
    enabled: !!user,
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["/api/appointments"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/appointments"); return r.json(); },
    enabled: !!user,
  });

  const { data: records = [] } = useQuery({
    queryKey: ["/api/records"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/records"); return r.json(); },
    enabled: !!user,
  });

  if (authLoading) return (
    <AppLayout>
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-sky-200 border-t-sky-600 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading your dashboard…</p>
        </div>
      </div>
    </AppLayout>
  );

  if (!user || !user.patient) return (
    <AppLayout>
      <div className="text-center py-20"><p className="text-slate-500">Patient profile not found.</p></div>
    </AppLayout>
  );

  const latestRx = [...prescriptions].sort((a: any, b: any) =>
    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  )[0];
  const latestMeds: string[] = latestRx ? JSON.parse(latestRx.medications || "[]") : [];

  const nextApt = [...appointments]
    .filter((a: any) => !["completed", "cancelled", "expired"].includes(getComputedStatus(a)))
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  const recentLabs = records
    .filter((r: any) => r.type === "lab" || r.reportType === "lab" || r.fileUrl)
    .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 3);

  const completedApts = appointments.filter((a: any) => a.status === "completed").length;
  const totalRx = prescriptions.length;
  const upcomingCount = appointments.filter((a: any) => !["completed", "cancelled", "expired"].includes(getComputedStatus(a))).length;

  const [, setLocation] = useLocation();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const healthTips = [
    "Drink 8 glasses of water today — hydration supports faster recovery.",
    "Your next checkup is a good time to update your emergency contact.",
    "Tip: Upload recent lab reports to keep your health record complete.",
  ];
  const tipOfDay = healthTips[new Date().getDay() % healthTips.length];

  return (
    <AppLayout>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-7">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-sky-600 flex items-center justify-center text-white font-black text-lg shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {greeting}, {user.name.split(" ")[0]}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Health ID: <span className="font-mono font-semibold text-slate-600">{user.patient.healthId}</span>
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 px-3.5 py-2.5 rounded-lg max-w-sm">
          <span className="text-amber-500 text-sm shrink-0 mt-0.5">💡</span>
          <span className="text-xs text-amber-700 leading-snug">{tipOfDay}</span>
        </div>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {[
          { label: "Health ID", value: user.patient.healthId.split("-").pop(), sub: "Registered & verified", accent: "border-l-sky-500" },
          { label: "Visits completed", value: completedApts, sub: completedApts === 0 ? "No visits yet" : "All time", accent: "border-l-emerald-500" },
          { label: "Prescriptions", value: totalRx, sub: totalRx === 0 ? "None on file" : "On your profile", accent: "border-l-violet-500" },
          { label: "Upcoming", value: upcomingCount, sub: "Scheduled appointments", accent: "border-l-amber-500" },
        ].map((s, i) => (
          <div key={i} className={`bg-white rounded-2xl border-l-[6px] ${s.accent} border border-slate-100 p-6 shadow-sm shadow-slate-200/50`}>
            <p className="text-4xl font-black text-slate-900 tracking-tight">{s.value}</p>
            <p className="text-base font-bold text-slate-700 mt-1">{s.label}</p>
            <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Profile + QR row ───────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-5 mb-6">
        {/* Profile card */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCircle className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-900">Patient Profile</h2>
            </div>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />Verified
            </span>
          </div>
          <div className="px-5 py-4 grid sm:grid-cols-2 gap-x-8">
            <div>
              <InfoRow label="Full Name" value={user.name} />
              <InfoRow label="Date of Birth" value={user.patient.dateOfBirth || "Not provided"} />
              <InfoRow label="Gender" value={user.patient.gender || "Not specified"} />
            </div>
            <div>
              <InfoRow label="Email Address" value={user.email} />
              <InfoRow label="Contact" value={user.patient.contactNumber || "Not added yet"} icon={<Phone className="w-3.5 h-3.5 text-slate-400" />} />
              <InfoRow label="Emergency Contact" value={user.patient.emergencyContact || "⚠ Not set"} icon={<HeartPulse className="w-3.5 h-3.5 text-red-400" />} />
            </div>
          </div>
        </div>

        {/* QR card */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center p-5 text-center gap-3">
          <HeartPulse className="w-5 h-5 text-sky-500" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">Your Health ID Card</h3>
            <p className="text-xs text-slate-400 mt-0.5">Show at reception or scan at entry</p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
            <QRCode value={window.location.origin + "/emergency/" + user.patient.healthId} size={120} />
          </div>
          <div className="w-full py-2 px-3 bg-slate-50 border border-slate-100 rounded-lg text-slate-700 font-mono text-xs font-bold tracking-widest text-center">
            {user.patient.healthId}
          </div>
          <Button
            onClick={() => setLocation("/patient/emergency")}
            variant="outline"
            size="sm"
            className="w-full rounded-lg flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50 text-xs"
          >
            <HeartPulse className="w-3.5 h-3.5" /> Update Emergency Profile
          </Button>
        </div>
      </div>

      {/* ── Medicines + Next Appointment ───────────────────── */}
      <div className="grid lg:grid-cols-2 gap-5 mb-6">
        {/* Current Medicines */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pill className="w-4 h-4 text-violet-500" />
              <h2 className="text-sm font-bold text-slate-900">Current Medicines</h2>
            </div>
            <Link href="/patient/records" className="text-xs text-sky-600 font-semibold flex items-center gap-1 hover:underline">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="p-5">
            {!latestRx ? (
              <div className="text-center py-8">
                <Pill className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                <p className="text-sm text-slate-400">No prescriptions yet</p>
              </div>
            ) : (
              <>
                <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Diagnosis</p>
                  <p className="font-bold text-slate-900 text-sm">{latestRx.diagnosis || "General Prescription"}</p>
                  {latestRx.createdAt && (
                    <p className="text-xs text-slate-400 mt-0.5">Prescribed: {safeDate(latestRx.createdAt)}</p>
                  )}
                </div>
                <div className="divide-y divide-slate-50">
                  {latestMeds.length === 0 ? (
                    <p className="text-sm text-slate-400 py-2">No medicines listed</p>
                  ) : latestMeds.map((med: string, i: number) => (
                    <div key={i} className="flex items-center gap-3 py-2.5">
                      <span className="w-5 h-5 bg-slate-100 rounded-md flex items-center justify-center text-[11px] font-bold text-slate-500 shrink-0">{i + 1}</span>
                      <p className="text-sm font-semibold text-slate-800 flex-1">{med}</p>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Active" />
                    </div>
                  ))}
                </div>
                {latestRx.instructions && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800">
                    <strong>Instructions:</strong> {latestRx.instructions}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Next Appointment */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-500" />
              <h2 className="text-sm font-bold text-slate-900">Next Appointment</h2>
            </div>
            <Link href="/patient/appointments" className="text-xs text-sky-600 font-semibold flex items-center gap-1 hover:underline">
              All visits <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="p-5">
            {!nextApt ? (
              <div className="text-center py-8">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                <p className="text-sm text-slate-400">No upcoming appointments</p>
                <Link href="/patient/appointments" className="text-xs text-sky-600 font-semibold mt-2 inline-block hover:underline">+ Book Now</Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${
                      nextApt.status === "checked-in" ? "bg-sky-100 text-sky-700 border-sky-200" : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}>
                      {nextApt.status}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">#{nextApt.appointmentToken || `APT-${nextApt.id}`}</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2 font-bold text-slate-900">
                      <Calendar className="w-4 h-4 text-sky-500" />
                      {safeDate(nextApt.date)}
                    </p>
                    <p className="flex items-center gap-2 text-slate-500">
                      <Clock className="w-4 h-4 text-slate-400" />
                      {nextApt.time}
                    </p>
                    {nextApt.notes && <p className="text-slate-400 text-xs italic mt-1">"{nextApt.notes}"</p>}
                  </div>
                </div>
                <p className="text-xs text-slate-400 text-center">Show your Health ID QR at the reception counter</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Recent Lab Reports ─────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900">Recent Lab Reports</h2>
          </div>
          <div className="flex gap-3 items-center">
            <Link href="/patient/lab-upload" className="text-xs bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors">
              + Upload
            </Link>
            <Link href="/patient/records" className="text-xs text-sky-600 font-semibold flex items-center gap-1 hover:underline">
              All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
        <div className="p-5">
          {recentLabs.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-8 h-8 mx-auto mb-2 text-slate-200" />
              <p className="text-sm text-slate-400">No lab reports uploaded yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentLabs.map((lab: any) => (
                <div key={lab.id} className="flex items-center gap-4 py-3">
                  <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center shrink-0 border border-amber-100">
                    <FileText className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{lab.title}</p>
                    <p className="text-xs text-slate-400">{safeDate(lab.createdAt)}</p>
                  </div>
                  {lab.fileUrl && (
                    <a href={lab.fileUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-medium text-sky-600 hover:text-sky-700 flex items-center gap-1">
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
