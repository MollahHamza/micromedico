import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
const PORT = 8080;
const JWT_SECRET = process.env.JWT_SECRET || "mediplus_secret_key_2024";

app.use(cors());
app.use(express.json());

// ============================================
// DATABASE CONNECTION
// ============================================
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT),
  queueLimit: 0
});

// Test database connection
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log("✅ Database connected successfully!");
    conn.release();
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
  }
}
testConnection();

// ============================================
// GEMINI AI INITIALIZATION
// ============================================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const genModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
const embedModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

// ============================================
// VECTOR STORE FOR RAG
// ============================================
let vectorStore = [];

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Initialize Vector DB from MySQL
async function initVectorDB() {
  try {
    console.log("Initializing Vector Database from MySQL...");

    // Query doctors with their specialties and keywords
    const [doctors] = await pool.query(`
      SELECT 
        d.doctor_id,
        d.full_name,
        d.sector,
        s.name as specialty,
        GROUP_CONCAT(dk.keyword SEPARATOR ', ') as keywords
      FROM doctors d
      LEFT JOIN doctor_specialties ds ON d.doctor_id = ds.doctor_id
      LEFT JOIN specialties s ON ds.specialty_id = s.specialty_id
      LEFT JOIN doctor_keywords dk ON d.doctor_id = dk.doctor_id
      GROUP BY d.doctor_id, d.full_name, d.sector, s.name
    `);

    vectorStore = [];

    for (const doc of doctors) {
      const textToEmbed = `${doc.full_name} is a ${doc.specialty}. Specialized in: ${doc.keywords || ''}.`;
      const result = await embedModel.embedContent(textToEmbed);
      vectorStore.push({
        doctor_id: doc.doctor_id,
        name: doc.full_name,
        specialty: doc.specialty,
        sector: doc.sector,
        keywords: doc.keywords,
        embedding: result.embedding.values
      });
    }

    console.log(`✅ Vector Database Ready! Loaded ${vectorStore.length} doctors.`);
  } catch (err) {
    console.error("❌ Error initializing Vector DB:", err.message);
  }
}
initVectorDB();

// ============================================
// MIDDLEWARE: JWT Authentication
// ============================================
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
}

// Doctor-specific authentication middleware
function authenticateDoctorToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    if (!user.doctor_id) {
      return res.status(403).json({ error: "Doctor access required" });
    }
    req.user = user;
    next();
  });
}

// ============================================
// AUTH ROUTES
// ============================================

