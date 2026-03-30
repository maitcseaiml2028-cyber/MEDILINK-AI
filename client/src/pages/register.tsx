import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Stethoscope, UserCircle, Building2, HeartPulse,
  Eye, EyeOff, ScanFace, ShieldCheck
} from "lucide-react";
import { FaceCaptureWidget } from "@/components/FaceCaptureWidget";

const DEPARTMENTS = [
  "General Medicine", "Cardiology", "Neurology", "Orthopedics",
  "Pediatrics", "Oncology", "Dermatology", "Gynaecology", "Psychiatry"
];

export default function RegisterPage() {
  const { register } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const defaultRole = (searchParams.get("role") || "patient") as "patient" | "doctor" | "hospital";

  const [role, setRole] = useState<"patient" | "doctor" | "hospital">(defaultRole);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "", username: "", email: "", password: "",
    dateOfBirth: "", gender: "", contactNumber: "", emergencyContact: "",
    specialization: "", experience: "", licenseNumber: "",
  });
  const [faceData, setFaceData] = useState<{ imageBlob: Blob; faceDescriptor: number[] } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === "patient" && !faceData) {
      setError("Face verification is required for patients. Please enable camera and complete the scan.");
      return;
    }
    setLoading(true); setError("");
    try { await register({ ...formData, role, faceData: faceData || undefined }); }
    catch (err: any) { setError(err.message || "Registration failed"); }
    finally { setLoading(false); }
  };

  const roleLabels: Record<string, string> = { patient: "Patient", doctor: "Doctor", hospital: "Hospital" };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav bar */}
      <div className="bg-white border-b border-slate-100 px-6 py-3.5 flex items-center justify-between sticky top-0 z-20">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-sky-600 rounded-lg flex items-center justify-center">
            <Stethoscope className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-black text-slate-900 text-base tracking-tight">
            MedLink<span className="text-sky-600">AI</span>
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">Already have an account?</span>
          <Link href="/login">
            <Button variant="outline" size="sm" className="rounded-lg border-slate-200 text-slate-700 font-semibold text-sm h-9">
              Sign in
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto py-10 px-4">
        {/* Page header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Create your account</h1>
          <p className="text-slate-500 text-sm mt-2">
            Join MedLink AI — free forever, no credit card needed.
          </p>
        </div>

        {/* Role tabs + form */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <Tabs value={role} onValueChange={(v) => setRole(v as any)}>

            {/* Tab selector */}
            <div className="border-b border-slate-100">
              <TabsList className="grid grid-cols-3 rounded-none h-auto p-0 bg-transparent border-0 m-0">
                {(["patient", "doctor", "hospital"] as const).map((r) => {
                  const icons = { patient: UserCircle, doctor: HeartPulse, hospital: Building2 };
                  const Icon = icons[r];
                  const isActive = role === r;
                  const accentColors = {
                    patient: "border-sky-500 text-sky-600 bg-sky-50",
                    doctor: "border-emerald-500 text-emerald-600 bg-emerald-50",
                    hospital: "border-violet-500 text-violet-600 bg-violet-50",
                  };
                  return (
                    <TabsTrigger
                      key={r}
                      value={r}
                      className={`
                        rounded-none h-14 flex items-center justify-center gap-2 text-sm font-semibold
                        border-b-2 transition-all duration-150
                        ${isActive ? accentColors[r] : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"}
                      `}
                    >
                      <Icon className="w-4 h-4" />
                      {roleLabels[r]}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            <form onSubmit={handleSubmit}>
              <TabsContent value={role} className="m-0">
                <div className="p-7">

                  {/* Section: Account info */}
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Account Information</p>
                  <div className="grid grid-cols-2 gap-4 mb-7">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        {role === "hospital" ? "Hospital Name" : "Full Name"}
                      </label>
                      <Input required name="name" value={formData.name} onChange={handleChange}
                        className="h-10 rounded-lg border-slate-200 bg-slate-50 focus-visible:bg-white focus-visible:ring-sky-500 transition-colors"
                        placeholder={role === "hospital" ? "Apollo Hospital" : "Priya Sharma"} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
                      <Input required name="username" value={formData.username} onChange={handleChange}
                        className="h-10 rounded-lg border-slate-200 bg-slate-50 focus-visible:bg-white focus-visible:ring-sky-500"
                        placeholder="priya_sharma" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                      <Input required name="email" type="email" value={formData.email} onChange={handleChange}
                        className="h-10 rounded-lg border-slate-200 bg-slate-50 focus-visible:bg-white focus-visible:ring-sky-500"
                        placeholder="you@example.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                      <div className="relative">
                        <Input required name="password" type={showPassword ? "text" : "password"}
                          value={formData.password} onChange={handleChange}
                          className="h-10 rounded-lg border-slate-200 bg-slate-50 pr-10 focus-visible:bg-white focus-visible:ring-sky-500"
                          placeholder="Min. 8 characters" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Patient-specific */}
                  {role === "patient" && (
                    <>
                      <div className="border-t border-dashed border-slate-100 pt-6 mb-4">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Personal Details</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Date of Birth</label>
                            <Input name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={handleChange}
                              className="h-10 rounded-lg border-slate-200 bg-slate-50 focus-visible:ring-sky-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Gender</label>
                            <Input name="gender" placeholder="Male / Female / Other" value={formData.gender} onChange={handleChange}
                              className="h-10 rounded-lg border-slate-200 bg-slate-50 focus-visible:ring-sky-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Contact Number</label>
                            <Input name="contactNumber" placeholder="+91 98765 43210" value={formData.contactNumber} onChange={handleChange}
                              className="h-10 rounded-lg border-slate-200 bg-slate-50 focus-visible:ring-sky-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Emergency Contact</label>
                            <Input name="emergencyContact" placeholder="+91 98765 43210" value={formData.emergencyContact} onChange={handleChange}
                              className="h-10 rounded-lg border-slate-200 bg-slate-50 focus-visible:ring-sky-500" />
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-dashed border-slate-100 pt-6">
                        <div className="flex items-center gap-2 mb-1">
                          <ScanFace className="w-4 h-4 text-sky-600" />
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Face Verification</p>
                          <span className="ml-1 text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded border border-red-100">Required</span>
                        </div>
                        <p className="text-xs text-slate-500 mb-4">
                          Your face scan is used for identity verification during emergencies. It's encrypted and never shared.
                        </p>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                          <FaceCaptureWidget mode="register" onCapture={(data) => setFaceData(data)} />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Doctor-specific */}
                  {role === "doctor" && (
                    <div className="border-t border-dashed border-slate-100 pt-6">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Professional Details</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Specialization</label>
                          <Select value={formData.specialization} onValueChange={(val) => setFormData({ ...formData, specialization: val })}>
                            <SelectTrigger className="h-10 rounded-lg border-slate-200 bg-slate-50">
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                            <SelectContent>
                              {DEPARTMENTS.map(dept => <SelectItem key={dept} value={dept}>{dept}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">License Number</label>
                          <Input required name="licenseNumber" value={formData.licenseNumber} onChange={handleChange}
                            className="h-10 rounded-lg border-slate-200 bg-slate-50"
                            placeholder="MH-2024-12345" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Years of Experience</label>
                          <Input name="experience" placeholder="e.g. 8 years" value={formData.experience} onChange={handleChange}
                            className="h-10 rounded-lg border-slate-200 bg-slate-50" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Hospital-specific */}
                  {role === "hospital" && (
                    <div className="border-t border-dashed border-slate-100 pt-6">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Facility Details</p>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Hospital License Number</label>
                        <Input required name="licenseNumber" value={formData.licenseNumber} onChange={handleChange}
                          className="h-10 rounded-lg border-slate-200 bg-slate-50"
                          placeholder="HOSP-LIC-2024-XXXXX" />
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {error && (
                    <div className="mt-5 p-3.5 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">⚠</span>
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  {/* Submit */}
                  <Button type="submit" disabled={loading}
                    className={`w-full h-11 rounded-xl font-semibold text-sm text-white mt-6 transition-colors shadow-sm ${
                      role === "patient" ? "bg-sky-600 hover:bg-sky-700" :
                      role === "doctor" ? "bg-emerald-600 hover:bg-emerald-700" :
                      "bg-violet-600 hover:bg-violet-700"
                    }`}
                  >
                    {loading ? "Creating account..." : `Create ${roleLabels[role]} Account →`}
                  </Button>

                  {/* Privacy note */}
                  <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                    Your data is encrypted and never sold.
                  </div>
                </div>
              </TabsContent>
            </form>
          </Tabs>
        </div>

        <p className="text-center text-xs text-slate-400 mt-5">
          By registering, you agree to MedLink's{" "}
          <span className="text-sky-600 cursor-pointer hover:underline">Terms of Service</span> and{" "}
          <span className="text-sky-600 cursor-pointer hover:underline">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}
