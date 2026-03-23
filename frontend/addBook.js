const user = JSON.parse(localStorage.getItem("user"));
if (!user) window.location.href = "login.html";

const API_BOOKS = "http://127.0.0.1:5000/books";

const title = document.getElementById("title");
const author = document.getElementById("author");
const price = document.getElementById("price");
const condition_text = document.getElementById("condition_text");
const category = document.getElementById("category");
const description = document.getElementById("description");
const imageInput = document.getElementById("imageInput");
const preview = document.getElementById("preview");
const conditions = ["New", "Like New", "Good", "Fair", "Poor"];
condition_text.innerHTML = conditions.map(c => `<option value="${c}">${c}</option>`).join("");

imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => preview.src = e.target.result;
    reader.readAsDataURL(file);
});

async function addBook() {
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

    if (imageInput.files[0]) {
        formData.append("image", imageInput.files[0]);
    }
    try {
        const res = await fetch(API_BOOKS, {
            method: "POST",
            body: formData
        });
        const data = await res.json();
        if (!res.ok) {
            alert(data.message || "Failed to add book");
            return;
        }
        alert("Book added successfully!");
        window.location.replace("index.html");
    } catch (err) {
        console.error(err);
        alert("Failed to add book");
    }
}
