import React from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/signin");
    };

    const features = [
        {
            id: "find-doctor",
            title: "Find a Doctor",
            description: "Describe your symptoms and get matched with the right specialist using AI",
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            ),
            gradient: "from-[#1e3a5f] to-[#0f2744]",
            route: "/find-doctor",
        },
        {
            id: "book-appointment",
            title: "Book Appointment",
            description: "Browse available doctors and book your appointment directly",
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
            ),
            gradient: "from-[#2d4a6f] to-[#1e3a5f]",
            route: "/book-appointment",
        },
        {
            id: "my-appointments",
            title: "My Appointments",
            description: "View and manage your upcoming appointments with doctors",
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            ),
            gradient: "from-[#1e3a5f] to-[#3b5998]",
            route: "/appointments",
        },
        {
            id: "my-prescriptions",
            title: "My Prescriptions",
            description: "View prescriptions and medication instructions from your doctors",
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
            gradient: "from-[#3b5998] to-[#1e3a5f]",
            route: "/prescriptions",
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
            {/* Subtle background decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl animate-pulse-subtle"></div>
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-slate-200/50 rounded-full blur-3xl animate-pulse-subtle delay-1000"></div>
                <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl animate-pulse-subtle delay-500"></div>
            </div>

            {/* Navigation */}
            <nav className="relative bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#0f2744] flex items-center justify-center shadow-lg shadow-slate-300/50">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                </svg>
                            </div>
                            <span className="text-xl font-bold text-slate-800">MediPlus</span>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#0f2744] flex items-center justify-center text-white font-semibold text-sm">
                                    {user.full_name?.charAt(0) || "U"}
                                </div>
                                <span className="text-slate-700 text-sm font-medium">{user.full_name || "User"}</span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-200 transition-all duration-300 text-sm font-medium"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main content */}
            <main className="relative max-w-7xl mx-auto px-6 py-12">
                {/* Welcome section */}
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">
                        Welcome back,{" "}
                        <span className="bg-gradient-to-r from-[#1e3a5f] to-[#3b5998] bg-clip-text text-transparent">
                            {user.full_name?.split(" ")[0] || "Patient"}
                        </span>
                    </h1>
                    <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                        Your health is our priority. Choose a service below to get started with your healthcare journey.
                    </p>
                </div>

                {/* Feature cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                    {features.map((feature) => (
                        <button
                            key={feature.id}
                            onClick={() => navigate(feature.route)}
                            className="group relative bg-white border border-slate-200 rounded-2xl p-8 text-left transition-all duration-500 hover:border-[#1e3a5f]/30 hover:shadow-xl hover:shadow-slate-200/50 hover:scale-[1.02]"
                        >
                            {/* Subtle gradient overlay on hover */}
                            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>

                            <div className="relative">
                                {/* Icon */}
                                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} shadow-lg shadow-slate-300/50 flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-300`}>
                                    {feature.icon}
                                </div>

                                {/* Content */}
                                <h3 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-[#1e3a5f] transition-colors">
                                    {feature.title}
                                </h3>
                                <p className="text-slate-500 group-hover:text-slate-600 transition-colors leading-relaxed">
                                    {feature.description}
                                </p>

                                {/* Arrow indicator */}
                                <div className="mt-6 flex items-center text-[#1e3a5f] font-medium transition-colors">
                                    <span className="text-sm">Get started</span>
                                    <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Quick stats */}
                <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
                    {[
                        { label: "Doctors", value: "4+", icon: "👨‍⚕️" },
                        { label: "Specialties", value: "4", icon: "🏥" },
                        { label: "Patients", value: "100+", icon: "👥" },
                        { label: "Appointments", value: "24/7", icon: "📅" },
                    ].map((stat, idx) => (
                        <div
                            key={idx}
                            className="bg-white border border-slate-200 rounded-2xl p-6 text-center hover:border-[#1e3a5f]/20 hover:shadow-lg transition-all duration-300"
                        >
                            <div className="text-3xl mb-2">{stat.icon}</div>
                            <div className="text-2xl font-bold text-slate-800 mb-1">{stat.value}</div>
                            <div className="text-sm text-slate-500">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
