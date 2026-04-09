const form = document.getElementById("loginForm");
const toggle = document.getElementById("toggleMode");
const roleBox = document.querySelector(".role-switch");

let isLogin = true;
const API_USERS = "http://127.0.0.1:5000/users";

// ONLY 2 ROLES
let selectedRole = "user";

// INITIAL STATE (LOGIN MODE)
roleBox.style.display = "none";

// ROLE BUTTON CLICK
function setRole(role, btn) {
    selectedRole = role;

    document.querySelectorAll(".role-switch button")
        .forEach(b => b.classList.remove("active"));

    btn.classList.add("active");
}

// TOGGLE LOGIN / REGISTER
toggle.addEventListener("click", () => {
    isLogin = !isLogin;

    // show email only in register
    document.getElementById("email").style.display = isLogin ? "none" : "block";

    // change text
    toggle.innerText = isLogin ? "Register here" : "Login here";
    form.querySelector("button").innerText = isLogin ? "Login" : "Register";
    document.querySelector(".tagline").innerText =
        isLogin ? "Login to continue" : "Create an account";

    // show role buttons only in register
    roleBox.style.display = isLogin ? "none" : "flex";
});

// FORM SUBMIT
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const email = document.getElementById("email").value.trim();

    try {
        if (isLogin) {
            // LOGIN
            const res = await fetch(`${API_USERS}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.message);
                return;
            }

            localStorage.setItem("user", JSON.stringify(data));

            // redirect based on role
            if (data.role === "admin") {
                window.location.href = "admin.html";
            } else {
                window.location.href = "index.html";
            }

        } else {
            // REGISTER
            if (!email) {
                alert("Email required!");
                return;
            }

            const res = await fetch(`${API_USERS}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username,
                    email,
                    password,
                    role: selectedRole
                })
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.message);
                return;
            }

            alert("Registered successfully!");
            toggle.click(); // back to login
        }

    } catch (err) {
        console.error(err);
        alert("Backend not reachable");
    }
});