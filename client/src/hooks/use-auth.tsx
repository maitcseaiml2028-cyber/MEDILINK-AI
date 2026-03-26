import { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { api } from "@shared/routes";
import { UserWithProfile, LoginRequest, RegisterRequest } from "@shared/schema";

interface AuthContextType {
  user: UserWithProfile | null;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest & { faceData?: { imageBlob: Blob, faceDescriptor: number[] } }) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(localStorage.getItem("auth_token"));

  const { data: userData, isLoading } = useQuery({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      if (!token) return null;
      try {
        const res = await apiRequest("GET", api.auth.me.path);
        const data = await res.json();
        return data as UserWithProfile;
      } catch (err) {
        localStorage.removeItem("auth_token");
        setToken(null);
        return null;
      }
    },
    enabled: !!token,
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginRequest) => {
      const res = await apiRequest("POST", api.auth.login.path, data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.clear(); // Ensure no stale data from a previous session exists
      localStorage.setItem("auth_token", data.token);
      setToken(data.token);
      queryClient.setQueryData([api.auth.me.path], data.user);
      toast({ title: "Welcome back!" });
      redirectBasedOnRole(data.user.role);
    },
    onError: (error: Error) => {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterRequest & { faceData?: { imageBlob: Blob, faceDescriptor: number[] } }) => {
      const { faceData, ...registerPayload } = data;
      const res = await apiRequest("POST", api.auth.register.path, registerPayload);
      return { response: await res.json(), faceData };
    },
    onSuccess: async ({ response: data, faceData }) => {
      queryClient.clear(); // Ensure no stale data
      localStorage.setItem("auth_token", data.token);
      setToken(data.token);
      queryClient.setQueryData([api.auth.me.path], data.user);
      
      // Handle Face Verification upload seamlessly after auth is established
      if (faceData && data.user.role === "patient") {
        try {
          const formData = new FormData();
          formData.append("image", faceData.imageBlob, "face.jpg");
          formData.append("descriptor", JSON.stringify(faceData.faceDescriptor));
          
          await fetch("/api/patient/upload-face", {
            method: "POST",
            headers: { "Authorization": `Bearer ${data.token}` },
            body: formData
          });
          toast({ title: "Registration & Face Upload successful!" });
        } catch (err) {
          console.error("Face upload failed post-registration", err);
          toast({ title: "Registered, but face upload failed.", variant: "destructive" });
        }
      } else {
        toast({ title: "Registration successful!" });
      }
      
      redirectBasedOnRole(data.user.role);
    },
    onError: (error: Error) => {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    },
  });

  const redirectBasedOnRole = (role: string) => {
    if (role === "patient") setLocation("/patient/dashboard");
    else if (role === "doctor") setLocation("/doctor/dashboard");
    else if (role === "hospital") setLocation("/hospital/dashboard");
    else if (role === "admin") setLocation("/admin/dashboard");
    else setLocation("/patient/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    setToken(null);
    queryClient.setQueryData([api.auth.me.path], null);
    queryClient.clear(); // Clear entire cache to prevent data leak across users
    setLocation("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user: userData || null,
        isLoading,
        isAuthenticated: !!userData,
        login: async (data) => { await loginMutation.mutateAsync(data); },
        register: async (data) => { await registerMutation.mutateAsync(data); },
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
