import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useSearchPatient } from "@/hooks/use-patients";
import { useAppointments, useUpdateAppointmentStatus } from "@/hooks/use-appointments";
import { useVisits, useCheckOutVisit, useHospitalVisits } from "@/hooks/use-visits";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, UserCircle, Activity, LogOut, FileText, User } from "lucide-react";

export default function HospitalCheckOut() {
    const { user } = useAuth();
    const [searchInput, setSearchInput] = useState("");
    const [queryId, setQueryId] = useState("");

    const { data: patient, isLoading: searchLoading } = useSearchPatient(queryId);

    const { data: appointments, isLoading: appointmentsLoading } = useAppointments();
    const updateMutation = useUpdateAppointmentStatus();

    const { data: visits, isLoading: visitsLoading } = useHospitalVisits(user?.hospital?.id);
    const checkOutVisitMutation = useCheckOutVisit();

    // All currently checked in appointments
    const activeAptCheckIns = appointments?.filter((a: any) => a.status === 'checked-in') || [];
    // All currently active visits
    const activeVisitsList = visits?.filter((v: any) => !v.checkOutTime) || [];

    // Unified list of active patients, prioritizing visits to avoid duplicates
    const activePatients = [
        ...activeVisitsList.map((v: any) => ({ ...v, _type: 'visit' })),
        ...activeAptCheckIns
            .filter((a: any) => !activeVisitsList.some((v: any) => v.patientId === a.patientId))
            .map((a: any) => ({ ...a, _type: 'apt' }))
    ];

    const searchedActive = patient
        ? activePatients.find((a: any) => a.patientId === patient.id)
        : null;

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setQueryId(searchInput);
    };

    const handleCheckOut = (id: number, type: 'apt' | 'visit') => {
        if (type === 'apt') {
            updateMutation.mutate({ id, status: "completed" });
        } else {
            checkOutVisitMutation.mutate(id);
        }

        if (patient && searchedActive?.id === id) {
            setQueryId(""); // Clear search after checkout
            setSearchInput("");
        }
    };

    return (
        <AppLayout>
            <div className="mb-8 max-w-2xl">
                <h1 className="text-3xl font-display font-bold text-slate-900">Patient Check-out</h1>
                <p className="text-slate-500 mt-1">Conclude patient visits and finalize appointment records</p>

                <form onSubmit={handleSearch} className="mt-6 flex gap-3">
                    <Input
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Enter Health ID (e.g. ML-PAT-XXXXX)"
                        className="h-14 rounded-2xl border-slate-200 shadow-sm text-lg"
                    />
                    <Button type="submit" className="h-14 px-8 rounded-2xl bg-teal-600 justify-center text-white hover:bg-teal-700">
                        <Search className="w-5 h-5" />
                    </Button>
                </form>
            </div>

            {searchLoading && <div className="p-8 text-center text-slate-500 animate-pulse">Searching securely...</div>}

            {queryId && !searchLoading && !patient && (
                <Card className="bg-amber-50 border-amber-100 shadow-none mb-8">
                    <CardContent className="p-6 text-amber-700 text-center font-medium">
                        Patient not found. Please verify the Health ID.
                    </CardContent>
                </Card>
            )}

            {/* Searched Patient Result */}
            {patient && (
                <div className="mb-8">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Search Result</h2>
                    <Card className="rounded-3xl border-2 border-teal-100 shadow-lg shadow-teal-500/10">
                        <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row items-center gap-6">
                                <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center shrink-0">
                                    <UserCircle className="w-10 h-10 text-teal-600" />
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <h3 className="font-bold text-xl text-slate-900">{patient.user?.name || "Patient Info"}</h3>
                                    <p className="text-slate-500 text-sm mb-1">ID: {patient.healthId}</p>
                                    <p className="text-sm text-slate-600">
                                        {patient.gender} • DOB: {patient.dateOfBirth}
                                    </p>
                                </div>
                                <div className="shrink-0 w-full md:w-auto mt-4 md:mt-0">
                                    {searchedActive ? (
                                        <Button
                                            onClick={() => handleCheckOut(searchedActive.id, searchedActive._type)}
                                            disabled={updateMutation.isPending || checkOutVisitMutation.isPending}
                                            className="w-full md:w-auto bg-teal-600 hover:bg-teal-700 text-white rounded-xl h-12 px-8 text-lg font-bold shadow-lg shadow-teal-500/25"
                                        >
                                            <LogOut className="w-5 h-5 mr-2" />
                                            {updateMutation.isPending || checkOutVisitMutation.isPending ? "Processing..." : "Check Out Patient"}
                                        </Button>
                                    ) : (
                                        <div className="text-sm text-slate-500 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 text-center">
                                            No active<br />visits found
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Active Check-ins List */}
            <div>
                <h2 className="text-xl font-display font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Activity className="w-6 h-6 text-teal-600" />
                    Currently Active Patients
                    <span className="bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-sm">{activePatients.length}</span>
                </h2>

                {appointmentsLoading || visitsLoading ? (
                    <div className="animate-pulse flex flex-col gap-4">
                        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl w-full"></div>)}
                    </div>
                ) : activePatients.length === 0 ? (
                    <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-3xl text-slate-400">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium text-slate-500">No active check-ins</p>
                        <p className="text-sm">When patients check-in, they will appear here concluding their visit.</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {activePatients.map((apt: any) => (
                            <Card key={apt.id + apt._type} className="rounded-3xl border-0 shadow-md shadow-slate-200/50 hover:shadow-lg transition-all relative overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 to-emerald-400" />
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between mb-6">
                                        <div>
                                            <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-1">
                                                <User className="w-4 h-4" />
                                                Patient #{apt.patientId}
                                            </div>
                                            <p className="text-xs text-slate-400 font-mono tracking-wider">
                                                {apt.appointmentToken || `APT-${apt.id}`}
                                            </p>
                                        </div>
                                        <div className="bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                            Active
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <Button
                                            onClick={() => handleCheckOut(apt.id, apt._type)}
                                            disabled={updateMutation.isPending || checkOutVisitMutation.isPending}
                                            className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-12 font-bold"
                                        >
                                            <LogOut className="w-4 h-4 mr-2" />
                                            Check Out Visit
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

        </AppLayout>
    );
}
