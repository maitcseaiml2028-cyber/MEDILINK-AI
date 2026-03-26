
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import path from "path";
import fs from "fs";
import multer from "multer";
import {
  hashPassword, comparePassword, generateToken,
  authenticate, type AuthRequest
} from "./auth";
import { registerFaceRoutes } from "./face-verification/routes";
import { emergencyRecordRoutes } from "./emergency-records/routes";
import { seedDatabase } from "./seed";
import { db } from "./db";
import { hospitalPatientAccess, hospitalStaff, appointments } from "@shared/schema";
import { eq, or, and, count, sql, like, inArray, desc } from "drizzle-orm";

// ---- Multer storage config ----
const uploadsDir = path.join(process.cwd(), "server", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const multerStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});
const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /pdf|jpg|jpeg|png|gif|webp|dcm|svg/i;
    if (allowed.test(path.extname(file.originalname).replace(".", ""))) cb(null, true);
    else cb(new Error("Only PDF and image files allowed"));
  },
});

// ---- ID Generators ----
const genId = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  registerFaceRoutes(app);
  app.use("/api/emergency", emergencyRecordRoutes);

  // ===================== AUTH =====================
  app.post(api.auth.register.path, async (req, res) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      const existing = await storage.getUserByUsername(input.username);
      if (existing) return res.status(400).json({ message: "Username already taken" });

      const hashedPassword = await hashPassword(input.password);
      const user = await storage.createUser({ ...input, password: hashedPassword });

      if (input.role === "patient") {
        const healthId = genId("ML-PAT");
        const patient = await storage.createPatient({
          userId: user.id, healthId,
          dateOfBirth: input.dateOfBirth,
          gender: input.gender,
          contactNumber: input.contactNumber,
          emergencyContact: input.emergencyContact,
        });
        const token = generateToken(user.id, user.role);
        return res.status(201).json({ user: { ...user, patient }, token });
      }

      if (input.role === "doctor") {
        const doctor = await storage.createDoctor({
          userId: user.id,
          doctorId: genId("ML-DOC"),
          specialization: (input as any).specialization || "General",
          licenseNumber: (input as any).licenseNumber || "PENDING",
          experience: (input as any).experience,
          joinStatus: "independent",
        });
        const token = generateToken(user.id, user.role);
        return res.status(201).json({ user: { ...user, doctor }, token });
      }

      if (input.role === "hospital") {
        const hospital = await storage.createHospital({
          userId: user.id,
          hospitalId: genId("ML-HOSP"),
          licenseNumber: (input as any).licenseNumber || "PENDING",
          address: (input as any).address,
          phone: (input as any).phone,
        });
        const token = generateToken(user.id, user.role);
        return res.status(201).json({ user: { ...user, hospital }, token });
      }

      const token = generateToken(user.id, user.role);
      res.status(201).json({ user, token });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      console.error("Register error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const { username, password } = api.auth.login.input.parse(req.body);
      const cleanUsername = username.trim();
      const cleanPassword = password.trim();

      // Try username first, then email
      let user = await storage.getUserByUsername(cleanUsername);
      if (!user) user = await storage.getUserByEmail(cleanUsername);

      if (!user) {
        console.warn(`Login failed: user not found - ${cleanUsername}`);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const valid = await comparePassword(cleanPassword, user.password);
      if (!valid) {
        console.warn(`Login failed for user: ${cleanUsername} - Invalid password`);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      let profile: any = {};
      if (user.role === "patient") profile = { patient: await storage.getPatientByUserId(user.id) };
      if (user.role === "doctor") profile = { doctor: await storage.getDoctorByUserId(user.id) };
      if (user.role === "hospital") profile = { hospital: await storage.getHospitalByUserId(user.id) };

      const { password: _, ...userWithoutPassword } = user;
      const token = generateToken(user.id, user.role);
      res.json({ user: { ...userWithoutPassword, ...profile }, token });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.auth.me.path, authenticate, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      let profile: any = {};
      if (user.role === "patient") profile = { patient: await storage.getPatientByUserId(user.id) };
      if (user.role === "doctor") profile = { doctor: await storage.getDoctorByUserId(user.id) };
      if (user.role === "hospital") profile = { hospital: await storage.getHospitalByUserId(user.id) };
      res.json({ ...user, ...profile });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ===================== HOSPITALS =====================
  app.get(api.hospitals.list.path, async (_req, res) => {
    try {
      res.json(await storage.getAllHospitals());
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch hospitals" });
    }
  });

  // ===================== DOCTORS =====================
  app.get("/api/doctors", async (_req, res) => {
    try {
      res.json(await storage.getAllDoctors());
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch doctors" });
    }
  });

  app.get("/api/doctors/profile", authenticate, async (req: AuthRequest, res) => {
    try {
      const doctor = await storage.getDoctorByUserId(req.user!.userId);
      if (!doctor) return res.status(404).json({ message: "Doctor profile not found" });
      res.json(doctor);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  // Doctor requests to join hospital
  app.post("/api/doctors/request-hospital", authenticate, async (req: AuthRequest, res) => {
    try {
      const { hospitalId } = req.body;
      const doctor = await storage.getDoctorByUserId(req.user!.userId);
      if (!doctor) return res.status(404).json({ message: "Doctor profile not found" });

      const staff = await storage.addHospitalStaff({
        hospitalId,
        userId: req.user!.userId,
        doctorId: doctor.id,
        role: "doctor",
        status: "pending",
      });
      res.status(201).json(staff);
    } catch (err) {
      res.status(500).json({ message: "Failed to submit request" });
    }
  });

  // ===================== HOSPITAL STAFF =====================
  app.get("/api/hospitals/staff", authenticate, async (req: AuthRequest, res) => {
    try {
      const hospital = await storage.getHospitalByUserId(req.user!.userId);
      if (!hospital) return res.status(403).json({ message: "Hospital access only" });
      res.json(await storage.getHospitalStaff(hospital.id));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch staff" });
    }
  });

  app.get("/api/hospitals/doctor-requests", authenticate, async (req: AuthRequest, res) => {
    try {
      const hospital = await storage.getHospitalByUserId(req.user!.userId);
      if (!hospital) return res.status(403).json({ message: "Hospital access only" });
      res.json(await storage.getPendingDoctorRequests(hospital.id));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch requests" });
    }
  });

  app.post("/api/hospitals/approve-staff/:staffId", authenticate, async (req: AuthRequest, res) => {
    try {
      const staffId = parseInt(req.params.staffId as string);
      const staff = await storage.approveStaffRequest(staffId);
      // Also update doctor's hospital
      if (staff?.doctorId) {
        await storage.updateDoctorHospital(staff.doctorId, staff.hospitalId, "approved");
      }
      res.json(staff);
    } catch (err) {
      res.status(500).json({ message: "Failed to approve" });
    }
  });

  app.post("/api/hospitals/add-staff", authenticate, async (req: AuthRequest, res) => {
    try {
      const hospital = await storage.getHospitalByUserId(req.user!.userId);
      if (!hospital) return res.status(403).json({ message: "Hospital access only" });

      const { name, email, username, password, role, specialization, licenseNumber } = req.body;

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) return res.status(400).json({ message: "Username already exists" });

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) return res.status(400).json({ message: "Email already exists" });

      // Create User
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        role,
        name,
        email,
      });

      let doctorId: number | undefined;
      // If doctor, create doctor record
      if (role === "doctor") {
        const doctor = await storage.createDoctor({
          userId: user.id,
          doctorId: genId("ML-DOC"),
          specialization: specialization || "General",
          licenseNumber: licenseNumber || "PENDING",
          joinStatus: "approved",
          currentHospitalId: hospital.id,
        });
        doctorId = doctor.id;
      }

      // Add to hospital staff
      const staff = await storage.addHospitalStaff({
        hospitalId: hospital.id,
        userId: user.id,
        doctorId: doctorId || null,
        role,
        status: "approved",
      });

      res.status(201).json(staff);
    } catch (err) {
      console.error("Add staff error:", err);
      res.status(500).json({ message: "Failed to add staff" });
    }
  });

  // ===================== APPOINTMENTS =====================
  app.post(api.appointments.create.path, authenticate, async (req: AuthRequest, res) => {
    try {
      const input = api.appointments.create.input.parse(req.body);
      const patient = await storage.getPatientByUserId(req.user!.userId);
      if (!patient) return res.status(403).json({ message: "Patient access only" });

      // Prevent booking in the past
      try {
        const aptDateTime = new Date(`${input.date}T${input.time}`);
        if (aptDateTime < new Date()) {
          return res.status(400).json({ message: "Cannot book an appointment in the past." });
        }
      } catch (err) {}

      const token = `TKN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      const appointment = await storage.createAppointment({
        patientId: patient.id,
        hospitalId: input.hospitalId,
        doctorId: input.doctorId,
        department: input.department,
        date: input.date,
        time: input.time,
        notes: input.notes,
        appointmentToken: token,
        qrCode: token,
        status: "booked",
      });
      res.status(201).json(appointment);
    } catch (err) {
      res.status(500).json({ message: "Failed to create appointment" });
    }
  });

  app.get(api.appointments.list.path, authenticate, async (req: AuthRequest, res) => {
    try {
      const { userId, role } = req.user!;
      let patientIdParam = req.query.patientId ? parseInt(req.query.patientId as string) : null;
      let apts: any[] = [];

      if (role === "patient") {
        const p = await storage.getPatientByUserId(userId);
        if (p) apts = await storage.getAppointmentsByPatient(p.id);
      } else if (role === "hospital" || role === "doctor") {
        // If searching for a specific patient
        if (patientIdParam) {
          let hasAccess = false;
          let hospitalId: number | null = null;

          if (role === "hospital") {
            const h = await storage.getHospitalByUserId(userId);
            if (h) hospitalId = h.id;
            if (hospitalId) {
              const perm = await storage.getHospitalPatientAccess(patientIdParam, hospitalId);
              if (perm?.accessStatus === 'active') hasAccess = true;
            }
          } else if (role === "doctor") {
            const hospIds = await storage.getDoctorHospitals(userId);
            for (const hId of hospIds) {
              const perm = await storage.getHospitalPatientAccess(patientIdParam, hId);
              if (perm?.accessStatus === 'active') {
                hasAccess = true;
                break;
              }
            }
          }

          if (hasAccess) {
            apts = await storage.getAppointmentsByPatient(patientIdParam);
          } else {
            return res.status(403).json({ message: "Access denied to patient records" });
          }
        } else {
          // If a doctor/hospital is fetching a list without a patientId, it's usually for the dashboard.
          // However, we should be careful not to return this data if they are clearly in a patient-specific context.
          if (role === "hospital") {
            const h = await storage.getHospitalByUserId(userId);
            if (h) apts = await storage.getAppointmentsByHospital(h.id);
          } else {
            const d = await storage.getDoctorByUserId(userId);
            if (d) apts = await storage.getAppointmentsByDoctor(d.id);
          }
        }
      }
      res.json(apts);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  app.patch(api.appointments.updateStatus.path, authenticate, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const { status } = req.body;

      // Fetch the appointment first to check its date
      const apt = await storage.getAppointmentById(id);
      if (!apt) return res.status(404).json({ message: "Appointment not found" });

      // If they are checking in, ensure it's for today
      if (status === "checked-in") {
          const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD (UTC based, but system usually same)
          // For a more robust check on Windows with local time:
          const localToday = new Date().toLocaleDateString('en-CA'); // en-CA is YYYY-MM-DD
          
          if (apt.date !== localToday) {
              return res.status(400).json({ 
                  message: `Cannot check in today. This appointment is scheduled for ${apt.date}. Today is ${localToday}.` 
              });
          }
      }

      const updatedApt = await storage.updateAppointmentStatus(id, status);

      if (updatedApt) {
        // If they just checked in, create a visit record
        if (status === "checked-in") {
          await storage.createVisit({
            patientId: updatedApt.patientId,
            hospitalId: updatedApt.hospitalId,
            doctorId: updatedApt.doctorId || undefined,
            appointmentId: updatedApt.id,
            checkInTime: new Date(),
            visitType: "appointment",
          });
          // Auto-grant access to this hospital so it shows up in data access control
          try {
            await storage.preGrantAccess({ patientId: updatedApt.patientId, hospitalId: updatedApt.hospitalId });
          } catch (e) { /* ignore if already granted */ }
        }
        // If completed, find the active visit and check them out
        else if (status === "completed") {
          const visits = await storage.getVisitsByHospital(updatedApt.hospitalId);
          // Find the active visit for this appointment
          const activeVisit = visits.find(v => v.appointmentId === updatedApt.id && !v.checkOutTime);
          if (activeVisit) {
            await storage.updateVisitCheckOut(activeVisit.id);
          }
        }
      }

      res.json(updatedApt);
    } catch (err) {
      console.error("Status update error:", err);
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  // ===================== PRESCRIPTIONS =====================
  app.post("/api/prescriptions", authenticate, async (req: AuthRequest, res) => {
    try {
      const doctor = await storage.getDoctorByUserId(req.user!.userId);
      if (!doctor) return res.status(403).json({ message: "Doctor access only" });

      const { patientId, medications, diagnosis, instructions, validUntil, appointmentId } = req.body;
      const prescription = await storage.createPrescription({
        patientId, doctorId: doctor.id, medications: JSON.stringify(medications),
        diagnosis, instructions, validUntil, appointmentId,
      });

      // Auto-save as medical record
      await storage.createMedicalRecord({
        patientId, doctorId: doctor.id, prescriptionId: prescription.id,
        title: `Prescription by Dr. ${(await storage.getUser(req.user!.userId))?.name}`,
        description: diagnosis || "Doctor prescription",
        type: "prescription",
        extractedText: `Medications: ${JSON.stringify(medications)}\nDiagnosis: ${diagnosis}`,
      });

      res.status(201).json(prescription);
    } catch (err) {
      res.status(500).json({ message: "Failed to create prescription" });
    }
  });

  app.get("/api/visits", authenticate, async (req: AuthRequest, res) => {
    try {
      const { role, userId } = req.user!;
      let patientId: number | null = req.query.patientId ? parseInt(req.query.patientId as string) : null;

      if (role === "patient") {
        const p = await storage.getPatientByUserId(userId);
        if (!p) return res.status(404).json({ message: "Patient not found" });
        patientId = p.id;
      } else if (!patientId) {
        return res.status(400).json({ message: "patientId is required" });
      }

      // Check access for hospital/doctor
      if (role === "hospital" || role === "doctor") {
        let hasAccess = false;
        let hospitalId: number | null = null;

        if (role === "hospital") {
          const h = await storage.getHospitalByUserId(userId);
          if (h) hospitalId = h.id;
        } else if (role === "doctor") {
          const d = await storage.getDoctorByUserId(userId);
          if (d?.currentHospitalId) hospitalId = d.currentHospitalId;
        }

        if (hospitalId) {
          const perm = await storage.getHospitalPatientAccess(patientId, hospitalId);
          if (perm?.accessStatus === 'active') hasAccess = true;
        }

        if (!hasAccess) return res.status(403).json({ message: "Access denied to patient records" });
      }

      const history = await storage.getVisitsByPatient(patientId);
      res.json(history);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch visit history" });
    }
  });

  app.get("/api/prescriptions", authenticate, async (req: AuthRequest, res) => {
    try {
      const { userId, role } = req.user!;
      let patientIdParam = req.query.patientId ? parseInt(req.query.patientId as string) : null;
      let prescriptions: any[] = [];

      if (role === "patient") {
        const p = await storage.getPatientByUserId(userId);
        if (p) prescriptions = await storage.getPrescriptionsByPatient(p.id);
      } else if (role === "hospital" || role === "doctor") {
        if (patientIdParam) {
          let hasAccess = false;
          if (role === "hospital") {
            const h = await storage.getHospitalByUserId(userId);
            if (h) {
              const perm = await storage.getHospitalPatientAccess(patientIdParam, h.id);
              if (perm?.accessStatus === 'active') hasAccess = true;
            }
          } else if (role === "doctor") {
            const hospIds = await storage.getDoctorHospitals(userId);
            for (const hId of hospIds) {
              const perm = await storage.getHospitalPatientAccess(patientIdParam, hId);
              if (perm?.accessStatus === 'active') {
                hasAccess = true;
                break;
              }
            }
          }

          if (hasAccess) {
            prescriptions = await storage.getPrescriptionsByPatient(patientIdParam);
          } else {
            return res.status(403).json({ message: "Access denied to patient records" });
          }
        } else {
          if (role === "doctor") {
            const d = await storage.getDoctorByUserId(userId);
            if (d) prescriptions = await storage.getPrescriptionsByDoctor(d.id);
          }
          // Hospitals don't have a "list prescriptions for hospital" storage method yet, 
          // usually they view per patient anyway.
        }
      }
      res.json(prescriptions);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch prescriptions" });
    }
  });

  // ===================== PATIENTS =====================
  app.get(api.patients.get.path, authenticate, async (req: AuthRequest, res) => {
    try {
      const patient = await storage.getPatientByHealthId(req.params.healthId as string);
      if (!patient) return res.status(404).json({ message: "Patient not found" });

      const { role, userId } = req.user!;
      if (role === "patient") {
        // A patient can always see their own record (might want to check if it's THEIR record)
        // but for now searching by ID is usually for hospital/doctor
      } else if (role === "hospital" || role === "doctor") {
        let hasAccess = false;
        let hospId: number | null = null;

        if (role === "hospital") {
          const h = await storage.getHospitalByUserId(userId);
          if (h) hospId = h.id;
        } else if (role === "doctor") {
          const d = await storage.getDoctorByUserId(userId);
          if (d?.currentHospitalId) hospId = d.currentHospitalId;
        }

        if (hospId) {
          const access = await storage.getHospitalPatientAccess(patient.id, hospId);
          if (access?.accessStatus === 'active') hasAccess = true;
        }

        if (!hasAccess) {
          // Sanitized return: hide sensitive info
          return res.json({
            id: patient.id,
            healthId: patient.healthId,
            gender: "****",
            dateOfBirth: "****",
            contactNumber: "****",
            // Masked name
            user: {
              name: patient.user?.name ? patient.user.name[0] + "****" + patient.user.name[patient.user.name.length - 1] : "Patient",
              username: "****",
              email: "****"
            },
            accessRequired: true
          });
        }
      }

      res.json(patient);
    } catch (err) {
      console.error("Fetch patient error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Assuming there's an existing `app.get(api.auth.me.path, ...)` block that ends here:
  // res.json({ ...user, ...profile });
  // } catch (err) {
  //   console.error("Auth me error:", err);
  //   res.status(500).json({ message: "Internal server error" });
  // }
  // });

  // Placeholder for the end of the /api/auth/me block, as it was not provided in the original content.
  // The new code will be inserted after this logical point.
  // If api.auth.me is not defined, this section should be adjusted.

  app.patch(api.auth.changePassword.path, authenticate, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Not authenticated" });
      const { currentPassword, newPassword } = api.auth.changePassword.input.parse(req.body);
      const user = await storage.getUser(req.user.userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const isValid = await comparePassword(currentPassword, user.password);
      if (!isValid) return res.status(401).json({ message: "Incorrect current password" });

      const hashedNewPassword = await hashPassword(newPassword);
      await storage.updateUser(user.id, { password: hashedNewPassword });
      res.json({ message: "Password updated successfully" });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.auth.resetPassword.path, async (req, res) => {
    try {
      const { username, email, newPassword } = api.auth.resetPassword.input.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      if (!user || user.email.toLowerCase() !== email.toLowerCase()) {
        return res.status(404).json({ message: "User not found or email does not match" });
      }

      const hashedNewPassword = await hashPassword(newPassword);
      await storage.updateUser(user.id, { password: hashedNewPassword });
      res.json({ message: "Password reset successfully. You can now log in." });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.auth.updateProfile.path, authenticate, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Not authenticated" });
      const updates = api.auth.updateProfile.input.parse(req.body);
      const user = await storage.getUser(req.user.userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (updates.name) {
        await storage.updateUser(user.id, { name: updates.name });
      }

      if (user.role === "patient") {
        const patient = await storage.getPatientByUserId(user.id);
        if (patient) {
          const pUpdates: any = {};
          if (updates.dateOfBirth !== undefined) pUpdates.dateOfBirth = updates.dateOfBirth;
          if (updates.gender !== undefined) pUpdates.gender = updates.gender;
          if (updates.contactNumber !== undefined) pUpdates.contactNumber = updates.contactNumber;
          if (updates.emergencyContact !== undefined) pUpdates.emergencyContact = updates.emergencyContact;
          
          if (Object.keys(pUpdates).length > 0) {
            await storage.updatePatient(patient.id, pUpdates);
          }
        }
      } else if (user.role === "doctor") {
        const doctor = await storage.getDoctorByUserId(user.id);
        if (doctor) {
          const dUpdates: any = {};
          if (updates.specialization !== undefined) dUpdates.specialization = updates.specialization;
          if (updates.experience !== undefined) dUpdates.experience = updates.experience;
          
          if (Object.keys(dUpdates).length > 0) {
            await storage.updateDoctor(doctor.id, dUpdates);
          }
        }
      } else if (user.role === "hospital") {
        const hospital = await storage.getHospitalByUserId(user.id);
        if (hospital) {
          const hUpdates: any = {};
          if (updates.address !== undefined) hUpdates.address = updates.address;
          if (updates.phone !== undefined) hUpdates.phone = updates.phone;
          if (updates.specialization !== undefined) hUpdates.specializations = updates.specialization;
          
          if (Object.keys(hUpdates).length > 0) {
            await storage.updateHospital(hospital.id, hUpdates);
          }
        }
      }

      // Fetch the fully updated user and profile
      const updatedUser = await storage.getUser(user.id);
      let profile: any = {};
      if (user.role === "patient") profile = { patient: await storage.getPatientByUserId(user.id) };
      if (user.role === "doctor") profile = { doctor: await storage.getDoctorByUserId(user.id) };
      if (user.role === "hospital") profile = { hospital: await storage.getHospitalByUserId(user.id) };
      
      res.json({ user: { ...updatedUser, ...profile }, message: "Profile updated successfully" });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      console.error("Profile update error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ===================== HOSPITAL-PATIENT ACCESS =====================
  // Standardized endpoints requested by architect
  app.post("/api/access/request", authenticate, async (req: AuthRequest, res) => {
    try {
      const { role, userId } = req.user!;
      let hospitalId: number | null = null;
      if (role === "hospital") {
        const h = await storage.getHospitalByUserId(userId);
        if (h) hospitalId = h.id;
      } else if (role === "doctor") {
        const d = await storage.getDoctorByUserId(userId);
        if (d?.currentHospitalId) hospitalId = d.currentHospitalId;
      }

      if (!hospitalId) return res.status(403).json({ message: "Hospital/Doctor (assigned to hospital) access only" });
      const patientId = parseInt(req.body.patientId);
      const department = req.body.department;
      const perm = await storage.requestAccess({ patientId, hospitalId, department });
      res.status(201).json({ status: 'pending', permission: perm });
    } catch (err) {
      res.status(500).json({ message: "Failed to request access" });
    }
  });

  app.post("/api/access/grant", authenticate, async (req: AuthRequest, res) => {
    try {
      if (req.user!.role !== "patient") return res.status(403).json({ message: "Patient access only" });
      const hospitalId = parseInt(req.body.hospitalId);
      const patient = await storage.getPatientByUserId(req.user!.userId);
      if (!patient) return res.status(404).json({ message: "Patient record not found" });

      const perm = await storage.approveAccess(patient.id, hospitalId);
      res.json({ status: 'active', permission: perm });
    } catch (err) {
      res.status(500).json({ message: "Failed to grant access" });
    }
  });

  app.post("/api/access/revoke", authenticate, async (req: AuthRequest, res) => {
    try {
      const { role, userId } = req.user!;
      const patientId = req.body.patientId ? parseInt(req.body.patientId) : null;
      const hospitalId = req.body.hospitalId ? parseInt(req.body.hospitalId) : null;

      if (role === "patient") {
        const patient = await storage.getPatientByUserId(userId);
        if (patient && hospitalId) await storage.revokeAccess(patient.id, hospitalId);
      } else if (role === "hospital") {
        const h = await storage.getHospitalByUserId(userId);
        if (h && patientId) await storage.revokeAccess(patientId, h.id);
      } else {
        return res.status(403).json({ message: "Unauthorized" });
      }
      res.json({ revoked: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to revoke access" });
    }
  });

  app.get("/api/access/permissions", authenticate, async (req: AuthRequest, res) => {
    try {
      if (req.user!.role !== "patient") return res.status(403).json({ message: "Patient access only" });
      const patient = await storage.getPatientByUserId(req.user!.userId);
      if (!patient) return res.status(404).json({ message: "Patient record not found" });
      const perms = await storage.getHospitalPatientAccessByPatient(patient.id);
      res.json(perms);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch permissions" });
    }
  });

  // ===================== MEDICAL RECORDS =====================
  app.get(api.records.list.path, authenticate, async (req: AuthRequest, res) => {
    try {
      const { userId, role } = req.user!;
      let patientId = req.query.patientId ? Number(req.query.patientId) : null;
      if (role === "patient") {
        const p = await storage.getPatientByUserId(userId);
        if (p) patientId = p.id;
      }
      if (!patientId) return res.status(400).json({ message: "Patient ID required" });

      // Check access for hospital/doctor
      if (role === "hospital" || role === "doctor") {
        let hasAccess = false;
        let hospitalId: number | null = null;

        if (role === "hospital") {
          const h = await storage.getHospitalByUserId(userId);
          if (h) hospitalId = h.id;
        } else if (role === "doctor") {
          const d = await storage.getDoctorByUserId(userId);
          if (d?.currentHospitalId) hospitalId = d.currentHospitalId;
        }

        if (hospitalId) {
          const perm = await storage.getHospitalPatientAccess(patientId, hospitalId);
          if (perm?.accessStatus === 'active') hasAccess = true;
        }

        if (!hasAccess) return res.status(403).json({ message: "Access denied to patient records" });
      }

      res.json(await storage.getMedicalRecordsByPatient(patientId));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch records" });
    }
  });

  app.post(api.records.create.path, authenticate, async (req: AuthRequest, res) => {
    try {
      const { userId, role } = req.user!;
      let patientId: number | null = null;

      if (role === "patient") {
        const p = await storage.getPatientByUserId(userId);
        if (p) patientId = p.id;
      } else {
        patientId = req.body.patientId;
      }

      if (!patientId) return res.status(400).json({ message: "Patient ID required" });

      let hospitalId: number | undefined = undefined;
      if (role === "hospital") {
        const h = await storage.getHospitalByUserId(userId);
        if (h) hospitalId = h.id;
      }

      const record = await storage.createMedicalRecord({
        patientId,
        hospitalId,
        title: req.body.title,
        description: req.body.description,
        type: req.body.type,
        fileUrl: req.body.fileUrl,
        extractedText: "AI extracted: " + (req.body.description || "Medical record"),
      });

      res.status(201).json(record);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to create record" });
    }
  });

  // ===================== AI =====================
  app.post(api.ai.summary.path, authenticate, async (req: AuthRequest, res) => {
    try {
      const { patientId } = req.body;
      const { userId, role } = req.user!;

      // Check access for hospital/doctor
      if (role === "hospital" || role === "doctor") {
        let hasAccess = false;
        let hospitalId: number | null = null;

        if (role === "hospital") {
          const h = await storage.getHospitalByUserId(userId);
          if (h) hospitalId = h.id;
        } else if (role === "doctor") {
          const d = await storage.getDoctorByUserId(userId);
          if (d?.currentHospitalId) hospitalId = d.currentHospitalId;
        }

        if (hospitalId) {
          const perm = await storage.getHospitalPatientAccess(patientId, hospitalId);
          if (perm?.accessStatus === 'active') hasAccess = true;
        }

        if (!hasAccess) return res.status(403).json({ message: "Access denied to patient records" });
      }

      if (!patientId) return res.status(400).json({ message: "Patient ID required" });
      const records = await storage.getMedicalRecordsByPatient(patientId);
      const emergency = await storage.getEmergencyProfile(patientId);

      const summary = `Patient Medical Summary:
Blood Group: ${emergency?.bloodGroup || "Not specified"}
Known Conditions: ${emergency?.diseases || "None recorded"}
Allergies: ${emergency?.allergies || "None recorded"}
Total Records: ${records.length} medical records on file.
Recent Activity: ${records[0]?.title || "No recent records"}.
AI Assessment: Based on available records, patient appears to be managed appropriately. Regular follow-up recommended.`;

      const saved = await storage.createAiSummary(patientId, summary);
      res.json({ summary: saved.summary });
    } catch (err) {
      res.status(500).json({ message: "Failed to generate summary" });
    }
  });

  app.post(api.ai.chat.path, authenticate, async (req: AuthRequest, res) => {
    try {
      const { message } = req.body;
      const reply = `Thank you for your query: "${message}".
Based on medical guidelines, here is some general health information:
• Always consult your doctor for personalized medical advice
• Maintain regular health check-ups
• Stay hydrated and follow a balanced diet
• If symptoms persist, seek immediate medical attention
Note: This is AI-generated information and should not replace professional medical advice.`;
      res.json({ reply });
    } catch (err) {
      res.status(500).json({ message: "Failed to process chat" });
    }
  });

  app.post(api.ai.ocr.path, authenticate, async (_req, res) => {
    res.json({ text: "Extracted medical text from document: Patient diagnosis records, test results, and treatment plan." });
  });

  // ===================== ACCESS PERMISSIONS =====================
  app.get("/api/permissions", authenticate, async (req: AuthRequest, res) => {
    try {
      const patient = await storage.getPatientByUserId(req.user!.userId);
      if (!patient) return res.status(404).json({ message: "Patient not found" });
      res.json(await storage.getPatientAccessPermissions(patient.id));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch permissions" });
    }
  });

  app.post("/api/permissions", authenticate, async (req: AuthRequest, res) => {
    try {
      const patient = await storage.getPatientByUserId(req.user!.userId);
      if (!patient) return res.status(404).json({ message: "Patient not found" });
      res.status(201).json(await storage.preGrantAccess({ patientId: patient.id, hospitalId: req.body.hospitalId }));
    } catch (err) {
      res.status(500).json({ message: "Failed to grant access" });
    }
  });

  app.delete("/api/permissions/:hospitalId", authenticate, async (req: AuthRequest, res) => {
    try {
      const patient = await storage.getPatientByUserId(req.user!.userId);
      if (!patient) return res.status(404).json({ message: "Patient not found" });
      await storage.revokeAccess(patient.id, parseInt(req.params.hospitalId as string));
      res.json({ message: "Access revoked" });
    } catch (err) {
      res.status(500).json({ message: "Failed to revoke" });
    }
  });

  // ===================== VISITS =====================
  app.post("/api/visits/check-in", authenticate, async (req: AuthRequest, res) => {
    try {
      const { userId, role } = req.user!;
      const hospitalIdParam = req.body.hospitalId;
      
      const hospital = role === "hospital" ? await storage.getHospitalByUserId(userId) : null;
      const { patientId, token, department } = req.body;
      const patient = patientId ? await storage.getPatientById(patientId)
        : token ? await storage.getPatientByHealthId(token) : 
        (role === "patient" ? await storage.getPatientByUserId(userId) : null);
        
      if (!patient) return res.status(404).json({ message: "Patient not found" });

      const resolvedHospitalId = hospital?.id || hospitalIdParam || 1;

      // Ensure access is perfectly granted before check-in
      const perm = await storage.getHospitalPatientAccess(patient.id, resolvedHospitalId);
      if (!perm || perm.accessStatus !== 'active') {
        return res.status(403).json({ message: "Access must be granted by the patient before check-in." });
      }

      // Auto-detect if there's an active appointment today
      const existingApt = await db.query.appointments.findFirst({
        where: and(
          eq(appointments.patientId, patient.id),
          eq(appointments.hospitalId, resolvedHospitalId),
          inArray(appointments.status, ['booked', 'pending', 'accepted'])
        )
      });

      const visit = await storage.createVisit({
        patientId: patient.id,
        hospitalId: resolvedHospitalId,
        checkInTime: new Date(),
        visitType: existingApt ? "appointment" : "walk-in",
        department: department || existingApt?.department || undefined,
        appointmentId: existingApt?.id,
      });

      if (existingApt) {
        await db.update(appointments)
          .set({ status: 'checked-in' })
          .where(eq(appointments.id, existingApt.id));
      }

      res.status(201).json(visit);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to check in" });
    }
  });

  app.post("/api/visits/:id/check-out", authenticate, async (req: AuthRequest, res) => {
    try {
      const visitId = parseInt(req.params.id as string);
      const visit = await storage.updateVisitCheckOut(visitId);
      
      // Auto-complete the associated appointment if it exists
      if (visit && visit.appointmentId) {
        await db.update(appointments)
          .set({ status: 'completed' })
          .where(eq(appointments.id, visit.appointmentId));
      }
      
      res.json(visit);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to check out" });
    }
  });


  app.get("/api/visits/department/:dept", authenticate, async (req: AuthRequest, res) => {
    try {
      const { userId, role } = req.user!;
      if (role !== "doctor") return res.status(403).json({ message: "Doctor access only" });

      const doctor = await storage.getDoctorByUserId(userId);
      if (!doctor || !doctor.currentHospitalId) return res.status(403).json({ message: "Doctor not assigned to a hospital" });

      const dept = decodeURIComponent(req.params.dept as string);
      const visits = await storage.getVisitsByHospital(doctor.currentHospitalId);
      const deptVisits = visits.filter(v =>
        v.visitStatus === 'active' &&
        v.department?.toLowerCase() === dept.toLowerCase()
      );

      res.json(deptVisits);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch department visits" });
    }
  });

  app.get("/api/hospital/dashboard-stats", authenticate, async (req: AuthRequest, res) => {
    try {
      const { userId, role } = req.user!;
      if (role !== "hospital") return res.status(403).json({ message: "Hospital access only" });

      const hospital = await storage.getHospitalByUserId(userId);
      if (!hospital) return res.status(404).json({ message: "Hospital not found" });

      const allVisits = await storage.getVisitsByHospital(hospital.id);
      const allAccess = await db.select().from(hospitalPatientAccess).where(eq(hospitalPatientAccess.hospitalId, hospital.id));

      const activeVisits = allVisits.filter(v => v.visitStatus === 'active');
      const completedVisits = allVisits.filter(v => v.visitStatus === 'completed');
      const pendingAccess = allAccess.filter(a => a.accessStatus === 'pending');

      res.json({
        totalRequests: pendingAccess.length,   // To be reviewed/responded by patients
        checkedInActive: activeVisits.length,  // Total currently checked in
        treatedCompleted: completedVisits.length, // Total completed treatments
        pendingToday: pendingAccess.length     // Could also be 'appointments pending', but keeping it mapped to 'pendingAccess' for now per specs
      });
    } catch (err) {
      console.error("Dashboard stats error", err);
      res.status(500).json({ message: "Failed to load dashboard stats" });
    }
  });

  // ===================== FILE UPLOAD (Multer) =====================
  app.post("/api/upload-report", authenticate, upload.single("file"), async (req: AuthRequest, res) => {
    try {
      const { userId, role } = req.user!;
      let patientId: number | null = null;

      if (role === "patient") {
        const p = await storage.getPatientByUserId(userId);
        if (p) patientId = p.id;
      } else {
        patientId = req.body.patientId ? parseInt(req.body.patientId) : null;
      }
      if (!patientId) return res.status(400).json({ message: "Patient ID required" });

      const file = (req as any).file;
      const title = req.body.title || (file ? file.originalname : "Uploaded Report");
      const reportType = req.body.reportType || "lab";
      const description = req.body.description || "";

      // Only assign a hospitalId if the uploaded is a hospital staff member
      let hospitalId: number | null = null;
      if (role === "hospital") {
        const h = await storage.getHospitalByUserId(userId);
        if (h) hospitalId = h.id;
      } else if (role === "doctor") {
        const d = await storage.getDoctorByUserId(userId);
        if (d?.currentHospitalId) hospitalId = d.currentHospitalId;
      }

      // Check Access
      if (role === "hospital") {
        const h = await storage.getHospitalByUserId(userId);
        if (!h) return res.status(403).json({ message: "Access denied" });
        const perm = await storage.getHospitalPatientAccess(patientId, h.id);
        if (!perm || perm.accessStatus !== 'active') {
          return res.status(403).json({ message: "Access must be granted by the patient before uploading records." });
        }
      } else if (role === "doctor") {
        const hospIds = await storage.getDoctorHospitals(userId);
        let hasPerm = false;
        for (const hId of hospIds) {
          const perm = await storage.getHospitalPatientAccess(patientId, hId);
          if (perm?.accessStatus === 'active') {
            hasPerm = true;
            break;
          }
        }
        if (!hasPerm) return res.status(403).json({ message: "Access must be granted by the patient to your hospital before uploading records." });
      }

      console.log('--- UPLOAD DEBUG ---');
      console.log('Role:', role);
      console.log('UserId:', userId);
      console.log('PatientId:', patientId);
      console.log('HospitalId:', hospitalId);

      const record = await storage.createMedicalRecord({
        patientId,
        hospitalId: hospitalId || null,
        title,
        description,
        type: "lab",
        reportType,
        filePath: file ? file.path : undefined,
        fileUrl: file ? `/uploads/${file.filename}` : undefined,
        uploadedBy: role,
        extractedText: `Report: ${title}\nType: ${reportType}\n${description}`,
      });

      res.status(201).json({ ...record, filename: file?.filename, originalName: file?.originalname });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ message: "Upload failed", error: String(err) });
    }

  });

  // Serve uploaded files statically
  app.use("/uploads", (req, res, next) => {
    const fp = path.join(uploadsDir, path.basename(req.path));
    if (fs.existsSync(fp)) res.sendFile(fp);
    else next();
  });

  // ===================== EMERGENCY INFO (no auth required) =====================
  app.get("/api/emergency/:healthId", async (req, res) => {
    try {
      const { healthId } = req.params;
      const patient = await storage.getPatientByHealthId(healthId);
      if (!patient) return res.status(404).json({ message: "Patient not found" });

      const ep = await storage.getEmergencyProfile(patient.id);

      // Return ONLY emergency-safe fields (no full medical records)
      res.json({
        patientName: patient.user?.name || "Unknown",
        healthId: patient.healthId,
        bloodGroup: ep?.bloodGroup || "Unknown",
        allergies: ep?.allergies || "None recorded",
        chronicDiseases: ep?.diseases || "None recorded",
        emergencyContactName: ep?.emergencyContactName || patient.emergencyContact || "",
        emergencyContactPhone: ep?.emergencyContactPhone || "",
        notes: ep?.notes || "",
        gender: patient.gender || "",
        dateOfBirth: patient.dateOfBirth || "",
      });
    } catch (err) {
      console.error("Emergency fetch error:", err);
      res.status(500).json({ message: "Failed to fetch emergency info" });
    }
  });

  // ===================== HOSPITAL ACCESS CONTROL (improved) =====================
  app.get("/api/access-status/:patientId", authenticate, async (req: AuthRequest, res) => {
    try {
      const { role, userId } = req.user!;
      let hospId: number | null = null;

      if (role === "hospital") {
        const h = await storage.getHospitalByUserId(userId);
        if (h) hospId = h.id;
      } else if (role === "doctor") {
        const d = await storage.getDoctorByUserId(userId);
        if (d?.currentHospitalId) hospId = d.currentHospitalId;
      }

      const patientId = parseInt(req.params.patientId as string);
      if (hospId) {
        const access = await storage.getHospitalPatientAccess(patientId, hospId);
        return res.json({
          granted: access?.accessStatus === 'active',
          permission: access || null
        });
      }

      res.json({ granted: false, permission: null });
    } catch (err) {
      res.status(500).json({ message: "Failed" });
    }
  });

  // ===================== HOSPITAL VISITS (enhanced list) =====================
  app.get("/api/hospital-visits/:hospitalId", authenticate, async (req: AuthRequest, res) => {
    try {
      const hospitalId = parseInt(req.params.hospitalId as string);
      const vList = await storage.getVisitsByHospital(hospitalId);
      // Attach access-permission status for each patient
      const enriched = await Promise.all(vList.map(async (v: any) => {
        const access = await storage.getHospitalPatientAccess(v.patientId, hospitalId);
        return {
          ...v,
          accessGranted: access?.accessStatus === 'active',
          status: v.checkOutTime ? "Checked Out" : "Checked In",
        };
      }));
      res.json(enriched);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch hospital visits" });
    }
  });

  // ===================== SEED MOCK DATA =====================
  app.post("/api/seed", async (_req, res) => {
    try {
      const result = await seedDatabase();
      res.json(result);
    } catch (err) {
      console.error("Seed error:", err);
      res.status(500).json({ message: "Seed failed", error: String(err) });
    }
  });

  // ---- placeholder to keep structure ----
  const _dummy = async () => {
    const pass = "unused";

    // Patients
    for (const p of [
      { name: "Rahul Sharma", username: "rahul.sharma", email: "rahul@gmail.com", dob: "1990-05-14", gender: "Male", contact: "9876543210" },
      { name: "Priya Patel", username: "priya.patel", email: "priya@gmail.com", dob: "1995-08-22", gender: "Female", contact: "9876543211" },
      { name: "Amit Kumar", username: "amit.kumar", email: "amit@gmail.com", dob: "1985-03-10", gender: "Male", contact: "9876543212" },
    ]) {
      try {
        const u = await storage.createUser({ username: p.username, password: pass, role: "patient", name: p.name, email: p.email });
        await storage.createPatient({ userId: u.id, healthId: genId("ML-PAT"), dateOfBirth: p.dob, gender: p.gender, contactNumber: p.contact, emergencyContact: "112" });
      } catch (_) { }
    }

    // Doctors
    for (const d of [
      { name: "Dr. Anil Mehta", username: "anil.mehta", email: "anil@gmail.com", spec: "Cardiology", lic: "MH-2023-001" },
      { name: "Dr. Sunita Rao", username: "sunita.rao", email: "sunita@gmail.com", spec: "General Medicine", lic: "MH-2023-002" },
      { name: "Dr. Vikram Singh", username: "vikram.singh", email: "vikram@gmail.com", spec: "Orthopedics", lic: "MH-2023-003" },
    ]) {
      try {
        const u = await storage.createUser({ username: d.username, password: pass, role: "doctor", name: d.name, email: d.email });
        await storage.createDoctor({ userId: u.id, doctorId: genId("ML-DOC"), specialization: d.spec, licenseNumber: d.lic });
      } catch (_) { }
    }

    // Hospitals
    for (const h of [
      { name: "City General Hospital", username: "citygeneral", email: "city@hospital.com", lic: "HOSP-MH-001", address: "Mumbai, MH", phone: "022-12345678" },
      { name: "Apollo Wellness Center", username: "apollowellness", email: "apollo@hospital.com", lic: "HOSP-MH-002", address: "Pune, MH", phone: "020-87654321" },
    ]) {
      try {
        const u = await storage.createUser({ username: h.username, password: pass, role: "hospital", name: h.name, email: h.email });
        await storage.createHospital({ userId: u.id, hospitalId: genId("ML-HOSP"), licenseNumber: h.lic, address: h.address, phone: h.phone });
      } catch (_) { }
    }

  };

  return httpServer;
}