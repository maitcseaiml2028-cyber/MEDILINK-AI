import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Stethoscope, ShieldCheck, ArrowRight, Activity,
  FilePlus2, BrainCircuit, CalendarCheck2, Lock,
  HeartPulse, Building2, User2
} from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage() {
  return (
    <div className="min-h-screen font-sans overflow-x-hidden" style={{ background: "linear-gradient(160deg, #f0f4ff 0%, #faf5ff 50%, #f0fdf4 100%)" }}>

      {/* ── Navbar ──────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#0a0a0a] rounded-lg flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-[#0a0a0a]">
              MedLink<span className="text-[#2563eb]">AI</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">Features</a>
            <a href="#who" className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">Who it's for</a>
            <Link href="/login" className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">Sign in</Link>
          </div>
          <Link href="/register">
            <Button className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold px-5 py-2 rounded-lg shadow-none">
              Get started →
            </Button>
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="pt-32 pb-0 relative">
        {/* Thin accent line top */}
        <div className="absolute top-16 left-0 w-full h-px bg-neutral-100" />

        <div className="max-w-7xl mx-auto px-6">

          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-2 mb-10"
          >
            <div className="flex items-center gap-1.5 bg-[#eff6ff] text-[#2563eb] text-xs font-bold px-3 py-1.5 rounded-full border border-[#bfdbfe]">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#2563eb] animate-pulse" />
              Beta · India Launch 2025
            </div>
            <div className="h-px flex-1 bg-neutral-100 max-w-[200px]" />
          </motion.div>

          {/* Headline — split into two styles */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="mb-8"
          >
            <h1 className="text-[clamp(3rem,8vw,6rem)] font-black leading-[0.95] tracking-[-0.03em] text-[#0a0a0a] mb-2">
              Your health.
            </h1>
            <h1 className="text-[clamp(3rem,8vw,6rem)] font-black leading-[0.95] tracking-[-0.03em]">
              <span className="text-[#2563eb]">Your records.</span>
            </h1>
            <h1 className="text-[clamp(3rem,8vw,6rem)] font-black leading-[0.95] tracking-[-0.03em] text-[#0a0a0a]">
              One platform.
            </h1>
          </motion.div>

          {/* Subtext + CTA side-by-side */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex flex-col lg:flex-row gap-10 items-start lg:items-end mb-20"
          >
            <p className="text-neutral-500 text-lg leading-relaxed max-w-md">
              MedLink AI connects patients, doctors, and hospitals — giving you instant access to appointments, unified health records, and AI-powered insights, all in one place.
            </p>
            <div className="flex gap-3 shrink-0">
              <Link href="/register">
                <Button size="lg" className="h-12 px-8 bg-[#0a0a0a] hover:bg-neutral-800 text-white font-semibold rounded-xl text-sm gap-2 shadow-none">
                  Join for free <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="h-12 px-8 border-2 border-neutral-200 text-neutral-700 font-semibold rounded-xl text-sm hover:border-neutral-400 shadow-none">
                  Sign in
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Stats bar — editorial horizontal strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="border-t border-neutral-100 grid grid-cols-2 md:grid-cols-4 divide-x divide-neutral-100"
          >
            {[
              { n: "12,450+", label: "Patients served" },
              { n: "48", label: "Partner hospitals" },
              { n: "< 2 min", label: "Avg. booking time" },
              { n: "256-bit", label: "AES encryption" },
            ].map((s, i) => (
              <div key={i} className="py-8 px-6 first:pl-0">
                <p className="text-3xl font-black tracking-tight text-[#0a0a0a] mb-1">{s.n}</p>
                <p className="text-xs text-neutral-400 font-medium uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Full-width hero image strip */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="relative mt-16 overflow-hidden"
          style={{ height: "420px" }}
        >
          {/* Gradient left overlay so it feels editorial */}
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/10 to-transparent z-10 w-1/4" />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10" />

          <img
            src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1600&q=90&fit=crop"
            alt="MedLink AI Platform"
            className="w-full h-full object-cover object-top"
          />

          {/* Floating card overlays */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7, duration: 0.4 }}
            className="absolute bottom-12 left-[6%] z-20 bg-white rounded-2xl border border-neutral-200 p-4 shadow-xl flex items-center gap-4"
          >
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-bold text-sm text-neutral-900">HIPAA Compliant</p>
              <p className="text-xs text-neutral-400">End-to-end encrypted</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8, duration: 0.4 }}
            className="absolute top-10 right-[6%] z-20 bg-white rounded-2xl border border-neutral-200 p-4 shadow-xl flex items-center gap-4"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-neutral-400">Live right now</p>
              <p className="font-bold text-sm text-neutral-900">1,247 active sessions</p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section id="features" className="py-28 bg-[#fafafa]">
        <div className="max-w-7xl mx-auto px-6">

          {/* Section label */}
          <div className="flex items-center gap-4 mb-16">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">What we built</p>
            <div className="h-px flex-1 bg-neutral-200" />
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-neutral-200 rounded-2xl overflow-hidden border border-neutral-200">
            {[
              {
                icon: CalendarCheck2,
                title: "Instant Appointments",
                desc: "Book verified specialists in under 2 minutes. No phone calls, no waiting rooms, no wasted mornings.",
                tag: "Booking",
                color: "bg-blue-50 text-blue-600",
              },
              {
                icon: FilePlus2,
                title: "Unified Health Records",
                desc: "Every prescription, lab result, and report in one encrypted vault. Always accessible, properly organized.",
                tag: "Records",
                color: "bg-teal-50 text-teal-600",
              },
              {
                icon: BrainCircuit,
                title: "AI Health Intelligence",
                desc: "MedLink AI reads complex reports and translates them into plain language — no medical degree required.",
                tag: "AI",
                color: "bg-violet-50 text-violet-600",
              },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-white p-10 group hover:bg-neutral-50 transition-colors"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-8 ${f.color}`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3 block">{f.tag}</span>
                <h3 className="text-xl font-bold text-neutral-900 mb-3 tracking-tight">{f.title}</h3>
                <p className="text-neutral-500 leading-relaxed text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Additional mini features */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {[
              { icon: Lock, label: "256-bit AES Encryption" },
              { icon: HeartPulse, label: "Real-time Vitals Tracking" },
              { icon: ShieldCheck, label: "Verified Doctor Network" },
              { icon: Activity, label: "Hospital Check-in QR" },
            ].map((item, i) => (
              <div key={i} className="bg-white border border-neutral-200 rounded-xl p-5 flex items-center gap-3">
                <item.icon className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                <span className="text-sm font-medium text-neutral-600">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who it's for ─────────────────────────────────────────── */}
      <section id="who" className="py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6">

          <div className="flex items-center gap-4 mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">Who it's for</p>
            <div className="h-px flex-1 bg-neutral-200" />
          </div>

          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-[#0a0a0a] mb-16 max-w-xl leading-tight">
            One network.<br />Three portals.
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: User2,
                role: "Patient",
                href: "/register",
                accentBg: "bg-blue-600",
                tag: "Most popular",
                tagColor: "text-blue-600 bg-blue-50 border-blue-100",
                desc: "Own your health story. Access records, book doctors, and control who sees your data — from anywhere.",
                items: ["Book appointments instantly", "Store all health records", "Control hospital access"],
              },
              {
                icon: HeartPulse,
                role: "Doctor",
                href: "/register?role=doctor",
                accentBg: "bg-teal-600",
                tag: "For clinicians",
                tagColor: "text-teal-600 bg-teal-50 border-teal-100",
                desc: "Spend less time on paperwork. View patient histories, write prescriptions, and get AI diagnostic support.",
                items: ["View complete patient history", "Write e-prescriptions", "AI-powered diagnosis help"],
              },
              {
                icon: Building2,
                role: "Hospital",
                href: "/register?role=hospital",
                accentBg: "bg-violet-600",
                tag: "For facilities",
                tagColor: "text-violet-600 bg-violet-50 border-violet-100",
                desc: "Modernize your clinic. Manage departments, streamline check-ins, and track patient flow in real time.",
                items: ["Digital patient check-in", "Department management", "Staff & doctor directory"],
              },
            ].map((r, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link href={r.href}>
                  <div className="group border-2 border-neutral-100 hover:border-neutral-300 rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full flex flex-col">
                    <div className="flex items-start justify-between mb-6">
                      <div className={`w-12 h-12 ${r.accentBg} rounded-xl flex items-center justify-center`}>
                        <r.icon className="w-6 h-6 text-white" />
                      </div>
                      <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${r.tagColor}`}>
                        {r.tag}
                      </span>
                    </div>
                    <h3 className="text-2xl font-black tracking-tight text-neutral-900 mb-3">{r.role}</h3>
                    <p className="text-neutral-500 text-sm leading-relaxed mb-6 flex-1">{r.desc}</p>
                    <ul className="space-y-2 mb-8">
                      {r.items.map((item, j) => (
                        <li key={j} className="flex items-center gap-2 text-sm text-neutral-600">
                          <span className="w-1 h-1 rounded-full bg-neutral-400 inline-block" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center gap-2 text-sm font-bold text-neutral-900 group-hover:gap-3 transition-all">
                      Register as {r.role} <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="bg-[#0a0a0a] py-28">
        <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center justify-between gap-12">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 text-white/70 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Registration is open
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight mb-4">
              Take control<br />of your health.
            </h2>
            <p className="text-neutral-400 text-lg max-w-md">
              Join 12,000+ people who've already ditched the waiting room and upgraded their healthcare.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 shrink-0">
            <Link href="/register">
              <Button size="lg" className="h-14 px-10 bg-white text-[#0a0a0a] hover:bg-neutral-100 font-bold rounded-xl text-base shadow-none">
                Create free account →
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="h-14 px-10 border-2 border-white/20 text-white hover:bg-white/10 font-bold rounded-xl text-base shadow-none">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="bg-[#0a0a0a] border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
              <Stethoscope className="w-3.5 h-3.5 text-[#0a0a0a]" />
            </div>
            <span className="text-white font-bold text-sm">MedLink AI</span>
          </div>
          <p className="text-neutral-500 text-xs">© 2025 MedLink AI. Built for better healthcare in India.</p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-neutral-500 hover:text-white text-xs transition-colors">Sign in</Link>
            <Link href="/register" className="text-neutral-500 hover:text-white text-xs transition-colors">Register</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
