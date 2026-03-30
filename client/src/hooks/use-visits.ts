import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useVisits(patientId?: number) {
    return useQuery({
        queryKey: patientId ? ["/api/visits", { patientId }] : ["/api/visits"],
        queryFn: async () => {
            const path = patientId ? `/api/visits?patientId=${patientId}` : "/api/visits";
            const res = await apiRequest("GET", path);
            return res.json();
        },
        enabled: patientId !== undefined
    });
}

export function useHospitalVisits(hospitalId?: number) {
    return useQuery({
        queryKey: hospitalId ? ["/api/hospital-visits", hospitalId] : ["/api/hospital-visits"],
        queryFn: async () => {
            const res = await apiRequest("GET", `/api/hospital-visits/${hospitalId}`);
            return res.json();
        },
        enabled: !!hospitalId
    });
}

export function useCheckInVisit() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ tokenOrId, department, hospitalId }: { tokenOrId: string | number, department?: string, hospitalId?: number }) => {
            // Basic check-in endpoint assuming we scan a token or lookup by patient ID
            const res = await apiRequest("POST", "/api/visits/check-in", {
                token: typeof tokenOrId === 'string' ? tokenOrId : undefined,
                patientId: typeof tokenOrId === 'number' ? tokenOrId : undefined,
                department,
                hospitalId
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
            queryClient.invalidateQueries({ queryKey: ["/api/hospital-visits"] });
            queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
            toast({ title: "Check-in Successful", description: "The patient has been checked into the hospital." });
        },
        onError: (err) => {
            toast({ title: "Check-in Failed", description: err.message, variant: "destructive" });
        }
    });
}

export function useCheckOutVisit() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (visitId: number) => {
            const res = await apiRequest("POST", `/api/visits/${visitId}/check-out`);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
            queryClient.invalidateQueries({ queryKey: ["/api/hospital-visits"] });
            queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
            toast({ title: "Check-out Successful", description: "The patient visit has been concluded." });
        },
        onError: (err) => {
            toast({ title: "Check-out Failed", description: err.message, variant: "destructive" });
        }
    });
}
