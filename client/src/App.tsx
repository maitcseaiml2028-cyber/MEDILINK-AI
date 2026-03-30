import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/hooks/use-auth";

import LandingPage from "./pages/landing";
import LoginPage from "./pages/login";
import RegisterPage from "./pages/register";

// Patient
import PatientDashboard from "./pages/patient/dashboard";
import PatientAppointments from "./pages/patient/appointments";
import PatientRecords from "./pages/patient/records";
import PatientEmergencyProfile from "./pages/patient/emergency-profile";
import PatientAiChat from "./pages/patient/ai-chat";
import AccessControl from "./pages/patient/access-control";
import MedicalTimeline from "./pages/patient/timeline";
import LabUpload from "./pages/patient/lab-upload";
import EmergencyView from "./pages/patient/emergency-view";

// Doctor
import DoctorDashboard from "./pages/doctor/dashboard";
import DoctorPatients from "./pages/doctor/patients";

import DoctorAiAssistant from "./pages/doctor/ai-assistant";
import DrugInteractionChecker from "./pages/doctor/drug-checker";

// Hospital
import HospitalDashboard from "./pages/hospital/dashboard";
import HospitalPatients from "./pages/hospital/patients";
import HospitalCheckOut from "./pages/hospital/check-out";
import HospitalAppointments from "./pages/hospital/appointments";
import HospitalStaff from "./pages/hospital/staff";
import HospitalAnalytics from "./pages/hospital/analytics";
import HospitalEmergencySessions from "./pages/hospital/emergency-sessions";
import HospitalTempTreatment from "./pages/hospital/temp-treatment";

// Admin
import AdminDashboard from "./pages/admin/dashboard";
import NotFound from "./pages/not-found";

function ProtectedRoute({ component: Component, adminOnly, hospitalOnly, ...rest }: any) {
  return (
    <Route {...rest}>
      {(params) => {
        const { user, isLoading } = useAuth();
        const [_, setLocation] = useLocation();

        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
            </div>
          );
        }

        if (!user) {
          setLocation("/login");
          return null;
        }

        if (adminOnly && user.role !== "admin") {
          setLocation("/"); // Redirect non-admins trying to access admin dashboard
          return null;
        }

        if (hospitalOnly && user.role !== "hospital") {
          setLocation("/");
          return null;
        }

        return <Component {...params} />;
      }}
    </Route>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />

      {/* Patient Routes */}
      <ProtectedRoute path="/patient/dashboard" component={PatientDashboard} />
      <ProtectedRoute path="/patient/appointments" component={PatientAppointments} />
      <ProtectedRoute path="/patient/records" component={PatientRecords} />
      <ProtectedRoute path="/patient/emergency" component={PatientEmergencyProfile} />
      <ProtectedRoute path="/patient/ai-chat" component={PatientAiChat} />
      <ProtectedRoute path="/patient/access-control" component={AccessControl} />
      <ProtectedRoute path="/patient/timeline" component={MedicalTimeline} />
      <ProtectedRoute path="/patient/lab-upload" component={LabUpload} />

      {/* Doctor Routes */}
      <ProtectedRoute path="/doctor/dashboard" component={DoctorDashboard} />
      <ProtectedRoute path="/doctor/patients" component={DoctorPatients} />
      <ProtectedRoute path="/doctor/ai-assistant" component={DoctorAiAssistant} />
      <ProtectedRoute path="/doctor/drug-checker" component={DrugInteractionChecker} />

      {/* Hospital Routes */}
      <ProtectedRoute path="/hospital/dashboard" component={HospitalDashboard} hospitalOnly={true} />
      <ProtectedRoute path="/hospital/patients" component={HospitalPatients} hospitalOnly={true} />
      <ProtectedRoute path="/hospital/check-out" component={HospitalCheckOut} hospitalOnly={true} />
      <ProtectedRoute path="/hospital/appointments" component={HospitalAppointments} hospitalOnly={true} />
      <ProtectedRoute path="/hospital/staff" component={HospitalStaff} hospitalOnly={true} />
      <ProtectedRoute path="/hospital/analytics" component={HospitalAnalytics} hospitalOnly={true} />
      <ProtectedRoute path="/hospital/emergency-treatment" component={HospitalEmergencySessions} hospitalOnly={true} />
      <ProtectedRoute path="/hospital/emergency-treatment/:tempId" component={HospitalTempTreatment} hospitalOnly={true} />

      {/* Legacy / Admin */}
      <ProtectedRoute path="/hospital-dashboard" component={HospitalDashboard} hospitalOnly={true} />
      <ProtectedRoute path="/admin-dashboard" component={AdminDashboard} adminOnly={true} />
      <ProtectedRoute path="/admin/dashboard" component={AdminDashboard} adminOnly={true} />


      {/* Public Emergency Route (QR code scan - no auth needed) */}
      <Route path="/emergency" component={EmergencyView} />
      <Route path="/emergency/:healthId" component={EmergencyView} />

      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
