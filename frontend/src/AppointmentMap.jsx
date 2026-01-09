import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";

// Fix default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png"
});

// Custom icons
const userIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const hospitalIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Component to fit bounds to markers
function FitBounds({ userLocation, hospitalLocation }) {
    const map = useMap();

    useEffect(() => {
        if (userLocation && hospitalLocation) {
            const bounds = L.latLngBounds(
                [userLocation.lat, userLocation.lng],
                [hospitalLocation.lat, hospitalLocation.lng]
            );
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [map, userLocation, hospitalLocation]);

    return null;
}

// Real-time location tracker
function LocationTracker({ onLocationUpdate }) {
    useEffect(() => {
        if (!navigator.geolocation) return;

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                onLocationUpdate({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            },
            (error) => console.log("Location tracking error:", error),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [onLocationUpdate]);

    return null;
}

export default function AppointmentMap({
    userLocation: initialUserLocation,
    hospitalLat,
    hospitalLng,
    hospitalName,
    doctorName
}) {
    const [userLocation, setUserLocation] = useState(initialUserLocation);
    const mapRef = useRef(null);

    const hospitalLocation = hospitalLat && hospitalLng
        ? { lat: parseFloat(hospitalLat), lng: parseFloat(hospitalLng) }
        : null;

    // Update user location when prop changes
    useEffect(() => {
        if (initialUserLocation) {
            setUserLocation(initialUserLocation);
        }
    }, [initialUserLocation]);

    if (!hospitalLocation) {
        return (
            <div className="flex items-center justify-center h-48 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-center text-slate-500">
                    <svg className="w-8 h-8 mx-auto mb-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-sm">Hospital location not available</p>
                </div>
            </div>
        );
    }

    const center = userLocation
        ? [(userLocation.lat + hospitalLocation.lat) / 2, (userLocation.lng + hospitalLocation.lng) / 2]
        : [hospitalLocation.lat, hospitalLocation.lng];

    // Create a direction polyline between user and hospital
    const directionPath = userLocation
        ? [[userLocation.lat, userLocation.lng], [hospitalLocation.lat, hospitalLocation.lng]]
        : null;

    return (
        <div className="appointment-map-container relative">
            <MapContainer
                ref={mapRef}
                center={center}
                zoom={13}
                scrollWheelZoom={false}
                style={{ height: "280px", width: "100%" }}
                className="z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Hospital marker */}
                <Marker position={[hospitalLocation.lat, hospitalLocation.lng]} icon={hospitalIcon}>
                    <Popup>
                        <div className="text-center">
                            <p className="font-bold text-slate-800">{hospitalName}</p>
                            <p className="text-sm text-slate-600">{doctorName}</p>
                            <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${hospitalLocation.lat},${hospitalLocation.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block mt-2 px-3 py-1 bg-[#1e3a5f] text-white text-xs rounded-lg hover:bg-[#0f2744] transition-colors"
                            >
                                Open in Google Maps
                            </a>
                        </div>
                    </Popup>
                </Marker>

                {/* User marker */}
                {userLocation && (
                    <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                        <Popup>
                            <div className="text-center">
                                <p className="font-bold text-slate-800">📍 Your Location</p>
                                <p className="text-xs text-slate-500">Real-time tracking enabled</p>
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* Direction polyline */}
                {directionPath && (
                    <Polyline
                        positions={directionPath}
                        pathOptions={{
                            color: "#1e3a5f",
                            weight: 4,
                            opacity: 0.7,
                            dashArray: "10, 10"
                        }}
                    />
                )}

                {/* Fit bounds to show both markers */}
                {userLocation && hospitalLocation && (
                    <FitBounds userLocation={userLocation} hospitalLocation={hospitalLocation} />
                )}

                {/* Real-time location tracker */}
                <LocationTracker onLocationUpdate={setUserLocation} />
            </MapContainer>

            {/* Legend */}
            <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md z-[1000] text-xs">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-slate-600">You</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-slate-600">Hospital</span>
                    </div>
                </div>
            </div>

            {/* Google Maps button */}
            <a
                href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation ? `${userLocation.lat},${userLocation.lng}` : ''}&destination=${hospitalLocation.lat},${hospitalLocation.lng}&travelmode=driving`}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-3 right-3 flex items-center gap-2 bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md z-[1000] text-xs font-medium text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white transition-all"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Get Directions
            </a>
        </div>
    );
}
