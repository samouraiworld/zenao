import { Map } from "leaflet";
import { Ref } from "react";
import { MapContainer as LMapContainer } from "react-leaflet";

export const MapContainer: React.FC<{ forwardedRef: Ref<Map> }> = ({
  forwardedRef,
  ...props
}) => <LMapContainer {...props} ref={forwardedRef} />;
