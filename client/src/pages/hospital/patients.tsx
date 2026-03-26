import { useState, useEffect } from "react";

// Safely parse SQLite createdAt (seconds, milliseconds, or ISO string)
function safeDate(val: any): Date | null {
  if (!val) return null;
  if (typeof val === "string") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  const num = Number(val);
  if (isNaN(num)) return null;
  // SQLite drizzle stores as unix seconds (10-digit); ms would be 13-digit
  const d = new Date(num < 1e10 ? num * 1000 : num);
  return isNaN(d.getTime()) ? null : d;
}
import { AppLayout } from "@/components/layout/AppLayout";
import { useSearchPatient } from "@/hooks/use-patients";
import { useRecords } from "@/hooks/use-records";
import { useAiSummary } from "@/hooks/use-ai";
import { useCheckInVisit, useCheckOutVisit, useVisits } from "@/hooks/use-visits";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search, UserCircle, Activity, Sparkles,
  ShieldCheck, ShieldOff, LogIn, LogOut, FileText,
  AlertCircle, CheckCircle, Heart, Pill, Phone, Shield, Clock
} from "lucide-react";
import { format } from "date-fns";
import { HealthJourney } from "@/components/HealthJourney";

export default function HospitalPatients() {
  const [searchInput, setSearchInput] = useState("");
  const [queryId, setQueryId] = useState("");
  const [summary, setSummary] = useState("");
  const [showEmergency, setShowEmergency] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: patient, isLoading: searchLoading } = useSearchPatient(queryId);
  const { data: records, isLoading: recordsLoading } = useRecords(patient?.id);
  const aiSummaryMutation = useAiSummary();
  const checkInMutation = useCheckInVisit();
  const checkOutMutation = useCheckOutVisit();
  const { data: visits } = useVisits(patient?.id);

  // Fetch hospital appointments to check if searched patient has a booking
  const { data: hospAppointments } = useQuery({
      queryKey: ["/api/appointments"],
      queryFn: async () => { const r = await apiRequest("GET", "/api/appointments"); return r.json(); },
      enabled: !!user?.hospital?.id
  });

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

  // Fetch all doctors to calculate valid departments for this hospital
  const { data: allDoctors } = useQuery({
      queryKey: ["/api/doctors"],
      queryFn: async () => { const r = await apiRequest("GET", "/api/doctors"); return r.json(); },
  });

  const permStatus = accessStatus?.permission?.accessStatus;
  const accessRequested = permStatus === 'pending';
  const accessGranted = accessStatus?.granted || permStatus === 'active';

  // Find active visit with more robust checks
  const activeVisit = Array.isArray(visits) ? visits.find((v: any) => 
    Number(v.patientId) === Number(patient?.id) && 
    (!v.checkOutTime || v.visitStatus === 'active')
  ) : null;


  // Auto-refresh patient data when access is granted
  useEffect(() => {
    if (accessGranted && queryId) {
      queryClient.invalidateQueries({ queryKey: ["/api/patients/search", queryId] });
    }
  }, [accessGranted, queryId, queryClient]);

  // Auto-select department if patient has a booked appointment today
  useEffect(() => {
    if (patient?.id && hospAppointments) {
      const localToday = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
      const todayAppointment = hospAppointments.find((a: any) => 
        a.patientId === patient.id && 
        a.status === "booked" &&
        a.date === localToday
      );
      if (todayAppointment && todayAppointment.department) {
        setSelectedDepartment(todayAppointment.department.toLowerCase());
      } else if (!todayAppointment) {
        setSelectedDepartment("");
      }
    }
  }, [patient?.id, hospAppointments]);

  // Emergency info (only fetched after access is granted)
  const { data: emergencyInfo } = useQuery({
    queryKey: [`/api/emergency-info/${patient?.id}`],
    queryFn: async () => {
      if (!patient?.id) return null;
      const r = await apiRequest("GET", `/api/emergency-info/${patient.id}`);
      return r.json();
    },
    enabled: !!patient?.id && !!accessStatus?.granted,
  });

  // Request access — hospital requests access from patient
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
    setSummary("");
    setShowEmergency(false);
  };

  const handleGenerateSummary = async () => {
    if (!patient?.id) return;
    const res = await aiSummaryMutation.mutateAsync(patient.id);
    setSummary(res.summary);
  };



  return (
    <AppLayout>
      <div className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-display font-bold text-slate-900">Patient Management</h1>
        <p className="text-slate-500 mt-1">Search by Health ID → Grant Access → Check In → View Records</p>

        <form onSubmit={handleSearch} className="mt-6 flex gap-3">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Enter Health ID (e.g. ML-PAT-XXXXX)"
            className="h-14 rounded-2xl border-slate-200 shadow-sm text-lg"
          />
          <Button type="submit" className="h-14 px-8 rounded-2xl bg-slate-900 text-white hover:bg-slate-800">
            <Search className="w-5 h-5" />
          </Button>
        </form>
      </div>

      {searchLoading && <div className="p-8 text-center text-slate-500 animate-pulse">Searching securely...</div>}

      {queryId && !searchLoading && !patient && (
        <Card className="bg-red-50 border-red-100 shadow-none mb-6">
          <CardContent className="p-6 text-red-700 text-center font-medium flex items-center justify-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Patient not found. Please verify the Health ID.
          </CardContent>
        </Card>
      )}

      {patient && (
        <div className="space-y-6 max-w-4xl">
          {/* Patient Card */}
          <Card className="rounded-3xl border-0 shadow-xl shadow-slate-200/50">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-20 h-20 bg-teal-50 rounded-2xl flex items-center justify-center shrink-0">
                  <UserCircle className="w-12 h-12 text-teal-500" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-slate-900">{patient.user?.name || "Patient"}</h2>
                  <p className="text-slate-500 font-mono text-sm mt-0.5">{patient.healthId}</p>
                  <p className="text-slate-600 text-sm mt-1">{patient.gender}{patient.dateOfBirth ? ` • DOB: ${patient.dateOfBirth}` : ""}</p>
                  <p className="text-slate-600 text-sm">Contact: {patient.contactNumber}</p>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {accessGranted ? (
                      <span className="flex items-center gap-1.5 bg-teal-100 text-teal-700 text-xs font-bold px-3 py-1.5 rounded-full">
                        <CheckCircle className="w-3.5 h-3.5" /> Access Active
                      </span>
                    ) : accessRequested ? (
                      <span className="flex items-center gap-1.5 bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full">
                        <Clock className="w-3.5 h-3.5" /> Request Pending
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 bg-red-100 text-red-700 text-xs font-bold px-3 py-1.5 rounded-full">
                        <ShieldOff className="w-3.5 h-3.5" /> Access Required
                      </span>
                    )}
                    {activeVisit ? (
                      <span className="flex items-center gap-1.5 bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full">
                        <Activity className="w-3.5 h-3.5" /> Patient In
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-full">
                        Patient Out
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 min-w-[180px]">
                  {accessGranted ? (
                    <Button
                      onClick={() => revokeAccessMutation.mutate()}
                      disabled={revokeAccessMutation.isPending}
                      variant="outline"
                      className="w-full rounded-xl h-11 font-bold border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors shadow-sm"
                    >
                      <ShieldOff className="w-4 h-4 mr-2" />
                      {revokeAccessMutation.isPending ? "Revoking..." : "Revoke Access"}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => requestAccessMutation.mutate()}
                      disabled={requestAccessMutation.isPending || accessRequested}
                      className={`w-full text-white rounded-xl h-11 font-bold border-0 shadow-lg transition-all ${accessRequested ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700 shadow-teal-200'}`}
                    >
                      {accessRequested ? <Clock className="w-4 h-4 mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                      {requestAccessMutation.isPending ? "Requesting..." : accessRequested ? "Access Request Pending" : "Request Access Permission"}
                    </Button>
                  )}

                  {!activeVisit ? (
                    <div className="flex flex-col gap-2">
                      <select
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                        className="h-11 rounded-xl border-slate-200 px-3 text-sm flex-1 bg-white outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
                      >
                        <option value="">Select Department (Required)</option>
                        {(() => {
                            const hDocs = (allDoctors || []).filter((d: any) => d.currentHospitalId === user?.hospital?.id && d.joinStatus === "approved");
                            const hDepts = Array.from(new Set(hDocs.map((d: any) => d.specialization).filter(Boolean)));
                            
                            // Does the patient have an appointment booked today?
                            let defaultDept = "";
                            const localToday = new Date().toLocaleDateString('en-CA');
                            const hasAppointment = hospAppointments?.find((a: any) => 
                                a.patientId === patient?.id && 
                                a.status === "booked" &&
                                a.date === localToday
                            );

                            // Dynamically label the check in button
                            const checkInLabel = hasAppointment ? "Appointment Booked / Check In" : "Check In Patient";

                            if (hDepts.length === 0) {
                                return <option value="General">General</option>;
                            }
                            
                            return hDepts.map((dept: any) => (
                                <option key={dept} value={dept.toLowerCase()}>{dept}</option>
                            ));
                        })()}
                      </select>
                      <Button
                        onClick={() => checkInMutation.mutate({ 
                          tokenOrId: patient.id, 
                          department: selectedDepartment,
                          hospitalId: user?.hospital?.id 
                        })}
                        disabled={checkInMutation.isPending || !accessGranted || !selectedDepartment}
                        className={`w-full text-white rounded-xl h-11 font-bold shadow-lg transition-all ${(!accessGranted || !selectedDepartment) ? 'bg-slate-400 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}
                        title={!accessGranted ? "Access must be granted by the patient first" : !selectedDepartment ? "Please select a department" : ""}
                      >
                        <LogIn className="w-4 h-4 mr-2" />
                        {(() => {
                            const localToday = new Date().toLocaleDateString('en-CA');
                            const hasAppointment = hospAppointments?.find((a: any) => 
                                a.patientId === patient?.id && 
                                a.status === "booked" &&
                                a.date === localToday
                            );
                            if (checkInMutation.isPending) return "Checking In...";
                            return hasAppointment ? "Appt. Booked / Check In" : "Check In Patient";
                        })()}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => checkOutMutation.mutate(activeVisit.id)}
                      disabled={checkOutMutation.isPending}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl h-11 font-bold transition-colors"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      {checkOutMutation.isPending ? "Checking Out..." : "Check Out"}
                    </Button>
                  )}

                  {accessGranted && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setShowEmergency(!showEmergency)}
                        className="w-full rounded-xl h-11 font-bold border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <Heart className="w-4 h-4 mr-2" />
                        Emergency Info
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleGenerateSummary}
                        disabled={aiSummaryMutation.isPending}
                        className="w-full rounded-xl h-11 font-bold"
                      >
                        <Sparkles className="w-4 h-4 mr-2 text-purple-500" />
                        {aiSummaryMutation.isPending ? "Generating..." : "AI Summary"}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {activeVisit && (
                <div className="mt-4 p-3 bg-blue-50 rounded-xl text-sm text-blue-700">
                  <span className="font-bold">Checked In: </span>
                  {safeDate(activeVisit.checkInTime) ? format(safeDate(activeVisit.checkInTime)!, "PPpp") : "Just now"}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Emergency Info Panel */}
          {showEmergency && emergencyInfo && accessGranted && (
            <Card className="rounded-3xl border-0 shadow-xl shadow-red-100">
              <CardContent className="p-6">
                <h3 className="font-black text-red-600 text-lg mb-4 flex items-center gap-2">
                  <Heart className="w-5 h-5" /> Emergency Medical Profile
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
                    <p className="text-xs font-bold text-red-500 uppercase mb-1">Blood Group</p>
                    <p className="text-3xl font-black text-red-600">{emergencyInfo.bloodGroup}</p>
                  </div>
                  <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
                    <div className="flex items-center gap-1.5 mb-1"><Pill className="w-4 h-4 text-orange-500" /><p className="text-xs font-bold text-orange-600 uppercase">Allergies</p></div>
                    <p className="text-sm text-slate-700">{emergencyInfo.allergies || "None"}</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
                    <div className="flex items-center gap-1.5 mb-1"><Shield className="w-4 h-4 text-purple-500" /><p className="text-xs font-bold text-purple-600 uppercase">Conditions</p></div>
                    <p className="text-sm text-slate-700">{emergencyInfo.chronicDiseases || "None"}</p>
                  </div>
                  {(emergencyInfo.emergencyContactName || emergencyInfo.emergencyContactPhone) && (
                    <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 col-span-2">
                      <div className="flex items-center gap-1.5 mb-1"><Phone className="w-4 h-4 text-teal-500" /><p className="text-xs font-bold text-teal-600 uppercase">Emergency Contact</p></div>
                      <p className="font-bold text-slate-800">{emergencyInfo.emergencyContactName}</p>
                      {emergencyInfo.emergencyContactPhone && (
                        <a href={`tel:${emergencyInfo.emergencyContactPhone}`} className="text-teal-600 font-bold hover:underline">
                          {emergencyInfo.emergencyContactPhone}
                        </a>
                      )}
                    </div>
                  )}
                  {emergencyInfo.notes && (
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 col-span-2 md:col-span-3">
                      <p className="text-xs font-bold text-slate-500 uppercase mb-1">Notes</p>
                      <p className="text-sm text-slate-700">{emergencyInfo.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Summary */}
          {summary && (
            <Card className="rounded-3xl border-0 shadow-lg shadow-purple-100">
              <CardContent className="p-6">
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" /> AI Medical Summary
                </h3>
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-sm">{summary}</p>
              </CardContent>
            </Card>
          )}

          {accessGranted ? (
            <div>
              <h3 className="font-bold text-slate-900 text-xl mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-600" /> Patient Health Journey
              </h3>
              <HealthJourney patientId={patient.id} />
            </div>
          ) : (
            <div className="p-8 text-center border-2 border-dashed border-amber-200 rounded-2xl bg-amber-50">
              <ShieldOff className="w-10 h-10 mx-auto mb-3 text-amber-400" />
              <p className="font-bold text-amber-700">Access Required</p>
              <p className="text-sm text-amber-600 mt-1">Grant access above to view this patient's records and emergency info</p>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
