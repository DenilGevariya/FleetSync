const fs = require("fs");
const path = require("path");
const pool = require("./connection");

async function initDatabase() {
  console.log("🚀 Creating FleetFlow tables...");

  const sql = fs.readFileSync(
    path.join(__dirname, "schema.sql"),
    "utf8"
  );

  try {
    await pool.query(sql);
    console.log("✅ Tables created successfully");
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await pool.end();
  }
}

initDatabase();