import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Stethoscope, ShieldCheck, Clock, Zap, ArrowRight, FileText, Activity, Building2, User, HeartPulse, Star, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

const stats = [
  { value: "12,450+", label: "People getting care faster" },
  { value: "48", label: "Partner clinics live today" },
  { value: "< 2 min", label: "Average wait to book a doc" },
  { value: "100%", label: "Data encrypted & secure" },
];

const features = [
  {
    icon: Clock,
    title: "Instant Appointments",
    desc: "Book and manage appointments with specialists in seconds, not hours.",
    color: "from-blue-500 to-blue-600",
    bg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    icon: FileText,
    title: "Unified Medical Records",
    desc: "Access your complete health history — prescriptions, labs & reports — in one encrypted vault.",
    color: "from-teal-500 to-teal-600",
    bg: "bg-teal-50",
    iconColor: "text-teal-600",
  },
  {
    icon: Zap,
    title: "AI Health Assistant",
    desc: "Get intelligent summaries of complex medical reports and real-time health guidance.",
    color: "from-purple-500 to-purple-600",
    bg: "bg-purple-50",
    iconColor: "text-purple-600",
  },
];

const roles = [
  {
    icon: User,
    role: "Patient",
    desc: "Manage your health records, book appointments, and control who accesses your data.",
    href: "/register",
    color: "border-blue-200 hover:border-blue-400 hover:shadow-blue-100",
    iconBg: "bg-blue-100 text-blue-600",
    badge: "bg-blue-50 text-blue-700",
  },
  {
    icon: Building2,
    role: "Hospital",
    desc: "Streamline patient check-ins, manage departments, and access records instantly.",
    href: "/register?role=hospital",
    color: "border-teal-200 hover:border-teal-400 hover:shadow-teal-100",
    iconBg: "bg-teal-100 text-teal-600",
    badge: "bg-teal-50 text-teal-700",
  },
  {
    icon: HeartPulse,
    role: "Doctor",
    desc: "View patient histories, write prescriptions, and get AI-powered diagnostic support.",
    href: "/register?role=doctor",
    color: "border-purple-200 hover:border-purple-400 hover:shadow-purple-100",
    iconBg: "bg-purple-100 text-purple-600",
    badge: "bg-purple-50 text-purple-700",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] selection:bg-blue-100 selection:text-blue-900">

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between py-4">
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-br from-blue-600 to-violet-600 p-2 rounded-xl shadow-lg shadow-blue-500/25">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-slate-900">MEDLINK <span className="text-blue-600">AI</span></span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:block text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors px-4 py-2 rounded-lg hover:bg-blue-50">
              Sign In
            </Link>
            <Link href="/register">
              <Button className="rounded-xl px-5 bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-700 hover:to-violet-700 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-300 text-sm font-semibold">
                Get Started Free →
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="pt-28 pb-24 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-60" />
          <div className="absolute top-60 -left-40 w-96 h-96 bg-violet-100 rounded-full blur-3xl opacity-40" />
          <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-teal-100 rounded-full blur-3xl opacity-50" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm font-semibold mb-8 animate-fade-in shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Now rolling out to beta users in India
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-extrabold text-slate-900 leading-[1.07] mb-6 tracking-tight">
              Finally, healthcare that{" "}
              <span className="relative">
                <span className="gradient-text">actually works</span>
                <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 400 8" fill="none">
                  <path d="M0 4 Q100 8 200 4 Q300 0 400 4" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.4" />
                </svg>
              </span>{" "}for you.
            </h1>

            <p className="text-lg md:text-xl text-slate-500 mb-10 leading-relaxed max-w-2xl mx-auto">
              Skip the waiting room. Book top doctors instantly, manage your medical history securely, and get AI-powered health insights — all before you even step foot in the clinic.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="rounded-2xl h-14 px-10 text-base bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white shadow-xl shadow-blue-500/25 hover:-translate-y-0.5 transition-all duration-300 font-semibold group">
                  Join as a Patient
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="rounded-2xl h-14 px-10 text-base border-2 border-slate-200 text-slate-700 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300 font-semibold">
                  Sign in to Dashboard
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto mb-20"
          >
            {stats.map((s, i) => (
              <div key={i} className="text-center py-5 px-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <p className="font-display font-extrabold text-2xl md:text-3xl gradient-text">{s.value}</p>
                <p className="text-xs text-slate-500 mt-1 font-medium">{s.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Dashboard Preview Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative max-w-5xl mx-auto"
          >
            <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-blue-900/20 border border-slate-200/80">
              <div className="bg-gradient-to-br from-slate-900 to-blue-950 p-2 rounded-3xl">
                <div className="bg-gradient-to-br from-blue-600/20 to-violet-600/20 rounded-2xl overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1400&q=90&fit=crop"
                    alt="MEDLINK AI Healthcare Platform"
                    className="w-full h-auto object-cover opacity-90 hover:scale-[1.02] transition-transform duration-700"
                  />
                </div>
              </div>
              {/* Floating badge */}
              <div className="absolute bottom-6 left-6 glass rounded-2xl px-4 py-3 flex items-center gap-3 animate-float">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">HIPAA Compliant</p>
                  <p className="text-xs text-slate-500">End-to-end encrypted</p>
                </div>
              </div>
              <div className="absolute top-6 right-6 glass rounded-2xl px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Live Patients</p>
                  <p className="font-bold text-slate-900 text-sm">1,247 Active</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Features */}
      <section className="bg-white py-24 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-blue-600 font-semibold text-sm uppercase tracking-widest mb-3">Why Medlink?</p>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-4">Less paperwork. More actual care.</h2>
            <p className="text-slate-500 text-lg">We've rebuilt the entire clinic experience so you never have to fill out the same clipboard form twice.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="group p-8 rounded-3xl bg-slate-50 hover:bg-white border border-slate-100 hover:border-blue-100 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300"
              >
                <div className={`w-14 h-14 ${f.bg} ${f.iconColor} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <f.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{f.title}</h3>
                <p className="text-slate-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Who is it for */}
      <section className="py-24 bg-gradient-to-br from-slate-900 to-blue-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-blue-300 font-semibold text-sm uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">A unified network for everyone</h2>
            <p className="text-slate-400 text-lg">Whether you're a patient, a doctor, or running a clinic — there's a portal built specifically for your workflow.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {roles.map((r, i) => (
              <Link key={i} href={r.href}>
                <div className={`group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-400/40 rounded-3xl p-8 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10`}>
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <r.icon className="w-7 h-7 text-blue-300" />
                  </div>
                  <div className="inline-block px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold mb-3 uppercase tracking-wider">{r.role}</div>
                  <h3 className="text-xl font-bold text-white mb-3">{r.role} Portal</h3>
                  <p className="text-slate-400 leading-relaxed text-sm mb-6">{r.desc}</p>
                  <div className="flex items-center text-blue-300 text-sm font-semibold group-hover:gap-3 gap-2 transition-all">
                    Register as {r.role} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="bg-white py-20 border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-sm font-semibold mb-6 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
             Registration is currently open
          </div>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-slate-900 mb-6 tracking-tight">Take control of your health today.</h2>
          <p className="text-slate-500 text-lg mb-10 max-w-xl mx-auto">Join the 12,000+ people who've already ditched the waiting room and upgraded their healthcare experience.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="rounded-2xl h-14 px-10 text-base bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white shadow-xl shadow-blue-500/25 hover:-translate-y-0.5 transition-all font-semibold">
                Create Free Account →
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="rounded-2xl h-14 px-10 text-base border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-600 transition-all font-semibold">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-blue-600 to-violet-600 p-1.5 rounded-lg">
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-white text-sm">MEDLINK AI</span>
          </div>
          <p className="text-xs">© 2025 MEDLINK AI. Built for better healthcare.</p>
          <div className="flex items-center gap-1">
            {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
            <span className="text-xs ml-1">4.9/5 rating</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
