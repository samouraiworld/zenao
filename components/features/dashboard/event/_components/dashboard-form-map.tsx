import { useFormContext } from "react-hook-form";
import { useEffect, useState } from "react";
import MapCaller from "@/components/widgets/map/map-lazy-components";
import { EventFormSchemaType } from "@/types/schemas";

export default function DashbaordFormMap() {
  const form = useFormContext<EventFormSchemaType>();
  const location = form.watch("location");

  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  useEffect(() => {
    if (location.kind === "geo") {
      setMarker({ lat: location.lat, lng: location.lng });
    }
  }, [location]);

  return (
    location &&
    location.kind === "geo" &&
    marker && <MapCaller lat={marker.lat} lng={marker.lng} />
  );
}
