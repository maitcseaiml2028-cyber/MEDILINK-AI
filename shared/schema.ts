import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // 'patient', 'doctor', 'admin', 'hospital', 'receptionist'
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(new Date()),
});

export const patients = sqliteTable("patients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  healthId: text("health_id").notNull().unique(), // ML-PAT-XXXXX
  dateOfBirth: text("date_of_birth"),
  gender: text("gender"),
  contactNumber: text("contact_number"),
  emergencyContact: text("emergency_contact"),
  faceImagePath: text("face_image_path"),
  faceDescriptor: text("face_descriptor"), // JSON string array of 128 floats
});

export const emergencyProfiles = sqliteTable("emergency_profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  bloodGroup: text("blood_group"),
  diseases: text("diseases"), // comma-separated
  allergies: text("allergies"), // comma-separated
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  currentMedications: text("current_medications"),
  notes: text("notes"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(new Date()),
});

export const doctors = sqliteTable("doctors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  doctorId: text("doctor_id").notNull().unique(), // ML-DOC-XXXXX
  specialization: text("specialization").notNull(),
  licenseNumber: text("license_number").notNull(),
  experience: text("experience"),
  currentHospitalId: integer("current_hospital_id").references(() => hospitals.id),
  joinStatus: text("join_status").default("independent"), // 'independent', 'pending', 'approved'
});

export const hospitals = sqliteTable("hospitals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  hospitalId: text("hospital_id").notNull().unique(), // ML-HOSP-XXXXX
  licenseNumber: text("license_number").notNull(),
  address: text("address"),
  phone: text("phone"),
  specializations: text("specializations"),
});

export const hospitalStaff = sqliteTable("hospital_staff", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  hospitalId: integer("hospital_id").notNull().references(() => hospitals.id),
  userId: integer("user_id").notNull().references(() => users.id),
  doctorId: integer("doctor_id").references(() => doctors.id),
  role: text("role").notNull(), // 'doctor', 'nurse', 'lab', 'receptionist', 'technician'
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected'
  requestedAt: integer("requested_at", { mode: "timestamp" }).default(new Date()),
  approvedAt: integer("approved_at", { mode: "timestamp" }),
});

export const appointments = sqliteTable("appointments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  hospitalId: integer("hospital_id").notNull().references(() => hospitals.id),
  doctorId: integer("doctor_id").references(() => doctors.id),
  date: text("date").notNull(),
  time: text("time").notNull(),
  appointmentToken: text("appointment_token").notNull().unique(),
  qrCode: text("qr_code").notNull(),
  status: text("status").notNull().default("booked"), // 'booked', 'checked-in', 'completed'
  department: text("department"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(new Date()),
});

export const prescriptions = sqliteTable("prescriptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  doctorId: integer("doctor_id").notNull().references(() => doctors.id),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  medications: text("medications").notNull(), // JSON string
  diagnosis: text("diagnosis"),
  instructions: text("instructions"),
  validUntil: text("valid_until"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(new Date()),
});

export const medicalRecords = sqliteTable("medical_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  hospitalId: integer("hospital_id").references(() => hospitals.id),
  doctorId: integer("doctor_id").references(() => doctors.id),
  prescriptionId: integer("prescription_id").references(() => prescriptions.id),
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url"),
  filePath: text("file_path"),         // disk path from multer upload
  reportType: text("report_type"),     // e.g. 'blood-test', 'xray', 'mri', 'ecg', 'other'
  uploadedBy: text("uploaded_by"),     // 'patient' | 'doctor' | 'hospital'
  type: text("type").notNull(), // 'report', 'prescription', 'scan', 'lab'
  extractedText: text("extracted_text"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(new Date()),
});


export const aiSummaries = sqliteTable("ai_summaries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  summary: text("summary").notNull(),
  generatedAt: integer("generated_at", { mode: "timestamp" }).default(new Date()),
});

export const hospitalPatientAccess = sqliteTable("hospital_patient_access", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  hospitalId: integer("hospital_id").notNull().references(() => hospitals.id),
  department: text("department"),
  accessStatus: text("access_status").notNull().default("active"), // 'active', 'revoked', 'pending'
  grantedAt: integer("granted_at", { mode: "timestamp" }),
  revokedAt: integer("revoked_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(new Date()),
});

