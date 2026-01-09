import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function DoctorDashboard() {
    const [doctor, setDoctor] = useState(null);
    const [scheduleData, setScheduleData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const storedDoctor = localStorage.getItem("doctor");
        if (storedDoctor) {
            setDoctor(JSON.parse(storedDoctor));
        }
        fetchAppointments();
    }, []);

    const fetchAppointments = async () => {
        try {
            const token = localStorage.getItem("doctorToken");
            if (!token) {
                navigate("/doctor/signin");
                return;
            }

            const response = await axios.get("http://localhost:8080/api/doctor/appointments", {
                headers: { Authorization: `Bearer ${token}` }
            });

            setScheduleData(response.data);
        } catch (err) {
            if (err.response?.status === 401 || err.response?.status === 403) {
                localStorage.removeItem("doctorToken");
                localStorage.removeItem("doctor");
                navigate("/doctor/signin");
            } else {
                setError("Failed to load appointments");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("doctorToken");
        localStorage.removeItem("doctor");
        navigate("/doctor/signin");
    };

    const handleDayClick = (day) => {
        navigate(`/doctor/day/${day}`);
    };

    const getDayIcon = (day) => {
        const icons = {
            'Monday': '📅',
            'Tuesday': '📆',
            'Wednesday': '🗓️',
            'Thursday': '📋',
            'Friday': '📝',
            'Saturday': '📌',
            'Sunday': '🌟'
        };
        return icons[day] || '📅';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <svg className="animate-spin h-12 w-12 text-[#1e3a5f]" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <p className="text-[#1e3a5f] font-medium">Loading your schedule...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
            {/* Subtle background decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl animate-pulse-subtle"></div>
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-slate-200/50 rounded-full blur-3xl animate-pulse-subtle delay-1000"></div>
            </div>

            {/* Header */}
            <header className="relative bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0f2744] to-[#1e3a5f] flex items-center justify-center shadow-lg shadow-slate-300/50">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">{doctor?.full_name || 'Doctor'}</h1>
                            <p className="text-[#1e3a5f] text-sm">{doctor?.sector || 'Specialist'}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 font-medium transition-all duration-300 flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative max-w-6xl mx-auto px-6 py-8">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-slate-800 mb-2">Your Schedule</h2>
                    <p className="text-slate-500">Click on a day to view your appointments</p>
                </div>

                {error && (
                    <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-center">
                        {error}
                    </div>
                )}

                {scheduleData.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-lg shadow-slate-200/50">
                        <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <h3 className="text-xl font-semibold text-slate-800 mb-2">No Schedule Found</h3>
                        <p className="text-slate-500">You don't have any scheduled days configured.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {scheduleData.map((dayData, index) => (
                            <button
                                key={dayData.day}
                                onClick={() => handleDayClick(dayData.day)}
                                className="bg-white border border-slate-200 rounded-2xl p-6 text-left hover:border-[#1e3a5f]/30 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group animate-fade-in"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-4xl">{getDayIcon(dayData.day)}</span>
                                    <div className="px-3 py-1.5 bg-[#1e3a5f]/10 border border-[#1e3a5f]/20 rounded-lg">
                                        <span className="text-[#1e3a5f] font-bold">{dayData.appointments.length}</span>
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-[#1e3a5f] transition-colors">
                                    {dayData.day}
                                </h3>
                                <div className="space-y-1 text-sm text-slate-500">
                                    <p className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Starts at {dayData.start_time}
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        Max {dayData.max_patients} patients
                                    </p>
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                                    <span className="text-slate-400 text-sm">
                                        {dayData.appointments.length} appointment{dayData.appointments.length !== 1 ? 's' : ''}
                                    </span>
                                    <svg className="w-5 h-5 text-slate-400 group-hover:text-[#1e3a5f] group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
