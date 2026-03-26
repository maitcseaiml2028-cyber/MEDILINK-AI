import { Router } from "express";
import { db } from "../db";
import { temporaryEmergencyRecords, medicalRecords, visits, hospitals } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { authenticate, AuthRequest } from "../auth";

export const emergencyRecordRoutes = Router();

// Middleware to ensure hospital is authenticated
emergencyRecordRoutes.use(authenticate, async (req, res, next) => {
  const authReq = req as AuthRequest;
  if (!authReq.user || authReq.user.role !== "hospital") {
    return res.status(401).json({ message: "Unauthorized: Only hospitals can access temporary emergency records" });
  }
  
  // Fetch hospital profile and attach to request for downstream routes
  const [hospital] = await db.select().from(hospitals).where(eq(hospitals.userId, authReq.user.userId));
  if (!hospital) {
    return res.status(403).json({ message: "No hospital profile found for this user" });
  }
  
  // Using custom field to pass down the hospital ID
  (req as any).hospitalId = hospital.id;
  next();
});

// 1. Create a new Temporary Emergency Record
emergencyRecordRoutes.post('/create-temp', async (req, res) => {
  try {
    const hospitalId = (req as any).hospitalId;

    // Generate unique Temp ID
    const nanoId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const tempId = `TEMP-ML-${nanoId}`;

    const [newRecord] = await db.insert(temporaryEmergencyRecords).values({
      tempId,
      hospitalId,
      status: "temporary",
    }).returning();

    res.json(newRecord);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to create temporary record" });
  }
});

// 2. Add treatment details to temporary record
emergencyRecordRoutes.post('/add-treatment/:tempId', async (req, res) => {
  try {
    const hospitalId = (req as any).hospitalId;
    const { tempId } = req.params;
    const { notes, prescriptions } = req.body;

    // Validate ownership
    const [record] = await db.select().from(temporaryEmergencyRecords)
      .where(and(eq(temporaryEmergencyRecords.tempId, tempId), eq(temporaryEmergencyRecords.hospitalId, hospitalId)));

    if (!record) {
      return res.status(404).json({ message: "Temporary record not found or unauthorized" });
    }

    if (record.status === "linked") {
      return res.status(400).json({ message: "Cannot edit a record that is already linked to a patient" });
    }

    const [updatedRecord] = await db.update(temporaryEmergencyRecords)
      .set({ notes, prescriptions })
      .where(eq(temporaryEmergencyRecords.id, record.id))
      .returning();

    res.json(updatedRecord);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to add treatment" });
  }
});

// 3. Get active temporary records for this hospital
emergencyRecordRoutes.get('/temp-records', async (req, res) => {
  try {
    const hospitalId = (req as any).hospitalId;

    const records = await db.select().from(temporaryEmergencyRecords)
      .where(and(eq(temporaryEmergencyRecords.hospitalId, hospitalId), eq(temporaryEmergencyRecords.status, "temporary")))
      .orderBy(desc(temporaryEmergencyRecords.createdAt));

    res.json(records);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch records" });
  }
});

// 4. Link temporary record to a verified patient
emergencyRecordRoutes.post('/link-to-patient', async (req, res) => {
  try {
    const hospitalId = (req as any).hospitalId;
    const { tempId, patientId } = req.body;

    if (!tempId || !patientId) return res.status(400).json({ message: "tempId and patientId are required" });

    // Find the record
    const [record] = await db.select().from(temporaryEmergencyRecords)
      .where(and(eq(temporaryEmergencyRecords.tempId, tempId), eq(temporaryEmergencyRecords.hospitalId, hospitalId)));

    if (!record) {
      return res.status(404).json({ message: "Temporary record not found or unauthorized" });
    }

    if (record.status === "linked") {
      return res.status(400).json({ message: "Record is already linked" });
    }

    // 1. Transactionally link
    const [updatedRecord] = await db.update(temporaryEmergencyRecords)
      .set({ 
        status: "linked", 
        linkedPatientId: patientId 
      })
      .where(eq(temporaryEmergencyRecords.id, record.id))
      .returning();

    // 2. Formulate medical description
    const description = `Emergency Treatment Note:\n${record.notes || 'No notes provided.'}\n\nPrescriptions/Treatment:\n${record.prescriptions || 'None'}`;

    // 3. Create permanent Medical Record entry
    await db.insert(medicalRecords).values({
      patientId: patientId,
      hospitalId: hospitalId,
      title: `Emergency Visit [${record.tempId}]`,
      description: description,
      type: "report",
      reportType: "other",
      uploadedBy: "hospital",
    });

    // 4. Create an automatic Visit log
    await db.insert(visits).values({
      patientId: patientId,
      hospitalId: hospitalId,
      visitType: "emergency",
      visitStatus: "completed",
      checkInTime: record.createdAt || new Date(),
      checkOutTime: new Date()
    });

    res.json({ message: "Successfully linked temporary record to patient history", record: updatedRecord });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to link record" });
  }
});
