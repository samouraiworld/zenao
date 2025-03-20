"use client";

import dynamic from "next/dynamic";
import { MapProps } from "./map";

const LazyMap = dynamic(() => import("./map").then((m) => m.Map), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

function MapCaller(props: MapProps) {
  return <LazyMap {...props} />;
}

export default MapCaller;
