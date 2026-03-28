import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { format, parseISO, isSameDay } from "date-fns";

// Safely parse SQLite createdAt (seconds, milliseconds, or ISO string)
function safeDate(val: any): Date | null {
  if (!val) return null;
  if (typeof val === "string") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  const num = Number(val);
  if (isNaN(num)) return null;
  const d = new Date(num < 1e10 ? num * 1000 : num);
  return isNaN(d.getTime()) ? null : d;
}
import {
    FileText, Pill, CalendarCheck, Stethoscope, Search,
    Activity, Download, ChevronRight, ChevronDown, CheckCircle2,
    Clock, MapPin, ClipboardList, TrendingUp, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger
} from "@/components/ui/accordion";
import { motion, AnimatePresence } from "framer-motion";

const typeConfig: Record<string, { icon: any; color: string; bg: string; label: string; accent: string }> = {
    report: { icon: FileText, color: "text-blue-600", bg: "bg-blue-50", label: "Medical Report", accent: "border-blue-200" },
    prescription: { icon: Pill, color: "text-purple-600", bg: "bg-purple-50", label: "Prescription", accent: "border-purple-200" },
    scan: { icon: Activity, color: "text-teal-600", bg: "bg-teal-50", label: "Scan / Imaging", accent: "border-teal-200" },
    lab: { icon: Stethoscope, color: "text-amber-600", bg: "bg-amber-50", label: "Lab Report", accent: "border-amber-200" },
    appointment: { icon: CalendarCheck, color: "text-green-600", bg: "bg-green-50", label: "Appointment", accent: "border-green-200" },
    checkin: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", label: "Checked In", accent: "border-emerald-200" },
};

interface HealthJourneyProps {
    patientId?: number | null;
}

