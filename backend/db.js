// backend/db.js
const mysql = require("mysql2");

// connection pool
const db = mysql.createPool({
    host: "",
    user: "",
    password: "",
    database: "",
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// test connection
db.getConnection((err, connection) => {
    if (err) {
        console.log("❌ DB CONNECTION FAILED:", err);
    } else {
        console.log("✅ MySQL Pool Connected");
        connection.release();
    }
});

module.exports = db;