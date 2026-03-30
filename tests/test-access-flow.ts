import { db } from "./server/db";
import { users, patients, doctors, hospitals, hospitalPatientAccess } from "./shared/schema";
import { eq, and } from "drizzle-orm";
import { comparePassword } from "./server/auth";

async function api(path: string, method: string, body?: any, token?: string) {
    const res = await fetch(`http://localhost:5000/api${path}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`${method} ${path} failed (${res.status}): ${JSON.stringify(err)}`);
    }
    return res.json();
}

async function login(email: string, pass: string) {
    const res = await api("/auth/login", "POST", { username: email, password: pass });
    return res.token;
}

async function testAccessFlow() {
    console.log("=== Testing Access Flow ===");

    try {
        // 1. Roles: Hospital 1, Doctor 1 (Hosp 1), Patient 1
        const h1Token = await login("hospital1@gmail.com", "hospital11234");
        const d1Token = await login("doctor1@gmail.com", "doctor11234");
        const p1Token = await login("patient1@gmail.com", "patient11234");

        // Get Patient 1 internal ID
        const p1Info = await api("/patients/ML-PAT-00001", "GET", undefined, h1Token);
        const p1Id = p1Info.id;
        console.log(`Patient 1 ID: ${p1Id}`);

        // Revoke any existing access first to start clean
        try {
            await api("/access/revoke", "POST", { hospitalId: 1 }, p1Token);
            console.log("Cleaned up existing access.");
        } catch (e) {}

        // 2. Hospital 1 requests access
        console.log("Hospital 1 requesting access...");
        const reqResult = await api("/access/request", "POST", { patientId: p1Id }, h1Token);
        console.log("Request result:", JSON.stringify(reqResult));

        // 3. Verify status for Hospital 1
        let h1Status = await api(`/access-status/${p1Id}`, "GET", undefined, h1Token);
        console.log("Hospital 1 status (after request):", JSON.stringify(h1Status));
        if (h1Status.permission?.accessStatus !== 'pending') {
            console.error("❌ Hospital 1 should see PENDING status");
        } else {
            console.log("✅ Hospital 1 sees PENDING status");
        }

        // 4. Patient 1 approves access
        console.log("Patient 1 approving access...");
        const grantResult = await api("/access/grant", "POST", { hospitalId: 1 }, p1Token);
        console.log("Grant result:", JSON.stringify(grantResult));

        // 5. Verify status for Hospital 1
        h1Status = await api(`/access-status/${p1Id}`, "GET", undefined, h1Token);
        console.log("Hospital 1 status (after grant):", JSON.stringify(h1Status));
        if (!h1Status.granted) {
            console.error("❌ Hospital 1 should see GRANTED status");
        } else {
            console.log("✅ Hospital 1 sees GRANTED status");
        }

        // 6. Verify status for Doctor 1 (who is in Hospital 1)
        console.log("Doctor 1 checking status...");
        const d1Status = await api(`/access-status/${p1Id}`, "GET", undefined, d1Token);
        console.log("Doctor 1 status:", JSON.stringify(d1Status));
        if (!d1Status.granted) {
            console.error("❌ Doctor 1 should see GRANTED status");
        } else {
            console.log("✅ Doctor 1 sees GRANTED status");
        }

    } catch (error) {
        console.error("Test failed:", error);
    }
}

testAccessFlow();