export const visits = sqliteTable("visits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  hospitalId: integer("hospital_id").notNull().references(() => hospitals.id),
  doctorId: integer("doctor_id").references(() => doctors.id),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  checkInTime: integer("check_in_time", { mode: "timestamp" }).notNull().default(new Date()),
  checkOutTime: integer("check_out_time", { mode: "timestamp" }),
  visitType: text("visit_type").notNull().default("appointment"),
  visitStatus: text("visit_status").notNull().default("active"), // 'active', 'completed'
  department: text("department"),
});

export const temporaryEmergencyRecords = sqliteTable("temporary_emergency_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tempId: text("temp_id").notNull().unique(), // e.g. TEMP-ML-XXXX
  hospitalId: integer("hospital_id").notNull().references(() => hospitals.id),
  doctorId: integer("doctor_id").references(() => doctors.id),
  notes: text("notes"),
  prescriptions: text("prescriptions"), // JSON array or text
  status: text("status").notNull().default("temporary"), // 'temporary' | 'linked'
  linkedPatientId: integer("linked_patient_id").references(() => patients.id),
  createdAt: integer("created_at", { mode: "timestamp" }).default(new Date()),
});

// ---- Insert Schemas ----
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertPatientSchema = createInsertSchema(patients).omit({ id: true });
export const insertDoctorSchema = createInsertSchema(doctors).omit({ id: true });
export const insertHospitalSchema = createInsertSchema(hospitals).omit({ id: true });
export const insertHospitalStaffSchema = createInsertSchema(hospitalStaff).omit({ id: true, requestedAt: true, approvedAt: true });
export const insertAppointmentSchema = createInsertSchema(appointments).omit({ id: true, createdAt: true });
export const insertPrescriptionSchema = createInsertSchema(prescriptions).omit({ id: true, createdAt: true });
export const insertMedicalRecordSchema = createInsertSchema(medicalRecords).omit({ id: true, createdAt: true });
export const insertEmergencyProfileSchema = createInsertSchema(emergencyProfiles).omit({ id: true, updatedAt: true });
export const insertHospitalPatientAccessSchema = createInsertSchema(hospitalPatientAccess).omit({ id: true });
export const insertVisitSchema = createInsertSchema(visits).omit({ id: true });
export const insertTemporaryEmergencyRecordSchema = createInsertSchema(temporaryEmergencyRecords).omit({ id: true });
export const insertAiSummarySchema = createInsertSchema(aiSummaries).omit({ id: true, generatedAt: true });

// ---- Types ----
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Doctor = typeof doctors.$inferSelect;
export type InsertDoctor = z.infer<typeof insertDoctorSchema>;
export type Hospital = typeof hospitals.$inferSelect;
export type InsertHospital = z.infer<typeof insertHospitalSchema>;
export type HospitalStaff = typeof hospitalStaff.$inferSelect;
export type InsertHospitalStaff = z.infer<typeof insertHospitalStaffSchema>;
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Prescription = typeof prescriptions.$inferSelect;
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;
export type MedicalRecord = typeof medicalRecords.$inferSelect;
export type InsertMedicalRecord = z.infer<typeof insertMedicalRecordSchema>;
export type EmergencyProfile = typeof emergencyProfiles.$inferSelect;
export type InsertEmergencyProfile = z.infer<typeof insertEmergencyProfileSchema>;
export type HospitalPatientAccess = typeof hospitalPatientAccess.$inferSelect;
export type InsertHospitalPatientAccess = z.infer<typeof insertHospitalPatientAccessSchema>;
export type Visit = typeof visits.$inferSelect;
export type InsertVisit = z.infer<typeof insertVisitSchema>;
export type TemporaryEmergencyRecord = typeof temporaryEmergencyRecords.$inferSelect;
export type InsertTemporaryEmergencyRecord = z.infer<typeof insertTemporaryEmergencyRecordSchema>;
export type AiSummary = typeof aiSummaries.$inferSelect;

export type UserWithProfile = User & { 
  patient?: Patient & { emergencyProfile?: EmergencyProfile | null }; 
  hospital?: Hospital; 
  doctor?: Doctor 
};

// Custom Request Types
export type RegisterRequest = InsertUser & {
  licenseNumber?: string;
  specialization?: string;
  experience?: string;
  dateOfBirth?: string;
  gender?: string;
  contactNumber?: string;
  emergencyContact?: string;
};
export type LoginRequest = Pick<InsertUser, "username" | "password">;

export * from "./models/chat";
