import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { useState } from "react";
import { useLocation } from "wouter";
import { AlertTriangle, Plus, Clock, FileText, ArrowRight, ShieldAlert, UserPlus, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { TemporaryEmergencyRecord } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function EmergencySessions() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch active unlinked emergency records
  const { data: records, isLoading } = useQuery<TemporaryEmergencyRecord[]>({
    queryKey: ["/api/emergency/temp-records"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/emergency/create-temp", {});
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/emergency/temp-records"] });
      setLocation(`/hospital/emergency-treatment/${data.tempId}`);
      toast({ title: "Temporary Session Created", description: `Started recording for ${data.tempId}` });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to Start", description: error.message, variant: "destructive" });
    }
  });

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-red-500" /> Emergency Mode
            </h1>
            <p className="text-slate-500 mt-1">Manage unverified patient treatments and secure linkages</p>
          </div>
          <Button 
            onClick={() => createMutation.mutate()} 
            disabled={createMutation.isPending}
            size="lg" 
            className="bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-600/20 font-bold"
          >
            {createMutation.isPending ? "Creating..." : <><Plus className="w-5 h-5 mr-2" /> Start New Emergency Context</>}
          </Button>
        </div>

        {isLoading ? (
          <div className="py-20 flex justify-center">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin" />
          </div>
        ) : !records || records.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Active Emergencies</h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              You have no pending unresolved anonymous emergency treatments. Click the button above to start a new tracking session if a patient arrives without ID.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {records.map((record) => (
              <Card key={record.tempId} className="border-red-100 shadow-lg shadow-red-900/5 transition-all hover:-translate-y-1 hover:shadow-xl">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      {record.status}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center">
                      <Clock className="w-3 h-3 mr-1" /> {new Date(record.createdAt!).toLocaleTimeString()}
                    </span>
                  </div>
                  <CardTitle className="text-xl font-black font-mono text-slate-800">{record.tempId}</CardTitle>
                  <CardDescription className="text-slate-500 text-sm overflow-hidden text-ellipsis whitespace-nowrap">
                    {record.notes ? record.notes : "No clinical notes yet."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="outline"
                    className="w-full justify-between group border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-700 hover:text-red-700 font-bold"
                    onClick={() => setLocation(`/hospital/emergency-treatment/${record.tempId}`)}
                  >
                    Resume Treatment
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-red-600 transition-colors" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
