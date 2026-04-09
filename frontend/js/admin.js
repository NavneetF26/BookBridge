// admin.js 

// Get admin user
const user = JSON.parse(localStorage.getItem("user"));

// Redirect if not admin
if (!user || user.role !== "admin") {
    window.location.href = "index.html";
}

document.getElementById("adminName").innerText = "Admin: " + (user.username || "Unknown");

// GLOBAL DATA
let allUsers = [];
let allBooks = [];
let allOrders = [];

// LOAD DATA
async function loadData() {
    try {
        // USERS
        const usersRes = await fetch("http://127.0.0.1:5000/users");
        allUsers = usersRes.ok ? await usersRes.json() : [];
        if (!usersRes.ok) console.warn("Users endpoint not found:", usersRes.status);

        // BOOKS
        const booksRes = await fetch("http://127.0.0.1:5000/books");
        allBooks = booksRes.ok ? await booksRes.json() : [];
        if (!booksRes.ok) console.warn("Books endpoint not found:", booksRes.status);

        // ORDERS
        const ordersRes = await fetch("http://127.0.0.1:5000/orders");
        allOrders = ordersRes.ok ? await ordersRes.json() : [];
        if (!ordersRes.ok) console.warn("Orders endpoint not found:", ordersRes.status);

        updateStats();
        renderUsers();
        renderBooks();
        renderOrders();
    } catch (err) {
        console.error("Error loading data:", err);
    }
}

// STATS
function updateStats() {
    document.getElementById("userCount").innerText = "👥 " + (allUsers.length || 0);
    document.getElementById("bookCount").innerText = "📚 " + (allBooks.length || 0);
}

// USERS
function renderUsers() {
    const search = (document.getElementById("searchUser").value || "").toLowerCase();
    const role = document.getElementById("filterRole").value;

    const filtered = (allUsers || []).filter(u =>
        (u.username || "").toLowerCase().includes(search) &&
        (!role || u.role === role)
    );

    document.getElementById("users").innerHTML =
        filtered.map(u => {

            const isAdmin = u.role === "admin";
            const isSelf = u.id === user.id;
            return `
                <div class="user-card">
                    <h3>
                        ${u.username || "Unknown"}
                        ${
                            isSelf
                            ? `<span style="
                                background:#2196f3;
                                color:white;
                                padding:2px 8px;
                                border-radius:12px;
                                font-size:12px;
                                margin-left:5px;
                              ">You</span>`
                            : ""
                        }
                    </h3>
                    <p>${u.email || "No email"}</p>
                    <p>
                        <b>${u.role || "user"}</b>
                        ${
                            isAdmin
                            ? `<span style="
                                background:#e53935;
                                color:white;
                                padding:2px 8px;
                                border-radius:12px;
                                font-size:12px;
                                margin-left:5px;
                              ">Admin</span>`
                            : ""
                        }
                    </p>
                    ${
                        !isAdmin
                        ? `
                            <button onclick="makeAdmin(${u.id})">Make Admin</button>
                            <button onclick="deleteUser(${u.id})">Delete</button>
                          `
                        : ""
                    }
                </div>
            `;
        }).join("") || "<p>No users found.</p>";
}

// BOOKS
function renderBooks() {
    const search = (document.getElementById("searchBook").value || "").toLowerCase();
    const cat = document.getElementById("filterCategory").value;

    const filtered = (allBooks || []).filter(b =>
        (b.title || "").toLowerCase().includes(search) &&
        (cat === "All Categories" || b.category === cat)
    );

    document.getElementById("books").innerHTML =
        filtered.map(b => `
            <div class="book-card">
                <img src="http://127.0.0.1:5000${b.image || ''}" alt="${b.title || 'Book'}">
                <div class="book-info">
                    <h3>${b.title || "Untitled"}</h3>
                    <p>${b.author || "Unknown"}</p>
                    <p class="price">₹${b.price != null ? b.price : 0}</p>
                    <span class="badge">${b.category || "General"}</span>
                    <p>Status: <b>${b.status || "available"}</b></p>
                    ${b.status !== "sold" ? `<button onclick="deleteBook(${b.id})">Delete</button>` : ""}
                </div>
            </div>
        `).join("") || "<p>No books found.</p>";
}

// ORDERS
function renderOrders() {
    const container = document.getElementById("orders-container");

    if (!allOrders.length) {
        container.innerHTML = "<p>No orders yet.</p>";
        return;
    }

    const pending = allOrders.filter(o => o.status === "pending");
    const delivered = allOrders.filter(o => o.status === "delivered");
    const cancelled = allOrders.filter(o => o.status === "cancelled");

    function createSection(title, orders, statusClass) {
        if (!orders.length) return "";

        return `
            <div style="margin-bottom:30px;">
                <h2>${title}</h2>

                <div style="display:flex; flex-direction:column; gap:15px;">
                    ${orders.map(order => {

                        const itemsHtml = (order.items || []).map(item => `
                            <div>${item.title || "Unknown"} — ₹${item.price || 0}
                                <small>(Seller: ${item.seller || "Unknown"})</small>
                            </div>
                        `).join("");

                        const actionButtons = (order.status === "pending") ? `
                            <div style="margin-top:8px;">
                                <button onclick="updateOrder(${order.order_id}, 'cancel')">Cancel</button>
                                <button onclick="updateOrder(${order.order_id}, 'deliver')">Deliver</button>
                            </div>
                        ` : "";

                        return `
                            <div class="book-card ${order.status}" style="width:100%;">
                                <h3>Order #${order.order_id}</h3>
                                <p><b>User:</b> ${order.user_username}</p>

                                <p>
                                    <span class="${statusClass}">
                                        ${order.status}
                                    </span>
                                </p>

                                ${itemsHtml}
                                ${actionButtons}
                            </div>
                        `;
                    }).join("")}
                </div>
            </div>
        `;
    }

    container.innerHTML =
        createSection("🟡 Pending Orders", pending, "status-pending") +
        createSection("🟢 Delivered Orders", delivered, "status-delivered") +
        createSection("🔴 Cancelled Orders", cancelled, "status-cancelled");
}

// ORDER ACTIONS
function updateOrder(order_id, action) {
    fetch(`http://127.0.0.1:5000/orders/${order_id}/${action}`, { method: "PUT" })
        .then(res => res.ok ? loadData() : res.json().then(r => console.error(r.message)))
        .catch(err => console.error(`Order ${action} error:`, err));
}

// USERS & BOOK ACTIONS
function deleteUser(targetId) {
    const user = JSON.parse(localStorage.getItem("user"));

    fetch(`http://localhost:5000/users/${targetId}`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            user_id: user.id   
        })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        location.reload();
    })
    .catch(err => console.log(err));
}

