const API = "http://127.0.0.1:5000";
const user = JSON.parse(localStorage.getItem("user"));

if (!user) window.location.href = "login.html";

const container = document.getElementById("orders-container");

// ==============================
// 🔥 LOAD ORDERS
// ==============================
async function loadOrders() {
    try {
        const res = await fetch(`${API}/orders/user/${user.id}`);
        if (!res.ok) throw new Error("Cannot fetch orders");

        const orders = await res.json();

        if (!orders.length) {
            container.innerHTML = "<p>No orders yet.</p>";
            return;
        }

        // GROUP
        const pending = orders.filter(o => o.status === "pending");
        const delivered = orders.filter(o => o.status === "delivered");
        const cancelled = orders.filter(o => o.status === "cancelled");

        // ==============================
        // SECTION BUILDER
        // ==============================
        function createSection(title, list, type, statusClass) {
            if (!list.length) return "";

            const isHorizontal = type === "horizontal";

            return `
                <div style="margin-bottom:35px;">
                    <h2>${title}</h2>

                    <div class="${isHorizontal ? "horizontal-orders" : "vertical-orders"}">
                        ${list.map(order => `
                            <div class="book-card" style="
                                padding:15px;
                                ${isHorizontal ? "min-width:280px; flex-shrink:0;" : "width:100%;"}
                            ">
                                <h3>Order #${order.order_id}</h3>

                                <p><b>Date:</b> ${new Date(order.created_at).toLocaleString()}</p>
                                <p><b>Total:</b> ₹${parseFloat(order.total).toFixed(2)}</p>

                                <p>
                                    <span class="${statusClass}">
                                        ${order.status}
                                    </span>
                                </p>

                                <hr>

                                ${
                                    order.items && order.items.length
                                        ? order.items.map(item => `
                                            <div style="margin-bottom:8px;">
                                                📚 ${item.title || "Unknown"} — ₹${parseFloat(item.price).toFixed(2)}
                                                <br><small>Seller: ${item.seller || "Unknown"}</small>
                                            </div>
                                        `).join("")
                                        : "<p>No items</p>"
                                }

                                ${
                                    order.status === "pending"
                                        ? `
                                            <button onclick="cancelOrder(${order.order_id})">Cancel</button>
                                            <button onclick="payOrder(${order.order_id})">Pay</button>
                                          `
                                        : ""
                                }
                            </div>
                        `).join("")}
                    </div>
                </div>
            `;
        }

        // ==============================
        // RENDER
        // ==============================
        container.innerHTML =
        createSection("🟡 Pending Orders", pending, "horizontal", "status-pending") +
        createSection("🟢 Delivered Orders", delivered, "horizontal", "status-delivered") +
        createSection("🔴 Cancelled Orders", cancelled, "horizontal", "status-cancelled");

    } catch (err) {
        console.error(err);
        container.innerHTML = "<p>Error loading orders</p>";
    }
}

// ==============================
// CANCEL ORDER
// ==============================
async function cancelOrder(orderId) {
    if (!confirm("Cancel this order?")) return;

    await fetch(`${API}/orders/${orderId}/cancel`, { method: "PUT" });
    loadOrders();
}

// ==============================
// FAKE PAYMENT
// ==============================
async function payOrder(orderId) {
    alert("Payment Successful!");
    await fetch(`${API}/orders/${orderId}/deliver`, { method: "PUT" });
    loadOrders();
}

// ==============================
// INIT
// ==============================
loadOrders();