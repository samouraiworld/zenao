"use client";

import { LatLng, Icon, Map as MapType } from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef } from "react";

export interface MapProps {
  lat: number;
  lng: number;
}

export const Map: React.FC<MapProps> = ({ lat, lng }) => {
  const marker = useMemo(() => new LatLng(lat, lng), [lat, lng]);
  const mapRef = useRef<MapType>(null);

  useEffect(() => {
    mapRef.current?.setView(marker);
  }, [marker, mapRef]);

  return (
    <MapContainer
      ref={mapRef}
      center={marker}
      zoom={12}
      className="h-[300px] w-full rounded z-40"
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
};
