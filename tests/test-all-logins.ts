// Using built-in fetch

const API_URL = "http://localhost:5000/api/auth";

const accounts = [
    // Hospitals
    { email: "hospital1@gmail.com", pass: "hospital11234", role: "hospital" },
    { email: "hospital2@gmail.com", pass: "hospital21234", role: "hospital" },
    // Doctors
    { email: "doctor1@gmail.com", pass: "doctor11234", role: "doctor" },
    { email: "doctor2@gmail.com", pass: "doctor21234", role: "doctor" },
    { email: "doctor3@gmail.com", pass: "doctor31234", role: "doctor" },
    { email: "doctor4@gmail.com", pass: "doctor41234", role: "doctor" },
    { email: "doctor5@gmail.com", pass: "doctor51234", role: "doctor" },
    // Patients
    { email: "patient1@gmail.com", pass: "patient11234", role: "patient" },
    { email: "patient2@gmail.com", pass: "patient21234", role: "patient" },
    { email: "patient3@gmail.com", pass: "patient31234", role: "patient" },
    { email: "patient4@gmail.com", pass: "patient41234", role: "patient" },
    { email: "patient5@gmail.com", pass: "patient51234", role: "patient" },
];

async function testLogin(account: any) {
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: account.email, password: account.pass }),
        });

        if (!response.ok) {
            const err = await response.json();
            console.error(`❌ FAILED: ${account.email} (${account.role}) - ${response.status}: ${JSON.stringify(err)}`);
            return false;
        }

        const data: any = await response.json();
        if (data.user.role !== account.role) {
            console.error(`❌ FAILED: ${account.email} - Role mismatch: expected ${account.role}, got ${data.user.role}`);
            return false;
        }

        console.log(`✅ SUCCESS: ${account.email} (${account.role})`);
        return true;
    } catch (e: any) {
        console.error(`❌ ERROR: ${account.email} - ${e.message}`);
        return false;
    }
}

async function run() {
    console.log("Starting login verification for all accounts...");
    let successCount = 0;
    for (const acc of accounts) {
        const success = await testLogin(acc);
        if (success) successCount++;
    }

    console.log(`\nVerification complete: ${successCount}/${accounts.length} accounts passed.`);
    if (successCount === accounts.length) {
        console.log("All accounts are working perfectly!");
        process.exit(0);
    } else {
        process.exit(1);
    }
}

run();
