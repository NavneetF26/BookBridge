const form = document.getElementById("loginForm");
const toggle = document.getElementById("toggleMode");
const roleBox = document.querySelector(".role-switch");

let isLogin = true;
const API_USERS = "http://127.0.0.1:5000/users";

let selectedRole = "user";
roleBox.style.display = "none";

function setRole(role, btn) {
    selectedRole = role;

    document.querySelectorAll(".role-switch button")
        .forEach(b => b.classList.remove("active"));

    btn.classList.add("active");
}

toggle.addEventListener("click", () => {
    isLogin = !isLogin;
    document.getElementById("email").style.display = isLogin ? "none" : "block";
    toggle.innerText = isLogin ? "Register here" : "Login here";
    form.querySelector("button").innerText = isLogin ? "Login" : "Register";
    document.querySelector(".tagline").innerText =
        isLogin ? "Login to continue" : "Create an account";
    roleBox.style.display = isLogin ? "none" : "flex";
});

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const email = document.getElementById("email").value.trim();

    try {
        if (isLogin) {
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

            if (data.role === "admin") {
                window.location.href = "admin.html";
            } else {
                window.location.href = "index.html";
            }

        } else {
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
            toggle.click(); 
        }

    } catch (err) {
        console.error(err);
        alert("Backend not reachable");
    }
});
