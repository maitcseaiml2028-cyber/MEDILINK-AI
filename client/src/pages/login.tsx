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
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Stethoscope, Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";

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
      setResetUsername(""); setResetEmail(""); setResetPassword(""); setResetConfirm("");
    },
    onError: (err: Error) => toast({ title: "Reset Failed", description: err.message, variant: "destructive" })
  });

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (resetPassword !== resetConfirm) return toast({ title: "Passwords do not match", variant: "destructive" });
    resetPasswordMutation.mutate({ username: resetUsername, email: resetEmail, newPassword: resetPassword });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try { await login({ username, password }); }
    finally { setLoading(false); }
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

  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen flex bg-white">

      {/* ── Left: Real Photo Panel ─────────────────────────── */}
      <div className="hidden lg:block lg:w-[52%] relative overflow-hidden">
        {/* Real photo */}
        <img
          src="https://images.unsplash.com/photo-1559757175-5700dde675bc?w=1200&q=85&fit=crop&crop=center"
          alt="Healthcare professionals"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Dark gradient overlay — for text legibility */}
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to right, rgba(3,7,18,0.72) 0%, rgba(3,7,18,0.4) 60%, transparent 100%)" }}
        />

        {/* Content over photo */}
        <div className="relative z-10 h-full flex flex-col justify-between p-10">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 w-fit group">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm flex items-center justify-center">
              <Stethoscope className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">
              MedLink<span className="text-sky-300">AI</span>
            </span>
          </Link>

          {/* Center headline */}
          <div className="max-w-sm">
            <div className="inline-flex items-center gap-2 bg-sky-500/20 border border-sky-400/30 text-sky-200 text-xs font-semibold px-3 py-1.5 rounded-full mb-5 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-300 animate-pulse inline-block" />
              Now serving 12,000+ patients across India
            </div>
            <h2 className="text-4xl font-black text-white leading-tight tracking-tight mb-4">
              Your health,<br />under control.
            </h2>
            <p className="text-white/60 text-sm leading-relaxed">
              Connect with verified doctors, access your complete medical history, and get AI-powered insights — all in one secure platform.
            </p>
          </div>

          {/* Bottom trust bar */}
          <div className="flex items-center gap-6">
            {[
              { num: "500+", label: "Hospitals" },
              { num: "2,800+", label: "Doctors" },
              { num: "99.9%", label: "Uptime" },
            ].map((s, i) => (
              <div key={i} className="text-center border-r border-white/15 pr-6 last:border-0 last:pr-0">
                <p className="text-white font-black text-2xl tracking-tight">{s.num}</p>
                <p className="text-white/45 text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: Form Panel (pure white) ───────────────────── */}
      <div className="flex-1 bg-white flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-[360px]">

          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 rounded-lg bg-sky-600 flex items-center justify-center">
              <Stethoscope className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900">MedLink<span className="text-sky-600">AI</span></span>
          </Link>

          <Link href="/" className="inline-flex items-center text-sm text-slate-400 hover:text-slate-600 mb-7 transition-colors gap-1 group">
            <span className="group-hover:-translate-x-0.5 transition-transform inline-block">←</span> Back to home
          </Link>

          <div className="mb-7">
            <h1 className="text-[26px] font-black text-slate-900 tracking-tight leading-tight">Sign in to MedLink</h1>
            <p className="text-slate-500 text-sm mt-1">Enter your credentials to access your dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email or Username</label>
              <Input
                required type="text" value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11 rounded-lg border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus-visible:ring-sky-500 focus-visible:bg-white transition-colors"
                placeholder="patient@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-slate-700">Password</label>
                <button type="button" onClick={() => setForgotOpen(true)}
                  className="text-xs font-semibold text-sky-600 hover:text-sky-700 transition-colors">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"} required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-lg border-slate-200 bg-slate-50 text-slate-900 pr-11 focus-visible:ring-sky-500 focus-visible:bg-white transition-colors"
                  placeholder="••••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading}
              className="w-full h-11 rounded-lg font-semibold text-sm text-white bg-sky-600 hover:bg-sky-700 transition-colors mt-1 shadow-sm">
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-1.5 justify-center">
                  Sign In <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              Don't have an account?{" "}
              <Link href="/register" className="font-semibold text-sky-600 hover:text-sky-700">
                Create one free
              </Link>
            </p>
          </div>

          <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
            Secured with 256-bit AES encryption
          </div>
        </div>
      </div>

      {/* Reset Dialog */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl shadow-xl border border-slate-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Reset Password</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Verify your identity, then set a new password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetSubmit} className="space-y-4 mt-1">
            {[
              { label: "Username", val: resetUsername, set: setResetUsername, type: "text" },
              { label: "Email Address", val: resetEmail, set: setResetEmail, type: "email" },
              { label: "New Password", val: resetPassword, set: setResetPassword, type: "password" },
              { label: "Confirm Password", val: resetConfirm, set: setResetConfirm, type: "password" },
            ].map(({ label, val, set, type }) => (
              <div key={label}>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
                <Input type={type} required value={val} onChange={e => set(e.target.value)}
                  className="h-10 rounded-lg border-slate-200 bg-slate-50" />
              </div>
            ))}
            <Button type="submit" disabled={resetPasswordMutation.isPending}
              className="w-full h-10 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm">
              {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
