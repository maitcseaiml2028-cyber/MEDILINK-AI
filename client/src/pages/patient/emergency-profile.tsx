import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Heart, Activity, AlertCircle, Phone, Pill, BookOpen } from "lucide-react";

export default function PatientEmergencyProfile() {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);

    const { data: profile, isLoading } = useQuery({
        queryKey: [`/api/patient/emergency/${user?.patient?.healthId}`],
        queryFn: async () => {
            if (!user?.patient?.healthId) return null;
            const res = await apiRequest("GET", `/api/patient/emergency/${user.patient.healthId}`);
            if (!res.ok) {
                if (res.status === 404) return null;
                throw new Error("Failed to fetch");
            }
            return res.json();
        },
        enabled: !!user?.patient?.healthId,
    });

    const hasProfile = profile && profile.bloodGroup;

    const [formData, setFormData] = useState({
        bloodGroup: "",
        allergies: "",
        chronicDiseases: "",
        currentMedications: "",
        emergencyContactName: "",
        emergencyContactPhone: "",
        notes: "",
    });

    // Sync form data when editing starts
    const startEditing = () => {
        if (profile) {
            setFormData({
                bloodGroup: profile.bloodGroup || "",
                allergies: profile.allergies || "",
                chronicDiseases: profile.chronicDiseases || "",
                currentMedications: profile.currentMedications || "",
                emergencyContactName: profile.emergencyContactName || "",
                emergencyContactPhone: profile.emergencyContactPhone || "",
                notes: profile.notes || "",
            });
        }
        setIsEditing(true);
    };

    const saveMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const res = await apiRequest("POST", "/api/patient/emergency", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/patient/emergency/${user?.patient?.healthId}`] });
            setIsEditing(false);
            toast({ title: "Success", description: "Emergency profile saved successfully." });
        },
        onError: () => {
            toast({ title: "Error", description: "Failed to save emergency profile.", variant: "destructive" });
        }
    });

    if (isLoading) return <AppLayout><div className="animate-pulse p-8 text-center">Loading...</div></AppLayout>;

    return (
        <AppLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                    <Heart className="w-8 h-8 text-red-500" />
                    Emergency Profile
                </h1>
                <p className="text-slate-500 mt-1">This information will be accessible to doctors during emergencies.</p>
            </div>

            {!hasProfile && !isEditing ? (
                <Card className="rounded-3xl border border-red-100 shadow-md bg-red-50 text-center py-10">
                    <CardContent>
                        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-red-700 mb-2">No Emergency Profile Found</h2>
                        <p className="text-slate-600 mb-6 max-w-md mx-auto">
                            Creating an emergency profile is critical. It allows doctors and first responders to access your blood group, allergies, and emergency contacts instantly.
                        </p>
                        <Button onClick={() => setIsEditing(true)} className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-8">
                            Add Emergency Profile
                        </Button>
                    </CardContent>
                </Card>
            ) : isEditing ? (
                <Card className="rounded-3xl shadow-lg border-0">
                    <CardContent className="p-8 space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Blood Group</label>
                                <Input value={formData.bloodGroup} onChange={e => setFormData({ ...formData, bloodGroup: e.target.value })} placeholder="e.g. O+ or A-" className="rounded-xl h-12" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Allergies</label>
                                <Input value={formData.allergies} onChange={e => setFormData({ ...formData, allergies: e.target.value })} placeholder="e.g. Peanuts, Penicillin" className="rounded-xl h-12" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Chronic Diseases</label>
                                <Input value={formData.chronicDiseases} onChange={e => setFormData({ ...formData, chronicDiseases: e.target.value })} placeholder="e.g. Asthma, Diabetes Types 1" className="rounded-xl h-12" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Current Medications</label>
                                <Input value={formData.currentMedications} onChange={e => setFormData({ ...formData, currentMedications: e.target.value })} placeholder="e.g. Inhaler, Insulin" className="rounded-xl h-12" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Emergency Contact Name</label>
                                <Input value={formData.emergencyContactName} onChange={e => setFormData({ ...formData, emergencyContactName: e.target.value })} placeholder="Name of your contact" className="rounded-xl h-12" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Emergency Contact Phone</label>
                                <Input value={formData.emergencyContactPhone} onChange={e => setFormData({ ...formData, emergencyContactPhone: e.target.value })} placeholder="Phone number" type="tel" className="rounded-xl h-12" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Additional Notes</label>
                            <Textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Any other critical medical information..." className="rounded-xl min-h-[100px]" />
                        </div>
                        <div className="flex gap-4 pt-4">
                            <Button
                                onClick={() => saveMutation.mutate(formData)}
                                disabled={saveMutation.isPending}
                                className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-8 h-12 flex-1 md:flex-none"
                            >
                                {saveMutation.isPending ? "Saving..." : "Save Profile"}
                            </Button>
                            {hasProfile && (
                                <Button variant="outline" onClick={() => setIsEditing(false)} className="rounded-xl px-8 h-12">Cancel</Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    <Card className="rounded-3xl border-0 shadow-lg border-t-4 border-t-red-500 overflow-hidden">
                        <CardContent className="p-0">
                            <div className="grid md:grid-cols-2">
                                <div className="p-8 border-b md:border-b-0 md:border-r border-slate-100 bg-red-50/30">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
                                            <Activity className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-500 uppercase">Blood Group</p>
                                            <p className="text-4xl font-black text-red-600">{profile.bloodGroup || "Not specified"}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-1"><AlertCircle className="w-3 h-3" /> Allergies</p>
                                            <p className="text-slate-800 font-semibold">{profile.allergies || "None declared"}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-1"><BookOpen className="w-3 h-3" /> Chronic Diseases</p>
                                            <p className="text-slate-800 font-semibold">{profile.chronicDiseases || "None"}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-1"><Pill className="w-3 h-3" /> Current Medications</p>
                                            <p className="text-slate-800 font-semibold">{profile.currentMedications || "None"}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-8 space-y-6">
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Phone className="w-5 h-5 text-teal-600" />
                                            <h3 className="font-bold text-slate-800">Emergency Contact</h3>
                                        </div>
                                        <p className="text-xl font-bold text-slate-900">{profile.emergencyContactName || "Not specified"}</p>
                                        {profile.emergencyContactPhone && (
                                            <p className="text-teal-600 font-bold mt-1 text-lg">{profile.emergencyContactPhone}</p>
                                        )}
                                    </div>
                                    {profile.notes && (
                                        <div className="bg-slate-50 p-4 rounded-2xl">
                                            <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">Notes</p>
                                            <p className="text-slate-700 text-sm whitespace-pre-wrap">{profile.notes}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex gap-4">
                        <Button onClick={startEditing} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-12 px-8">
                            Update Emergency Profile
                        </Button>
                        <Button variant="outline" onClick={startEditing} className="rounded-xl h-12 px-8 border-slate-200">
                            Edit
                        </Button>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
