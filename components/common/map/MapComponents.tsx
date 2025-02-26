import dynamic from "next/dynamic";

// export const LazyMapContainer = dynamic(
//   () => import("./MapLazyComponents").then((m) => m.MapContainer),
//   {
//     ssr: false,
//     loading: () => <div style={{ height: "400px" }} />,
//   },
// );
// // eslint-disable-next-line @typescript-eslint/no-explicit-any
// const ForwardRefContainer = (props: any, ref: Ref<Map>) => (
//   <LazyMapContainer {...props} forwardedRef={ref} />
// );
// export const MapContainer = forwardRef<Map>(ForwardRefContainer);

// direct import from 'react-leaflet'
export const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false },
);
export const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false },
);
export const ZoomControl = dynamic(
  () => import("react-leaflet").then((m) => m.ZoomControl),
  { ssr: false },
);
export const Marker = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false },
);