export function HealthJourney({ patientId }: HealthJourneyProps) {
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState<string>("all");

    // Queries
    const { data: records, isLoading: rLoading } = useQuery({
        queryKey: ["/api/records", patientId],
        queryFn: async () => {
            const url = patientId ? `/api/records?patientId=${patientId}` : "/api/records";
            const r = await apiRequest("GET", url);
            return r.json();
        },
        enabled: !!patientId,
    });

    const { data: prescriptions, isLoading: pLoading } = useQuery({
        queryKey: ["/api/prescriptions", patientId],
        queryFn: async () => {
            const url = patientId ? `/api/prescriptions?patientId=${patientId}` : "/api/prescriptions";
            const r = await apiRequest("GET", url);
            return r.json();
        },
        enabled: !!patientId,
    });

    const { data: appointments, isLoading: aLoading } = useQuery({
        queryKey: ["/api/appointments", patientId],
        queryFn: async () => {
            const url = patientId ? `/api/appointments?patientId=${patientId}` : "/api/appointments";
            const r = await apiRequest("GET", url);
            return r.json();
        },
        enabled: !!patientId,
    });

    const { data: visits, isLoading: vLoading } = useQuery({
        queryKey: ["/api/visits", patientId],
        queryFn: async () => {
            const url = patientId ? `/api/visits?patientId=${patientId}` : "/api/visits";
            const r = await apiRequest("GET", url);
            return r.json();
        },
        enabled: !!patientId,
    });

    // Grouping Logic
    const sessions = useMemo(() => {
        if (!records && !prescriptions && !appointments && !visits) return [];

        const allEvents: any[] = [];

        // Add Appointments
        (appointments || []).forEach((a: any) => {
            allEvents.push({ ...a, _kind: "appointment", date: a.date, timestamp: new Date(a.date).getTime() });
        });

        // Add Visits
        (visits || []).forEach((v: any) => {
            allEvents.push({ ...v, _kind: "visit", date: v.checkInTime, timestamp: new Date(v.checkInTime).getTime() });
        });

        // Add Prescriptions
        (prescriptions || []).forEach((p: any) => {
            allEvents.push({ ...p, _kind: "prescription", date: p.createdAt, timestamp: new Date(p.createdAt).getTime() });
        });

        // Add Medical Records (Filter out prescription-type records to fix duplication)
        (records || []).filter((r: any) => r.type !== "prescription").forEach((r: any) => {
            allEvents.push({ ...r, _kind: r.type || "report", date: r.createdAt, timestamp: new Date(r.createdAt).getTime() });
        });

        // Step 1: Create sessions based on Appointment ID
        const sessionMap = new Map<string, any>();

        allEvents.forEach(evt => {
            // Grouping key: appointmentId if exists, otherwise date string
            const dateObj = safeDate(evt.date);
            if (!dateObj) {
                console.error("Invalid date for event:", evt);
            }
            const dayStr = !dateObj ? "unknown" : format(dateObj, "yyyy-MM-dd");
            const key = `day-${dayStr}`;

            if (!sessionMap.has(key)) {
                sessionMap.set(key, {
                    key,
                    date: dateObj ? dateObj.toISOString() : new Date().toISOString(),
                    appointmentId: evt.appointmentId,
                    status: "completed", // Default
                    events: [],
                    stats: { records: 0, prescriptions: 0 }
                });
            }

            const session = sessionMap.get(key);
            session.events.push(evt);

            if (evt._kind === "prescription") session.stats.prescriptions++;
            if (["report", "scan", "lab"].includes(evt._kind)) session.stats.records++;

            // Influence session status
            if (evt._kind === "visit" && !evt.checkOutTime) session.status = "active";
            if (evt._kind === "appointment" && evt.status === "booked") session.status = "upcoming";
        });

        return Array.from(sessionMap.values())
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map(s => ({
                ...s,
                events: s.events.sort((a: any, b: any) => a.timestamp - b.timestamp)
            }));
    }, [records, prescriptions, appointments, visits]);



    const filtered = useMemo(() => {
        if (!search) return sessions;
        return sessions.filter(s =>
            s.events.some((e: any) =>
                (e.title || "").toLowerCase().includes(search.toLowerCase()) ||
                (e.diagnosis || "").toLowerCase().includes(search.toLowerCase()) ||
                (e.description || "").toLowerCase().includes(search.toLowerCase())
            )
        );
    }, [sessions, search]);

    const isLoading = rLoading || pLoading || aLoading || vLoading;

    if (isLoading) {
        return (
            <div className="flex flex-col gap-6">
                {[1, 2, 3].map(i => <div key={i} className="h-40 rounded-3xl bg-slate-50 animate-pulse" />)}
            </div>
        );
    }

    return (
        <div className="w-full space-y-8">


            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search medical history..."
                        className="h-12 pl-12 rounded-2xl border-slate-200 focus:ring-teal-500 shadow-sm"
                    />
                </div>
                <div className="flex gap-2">
                    {["All", "Medical Report", "Prescription", "Scan / Imaging", "Lab Report", "Appointment"].map(t => (
                        <Button
                            key={t}
                            variant="outline"
                            className="rounded-xl border-slate-200 text-slate-600 hover:border-teal-500 hover:text-teal-600 font-medium whitespace-nowrap px-4"
                        >
                            {t}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Timeline */}
            <Accordion type="multiple" defaultValue={[sessions[0]?.key]} className="space-y-4">
                {filtered.map((session) => (
                    <AccordionItem key={session.key} value={session.key} className="border-0 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="relative group px-6 py-5">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500 rounded-r-full" />
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="shrink-0 flex flex-col">
                                        <span className="text-lg font-bold text-slate-900">{format(safeDate(session.date) || new Date(), "MMM d, yyyy")}</span>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${session.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                                                    session.status === "active" ? "bg-blue-100 text-blue-700 animate-pulse" :
                                                        "bg-amber-100 text-amber-700"
                                                }`}>
                                                {session.status}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="hidden lg:flex items-center gap-4 text-xs text-slate-500 border-l border-slate-100 pl-4">
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="font-medium text-slate-600">{format(safeDate(session.date) || new Date(), "HH:mm")}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="max-w-[120px] truncate">Hospital #{(session.events.find((e: any) => e.hospitalId)?.hospitalId || 0) + 1}</span>
                                        </div>
                                        <div className="flex items-center gap-3 border-l border-slate-100 pl-4">
                                            <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-blue-500" /> <span className="text-blue-600 font-bold">{session.stats.records}</span></span>
                                            <span className="flex items-center gap-1"><Pill className="w-3.5 h-3.5 text-purple-500" /> <span className="text-purple-600 font-bold">{session.stats.prescriptions}</span></span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Button variant="outline" size="sm" className="rounded-xl border-slate-200 text-slate-700 gap-2 h-9">
                                        <Download className="w-4 h-4" /> PDF
                                    </Button>
                                    <AccordionTrigger className="hover:no-underline p-0">
                                        <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-slate-100 transition-colors">
                                            {/* Icon handled by AccordionTrigger */}
                                        </div>
                                    </AccordionTrigger>
                                </div>
                            </div>
                        </div>

                        <AccordionContent className="px-12 pb-8 pt-2">
                            <div className="relative border-l-2 border-slate-100 pl-8 space-y-8">
                                {session.events.map((event: any, eIdx: number) => {
                                    if (event._kind === "visit") {
                                        return (
                                            <div key={`v-${eIdx}`} className="relative">
                                                <div className="absolute -left-[41px] top-0 w-6 h-6 rounded-full bg-white border-2 border-emerald-500 flex items-center justify-center z-10">
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                </div>
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="text-sm font-bold text-slate-900">Checked In</h4>
                                                        <p className="text-xs text-slate-500 mt-0.5">Patient arrived at hospital</p>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{safeDate(event.checkInTime) ? format(safeDate(event.checkInTime)!, "HH:mm") : "UNKNOWN"}</span>
                                                </div>
                                                {event.checkOutTime && (
                                                    <div className="mt-8 relative">
                                                        <div className="absolute -left-[41px] top-[4px] w-6 h-6 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center z-10">
                                                            <div className="w-2 h-2 rounded-full bg-slate-400" />
                                                        </div>
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <h4 className="text-sm font-bold text-slate-700">Checked Out</h4>
                                                                <p className="text-xs text-slate-400 mt-0.5">Session concluded</p>
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{safeDate(event.checkOutTime) ? format(safeDate(event.checkOutTime)!, "HH:mm") : "UNKNOWN"}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }

                                    const cfg = typeConfig[event._kind] || typeConfig.report;
                                    const Icon = cfg.icon;

                                    return (
                                        <div key={`${event._kind}-${eIdx}`} className="relative mt-8">
                                            <div className={`absolute -left-[41px] top-[4px] w-6 h-6 rounded-full bg-white border-2 ${cfg.accent} flex items-center justify-center z-10`}>
                                                <Icon className={`w-3 h-3 ${cfg.color}`} />
                                            </div>
                                            <div 
                                                className={`flex justify-between items-start gap-4 ${event.fileUrl ? 'cursor-pointer hover:bg-slate-50/80 p-3 -mx-3 -my-3 rounded-2xl transition-all border border-transparent hover:border-slate-100' : ''}`}
                                                onClick={() => event.fileUrl && window.open(event.fileUrl, "_blank")}
                                            >
                                                <div className="flex-1">
                                                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                                        {event._kind === "appointment" ? "Appointment Booked" : event.title || cfg.label}
                                                        {event._kind === "prescription" && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full uppercase font-bold">PRESCRIPTION</span>}
                                                    </h4>

                                                    {event._kind === "appointment" && (
                                                        <p className="text-xs text-slate-500 mt-1">Token: <span className="font-mono font-bold text-slate-700">{event.appointmentToken}</span></p>
                                                    )}

                                                    {event._kind === "prescription" && event.medications && (
                                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                                            {JSON.parse(event.medications).filter((m: string) => m && m !== "NA").map((m: string, mi: number) => (
                                                                <span key={mi} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md text-[10px] font-bold border border-purple-100">{m}</span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {(event.description || event.diagnosis || event.instructions) && (
                                                        <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100/50 italic line-clamp-3">
                                                            {event.diagnosis && event.diagnosis !== "NA" && <span className="font-bold text-slate-700 not-italic mr-2">{event.diagnosis}:</span>}
                                                            {event.instructions && event.instructions !== "NA" ? event.instructions : (event.description && event.description !== "NA" ? event.description : "")}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                        {event._kind === "appointment" ? (safeDate(event.date) ? format(safeDate(event.date)!, "HH:mm") : "UNKNOWN") : "RECORD"}
                                                    </span>
                                                    {event.fileUrl && (
                                                        <a href={event.fileUrl} target="_blank" rel="noopener noreferrer" className="block mt-1 text-[10px] font-bold text-teal-600 hover:underline">
                                                            DOWNLOAD
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>

            {!filtered.length && (
                <div className="text-center py-24 bg-slate-50 rounded-[40px] border border-dashed border-slate-200">
                    <Search className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                    <p className="text-slate-500 font-bold text-lg">No medical records match your criteria</p>
                    <p className="text-slate-400 text-sm mt-1">Try adjusting your search or filters</p>
                </div>
            )}
        </div>
    );
}
