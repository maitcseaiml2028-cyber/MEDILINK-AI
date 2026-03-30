import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, Phone, Heart, Pill, UserCircle, Shield, Search, ArrowRight, ScanFace } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FaceCaptureWidget } from "@/components/FaceCaptureWidget";
import { useToast } from "@/hooks/use-toast";

interface EmergencyInfo {
    patientName: string;
    healthId: string;
    bloodGroup: string;
    allergies: string;
    chronicDiseases: string;
    currentMedications: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    notes: string;
    gender: string;
    dateOfBirth: string;
}

export default function EmergencyView() {
    const { healthId } = useParams<{ healthId: string }>();
    const [, setLocation] = useLocation();
    const [searchId, setSearchId] = useState("");
    const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
    const [matchedInfo, setMatchedInfo] = useState<EmergencyInfo | null>(null);
    const [verifying, setVerifying] = useState(false);
    const { toast } = useToast();

    const { data: info, isLoading, error } = useQuery<EmergencyInfo>({
        queryKey: [`/api/patient/emergency/${healthId}`],
        queryFn: async () => {
            const r = await fetch(`/api/patient/emergency/${encodeURIComponent(healthId!)}`);
            if (!r.ok) throw new Error("Patient not found");
            return r.json();
        },
        enabled: !!healthId,
        retry: false,
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchId.trim()) {
            setLocation(`/emergency/${searchId.trim()}`);
        }
    };

    const handleFaceCapture = async (data: { faceDescriptor: number[] }) => {
        setVerifying(true);
        try {
            const res = await fetch("/api/patient/verify-face", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ descriptor: data.faceDescriptor }),
            });
            
            const result = await res.json();
            if (!res.ok) {
                toast({ title: "Verification Failed", description: result.message, variant: "destructive" });
                return;
            }
            
            // Map the matched basic profile exactly to EmergencyInfo format for UI
            setMatchedInfo({
                patientName: result.patient.name,
                healthId: "BIOMETRIC MATCH",
                bloodGroup: result.patient.bloodGroup,
                allergies: result.patient.allergies,
                chronicDiseases: result.patient.diseases,
                emergencyContactName: result.patient.emergencyContact,
                emergencyContactPhone: result.patient.emergencyContactPhone,
                currentMedications: "",
                notes: "",
                gender: "",
                dateOfBirth: ""
            });
            setIsFaceModalOpen(false);
            toast({ title: "Identity Verified", description: "Emergency access granted via biometric match." });
        } catch(e) {
            toast({ title: "Error", description: "Failed to verify face. Please try again.", variant: "destructive" });
        } finally {
            setVerifying(false);
        }
    };

    if (!healthId && !matchedInfo) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-600 to-orange-500 p-6 flex items-center justify-center">
                <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
                    <div className="flex justify-center mb-6">
                        <div className="bg-red-50 p-4 rounded-2xl">
                            <Heart className="w-10 h-10 text-red-500 animate-pulse" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 text-center mb-2">Emergency Medical Access</h1>
                    <p className="text-slate-500 text-center mb-8">Enter Patient Health ID or scan QR code to view critical medical data.</p>
                    <form onSubmit={handleSearch} className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <Input
                                value={searchId}
                                onChange={(e) => setSearchId(e.target.value)}
                                placeholder="Enter Health ID (e.g. MED123)"
                                className="pl-12 h-14 rounded-2xl border-slate-200 focus:ring-red-500 text-lg"
                            />
                        </div>
                        <Button type="submit" className="w-full h-14 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-lg font-bold shadow-lg shadow-red-600/20">
                            View Profile <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                    </form>
                    
                    <div className="mt-8">
                        <div className="relative flex items-center mb-6">
                            <div className="flex-grow border-t border-slate-200"></div>
                            <span className="flex-shrink-0 mx-4 text-slate-400 text-sm font-semibold">OR</span>
                            <div className="flex-grow border-t border-slate-200"></div>
                        </div>

                        <Button 
                            variant="outline" 
                            className="w-full h-14 border-2 border-red-600 text-red-600 hover:bg-red-50 rounded-2xl text-lg font-bold"
                            onClick={() => setIsFaceModalOpen(true)}
                        >
                            <ScanFace className="w-5 h-5 mr-2" /> Scan Face for Emergency
                        </Button>
                    </div>
                </div>

                <Dialog open={isFaceModalOpen} onOpenChange={setIsFaceModalOpen}>
                    <DialogContent className="sm:max-w-md bg-white">
                        <DialogHeader>
                            <DialogTitle>Emergency Face Scan</DialogTitle>
                            <DialogDescription>
                                Position patient's face in the camera to securely retrieve medical records.
                            </DialogDescription>
                        </DialogHeader>
                        {verifying ? (
                            <div className="flex flex-col items-center p-8">
                                <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-4" />
                                <p className="font-bold text-slate-700">Verifying Identity...</p>
                            </div>
                        ) : (
                            <FaceCaptureWidget mode="verify" onCapture={handleFaceCapture} />
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-red-600 flex items-center justify-center">
                <div className="text-white text-center">
                    <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-xl font-bold">Loading Emergency Info...</p>
                </div>
            </div>
        );
    }

    if (error || (!info && !matchedInfo)) {
        return (
            <div className="min-h-screen bg-red-600 flex items-center justify-center p-6">
                <div className="bg-white rounded-3xl p-10 max-w-sm w-full text-center shadow-2xl">
                    <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Patient Not Found</h1>
                    <p className="text-slate-500">Could not find patient records.</p>
                </div>
            </div>
        );
    }

    const displayInfo = matchedInfo || info;
    if (!displayInfo) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-600 via-red-500 to-orange-500 p-4 md:p-8">
            <div className="max-w-lg mx-auto">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-3">
                        <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                            <AlertTriangle className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight">EMERGENCY</h1>
                    <p className="text-red-100 text-sm mt-1">Medical Information — Critical Access Only</p>
                </div>

                {/* Patient Identity */}
                <div className="bg-white rounded-3xl p-6 mb-4 shadow-2xl">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center shrink-0">
                            <UserCircle className="w-9 h-9 text-red-500" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900">{displayInfo.patientName}</h2>
                            <p className="text-slate-500 font-mono text-sm">{displayInfo.healthId}</p>
                            {displayInfo.gender && <p className="text-slate-500 text-sm">{displayInfo.gender}{displayInfo.dateOfBirth ? ` • DOB: ${displayInfo.dateOfBirth}` : ""}</p>}
                        </div>
                    </div>
                    <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <Heart className="w-5 h-5 text-red-500" />
                            <span className="text-sm font-bold text-red-600 uppercase tracking-wider">Blood Group</span>
                        </div>
                        <p className="text-5xl font-black text-red-600">{displayInfo.bloodGroup}</p>
                    </div>
                </div>

                {/* Allergies */}
                <div className="bg-white rounded-3xl p-6 mb-4 shadow-2xl">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="bg-orange-100 p-2 rounded-xl"><Pill className="w-5 h-5 text-orange-600" /></div>
                        <h3 className="font-black text-slate-900 text-lg">Allergies</h3>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{displayInfo.allergies || "None recorded"}</p>
                </div>

                {/* Current Medications */}
                {displayInfo.currentMedications && (
                <div className="bg-white rounded-3xl p-6 mb-4 shadow-2xl">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="bg-blue-100 p-2 rounded-xl"><Pill className="w-5 h-5 text-blue-600" /></div>
                        <h3 className="font-black text-slate-900 text-lg">Current Medications</h3>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{displayInfo.currentMedications}</p>
                </div>
                )}

                {/* Chronic Conditions */}
                <div className="bg-white rounded-3xl p-6 mb-4 shadow-2xl">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="bg-purple-100 p-2 rounded-xl"><Shield className="w-5 h-5 text-purple-600" /></div>
                        <h3 className="font-black text-slate-900 text-lg">Chronic Conditions</h3>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{displayInfo.chronicDiseases || "None recorded"}</p>
                </div>

                {displayInfo.notes && (
                    <div className="bg-white rounded-3xl p-6 mb-4 shadow-2xl">
                        <h3 className="font-black text-slate-900 text-lg mb-2">Medical Notes</h3>
                        <p className="text-slate-700 leading-relaxed">{displayInfo.notes}</p>
                    </div>
                )}

                {(displayInfo.emergencyContactName || displayInfo.emergencyContactPhone) && (
                    <div className="bg-white rounded-3xl p-6 mb-8 shadow-2xl">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="bg-teal-100 p-2 rounded-xl"><Phone className="w-5 h-5 text-teal-600" /></div>
                            <h3 className="font-black text-slate-900 text-lg">Emergency Contact</h3>
                        </div>
                        {displayInfo.emergencyContactName && <p className="font-bold text-slate-900">{displayInfo.emergencyContactName}</p>}
                        {displayInfo.emergencyContactPhone && (
                            <a href={`tel:${displayInfo.emergencyContactPhone}`} className="flex items-center gap-2 mt-2 text-teal-600 font-bold text-lg hover:underline">
                                <Phone className="w-5 h-5" />{displayInfo.emergencyContactPhone}
                            </a>
                        )}
                    </div>
                )}

                <div className="flex flex-col items-center gap-4">
                    <Button 
                        onClick={() => setLocation("/patient/emergency")} 
                        variant="secondary" 
                        className="bg-white/10 hover:bg-white/20 text-white rounded-xl"
                    >
                        Back to Search
                    </Button>
                    <p className="text-center text-red-100 text-xs pb-8">
                        This page shows limited emergency information only. Full medical records require authentication.
                    </p>
                </div>
            </div>
        </div>
    );
}
