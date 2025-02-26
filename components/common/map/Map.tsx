import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useRef } from "react";
import { MapContainer, TileLayer, Marker } from "./MapComponents";

export const Map: React.FC<{ marker: L.LatLng }> = ({ marker }) => {
  const mapRef = useRef(null);
  return (
    <MapContainer
      ref={mapRef}
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
