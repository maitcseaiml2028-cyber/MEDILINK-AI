import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api, buildUrl } from "@shared/routes";
import { Appointment } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useAppointments() {
  return useQuery<Appointment[]>({
    queryKey: [api.appointments.list.path],
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", api.appointments.create.path, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.appointments.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/permissions"] });
      toast({ title: "Appointment booked successfully" });
    },
    onError: (err) => {
      toast({ title: "Failed to book appointment", description: err.message, variant: "destructive" });
    }
  });
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const url = buildUrl(api.appointments.updateStatus.path, { id });
      const res = await apiRequest("PATCH", url, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.appointments.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      queryClient.invalidateQueries({ queryKey: [api.records.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/permissions"] });
      toast({ title: "Appointment status updated" });
    },
    onError: (err) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    }
  });
}
