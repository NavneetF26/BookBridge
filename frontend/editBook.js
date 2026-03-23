// 🔒 LOGIN CHECK
const user = JSON.parse(localStorage.getItem("user"));
if (!user) window.location.href = "login.html";

// API
const API_BASE = "http://127.0.0.1:5000";
const API_BOOKS = `${API_BASE}/books`;

// Get book ID
const bookId = localStorage.getItem("editBookId");
if (!bookId) {
    alert("No book selected!");
    window.location.href = "index.html";
}

// Fields
const title = document.getElementById("title");
const author = document.getElementById("author");
const price = document.getElementById("price");
const condition_text = document.getElementById("condition_text");
const category = document.getElementById("category");
const description = document.getElementById("description");
const imageInput = document.getElementById("imageInput");
const preview = document.getElementById("preview");

// ✅ Condition Dropdown Options
const conditions = ["New", "Like New", "Good", "Fair", "Poor"];
condition_text.innerHTML = conditions.map(c => `<option value="${c}">${c}</option>`).join("");

// Store old image
let oldImage = "";

// ==============================
// 🔥 LOAD EXISTING BOOK DATA
// ==============================
async function loadBook() {
    try {
        const res = await fetch(`${API_BOOKS}/${bookId}`);
        const book = await res.json();

        title.value = book.title || "";
        author.value = book.author || "";
        price.value = book.price || "";
        condition_text.value = book.condition_text || "";
        category.value = book.category || "";
        description.value = book.description || "";

        oldImage = book.image || "";

        // Show existing image
        preview.src = book.image
            ? API_BASE + book.image
            : "https://via.placeholder.com/150";

    } catch (err) {
        console.error(err);
        alert("Failed to load book");
    }
}

// ==============================
// IMAGE PREVIEW
// ==============================
imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => preview.src = e.target.result;
    reader.readAsDataURL(file);
});

// ==============================
// 🔥 UPDATE BOOK
// ==============================
async function updateBook() {
    if (!title.value.trim()) return alert("Title is required");
    if (!price.value.trim() || isNaN(price.value)) return alert("Price must be a number");

    const formData = new FormData();
    formData.append("title", title.value.trim());
    formData.append("author", author.value.trim());
    formData.append("price", parseFloat(price.value));
    formData.append("condition_text", condition_text.value);
    formData.append("category", category.value.trim() || "General");
    formData.append("description", description.value.trim());
    formData.append("user_id", user.id);

    // 🔥 IMPORTANT: send old image if no new one
    formData.append("image", oldImage);

    if (imageInput.files[0]) {
        formData.set("image", imageInput.files[0]); // replace old image
    }

    try {
        const res = await fetch(`${API_BOOKS}/${bookId}`, {
            method: "PUT",
            body: formData
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.message || "Update failed");
            return;
        }

        // ✅ SUCCESS
        alert("Book updated successfully!");

        // 🔥 REDIRECT
        window.location.replace("index.html");

    } catch (err) {
        console.error(err);
        alert("Failed to update book");
    }
}

// ==============================
// INITIAL LOAD
// ==============================
loadBook();