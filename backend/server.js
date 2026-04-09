const express = require("express");
const cors = require("cors");
const db = require("./db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = 5000;

const uploadFolder = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadFolder)) fs.mkdirSync(uploadFolder);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadFolder),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, Date.now() + ext);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowed = ["image/jpeg", "image/png", "image/jpg"];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error("Only images allowed"));
    }
});

app.use("/uploads", express.static(uploadFolder));

// HELPERS
function isEmpty(v) {
    return !v || v.trim() === "";
}

// REGISTER
app.post("/users/register", async (req, res) => {
    let { username, email, password, role } = req.body;

    if (isEmpty(username) || isEmpty(password)) {
        return res.status(400).json({ message: "Required fields missing" });
    }

    if (!email) email = `${username}_${Date.now()}@temp.com`;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const safeRole = role === "admin" ? "admin" : "user";

        db.query(
            "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
            [username, email, hashedPassword, safeRole],
            (err, result) => {
                if (err) return res.status(500).json({ message: err.sqlMessage });

                res.json({
                    message: "Registered",
                    id: result.insertId
                });
            }
        );
    } catch {
        res.status(500).json({ message: "Error hashing password" });
    }
});



// LOGIN
app.post("/users/login", (req, res) => {
    const { username, password, role } = req.body;

    db.query(
        "SELECT * FROM users WHERE username=? OR email=?",
        [username, username],
        async (err, result) => {
            if (err) return res.status(500).json({ message: err.sqlMessage });
            if (!result.length) {
                return res.status(401).json({ message: "Invalid credentials" });
            }
            const user = result[0];
            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                return res.status(401).json({ message: "Invalid credentials" });
            }
            if (role && user.role !== role) {
                return res.status(403).json({ message: "Wrong role selected" });
            }
            res.json(user);
        }
    );
});



// GET USERS
app.get("/users", (req, res) => {
    db.query(
        "SELECT id, username, email, role FROM users",
        (err, result) => {
            if (err) return res.status(500).json({ message: err.sqlMessage });
            res.json(result);
        }
    );
});

// GET ALL BOOKS
app.get("/books", (req, res) => {
    const { user_id } = req.query;

    let sql = `
        SELECT books.*, users.username AS owner
        FROM books
        LEFT JOIN users ON books.user_id = users.id
    `;

    if (user_id) sql += " WHERE books.user_id = ?";

    db.query(sql, user_id ? [user_id] : [], (err, result) => {
        if (err) return res.status(500).json({ message: err.sqlMessage });
        res.json(result);
    });
});

// GET SINGLE BOOK
app.get("/books/:id", (req, res) => {
    const { id } = req.params;

    db.query(
        `SELECT books.*, users.username AS owner
         FROM books
         LEFT JOIN users ON books.user_id = users.id
         WHERE books.id = ?`,
        [id],
        (err, result) => {
            if (err) return res.status(500).json({ message: err.sqlMessage });
            if (!result.length) return res.status(404).json({ message: "Book not found" });

            res.json(result[0]);
        }
    );
});

