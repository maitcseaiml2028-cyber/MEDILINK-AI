import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { MedicalRecord } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useRecords(patientId?: number) {
  const url = patientId 
    ? `${api.records.list.path}?patientId=${patientId}` 
    : api.records.list.path;
    
  return useQuery<MedicalRecord[]>({
    queryKey: [api.records.list.path, patientId],
    queryFn: async () => {
      const res = await apiRequest("GET", url);
      return res.json();
    }
  });
}

export function useCreateRecord() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", api.records.create.path, data);
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.records.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.records.list.path, variables.patientId] });
      toast({ title: "Record uploaded successfully" });
    },
    onError: (err) => {
      toast({ title: "Failed to upload record", description: err.message, variant: "destructive" });
    }
  });
}
