const BASE_URL = "http://127.0.0.1:8000";

// make form submit work 
document.getElementById("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    login();
});

async function login() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    const errorEl = document.getElementById("error-message");
    errorEl.textContent = "";

    try {
        const res = await fetch(`${BASE_URL}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });

        if (!res.ok) {
            throw new Error("Invalid credentials");
        }

        const data = await res.json();

        console.log("LOGIN RESPONSE:", data);

        // SAVE TOKEN
        localStorage.setItem("token", data.access_token);

        // SAVE USERNAME 
        localStorage.setItem("username", username);

        // decode JWT payload
        const payload = JSON.parse(
            atob(data.access_token.split(".")[1])
        );

        // SAVE ROLE
        localStorage.setItem("role", payload.role);

        console.log("TOKEN SAVED:", localStorage.getItem("token"));
        console.log("ROLE SAVED:", localStorage.getItem("role"));
        console.log("USERNAME SAVED:", localStorage.getItem("username"));

        // redirect after save 
        window.location.href = "screener.html";

    } catch (err) {
        console.error(err);
        errorEl.textContent = err.message;
    }
}