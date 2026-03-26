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

async function testCheckIn() {
    console.log("=== Testing Check-in State ===");
    try {
        const hToken = await login("hospital1@gmail.com", "hospital11234");
        const pToken = await login("patient1@gmail.com", "patient11234");

        // 1. Get Patient ID
        const pInfo = await api("/patients/ML-PAT-00001", "GET", undefined, hToken);
        const pId = pInfo.id;
        console.log(`Patient ID: ${pId}`);

        // 2. Clear existing visits for this patient
        // (Just to be sure we're testing the new check-in)
        
        // 3. Check in
        console.log("Checking in...");
        const visit = await api("/visits/check-in", "POST", { patientId: pId, department: "General" }, hToken);
        console.log("Check-in result:", JSON.stringify(visit));

        // 4. Get visits
        console.log("Fetching visits...");
        const visits = await api(`/visits?patientId=${pId}`, "GET", undefined, hToken);
        console.log("Visits list:", JSON.stringify(visits, null, 2));

        const activeVisit = visits.find((v: any) => v.patientId === pId && !v.checkOutTime);
        console.log("Found Active Visit:", !!activeVisit);
        if (!activeVisit) {
            console.error("❌ Active visit NOT FOUND in list!");
            if (visits.length > 0) {
                console.log("First visit checkOutTime:", visits[0].checkOutTime);
                console.log("First visit type:", typeof visits[0].checkOutTime);
            }
        } else {
            console.log("✅ Active visit found.");
        }

    } catch (e) {
        console.error("Test failed:", e);
    }
}

testCheckIn();