// Patient Login
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  try {
    const [rows] = await pool.query(
      "SELECT * FROM patients WHERE username = ?",
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const patient = rows[0];

    // For demo purposes, allow plain password match OR bcrypt match
    // In production, ONLY use bcrypt
    const isValidPassword =
      password === patient.password ||
      (patient.password.startsWith("$2") && await bcrypt.compare(password, patient.password));

    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const token = jwt.sign(
      { patient_id: patient.patient_id, username: patient.username },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      user: {
        patient_id: patient.patient_id,
        username: patient.username,
        full_name: patient.full_name
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Patient Registration
app.post("/api/auth/register", async (req, res) => {
  const { username, password, full_name } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  try {
    // Check if username exists
    const [existing] = await pool.query(
      "SELECT patient_id FROM patients WHERE username = ?",
      [username]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: "Username already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new patient
    const [result] = await pool.query(
      "INSERT INTO patients (username, password, full_name) VALUES (?, ?, ?)",
      [username, hashedPassword, full_name || username]
    );

    const token = jwt.sign(
      { patient_id: result.insertId, username },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      token,
      user: {
        patient_id: result.insertId,
        username,
        full_name: full_name || username
      }
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Doctor Login
app.post("/api/auth/doctor/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  try {
    const [rows] = await pool.query(
      "SELECT * FROM doctors WHERE username = ?",
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const doctor = rows[0];

    // For demo purposes, allow plain password match OR bcrypt match
    // In production, ONLY use bcrypt
    const isValidPassword =
      password === doctor.password ||
      (doctor.password.startsWith("$2") && await bcrypt.compare(password, doctor.password));

    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const token = jwt.sign(
      { doctor_id: doctor.doctor_id, username: doctor.username, role: 'doctor' },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      doctor: {
        doctor_id: doctor.doctor_id,
        username: doctor.username,
        full_name: doctor.full_name,
        sector: doctor.sector
      }
    });
  } catch (err) {
    console.error("Doctor login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ============================================
// DOCTOR ROUTES
// ============================================

// Get doctor's appointments grouped by day
app.get("/api/doctor/appointments", authenticateDoctorToken, async (req, res) => {
  const doctorId = req.user.doctor_id;

  try {
    // Get doctor's schedule
    const [schedules] = await pool.query(
      `SELECT day, max_patients, start_time, avg_time_per_patient 
       FROM doctor_schedules 
       WHERE doctor_id = ?`,
      [doctorId]
    );

    // Get all appointments for this doctor
    const [appointments] = await pool.query(
      `SELECT 
        a.appointment_id,
        a.day,
        a.serial_no,
        a.appointment_date,
        a.status,
        p.full_name as patient_name,
        p.patient_id
       FROM appointments a
       JOIN patients p ON a.patient_id = p.patient_id
       WHERE a.doctor_id = ?
       ORDER BY a.day, a.serial_no`,
      [doctorId]
    );

    // Group appointments by day
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const groupedByDay = {};

    // Initialize with schedule info
    for (const schedule of schedules) {
      groupedByDay[schedule.day] = {
        day: schedule.day,
        max_patients: schedule.max_patients,
        start_time: schedule.start_time,
        avg_time_per_patient: schedule.avg_time_per_patient,
        appointments: []
      };
    }

    // Add appointments to their respective days
    for (const apt of appointments) {
      if (groupedByDay[apt.day]) {
        // Calculate estimated time for this appointment
        const schedule = groupedByDay[apt.day];
        const startTimeParts = schedule.start_time.split(':');
        const startMinutes = parseInt(startTimeParts[0]) * 60 + parseInt(startTimeParts[1]);
        const appointmentMinutes = startMinutes + (apt.serial_no - 1) * schedule.avg_time_per_patient;
        const hours = Math.floor(appointmentMinutes / 60);
        const minutes = appointmentMinutes % 60;
        const estimatedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

        groupedByDay[apt.day].appointments.push({
          appointment_id: apt.appointment_id,
          serial_no: apt.serial_no,
          patient_name: apt.patient_name,
          patient_id: apt.patient_id,
          appointment_date: apt.appointment_date,
          status: apt.status,
          estimated_time: estimatedTime
        });
      }
    }

    // Convert to array sorted by day of week
    const result = daysOfWeek
      .filter(day => groupedByDay[day])
      .map(day => groupedByDay[day]);

    res.json(result);
  } catch (err) {
    console.error("Get doctor appointments error:", err);
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

// Create prescription and mark appointment as completed
app.post("/api/doctor/prescription", authenticateDoctorToken, async (req, res) => {
  const doctorId = req.user.doctor_id;
  const { appointment_id, medicines, additional_notes } = req.body;

  // medicines should be an array of { medicine_name, times_per_day, duration_days, instructions }
  if (!appointment_id || !medicines || !Array.isArray(medicines) || medicines.length === 0) {
    return res.status(400).json({ error: "Appointment ID and at least one medicine are required" });
  }

  // Validate each medicine
  for (const med of medicines) {
    if (!med.medicine_name || !med.times_per_day || !med.duration_days) {
      return res.status(400).json({ error: "Each medicine must have name, times per day, and duration" });
    }
    // Default dosage pattern if not provided
    if (!med.dosage_pattern) {
      // approximate based on times_per_day
      if (med.times_per_day === 1) med.dosage_pattern = "1+0+0";
      else if (med.times_per_day === 2) med.dosage_pattern = "1+0+1";
      else if (med.times_per_day === 3) med.dosage_pattern = "1+1+1";
      else med.dosage_pattern = "1+0+0";
    }
  }

  try {
    // Verify the appointment belongs to this doctor and is 'Booked'
    const [appointments] = await pool.query(
      `SELECT a.*, p.full_name as patient_name 
       FROM appointments a 
       JOIN patients p ON a.patient_id = p.patient_id
       WHERE a.appointment_id = ? AND a.doctor_id = ? AND a.status = 'Booked'`,
      [appointment_id, doctorId]
    );

    if (appointments.length === 0) {
      return res.status(404).json({ error: "Appointment not found or already completed" });
    }

    const appointment = appointments[0];

    // Check if appointment is for today
    const today = new Date();
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayDay = daysOfWeek[today.getDay()];

    if (appointment.day !== todayDay) {
      return res.status(400).json({ error: "Prescriptions can only be written for today's appointments" });
    }

    // Create prescription header
    const [prescriptionResult] = await pool.query(
      `INSERT INTO prescriptions (appointment_id, additional_notes)
       VALUES (?, ?)`,
      [appointment_id, additional_notes || null]
    );

    const prescriptionId = prescriptionResult.insertId;

    // Insert all medicines
    for (const med of medicines) {
      await pool.query(
        `INSERT INTO prescription_medicines (prescription_id, medicine_name, dosage_pattern, times_per_day, duration_days, instructions)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [prescriptionId, med.medicine_name, med.dosage_pattern, med.times_per_day, med.duration_days, med.instructions || null]
      );
    }

    // Update appointment status to Completed
    await pool.query(
      `UPDATE appointments SET status = 'Completed' WHERE appointment_id = ?`,
      [appointment_id]
    );

    res.status(201).json({
      prescription_id: prescriptionId,
      appointment_id,
      medicines,
      additional_notes,
      status: 'Completed',
      message: "Prescription created and appointment marked as completed"
    });
  } catch (err) {
    console.error("Create prescription error:", err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: "Prescription already exists for this appointment" });
    }
    res.status(500).json({ error: "Failed to create prescription" });
  }
});

// ============================================
// PRESCRIPTION ROUTES (Patient)
// ============================================

// Get patient's prescriptions
app.get("/api/prescriptions/my", authenticateToken, async (req, res) => {
  const patientId = req.user.patient_id;

  try {
    // Get prescription headers
    const [prescriptions] = await pool.query(
      `SELECT 
        p.prescription_id,
        p.additional_notes,
        p.created_at,
        a.appointment_date,
        a.day,
        d.full_name as doctor_name,
        d.sector as doctor_sector,
        s.name as specialty
       FROM prescriptions p
       JOIN appointments a ON p.appointment_id = a.appointment_id
       JOIN doctors d ON a.doctor_id = d.doctor_id
       LEFT JOIN doctor_specialties ds ON d.doctor_id = ds.doctor_id
       LEFT JOIN specialties s ON ds.specialty_id = s.specialty_id
       WHERE a.patient_id = ?
       ORDER BY p.created_at DESC`,
      [patientId]
    );

    // For each prescription, get its medicines
    for (const prescription of prescriptions) {
      const [medicines] = await pool.query(
        `SELECT medicine_name, dosage_pattern, times_per_day, duration_days, instructions
         FROM prescription_medicines
         WHERE prescription_id = ?`,
        [prescription.prescription_id]
      );
      prescription.medicines = medicines;
    }

    res.json(prescriptions);
  } catch (err) {
    console.error("Get prescriptions error:", err);
    res.status(500).json({ error: "Failed to fetch prescriptions" });
  }
});

// ============================================
// DOCTOR RECOMMENDATION (RAG) ROUTE
// ============================================
app.post("/api/recommend", authenticateToken, async (req, res) => {
  const { description } = req.body;

  if (!description) {
    return res.status(400).json({ error: "Description is required" });
  }

  try {
    // 1. RAG Retrieval - Find similar doctors
    const userEmbed = await embedModel.embedContent(description);
    const scores = vectorStore.map(doc => ({
      ...doc,
      score: cosineSimilarity(userEmbed.embedding.values, doc.embedding)
    }));
    const topMatches = scores.sort((a, b) => b.score - a.score).slice(0, 3);

    // 2. Gemini Selection - Pick the best match
    const prompt = `
      Act as a medical receptionist.
      Match the best doctor from this list: ${JSON.stringify(topMatches.map(({ embedding, ...d }) => d))}
      Patient Symptom: "${description}"
      Return ONLY JSON: { "doctorId": <id> }
    `;

    const result = await genModel.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, "").trim();
    const { doctorId } = JSON.parse(text);

    // 3. Get doctor info from vectorStore
    const selectedDoctor = vectorStore.find(d => d.doctor_id === doctorId);

    if (!selectedDoctor) {
      return res.status(404).json({ error: "Doctor not found" });
    }

    // 4. Get doctor's schedule from database
    const [schedules] = await pool.query(
      "SELECT day, max_patients FROM doctor_schedules WHERE doctor_id = ?",
      [doctorId]
    );

    // 5. Get current bookings for each day
    const availabilityStatus = await Promise.all(
      schedules.map(async (sch) => {
        const [bookings] = await pool.query(
          `SELECT COUNT(*) as count FROM appointments 
           WHERE doctor_id = ? AND day = ? AND status != 'Cancelled'`,
          [doctorId, sch.day]
        );

        const bookedCount = bookings[0].count;
        const isFull = bookedCount >= sch.max_patients;

        return {
          day: sch.day,
          totalCapacity: sch.max_patients,
          bookedCount: bookedCount,
          nextSerial: isFull ? null : bookedCount + 1,
          status: isFull ? "Full" : "Available"
        };
      })
    );

    res.json({
      doctor_id: selectedDoctor.doctor_id,
      name: selectedDoctor.name,
      specialty: selectedDoctor.specialty,
      sector: selectedDoctor.sector,
      schedule: availabilityStatus
    });

  } catch (err) {
    console.error("Recommendation error:", err);
    res.status(500).json({ error: "Processing failed" });
  }
});

// ============================================
// DOCTOR AVAILABILITY ROUTES
// ============================================
// Get all doctors
app.get("/api/doctors", authenticateToken, async (req, res) => {
  try {
    const [doctors] = await pool.query(
      `SELECT d.doctor_id, d.full_name, d.sector, d.hospital_name, s.name as specialty
       FROM doctors d
       LEFT JOIN doctor_specialties ds ON d.doctor_id = ds.doctor_id
       LEFT JOIN specialties s ON ds.specialty_id = s.specialty_id`
    );
    res.json(doctors);
  } catch (err) {
    console.error("Get doctors error:", err);
    res.status(500).json({ error: "Failed to fetch doctors" });
  }
});

// Get availability for a specific doctor
app.get("/api/doctors/:id/availability", authenticateToken, async (req, res) => {
  const doctorId = req.params.id;
  try {
    const [schedules] = await pool.query(
      "SELECT day, max_patients FROM doctor_schedules WHERE doctor_id = ?",
      [doctorId]
    );

    const availability = await Promise.all(
      schedules.map(async (sch) => {
        const [bookings] = await pool.query(
          `SELECT COUNT(*) as count FROM appointments 
           WHERE doctor_id = ? AND day = ? AND status != 'Cancelled'`,
          [doctorId, sch.day]
        );

        // Count today's appointments if the day matches, but wait, availability is general for recurring days?
        // The simple logic assumes recurring weekly schedule. 
        // We aren't checking specific dates here for the general view, just general capacity per day.
        // But to be accurate for "next available slot", we should probably look ahead.
        // For this simple version, we'll show general slot availability for the next occurrence.

        // Actually, let's keep it simple: Capacity - Bookings for the NEXT occurrence of that day.
        // But the previous implementation logic (in recommend) just counted ALL bookings for that day name?
        // Wait, the appointments table has 'appointment_date'.
        // If we just count by 'day' (ENUM), we might be counting past appointments too if we don't filter by date?
        // The existing logic in 'recommend' (line 567) checks: WHERE doctor_id = ? AND day = ?
        // This seems to aggregate ALL appointments ever for that weekday? That's a bug in the existing recommend logic too if so.
        // But `appointments` has `UNIQUE (doctor_id, day, serial_no)`. 
        // NOTE: The `day` column in `appointments` seems to match the schedule day.
        // If we have unique(doctor, day, serial), it implies the system is designed for a SINGLE WEEK view or reuses serials?
        // If it reuses serials, then old appointments need to be moved to history or something.
        // Let's assume for now we just count 'Booked' status for the current active schedule.

        const bookedCount = bookings[0].count;
        const slotsAvailable = Math.max(0, sch.max_patients - bookedCount);

        return {
          day: sch.day,
          slots_available: slotsAvailable,
          max_patients: sch.max_patients
        };
      })
    );

    res.json(availability);
  } catch (err) {
    console.error("Get availability error:", err);
    res.status(500).json({ error: "Failed to fetch availability" });
  }
});

// ============================================
// APPOINTMENT ROUTES
// ============================================

// Book an appointment
app.post("/api/appointments/book", authenticateToken, async (req, res) => {
  let { doctorId, day } = req.body;
  if (!doctorId && req.body.doctor_id) doctorId = req.body.doctor_id;
  const patientId = req.user.patient_id;

  if (!doctorId || !day) {
    return res.status(400).json({ error: "Doctor ID and day are required" });
  }

  try {
    // Check if the day is valid for this doctor
    const [schedule] = await pool.query(
      "SELECT max_patients FROM doctor_schedules WHERE doctor_id = ? AND day = ?",
      [doctorId, day]
    );

    if (schedule.length === 0) {
      return res.status(400).json({ error: "Doctor is not available on this day" });
    }

    const maxPatients = schedule[0].max_patients;

    // Get current active booking count (non-cancelled)
    const [bookings] = await pool.query(
      `SELECT COUNT(*) as count FROM appointments 
       WHERE doctor_id = ? AND day = ? AND status != 'Cancelled'`,
      [doctorId, day]
    );

    const currentCount = bookings[0].count;

    if (currentCount >= maxPatients) {
      return res.status(400).json({ error: "No slots available for this day" });
    }

    // Check if patient already has an appointment with this doctor on this day
    const [existingAppointment] = await pool.query(
      `SELECT appointment_id FROM appointments 
       WHERE patient_id = ? AND doctor_id = ? AND day = ? AND status = 'Booked'`,
      [patientId, doctorId, day]
    );

    if (existingAppointment.length > 0) {
      return res.status(400).json({ error: "You already have an appointment with this doctor on this day" });
    }

    // Find the next available serial number (considering ALL existing serials, including cancelled)
    const [existingSerials] = await pool.query(
      `SELECT serial_no FROM appointments 
       WHERE doctor_id = ? AND day = ?
       ORDER BY serial_no ASC`,
      [doctorId, day]
    );

    // Find the first gap in serial numbers, or use the next number after the last
    let serialNo = 1;
    const usedSerials = new Set(existingSerials.map(r => r.serial_no));
    while (usedSerials.has(serialNo) && serialNo <= maxPatients) {
      serialNo++;
    }

    if (serialNo > maxPatients) {
      return res.status(400).json({ error: "No serial numbers available for this day" });
    }

    // Calculate the next occurrence of this day
    const today = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDayIndex = days.indexOf(day);
    const currentDayIndex = today.getDay();

    let daysUntilTarget = targetDayIndex - currentDayIndex;
    if (daysUntilTarget <= 0) {
      daysUntilTarget += 7;
    }

    const appointmentDate = new Date(today);
    appointmentDate.setDate(today.getDate() + daysUntilTarget);
    const formattedDate = appointmentDate.toISOString().split('T')[0];

    // Create appointment
    const [result] = await pool.query(
      `INSERT INTO appointments (patient_id, doctor_id, day, serial_no, appointment_date, status)
       VALUES (?, ?, ?, ?, ?, 'Booked')`,
      [patientId, doctorId, day, serialNo, formattedDate]
    );

    res.status(201).json({
      appointment_id: result.insertId,
      doctor_id: doctorId,
      day,
      serial_no: serialNo,
      appointment_date: formattedDate,
      status: 'Booked'
    });

  } catch (err) {
    console.error("Booking error:", err);
    res.status(500).json({ error: "Booking failed" });
  }
});

// Get patient's appointments
app.get("/api/appointments/my", authenticateToken, async (req, res) => {
  const patientId = req.user.patient_id;

  try {
    const [appointments] = await pool.query(
      `SELECT 
        a.appointment_id,
        a.doctor_id,
        a.day,
        a.serial_no,
        a.appointment_date,
        a.status,
        d.full_name as doctor_name,
        d.hospital_name,
        d.hospital_lat,
        d.hospital_lng,
        s.name as specialty,
        ds2.start_time,
        ds2.avg_time_per_patient
       FROM appointments a
       JOIN doctors d ON a.doctor_id = d.doctor_id
       LEFT JOIN doctor_specialties ds ON d.doctor_id = ds.doctor_id
       LEFT JOIN specialties s ON ds.specialty_id = s.specialty_id
       LEFT JOIN doctor_schedules ds2 ON a.doctor_id = ds2.doctor_id AND a.day = ds2.day
       WHERE a.patient_id = ?
       ORDER BY a.appointment_date DESC`,
      [patientId]
    );

    // For each appointment, calculate estimated time based on completed appointments
    for (const apt of appointments) {
      if (apt.status === 'Booked' && apt.start_time && apt.avg_time_per_patient) {
        // Count completed appointments before this serial number for today
        const [completedCount] = await pool.query(
          `SELECT COUNT(*) as completed FROM appointments 
           WHERE doctor_id = ? AND day = ? AND serial_no < ? AND status = 'Completed'
           AND DATE(appointment_date) = DATE(?)`,
          [apt.doctor_id, apt.day, apt.serial_no, apt.appointment_date]
        );

        const completed = completedCount[0]?.completed || 0;
        const waitPosition = apt.serial_no - 1 - completed;

        // Calculate estimated time: start_time + (serial - 1 - completed) * avg_time
        const [hours, minutes] = apt.start_time.split(':').map(Number);
        const startMinutes = hours * 60 + minutes;
        const estimatedMinutes = startMinutes + (waitPosition * apt.avg_time_per_patient);

        const estHours = Math.floor(estimatedMinutes / 60);
        const estMins = estimatedMinutes % 60;
        apt.estimated_time = `${String(estHours).padStart(2, '0')}:${String(estMins).padStart(2, '0')}`;
        apt.queue_position = waitPosition + 1; // 1-based position
        apt.patients_ahead = waitPosition;
      }
    }

    res.json(appointments);
  } catch (err) {
    console.error("Get appointments error:", err);
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

// Cancel an appointment (must be at least 24 hours before)
app.patch("/api/appointments/:id/cancel", authenticateToken, async (req, res) => {
  const appointmentId = req.params.id;
  const patientId = req.user.patient_id;

  try {
    // First, get the appointment to check the date
    const [appointments] = await pool.query(
      `SELECT appointment_id, appointment_date, day 
       FROM appointments 
       WHERE appointment_id = ? AND patient_id = ? AND status = 'Booked'`,
      [appointmentId, patientId]
    );

    if (appointments.length === 0) {
      return res.status(404).json({ error: "Appointment not found or already cancelled" });
    }

    const appointment = appointments[0];
    const appointmentDate = new Date(appointment.appointment_date);
    const now = new Date();

    // Calculate hours until appointment
    const hoursUntilAppointment = (appointmentDate - now) / (1000 * 60 * 60);

    if (hoursUntilAppointment < 24) {
      return res.status(400).json({
        error: "Cannot cancel within 24 hours of the appointment. Please contact the hospital directly."
      });
    }

    // Proceed with cancellation
    const [result] = await pool.query(
      `UPDATE appointments SET status = 'Cancelled' 
       WHERE appointment_id = ? AND patient_id = ? AND status = 'Booked'`,
      [appointmentId, patientId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Appointment not found or already cancelled" });
    }

    res.json({ message: "Appointment cancelled successfully" });
  } catch (err) {
    console.error("Cancel appointment error:", err);
    res.status(500).json({ error: "Failed to cancel appointment" });
  }
});

// ============================================
// HEALTH CHECK
// ============================================
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});