import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

export default function BookAppointment() {
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [booking, setBooking] = useState(null);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [selectedDay, setSelectedDay] = useState(null);
    const [availableSlots, setAvailableSlots] = useState({});
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        fetchDoctors();
    }, []);

    const fetchDoctors = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get("http://localhost:8080/api/doctors", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDoctors(response.data);

            // Fetch availability for each doctor
            for (const doctor of response.data) {
                fetchAvailability(doctor.doctor_id);
            }
        } catch (err) {
            setError("Failed to load doctors");
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailability = async (doctorId) => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`http://localhost:8080/api/doctors/${doctorId}/availability`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAvailableSlots(prev => ({ ...prev, [doctorId]: response.data }));
        } catch (err) {
            console.error("Failed to fetch availability for doctor", doctorId);
        }
    };

    const handleBookAppointment = async (doctorId, day) => {
        setBooking({ doctorId, day });
        setError("");
        setSuccess("");

        try {
            const token = localStorage.getItem("token");
            const response = await axios.post("http://localhost:8080/api/appointments/book",
                { doctor_id: doctorId, day },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setSuccess(`Appointment booked! Serial #${response.data.serial_no} on ${day}`);
            fetchAvailability(doctorId);

            setTimeout(() => {
                navigate("/appointments");
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.error || "Failed to book appointment");
        } finally {
            setBooking(null);
        }
    };

    const getDayColor = (day) => {
        const colors = {
            'Monday': 'from-[#1e3a5f] to-[#2d4a6f]',
            'Tuesday': 'from-[#2d4a6f] to-[#3b5998]',
            'Wednesday': 'from-[#1e3a5f] to-[#0f2744]',
            'Thursday': 'from-[#3b5998] to-[#1e3a5f]',
            'Friday': 'from-[#0f2744] to-[#1e3a5f]',
            'Saturday': 'from-[#1e3a5f] to-[#3b5998]',
            'Sunday': 'from-[#2d4a6f] to-[#1e3a5f]'
        };
        return colors[day] || 'from-slate-500 to-slate-600';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <svg className="animate-spin h-12 w-12 text-[#1e3a5f]" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <p className="text-[#1e3a5f] font-medium">Loading doctors...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl animate-pulse-subtle"></div>
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-slate-200/50 rounded-full blur-3xl animate-pulse-subtle delay-1000"></div>
            </div>

            <header className="relative bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/home" className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center transition-colors">
                            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">Book Appointment</h1>
                            <p className="text-[#1e3a5f] text-sm">Select a doctor and available day</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="relative max-w-6xl mx-auto px-6 py-8">
                {error && (
                    <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-center">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mb-6 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-center">
                        ✅ {success}
                    </div>
                )}

                <div className="grid gap-6">
                    {doctors.map((doctor) => (
                        <div key={doctor.doctor_id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-lg shadow-slate-200/50">
                            {/* Doctor Header */}
                            <div className="p-6 border-b border-slate-100">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1e3a5f] to-[#0f2744] flex items-center justify-center shadow-lg shadow-slate-300/50">
                                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800">{doctor.full_name}</h2>
                                        <p className="text-[#1e3a5f] font-medium">{doctor.specialty || doctor.sector}</p>
                                        {doctor.hospital_name && (
                                            <p className="text-slate-500 text-sm flex items-center gap-1 mt-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                </svg>
                                                {doctor.hospital_name}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Available Days */}
                            <div className="p-6 bg-slate-50">
                                <h3 className="text-slate-600 text-sm font-medium mb-4">Available Days</h3>
                                <div className="flex flex-wrap gap-3">
                                    {availableSlots[doctor.doctor_id]?.map((slot) => (
                                        <button
                                            key={slot.day}
                                            onClick={() => handleBookAppointment(doctor.doctor_id, slot.day)}
                                            disabled={booking !== null || slot.slots_available <= 0}
                                            className={`px-4 py-3 rounded-xl border transition-all duration-300 ${slot.slots_available > 0
                                                ? `bg-gradient-to-r ${getDayColor(slot.day)} text-white border-transparent hover:scale-105 shadow-lg shadow-slate-300/50`
                                                : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                                }`}
                                        >
                                            <div className="font-semibold">{slot.day}</div>
                                            <div className="text-xs opacity-80">
                                                {slot.slots_available > 0 ? `${slot.slots_available} slots` : 'Full'}
                                            </div>
                                        </button>
                                    ))}
                                    {(!availableSlots[doctor.doctor_id] || availableSlots[doctor.doctor_id].length === 0) && (
                                        <p className="text-slate-400 text-sm">No schedule available</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {doctors.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-slate-500">No doctors available</p>
                    </div>
                )}
            </main>
        </div>
    );
}
