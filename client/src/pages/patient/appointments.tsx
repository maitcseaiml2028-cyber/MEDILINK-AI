import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAppointments, useCreateAppointment } from "@/hooks/use-appointments";
import { useHospitals } from "@/hooks/use-hospitals";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Building2, Plus, Hash, CheckCircle2, AlertCircle, Timer, XCircle, Stethoscope } from "lucide-react";
import QRCode from "react-qr-code";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type Status = string;

const STATUS_CONFIG: Record<Status, { icon: any; label: string; cardBg: string; badge: string; ringColor: string }> = {
  booked: { icon: Timer, label: "Booked", cardBg: "bg-white", badge: "bg-blue-100 text-blue-700 border-blue-200", ringColor: "border-blue-200" },
  pending: { icon: Timer, label: "Pending", cardBg: "bg-white", badge: "bg-amber-100 text-amber-700 border-amber-200", ringColor: "border-amber-200" },
  "checked-in": { icon: Stethoscope, label: "In Progress", cardBg: "bg-teal-50", badge: "bg-teal-100 text-teal-700 border-teal-200", ringColor: "border-teal-300" },
  completed: { icon: CheckCircle2, label: "Completed", cardBg: "bg-green-50", badge: "bg-green-100 text-green-700 border-green-200", ringColor: "border-green-200" },
  cancelled: { icon: XCircle, label: "Cancelled", cardBg: "bg-slate-50", badge: "bg-red-100 text-red-600 border-red-200", ringColor: "border-red-200" },
  accepted: { icon: CheckCircle2, label: "Confirmed", cardBg: "bg-white", badge: "bg-purple-100 text-purple-700 border-purple-200", ringColor: "border-purple-200" },
  expired: { icon: AlertCircle, label: "Expired", cardBg: "bg-red-50", badge: "bg-red-100 text-red-700 border-red-200", ringColor: "border-red-200" },
};
const getConfig = (s: Status) => STATUS_CONFIG[s] || STATUS_CONFIG.pending;

const getComputedStatus = (apt: any) => {
  if (["completed", "cancelled"].includes(apt.status)) return apt.status;
  try {
    const aptDateTime = new Date(`${apt.date}T${apt.time}`);
    if (aptDateTime < new Date()) return "expired";
  } catch (e) {}
  return apt.status;
};

