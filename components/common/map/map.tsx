"use client";

import { LatLng, Icon } from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";

import "leaflet/dist/leaflet.css";

export interface MapProps {
  lat: number;
  lng: number;
}

export function Map({ lat, lng }: MapProps) {
  const marker = new LatLng(lat, lng);
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
          new Icon({
            iconUrl: "/marker-icon.png",
            shadowUrl: "/marker-shadow.png",
          })
        }
      />
    </MapContainer>
  );
}
