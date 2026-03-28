import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Stethoscope, UserCircle, Building2, Eye, EyeOff, ScanFace } from "lucide-react";
import { FaceCaptureWidget } from "@/components/FaceCaptureWidget";

// Standard medical departments for the dropdown
const DEPARTMENTS = [
  "General Medicine", "Cardiology", "Neurology", "Orthopedics", 
  "Pediatrics", "Oncology", "Dermatology", "Gynaecology", "Psychiatry"
];

export default function RegisterPage() {
  const { register } = useAuth();
  const [location] = useLocation();
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
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      await register({ ...formData, role, faceData: faceData || undefined });
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-blue-50/20 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl shadow-slate-200/60 overflow-hidden">
        <div className="h-2 w-full bg-gradient-to-r from-teal-400 to-blue-500" />
        <div className="px-8 pt-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-br from-teal-500 to-blue-600 p-2 rounded-xl shadow-lg shadow-teal-500/20">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <span className="font-display font-bold text-2xl tracking-tight text-slate-900">MEDLINK</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-slate-900 mt-4">Create account</h1>
          <p className="text-slate-500 mt-1">Join the MediLink healthcare platform</p>
        </div>

        <Tabs value={role} onValueChange={(v) => setRole(v as any)} className="mt-6">
          <div className="px-8">
            <TabsList className="grid w-full grid-cols-3 h-14 rounded-xl bg-slate-100 p-1">
              <TabsTrigger value="patient" className="rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:text-teal-600 data-[state=active]:shadow-sm">
                <UserCircle className="w-4 h-4 mr-2" /> Patient
              </TabsTrigger>
              <TabsTrigger value="doctor" className="rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:text-teal-600 data-[state=active]:shadow-sm">
                <Stethoscope className="w-4 h-4 mr-2" /> Doctor
              </TabsTrigger>
              <TabsTrigger value="hospital" className="rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:text-teal-600 data-[state=active]:shadow-sm">
                <Building2 className="w-4 h-4 mr-2" /> Hospital
              </TabsTrigger>
            </TabsList>
          </div>

          <form onSubmit={handleSubmit} className="p-8 pt-6">
            <TabsContent value={role} className="mt-0">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {role === "hospital" ? "Hospital Name" : "Full Name"}
                  </label>
                  <Input required name="name" value={formData.name} onChange={handleChange} className="h-11 rounded-xl bg-slate-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
                  <Input required name="username" value={formData.username} onChange={handleChange} className="h-11 rounded-xl bg-slate-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                  <Input required name="email" type="email" value={formData.email} onChange={handleChange} className="h-11 rounded-xl bg-slate-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                  <div className="relative">
                    <Input 
                      required 
                      name="password" 
                      type={showPassword ? "text" : "password"} 
                      value={formData.password} 
                      onChange={handleChange} 
                      className="h-11 rounded-xl bg-slate-50 pr-10" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Patient fields */}
              {role === "patient" && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-teal-50/50 rounded-2xl border border-teal-100">
                  <div>
                    <label className="block text-sm font-medium text-teal-900 mb-2">Date of Birth</label>
                    <Input name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={handleChange} className="h-11 rounded-xl bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-teal-900 mb-2">Gender</label>
                    <Input name="gender" placeholder="Male / Female / Other" value={formData.gender} onChange={handleChange} className="h-11 rounded-xl bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-teal-900 mb-2">Contact Number</label>
                    <Input name="contactNumber" value={formData.contactNumber} onChange={handleChange} className="h-11 rounded-xl bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-teal-900 mb-2">Emergency Contact</label>
                    <Input name="emergencyContact" placeholder="Phone number" value={formData.emergencyContact} onChange={handleChange} className="h-11 rounded-xl bg-white" />
                  </div>

                  {/* Face Verification Setup */}
                  <div className="col-span-2 mt-4 bg-white p-4 rounded-xl border border-teal-100 shadow-sm">
                    <div className="mb-4">
                      <h4 className="text-sm font-bold text-teal-900 mb-1 flex items-center gap-2">
                        <ScanFace className="w-4 h-4 text-teal-600" />
                        Face Verification <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase ml-2">Required</span>
                      </h4>
                      <p className="text-xs text-slate-500">
                        Scan your face securely to allow rapid identity verification during emergencies.
                      </p>
                    </div>
                    <FaceCaptureWidget 
                      mode="register" 
                      onCapture={(data) => setFaceData(data)} 
                    />
                  </div>
                </div>
              )}

              {/* Doctor fields */}
              {role === "doctor" && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                  <div>
                    <label className="block text-sm font-medium text-blue-900 mb-2">Specialization</label>
                    <Select 
                      value={formData.specialization} 
                      onValueChange={(val) => setFormData({ ...formData, specialization: val })}
                    >
                      <SelectTrigger className="h-11 rounded-xl bg-white border-blue-200">
                        <SelectValue placeholder="Select Specialization" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map(dept => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-900 mb-2">License Number</label>
                    <Input required name="licenseNumber" value={formData.licenseNumber} onChange={handleChange} className="h-11 rounded-xl bg-white border-blue-200" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-blue-900 mb-2">Years of Experience</label>
                    <Input name="experience" placeholder="e.g. 5 years" value={formData.experience} onChange={handleChange} className="h-11 rounded-xl bg-white border-blue-200" />
                  </div>
                </div>
              )}

              {/* Hospital fields */}
              {role === "hospital" && (
                <div className="grid grid-cols-1 gap-4 p-4 bg-purple-50/50 rounded-2xl border border-purple-100">
                  <div>
                    <label className="block text-sm font-medium text-purple-900 mb-2">Hospital License Number</label>
                    <Input required name="licenseNumber" value={formData.licenseNumber} onChange={handleChange} className="h-11 rounded-xl bg-white border-purple-200" />
                  </div>
                </div>
              )}
            </TabsContent>

            {error && <p className="text-red-500 text-sm mt-3 text-center">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full h-14 rounded-2xl text-lg font-bold mt-6 bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white shadow-xl shadow-teal-500/25">
              {loading ? "Creating account..." : `Register as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
            </Button>

            <p className="text-center text-sm text-slate-500 mt-6">
              Already have an account?{" "}
              <Link href="/login" className="text-teal-600 font-semibold hover:underline">Log in</Link>
            </p>
          </form>
        </Tabs>
      </div>
    </div>
  );
}
