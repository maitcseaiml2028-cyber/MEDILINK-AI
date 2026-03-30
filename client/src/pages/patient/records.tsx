import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Calendar, Clock, LogIn, LogOut, Pill, FileText,
  Activity, ChevronDown, ChevronUp, Search, Download, Building2, Stethoscope
} from "lucide-react";
import { format, parseISO } from "date-fns";
import jsPDF from "jspdf";

// ── helpers ──────────────────────────────────────────────────────────
const fmt = (d: string | Date | undefined) => {
  if (!d) return "—";
  try { return format(typeof d === "string" ? parseISO(d) : d, "MMM d, yyyy"); } catch { return String(d); }
};
const fmtTime = (d: string | Date | undefined) => {
  if (!d) return "";
  try { return format(typeof d === "string" ? parseISO(d) : d, "h:mm a"); } catch { return ""; }
};

const RECORD_STYLE: Record<string, { bg: string; text: string; icon: any }> = {
  prescription: { bg: "bg-purple-50", text: "text-purple-700", icon: Pill },
  lab: { bg: "bg-amber-50", text: "text-amber-700", icon: Activity },
  scan: { bg: "bg-teal-50", text: "text-teal-700", icon: Activity },
  report: { bg: "bg-blue-50", text: "text-blue-700", icon: FileText },
};