export default function PatientAppointments() {
  const { data: appointments, isLoading } = useAppointments();
  const { data: hospitals } = useHospitals();
  const createMutation = useCreateAppointment();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ hospitalId: "", department: "", date: "", time: "", notes: "" });
  const [showQR, setShowQR] = useState<number | null>(null);

  const { data: permissions } = useQuery({
    queryKey: ["/api/access/permissions"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/access/permissions"); return r.json(); },
  });

  const { data: allDoctors } = useQuery({
    queryKey: ["/api/doctors"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/doctors"); return r.json(); },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent booking in the past
    try {
      const aptDateTime = new Date(`${formData.date}T${formData.time}`);
      if (aptDateTime < new Date()) {
        toast({ title: "Invalid Time", description: "You cannot book an appointment for a past date or time.", variant: "destructive" });
        return;
      }
    } catch (err) {}

    await createMutation.mutateAsync({ ...formData, hospitalId: parseInt(formData.hospitalId) });
    setOpen(false);
    setFormData({ hospitalId: "", department: "", date: "", time: "", notes: "" });
  };

  const upcoming = (appointments || []).filter((a: any) => !["completed", "cancelled", "expired"].includes(getComputedStatus(a)));
  const past = (appointments || []).filter((a: any) => ["completed", "cancelled", "expired"].includes(getComputedStatus(a)));

  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Appointments</h1>
          <p className="text-slate-500 mt-1">Book and track your hospital visits</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-500/20">
              <Plus className="w-5 h-5 mr-2" /> Book Appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-3xl p-8 border-0 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-display text-slate-900">Schedule Visit</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5 mt-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Select Hospital</label>
                <Select value={formData.hospitalId} onValueChange={(val) => setFormData({ ...formData, hospitalId: val })}>
                  <SelectTrigger className="h-12 rounded-xl border-slate-200"><SelectValue placeholder="Choose a hospital" /></SelectTrigger>
                  <SelectContent>
                    {hospitals?.map((hosp: any) => (
                      <SelectItem key={hosp.id} value={hosp.id.toString()}>
                        {hosp.user?.name || `Hospital #${hosp.id}`} — {hosp.licenseNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.hospitalId && (
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Department</label>
                  <select
                    value={formData.department}
                    required
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full h-12 rounded-xl border border-slate-200 px-3 bg-white outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Select a Department</option>
                    {(() => {
                        const hDocs = (allDoctors || []).filter((d: any) => d.currentHospitalId === parseInt(formData.hospitalId) && d.joinStatus === "approved");
                        const hDepts = Array.from(new Set(hDocs.map((d: any) => d.specialization).filter(Boolean)));
                        
                        if (hDepts.length === 0) {
                            return <option value="general">General</option>;
                        }
                        
                        return hDepts.map((dept: any) => (
                            <option key={dept} value={dept.toLowerCase()}>{dept}</option>
                        ));
                    })()}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Date</label>
                  <Input type="date" min={new Date().toISOString().split('T')[0]} required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="h-12 rounded-xl" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Time</label>
                  <Input type="time" required value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} className="h-12 rounded-xl" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Symptoms / Notes</label>
                <Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="h-12 rounded-xl" placeholder="Describe reason for visit" />
              </div>
              
              {formData.hospitalId && (
                (() => {
                  const isGranted = (permissions || []).some((p: any) => 
                    p.hospitalId === parseInt(formData.hospitalId) && p.accessStatus === 'active'
                  );
                  
                  if (!isGranted) {
                    return (
                      <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-start gap-3 mt-4">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-bold">Access Not Granted</p>
                          <p>You must grant data permission to this hospital from the <b>Access Control</b> page before booking an appointment.</p>
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <Button type="submit" disabled={createMutation.isPending} className="w-full h-12 rounded-xl bg-teal-600 hover:bg-teal-700 text-white mt-4">
                      {createMutation.isPending ? "Booking..." : "Confirm Booking"}
                    </Button>
                  );
                })()
              )}
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" /></div>
      ) : !appointments?.length ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-3xl">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700">No appointments yet</h3>
          <p className="text-slate-500 mt-1">Click "Book Appointment" to schedule your first visit.</p>
        </div>
      ) : (
        <>
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="mb-10">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Upcoming ({upcoming.length})</h2>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
                {upcoming.map((apt: any) => {
                  const status = getComputedStatus(apt);
                  const cfg = getConfig(status);
                  const StatusIcon = cfg.icon;
                  const token = apt.appointmentToken || `APT-${apt.id}`;
                  const dateStr = (() => { try { return format(new Date(apt.date), "EEEE, MMMM d, yyyy"); } catch { return apt.date; } })();
                  return (
                    <Card key={apt.id} className={`rounded-2xl border-2 ${cfg.ringColor} shadow-md transition-all hover:shadow-lg ${cfg.cardBg}`}>
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${cfg.badge}`}>
                            <StatusIcon className="w-3.5 h-3.5" /> {cfg.label}
                          </span>
                          <button onClick={() => setShowQR(showQR === apt.id ? null : apt.id)} className="p-1.5 rounded-lg hover:bg-white/60 text-slate-500 hover:text-teal-600 transition-colors" title="Show QR">
                            <Hash className="w-4 h-4" />
                          </button>
                        </div>

                        {showQR === apt.id && (
                          <div className="mb-4 p-4 bg-white rounded-xl flex flex-col items-center gap-2 border border-slate-100">
                            <QRCode value={token} size={100} />
                            <p className="text-xs text-slate-500 font-mono">{token}</p>
                          </div>
                        )}

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="font-semibold text-slate-800">Hospital #{apt.hospitalId}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-600">
                            <Calendar className="w-4 h-4 text-teal-500 shrink-0" />
                            <span>{dateStr}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-600">
                            <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                            <span>{apt.time}</span>
                          </div>
                        </div>

                        {apt.notes && <p className="mt-3 text-xs text-slate-500 bg-white/80 rounded-lg p-2 border border-slate-100">{apt.notes}</p>}

                        <div className="mt-4 pt-3 border-t border-slate-100/60 flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                          <Hash className="w-3 h-3" /> {token}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Past / Completed */}
          {past.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-4">Past Visits ({past.length})</h2>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
                {past.map((apt: any) => {
                  const status = getComputedStatus(apt);
                  const cfg = getConfig(status);
                  const StatusIcon = cfg.icon;
                  const token = apt.appointmentToken || `APT-${apt.id}`;
                  const dateStr = (() => { try { return format(new Date(apt.date), "EEEE, MMMM d, yyyy"); } catch { return apt.date; } })();
                  return (
                    <Card key={apt.id} className={`rounded-2xl border-2 ${cfg.ringColor} shadow-md transition-all hover:shadow-lg ${cfg.cardBg}`}>
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${cfg.badge}`}>
                            <StatusIcon className="w-3.5 h-3.5" /> {cfg.label}
                          </span>
                          <button onClick={() => setShowQR(showQR === apt.id ? null : apt.id)} className="p-1.5 rounded-lg hover:bg-white/60 text-slate-500 hover:text-teal-600 transition-colors" title="Show QR">
                            <Hash className="w-4 h-4" />
                          </button>
                        </div>

                        {showQR === apt.id && (
                          <div className="mb-4 p-4 bg-white rounded-xl flex flex-col items-center gap-2 border border-slate-100">
                            <QRCode value={token} size={100} />
                            <p className="text-xs text-slate-500 font-mono">{token}</p>
                          </div>
                        )}

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="font-semibold text-slate-800">Hospital #{apt.hospitalId}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-600">
                            <Calendar className="w-4 h-4 text-teal-500 shrink-0" />
                            <span>{dateStr}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-600">
                            <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                            <span>{apt.time}</span>
                          </div>
                        </div>

                        {apt.notes && <p className="mt-3 text-xs text-slate-500 bg-white/80 rounded-lg p-2 border border-slate-100">{apt.notes}</p>}

                        <div className="mt-4 pt-3 border-t border-slate-100/60 flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                          <Hash className="w-3 h-3" /> {token}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </>

      )}
    </AppLayout>
  );
}
