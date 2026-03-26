import { db } from "./db";
import { hashPassword } from "./auth";
import {
    users, patients, doctors, hospitals, hospitalStaff,
    appointments, prescriptions, medicalRecords, emergencyProfiles, aiSummaries, visits, hospitalPatientAccess
} from "@shared/schema";

const genId = (prefix: string, n: number) => `${prefix}-${String(n).padStart(5, "0")}`;
const tokenId = () => `TKN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

export async function seedDatabase() {
    // ─── Wipe existing data ───────────────────────────────────────────
    await db.delete(hospitalPatientAccess);
    await db.delete(aiSummaries);
    await db.delete(visits);
    await db.delete(prescriptions);
    await db.delete(medicalRecords);
    await db.delete(emergencyProfiles);
    await db.delete(appointments);
    await db.delete(hospitalStaff);
    await db.delete(doctors);
    await db.delete(patients);
    await db.delete(hospitals);
    await db.delete(users);

    const hashP = async (p: string) => await hashPassword(p);

    // ─── HOSPITALS ─────────────────────────────────────────────────────
    const hospData = [
        { name: "MediCare Hospital", email: "hospital1@gmail.com", pass: "hospital11234", id: genId("ML-HOSP", 1) },
        { name: "City Health Hospital", email: "hospital2@gmail.com", pass: "hospital21234", id: genId("ML-HOSP", 2) }
    ];

    const hospitalRecords: any[] = [];
    for (const h of hospData) {
        const hUser = await db.insert(users).values({
            username: h.email, password: await hashP(h.pass),
            role: "hospital", name: h.name, email: h.email
        }).returning().then(r => r[0]);

        const hosp = await db.insert(hospitals).values({
            userId: hUser.id, hospitalId: h.id,
            licenseNumber: `HOSP-LIC-${h.id}`, address: "City Center", phone: "1800-000-000",
            specializations: "Cardiology, Neurology, Orthopedics, Dermatology, General Medicine"
        }).returning().then(r => r[0]);

        hospitalRecords.push(hosp);
    }

    // ─── DEPARTMENTS & DOCTORS ────────────────────────────────────────
    const doctorData = [
        { email: "doctor1@gmail.com", pass: "doctor11234", dept: "Cardiology", name: "Dr. One" },
        { email: "doctor2@gmail.com", pass: "doctor21234", dept: "Neurology", name: "Dr. Two" },
        { email: "doctor3@gmail.com", pass: "doctor31234", dept: "Orthopedics", name: "Dr. Three" },
        { email: "doctor4@gmail.com", pass: "doctor41234", dept: "Dermatology", name: "Dr. Four" },
        { email: "doctor5@gmail.com", pass: "doctor51234", dept: "General Medicine", name: "Dr. Five" },
    ];

    const doctorRecords: any[] = [];
    for (let i = 0; i < doctorData.length; i++) {
        const d = doctorData[i];
        // Assign first two doctors to hosp1, next three to hosp2
        const assignedHosp = i < 2 ? hospitalRecords[0] : hospitalRecords[1];

        const dUser = await db.insert(users).values({
            username: d.email, password: await hashP(d.pass),
            role: "doctor", name: d.name, email: d.email
        }).returning().then(r => r[0]);

        const doc = await db.insert(doctors).values({
            userId: dUser.id, doctorId: genId("ML-DOC", i + 1),
            specialization: d.dept, licenseNumber: `DOC-LIC-${i + 1}`,
            experience: "5 years", currentHospitalId: assignedHosp.id, joinStatus: "approved"
        }).returning().then(r => r[0]);

        await db.insert(hospitalStaff).values({
            hospitalId: assignedHosp.id, userId: dUser.id, doctorId: doc.id,
            role: "doctor", status: "approved", approvedAt: new Date()
        });

        doctorRecords.push({ doc, user: dUser, hospId: assignedHosp.id, dept: d.dept });
    }

    // ─── PATIENTS + EMERGENCY PROFILES + RECORDS + ACCESS ─────────────────────
    const patientData = [
        { email: "patient1@gmail.com", pass: "patient11234", name: "Patient One", allergies: "Penicillin", diseases: "Hypertension" },
        { email: "patient2@gmail.com", pass: "patient21234", name: "Patient Two", allergies: "Dust", diseases: "Asthma" },
        { email: "patient3@gmail.com", pass: "patient31234", name: "Patient Three", allergies: "Peanuts", diseases: "Diabetes Type 2" },
        { email: "patient4@gmail.com", pass: "patient41234", name: "Patient Four", allergies: "None", diseases: "Arthritis" },
        { email: "patient5@gmail.com", pass: "patient51234", name: "Patient Five", allergies: "Pollen", diseases: "None" }
    ];

    for (let i = 0; i < patientData.length; i++) {
        const p = patientData[i];
        const assignedDoc = doctorRecords[i]; // patient1 -> doctor1, etc.
        const targetHospId = assignedDoc.hospId;

        const pUser = await db.insert(users).values({
            username: p.email, password: await hashP(p.pass),
            role: "patient", name: p.name, email: p.email
        }).returning().then(r => r[0]);

        const healthId = genId("ML-PAT", i + 1);
        const patient = await db.insert(patients).values({
            userId: pUser.id, healthId,
            dateOfBirth: "1990-01-01", gender: "Unknown", contactNumber: "9999999999",
            emergencyContact: "9999999998"
        }).returning().then(r => r[0]);

        // Emergency profile
        await db.insert(emergencyProfiles).values({
            patientId: patient.id, bloodGroup: "O+",
            diseases: p.diseases, allergies: p.allergies,
            emergencyContactName: "Emergency Contact", emergencyContactPhone: "9999999998",
            notes: `Auto-generated for demo.`
        });

        // Grant access
        await db.insert(hospitalPatientAccess).values({
            patientId: patient.id,
            hospitalId: targetHospId,
            accessStatus: "active",
            grantedAt: new Date()
        });

        // 10 Medical records
        for (let j = 0; j < 10; j++) {
            const date = new Date(Date.now() - (10 - j) * 86400000); // Past 10 days
            
            // Add a record
            const r = await db.insert(medicalRecords).values({
                patientId: patient.id, doctorId: assignedDoc.doc.id, hospitalId: targetHospId,
                title: `Demo Diagnosis ${j + 1} - ${assignedDoc.dept}`,
                description: `Consultation for ${p.diseases}`,
                type: "report",
                extractedText: `Diagnosis ${j + 1}: Checkup normal`,
                createdAt: date
            }).returning().then(res => res[0]);

            // Add a prescription
            await db.insert(prescriptions).values({
                patientId: patient.id, doctorId: assignedDoc.doc.id,
                medications: JSON.stringify(["Demo Med 500mg"]),
                diagnosis: `Demo Diagnosis ${j+1}`,
                instructions: `Take 1 daily`,
                validUntil: "2026-12-31",
                createdAt: date
            });
        }
    }

    return {
        message: "✅ Database reset and demo data created successfully!"
    };
}
