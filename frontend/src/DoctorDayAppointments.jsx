import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import axios from "axios";

export default function DoctorDayAppointments() {
    const { day } = useParams();
    const [doctor, setDoctor] = useState(null);
    const [dayData, setDayData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isToday, setIsToday] = useState(false);
    const navigate = useNavigate();

    // Prescription modal state
    const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [medicines, setMedicines] = useState([
        { medicine_name: "", dosage_pattern: "1+0+1", times_per_day: 2, duration_days: 7, instructions: "" }
    ]);
    const [additionalNotes, setAdditionalNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const storedDoctor = localStorage.getItem("doctor");
        if (storedDoctor) {
            setDoctor(JSON.parse(storedDoctor));
        }

        // Check if this day is today
        const today = new Date();
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const todayDay = daysOfWeek[today.getDay()];
        setIsToday(day === todayDay);

        fetchAppointments();
    }, [day]);

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

            const found = response.data.find(d => d.day === day);
            setDayData(found || null);
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

    const openPrescriptionModal = (apt) => {
        setSelectedAppointment(apt);
        setSelectedAppointment(apt);
        setMedicines([{ medicine_name: "", dosage_pattern: "1+0+1", times_per_day: 2, duration_days: 7, instructions: "" }]);
        setAdditionalNotes("");
        setAdditionalNotes("");
        setError("");
        setShowPrescriptionModal(true);
    };

    const closePrescriptionModal = () => {
        setShowPrescriptionModal(false);
        setSelectedAppointment(null);
    };

    const addMedicine = () => {
        setMedicines([...medicines, { medicine_name: "", dosage_pattern: "1+0+1", times_per_day: 2, duration_days: 7, instructions: "" }]);
    };

    const removeMedicine = (index) => {
        if (medicines.length > 1) {
            setMedicines(medicines.filter((_, i) => i !== index));
        }
    };

    const updateMedicine = (index, field, value) => {
        const updated = [...medicines];
        updated[index][field] = value;

        // Auto-update times_per_day based on pattern if pattern changes
        if (field === 'dosage_pattern') {
            const count = value.split('+').reduce((a, b) => a + parseInt(b || 0), 0);
            updated[index].times_per_day = count;
        }

        setMedicines(updated);
    };

    const toggleDosageForTime = (index, timeIndex) => {
        const currentPattern = medicines[index].dosage_pattern || "0+0+0";
        const parts = currentPattern.split('+').map(Number);

        // Toggle 0/1
        parts[timeIndex] = parts[timeIndex] === 1 ? 0 : 1;

        const newPattern = parts.join('+');
        updateMedicine(index, 'dosage_pattern', newPattern);
    };

    const handlePrescriptionSubmit = async (e) => {
        e.preventDefault();

        // Validate at least one medicine with name
        const validMedicines = medicines.filter(m => m.medicine_name.trim());
        if (validMedicines.length === 0) {
            setError("Please add at least one medicine");
            return;
        }

        setSubmitting(true);
        setError("");

        try {
            const token = localStorage.getItem("doctorToken");
            await axios.post("http://localhost:8080/api/doctor/prescription", {
                appointment_id: selectedAppointment.appointment_id,
                medicines: validMedicines,
                additional_notes: additionalNotes
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            await fetchAppointments();
            closePrescriptionModal();
        } catch (err) {
            setError(err.response?.data?.error || "Failed to create prescription");
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Booked': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
            case 'Completed': return 'bg-blue-50 text-blue-600 border-blue-200';
            case 'Cancelled': return 'bg-red-50 text-red-600 border-red-200';
            default: return 'bg-slate-50 text-slate-600 border-slate-200';
        }
    };

    const getDayIcon = (day) => {
        const icons = { 'Monday': '📅', 'Tuesday': '📆', 'Wednesday': '🗓️', 'Thursday': '📋', 'Friday': '📝', 'Saturday': '📌', 'Sunday': '🌟' };
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
                    <p className="text-[#1e3a5f] font-medium">Loading appointments...</p>
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
                        <Link to="/doctor/dashboard" className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center transition-colors">
                            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <span>{getDayIcon(day)}</span>
                                {day} Appointments
                                {isToday && <span className="ml-2 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-600 text-sm">Today</span>}
                            </h1>
                            <p className="text-[#1e3a5f] text-sm">{doctor?.full_name || 'Doctor'}</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="relative max-w-6xl mx-auto px-6 py-8">
                {error && <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-center">{error}</div>}

                {!dayData ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-lg shadow-slate-200/50">
                        <h3 className="text-xl font-semibold text-slate-800 mb-2">No Schedule Found</h3>
                        <p className="text-slate-500">You don't have a schedule for {day}.</p>
                        <Link to="/doctor/dashboard" className="mt-6 inline-block px-6 py-3 bg-gradient-to-r from-[#1e3a5f] to-[#0f2744] rounded-xl text-white font-medium shadow-lg shadow-slate-300/50 hover:shadow-xl transition-all">Back to Dashboard</Link>
                    </div>
                ) : (
                    <>
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-lg shadow-slate-200/50">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center p-4 bg-slate-50 rounded-xl">
                                    <p className="text-slate-500 text-sm mb-1">Start Time</p>
                                    <p className="text-2xl font-bold text-slate-800">{dayData.start_time}</p>
                                </div>
                                <div className="text-center p-4 bg-slate-50 rounded-xl">
                                    <p className="text-slate-500 text-sm mb-1">Time/Patient</p>
                                    <p className="text-2xl font-bold text-slate-800">{dayData.avg_time_per_patient} min</p>
                                </div>
                                <div className="text-center p-4 bg-slate-50 rounded-xl">
                                    <p className="text-slate-500 text-sm mb-1">Max Patients</p>
                                    <p className="text-2xl font-bold text-slate-800">{dayData.max_patients}</p>
                                </div>
                                <div className="text-center p-4 bg-[#1e3a5f]/10 border border-[#1e3a5f]/20 rounded-xl">
                                    <p className="text-[#1e3a5f] text-sm mb-1">Booked</p>
                                    <p className="text-2xl font-bold text-[#1e3a5f]">{dayData.appointments.length}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-lg shadow-slate-200/50">
                            <div className="px-6 py-4 border-b border-slate-100">
                                <h2 className="text-lg font-semibold text-slate-800">Patient Appointments</h2>
                            </div>

                            {dayData.appointments.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-slate-500 text-lg">No appointments booked for {day}</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {dayData.appointments.map((apt, index) => (
                                        <div key={apt.appointment_id} className="p-6 hover:bg-slate-50 transition-colors animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1e3a5f] to-[#0f2744] flex items-center justify-center shadow-lg shadow-slate-300/50">
                                                        <div className="text-center">
                                                            <p className="text-white/70 text-xs">Serial</p>
                                                            <p className="text-white font-bold text-xl">#{apt.serial_no}</p>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-semibold text-slate-800 mb-1">{apt.patient_name}</h3>
                                                        <div className="flex items-center gap-4 text-slate-500">
                                                            <span className="flex items-center gap-1.5">
                                                                <svg className="w-4 h-4 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                                {apt.estimated_time}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    {isToday && apt.status === 'Booked' && (
                                                        <button onClick={() => openPrescriptionModal(apt)} className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl text-white font-medium transition-all duration-300 flex items-center gap-2 shadow-lg shadow-emerald-200/50">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                            Write Prescription
                                                        </button>
                                                    )}
                                                    <div className={`px-4 py-2 rounded-xl border text-sm font-semibold ${getStatusColor(apt.status)}`}>{apt.status}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>

            {/* Prescription Modal */}
            {showPrescriptionModal && selectedAppointment && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Write Prescription</h2>
                                <p className="text-slate-500 text-sm">Patient: {selectedAppointment.patient_name}</p>
                            </div>
                            <button onClick={closePrescriptionModal} className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handlePrescriptionSubmit} className="p-6 space-y-6">
                            {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center">{error}</div>}

                            {/* Medicines List */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-slate-800 font-semibold">Medicines</h3>
                                    <button type="button" onClick={addMedicine} className="px-3 py-1.5 bg-[#1e3a5f]/10 hover:bg-[#1e3a5f]/20 border border-[#1e3a5f]/20 rounded-lg text-[#1e3a5f] text-sm font-medium transition-colors flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                        </svg>
                                        Add Medicine
                                    </button>
                                </div>

                                {medicines.map((med, index) => (
                                    <div key={index} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[#1e3a5f] text-sm font-medium">Medicine #{index + 1}</span>
                                            {medicines.length > 1 && (
                                                <button type="button" onClick={() => removeMedicine(index)} className="text-red-500 hover:text-red-600 text-sm">Remove</button>
                                            )}
                                        </div>

                                        <input
                                            type="text"
                                            placeholder="Medicine name (e.g., Paracetamol 500mg)"
                                            value={med.medicine_name}
                                            onChange={(e) => updateMedicine(index, 'medicine_name', e.target.value)}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10 transition-all"
                                            required
                                        />

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-slate-500 text-xs mb-1">Schedule</label>
                                                <div className="flex gap-2">
                                                    {['Morning', 'Afternoon', 'Evening'].map((time, tIndex) => {
                                                        const parts = (med.dosage_pattern || "0+0+0").split('+');
                                                        const isSelected = parts[tIndex] === "1";
                                                        return (
                                                            <button
                                                                type="button"
                                                                key={time}
                                                                onClick={() => toggleDosageForTime(index, tIndex)}
                                                                className={`px-2 py-1.5 text-xs rounded-lg border transition-all ${isSelected ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' : 'bg-white text-slate-500 border-slate-200'}`}
                                                            >
                                                                {time}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-slate-500 text-xs mb-1">Duration (days)</label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={365}
                                                    value={med.duration_days}
                                                    onChange={(e) => updateMedicine(index, 'duration_days', parseInt(e.target.value))}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#1e3a5f] transition-all"
                                                />
                                            </div>
                                        </div>

                                        <input
                                            type="text"
                                            placeholder="Instructions (e.g., Take after meals)"
                                            value={med.instructions}
                                            onChange={(e) => updateMedicine(index, 'instructions', e.target.value)}
                                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1e3a5f] transition-all text-sm"
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Additional Notes */}
                            <div>
                                <label className="block text-slate-700 text-sm font-medium mb-2">Additional Notes</label>
                                <textarea
                                    value={additionalNotes}
                                    onChange={(e) => setAdditionalNotes(e.target.value)}
                                    placeholder="General advice, follow-up instructions, etc."
                                    rows={2}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1e3a5f] focus:bg-white transition-all"
                                />
                            </div>

                            {/* Submit Button */}
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={closePrescriptionModal} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 font-medium transition-colors">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className={`flex-1 py-3 rounded-xl font-semibold transition-all duration-300 ${submitting ? "bg-slate-300 text-slate-500 cursor-not-allowed" : "bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-200/50"}`}
                                >
                                    {submitting ? "Saving..." : "Save & Mark Complete"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
