import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    ShieldCheck, ShieldOff, Building2, Stethoscope,
    Clock, CheckCircle2, AlertTriangle, Eye, EyeOff, Lock
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Search, LogIn, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCheckInVisit, useCheckOutVisit, useVisits } from "@/hooks/use-visits";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AccessControl() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data: permissions, isLoading: pLoading } = useQuery({
        queryKey: ["/api/access/permissions"],
        queryFn: async () => { const r = await apiRequest("GET", "/api/access/permissions"); return r.json(); },
    });

    const { user } = useAuth();
    const { data: visits } = useVisits(user?.patient?.id);
    const checkInMutation = useCheckInVisit();
    const checkOutMutation = useCheckOutVisit();
    
    // Track selected departments for check-in by hospitalId
    const [selectedDepts, setSelectedDepts] = useState<Record<number, string>>({});

    const { data: hospitals } = useQuery({
        queryKey: ["/api/hospitals"],
        queryFn: async () => { const r = await apiRequest("GET", "/api/hospitals"); return r.json(); },
    });
    
    // Fetch all doctors to calculate valid departments per hospital
    const { data: allDoctors } = useQuery({
        queryKey: ["/api/doctors"],
        queryFn: async () => { const r = await apiRequest("GET", "/api/doctors"); return r.json(); },
    });

    const approveMutation = useMutation({
        mutationFn: async (hospitalId: number) => {
            const r = await apiRequest("POST", "/api/access/grant", { hospitalId });
            return r.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/access/permissions"] });
            toast({ title: "Access Approved", description: "This hospital can now view your records." });
        },
        onError: () => toast({ title: "Failed to approve", variant: "destructive" }),
    });

    const rejectMutation = useMutation({
        mutationFn: async (hospitalId: number) => {
            const r = await apiRequest("POST", "/api/access/revoke", { hospitalId });
            return r.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/access/permissions"] });
            toast({ title: "Request Declined", description: "The hospital's access request was denied." });
        },
        onError: () => toast({ title: "Failed to decline", variant: "destructive" }),
    });

    const preGrantMutation = useMutation({
        mutationFn: async (hospitalId: number) => {
            const r = await apiRequest("POST", "/api/access/grant", { hospitalId });
            return r.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/access/permissions"] });
            toast({ title: "Access Granted", description: "This hospital is now pre-authorized to view your records." });
        },
        onError: () => toast({ title: "Failed to grant access", variant: "destructive" }),
    });

    const revokeMutation = useMutation({
        mutationFn: async (hospitalId: number) => {
            const r = await apiRequest("POST", "/api/access/revoke", { hospitalId });
            return r.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/access/permissions"] });
            toast({ title: "Access Revoked", description: "Hospital can no longer view your records." });
        },
        onError: () => toast({ title: "Failed to revoke", variant: "destructive" }),
    });

    // Find hospital info by hospitalId
    const getHospital = (hospitalId: number) =>
        (hospitals || []).find((h: any) => h.id === hospitalId);

    // Stats & Filters
    const pendingRequests = permissions?.filter((p: any) => p.accessStatus === 'pending') || [];
    const activePermissions = permissions?.filter((p: any) => p.accessStatus === 'active') || [];
    const totalGranted = activePermissions.length;

    const [searchHospital, setSearchHospital] = useState("");
    const availableHospitals = (hospitals || []).filter((h: any) =>
        !activePermissions.some((ap: any) => ap.hospitalId === h.id) &&
        (h.user?.name?.toLowerCase().includes(searchHospital.toLowerCase()) ||
            h.hospitalId?.toLowerCase().includes(searchHospital.toLowerCase()))
    );

    const recentCount = activePermissions.filter((p: any) => {
        const d = new Date(p.grantedAt || 0);
        return Date.now() - d.getTime() < 7 * 86400_000;
    }).length;

    return (
        <AppLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-display font-bold text-slate-900">Data Access Control</h1>
                <p className="text-slate-500 mt-1">Control which hospitals can view your medical records</p>
            </div>

            {/* Info banner */}
            <div className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-start gap-3">
                <Lock className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                    <p className="text-sm font-semibold text-blue-900">Your data is protected</p>
                    <p className="text-sm text-blue-700 mt-0.5">Only hospitals you have visited and granted permission to can access your medical records. You can revoke access at any time.</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                <Card className="rounded-2xl border-0 shadow-sm bg-slate-900 text-white">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold">{totalGranted}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Hospitals with Access</p>
                    </CardContent>
                </Card>
                <Card className="rounded-2xl border-0 shadow-sm bg-amber-500 text-white">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold">{pendingRequests.length}</p>
                        <p className="text-xs text-amber-100 mt-0.5">Pending Requests</p>
                    </CardContent>
                </Card>
                <Card className="rounded-2xl border-0 shadow-sm bg-blue-600 text-white">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold">{recentCount}</p>
                        <p className="text-xs text-blue-100 mt-0.5">Granted This Week</p>
                    </CardContent>
                </Card>
            </div>

            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
                <div className="mb-10">
                    <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-amber-500" /> Pending Access Requests
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">{pendingRequests.length}</span>
                    </h2>
                    <div className="space-y-4">
                        {pendingRequests.map((perm: any) => {
                            const hospital = getHospital(perm.hospitalId);
                            return (
                                <Card key={perm.id} className="rounded-2xl border-2 border-amber-100 bg-amber-50/30 shadow-sm overflow-hidden">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                                                    <Building2 className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900 leading-none">{hospital?.user?.name || `Hospital #${perm.hospitalId}`}</h3>
                                                    <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" /> Requested just now
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => approveMutation.mutate(perm.hospitalId)}
                                                    disabled={approveMutation.isPending}
                                                    className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs h-9 px-4 font-bold"
                                                >
                                                    Approve Access
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => rejectMutation.mutate(perm.hospitalId)}
                                                    disabled={rejectMutation.isPending}
                                                    className="text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl text-xs h-9 font-medium"
                                                >
                                                    Decline
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Pre-Grant / Hospital Access Management */}
            <div className="mb-10">
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-teal-600" /> Hospital Access Management
                </h2>
                <Card className="rounded-3xl border-0 shadow-sm overflow-hidden bg-white mb-6">
                    <CardContent className="p-6">
                        <p className="text-sm text-slate-500 mb-4">Search and manually grant hospitals access to your records before your visit so they can check you in instantly.</p>

                        <div className="relative mb-6">
                            <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                            <Input
                                placeholder="Search by Hospital Name or ID (e.g., ML-HOSP-XXXXX)"
                                className="pl-11 h-12 bg-slate-50 border-slate-200 rounded-xl rounded-b-none focus-visible:ring-teal-500 text-sm"
                                value={searchHospital}
                                onChange={(e) => setSearchHospital(e.target.value)}
                            />
                        </div>

                        {searchHospital.length > 0 && (
                            <div className="space-y-2 border border-slate-100 border-t-0 p-4 rounded-b-xl -mt-6 bg-white shadow-sm z-10 relative">
                                {availableHospitals.length === 0 ? (
                                    <p className="text-sm text-slate-500 text-center py-4">No matching hospitals found or access is already granted.</p>
                                ) : (
                                    availableHospitals.slice(0, 5).map((hospital: any) => (
                                        <div key={hospital.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-lg flex items-center justify-center">
                                                    <Building2 className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-900">{hospital.user?.name}</h4>
                                                    <p className="text-xs text-slate-500">{hospital.hospitalId}</p>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => preGrantMutation.mutate(hospital.id)}
                                                disabled={preGrantMutation.isPending}
                                                className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 rounded-lg font-semibold px-4"
                                            >
                                                Grant Access
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Active Permissions */}
            <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Active Permissions</h2>
            </div>

            {pLoading ? (
                <div className="flex justify-center p-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" /></div>
            ) : activePermissions.length === 0 ? (
                <Card className="border-dashed border-2 border-slate-200 bg-transparent shadow-none rounded-3xl">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                            <ShieldCheck className="w-8 h-8" />
                        </div>
                        <h3 className="text-base font-bold text-slate-700">No active permissions</h3>
                        <p className="text-sm text-slate-500 mt-1 max-w-xs">You haven't granted permanent access to any hospitals yet.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {activePermissions.map((perm: any) => {
                        const hospital = getHospital(perm.hospitalId);
                        const grantedDate = perm.grantedAt ? format(new Date(perm.grantedAt), "MMMM d, yyyy") : "Recently";
                        return (
                            <Card key={perm.id} className="rounded-2xl border-0 shadow-md shadow-slate-200/50 hover:shadow-lg transition-all overflow-hidden border-l-4 border-green-500">
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4 flex-1">
                                            <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl flex items-center justify-center shrink-0 shadow-md">
                                                <Building2 className="w-7 h-7 text-white" />
                                            </div>

                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-bold text-slate-900 text-base">
                                                        {hospital?.user?.name || `Hospital #${perm.hospitalId}`}
                                                    </h3>
                                                </div>

                                                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-500 mt-2">
                                                    {hospital?.address && (
                                                        <p className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-slate-400" />{hospital.address}</p>
                                                    )}
                                                    {hospital?.phone && (
                                                        <p className="flex items-center gap-1.5"><Stethoscope className="w-3.5 h-3.5 text-slate-400" />{hospital.phone}</p>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                                        <Clock className="w-3 h-3" />
                                                        Granted: <span className="font-semibold text-slate-700">{grantedDate}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[10px]">
                                                        <Eye className="w-3 h-3 text-teal-500" />
                                                        <span className="text-teal-600 font-medium whitespace-nowrap">Can view: Records, prescriptions</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-2 shrink-0">
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-100 flex items-center gap-1 mb-1">
                                                <CheckCircle2 className="w-3 h-3" /> Active
                                            </span>
                                            
                                            <div className="flex gap-2 items-center">
                                                {(()=>{
                                                    const activeVisit = visits?.find((v: any) => v.hospitalId === perm.hospitalId && !v.checkOutTime);
                                                    if (activeVisit) {
                                                        return (
                                                            <Button
                                                                size="sm"
                                                                className="bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200 rounded-xl text-[10px] h-7 px-3 font-bold"
                                                                onClick={() => checkOutMutation.mutate(activeVisit.id)}
                                                                disabled={checkOutMutation.isPending}
                                                            >
                                                                <LogOut className="w-3 h-3 justify-center mr-1" /> Check Out
                                                            </Button>
                                                        );
                                                    }
                                                    return (
                                                        <div className="flex items-center gap-2">
                                                            <Select 
                                                                value={selectedDepts[perm.hospitalId]} 
                                                                onValueChange={(val) => setSelectedDepts(prev => ({...prev, [perm.hospitalId]: val}))}
                                                            >
                                                                <SelectTrigger className="w-[110px] h-7 text-[10px] rounded-xl bg-slate-50 border-slate-200">
                                                                    <SelectValue placeholder="Department" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {(() => {
                                                                        const hDocs = (allDoctors || []).filter((d: any) => d.currentHospitalId === perm.hospitalId && d.joinStatus === "approved");
                                                                        const hDepts = Array.from(new Set(hDocs.map((d: any) => d.specialization).filter(Boolean)));
                                                                        
                                                                        if (hDepts.length === 0) {
                                                                            return <SelectItem value="general">General</SelectItem>;
                                                                        }
                                                                        
                                                                        return hDepts.map((dept: any) => (
                                                                            <SelectItem key={dept} value={dept.toLowerCase()}>{dept}</SelectItem>
                                                                        ));
                                                                    })()}
                                                                </SelectContent>
                                                            </Select>
                                                            <Button
                                                                size="sm"
                                                                className="bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 rounded-xl text-[10px] h-7 px-3 font-bold"
                                                                onClick={() => {
                                                                    if (user?.patient?.id) {
                                                                        const dept = selectedDepts[perm.hospitalId];
                                                                        checkInMutation.mutate({ 
                                                                            tokenOrId: user.patient.id, 
                                                                            department: dept,
                                                                            hospitalId: perm.hospitalId
                                                                        });
                                                                    }
                                                                }}
                                                                disabled={checkInMutation.isPending}
                                                            >
                                                                <LogIn className="w-3 h-3 justify-center mr-1" /> Check In
                                                            </Button>
                                                        </div>
                                                    );
                                                })()}
                                                
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="border-red-100 text-red-600 hover:bg-red-50 rounded-xl text-[10px] h-7 px-3 font-bold"
                                                    onClick={() => revokeMutation.mutate(perm.hospitalId)}
                                                    disabled={revokeMutation.isPending}
                                                >
                                                    Revoke
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Footer note */}
            <div className="mt-8 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800">
                    <strong>Note:</strong> Revoking access means the hospital can no longer view your records or prescriptions, even for future visits. You will need to share your QR code again at the hospital to re-grant access.
                </p>
            </div>
        </AppLayout>
    );
}
