import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Search, UserCircle, FileText, ShieldCheck, Pill,
    Heart, Phone, Shield, ExternalLink, AlertTriangle, Activity, Plus
} from "lucide-react";
import { format } from "date-fns";
import { HealthJourney } from "@/components/HealthJourney";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function DoctorPatients() {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchInput, setSearchInput] = useState("");
    const [queryId, setQueryId] = useState("");
    const [showEmergency, setShowEmergency] = useState(false);
    const [prescOpen, setPrescOpen] = useState(false);
    const [prescForm, setPrescForm] = useState({ diagnosis: "", instructions: "", validUntil: "", med1: "", med2: "", med3: "" });

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

    const { data: patient, isLoading } = useQuery<any>({
        queryKey: ["/api/patients/search", queryId],
        queryFn: async () => {
            if (!queryId) return null;
            const r = await apiRequest("GET", `/api/patients/${queryId}`);
            if (!r.ok) return null;
            return r.json();
        },
        enabled: !!queryId,
    });

    const createPrescriptionMutation = useMutation({
        mutationFn: async (data: any) => {
            const r = await apiRequest("POST", "/api/prescriptions", data);
            if (!r.ok) throw new Error("Failed to create prescription");
            return r.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/prescriptions", patient?.id] });
            queryClient.invalidateQueries({ queryKey: ["/api/records", patient?.id] });
            queryClient.invalidateQueries({ queryKey: ["/api/visits", patient?.id] });
            setPrescOpen(false);
            setPrescForm({ diagnosis: "", instructions: "", validUntil: "", med1: "", med2: "", med3: "" });
            toast({ title: "Prescription Created", description: "The prescription has been saved to patient records." });
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    const handlePrescriptionSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!patient?.id) return;
        const meds = [prescForm.med1, prescForm.med2, prescForm.med3].filter(Boolean);
        createPrescriptionMutation.mutate({
            patientId: patient.id,
            medications: meds,
            diagnosis: prescForm.diagnosis,
            instructions: prescForm.instructions,
            validUntil: prescForm.validUntil,
        });
    };

    // List fetching now handled by HealthJourney component
    // We only keep patient search and emergency info here

    // Access permission status for searched patient
    const { data: accessStatus, refetch: refetchAccess } = useQuery({
        queryKey: [`/api/access-status/${patient?.id}`],
        queryFn: async () => {
            if (!patient?.id) return null;
            const r = await apiRequest("GET", `/api/access-status/${patient.id}`);
            return r.json();
        },
        enabled: !!patient?.id,
        refetchInterval: 3000,
    });

    const permStatus = accessStatus?.permission?.accessStatus;
    const accessRequested = permStatus === 'pending';
    const accessGranted = accessStatus?.granted || permStatus === 'active';

    // Auto-refresh patient data when access is granted
    useEffect(() => {
        if (accessGranted && queryId) {
            queryClient.invalidateQueries({ queryKey: ["/api/patients/search", queryId] });
        }
    }, [accessGranted, queryId, queryClient]);

    // Emergency info for doctor view
    const { data: emergencyInfo } = useQuery({
        queryKey: [`/api/emergency-info/${patient?.id}`],
        queryFn: async () => {
            if (!patient?.id) return null;
            const r = await apiRequest("GET", `/api/emergency-info/${patient.id}`);
            if (!r.ok) return null;
            return r.json();
        },
        enabled: !!patient?.id && showEmergency && accessGranted,
    });

    const requestAccessMutation = useMutation({
        mutationFn: async () => {
            const r = await apiRequest("POST", "/api/access/request", { patientId: patient?.id });
            if (!r.ok) {
                const err = await r.json().catch(() => ({}));
                throw new Error(err.message || "Failed to request access");
            }
            return r.json();
        },
        onSuccess: () => {
            refetchAccess();
            queryClient.invalidateQueries({ queryKey: [`/api/access-status/${patient?.id}`] });
            toast({ title: "Request Sent", description: "The patient has been notified to grant access." });
        },
        onError: (err: any) => toast({ title: "Request Failed", description: err.message, variant: "destructive" }),
    });

    const revokeAccessMutation = useMutation({
        mutationFn: async () => {
            const r = await apiRequest("POST", "/api/access/revoke", { patientId: patient?.id });
            if (!r.ok) {
                const err = await r.json().catch(() => ({}));
                throw new Error(err.message || "Failed to revoke access");
            }
            return r.json();
        },
        onSuccess: () => {
            refetchAccess();
            queryClient.invalidateQueries({ queryKey: [`/api/access-status/${patient?.id}`] });
            queryClient.invalidateQueries({ queryKey: [`/api/emergency-info/${patient?.id}`] });
            toast({ title: "Access Revoked", description: "You no longer have access to this patient's records." });
        },
        onError: (err: any) => toast({ title: "Revoke Failed", description: err.message, variant: "destructive" }),
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setQueryId(searchInput.trim());
        setShowEmergency(false);
    };

    return (
        <AppLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-display font-bold text-slate-900">Patient Lookup</h1>
                <p className="text-slate-500 mt-1">Search patient by Health ID to view records and emergency info</p>
                <form onSubmit={handleSearch} className="mt-6 max-w-xl flex gap-3">
                    <Input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Enter Health ID (e.g. ML-PAT-ABCDE)" className="h-12 rounded-2xl text-lg" />
                    <Button type="submit" className="h-12 px-8 rounded-2xl bg-slate-900 text-white"><Search className="w-5 h-5" /></Button>
                </form>
                {patient && !accessGranted && (
                    <p className="mt-3 text-sm font-medium text-amber-600 flex items-center gap-2">
                        <Shield className="w-4 h-4" /> Access not granted for this patient. Please request permission.
                    </p>
                )}
            </div>

            {isLoading && <div className="p-8 text-center text-slate-500 animate-pulse">Searching...</div>}
            {queryId && !isLoading && !patient && (
                <div className="p-6 bg-red-50 text-red-700 rounded-2xl text-center font-medium mb-8">Patient not found. Please verify the Health ID.</div>
            )}

            {/* Department Queue - Consolidation */}
            {!patient && !isLoading && (
                <div className="max-w-4xl">
                    <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-teal-600" />
                        Today's Department Queue: {specialization || "General"}
                    </h2>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Pending / Waiting Room */}
                        <div>
                            <h3 className="text-sm font-semibold text-amber-600 mb-3 uppercase tracking-wide">Pending / Waiting Room</h3>
                            <div className="space-y-3">
                                {deptVisits?.filter((v: any) => !v.checkOutTime).map((visit: any) => (
                                    <div 
                                        key={visit.id} 
                                        onClick={() => {
                                            if (visit.patient?.healthId) {
                                                setSearchInput(visit.patient.healthId);
                                                setQueryId(visit.patient.healthId);
                                            }
                                        }}
                                        className="p-4 bg-white rounded-2xl shadow-sm border border-amber-100 flex justify-between items-center cursor-pointer hover:border-amber-400 hover:shadow-md transition-all"
                                    >
                                        <div>
                                            <p className="font-semibold text-slate-900">{visit.patient?.user?.name || `Patient #${visit.patientId}`}</p>
                                            <p className="text-sm text-slate-500">Checked in at: {format(new Date(visit.checkInTime), "p")}</p>
                                        </div>
                                        <span className="px-3 py-1 rounded-full text-xs font-bold border capitalize bg-amber-100 text-amber-700 border-amber-200">Waiting</span>
                                    </div>
                                ))}
                                {(!deptVisits || deptVisits?.filter((v: any) => !v.checkOutTime).length === 0) && (
                                    <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
                                        <p className="text-sm">No patients waiting currently.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Treated Today */}
                        <div>
                            <h3 className="text-sm font-semibold text-green-600 mb-3 uppercase tracking-wide">Successfully Treated Today</h3>
                            <div className="space-y-3 opacity-90">
                                {deptVisits?.filter((v: any) => v.checkOutTime).slice(0, 10).map((visit: any) => (
                                    <div key={visit.id} className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center bg-slate-50/50">
                                        <div>
                                            <p className="font-semibold text-slate-900 line-through decoration-slate-300">{visit.patient?.user?.name || `Patient #${visit.patientId}`}</p>
                                            <p className="text-xs text-slate-500">Completed at: {format(new Date(visit.checkOutTime), "p")}</p>
                                        </div>
                                        <span className="px-3 py-1 rounded-full text-xs font-bold border capitalize bg-white text-green-600 border-green-100">Treated</span>
                                    </div>
                                ))}
                                {(!deptVisits || deptVisits?.filter((v: any) => v.checkOutTime).length === 0) && (
                                    <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
                                        <p className="text-sm">No patients treated today yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {patient && (
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left sidebar: patient info + emergency */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card className="rounded-3xl border-0 shadow-lg">
                            <CardContent className="p-6 text-center">
                                <div className="flex flex-col items-center pb-6 border-b border-slate-100">
                                    <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mb-4">
                                        <UserCircle className="w-10 h-10 text-teal-600" />
                                    </div>
                                    <h3 className="font-bold text-xl text-slate-900">
                                        {patient.user?.name}
                                    </h3>
                                    <p className="text-sm font-mono text-teal-600 mt-1">{patient.healthId}</p>
                                    <div className="mt-3">
                                        {accessGranted ? (
                                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Access Active</Badge>
                                        ) : accessRequested ? (
                                            <Badge className="bg-amber-100 text-amber-700 border-amber-200">Request Pending</Badge>
                                        ) : (
                                            <div className="space-y-2">
                                                <Badge className="bg-red-100 text-red-700 border-red-200">Access Restricted</Badge>
                                                {!user?.doctor?.currentHospitalId && !accessStatus?.permission && (
                                                    <p className="text-[10px] text-amber-600 font-medium">
                                                        Tip: Ensure you are linked to a hospital that has been granted access.
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="pt-4 space-y-3 text-sm text-left">
                                    {[["DOB", patient.dateOfBirth], ["Gender", patient.gender]].map(([k, v]) => (
                                        <div key={k} className="flex justify-between">
                                            <span className="text-slate-500">{k}</span>
                                            <span className="font-medium">{v || "N/A"}</span>
                                        </div>
                                    ))}
                                </div>

                                {accessGranted ? (
                                    <div className="space-y-3 mt-6">
                                        <Button
                                            onClick={() => setShowEmergency(!showEmergency)}
                                            variant="outline"
                                            className="w-full rounded-xl h-10 border-red-200 text-red-600 hover:bg-red-50"
                                        >
                                            <Heart className="w-4 h-4 mr-2" />
                                            {showEmergency ? "Hide" : "View"} Emergency Info
                                        </Button>
                                        <Button
                                            onClick={() => revokeAccessMutation.mutate()}
                                            disabled={revokeAccessMutation.isPending}
                                            variant="outline"
                                            className="w-full rounded-xl h-10 border-slate-200 text-slate-600 hover:bg-slate-50"
                                        >
                                            <Activity className="w-4 h-4 mr-2" />
                                            Revoke Access
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        onClick={() => requestAccessMutation.mutate()}
                                        disabled={requestAccessMutation.isPending || accessRequested}
                                        className={`w-full mt-6 rounded-xl h-12 font-bold text-white shadow-lg ${accessRequested ? 'bg-amber-500 shadow-amber-200' : 'bg-teal-600 hover:bg-teal-700 shadow-teal-200'}`}
                                    >
                                        {requestAccessMutation.isPending ? "Requesting..." : accessRequested ? "Request Pending" : "Request Access"}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>

                        {/* Emergency info card - shows when button clicked */}
                        {showEmergency && emergencyInfo && accessGranted && (
                            <Card className="rounded-3xl border-0 shadow-lg border border-red-100">
                                <CardContent className="p-6">
                                    <h3 className="font-black text-red-600 flex items-center gap-2 mb-4">
                                        <AlertTriangle className="w-5 h-5" /> Emergency Profile
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="bg-red-50 rounded-xl p-3 text-center">
                                            <p className="text-xs text-red-500 font-bold uppercase">Blood Group</p>
                                            <p className="text-3xl font-black text-red-600">{emergencyInfo.bloodGroup}</p>
                                        </div>
                                        <div className="bg-orange-50 rounded-xl p-3">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <Pill className="w-4 h-4 text-orange-500" />
                                                <p className="text-xs font-bold text-orange-600 uppercase">Allergies</p>
                                            </div>
                                            <p className="text-sm text-slate-700">{emergencyInfo.allergies || "None"}</p>
                                        </div>
                                        <div className="bg-purple-50 rounded-xl p-3">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <Shield className="w-4 h-4 text-purple-500" />
                                                <p className="text-xs font-bold text-purple-600 uppercase">Conditions</p>
                                            </div>
                                            <p className="text-sm text-slate-700">{emergencyInfo.chronicDiseases || "None"}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Right: Health Journey Timeline */}
                    <div className="lg:col-span-2 space-y-8">
                        {accessGranted ? (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold text-xl text-slate-900 flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-teal-600" /> Patient Health Journey
                                    </h3>

                                    <Dialog open={prescOpen} onOpenChange={setPrescOpen}>
                                        <DialogTrigger asChild>
                                            <Button className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-500/20">
                                                <Plus className="w-4 h-4 mr-2" /> New Prescription
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[550px] rounded-3xl p-8 border-0 shadow-2xl">
                                            <DialogHeader>
                                                <DialogTitle className="text-2xl font-display text-slate-900 border-b pb-4">
                                                    Write Prescription for <span className="text-teal-600">{patient.user?.name}</span>
                                                </DialogTitle>
                                            </DialogHeader>
                                            <form onSubmit={handlePrescriptionSubmit} className="space-y-4 mt-6">
                                                <div>
                                                    <label className="text-sm font-bold text-slate-700 mb-2 block">Diagnosis / Condition</label>
                                                    <Input
                                                        placeholder="e.g. Chronic Hypertension"
                                                        value={prescForm.diagnosis}
                                                        onChange={e => setPrescForm({ ...prescForm, diagnosis: e.target.value })}
                                                        className="h-11 rounded-xl"
                                                        required
                                                    />
                                                </div>
                                                <div className="grid grid-cols-3 gap-3">
                                                    {["med1", "med2", "med3"].map((k, i) => (
                                                        <div key={k}>
                                                            <label className="text-xs font-bold text-slate-500 mb-1.5 block uppercase">Medication {i + 1}</label>
                                                            <Input
                                                                placeholder="Paracetamol"
                                                                value={(prescForm as any)[k]}
                                                                onChange={e => setPrescForm({ ...prescForm, [k]: e.target.value })}
                                                                className="h-11 rounded-xl"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                                <div>
                                                    <label className="text-sm font-bold text-slate-700 mb-2 block">Instructions (Dosage, Timing)</label>
                                                    <Textarea
                                                        placeholder="1 tablet after meal, twice a day"
                                                        value={prescForm.instructions}
                                                        onChange={e => setPrescForm({ ...prescForm, instructions: e.target.value })}
                                                        className="rounded-xl resize-none"
                                                        rows={3}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-bold text-slate-700 mb-2 block">Follow-up / Valid Until</label>
                                                    <Input
                                                        type="date"
                                                        value={prescForm.validUntil}
                                                        onChange={e => setPrescForm({ ...prescForm, validUntil: e.target.value })}
                                                        className="h-11 rounded-xl"
                                                    />
                                                </div>
                                                <Button
                                                    type="submit"
                                                    disabled={createPrescriptionMutation.isPending}
                                                    className="w-full h-12 mt-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold"
                                                >
                                                    {createPrescriptionMutation.isPending ? "Issuing Prescription..." : "Issue Prescription"}
                                                </Button>
                                            </form>
                                        </DialogContent>
                                    </Dialog>
                                </div>

                                <HealthJourney patientId={patient.id} />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-20 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200">
                                <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6">
                                    <Shield className="w-10 h-10 text-amber-500" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h3>
                                <p className="text-slate-500 text-center max-w-sm mb-8">
                                    You need permission from the patient to view their medical history, prescriptions, and emergency details.
                                </p>
                                {!accessRequested && (
                                    <Button
                                        onClick={() => requestAccessMutation.mutate()}
                                        className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-8 h-11 font-bold shadow-lg shadow-teal-500/20"
                                    >
                                        Request Access Permission
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
