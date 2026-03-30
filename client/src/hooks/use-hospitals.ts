import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";

export function useHospitals() {
  return useQuery({
    queryKey: [api.hospitals.list.path],
    queryFn: async () => {
      const res = await apiRequest("GET", api.hospitals.list.path);
      return res.json();
    }
  });
}
