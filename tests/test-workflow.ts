const API_URL = "http://localhost:5000/api";

async function api(path, method, body, token) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const response = await fetch(`${API_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`${method} ${path} failed (${response.status}): ${JSON.stringify(err)}`);
    }
    return response.json();
}

async function run() {
    console.log("=== MedLink AI Workflow Verification ===");

    try {
        // 1. Login required roles
        console.log("\nLogging in roles...");
        const h1 = await api("/auth/login", "POST", { username: "hospital1@gmail.com", password: "hospital11234" });
        const p1 = await api("/auth/login", "POST", { username: "patient1@gmail.com", password: "patient11234" });
        const d1 = await api("/auth/login", "POST", { username: "doctor1@gmail.com", password: "doctor11234" });
        
        const h1Token = h1.token;
        const p1Token = p1.token;
        const d1Token = d1.token;
        
        const p1Id = p1.user.patient.id;
        const h1Id = h1.user.hospital.id;
        const d1Id = d1.user.doctor.id;

        console.log(`Hospital 1 ID: ${h1Id}, Patient 1 ID: ${p1Id}, Doctor 1 ID: ${d1Id}`);

        // 2. Hospital checks access status
        console.log("\nHospital checking access status...");
        const initialAccess = await api(`/access-status/${p1Id}`, "GET", null, h1Token);
        console.log("Initial access granted:", initialAccess.granted);

        // 3. Hospital requests access
        console.log("\nHospital requesting access...");
        const reqResult = await api("/access/request", "POST", { patientId: p1Id, department: "Cardiology" }, h1Token);
        console.log("Access request status:", reqResult.status);

        // 4. Patient grants access
        console.log("\nPatient granting access...");
        const grantResult = await api("/access/grant", "POST", { hospitalId: h1Id }, p1Token);
        console.log("Grant access status:", grantResult.status);

        // 5. Verify access is now granted
        const verifiedAccess = await api(`/access-status/${p1Id}`, "GET", null, h1Token);
        console.log("Verified access granted:", verifiedAccess.granted);
        if (!verifiedAccess.granted) throw new Error("Access not granted after patient approval");

        // 6. Doctor (linked to hospital) views patient profile
        console.log("\nDoctor viewing patient profile...");
        const patientProfile = await api(`/patients/${p1.user.patient.healthId}`, "GET", null, d1Token);
        console.log("Doctor can see patient name:", patientProfile.user.name);
        if (patientProfile.accessRequired) throw new Error("Doctor still sees restricted profile");

        // 7. Doctor adds prescription
        console.log("\nDoctor adding prescription...");
        const presc = await api("/prescriptions", "POST", {
            patientId: p1Id,
            medications: ["Test Med 10mg"],
            diagnosis: "Initial Checkup",
            instructions: "Take once daily",
            validUntil: "2026-12-31"
        }, d1Token);
        console.log("Prescription created, ID:", presc.id);

        // 8. Patient revokes access
        console.log("\nPatient revoking access...");
        await api("/access/revoke", "POST", { hospitalId: h1Id }, p1Token);
        console.log("Access revoked by patient.");

        // 9. Verify doctor/hospital lost access
        const finalAccess = await api(`/access-status/${p1Id}`, "GET", null, h1Token);
        console.log("Final access granted:", finalAccess.granted);
        if (finalAccess.granted) throw new Error("Access still granted after revocation");

        const restrictedProfile = await api(`/patients/${p1.user.patient.healthId}`, "GET", null, d1Token);
        console.log("Doctor sees restricted profile:", !!restrictedProfile.accessRequired);
        if (!restrictedProfile.accessRequired) throw new Error("Doctor still has full access after revocation");

        console.log("\n=== ✅ ALL WORKFLOW TESTS PASSED! ===");
        process.exit(0);

    } catch (e) {
        console.error("\n❌ WORKFLOW TEST FAILED:");
        console.error(e.message);
        process.exit(1);
    }
}

run();
