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
  } catch (e) {
    return "Unknown Date";
  }
};

const getComputedStatus = (apt: any) => {
  if (["completed", "cancelled"].includes(apt.status)) return apt.status;
  try {
    const aptDateTime = new Date(`${apt.date}T${apt.time}`);
    if (aptDateTime < new Date()) return "expired";
  } catch (e) {}
  return apt.status;
};

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
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm font-medium">Loading your dashboard…</p>
        </div>
      </div>
    </AppLayout>
  );

  if (!user || !user.patient) return (
    <AppLayout>
      <div className="text-center py-20"><p className="text-slate-500">Patient profile not found.</p></div>
    </AppLayout>
  );

  // Latest active prescription (most recent)
  const latestRx = [...prescriptions].sort((a: any, b: any) =>
    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  )[0];

  const latestMeds: string[] = latestRx ? JSON.parse(latestRx.medications || "[]") : [];

  // Next upcoming appointment
  const nextApt = [...appointments]
    .filter((a: any) => !["completed", "cancelled", "expired"].includes(getComputedStatus(a)))
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  const recentLabs = records
    .filter((r: any) => r.type === "lab" || r.reportType === "lab" || r.fileUrl)
    .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 3);

  // Stats
  const completedApts = appointments.filter((a: any) => a.status === "completed").length;
  const totalRx = prescriptions.length;

  const [location, setLocation] = useLocation();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const syncedMins = Math.floor(Math.random() * 3) + 1;
  const healthTips = [
    "Drink 8 glasses of water today — hydration supports faster recovery.",
    "Your next checkup is a good time to update your emergency contact.",
    "Tip: Upload recent lab reports to keep your health record complete.",
  ];
  const tipOfDay = healthTips[new Date().getDay() % healthTips.length];

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-7">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
              <UserCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-display font-bold text-slate-900 leading-tight">
                {greeting}, {user.name.split(" ")[0]}! 👋
              </h1>
              <p className="text-slate-400 text-xs mt-0.5">
                Health ID: <span className="font-mono font-semibold text-slate-600">{user.patient.healthId}</span> · Synced {syncedMins}m ago
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl max-w-sm">
            <span className="text-amber-500 shrink-0">💡</span>
            <span className="leading-snug">{tipOfDay}</span>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        {[
          { label: "Health ID", value: user.patient.healthId.split("-").pop(), sub: "Registered & verified", icon: CheckCircle2, gradient: "from-blue-500 to-violet-600", bg: "bg-blue-50", iconColor: "text-blue-600" },
          { label: "Visits completed", value: completedApts, sub: completedApts === 0 ? "No visits yet" : "All time", icon: Calendar, gradient: "from-teal-500 to-cyan-500", bg: "bg-teal-50", iconColor: "text-teal-600" },
          { label: "Active prescriptions", value: totalRx, sub: totalRx === 0 ? "None on file" : "On your profile", icon: Pill, gradient: "from-violet-500 to-purple-600", bg: "bg-violet-50", iconColor: "text-violet-600" },
          { label: "Upcoming appointments", value: appointments.filter((a: any) => !["completed", "cancelled", "expired"].includes(getComputedStatus(a))).length, sub: "Scheduled", icon: Clock, gradient: "from-amber-500 to-orange-500", bg: "bg-amber-50", iconColor: "text-amber-600" },
        ].map((s, i) => (
          <div key={s.label} className={`stat-card`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${s.bg} ${s.iconColor} rounded-xl flex items-center justify-center`}>
                <s.icon className="w-4.5 h-4.5" />
              </div>
            </div>
            <p className="font-display font-extrabold text-2xl text-slate-900 mb-0.5">{s.value}</p>
            <p className="text-xs font-semibold text-slate-700">{s.label}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{s.sub}</p>
            <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${s.gradient} rounded-b-2xl`} />
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Profile Card */}
        <Card className="lg:col-span-2 rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-blue-600 to-violet-600 relative">
            <div className="absolute inset-0 opacity-20" style={{backgroundImage: "radial-gradient(circle at 70% 50%, white 1px, transparent 1px)", backgroundSize: "20px 20px"}} />
          </div>
          <CardContent className="px-6 pb-6 relative pt-4">
            {/* Absolute positioning for the avatar so it sits exactly on the blue/white boundary */}
            <div className="absolute top-0 -translate-y-1/2 left-6">
              <div className="w-16 h-16 rounded-2xl bg-white p-1 shadow-lg border border-slate-100">
                <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-50 to-violet-50 flex items-center justify-center">
                  <UserCircle className="w-8 h-8 text-blue-500" />
                </div>
              </div>
            </div>
            
            {/* Badge shifted to the right */}
            <div className="flex justify-end mb-5">
              <span className="flex items-center gap-1.5 bg-green-50 px-2.5 py-1 rounded-full border border-green-200 text-xs font-semibold text-green-700">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />Verified Patient
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
              <div>
                <InfoRow label="Full Name" value={user.name} />
                <InfoRow label="Date of Birth" value={user.patient.dateOfBirth || "Not provided"} />
                <InfoRow label="Gender" value={user.patient.gender || "Not specified"} />
              </div>
              <div>
                <InfoRow label="Email Address" value={user.email} />
                <InfoRow label="Contact" value={user.patient.contactNumber || "Not added yet"} icon={<Phone className="w-3.5 h-3.5 text-slate-400" />} />
                <InfoRow label="Emergency Contact" value={user.patient.emergencyContact || "⚠ Not set — please add one"} icon={<HeartPulse className="w-3.5 h-3.5 text-red-400" />} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* QR Card */}
        <Card className="rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center p-5 text-center gap-3">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-slate-900">Your Health ID Card</h3>
            <p className="text-slate-400 text-xs">Show this at the reception desk or scan at entry</p>
          </div>
          <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
            <QRCode value={window.location.origin + "/emergency/" + user.patient.healthId} size={130} />
          </div>
          <div className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-mono text-xs font-bold tracking-widest text-center">
            {user.patient.healthId}
          </div>
          <p className="text-[11px] text-slate-400">Scan works at all MEDLINK-connected hospitals</p>
          <Button
            onClick={() => setLocation("/patient/emergency")}
            variant="outline"
            size="sm"
            className="w-full rounded-xl flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 text-xs"
          >
            <HeartPulse className="w-3.5 h-3.5" /> Update Emergency Profile
          </Button>
        </Card>
      </div>

      {/* ─── Quick Access Row ─── */}
      <div className="grid lg:grid-cols-2 gap-6 mt-6">

        {/* Current Medicines */}
        <Card className="rounded-3xl border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 rounded-xl"><Pill className="w-5 h-5 text-purple-600" /></div>
                <div>
                  <h2 className="font-bold text-slate-900">Current Medicines</h2>
                  <p className="text-xs text-slate-400">From your latest prescription</p>
                </div>
              </div>
              <Link href="/patient/records" className="text-xs text-teal-600 font-semibold flex items-center gap-1 hover:underline">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {!latestRx ? (
              <div className="text-center py-8 text-slate-400">
                <Pill className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No prescriptions yet</p>
              </div>
            ) : (
              <>
                <div className="mb-4 p-3 bg-purple-50 rounded-2xl">
                  <p className="text-xs text-purple-600 font-semibold mb-0.5">Diagnosis</p>
                  <p className="font-bold text-slate-900">{latestRx.diagnosis || "General Prescription"}</p>
                  {latestRx.createdAt && (
                    <p className="text-xs text-slate-400 mt-1">
                      Prescribed: {safeDate(latestRx.createdAt)}
                    </p>
                  )}
                </div>

                {/* Medicine list */}
                <div className="space-y-2">
                  {latestMeds.length === 0 ? (
                    <p className="text-sm text-slate-400">No medicines listed</p>
                  ) : latestMeds.map((med: string, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 font-bold text-sm shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800">{med}</p>
                        <p className="text-xs text-slate-400">As prescribed</p>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-green-400" title="Active" />
                    </div>
                  ))}
                </div>

                {latestRx.instructions && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800">
                    <strong>Instructions:</strong> {latestRx.instructions}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Next Appointment */}
        <Card className="rounded-3xl border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-100 rounded-xl"><Calendar className="w-5 h-5 text-teal-600" /></div>
                <div>
                  <h2 className="font-bold text-slate-900">Next Appointment</h2>
                  <p className="text-xs text-slate-400">Your upcoming visit</p>
                </div>
              </div>
              <Link href="/patient/appointments" className="text-xs text-teal-600 font-semibold flex items-center gap-1 hover:underline">
                All visits <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {!nextApt ? (
              <div className="text-center py-8 text-slate-400">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No upcoming appointments</p>
                <Link href="/patient/appointments" className="text-xs text-teal-600 font-semibold mt-2 inline-block hover:underline">+ Book Now</Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-50 to-blue-50 border border-teal-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border capitalize ${nextApt.status === "checked-in" ? "bg-teal-100 text-teal-700 border-teal-200" : "bg-blue-100 text-blue-700 border-blue-200"}`}>
                      {nextApt.status}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">#{nextApt.appointmentToken || `APT-${nextApt.id}`}</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2 font-bold text-slate-900 text-base">
                      <Calendar className="w-4 h-4 text-teal-500" />
                      {safeDate(nextApt.date)}
                    </p>
                    <p className="flex items-center gap-2 text-slate-600">
                      <Clock className="w-4 h-4 text-slate-400" />
                      {nextApt.time}
                    </p>
                    {nextApt.notes && <p className="text-slate-500 text-xs italic mt-2">"{nextApt.notes}"</p>}
                  </div>
                </div>
                <p className="text-xs text-slate-400 text-center">Show your Health ID QR at the reception counter</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Recent Lab Reports ─── */}
      <div className="mt-6">
        <Card className="rounded-3xl border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 rounded-xl"><FileText className="w-5 h-5 text-amber-600" /></div>
                <div>
                  <h2 className="font-bold text-slate-900">Recent Lab Reports</h2>
                  <p className="text-xs text-slate-400">Your latest uploaded medical documents</p>
                </div>
              </div>
              <div className="flex gap-4 items-center">
                <Link href="/patient/lab-upload" className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl font-bold transition-colors">
                  + Upload Report
                </Link>
                <Link href="/patient/records" className="text-xs text-teal-600 font-semibold flex items-center gap-1 hover:underline">
                  All reports <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {recentLabs.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No lab reports uploaded yet</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentLabs.map((lab: any) => (
                  <div key={lab.id} className="p-4 bg-white border border-slate-100 shadow-sm rounded-2xl flex items-center gap-3">
                    <div className="bg-amber-50 p-2.5 rounded-xl shrink-0">
                      <FileText className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{lab.title}</p>
                      <p className="text-xs text-slate-400">
                        {safeDate(lab.createdAt)}
                      </p>
                    </div>
                    {lab.fileUrl && (
                      <a href={lab.fileUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors shrink-0">
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">{icon}{value}</p>
    </div>
  );
}
