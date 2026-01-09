import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AppointmentMap from "./AppointmentMap";

export default function MyAppointments() {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const [locationError, setLocationError] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
    const [expandedMaps, setExpandedMaps] = useState({});
    const notifiedRef = useRef(new Set());

    const toggleMap = (appointmentId) => {
        setExpandedMaps(prev => ({
            ...prev,
            [appointmentId]: !prev[appointmentId]
        }));
    };
    const navigate = useNavigate();

    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                setNotificationPermission(permission);
            });
        }
        const stored = localStorage.getItem('notifiedAppointments');
        if (stored) {
            const parsed = JSON.parse(stored);
            notifiedRef.current = new Set(parsed);
        }
    }, []);

    const sendNotification = useCallback((appointmentId, doctorName, hospitalName, leaveTime) => {
        const notifyKey = `${appointmentId}-${new Date().toDateString()}`;
        if (notifiedRef.current.has(notifyKey)) return;
        notifiedRef.current.add(notifyKey);
        const stored = JSON.parse(localStorage.getItem('notifiedAppointments') || '[]');
        stored.push(notifyKey);
        localStorage.setItem('notifiedAppointments', JSON.stringify(stored.slice(-50)));

        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🚗 Time to Leave for Your Appointment!', {
                body: `Leave now for your appointment with ${doctorName} at ${hospitalName}`,
                icon: '🏥',
                tag: `appointment-${appointmentId}`,
                requireInteraction: true
            });
        }
    }, []);

    const checkNotifications = useCallback((appointmentsList, userLoc) => {
        if (!userLoc) return;
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const today = now.toDateString();

        appointmentsList.forEach(apt => {
            if (apt.status !== 'Booked') return;
            if (!apt.estimated_time || !apt.hospital_lat || !apt.hospital_lng) return;
            const aptDate = new Date(apt.appointment_date);
            if (aptDate.toDateString() !== today) return;
            const distance = calculateDistanceStatic(userLoc.lat, userLoc.lng, apt.hospital_lat, apt.hospital_lng);
            const travelMinutes = Math.ceil((distance / 25) * 60);
            const [hours, mins] = apt.estimated_time.split(':').map(Number);
            const appointmentMinutes = hours * 60 + mins;
            const leaveMinutes = appointmentMinutes - travelMinutes - 15;

            if (currentMinutes >= leaveMinutes && currentMinutes < appointmentMinutes) {
                sendNotification(apt.appointment_id, apt.doctor_name, apt.hospital_name, apt.estimated_time);
            }
        });
    }, [sendNotification]);

    const calculateDistanceStatic = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
            if (userLocation && appointments.length > 0) {
                checkNotifications(appointments, userLocation);
            }
        }, 60000);
        return () => clearInterval(timer);
    }, [userLocation, appointments, checkNotifications]);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
                    setUserLocation(loc);
                },
                (error) => {
                    setLocationError("Location access needed for travel time");
                }
            );
        }
    }, []);

    useEffect(() => {
        fetchAppointments();
        const refreshInterval = setInterval(fetchAppointments, 120000);
        return () => clearInterval(refreshInterval);
    }, []);

    useEffect(() => {
        if (userLocation && appointments.length > 0) {
            checkNotifications(appointments, userLocation);
        }
    }, [userLocation, appointments, checkNotifications]);

    const fetchAppointments = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get("http://localhost:8080/api/appointments/my", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAppointments(response.data);
        } catch (err) {
            console.error("Error fetching appointments:", err);
        } finally {
            setLoading(false);
        }
    };

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        return calculateDistanceStatic(lat1, lon1, lat2, lon2);
    };

    const calculateTravelTime = (hospitalLat, hospitalLng) => {
        if (!userLocation || !hospitalLat || !hospitalLng) return null;
        const distance = calculateDistance(userLocation.lat, userLocation.lng, hospitalLat, hospitalLng);
        const travelMinutes = Math.ceil((distance / 25) * 60);
        return travelMinutes;
    };

    const calculateLeaveTime = (estimatedTime, travelMinutes) => {
        if (!estimatedTime || !travelMinutes) return null;
        const [hours, mins] = estimatedTime.split(':').map(Number);
        const appointmentMinutes = hours * 60 + mins;
        const leaveMinutes = appointmentMinutes - travelMinutes - 15;
        const leaveHours = Math.floor(leaveMinutes / 60);
        const leaveMins = leaveMinutes % 60;
        return `${String(leaveHours).padStart(2, '0')}:${String(leaveMins).padStart(2, '0')}`;
    };

    const shouldLeaveNow = (leaveTime) => {
        if (!leaveTime) return false;
        const [leaveHours, leaveMins] = leaveTime.split(':').map(Number);
        const leaveMinutes = leaveHours * 60 + leaveMins;
        const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
        return currentMinutes >= leaveMinutes - 5 && currentMinutes <= leaveMinutes + 30;
    };

    const handleCancel = async (appointmentId) => {
        setCancelling(appointmentId);
        try {
            const token = localStorage.getItem("token");
            await axios.patch(
                `http://localhost:8080/api/appointments/${appointmentId}/cancel`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchAppointments();
        } catch (err) {
            console.error("Error cancelling appointment:", err);
        } finally {
            setCancelling(null);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    };

    const formatTime = (time24) => {
        if (!time24) return null;
        const [hours, mins] = time24.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const hours12 = hours % 12 || 12;
        return `${hours12}:${String(mins).padStart(2, '0')} ${period}`;
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Booked': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
            case 'Completed': return 'bg-blue-50 text-blue-600 border-blue-200';
            case 'Cancelled': return 'bg-red-50 text-red-600 border-red-200';
            default: return 'bg-slate-50 text-slate-600 border-slate-200';
        }
    };

    const bookedAppointments = appointments.filter(a => a.status === 'Booked');
    const pastAppointments = appointments.filter(a => a.status !== 'Booked');

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl animate-pulse-subtle"></div>
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-slate-200/50 rounded-full blur-3xl animate-pulse-subtle delay-1000"></div>
            </div>

            <nav className="relative bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <button onClick={() => navigate("/home")} className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                            </svg>
                            <span className="font-medium">Back to Home</span>
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#0f2744] flex items-center justify-center shadow-lg shadow-slate-300/50">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <span className="text-xl font-bold text-slate-800">My Appointments</span>
                        </div>
                        <div className="w-24"></div>
                    </div>
                </div>
            </nav>

            <main className="relative max-w-4xl mx-auto px-6 py-12">
                {locationError && (
                    <div className="mb-4 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm text-center">
                        📍 {locationError}
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <svg className="animate-spin h-10 w-10 text-[#1e3a5f]" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                    </div>
                ) : appointments.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-lg shadow-slate-200/50">
                        <h3 className="text-xl font-bold text-slate-800 mb-2">No appointments yet</h3>
                        <p className="text-slate-500 mb-6">Book your first appointment by finding a doctor</p>
                        <button onClick={() => navigate("/find-doctor")} className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#1e3a5f] to-[#0f2744] text-white font-medium shadow-lg shadow-slate-300/50 hover:shadow-xl transition-all">Find a Doctor</button>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {bookedAppointments.length > 0 && (
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                    Upcoming Appointments ({bookedAppointments.length})
                                </h2>
                                <div className="space-y-4">
                                    {bookedAppointments.map((apt) => {
                                        const travelMinutes = calculateTravelTime(apt.hospital_lat, apt.hospital_lng);
                                        const leaveTime = calculateLeaveTime(apt.estimated_time, travelMinutes);
                                        const isLeaveNow = shouldLeaveNow(leaveTime);

                                        return (
                                            <div key={apt.appointment_id} className={`bg-white border rounded-2xl overflow-hidden transition-all duration-300 shadow-lg shadow-slate-200/50 ${isLeaveNow ? 'border-amber-400 ring-2 ring-amber-200' : 'border-slate-200'}`}>
                                                {isLeaveNow && (
                                                    <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center gap-3">
                                                        <span className="text-2xl">🚗</span>
                                                        <div>
                                                            <p className="text-amber-700 font-bold">Time to Leave!</p>
                                                            <p className="text-amber-600 text-sm">Leave now to reach on time</p>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="bg-gradient-to-r from-[#1e3a5f]/10 to-[#0f2744]/5 border-b border-slate-100 px-6 py-3 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1e3a5f] to-[#0f2744] flex items-center justify-center text-white font-bold shadow-lg">#{apt.serial_no}</div>
                                                        <div>
                                                            <p className="text-slate-800 font-semibold">Queue Position: {apt.queue_position || apt.serial_no}</p>
                                                            <p className="text-[#1e3a5f] text-sm">{apt.patients_ahead || (apt.serial_no - 1)} patients ahead</p>
                                                        </div>
                                                    </div>
                                                    {apt.estimated_time && (
                                                        <div className="text-right">
                                                            <p className="text-emerald-600 font-bold text-lg">{formatTime(apt.estimated_time)}</p>
                                                            <p className="text-slate-400 text-xs">Est. Appointment</p>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="p-6">
                                                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3 mb-4">
                                                                <div className="w-12 h-12 rounded-xl bg-[#1e3a5f]/10 border border-[#1e3a5f]/20 flex items-center justify-center">
                                                                    <svg className="w-6 h-6 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                                    </svg>
                                                                </div>
                                                                <div>
                                                                    <h3 className="text-lg font-bold text-slate-800">{apt.doctor_name}</h3>
                                                                    <p className="text-[#1e3a5f] text-sm">{apt.specialty}</p>
                                                                </div>
                                                            </div>

                                                            {apt.hospital_name && (
                                                                <div className="mb-4 p-3 bg-slate-50 rounded-xl">
                                                                    <div className="flex items-start gap-2">
                                                                        <svg className="w-5 h-5 text-[#1e3a5f] mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                        </svg>
                                                                        <div className="flex-1">
                                                                            <p className="text-slate-800 font-medium">{apt.hospital_name}</p>
                                                                            {travelMinutes && (
                                                                                <div className="flex items-center gap-4 mt-1 text-sm">
                                                                                    <span className="text-slate-600">🚗 ~{travelMinutes} min travel</span>
                                                                                    {leaveTime && <span className="text-amber-600">🕐 Leave by {formatTime(leaveTime)}</span>}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                                                                <div className="bg-slate-50 rounded-lg p-3">
                                                                    <p className="text-slate-400 text-xs mb-1">Date</p>
                                                                    <p className="text-slate-800 font-medium">{formatDate(apt.appointment_date)}</p>
                                                                </div>
                                                                <div className="bg-slate-50 rounded-lg p-3">
                                                                    <p className="text-slate-400 text-xs mb-1">Day</p>
                                                                    <p className="text-slate-800 font-medium">{apt.day}</p>
                                                                </div>
                                                                <div className="bg-slate-50 rounded-lg p-3">
                                                                    <p className="text-slate-400 text-xs mb-1">Avg. Duration</p>
                                                                    <p className="text-slate-800 font-medium">{apt.avg_time_per_patient} min</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col items-end gap-3">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(apt.status)}`}>{apt.status}</span>
                                                            <button
                                                                onClick={() => toggleMap(apt.appointment_id)}
                                                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1e3a5f]/10 border border-[#1e3a5f]/20 text-[#1e3a5f] hover:bg-[#1e3a5f]/20 transition-all text-sm font-medium"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                                                </svg>
                                                                {expandedMaps[apt.appointment_id] ? 'Hide Map' : 'Show Map'}
                                                            </button>
                                                            <button
                                                                onClick={() => handleCancel(apt.appointment_id)}
                                                                disabled={cancelling === apt.appointment_id}
                                                                className="px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-all text-sm font-medium disabled:opacity-50"
                                                            >
                                                                {cancelling === apt.appointment_id ? "Cancelling..." : "Cancel"}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Map Section */}
                                                    {expandedMaps[apt.appointment_id] && (
                                                        <div className="mt-4 animate-fade-in">
                                                            <AppointmentMap
                                                                userLocation={userLocation}
                                                                hospitalLat={apt.hospital_lat}
                                                                hospitalLng={apt.hospital_lng}
                                                                hospitalName={apt.hospital_name}
                                                                doctorName={apt.doctor_name}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {pastAppointments.length > 0 && (
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                                    Past Appointments ({pastAppointments.length})
                                </h2>
                                <div className="space-y-4">
                                    {pastAppointments.map((apt) => (
                                        <div key={apt.appointment_id} className="bg-white border border-slate-200 rounded-2xl p-6 opacity-70 shadow-lg shadow-slate-100/50">
                                            <div className="flex justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center text-slate-600 font-bold">#{apt.serial_no}</div>
                                                    <div>
                                                        <h3 className="text-lg font-bold text-slate-800">{apt.doctor_name}</h3>
                                                        <p className="text-slate-500 text-sm">{apt.specialty} • {formatDate(apt.appointment_date)}</p>
                                                    </div>
                                                </div>
                                                <span className={`px-3 py-1 h-fit rounded-full text-xs font-bold border ${getStatusColor(apt.status)}`}>{apt.status}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
