const API_URL = "http://localhost:5000/api/auth";

async function testLogin(username: string, password: string) {
    const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
    });
    console.log(`Login with "${username}": ${response.status} ${response.statusText}`);
}

async function run() {
    await testLogin("hospital1@gmail.com", "hospital11234");
    await testLogin("Hospital1@gmail.com", "hospital11234");
}

run();
