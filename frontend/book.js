// BACK BUTTON & LOGIN CHECK
window.addEventListener("pageshow", () => {
    if (!localStorage.getItem("user")) window.location.href = "login.html";
});

// User info
const user = JSON.parse(localStorage.getItem("user"));
if (!user) window.location.href = "login.html";
document.getElementById("userName").innerText = "Hi, " + user.username;

function logout() {
    localStorage.removeItem("user");
    window.location.href = "login.html";
}

// API endpoints
const API_BASE = "http://127.0.0.1:5000";
const API_BOOKS = `${API_BASE}/books`;
const API_COMMENTS = `${API_BASE}/comments`;
const API_RATINGS = `${API_BASE}/ratings`;

const bookId = localStorage.getItem("selectedBookId");
if (!bookId) {
    alert("No book selected!");
    window.location.href = "index.html";
}

let replyTo = null;


// LOAD BOOK DETAILS
async function loadBook() {
    try {
        const res = await fetch(`${API_BOOKS}/${bookId}`);
        if (!res.ok) throw new Error("Book not found");

        const book = await res.json();

        const imageUrl = book.image
            ? API_BASE + book.image
            : "https://via.placeholder.com/150";

        document.getElementById("bookDetails").innerHTML = `
            <img src="${imageUrl}"
                 onerror="this.src='https://via.placeholder.com/150'">

            <div class="book-info">
    <h2>${book.title || "No Title"}</h2>
    <p><b>Author:</b> ${book.author || "Unknown"}</p>
    <p><b>Price:</b> ₹${book.price || 0}</p>
    <p><b>Condition:</b> ${book.condition_text || "N/A"}</p>
    <p><b>Category:</b> ${book.category || "General"}</p>

    <!-- 🛒 ADD TO CART BUTTON -->
    <button onclick="addToCart(${book.id})">
        Add to Cart
    </button>
</div>
        `;

        document.getElementById("heroImage").src =
            book.image ? API_BASE + book.image : "https://via.placeholder.com/1200x350";

        document.getElementById("descText").innerText =
            book.description || "No description available.";

        document.getElementById("sellerInfo").innerText =
            "Uploaded by: " + (book.owner || "User");

    } catch (err) {
        console.error(err);
        document.getElementById("bookDetails").innerHTML =
            "<p>Failed to load book details</p>";
    }
}


// COMMENTS
function renderComments(comments, parent = null) {
    return comments
        .filter(c => (c.parent_id || null) == parent)
        .map(c => `
            <div class="comment">
                <p><b>${c.username || "User"}:</b> ${c.text}</p>
                <small>
                    👍 ${c.likes ?? 0} 
                    👎 ${c.dislikes ?? 0}
                    <br>
                    <button onclick="voteComment(${c.id}, 'like')">Like</button>
                    <button onclick="voteComment(${c.id}, 'dislike')">Dislike</button>
                    <button onclick="replyComment(${c.id})">Reply</button>
                    ${c.user_id === user.id ? `<button onclick="editComment(${c.id}, \`${c.text}\`)">Edit</button>` : ""}
                </small>
                <div class="replies">${renderComments(comments, c.id)}</div>
            </div>
        `).join("");
}

async function loadComments() {
    try {
        const res = await fetch(`${API_COMMENTS}/${bookId}`);
        const data = await res.json();

        document.getElementById("commentsList").innerHTML =
            data.length ? renderComments(data) : "<p>No comments yet.</p>";

    } catch (err) {
        console.error(err);
        document.getElementById("commentsList").innerHTML =
            "<p>Cannot load comments</p>";
    }
}

async function addComment() {
    const input = document.getElementById("commentInput");
    if (!input.value.trim()) return;

    try {
        await fetch(`${API_COMMENTS}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                book_id: bookId,
                user_id: user.id,
                text: input.value,
                parent_id: replyTo
            })
        });

        input.value = "";
        replyTo = null;
        await loadComments();

    } catch (err) {
        console.error(err);
        alert("Failed to post comment");
    }
}

function replyComment(commentId) {
    replyTo = commentId;
    document.getElementById("commentInput").focus();
}

async function editComment(id, oldText) {
    const newText = prompt("Edit your comment:", oldText);
    if (!newText || !newText.trim()) return;

    try {
        const res = await fetch(`${API_COMMENTS}/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: newText.trim(),
                user_id: user.id
            })
        });

        const data = await res.json();
        if (!res.ok) return alert(data.message);

        await loadComments();

    } catch (err) {
        console.error(err);
        alert("Failed to edit comment");
    }
}

async function voteComment(id, type) {
    try {
        const res = await fetch(`${API_COMMENTS}/${id}/vote`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: user.id,
                vote: type
            })
        });

        const data = await res.json();

        if (!res.ok) {
            console.error(data.message);
            return;
        }

        await loadComments(); 

    } catch (err) {
        console.error(err);
    }
}


// RATINGS
async function loadRating() {
    try {
        const res = await fetch(`${API_RATINGS}/${bookId}?user_id=${user.id}`);
        const data = await res.json();

        const avg = parseFloat(data.avg) || 0;
        const userRating = data.userRating || 0;

        document.getElementById("avgRating").innerText =
            `Average Rating: ${avg.toFixed(1)}`;

        highlightStars(userRating);

        let userText = document.getElementById("userRatingText");
        if (!userText) {
            userText = document.createElement("p");
            userText.id = "userRatingText";
            document.getElementById("ratingSection").appendChild(userText);
        }

        userText.innerText = userRating
            ? `Your rating: ${userRating} ⭐`
            : "You have not rated yet";

    } catch (err) {
        console.error(err);
    }
}

async function rate(value) {
    try {
        await fetch(`${API_RATINGS}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                book_id: bookId,
                user_id: user.id,
                rating: value
            })
        });

        highlightStars(value);
        await loadRating();

    } catch (err) {
        console.error(err);
        alert("Failed to rate book");
    }
}

function highlightStars(value) {
    const stars = document.querySelectorAll("#stars span");
    stars.forEach((star, index) => {
        star.classList.toggle("active", index < value);
    });
}


//  ADD TO CART 
function addToCart(bookId) {
    const user = JSON.parse(localStorage.getItem("user"));

    fetch("http://127.0.0.1:5000/cart", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            user_id: user.id,
            book_id: bookId
        })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
    })
    .catch(() => alert("Error adding to cart"));
}


// INITIAL LOAD
loadBook();
loadComments();
loadRating();
