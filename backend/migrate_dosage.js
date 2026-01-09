
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 1,
    queueLimit: 0
});

async function migrate() {
    try {
        const connection = await pool.getConnection();
        console.log("Connected to database.");

        // Check if column exists
        const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'prescription_medicines' AND COLUMN_NAME = 'dosage_pattern'
    `, [process.env.DB_NAME]);

        if (columns.length > 0) {
            console.log("Column 'dosage_pattern' already exists.");
        } else {
            console.log("Adding 'dosage_pattern' column...");
            await connection.query(`
        ALTER TABLE prescription_medicines
        ADD COLUMN dosage_pattern VARCHAR(50) DEFAULT '0+0+0' AFTER medicine_name
      `);
            console.log("Column added successfully.");
        }

        connection.release();
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();