// ADD BOOK
app.post("/books", upload.single("image"), (req, res) => {
    const { title, author, price, condition_text, category, description, user_id } = req.body;

    if (isEmpty(title) || !user_id) {
        return res.status(400).json({ message: "Missing fields" });
    }

    const image = req.file ? `/uploads/${req.file.filename}` : null;

    db.query(
        `INSERT INTO books 
        (title, author, price, condition_text, category, description, image, user_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, author, price, condition_text, category, description, image, user_id],
        (err, result) => {
            if (err) return res.status(500).json({ message: err.sqlMessage });
            res.json({ message: "Book added", id: result.insertId });
        }
    );
});

// UPDATE BOOK
app.put("/books/:id", upload.single("image"), (req, res) => {
    const { id } = req.params;

    const {
        title, author, price,
        condition_text, category,
        description, image: oldImage, user_id
    } = req.body;

    if (isEmpty(title) || !user_id) {
        return res.status(400).json({ message: "Missing fields" });
    }

    const image = req.file ? `/uploads/${req.file.filename}` : oldImage;

    db.query(
        `UPDATE books 
         SET title=?, author=?, price=?, condition_text=?, category=?, description=?, image=?, user_id=? 
         WHERE id=?`,
        [title, author, price, condition_text, category, description, image, user_id, id],
        (err) => {
            if (err) return res.status(500).json({ message: err.sqlMessage });
            res.json({ message: "Book updated" });
        }
    );
});

// DELETE BOOK
app.delete("/books/:id", (req, res) => {
    const bookId = req.params.id;
    const { user_id } = req.body;

    db.query("SELECT role FROM users WHERE id=?", [user_id], (err, users) => {
        if (err) return res.status(500).json({ message: err.sqlMessage });
        if (!users.length) return res.status(404).json({ message: "User not found" });

        const role = users[0].role;

        db.query("SELECT user_id FROM books WHERE id=?", [bookId], (err2, books) => {
            if (err2) return res.status(500).json({ message: err2.sqlMessage });
            if (!books.length) return res.status(404).json({ message: "Book not found" });

            if (books[0].user_id !== user_id && role !== "admin") {
                return res.status(403).json({ message: "Not allowed" });
            }

            db.query("DELETE FROM books WHERE id=?", [bookId], (err3) => {
                if (err3) return res.status(500).json({ message: err3.sqlMessage });
                res.json({ message: "Book deleted" });
            });
        });
    });
});

// GET COMMENTS
app.get("/comments/:book_id", (req, res) => {
    const { book_id } = req.params;

    const sql = `
        SELECT 
            comments.id,
            comments.book_id,
            comments.user_id,
            comments.text,
            comments.parent_id,
            comments.created_at,
            users.username,
            COALESCE(SUM(CASE WHEN comment_votes.vote = 'like' THEN 1 ELSE 0 END), 0) AS likes,
            COALESCE(SUM(CASE WHEN comment_votes.vote = 'dislike' THEN 1 ELSE 0 END), 0) AS dislikes
        FROM comments
        LEFT JOIN users ON comments.user_id = users.id
        LEFT JOIN comment_votes ON comments.id = comment_votes.comment_id
        WHERE comments.book_id = ?
        GROUP BY comments.id
        ORDER BY comments.id DESC
    `;

    db.query(sql, [book_id], (err, result) => {
        if (err) return res.status(500).json({ message: err.sqlMessage });
        res.json(result);
    });
});

// ADD COMMENT
app.post("/comments", (req, res) => {
    const { book_id, user_id, text, parent_id } = req.body;

    if (!book_id || !user_id || isEmpty(text)) {
        return res.status(400).json({ message: "Missing fields" });
    }

    db.query(
        "INSERT INTO comments (book_id, user_id, text, parent_id) VALUES (?, ?, ?, ?)",
        [book_id, user_id, text, parent_id || null],
        (err, result) => {
            if (err) return res.status(500).json({ message: err.sqlMessage });
            res.json({ message: "Comment added", id: result.insertId });
        }
    );
});

// EDIT COMMENT
app.put("/comments/:id", (req, res) => {
    const { id } = req.params;
    const { text, user_id } = req.body;

    db.query(
        "UPDATE comments SET text=? WHERE id=? AND user_id=?",
        [text, id, user_id],
        (err, result) => {
            if (err) return res.status(500).json({ message: err.sqlMessage });

            if (!result.affectedRows) {
                return res.status(403).json({ message: "Not allowed" });
            }

            res.json({ message: "Comment updated" });
        }
    );
});

// VOTE (LIKE / DISLIKE)
app.put("/comments/:id/vote", (req, res) => {
    const { id } = req.params;
    const { user_id, vote } = req.body;

    if (!user_id || !vote) {
        return res.status(400).json({ message: "Missing data" });
    }

    db.query(
        "SELECT * FROM comment_votes WHERE comment_id=? AND user_id=?",
        [id, user_id],
        (err, results) => {
            if (err) return res.status(500).json({ message: err.sqlMessage });

            if (!results.length) {
                db.query(
                    "INSERT INTO comment_votes (comment_id, user_id, vote) VALUES (?, ?, ?)",
                    [id, user_id, vote],
                    (err2) => {
                        if (err2) return res.status(500).json({ message: err2.sqlMessage });
                        res.json({ message: "Vote added" });
                    }
                );
            } else {
                const existing = results[0].vote;

                if (existing === vote) {
                    return res.json({ message: "Already voted" });
                }

                db.query(
                    "UPDATE comment_votes SET vote=? WHERE comment_id=? AND user_id=?",
                    [vote, id, user_id],
                    (err3) => {
                        if (err3) return res.status(500).json({ message: err3.sqlMessage });
                        res.json({ message: "Vote updated" });
                    }
                );
            }
        }
    );
});


// RATINGS
app.get("/ratings/:book_id", (req, res) => {
    const { book_id } = req.params;
    const { user_id } = req.query;

    db.query("SELECT AVG(rating) AS avg FROM ratings WHERE book_id=?", [book_id], (err, avg) => {
        if (err) return res.status(500).json({ message: err.sqlMessage });

        db.query(
            "SELECT rating FROM ratings WHERE book_id=? AND user_id=?",
            [book_id, user_id || 0],
            (err2, userRating) => {
                if (err2) return res.status(500).json({ message: err2.sqlMessage });

                res.json({
                    avg: avg[0].avg || 0,
                    userRating: userRating.length ? userRating[0].rating : 0
                });
            }
        );
    });
});

app.post("/ratings", (req, res) => {
    const { book_id, user_id, rating } = req.body;

    db.query(
        `INSERT INTO ratings (book_id, user_id, rating)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE rating=?`,
        [book_id, user_id, rating, rating],
        (err) => {
            if (err) return res.status(500).json({ message: err.sqlMessage });
            res.json({ message: "Rating saved" });
        }
    );
});

// ADD TO CART
app.post("/cart", (req, res) => {
    const { user_id, book_id } = req.body;

    if (!user_id || !book_id) {
        return res.status(400).json({ message: "Missing data" });
    }

    db.query(
        "SELECT * FROM cart WHERE user_id=? AND book_id=?",
        [user_id, book_id],
        (err, existing) => {
            if (err) return res.status(500).json({ message: err.sqlMessage });

            if (existing.length) {
                return res.json({ message: "Already in cart" });
            }

            db.query(
                "INSERT INTO cart (user_id, book_id) VALUES (?, ?)",
                [user_id, book_id],
                (err2) => {
                    if (err2) return res.status(500).json({ message: err2.sqlMessage });
                    res.json({ message: "Added to cart" });
                }
            );
        }
    );
});

// GET CART
app.get("/cart/:user_id", (req, res) => {
    const { user_id } = req.params;

    const sql = `
        SELECT 
            cart.id AS cart_id,
            books.*
        FROM cart
        JOIN books ON cart.book_id = books.id
        WHERE cart.user_id = ?
        ORDER BY cart.id DESC
    `;

    db.query(sql, [user_id], (err, result) => {
        if (err) return res.status(500).json({ message: err.sqlMessage });
        res.json(result);
    });
});

// REMOVE FROM CART
app.delete("/cart/:id", (req, res) => {
    const { id } = req.params;

    db.query(
        "DELETE FROM cart WHERE id=?",
        [id],
        (err, result) => {
            if (err) return res.status(500).json({ message: err.sqlMessage });

            if (!result.affectedRows) {
                return res.status(404).json({ message: "Item not found" });
            }

            res.json({ message: "Removed from cart" });
        }
    );
});

app.delete("/users/:id", (req, res) => {
    const targetId = req.params.id;
    const { user_id } = req.body; 

    if (!user_id) {
        return res.status(400).json({ message: "User missing" });
    }

    db.query(
        "SELECT id, role FROM users WHERE id IN (?, ?)",
        [targetId, user_id],
        (err, users) => {
            if (err) return res.status(500).json({ message: err.sqlMessage });

            if (users.length < 2) {
                return res.status(404).json({ message: "User not found" });
            }

            const targetUser = users.find(u => u.id == targetId);
            const actingUser = users.find(u => u.id == user_id);

            if (actingUser.role !== "admin") {
                return res.status(403).json({ message: "Only admin allowed" });
            }

            if (targetUser.role === "admin") {
                return res.status(403).json({ message: "Cannot delete another admin" });
            }

            db.query(
                "DELETE FROM users WHERE id = ?",
                [targetId],
                (err2) => {
                    if (err2) return res.status(500).json({ message: "Delete failed" });
                    res.json({ message: "User deleted" });
                }
            );
        }
    );
});

app.put("/users/:id/make-admin", (req, res) => {
    const { id } = req.params;

    db.query(
        "UPDATE users SET role = 'admin' WHERE id = ?",
        [id],
        (err) => {
            if (err) return res.status(500).json({ message: "Error updating role" });
            res.json({ message: "User promoted" });
        }
    );
});

// PLACE ORDER 
app.post("/orders", (req, res) => {
    const { user_id } = req.body;

    if (!user_id) {
        return res.status(400).json({ message: "User missing" });
    }

    db.query(
        `SELECT books.id AS book_id, books.price 
         FROM cart 
         JOIN books ON cart.book_id = books.id
         WHERE cart.user_id = ?`,
        [user_id],
        (err, items) => {

            if (err) {
                console.log("FETCH ERROR:", err);
                return res.status(500).json({ message: "Error fetching cart" });
            }

            if (!items.length) {
                return res.status(400).json({ message: "Cart empty" });
            }

            const total = items.reduce((sum, item) => {
                return sum + Number(item.price || 0);
            }, 0);

            console.log("TOTAL:", total);
            console.log("ITEMS:", items); 

            db.query(
                "INSERT INTO orders (user_id, total) VALUES (?, ?)",
                [user_id, total],
                (err, result) => {

                    if (err) {
                        console.log("ORDER INSERT ERROR:", err);
                        return res.status(500).json({ message: "Order failed" });
                    }

                    const order_id = result.insertId;
                    
                    const values = items.map(i => [
                        order_id,
                        i.book_id,  
                        Number(i.price || 0)
                    ]);

                    db.query(
                        "INSERT INTO order_items (order_id, book_id, price) VALUES ?",
                        [values],
                        (err) => {

                            if (err) {
                                console.log("ITEM INSERT ERROR:", err);
                                return res.status(500).json({ message: "Items failed" });
                            }

                            db.query(
                                "DELETE FROM cart WHERE user_id = ?",
                                [user_id],
                                (err) => {
                                    if (err) console.log("CART CLEAR ERROR:", err);

                                    res.json({ message: "Order placed!" });
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});



// GET ORDERS
app.get("/orders", (req, res) => {
    const sql = `
        SELECT 
            o.id AS order_id,
            o.user_id,
            u.username AS user_username,
            o.total,
            o.status,
            o.created_at,
            b.id AS book_id,
            b.title AS book_title,
            b.user_id AS seller_id,
            s.username AS seller_name,
            oi.price
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN books b ON oi.book_id = b.id
        LEFT JOIN users s ON b.user_id = s.id
        ORDER BY o.id DESC, oi.id ASC
    `;

    db.query(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ message: err.sqlMessage });

    
        const ordersMap = {};

        rows.forEach(row => {
            if (!ordersMap[row.order_id]) {
                ordersMap[row.order_id] = {
                    order_id: row.order_id,
                    user_id: row.user_id,
                    user_username: row.user_username,
                    total: parseFloat(row.total) || 0,
                    status: row.status || "pending",
                    created_at: row.created_at,
                    items: []
                };
            }

            if (row.book_id) {
                ordersMap[row.order_id].items.push({
                    book_id: row.book_id,
                    title: row.book_title,
                    price: parseFloat(row.price) || 0,
                    seller_id: row.seller_id,
                    seller: row.seller_name || "Unknown"
                });
            }
        });

        res.json(Object.values(ordersMap));
    });
});

app.get("/orders/user/:user_id", (req, res) => {
    const { user_id } = req.params;

    const sql = `
        SELECT 
            o.id AS order_id,
            o.total,
            o.status,
            o.created_at,
            b.id AS book_id,
            b.title AS book_title,
            b.user_id AS seller_id,
            u.username AS seller_name,
            oi.price
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN books b ON oi.book_id = b.id
        LEFT JOIN users u ON b.user_id = u.id
        WHERE o.user_id = ?
        ORDER BY o.id DESC, oi.id ASC
    `;

    db.query(sql, [user_id], (err, rows) => {
        if (err) return res.status(500).json({ message: err.sqlMessage });

        const ordersMap = {};

        rows.forEach(row => {
            if (!ordersMap[row.order_id]) {
                ordersMap[row.order_id] = {
                    order_id: row.order_id,
                    total: parseFloat(row.total) || 0,
                    status: row.status || "pending",
                    created_at: row.created_at,
                    items: []
                };
            }

            if (row.book_id) {
                ordersMap[row.order_id].items.push({
                    book_id: row.book_id,
                    title: row.book_title,
                    price: parseFloat(row.price) || 0,
                    seller_id: row.seller_id,
                    seller: row.seller_name || "Unknown"
                });
            }
        });

        res.json(Object.values(ordersMap));
    });
});

// CANCEL ORDER
app.put("/orders/:id/cancel", (req, res) => {
    const { id } = req.params;

    db.query(
        "UPDATE orders SET status='cancelled' WHERE id=? AND status='pending'",
        [id],
        (err, result) => {
            if (err) return res.status(500).json({ message: err.sqlMessage });
            if (!result.affectedRows) return res.status(400).json({ message: "Cannot cancel" });
            res.json({ message: "Order cancelled" });
        }
    );
});

// DELIVER ORDER
app.put("/orders/:id/deliver", (req, res) => {
    const { id } = req.params;

    db.query(
        "UPDATE orders SET status='delivered' WHERE id=? AND status='pending'",
        [id],
        (err, result) => {
            if (err) return res.status(500).json({ message: err.sqlMessage });
            if (!result.affectedRows) return res.status(400).json({ message: "Cannot deliver" });
            res.json({ message: "Order delivered" });
        }
    );
});


// START SERVER
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
