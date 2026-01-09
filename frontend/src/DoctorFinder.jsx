import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function DoctorFinder() {
    const [input, setInput] = useState("");
    const [doctor, setDoctor] = useState(null);
    const [loading, setLoading] = useState(false);
    const [booking, setBooking] = useState({ loading: false, success: null, error: null });
    const navigate = useNavigate();

    const handleSearch = async () => {
        if (!input.trim()) return;
        setLoading(true);
        setDoctor(null);
        setBooking({ loading: false, success: null, error: null });

        try {
            const token = localStorage.getItem("token");
            const response = await axios.post(
                "http://localhost:8080/api/recommend",
                { description: input },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setDoctor(response.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleBook = async (day) => {
        setBooking({ loading: true, success: null, error: null });

        try {
            const token = localStorage.getItem("token");
            const response = await axios.post(
                "http://localhost:8080/api/appointments/book",
                { doctorId: doctor.doctor_id, day },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setBooking({ loading: false, success: response.data, error: null });

            // Update schedule locally without re-running AI search
            setDoctor(prevDoctor => ({
                ...prevDoctor,
                schedule: prevDoctor.schedule.map(sch => {
                    if (sch.day === day) {
                        const newBookedCount = sch.bookedCount + 1;
                        const isFull = newBookedCount >= sch.totalCapacity;
                        return {
                            ...sch,
                            bookedCount: newBookedCount,
                            nextSerial: isFull ? null : newBookedCount + 1,
                            status: isFull ? "Full" : "Available"
                        };
                    }
                    return sch;
                })
            }));
        } catch (err) {
            setBooking({ loading: false, success: null, error: err.response?.data?.error || "Booking failed" });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
            {/* Subtle background decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl animate-pulse-subtle"></div>
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-slate-200/50 rounded-full blur-3xl animate-pulse-subtle delay-1000"></div>
            </div>

            {/* Navigation */}
            <nav className="relative bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => navigate("/home")}
                            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                            </svg>
                            <span className="font-medium">Back to Home</span>
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#0f2744] flex items-center justify-center shadow-lg shadow-slate-300/50">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <span className="text-xl font-bold text-slate-800">Find a Doctor</span>
                        </div>
                        <div className="w-24"></div>
                    </div>
                </div>
            </nav>

            {/* Main content */}
            <main className="relative max-w-4xl mx-auto px-6 py-12">
                {/* Search section */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl shadow-slate-200/50">
                    <div className="bg-gradient-to-r from-[#1e3a5f] to-[#0f2744] p-8 text-center">
                        <h1 className="text-3xl font-bold text-white mb-2">MediMatch AI</h1>
                        <p className="text-blue-100">Describe your symptoms to find a specialist</p>
                    </div>

                    <div className="p-8">
                        <div className="relative">
                            <textarea
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1e3a5f] focus:bg-white focus:ring-2 focus:ring-[#1e3a5f]/10 transition-all duration-300 resize-none"
                                rows="3"
                                placeholder="e.g., severe migraine and dizziness since morning..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                            />
                        </div>

                        <button
                            onClick={handleSearch}
                            disabled={loading || !input}
                            className={`w-full mt-6 py-4 rounded-xl font-semibold text-lg tracking-wide transition-all duration-300 transform ${loading || !input
                                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                                : "bg-gradient-to-r from-[#1e3a5f] to-[#0f2744] text-white hover:from-[#2d4a6f] hover:to-[#1a3754] shadow-lg shadow-slate-400/30 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                                }`}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Analyzing...
                                </span>
                            ) : (
                                "Find Specialist"
                            )}
                        </button>
                    </div>
                </div>

                {/* Booking status messages */}
                {booking.success && (
                    <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-center animate-fade-in">
                        ✅ Appointment booked! Serial #{booking.success.serial_no} on {booking.success.day}
                    </div>
                )}
                {booking.error && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-center animate-fade-in">
                        ❌ {booking.error}
                    </div>
                )}

                {/* Doctor result */}
                {doctor && (
                    <div className="mt-8 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl shadow-slate-200/50 animate-fade-in">
                        <div className="p-8">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800 mb-2">{doctor.name}</h2>
                                    <span className="inline-block px-4 py-1.5 rounded-full bg-[#1e3a5f]/10 border border-[#1e3a5f]/20 text-[#1e3a5f] text-sm font-semibold">
                                        {doctor.specialty}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-500 text-sm">Sector</p>
                                    <p className="text-slate-800 font-medium">{doctor.sector || "General"}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-2 h-2 bg-[#1e3a5f] rounded-full"></div>
                                <h3 className="text-lg font-bold text-slate-800">Weekly Schedule & Availability</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {doctor.schedule && doctor.schedule.length > 0 ? (
                                    doctor.schedule.map((dayData, idx) => (
                                        <div
                                            key={idx}
                                            className={`p-5 rounded-2xl border-l-4 transition-all duration-300 ${dayData.status === "Full"
                                                ? "bg-red-50 border-red-500"
                                                : "bg-emerald-50 border-emerald-500 hover:shadow-md"
                                                }`}
                                        >
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="font-bold text-slate-800">{dayData.day}</span>
                                                <span
                                                    className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${dayData.status === "Full"
                                                        ? "bg-red-100 text-red-600"
                                                        : "bg-emerald-100 text-emerald-600"
                                                        }`}
                                                >
                                                    {dayData.status}
                                                </span>
                                            </div>

                                            <div className="space-y-2 text-sm text-slate-600">
                                                <div className="flex justify-between">
                                                    <span>Capacity:</span>
                                                    <span className="font-medium text-slate-800">
                                                        {dayData.bookedCount} / {dayData.totalCapacity}
                                                    </span>
                                                </div>

                                                {dayData.status === "Available" && (
                                                    <div className="mt-4 pt-4 border-t border-slate-200">
                                                        <p className="text-emerald-600 font-bold text-center mb-3">
                                                            Next Serial: #{dayData.nextSerial}
                                                        </p>
                                                        <button
                                                            onClick={() => handleBook(dayData.day)}
                                                            disabled={booking.loading}
                                                            className="w-full py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {booking.loading ? "Booking..." : "Book Appointment"}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-slate-500 italic col-span-2 text-center py-8">
                                        No schedule available for this doctor.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