// ── main component ────────────────────────────────────────────────────
export default function PatientHealthJourney() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: appointments = [] } = useQuery({
    queryKey: ["/api/appointments"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/appointments"); return r.json(); },
  });
  const { data: visits = [] } = useQuery({
    queryKey: ["/api/visits"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/visits"); return r.json(); },
  });
  const { data: records = [] } = useQuery({
    queryKey: ["/api/records"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/records"); return r.json(); },
  });
  const { data: prescriptions = [] } = useQuery({
    queryKey: ["/api/prescriptions"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/prescriptions"); return r.json(); },
  });

  // Group everything by appointment
  const visits_map: Record<number, any> = useMemo(() =>
    Object.fromEntries(visits.map((v: any) => [v.appointmentId, v])), [visits]);

  const journey = useMemo(() => {
    // 1. Group standalone visits (walk-ins) by date
    const standaloneByDate: Record<string, any[]> = {};
    visits.filter((v: any) => !v.appointmentId).forEach((v: any) => {
      const d = typeof v.checkInTime === 'string' ? v.checkInTime.split('T')[0] : new Date(v.checkInTime).toISOString().split('T')[0];
      if (!standaloneByDate[d]) standaloneByDate[d] = [];
      standaloneByDate[d].push(v);
    });

    const standaloneVisits = Object.entries(standaloneByDate).map(([dateStr, dayVisits]) => {
      dayVisits.sort((a, b) => new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime());
      const firstVisit = dayVisits[0];
      return {
        id: `wlk-${dateStr}`,
        isStandaloneDay: true,
        dayVisits,
        patientId: firstVisit.patientId,
        hospitalId: firstVisit.hospitalId,
        date: dateStr,
        time: fmtTime(firstVisit.checkInTime),
        status: dayVisits.every((v: any) => v.checkOutTime) ? "completed" : "checked-in",
        appointmentToken: `WLK-DAY-${dateStr}`,
      };
    });

    // 2. Quick deduplication to handle any old seed data bugs that created identical appointments
    const uniqueAppointments = appointments.reduce((acc: any[], current: any) => {
      const exists = acc.find(item => item.date === current.date && item.time === current.time && item.status === current.status);
      if (!exists) acc.push(current);
      return acc;
    }, []);

    const allEvents = [...uniqueAppointments, ...standaloneVisits];

    const sorted = allEvents
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .filter(apt => {
        if (!search) return true;
        const s = search.toLowerCase();
        return apt.date?.includes(s) || apt.status?.includes(s) || apt.notes?.toLowerCase().includes(s);
      });

    // For each record/prescription find the nearest appointment or standalone visit, BUT ONLY if it's on the same day.
    const nearestAptId = (itemDate: string | undefined, evts: any[]): number | string | null => {
      if (!itemDate || !evts.length) return null;
      const t = new Date(itemDate).getTime();
      const dateStr = new Date(itemDate).toISOString().split('T')[0];
      
      let best = null;
      let bestDiff = Infinity;
      
      for (const a of evts) {
        const aDateStr = new Date(a.date).toISOString().split('T')[0];
        // Only match if the event and record are on the exact same DATE string
        if (aDateStr !== dateStr) continue;

        const diff = Math.abs(new Date(a.date).getTime() - t);
        if (diff < bestDiff) { best = a; bestDiff = diff; }
      }
      return best ? best.id : null;
    };

    // Group records by nearest event
    const recsByApt: Record<string, any[]> = {};
    const unmappedRecords: any[] = [];
    for (const r of records) {
      const id = nearestAptId(r.createdAt, allEvents);
      if (id !== null) { recsByApt[id] = [...(recsByApt[id] || []), r]; }
      else { unmappedRecords.push(r); }
    }
    
    // Group prescriptions by nearest event
    const rxByApt: Record<string, any[]> = {};
    const unmappedRx: any[] = [];
    for (const p of prescriptions) {
      const id = nearestAptId(p.createdAt, allEvents);
      if (id !== null) { rxByApt[id] = [...(rxByApt[id] || []), p]; }
      else { unmappedRx.push(p); }
    }

    // Unmapped events grouping fallback
    const unmappedByDate: Record<string, { records: any[], prescriptions: any[] }> = {};
    for (const r of unmappedRecords) {
        const d = new Date(r.createdAt).toISOString().split('T')[0];
        if (!unmappedByDate[d]) unmappedByDate[d] = { records: [], prescriptions: [] };
        unmappedByDate[d].records.push(r);
    }
    for (const p of unmappedRx) {
        const d = new Date(p.createdAt).toISOString().split('T')[0];
        if (!unmappedByDate[d]) unmappedByDate[d] = { records: [], prescriptions: [] };
        unmappedByDate[d].prescriptions.push(p);
    }

    const unmappedEvents = Object.entries(unmappedByDate).map(([dateStr, items]) => ({
      id: `unmapped-${dateStr}`,
      isUnmappedDay: true,
      patientId: items.records[0]?.patientId || items.prescriptions[0]?.patientId,
      date: dateStr,
      time: "12:00 AM", // generic time for fallback
      status: "completed",
    }));

    // Merge unmapped with the sorted events
    const allEventsFinal = [...sorted, ...unmappedEvents]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const pregrouped = allEventsFinal.map((apt: any) => ({
      apt,
      visit: apt.isStandaloneDay || apt.isUnmappedDay ? null : visits_map[apt.id],
      records: apt.isUnmappedDay ? unmappedByDate[apt.date]?.records || [] : recsByApt[apt.id] || [],
      prescriptions: apt.isUnmappedDay ? unmappedByDate[apt.date]?.prescriptions || [] : rxByApt[apt.id] || [],
    }));

    // Grouping by Date string (YYYY-MM-DD)
    const groups: Record<string, typeof pregrouped> = {};
    pregrouped.forEach(item => {
      const d = item.apt.date;
      if (!groups[d]) groups[d] = [];
      groups[d].push(item);
    });

    return Object.entries(groups)
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
      .map(([date, items]) => ({ date, items }));
  }, [appointments, visits, visits_map, records, prescriptions, search]);

  const toggle = (id: string) =>
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const downloadVisitPDF = (dayGroup: typeof journey[0]) => {
    const { date, items } = dayGroup;
    const doc = new jsPDF();
    doc.setFontSize(20); doc.setTextColor(20, 150, 130);
    doc.text("MediLink — Daily Health Summary", 20, 25);
    doc.setFontSize(11); doc.setTextColor(80);
    doc.text(`Date: ${fmt(date)}`, 20, 33);
    doc.line(20, 37, 190, 37);
    let y = 47;

    items.forEach((item, idx) => {
      const { apt, visit, records: recs, prescriptions: rxs } = item;
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(50);
      doc.text(`Event #${idx + 1}: ${apt.isUnmappedDay ? "Standalone Records" : apt.isStandaloneDay ? "Walk-in Visit" : "Appointment"} (${apt.status})`, 20, y);
      y += 10;
      
      const line = (label: string, val: string) => {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold"); doc.text(label + ":", 25, y);
        doc.setFont("helvetica", "normal"); doc.text(val || "—", 75, y); y += 8;
        if (y > 270) { doc.addPage(); y = 20; }
      };

      if (!apt.isUnmappedDay) {
         line("Time", apt.time);
         line("Token", apt.appointmentToken || `APT-${apt.id}`);
         line("Hospital", `Hospital #${apt.hospitalId}`);
      }

      if (apt.isStandaloneDay && apt.dayVisits) {
        apt.dayVisits.forEach((v: any, vIdx: number) => {
          line(`Visit ${vIdx + 1} In`, fmtTime(v.checkInTime));
          if (v.checkOutTime) line(`Visit ${vIdx + 1} Out`, fmtTime(v.checkOutTime));
        });
      } else if (visit) {
        line("Check-In", fmtTime(visit.checkInTime));
        line("Check-Out", fmtTime(visit.checkOutTime));
      }

      if (apt.notes) { 
        doc.setFont("helvetica", "bold"); doc.text("Notes:", 25, y); y += 6;
        doc.setFont("helvetica", "normal"); 
        const splitNotes = doc.splitTextToSize(apt.notes, 160);
        splitNotes.forEach((l: string) => { doc.text(l, 25, y); y += 6; if (y > 270) { doc.addPage(); y = 20; } });
        y += 4;
      }

      if (rxs.length) {
        doc.setFont("helvetica", "bold"); doc.text("Prescriptions:", 25, y); y += 6;
        rxs.forEach((rx: any) => { 
          doc.setFont("helvetica", "normal"); 
          let meds = [];
          try { meds = JSON.parse(rx.medications || "[]"); } catch (e) { meds = []; }
          doc.text(`• ${rx.diagnosis || "General"}: ${meds.join(", ")}`, 28, y); 
          y += 6; 
          if (y > 270) { doc.addPage(); y = 20; }
        });
        y += 4;
      }

      if (recs.length) {
        doc.setFont("helvetica", "bold"); doc.text("Medical Records:", 25, y); y += 6;
        recs.forEach((r: any) => { 
          doc.setFont("helvetica", "normal"); 
          doc.text(`• [${r.type?.toUpperCase()}] ${r.title}`, 28, y); 
          y += 6; 
          if (y > 270) { doc.addPage(); y = 20; }
        });
        y += 4;
      }

      y += 5;
      doc.setDrawColor(230);
      doc.line(20, y, 190, y);
      y += 12;
      if (y > 260) { doc.addPage(); y = 20; }
    });

    doc.save(`MediLink-Daily-Summary-${date}.pdf`);
  };

  const STATUS_COLOR: Record<string, string> = {
    booked: "bg-blue-100 text-blue-700 border-blue-200",
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    "checked-in": "bg-teal-100 text-teal-700 border-teal-200",
    completed: "bg-green-100 text-green-700 border-green-200",
    cancelled: "bg-red-100 text-red-600 border-red-200",
  };

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-slate-900">Health Journey</h1>
        <p className="text-slate-500 mt-1">Complete visit history — appointments, check-ins, prescriptions, reports</p>
      </div>

      {/* Search */}
      <div className="relative max-w-lg mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by date, status, notes..." className="h-11 pl-10 rounded-2xl" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total Visits", value: Math.max(0, journey.length), color: "bg-slate-900 text-white" },
          { label: "Completed", value: Math.max(0, journey.filter((d: any) => d.items.some((it: any) => it.apt?.status === "completed")).length), color: "bg-green-600 text-white" },
          { label: "Upcoming/Active", value: Math.max(0, journey.filter((d: any) => d.items.some((it: any) => it.apt && !["completed", "cancelled"].includes(it.apt.status))).length), color: "bg-teal-600 text-white" },
        ].map(s => (
          <Card key={s.label} className={`rounded-2xl border-0 shadow-sm ${s.color}`}>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold">{s.value}</p>
              <p className="text-sm opacity-80 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Journey Timeline */}
      {!journey.length ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-bold text-slate-600">No visits found</p>
        </div>
      ) : (
        <div className="relative">
          {/* vertical line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-teal-400 via-blue-300 to-slate-200" />

          <div className="space-y-6 pl-14">
            {journey.map((dayGroup) => {
              const { date, items } = dayGroup;
              const key = date;
              const isOpen = expanded.has(key);

              // Gather info for the header
              const totalRecs = items.reduce((acc, it) => acc + (it.records?.length || 0), 0);
              const totalRxs = items.reduce((acc, it) => acc + (it.prescriptions?.length || 0), 0);
              const mainApt = items.find(it => it.apt && !it.apt.isStandaloneDay && !it.apt.isUnmappedDay)?.apt || items[0]?.apt;
              const statuses = Array.from(new Set(items.map(it => it.apt?.status).filter(Boolean)));

              return (
                <div key={key} className="relative">
                  {/* Timeline dot */}
                  <div className={`absolute -left-9 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-md ${items.some(it => it.apt?.status === "completed") ? "bg-green-500" : items.some(it => it.apt?.status === "checked-in") ? "bg-teal-500" : "bg-blue-400"}`}>
                    <Calendar className="w-4 h-4 text-white" />
                  </div>

                  <Card className="rounded-2xl border border-slate-200 shadow-md hover:shadow-lg transition-all">
                    {/* Header — always visible */}
                    <CardContent className="p-0">
                      <div
                        className="p-5 cursor-pointer select-none"
                        onClick={() => toggle(key)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            {/* Date + Statuses */}
                            <div className="flex items-center flex-wrap gap-2 mb-2">
                              <span className="text-base font-bold text-slate-900">{fmt(date)}</span>
                              {statuses.map(st => st && (
                                <span key={st} className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${STATUS_COLOR[st] || STATUS_COLOR.pending}`}>{st}</span>
                              ))}
                            </div>

                            {/* Summary row */}
                            <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                              <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{items.length} Event{items.length !== 1 ? "s" : ""}</span>
                              {totalRecs > 0 && <span className="flex items-center gap-1 text-blue-600"><FileText className="w-3.5 h-3.5" />{totalRecs} record{totalRecs !== 1 ? "s" : ""}</span>}
                              {totalRxs > 0 && <span className="flex items-center gap-1 text-purple-600"><Pill className="w-3.5 h-3.5" />{totalRxs} prescription{totalRxs !== 1 ? "s" : ""}</span>}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); downloadVisitPDF(dayGroup); }} className="rounded-xl text-xs h-8 border-slate-200 hover:border-teal-400 hover:text-teal-600">
                              <Download className="w-3.5 h-3.5 mr-1" /> PDF Summary
                            </Button>
                            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded content */}
                      {isOpen && (
                        <div className="border-t border-slate-100 px-5 pb-5 pt-2">
                          {items.map((item, idx) => {
                            const { apt, visit, records: recs, prescriptions: rxs } = item;
                            return (
                              <div key={idx} className={`${idx > 0 ? "mt-8 pt-6 border-t border-slate-50" : "mt-2"}`}>
                                <div className="flex items-center gap-2 mb-4 bg-slate-50 p-2 rounded-xl">
                                   <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-[10px] font-bold text-slate-400 border border-slate-100 shadow-sm">{idx + 1}</div>
                                   <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">{apt.isUnmappedDay ? "Standalone Documents" : apt.isStandaloneDay ? "Walk-in Visit" : "Scheduled Appointment"}</p>
                                </div>
                                
                                <div className="relative pl-6">
                                  <div className="absolute left-2 top-0 bottom-0 w-px bg-slate-200" />
                                  
                                  {/* Appointment step */}
                                  {!apt.isStandaloneDay && !apt.isUnmappedDay && (
                                    <Step icon={<Calendar className="w-3.5 h-3.5 text-blue-600" />} bg="bg-blue-100" label="Appointment Booked" time={apt.time}>
                                      <p className="text-xs text-slate-500">Token: <span className="font-mono">{apt.appointmentToken || `APT-${apt.id}`}</span></p>
                                    </Step>
                                  )}

                                  {/* Check-in step */}
                                  {(!apt.isStandaloneDay && !apt.isUnmappedDay) && (visit || apt.status === "checked-in" || apt.status === "completed") && (
                                    <Step icon={<LogIn className="w-3.5 h-3.5 text-teal-600" />} bg="bg-teal-100" label="Checked In" time={visit?.checkInTime ? fmtTime(visit.checkInTime) : apt.time}>
                                      <p className="text-xs text-slate-500">Patient arrived at hospital</p>
                                    </Step>
                                  )}

                                  {/* Standalone Day Visists */}
                                  {apt.isStandaloneDay && apt.dayVisits && apt.dayVisits.map((v: any, vIdx: number) => (
                                    <div key={"v-" + vIdx}>
                                      <Step icon={<LogIn className="w-3.5 h-3.5 text-teal-600" />} bg="bg-teal-100" label="Checked In (Walk-in)" time={fmtTime(v.checkInTime)}>
                                        <p className="text-xs text-slate-500">Patient arrived at hospital</p>
                                      </Step>
                                      {v.checkOutTime && (
                                        <Step icon={<LogOut className="w-3.5 h-3.5 text-green-600" />} bg="bg-green-100" label="Checked Out" time={fmtTime(v.checkOutTime)}>
                                          <p className="text-xs text-slate-500">Session concluded</p>
                                        </Step>
                                      )}
                                    </div>
                                  ))}

                                  {/* Rx step */}
                                  {rxs.map((rx: any, i: number) => {
                                    let meds = [];
                                    try { meds = JSON.parse(rx.medications || "[]"); } catch (e) { meds = []; }
                                    return (
                                      <Step key={"rx" + i} icon={<Pill className="w-3.5 h-3.5 text-purple-600" />} bg="bg-purple-100" label={`Prescription: ${rx.diagnosis || "General"}`} time="">
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {meds.map((m: string, j: number) => (
                                            <span key={j} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs">{m}</span>
                                          ))}
                                        </div>
                                      </Step>
                                    );
                                  })}

                                  {/* Records step */}
                                  {recs.map((rec: any, i: number) => {
                                    const style = RECORD_STYLE[rec.type] || RECORD_STYLE.report;
                                    const Icon = style.icon;
                                    return (
                                      <Step key={"rec" + i} icon={<Icon className={`w-3.5 h-3.5 ${style.text}`} />} bg={style.bg} label={rec.title} time={rec.type?.toUpperCase()}>
                                        {rec.description && <p className="text-xs text-slate-500">{rec.description}</p>}
                                        {rec.fileUrl && (
                                          <a href={rec.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 px-3 py-1 bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors rounded-lg text-xs font-bold border border-teal-100">
                                            View Document
                                          </a>
                                        )}
                                      </Step>
                                    );
                                  })}

                                  {/* Checkout step */}
                                  {!apt.isStandaloneDay && !apt.isUnmappedDay && apt.status === "completed" && (
                                    <Step icon={<LogOut className="w-3.5 h-3.5 text-green-600" />} bg="bg-green-100" label="Checked Out" time={visit?.checkOutTime ? fmtTime(visit.checkOutTime) : ""}>
                                      <p className="text-xs text-slate-500">Visit successfully completed</p>
                                    </Step>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </AppLayout>
  );
}

// ── Step sub-component ────────────────────────────────────────────────
function Step({ icon, bg, label, time, children }: { icon: React.ReactNode; bg: string; label: string; time: string; children?: React.ReactNode }) {
  return (
    <div className="relative mb-4 pl-7">
      {/* step dot */}
      <div className={`absolute -left-3 w-6 h-6 rounded-full ${bg} flex items-center justify-center border-2 border-white shadow-sm`}>
        {icon}
      </div>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        {time && <span className="text-xs text-slate-400 shrink-0">{time}</span>}
      </div>
      {children && <div className="mt-1">{children}</div>}
    </div>
  );
}
