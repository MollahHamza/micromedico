import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import MicrosoftCalendarIntegration from "./MicrosoftCalendarIntegration";

export default function MyPrescriptions() {
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [expandedId, setExpandedId] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchPrescriptions();
    }, []);

    const fetchPrescriptions = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                navigate("/signin");
                return;
            }

            const response = await axios.get("http://localhost:8080/api/prescriptions/my", {
                headers: { Authorization: `Bearer ${token}` }
            });

            setPrescriptions(response.data);
        } catch (err) {
            if (err.response?.status === 401 || err.response?.status === 403) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                navigate("/signin");
            } else {
                setError("Failed to load prescriptions");
            }
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const getTimesPerDayText = (times) => {
        const texts = { 1: "Once daily", 2: "Twice daily", 3: "3 times daily", 4: "4 times daily" };
        return texts[times] || `${times} times daily`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <svg className="animate-spin h-12 w-12 text-[#1e3a5f]" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <p className="text-[#1e3a5f] font-medium">Loading your prescriptions...</p>
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
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/home" className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center transition-colors">
                            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">My Prescriptions</h1>
                            <p className="text-[#1e3a5f] text-sm">View your medical prescriptions</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="relative max-w-4xl mx-auto px-6 py-8">
                {error && <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-center">{error}</div>}

                {prescriptions.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-lg shadow-slate-200/50">
                        <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="text-xl font-semibold text-slate-800 mb-2">No Prescriptions Yet</h3>
                        <p className="text-slate-500">Prescriptions from your doctor visits will appear here.</p>
                        <Link to="/find-doctor" className="mt-6 inline-block px-6 py-3 bg-gradient-to-r from-[#1e3a5f] to-[#0f2744] rounded-xl text-white font-medium shadow-lg shadow-slate-300/50 hover:shadow-xl transition-all">Find a Doctor</Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {prescriptions.map((prescription, index) => (
                            <div
                                key={prescription.prescription_id}
                                className="bg-white border border-slate-200 rounded-2xl overflow-hidden transition-all duration-300 animate-fade-in shadow-lg shadow-slate-200/50"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <button
                                    onClick={() => toggleExpand(prescription.prescription_id)}
                                    className="w-full px-6 py-5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#0f2744] flex items-center justify-center shadow-lg shadow-slate-300/50">
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-slate-800">{prescription.doctor_name}</h3>
                                            <p className="text-slate-500 text-sm">{prescription.specialty || prescription.doctor_sector}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-slate-600 text-sm">
                                                {new Date(prescription.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </p>
                                            <p className="text-[#1e3a5f] text-xs">{prescription.medicines?.length || 0} medicine(s)</p>
                                        </div>
                                        <svg className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${expandedId === prescription.prescription_id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </button>

                                {expandedId === prescription.prescription_id && (
                                    <div className="px-6 pb-6 border-t border-slate-100 pt-4 space-y-4">
                                        {/* Medicines List */}
                                        <div className="space-y-3">
                                            {prescription.medicines && prescription.medicines.map((med, medIndex) => (
                                                <div key={medIndex} className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center">
                                                                <span className="text-[#1e3a5f] font-bold text-sm">{medIndex + 1}</span>
                                                            </div>
                                                            <h4 className="text-slate-800 font-semibold">{med.medicine_name}</h4>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3 mt-3">
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <svg className="w-4 h-4 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <span className="text-slate-600">
                                                                {med.dosage_pattern ? (
                                                                    <span className="flex gap-1">
                                                                        {med.dosage_pattern.split('+')[0] === '1' && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 rounded">Morn</span>}
                                                                        {med.dosage_pattern.split('+')[1] === '1' && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 rounded">Aft</span>}
                                                                        {med.dosage_pattern.split('+')[2] === '1' && <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 rounded">Eve</span>}
                                                                        {med.dosage_pattern === "0+0+0" && "As needed"}
                                                                    </span>
                                                                ) : (
                                                                    getTimesPerDayText(med.times_per_day)
                                                                )}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <svg className="w-4 h-4 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                            <span className="text-slate-600">{med.duration_days} days</span>
                                                        </div>
                                                    </div>
                                                    {med.instructions && (
                                                        <p className="mt-3 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                                                            💊 {med.instructions}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Additional Notes */}
                                        {prescription.additional_notes && (
                                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <h4 className="text-blue-700 font-medium">Doctor's Notes</h4>
                                                </div>
                                                <p className="text-blue-800">{prescription.additional_notes}</p>
                                            </div>
                                        )}

                                        {/* Microsoft Calendar Integration */}
                                        <MicrosoftCalendarIntegration
                                            medicines={prescription.medicines}
                                            prescriptionId={prescription.prescription_id}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
