import { MapContainer, Marker, TileLayer } from "react-leaflet";
import { MapPin } from "lucide-react";
import "../../utils/leafletConfig";

const DEFAULT_ZOOM = 15;

export default function LocationPreview({ lat, lng, label, address, height = 220, className = "" }) {
  if (typeof lat !== "number" || typeof lng !== "number") {
    return (
      <div className={`bg-gray-800/40 border border-gray-700 rounded-lg p-4 text-sm text-gray-300 ${className}`}>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gray-400" />
          <span>No precise location saved yet.</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Ask the customer to drop a map pin during signup to speed up delivery routing.
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-gray-700 overflow-hidden ${className}`}>
      <MapContainer
        center={[lat, lng]}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={false}
        dragging={true}
        zoomControl={false}
        className="w-full"
        style={{ height }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} />
      </MapContainer>
      <div className="bg-gray-900/80 px-4 py-3 text-sm text-gray-200 space-y-1">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-400">
          <MapPin className="h-3.5 w-3.5" />
          {label || "Delivery Pin"}
        </div>
        <div className="font-medium text-gray-100 text-sm">
          {address || "Exact coordinates shared by customer."}
        </div>
        <div className="text-xs text-gray-500">
          Lat {lat.toFixed(5)} · Lng {lng.toFixed(5)}
        </div>
      </div>
    </div>
  );
}

