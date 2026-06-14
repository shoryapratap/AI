import React from 'react';
import { X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const MapWidget = ({ onClose }) => {
    return (
        <div className="map-widget">
            <button className="map-close-btn" onClick={onClose} title="Close Map">
                <X size={20} />
            </button>
            <MapContainer center={[51.505, -0.09]} zoom={13} className="map-iframe">
                <TileLayer
                    attribution='&copy; Google Maps'
                    url="https://mt0.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}"
                />
                <Marker position={[51.505, -0.09]}>
                    <Popup>
                        Emma AI is here.
                    </Popup>
                </Marker>
            </MapContainer>
        </div>
    );
};

export default MapWidget;
