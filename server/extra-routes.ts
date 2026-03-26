import type { Express } from "express";
import { storage } from "./storage";
import { authenticate, type AuthRequest } from "./auth";

/**
 * Extra routes added to fix:
 * 1. Hospital-initiated grant access (/api/grant-access)
 * 2. Emergency info for doctors/hospitals (/api/emergency-info/:patientId)
 */
export function registerExtraRoutes(app: Express) {

    // Standardized endpoints are now in routes.ts
    // Keeping only emergency-info and other non-standard endpoints here

    // Emergency info — visible to doctors and hospitals once they've been granted access
    app.get("/api/emergency-info/:patientId", authenticate, async (req: AuthRequest, res) => {
        try {
            const { role, userId } = req.user!;
            if (!["doctor", "hospital"].includes(role)) {
                return res.status(403).json({ message: "Doctor or hospital access only" });
            }
            const patientId = parseInt(req.params.patientId as string);

            // Check Permission
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
                const access = await storage.getHospitalPatientAccess(patientId, hospId);
                if (access?.accessStatus === 'active') hasAccess = true;
            }

            if (!hasAccess) return res.status(403).json({ message: "Access denied to patient emergency info" });

            const patient = await storage.getPatientById(patientId);
            if (!patient) return res.status(404).json({ message: "Patient not found" });

            const user = await storage.getUser(patient.userId);
            const ep = await storage.getEmergencyProfile(patientId);

            res.json({
                patientName: user?.name || "Unknown",
                healthId: patient.healthId,
                bloodGroup: ep?.bloodGroup || "Not recorded",
                allergies: ep?.allergies || "None recorded",
                chronicDiseases: ep?.diseases || "None recorded",
                currentMedications: ep?.currentMedications || "None recorded",
                emergencyContactName: ep?.emergencyContactName || patient.emergencyContact || "",
                emergencyContactPhone: ep?.emergencyContactPhone || "",
                notes: ep?.notes || "",
                gender: patient.gender || "",
                dateOfBirth: patient.dateOfBirth || "",
            });
        } catch (err) {
            console.error("Emergency-info error:", err);
            res.status(500).json({ message: "Failed to fetch emergency info" });
        }
    });

    // Patient: Fetch their own emergency profile (or public scan)
    app.get("/api/patient/emergency/:healthId", async (req, res) => {
        try {
            const healthId = req.params.healthId as string;
            const patient = await storage.getPatientByHealthId(healthId);
            if (!patient) return res.status(404).json({ message: "Patient not found" });

            const ep = await storage.getEmergencyProfile(patient.id);

            res.json({
                patientName: patient.user?.name || "Unknown",
                healthId: patient.healthId,
                bloodGroup: ep?.bloodGroup || "",
                allergies: ep?.allergies || "",
                chronicDiseases: ep?.diseases || "",
                currentMedications: ep?.currentMedications || "",
                emergencyContactName: ep?.emergencyContactName || patient.emergencyContact || "",
                emergencyContactPhone: ep?.emergencyContactPhone || "",
                notes: ep?.notes || "",
                gender: patient.gender || "",
                dateOfBirth: patient.dateOfBirth || "",
            });
        } catch (err) {
            console.error("Fetch emergency profile error:", err);
            res.status(500).json({ message: "Failed to fetch emergency profile" });
        }
    });

    // Patient: Create or Update their emergency profile
    app.post("/api/patient/emergency", authenticate, async (req: AuthRequest, res) => {
        try {
            const { role, userId } = req.user!;
            if (role !== "patient") return res.status(403).json({ message: "Patient access only" });

            const patient = await storage.getPatientByUserId(userId);
            if (!patient) return res.status(404).json({ message: "Patient profile not found" });

            const { bloodGroup, allergies, chronicDiseases, currentMedications, emergencyContactName, emergencyContactPhone, notes } = req.body;

            const existing = await storage.getEmergencyProfile(patient.id);
            const saved = await storage.upsertEmergencyProfile({
                patientId: patient.id,
                bloodGroup,
                allergies,
                diseases: chronicDiseases,
                currentMedications,
                emergencyContactName,
                emergencyContactPhone,
                notes,
            });

            res.json({ message: "Emergency profile saved", profile: saved });
        } catch (err) {
            console.error("Update emergency profile error:", err);
            res.status(500).json({ message: "Failed to update emergency profile" });
        }
    });
    // List all hospitals for doctors to join
    app.get("/api/hospitals", authenticate, async (_req, res) => {
        try {
            const hospitals = await storage.getAllHospitals();
            res.json(hospitals);
        } catch (err) {
            res.status(500).json({ message: "Failed to fetch hospitals" });
        }
    });

    // Doctor: Request to join a hospital
    app.post("/api/doctor/request-join", authenticate, async (req: AuthRequest, res) => {
        try {
            const { userId, role } = req.user!;
            if (role !== "doctor") return res.status(403).json({ message: "Doctor access only" });

            const doctor = await storage.getDoctorByUserId(userId);
            if (!doctor) return res.status(404).json({ message: "Doctor profile not found" });

            const { hospitalId } = req.body;
            if (!hospitalId) return res.status(400).json({ message: "Hospital ID required" });

            // Check if already registered
            const staff = await storage.getHospitalStaff(hospitalId);
            if (staff.some(s => s.userId === userId)) {
                return res.status(400).json({ message: "Already associated with this hospital" });
            }

            await storage.addHospitalStaff({
                hospitalId,
                userId,
                doctorId: doctor.id,
                role: "doctor",
                status: "pending"
            });

            res.json({ message: "Join request sent successfully" });
        } catch (err) {
            console.error("Join request error:", err);
            res.status(500).json({ message: "Failed to send join request" });
        }
    });

}
