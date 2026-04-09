// BACK BUTTON PROTECTION
window.addEventListener("pageshow", () => {
    if (!localStorage.getItem("user")) window.location.href = "login.html";
});

// INITIAL CHECK
const user = JSON.parse(localStorage.getItem("user"));
if (!user) window.location.href = "login.html";

document.getElementById("userName").innerText = "Hi, " + user.username;

// Logout
function logout() {
    localStorage.removeItem("user");
    window.location.href = "login.html";
}

const API_BOOKS = "http://127.0.0.1:5000/books";
const API_CART = "http://127.0.0.1:5000/cart";
const BASE_URL = "http://127.0.0.1:5000";

let books = [];
let cartItems = []; // store cart

const container = document.getElementById("books-container");
const search = document.getElementById("search");

// LOAD CART
async function loadCart() {
    try {
        const res = await fetch(`${API_CART}/${user.id}`);
        const data = await res.json();
        cartItems = data || [];

        updateCartCount();
    } catch (err) {
        console.error("Cart load error", err);
    }
}

// UPDATE CART COUNT
function updateCartCount() {
    const count = cartItems.length;
    const bottom = document.getElementById("cart-count");
    if (bottom) bottom.innerText = count;
}

// ADD TO CART
async function addToCart(bookId, btn) {
    // Prevent duplicate
    const alreadyInCart = cartItems.some(item => item.book_id === bookId);
    if (alreadyInCart) {
        btn.innerText = "Added";
        btn.disabled = true;
        return;
    }

    try {
        const res = await fetch(API_CART, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                user_id: user.id,
                book_id: bookId
            })
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.message);

        // Update UI instantly
        btn.innerText = "Added ✔";
        btn.disabled = true;

        // Update cart locally
        cartItems.push({ book_id: bookId });

        updateCartCount();

    } catch (err) {
        console.error(err);
        alert("Error adding to cart");
    }
}

// LOAD BOOKS
async function loadBooks() {
    try {
        const res = await fetch(API_BOOKS);
        if (!res.ok) throw new Error("Cannot fetch books");

        const data = await res.json();
        books = Array.isArray(data) ? data : [];

        displayBooks(books);
    } catch (err) {
        console.error(err);
        container.innerHTML = "<p>Cannot connect to backend</p>";
    }
}

// DISPLAY BOOKS
function displayBooks(data) {
    container.innerHTML = "";

    if (!data || data.length === 0) {
        container.innerHTML = "<p>No books found</p>";
        return;
    }

    const grouped = {};

    data.forEach(book => {
        const cat = book.category || "Others";
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(book);
    });

    Object.keys(grouped).forEach(category => {
        const section = document.createElement("div");

        section.innerHTML = `
            <h2 style="margin:20px 0;">${category}</h2>
            <div class="category-row"></div>
        `;

        const row = section.querySelector(".category-row");

        grouped[category].forEach(book => {
            const card = document.createElement("div");
            card.className = "book-card";

            const showDelete = user.role === "admin" || book.user_id === user.id;

            const imageUrl = book.image
                ? BASE_URL + book.image
                : "https://via.placeholder.com/150";

            // Check if already in cart
            const alreadyInCart = cartItems.some(item => item.book_id === book.id);

            card.innerHTML = `
                <img src="${imageUrl}">
                <div class="book-info">
                    <h3>${book.title}</h3>
                    <p>${book.author || "Unknown"}</p>
                    <p>₹${book.price || 0}</p>

                    ${
                        book.user_id !== user.id
                        ? `<button class="cart-btn" ${alreadyInCart ? "disabled" : ""}>
                            ${alreadyInCart ? "Added ✔" : "🛒 Add to Cart"}
                           </button>`
                        : ""
                    }

                    ${showDelete ? `<button class="delete-btn">Delete</button>` : ""}
                    ${book.user_id === user.id ? `<button class="edit-btn">Edit</button>` : ""}
                </div>
            `;

            // open book
            card.addEventListener("click", (e) => {
                if (!e.target.classList.contains("delete-btn") &&
                    !e.target.classList.contains("edit-btn") &&
                    !e.target.classList.contains("cart-btn")) {
                    openBook(book.id);
                }
            });

            // delete
            const deleteBtn = card.querySelector(".delete-btn");
            if (deleteBtn) {
                deleteBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    deleteBook(book.id);
                });
            }

            // edit
            const editBtn = card.querySelector(".edit-btn");
            if (editBtn) {
                editBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    localStorage.setItem("editBookId", book.id);
                    window.location.href = "editBook.html";
                });
            }

            // CART BUTTON
            const cartBtn = card.querySelector(".cart-btn");
            if (cartBtn) {
                cartBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    addToCart(book.id, cartBtn);
                });
            }

            row.appendChild(card);
        });

        container.appendChild(section);
    });
}

// OPEN BOOK
function openBook(id) {
    localStorage.setItem("selectedBookId", id);
    window.location.href = "book.html";
}

// SEARCH
search.addEventListener("input", () => {
    const value = search.value.toLowerCase();

    const filtered = books.filter(book =>
        (book.title || "").toLowerCase().includes(value) ||
        (book.author || "").toLowerCase().includes(value)
    );

    displayBooks(filtered);
});

// DELETE BOOK
async function deleteBook(id) {
    if (!confirm("Delete this book?")) return;

    try {
        const res = await fetch(`${API_BOOKS}/${id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id })
        });

        const data = await res.json();
        if (!res.ok) return alert(data.message || "Cannot delete book");

        alert("Book deleted!");
        loadBooks();
    } catch (err) {
        console.error(err);
        alert("Failed to delete book");
    }
}

// MY BOOKS
function loadMyBooks() {
    fetch(`${API_BOOKS}?user_id=${user.id}`)
        .then(res => res.json())
        .then(data => displayBooks(data));
}

// MENU FUNCTIONS
function toggleMenu(){
    document.getElementById("sideMenu").classList.toggle("active");
    document.getElementById("overlay").classList.toggle("active");
}

function goTo(page){
    toggleMenu();

    if(page === "books") loadMyBooks();
    if(page === "cart") window.location.href = "cart.html";
    if(page === "orders") window.location.href = "orders.html";
}

// set username in menu safely
if (user && document.getElementById("menuUserName")) {
    document.getElementById("menuUserName").innerText = user.username;
}

// INITIAL LOAD
(async () => {
    await loadCart();   // wait for cart first
    loadBooks();
})();