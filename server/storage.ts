import { db } from "./db";
import {
  users, patients, doctors, hospitals, hospitalStaff, appointments,
  prescriptions, medicalRecords, emergencyProfiles, aiSummaries,
  hospitalPatientAccess, visits,
  type User, type InsertUser, type Patient, type InsertPatient,
  type Doctor, type InsertDoctor, type Hospital, type InsertHospital,
  type HospitalStaff, type InsertHospitalStaff,
  type Appointment, type InsertAppointment,
  type Prescription, type InsertPrescription,
  type MedicalRecord, type InsertMedicalRecord,
  type EmergencyProfile, type InsertEmergencyProfile,
  type HospitalPatientAccess, type InsertHospitalPatientAccess,
  type Visit, type InsertVisit,
  type AiSummary,
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export class DatabaseStorage {
  // ---- Users ----
  async getUser(id: number): Promise<User | undefined> {
    const [u] = await db.select().from(users).where(eq(users.id, id));
    return u;
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [u] = await db.select().from(users).where(sql`LOWER(${users.username}) = LOWER(${username})`);
    return u;
  }
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [u] = await db.select().from(users).where(sql`LOWER(${users.email}) = LOWER(${email})`);
    return u;
  }
  async createUser(data: InsertUser): Promise<User> {
    const [u] = await db.insert(users).values(data).returning();
    return u;
  }

  // ---- Patients ----
  async createPatient(data: InsertPatient): Promise<Patient> {
    const [p] = await db.insert(patients).values(data).returning();
    return p;
  }
  async getPatientByUserId(userId: number): Promise<Patient | undefined> {
    const [p] = await db.select().from(patients).where(eq(patients.userId, userId));
    return p;
  }
  async getPatientById(id: number): Promise<Patient | undefined> {
    const [p] = await db.select().from(patients).where(eq(patients.id, id));
    return p;
  }
  async getPatientByHealthId(healthId: string): Promise<(Patient & { user: User }) | undefined> {
    const normalizedHealthId = healthId.replace(/-/g, '').toLowerCase();

    // Fetch matching patient ignoring case and dashes
    const [p] = await db.select().from(patients)
      .where(sql`REPLACE(LOWER(${patients.healthId}), '-', '') = ${normalizedHealthId}`);

    if (!p) return undefined;
    const user = await this.getUser(p.userId);
    if (!user) return undefined;
    return { ...p, user };
  }

  // ---- Emergency Profile ----
  async getEmergencyProfile(patientId: number): Promise<EmergencyProfile | undefined> {
    const [ep] = await db.select().from(emergencyProfiles).where(eq(emergencyProfiles.patientId, patientId));
    return ep;
  }
  async upsertEmergencyProfile(data: InsertEmergencyProfile): Promise<EmergencyProfile> {
    const existing = await this.getEmergencyProfile(data.patientId);
    if (existing) {
      const [ep] = await db.update(emergencyProfiles)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(emergencyProfiles.patientId, data.patientId))
        .returning();
      return ep;
    }
    const [ep] = await db.insert(emergencyProfiles).values(data).returning();
    return ep;
  }

  // ---- Doctors ----
  async createDoctor(data: InsertDoctor): Promise<Doctor> {
    const [d] = await db.insert(doctors).values(data).returning();
    return d;
  }
  async getDoctorByUserId(userId: number): Promise<Doctor | undefined> {
    const [d] = await db.select().from(doctors).where(eq(doctors.userId, userId));
    return d;
  }
  async getDoctorById(id: number): Promise<Doctor | undefined> {
    const [d] = await db.select().from(doctors).where(eq(doctors.id, id));
    return d;
  }
  async getAllDoctors(): Promise<(Doctor & { user: User })[]> {
    const allDocs = await db.select().from(doctors);
    const result = [];
    for (const doc of allDocs) {
      const user = await this.getUser(doc.userId);
      if (user) result.push({ ...doc, user });
    }
    return result;
  }
  async updateDoctorHospital(doctorId: number, hospitalId: number | null, status: string): Promise<Doctor | undefined> {
    const [d] = await db.update(doctors)
      .set({ currentHospitalId: hospitalId, joinStatus: status })
      .where(eq(doctors.id, doctorId))
      .returning();
    return d;
  }
  async getDoctorHospitals(userId: number): Promise<number[]> {
    const staff = await db.select().from(hospitalStaff)
      .where(and(eq(hospitalStaff.userId, userId), eq(hospitalStaff.status, "approved")));
    return staff.map(s => s.hospitalId);
  }

  // ---- Hospitals ----
  async createHospital(data: InsertHospital): Promise<Hospital> {
    const [h] = await db.insert(hospitals).values(data).returning();
    return h;
  }
  async getHospitalByUserId(userId: number): Promise<Hospital | undefined> {
    const [h] = await db.select().from(hospitals).where(eq(hospitals.userId, userId));
    return h;
  }
  async getHospitalById(id: number): Promise<Hospital | undefined> {
    const [h] = await db.select().from(hospitals).where(eq(hospitals.id, id));
    return h;
  }
  async getAllHospitals(): Promise<(Hospital & { user: User })[]> {
    const all = await db.select().from(hospitals);
    const result = [];
    for (const h of all) {
      const user = await this.getUser(h.userId);
      if (user) result.push({ ...h, user });
    }
    return result;
  }

  // ---- Hospital Staff ----
  async addHospitalStaff(data: InsertHospitalStaff): Promise<HospitalStaff> {
    const [s] = await db.insert(hospitalStaff).values(data).returning();
    return s;
  }
  async getHospitalStaff(hospitalId: number): Promise<(HospitalStaff & { user: User })[]> {
    const staff = await db.select().from(hospitalStaff).where(eq(hospitalStaff.hospitalId, hospitalId));
    const result = [];
    for (const s of staff) {
      const user = await this.getUser(s.userId);
      if (user) result.push({ ...s, user });
    }
    return result;
  }
  async getPendingDoctorRequests(hospitalId: number): Promise<(HospitalStaff & { user: User; doctor?: Doctor })[]> {
    const reqs = await db.select().from(hospitalStaff)
      .where(and(eq(hospitalStaff.hospitalId, hospitalId), eq(hospitalStaff.status, "pending")));
    const result = [];
    for (const r of reqs) {
      const user = await this.getUser(r.userId);
      const doc = r.doctorId ? await this.getDoctorById(r.doctorId) : undefined;
      if (user) result.push({ ...r, user, doctor: doc });
    }
    return result;
  }
  async approveStaffRequest(staffId: number): Promise<HospitalStaff | undefined> {
    const [s] = await db.update(hospitalStaff)
      .set({ status: "approved", approvedAt: new Date() })
      .where(eq(hospitalStaff.id, staffId))
      .returning();
    return s;
  }

  // ---- Appointments ----
  async getAppointmentById(id: number): Promise<Appointment | undefined> {
    const [a] = await db.select().from(appointments).where(eq(appointments.id, id));
    return a;
  }
  async createAppointment(data: InsertAppointment): Promise<Appointment> {
    const [a] = await db.insert(appointments).values(data).returning();
    return a;
  }
  async getAppointmentsByPatient(patientId: number): Promise<Appointment[]> {
    return db.select().from(appointments).where(eq(appointments.patientId, patientId));
  }
  async getAppointmentsByHospital(hospitalId: number): Promise<Appointment[]> {
    return db.select().from(appointments).where(eq(appointments.hospitalId, hospitalId));
  }
  async getAppointmentsByDoctor(doctorId: number): Promise<Appointment[]> {
    return db.select().from(appointments).where(eq(appointments.doctorId, doctorId));
  }
  async updateAppointmentStatus(id: number, status: string): Promise<Appointment | undefined> {
    const [a] = await db.update(appointments).set({ status }).where(eq(appointments.id, id)).returning();
    return a;
  }

  // ---- Prescriptions ----
  async createPrescription(data: InsertPrescription): Promise<Prescription> {
    const [p] = await db.insert(prescriptions).values(data).returning();
    return p;
  }
  async getPrescriptionsByPatient(patientId: number): Promise<Prescription[]> {
    return db.select().from(prescriptions).where(eq(prescriptions.patientId, patientId));
  }
  async getPrescriptionsByDoctor(doctorId: number): Promise<Prescription[]> {
    return db.select().from(prescriptions).where(eq(prescriptions.doctorId, doctorId));
  }

  // ---- Medical Records ----
  async createMedicalRecord(data: InsertMedicalRecord): Promise<MedicalRecord> {
    const [r] = await db.insert(medicalRecords).values(data).returning();
    return r;
  }
  async getMedicalRecordsByPatient(patientId: number): Promise<MedicalRecord[]> {
    return db.select().from(medicalRecords).where(eq(medicalRecords.patientId, patientId));
  }

  // ---- AI Summaries ----
  async createAiSummary(patientId: number, summary: string): Promise<AiSummary> {
    const [s] = await db.insert(aiSummaries).values({ patientId, summary }).returning();
    return s;
  }
  async getLatestAiSummary(patientId: number): Promise<AiSummary | undefined> {
    const [s] = await db.select().from(aiSummaries).where(eq(aiSummaries.patientId, patientId));
    return s;
  }

  // ---- Hospital Patient Access ----
  async getHospitalPatientAccessByPatient(patientId: number): Promise<HospitalPatientAccess[]> {
    return db.select().from(hospitalPatientAccess)
      .where(eq(hospitalPatientAccess.patientId, patientId));
  }
  async getHospitalPatientAccess(patientId: number, hospitalId: number): Promise<HospitalPatientAccess | undefined> {
    const [p] = await db.select().from(hospitalPatientAccess)
      .where(and(eq(hospitalPatientAccess.patientId, patientId), eq(hospitalPatientAccess.hospitalId, hospitalId)));
    return p;
  }
  async requestAccess(data: { patientId: number; hospitalId: number; department?: string }): Promise<HospitalPatientAccess> {
    const records = await db.select().from(hospitalPatientAccess)
      .where(and(eq(hospitalPatientAccess.patientId, data.patientId), eq(hospitalPatientAccess.hospitalId, data.hospitalId)));

    if (records.length > 0) {
      await db.update(hospitalPatientAccess)
        .set({ accessStatus: 'pending', revokedAt: null, updatedAt: new Date(), department: data.department || records[0].department })
        .where(and(eq(hospitalPatientAccess.patientId, data.patientId), eq(hospitalPatientAccess.hospitalId, data.hospitalId)));
      return records[0];
    }
    const [p] = await db.insert(hospitalPatientAccess)
      .values({ ...data, accessStatus: 'pending' }).returning();
    return p;
  }
  async approveAccess(patientId: number, hospitalId: number): Promise<HospitalPatientAccess | undefined> {
    const records = await db.select().from(hospitalPatientAccess)
      .where(and(eq(hospitalPatientAccess.patientId, patientId), eq(hospitalPatientAccess.hospitalId, hospitalId)));

    if (records.length > 0) {
      await db.update(hospitalPatientAccess)
        .set({ accessStatus: 'active', grantedAt: new Date(), revokedAt: null, updatedAt: new Date() })
        .where(and(eq(hospitalPatientAccess.patientId, patientId), eq(hospitalPatientAccess.hospitalId, hospitalId)));
      return records[0];
    }
    return undefined;
  }
  async rejectAccess(patientId: number, hospitalId: number): Promise<void> {
    await db.update(hospitalPatientAccess)
      .set({ accessStatus: 'revoked', updatedAt: new Date() })
      .where(and(eq(hospitalPatientAccess.patientId, patientId), eq(hospitalPatientAccess.hospitalId, hospitalId)));
  }
  async preGrantAccess(data: { patientId: number; hospitalId: number; department?: string }): Promise<HospitalPatientAccess> {
    const records = await db.select().from(hospitalPatientAccess)
      .where(and(eq(hospitalPatientAccess.patientId, data.patientId), eq(hospitalPatientAccess.hospitalId, data.hospitalId)));

    if (records.length > 0) {
      await db.update(hospitalPatientAccess)
        .set({ accessStatus: 'active', grantedAt: new Date(), revokedAt: null, updatedAt: new Date(), department: data.department || records[0].department })
        .where(and(eq(hospitalPatientAccess.patientId, data.patientId), eq(hospitalPatientAccess.hospitalId, data.hospitalId)));
      return records[0];
    }

    const [p] = await db.insert(hospitalPatientAccess)
      .values({ ...data, accessStatus: 'active', grantedAt: new Date() }).returning();
    return p;
  }
  async revokeAccess(patientId: number, hospitalId: number): Promise<void> {
    await db.update(hospitalPatientAccess)
      .set({ accessStatus: 'revoked', revokedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(hospitalPatientAccess.patientId, patientId), eq(hospitalPatientAccess.hospitalId, hospitalId)));
  }
  async getPatientAccessPermissions(patientId: number) {
    return this.getHospitalPatientAccessByPatient(patientId);
  }
  async grantAccessPermission(patientId: number, hospitalId: number) {
    return this.approveAccess(patientId, hospitalId);
  }
  async revokeAccessPermission(patientId: number, hospitalId: number) {
    return this.revokeAccess(patientId, hospitalId);
  }

  // ---- Visits ----
  async createVisit(data: InsertVisit): Promise<Visit> {
    const [v] = await db.insert(visits).values(data).returning();
    return v;
  }
  async getVisitById(id: number): Promise<Visit | undefined> {
    const [v] = await db.select().from(visits).where(eq(visits.id, id));
    return v;
  }
  async updateVisitCheckOut(id: number): Promise<Visit | undefined> {
    const [v] = await db.update(visits).set({ checkOutTime: new Date(), visitStatus: 'completed' }).where(eq(visits.id, id)).returning();

    return v;
  }
  async updateCheckoutTime(visitId: number, _time: string): Promise<Visit | undefined> {
    return this.updateVisitCheckOut(visitId);
  }
  async getVisitsByPatient(patientId: number): Promise<Visit[]> {
    return db.select().from(visits).where(eq(visits.patientId, patientId));
  }
  async getVisitsByHospital(hospitalId: number): Promise<(Visit & { patient: Patient & { user: User } })[]> {
    const hVisits = await db.select().from(visits).where(eq(visits.hospitalId, hospitalId));
    const result = [];
    for (const v of hVisits) {
      const [pat] = await db.select().from(patients).where(eq(patients.id, v.patientId));
      if (pat) {
        const user = await this.getUser(pat.userId);
        if (user) result.push({ ...v, patient: { ...pat, user } });
      }
    }
    return result;
  }
  // ---- Updates (Profile Feature) ----
  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const [u] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return u;
  }
  async updatePatient(id: number, data: Partial<InsertPatient>): Promise<Patient | undefined> {
    const [p] = await db.update(patients).set(data).where(eq(patients.id, id)).returning();
    return p;
  }
  async updateDoctor(id: number, data: Partial<InsertDoctor>): Promise<Doctor | undefined> {
    const [d] = await db.update(doctors).set(data).where(eq(doctors.id, id)).returning();
    return d;
  }
  async updateHospital(id: number, data: Partial<InsertHospital>): Promise<Hospital | undefined> {
    const [h] = await db.update(hospitals).set(data).where(eq(hospitals.id, id)).returning();
    return h;
  }
  async getAdminStats(): Promise<{ patients: number; doctors: number; hospitals: number; totalUsers: number }> {
    const allUsers = await db.select().from(users);
    const patientsCount = allUsers.filter(u => u.role === 'patient').length;
    const doctorsCount = allUsers.filter(u => u.role === 'doctor').length;
    const hospitalsCount = allUsers.filter(u => u.role === 'hospital').length;
    return {
      patients: patientsCount,
      doctors: doctorsCount,
      hospitals: hospitalsCount,
      totalUsers: allUsers.length
    };
  }

  async getUsersWithProfiles(): Promise<any[]> {
    const allUsers = await db.select().from(users);
    const result = [];
    for (const u of allUsers) {
      if (u.role === 'patient') {
        const p = await this.getPatientByUserId(u.id);
        result.push({ ...u, patient: p });
      } else if (u.role === 'doctor') {
        const d = await this.getDoctorByUserId(u.id);
        result.push({ ...u, doctor: d });
      } else if (u.role === 'hospital') {
        const h = await this.getHospitalByUserId(u.id);
        result.push({ ...u, hospital: h });
      } else {
        result.push(u);
      }
    }
    return result;
  }
}


export const storage = new DatabaseStorage();
