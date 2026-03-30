import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { AlertTriangle, UserCircle, FileText, Pill, Save, CheckCircle, Search, ScanFace, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { TemporaryEmergencyRecord, Patient } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function TempTreatmentWorkspace() {
  const { tempId } = useParams<{ tempId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [notes, setNotes] = useState("");
  const [prescriptions, setPrescriptions] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const [patientHealthId, setPatientHealthId] = useState("");

  // Queries
  const { data: records, isLoading } = useQuery<TemporaryEmergencyRecord[]>({
    queryKey: ["/api/emergency/temp-records"],
  });

  const record = records?.find(r => r.tempId === tempId);

  // Auto-populate form
  useState(() => {
    if (record) {
      if (!notes && record.notes) setNotes(record.notes);
      if (!prescriptions && record.prescriptions) setPrescriptions(record.prescriptions);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { notes: string; prescriptions: string }) => {
      const res = await apiRequest("POST", `/api/emergency/add-treatment/${tempId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emergency/temp-records"] });
      toast({ title: "Saved", description: "Treatment notes successfully saved to temporary record." });
    },
    onError: (e: Error) => toast({ title: "Failed to save", description: e.message, variant: "destructive" })
  });

  const linkMutation = useMutation({
    mutationFn: async (patientId: number) => {
      const res = await apiRequest("POST", "/api/emergency/link-to-patient", { tempId, patientId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emergency/temp-records"] });
      setIsLinking(false);
      toast({ title: "Success", description: "Record safely linked to verified patient. Redirecting..." });
      setLocation("/hospital/dashboard");
    },
    onError: (e: Error) => toast({ title: "Link Failed", description: e.message, variant: "destructive" })
  });

  // Verify Identity using Health ID manually
  const verifyIdentity = async () => {
    if (!patientHealthId.trim()) return toast({title: "Error", description: "Enter a valid Health ID", variant:"destructive"});
    try {
      const res = await apiRequest("GET", `/api/patients/${patientHealthId}`);
      const pt = await res.json();
      
      if (pt && pt.id) {
        linkMutation.mutate(pt.id);
      } else {
         toast({ title: "Identity Error", description: "Could not resolve an internal Patient ID for this Health ID. Try another.", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Not Found", description: "Health ID invalid or patient doesn't exist.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-[50vh]"><div className="animate-spin w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full" /></div>
      </AppLayout>
    );
  }

  if (!record) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <AlertTriangle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900">Record Not Found</h2>
          <p className="text-slate-500">This temporary record does not exist or has already been linked.</p>
          <Button onClick={() => setLocation("/hospital/emergency-sessions")} className="mt-4">Back to Sessions</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" className="text-slate-500 -ml-2" onClick={() => setLocation("/hospital/emergency-treatment")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Emergency Sessions
        </Button>

        <div className="flex items-start justify-between bg-white p-6 rounded-2xl border border-red-100 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Unverified Patient
              </span>
              <span className="text-sm font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                ID: {record.tempId}
              </span>
            </div>
            <h1 className="text-3xl font-black text-slate-900">Emergency Treatment</h1>
            <p className="text-slate-500 mt-1 max-w-xl text-sm">
              Record life-saving notes and immediate prescriptions here. 
              Once the patient is stable and their identity is verified, you can securely merge this temporary file with their permanent medical timeline.
            </p>
          </div>
          <Button 
            size="lg" 
            className="bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg shadow-green-600/20"
            onClick={() => setIsLinking(true)}
          >
            <CheckCircle className="w-5 h-5 mr-2" /> Verify & Link Patient
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <FileText className="w-5 h-5 text-blue-500" /> Clinical Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observed symptoms, vital signs, immediate actions taken..."
                className="min-h-[250px] resize-y bg-slate-50/50"
              />
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <Pill className="w-5 h-5 text-orange-500" /> Temporary Prescriptions & Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea 
                value={prescriptions} 
                onChange={(e) => setPrescriptions(e.target.value)}
                placeholder="e.g. 10ml Epinephrine administered IV, oxygen mask attached..."
                className="min-h-[250px] resize-y bg-slate-50/50"
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button 
            size="lg" 
            onClick={() => updateMutation.mutate({ notes, prescriptions })}
            disabled={updateMutation.isPending}
            className="bg-slate-900 text-white hover:bg-slate-800"
          >
            <Save className="w-5 h-5 mr-2" /> {updateMutation.isPending ? "Saving..." : "Save Progress to File"}
          </Button>
        </div>
      </div>

      <Dialog open={isLinking} onOpenChange={setIsLinking}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verify Patient Identity</DialogTitle>
            <DialogDescription>
              Provide the patient's Health ID to permanently merge this emergency record.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Health ID</label>
              <div className="relative">
                <Input 
                  placeholder="e.g. MED12345" 
                  value={patientHealthId}
                  onChange={(e) => setPatientHealthId(e.target.value)}
                  className="pl-10 h-12"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              </div>
            </div>

            <Button 
              className="w-full h-12 text-lg font-bold" 
              onClick={verifyIdentity}
              disabled={linkMutation.isPending}
            >
              {linkMutation.isPending ? "Linking..." : "Verify & Permanently Link Data"}
            </Button>
            
            <p className="text-xs text-center text-slate-500">
              Biometric face scan linkage can be triggered from the main Emergency overlay UI.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
