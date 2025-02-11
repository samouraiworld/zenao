"use client";

import { MapContainer, Marker, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export const Map: React.FC<{ marker: L.LatLng }> = ({ marker }) => {
  return (
    <MapContainer
      center={marker}
      zoom={12}
      className="h-[300px] w-full rounded-xl z-40"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker
        position={marker}
        icon={
          new L.Icon({
            iconUrl: "/marker-icon.png",
            shadowUrl: "/marker-shadow.png",
          })
        }
      />
    </MapContainer>
  );
};
