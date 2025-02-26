"use client";

import dynamic from "next/dynamic";
import { MapProps } from "./Map";

const LazyMap = dynamic(() => import("./Map").then((m) => m.Map), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

function MapCaller(props: MapProps) {
  return <LazyMap {...props} />;
}

export default MapCaller;
