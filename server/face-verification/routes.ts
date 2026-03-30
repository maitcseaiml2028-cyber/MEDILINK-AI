import { Express } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { authenticate, AuthRequest } from "../auth";
import { storage } from "../storage";
import { db } from "../db";
import { patients } from "@shared/schema";
import { euclideanDistance } from "./utils";
import { z } from "zod";

const uploadsDir = path.join(process.cwd(), "server", "uploads", "faces");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (req, _file, cb) => {
      const unique = `face-${Date.now()}-${Math.round(Math.random() * 1e9)}.png`;
      cb(null, unique);
    }
  }),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit for high-res photos
});

export function registerFaceRoutes(app: Express) {
  // Option 1: Authenticated patient uploading their own face
  app.post("/api/patient/upload-face", authenticate, upload.single("image"), async (req: AuthRequest, res) => {
    try {
      if (!req.user || req.user.role !== "patient") {
        return res.status(403).json({ message: "Only patients can upload their face data." });
      }
      
      const { descriptor } = req.body;
      if (!descriptor) return res.status(400).json({ message: "Missing face descriptor." });

      const patient = await storage.getPatientByUserId(req.user.userId);
      if (!patient) return res.status(404).json({ message: "Patient not found." });

      let parsedDescriptor;
      try {
        parsedDescriptor = JSON.parse(descriptor);
      } catch(e) {
        return res.status(400).json({ message: "Invalid descriptor format." });
      }

      await storage.updatePatient(patient.id, {
        faceImagePath: req.file ? `/uploads/faces/${req.file.filename}` : undefined,
        faceDescriptor: JSON.stringify(parsedDescriptor)
      });

      res.json({ message: "Face uploaded successfully!" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Option 2: Verify a face for Emergency Dashboard
  app.post("/api/patient/verify-face", async (req, res) => {
    try {
      const { descriptor } = req.body;
      if (!descriptor) return res.status(400).json({ message: "Missing face descriptor." });

      const allPatients = await db.select().from(patients);
      
      let bestMatch = null;
      let minDistance = Infinity;

      for (const p of allPatients) {
        if (!p.faceDescriptor) continue;
        try {
          const storedDesc = JSON.parse(p.faceDescriptor);
          const dist = euclideanDistance(descriptor, storedDesc);
          if (dist < minDistance) {
            minDistance = dist;
            bestMatch = p;
          }
        } catch(e) { }
      }

      // 0.6 is typical threshold for face-api.js euclidean distance (euclidean L2 vector distance)
      if (minDistance > 0.6 || !bestMatch) {
         return res.status(404).json({ message: "No patient found. Try another method." });
      }

      // Security Rules: Only show specific data
      const emergencyProfile = await storage.getEmergencyProfile(bestMatch.id);
      const user = await storage.getUser(bestMatch.userId);
      
      const secureData = {
        name: user?.name || "Unknown Patient",
        bloodGroup: emergencyProfile?.bloodGroup || "Unknown",
        allergies: emergencyProfile?.allergies || "None",
        diseases: emergencyProfile?.diseases || "None",
        emergencyContact: bestMatch.emergencyContact || emergencyProfile?.emergencyContactName || "None",
        emergencyContactPhone: emergencyProfile?.emergencyContactPhone || "Unknown"
      };

      res.json({ match: true, patient: secureData, distance: minDistance });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
