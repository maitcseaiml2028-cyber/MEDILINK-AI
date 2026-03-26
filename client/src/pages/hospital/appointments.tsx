import { AppLayout } from "@/components/layout/AppLayout";
import { useAppointments, useUpdateAppointmentStatus } from "@/hooks/use-appointments";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, LogIn, LogOut, CheckCircle2, QrCode, Hash } from "lucide-react";
import { format } from "date-fns";

type Status = "booked" | "pending" | "checked-in" | "completed" | "cancelled" | string;

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  booked: { label: "Booked", color: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  "checked-in": { label: "Checked In", color: "bg-teal-100 text-teal-700 border-teal-200", dot: "bg-teal-500" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" },
  accepted: { label: "Accepted", color: "bg-purple-100 text-purple-700 border-purple-200", dot: "bg-purple-500" },
  expired: { label: "Expired", color: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" },
};

const getStatusConfig = (s: Status) => STATUS_CONFIG[s] || { label: s, color: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" };

const getComputedStatus = (apt: any) => {
  if (["completed", "cancelled"].includes(apt.status)) return apt.status;
  try {
    const aptDateTime = new Date(`${apt.date}T${apt.time}`);
    if (aptDateTime < new Date()) return "expired";
  } catch (e) {}
  return apt.status;
};

export default function HospitalAppointments() {
  const { data: appointments, isLoading } = useAppointments();
  const updateMutation = useUpdateAppointmentStatus();

  const groups = {
    pending: (appointments || []).filter((a: any) => ["pending", "booked"].includes(getComputedStatus(a))),
    active: (appointments || []).filter((a: any) => getComputedStatus(a) === "checked-in"),
    completed: (appointments || []).filter((a: any) => getComputedStatus(a) === "completed"),
    other: (appointments || []).filter((a: any) => ["cancelled", "accepted", "rejected", "expired"].includes(getComputedStatus(a))),
  };

  const AptCard = ({ apt }: { apt: any }) => {
    const status = getComputedStatus(apt);
    const cfg = getStatusConfig(status);
    const dateStr = (() => { try { return format(new Date(apt.date), "EEE, MMM d yyyy"); } catch { return apt.date; } })();
    return (
      <Card className="rounded-2xl border-0 shadow-md shadow-slate-200/50 hover:shadow-lg transition-all">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${cfg.dot} animate-pulse`}></div>
                <span className={`px-3 py-0.5 rounded-full text-xs font-bold border capitalize ${cfg.color}`}>{cfg.label}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono"># Token: {apt.appointmentToken || `APT-${apt.id}`}</p>
            </div>
            <div className="text-right text-xs text-slate-400">
              <div className="flex items-center gap-1 justify-end"><Calendar className="w-3 h-3" />{dateStr}</div>
              <div className="flex items-center gap-1 justify-end mt-1"><Clock className="w-3 h-3" />{apt.time}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
            <User className="w-4 h-4 text-slate-400" />
            <span>Patient ID: <strong className="text-slate-900">#{apt.patientId}</strong></span>
            {apt.doctorId && <span className="text-slate-400 ml-2">• Doctor #{apt.doctorId}</span>}
          </div>

          {apt.notes && <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg mb-4 line-clamp-2">{apt.notes}</p>}

          {/* Status action buttons */}
          <div className="flex gap-2 flex-wrap">
            {(apt.status === "booked" || apt.status === "pending") && (
              <>
                <Button size="sm" onClick={() => updateMutation.mutate({ id: apt.id, status: "checked-in" })} disabled={updateMutation.isPending} className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs h-8 px-3">
                  <LogIn className="w-3.5 h-3.5 mr-1" /> Check In
                </Button>
                <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: apt.id, status: "cancelled" })} disabled={updateMutation.isPending} className="rounded-xl text-red-500 border-red-200 hover:bg-red-50 text-xs h-8 px-3">
                  Cancel
                </Button>
              </>
            )}
            {apt.status === "checked-in" && (
              <Button size="sm" onClick={() => updateMutation.mutate({ id: apt.id, status: "completed" })} disabled={updateMutation.isPending} className="rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs h-8 px-3">
                <LogOut className="w-3.5 h-3.5 mr-1" /> Check Out & Complete
              </Button>
            )}
            {apt.status === "completed" && (
              <div className="flex items-center gap-1 text-green-600 text-xs font-semibold"><CheckCircle2 className="w-4 h-4" /> Visit Completed</div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const Section = ({ title, items, accent }: { title: string; items: any[]; accent: string }) => items.length === 0 ? null : (
    <div className="mb-10">
      <h2 className={`text-lg font-bold mb-4 flex items-center gap-2 ${accent}`}>
        <span className="w-2 h-6 rounded-full bg-current opacity-60"></span> {title}
        <span className="ml-1 px-2 py-0.5 bg-white border border-current rounded-full text-xs opacity-80">{items.length}</span>
      </h2>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((apt: any) => <AptCard key={apt.id} apt={apt} />)}
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Appointments</h1>
          <p className="text-slate-500 mt-1">Manage patient check-ins and appointment flow</p>
        </div>
        <div className="flex gap-3 text-sm">
          {[
            { label: "Pending", count: groups.pending.length, color: "bg-amber-100 text-amber-700" },
            { label: "Active", count: groups.active.length, color: "bg-teal-100 text-teal-700" },
            { label: "Completed", count: groups.completed.length, color: "bg-green-100 text-green-700" },
          ].map(s => (
            <div key={s.label} className={`px-3 py-2 rounded-xl font-semibold ${s.color}`}>
              {s.count} {s.label}
            </div>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" /></div>
      ) : !appointments?.length ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" /><p className="font-bold text-slate-600">No appointments yet</p>
        </div>
      ) : (
        <>
          <Section title="⏳ Awaiting Check-In" items={groups.pending} accent="text-amber-600" />
          <Section title="🩺 Currently Checked In" items={groups.active} accent="text-teal-600" />
          <Section title="✅ Completed Today" items={groups.completed} accent="text-green-600" />
          <Section title="Other" items={groups.other} accent="text-slate-500" />
        </>
      )}
    </AppLayout>
  );
}
