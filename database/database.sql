-- ============================
-- DATABASE
-- ============================
CREATE DATABASE IF NOT EXISTS hospital_rag;
USE hospital_rag;

-- ============================
-- PATIENTS TABLE
-- ============================
CREATE TABLE patients (
    patient_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================
-- DOCTORS TABLE
-- ============================
CREATE TABLE doctors (
    doctor_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    sector VARCHAR(100),
    hospital_name VARCHAR(255),
    hospital_lat DECIMAL(10, 8),
    hospital_lng DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================
-- SPECIALTIES TABLE
-- ============================
CREATE TABLE specialties (
    specialty_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- ============================
-- DOCTOR ↔ SPECIALTY (MANY-TO-MANY)
-- ============================
CREATE TABLE doctor_specialties (
    doctor_id INT NOT NULL,
    specialty_id INT NOT NULL,
    PRIMARY KEY (doctor_id, specialty_id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    FOREIGN KEY (specialty_id) REFERENCES specialties(specialty_id) ON DELETE CASCADE
);

-- ============================
-- DOCTOR KEYWORDS (FOR RAG)
-- ============================
CREATE TABLE doctor_keywords (
    keyword_id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    keyword TEXT NOT NULL,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE
);

-- ============================
-- DOCTOR SCHEDULE
-- ============================
CREATE TABLE doctor_schedules (
    schedule_id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    day ENUM(
        'Monday','Tuesday','Wednesday',
        'Thursday','Friday','Saturday','Sunday'
    ) NOT NULL,
    max_patients INT NOT NULL,
    start_time TIME NOT NULL DEFAULT '09:00:00',
    avg_time_per_patient INT NOT NULL DEFAULT 10, -- in minutes
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    UNIQUE (doctor_id, day)
);

-- ============================
-- APPOINTMENTS TABLE
-- ============================
CREATE TABLE appointments (
    appointment_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    day ENUM(
        'Monday','Tuesday','Wednesday',
        'Thursday','Friday','Saturday','Sunday'
    ) NOT NULL,
    serial_no INT NOT NULL,
    appointment_date DATE,
    status ENUM('Booked','Cancelled','Completed') DEFAULT 'Booked',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    UNIQUE (doctor_id, day, serial_no)
);

-- ============================
-- INDEXES (PERFORMANCE)
-- ============================
CREATE INDEX idx_appointments_doctor_day
ON appointments (doctor_id, day);

CREATE INDEX idx_schedule_doctor_day
ON doctor_schedules (doctor_id, day);

-- ============================
-- PRESCRIPTIONS TABLE (header)
-- ============================
CREATE TABLE prescriptions (
    prescription_id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id INT NOT NULL UNIQUE,
    additional_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE CASCADE
);

-- ============================
-- PRESCRIPTION MEDICINES TABLE
-- ============================
CREATE TABLE prescription_medicines (
    medicine_id INT AUTO_INCREMENT PRIMARY KEY,
    prescription_id INT NOT NULL,
    medicine_name VARCHAR(255) NOT NULL,
    times_per_day INT NOT NULL,
    duration_days INT NOT NULL,
    instructions TEXT,
    FOREIGN KEY (prescription_id) REFERENCES prescriptions(prescription_id) ON DELETE CASCADE
);







USE hospital_rag;

-- ============================
-- INSERT PATIENTS
-- ============================
INSERT INTO patients (username, password, full_name) VALUES
('patient1', '$2b$10$hashedpassword1', 'Rahim Uddin'),
('patient2', '$2b$10$hashedpassword2', 'Karim Ahmed'),
('patient3', '$2b$10$hashedpassword3', 'Ayesha Rahman');

-- ============================
-- INSERT DOCTORS (with hospital locations in Dhaka)
-- ============================
INSERT INTO doctors (username, password, full_name, sector, hospital_name, hospital_lat, hospital_lng) VALUES
('dr_sarah', '$2b$10$hashedpassword1', 'Dr. Sarah Bennett', 'Cardiology', 'Square Hospital', 23.75014600, 90.37455100),
('dr_ayesha', '$2b$10$hashedpassword2', 'Dr. Ayesha Khan', 'Dermatology', 'United Hospital', 23.79442600, 90.41445800),
('dr_james', '$2b$10$hashedpassword3', 'Dr. James Miller', 'Orthopedics', 'Apollo Hospital Dhaka', 23.78126800, 90.41539400),
('dr_emily', '$2b$10$hashedpassword4', 'Dr. Emily Chen', 'General Medicine', 'Labaid Hospital', 23.74858300, 90.39452400);

-- ============================
-- INSERT SPECIALTIES
-- ============================
INSERT INTO specialties (name) VALUES
('Cardiologist'),
('Dermatologist'),
('Orthopedic Surgeon'),
('General Physician');

-- ============================
-- MAP DOCTORS TO SPECIALTIES
-- ============================
INSERT INTO doctor_specialties (doctor_id, specialty_id) VALUES
(1, 1), -- Sarah → Cardiologist
(2, 2), -- Ayesha → Dermatologist
(3, 3), -- James → Orthopedic
(4, 4); -- Emily → General Physician

-- ============================
-- INSERT DOCTOR KEYWORDS (RAG DATA)
-- ============================
INSERT INTO doctor_keywords (doctor_id, keyword) VALUES
(1, 'heart pain'),
(1, 'palpitations'),
(1, 'blood pressure'),
(1, 'chest tight'),

(2, 'skin rash'),
(2, 'acne'),
(2, 'hair loss'),
(2, 'itching'),
(2, 'redness'),

(3, 'bone fracture'),
(3, 'joint pain'),
(3, 'back pain'),
(3, 'knee injury'),

(4, 'fever'),
(4, 'flu'),
(4, 'cough'),
(4, 'headache'),
(4, 'fatigue'),
(4, 'viral');

-- ============================
-- INSERT DOCTOR SCHEDULES
-- ============================

-- Dr. Sarah (Cardio) - 15 min per patient
INSERT INTO doctor_schedules (doctor_id, day, max_patients, start_time, avg_time_per_patient) VALUES
(1, 'Monday', 30, '09:00:00', 15),
(1, 'Wednesday', 30, '09:00:00', 15),
(1, 'Friday', 20, '10:00:00', 15);

-- Dr. Ayesha (Derma) - 12 min per patient
INSERT INTO doctor_schedules (doctor_id, day, max_patients, start_time, avg_time_per_patient) VALUES
(2, 'Tuesday', 25, '09:30:00', 12),
(2, 'Thursday', 25, '09:30:00', 12),
(2, 'Saturday', 15, '10:00:00', 12);

-- Dr. James (Ortho) - 20 min per patient
INSERT INTO doctor_schedules (doctor_id, day, max_patients, start_time, avg_time_per_patient) VALUES
(3, 'Monday', 20, '08:00:00', 20),
(3, 'Thursday', 20, '08:00:00', 20);

-- Dr. Emily (General) - 8 min per patient
INSERT INTO doctor_schedules (doctor_id, day, max_patients, start_time, avg_time_per_patient) VALUES
(4, 'Monday', 40, '08:30:00', 8),
(4, 'Tuesday', 40, '08:30:00', 8),
(4, 'Wednesday', 40, '08:30:00', 8),
(4, 'Thursday', 40, '08:30:00', 8);

-- ============================
-- INSERT APPOINTMENTS
-- ============================
INSERT INTO appointments (
    patient_id,
    doctor_id,
    day,
    serial_no,
    appointment_date,
    status
) VALUES
-- Dr. Sarah
(1, 1, 'Wednesday', 1, '2025-01-15', 'Booked'),
(2, 1, 'Wednesday', 2, '2025-01-15', 'Booked'),
(3, 1, 'Friday', 20, '2025-01-17', 'Booked'),

-- Dr. James
(1, 3, 'Thursday', 1, '2025-01-16', 'Booked'),
(2, 3, 'Thursday', 2, '2025-01-16', 'Booked'),
(3, 3, 'Thursday', 3, '2025-01-16', 'Booked');

