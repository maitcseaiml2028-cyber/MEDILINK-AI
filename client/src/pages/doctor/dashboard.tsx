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
    CalendarCheck, HeartPulse 
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

    const { data: hospitals, refetch: refetchHospitals } = useQuery({
        queryKey: ["/api/hospitals"],
        queryFn: async () => {
            const r = await apiRequest("GET", "/api/hospitals");
            return r.json();
        }
    });

    const requestJoinMutation = useQuery({
        queryKey: ["/api/doctor/request-join"],
        enabled: false // just using for manual trigger if needed, or use useMutation
    });

    if (isLoading) return (
        <AppLayout>
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                    <p className="text-slate-500 text-sm font-medium">Loading dashboard…</p>
                </div>
            </div>
        </AppLayout>
    );

    const patientArrivals = deptVisits?.length || 0;

    return (
        <AppLayout>
            <div className="mb-8 animate-fade-in-up">
                <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center shadow-lg shadow-teal-500/25 shrink-0">
                        <Stethoscope className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-display font-bold text-slate-900 leading-none mb-1">Dr. {user?.name}</h1>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">{user?.doctor?.specialization}</span>
                            <span className="text-xs font-mono text-slate-400">{user?.doctor?.doctorId}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-5 mb-8">
                {[
                    { label: "Today's Patients", value: patientArrivals, sub: patientArrivals > 0 ? "In the clinic today" : "No appointments yet", icon: Users, gradient: "from-teal-500 to-cyan-500", bg: "bg-teal-50", iconColor: "text-teal-600" },
                    { label: "Prescriptions Issued", value: prescriptions?.length || 0, sub: "Since your last shift", icon: ClipboardList, gradient: "from-blue-500 to-blue-600", bg: "bg-blue-50", iconColor: "text-blue-600" },
                    { label: "Hospital Status", value: user?.doctor?.joinStatus || "Independent", sub: user?.doctor?.currentHospitalId ? "Currently connected" : "Not affiliated", icon: Activity, gradient: "from-violet-500 to-purple-600", bg: "bg-violet-50", iconColor: "text-violet-600" },
                ].map((s, i) => (
                    <div key={i} className={`stat-card animate-fade-in-up delay-${i * 100 + 100}`}>
                        <div className="flex items-center justify-between mb-3">
                            <div className={`w-11 h-11 ${s.bg} ${s.iconColor} rounded-xl flex items-center justify-center`}>
                                <s.icon className="w-5 h-5" />
                            </div>
                        </div>
                        <p className="font-display font-extrabold text-3xl text-slate-900 mb-0.5 capitalize">{s.value}</p>
                        <p className="font-semibold text-sm text-slate-700">{s.label}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{s.sub}</p>
                        <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${s.gradient} rounded-b-2xl`} />
                    </div>
                ))}
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h2 className="text-lg font-display font-bold text-slate-900">Quick Actions</h2>
                    {[
                        { href: "/doctor/patients", icon: Users, title: "Patient Lookup", desc: "Search patient by Health ID", bg: "bg-teal-50 text-teal-600" },
                        { href: "/doctor/drug-checker", icon: Pill, title: "Drug Checker", desc: "Check medication interactions", bg: "bg-violet-50 text-violet-600" },
                    ].map((item) => (
                        <div
                            key={item.href}
                            onClick={() => setLocation(item.href)}
                            className="p-5 bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex items-center gap-4 group"
                        >
                            <div className={`w-11 h-11 ${item.bg} rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                                <item.icon className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-sm">{item.title}</h3>
                                <p className="text-xs text-slate-500">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-slate-900">Hospital Associations</h2>
                        <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="rounded-xl border-teal-200 text-teal-600 hover:bg-teal-50">
                                    <Plus className="w-4 h-4 mr-2" /> Join Hospital
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px] rounded-3xl">
                                <DialogHeader>
                                    <DialogTitle>Join a Hospital</DialogTitle>
                                    <DialogDescription>
                                        Search for a hospital to request to join their staff.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="py-4 space-y-4">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input
                                            placeholder="Search hospital name..."
                                            className="pl-10 rounded-xl"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                        />
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                                        {hospitals?.filter((h: any) => 
                                            h.user.name.toLowerCase().includes(search.toLowerCase())
                                        ).map((h: any) => (
                                            <div key={h.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-between group hover:border-teal-500 hover:bg-white transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-white p-2 rounded-xl border border-slate-200">
                                                        <Building2 className="w-5 h-5 text-teal-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">{h.user.name}</p>
                                                        <p className="text-xs text-slate-500 truncate max-w-[200px]">{h.address}</p>
                                                    </div>
                                                </div>
                                                <Button 
                                                    size="sm" 
                                                    className="rounded-lg bg-teal-600 hover:bg-teal-700"
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
                                                    Join
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm min-h-[200px] flex flex-col">
                        {user?.doctor?.currentHospitalId ? (
                            <div className="flex-1 space-y-4">
                                <div className="p-4 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-teal-600 p-2 rounded-xl text-white">
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-teal-600 font-bold uppercase tracking-wider">Active Hospital</p>
                                            <p className="font-bold text-slate-900">Connected</p>
                                        </div>
                                    </div>
                                    <CheckCircle2 className="w-6 h-6 text-teal-600" />
                                </div>
                                <p className="text-sm text-slate-500">
                                    You are currently linked to a hospital. You can view patient profiles granted to this hospital.
                                </p>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-4">
                                <div className="bg-slate-50 p-4 rounded-full">
                                    <Building2 className="w-8 h-8 text-slate-300" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900">No Active Hospital</p>
                                    <p className="text-sm text-slate-500 max-w-[250px] mx-auto">
                                        Join a hospital to access shared patient records and appointments.
                                    </p>
                                </div>
                                <Button 
                                    variant="secondary" 
                                    className="rounded-xl bg-slate-100 text-slate-900 hover:bg-slate-200"
                                    onClick={() => setIsJoinDialogOpen(true)}
                                >
                                    Find Hospital
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-display font-bold text-slate-900 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        Patient Queue
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{patientArrivals}</span>
                    </h2>
                    <p className="text-xs text-slate-500">Auto-refreshes when patients check in</p>
                </div>
                
                <Card className="rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    {patientArrivals === 0 ? (
                        <div className="py-12 text-center flex flex-col items-center">
                            <div className="bg-slate-50 p-4 rounded-full mb-3">
                                <CheckCircle2 className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Queue is Clear</h3>
                            <p className="text-slate-500 mt-1">No patients are currently waiting for {user?.doctor?.specialization}.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {deptVisits?.map((visit: any) => (
                                <div key={visit.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center shrink-0">
                                            <Users className="w-6 h-6 text-teal-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-lg">Patient {visit.patient?.healthId || `#${visit.patientId}`}</h3>
                                            <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-4 h-4" />
                                                    Checked in at {format(new Date(visit.checkInTime), "h:mm a")}
                                                </span>
                                                <span className="flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 px-2.5 py-0.5 text-xs font-medium">
                                                    <Activity className="w-3.5 h-3.5" />
                                                    Waiting
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <Button 
                                        className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
                                        onClick={() => setLocation(`/doctor/patients?id=${visit.patient?.healthId || ''}`)}
                                    >
                                        Call Patient
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}
