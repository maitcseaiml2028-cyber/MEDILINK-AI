import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Stethoscope, Eye, EyeOff, ShieldCheck, Activity, HeartPulse, ArrowRight } from "lucide-react";

const FEATURES = [
  { icon: ShieldCheck, text: "HIPAA-compliant encrypted data" },
  { icon: Activity, text: "Real-time health monitoring" },
  { icon: HeartPulse, text: "AI-powered health insights" },
];

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const [_, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetUsername, setResetUsername] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", api.auth.resetPassword.path, data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Success", description: data.message });
      setForgotOpen(false);
      setResetUsername("");
      setResetEmail("");
      setResetPassword("");
      setResetConfirm("");
    },
    onError: (err: Error) => toast({ title: "Reset Failed", description: err.message, variant: "destructive" })
  });

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (resetPassword !== resetConfirm) {
      return toast({ title: "Passwords do not match", variant: "destructive" });
    }
    resetPasswordMutation.mutate({ username: resetUsername, email: resetEmail, newPassword: resetPassword });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ username, password });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === "patient") setLocation("/patient/dashboard");
      else if (user.role === "doctor") setLocation("/doctor/dashboard");
      else if (user.role === "hospital") setLocation("/hospital/dashboard");
      else if (user.role === "admin") setLocation("/admin/dashboard");
      else setLocation("/patient/dashboard");
    }
  }, [isAuthenticated, user, setLocation]);

  if (isAuthenticated) {
    return null; // Prevents flashing the login screen while redirecting
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-700 via-blue-800 to-violet-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/5 rounded-full" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-blue-400/10 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-violet-500/5 rounded-full" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="bg-white/15 backdrop-blur p-2.5 rounded-xl border border-white/20">
            <Stethoscope className="w-6 h-6 text-white" />
          </div>
          <span className="font-display font-bold text-white text-2xl tracking-tight">MEDLINK <span className="text-blue-200">AI</span></span>
        </div>

        {/* Center content */}
        <div className="relative z-10">
          <h2 className="font-display font-extrabold text-4xl text-white mb-4 leading-tight">
            Healthcare that<br />actually works
          </h2>
          <p className="text-blue-200 text-base leading-relaxed mb-10 max-w-xs">
            Skip the paperwork. Access your medical history, connect with top doctors, and take control of your health instantly.
          </p>
          <div className="space-y-4">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
                  <f.icon className="w-4 h-4 text-blue-200" />
                </div>
                <span className="text-blue-100 text-sm font-medium">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stats */}
        <div className="grid grid-cols-3 gap-4 relative z-10">
          {[
            { value: "10K+", label: "Patients" },
            { value: "500+", label: "Hospitals" },
            { value: "99.9%", label: "Uptime" },
          ].map((s, i) => (
            <div key={i} className="bg-white/10 rounded-2xl p-4 border border-white/10 text-center">
              <p className="font-display font-bold text-white text-2xl">{s.value}</p>
              <p className="text-blue-300 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center bg-[#f8fafc] px-6 py-12">
        <div className="w-full max-w-md animate-fade-in-up">
          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="bg-gradient-to-br from-blue-600 to-violet-600 p-2 rounded-xl">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl text-slate-900">MEDLINK <span className="text-blue-600">AI</span></span>
          </Link>

          <div className="mb-8">
            <h1 className="font-display font-bold text-3xl text-slate-900 mb-2 mt-2">Welcome back</h1>
            <p className="text-slate-500">Securely access your unified dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email or Username</label>
              <Input
                required
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-12 rounded-xl bg-white border-slate-200 shadow-sm focus-visible:ring-blue-500 focus-visible:border-blue-500 text-slate-900 placeholder:text-slate-400"
                placeholder="e.g. doctor@gmail.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl bg-white border-slate-200 shadow-sm focus-visible:ring-blue-500 focus-visible:border-blue-500 pr-12 text-slate-900 placeholder:text-slate-400"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 transition-all duration-300 hover:-translate-y-0.5 group"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign In <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500">
              Don't have an account?{" "}
              <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-500 transition-colors">
                Create one free →
              </Link>
            </p>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
              </span>
              System Status: All systems operational
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Secure 256-bit AES encrypted connection</span>
          </div>

          <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
            <DialogContent className="sm:max-w-md w-full bg-slate-50 border border-slate-200">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Reset Password</DialogTitle>
                <DialogDescription>
                  Enter your username and email to verify your identity, then set a new password.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleResetSubmit} className="space-y-4 mt-2">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Username</label>
                  <Input required value={resetUsername} onChange={e => setResetUsername(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email Address</label>
                  <Input type="email" required value={resetEmail} onChange={e => setResetEmail(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">New Password</label>
                  <Input type="password" required value={resetPassword} onChange={e => setResetPassword(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Confirm New Password</label>
                  <Input type="password" required value={resetConfirm} onChange={e => setResetConfirm(e.target.value)} className="mt-1" />
                </div>

                <Button type="submit" disabled={resetPasswordMutation.isPending} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11">
                  {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
