import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";

export function useAiSummary() {
  return useMutation({
    mutationFn: async (patientId: number) => {
      const res = await apiRequest("POST", api.ai.summary.path, { patientId });
      return res.json();
    }
  });
}

export function useAiChat() {
  return useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", api.ai.chat.path, { message });
      return res.json();
    }
  });
}