function makeAdmin(id) {
    fetch(`http://127.0.0.1:5000/users/${id}/make-admin`, { method: "PUT" })
        .then(() => loadData())
        .catch(err => console.error("Make admin error:", err));
}

function deleteBook(id) {
    if (!confirm("Delete book?")) return;
    fetch(`http://127.0.0.1:5000/books/${id}`, {
        method: "DELETE",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ user_id: user.id })
    }).then(() => loadData())
      .catch(err => console.error("Delete book error:", err));
}

// SEARCH & FILTER EVENTS
document.getElementById("searchUser").addEventListener("input", renderUsers);
document.getElementById("filterRole").addEventListener("change", renderUsers);

document.getElementById("searchBook").addEventListener("input", renderBooks);
document.getElementById("filterCategory").addEventListener("change", renderBooks);

// SECTION SWITCHING
function showSection(section){
    const sections = ['users','books','orders'];

    sections.forEach(s=>{
        document.getElementById(`${s}-section`).style.display =
            (s===section) ? 'block' : 'none';
    });

    // Controls visibility
    document.getElementById("user-controls").style.display =
        (section === "users") ? "flex" : "none";

    document.getElementById("book-controls").style.display =
        (section === "books") ? "flex" : "none";
}

//Home View
function goHome(){
    document.getElementById('users-section').style.display='block';
    document.getElementById('books-section').style.display='block';
    document.getElementById('orders-section').style.display='none';

    // SHOW BOTH SIDE BY SIDE
    document.getElementById("user-controls").style.display="flex";
    document.getElementById("book-controls").style.display="flex";
}

// Logout
function logout() {
    localStorage.removeItem("user");
    window.location.href = "login.html";
}

// INIT
goHome();
loadData();