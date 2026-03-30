import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api, buildUrl } from "@shared/routes";

export function useSearchPatient(healthId: string) {
  return useQuery({
    queryKey: [api.patients.get.path, healthId],
    queryFn: async () => {
      if (!healthId) return null;
      try {
        const url = buildUrl(api.patients.get.path, { healthId });
        const res = await apiRequest("GET", url);
        return res.json();
      } catch (e) {
        return null; // Return null if not found instead of throwing error
      }
    },
    enabled: !!healthId && healthId.length > 3,
    retry: false
  });
}
