import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { useDebounce } from "use-debounce";
import { MapPin, Search, Loader2, RefreshCw, Compass, X } from "lucide-react";
import {
  searchAddress,
  reverseGeocode,
  formatAddressParts,
} from "../../services/mapService";
import "../../utils/leafletConfig";

const PHILIPPINES_CENTER = [12.8797, 121.774];
const DEFAULT_ZOOM = 6;

const toPosition = (lat, lng) => {
  const parsedLat = typeof lat === "string" ? Number(lat) : lat;
  const parsedLng = typeof lng === "string" ? Number(lng) : lng;
  if (Number.isFinite(parsedLat) && Number.isFinite(parsedLng)) {
    return [parsedLat, parsedLng];
  }
  return null;
};

const isValidPosition = (pos) =>
  Array.isArray(pos) && pos.length === 2 && pos.every((value) => Number.isFinite(value));

function MapFlyTo({ position }) {
  const map = useMap();
  useEffect(() => {
    if (isValidPosition(position)) {
      map.flyTo(position, Math.max(map.getZoom(), 13), { duration: 0.6 });
    }
  }, [map, position]);
  return null;
}

function MapClickHandler({ onClick }) {
  useMapEvents({
    click(event) {
      onClick?.(event.latlng);
    },
  });
  return null;
}

export default function MapSelector({
  selectedLocation,
  onLocationChange,
  onAddressAutoFill,
  className = "",
  initialZoom = DEFAULT_ZOOM,
}) {
  const mapRef = useRef(null);
  const latestMarkerRef = useRef(null);
  const [markerPosition, setMarkerPosition] = useState(() =>
    selectedLocation ? toPosition(selectedLocation.lat, selectedLocation.lng) : null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedQuery] = useDebounce(searchTerm, 600);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const updateLocation = async (
    lat,
    lng,
    {
      withReverseLookup = false,
      initialStatus,
      successStatus,
      failureStatus,
    } = {}
  ) => {
    const newPosition = toPosition(lat, lng);
    if (!newPosition) {
      setError("Received invalid coordinates. Please try a different location.");
      return false;
    }

    setError("");
    setMarkerPosition(newPosition);
    latestMarkerRef.current = newPosition;
    onLocationChange?.({ lat: newPosition[0], lng: newPosition[1] });

    if (withReverseLookup) {
      setStatus(initialStatus || "Looking up address for dropped pin...");
      try {
        const { displayName, address } = await reverseGeocode(newPosition[0], newPosition[1]);
        const autoAddress = formatAddressParts(address) || displayName;
        if (autoAddress) {
          onAddressAutoFill?.(autoAddress);
          setStatus(successStatus || "Address updated from dropped pin.");
        } else {
          setStatus(failureStatus || "Coordinates saved. Address unavailable for this point.");
        }
      } catch (err) {
        console.error(err);
        setError("Unable to reverse geocode this location right now. Coordinates saved.");
        setStatus(failureStatus || "Coordinates saved; reverse geocoding failed.");
      }
    } else if (initialStatus) {
      setStatus(initialStatus);
    }

    return true;
  };

  const handleMapClick = async (latlng) => {
    await updateLocation(latlng.lat, latlng.lng, {
      withReverseLookup: true,
      initialStatus: "Pin dropped at clicked location.",
    });
  };

  const handleDropAtCenter = async () => {
    const center = mapRef.current?.getCenter();
    if (!center) {
      setStatus("Pan the map or search for a place, then drop the pin.");
      return;
    }
    await updateLocation(center.lat, center.lng, {
      withReverseLookup: true,
      initialStatus: "Pin dropped at map center.",
    });
  };

  const handleClearLocation = () => {
    setMarkerPosition(null);
    latestMarkerRef.current = null;
    onLocationChange?.(null);
    setStatus("Map pin removed. You can drop a new one anytime.");
    setError("");
  };

  useEffect(() => {
    if (!selectedLocation) {
      setMarkerPosition(null);
      latestMarkerRef.current = null;
      return;
    }
    const next = toPosition(selectedLocation.lat, selectedLocation.lng);
    setMarkerPosition(next);
    latestMarkerRef.current = next;
  }, [selectedLocation]);

  useEffect(() => {
    let isMounted = true;
    async function runSearch() {
      setSearching(true);
      setError("");
      try {
        const results = await searchAddress(debouncedQuery);
        if (!isMounted) return;
        setSearchResults(results);
        if (results.length === 0) {
          setStatus("No matches found. Try a more specific address.");
        } else {
          setStatus(`${results.length} place${results.length > 1 ? "s" : ""} found`);
        }
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setError("Unable to search location right now. Please try again later.");
        }
      } finally {
        if (isMounted) setSearching(false);
      }
    }

    if (debouncedQuery && debouncedQuery.length >= 3) {
      runSearch();
    } else {
      setSearchResults([]);
      setStatus("");
    }

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery]);

  const mapCenter = useMemo(() => {
    if (isValidPosition(markerPosition)) return markerPosition;
    return PHILIPPINES_CENTER;
  }, [markerPosition]);

  const handleResultSelect = async (result) => {
    const success = await updateLocation(result.lat, result.lng, {
      initialStatus: "Location selected from search results.",
    });
    if (!success) return;

    const autoAddress = formatAddressParts(result.address) || result.displayName;
    if (autoAddress) {
      onAddressAutoFill?.(autoAddress);
    }
    setSearchResults([]);
  };

  const handleMarkerDrag = async (event) => {
    const { lat, lng } = event.target.getLatLng();
    await updateLocation(lat, lng, { withReverseLookup: true });
  };

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const newPosition = toPosition(coords.latitude, coords.longitude);
        if (!newPosition || !mapRef.current) return;
        mapRef.current.flyTo(newPosition, Math.max(mapRef.current.getZoom(), 12), { duration: 0.6 });
        setStatus((prev) => prev || "Centered near your current location. Drop a pin to save it.");
      },
      () => {}
    );
  }, []);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        updateLocation(coords.latitude, coords.longitude, {
          withReverseLookup: true,
          initialStatus: "Fetching your current location...",
          successStatus: "Current location selected.",
          failureStatus: "Coordinates saved from current location; address unavailable.",
        });
      },
      () => {
        setError("Unable to access your location. Please enable permissions.");
        setStatus("");
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  };

  const displayPosition = isValidPosition(markerPosition) ? markerPosition : null;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-black" />
          Optional: Drop a pin for precise delivery
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search address, barangay, landmark"
            className="w-full pl-9 pr-28 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
          />
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-black bg-gray-100 hover:bg-gray-200 rounded-md px-2 py-1 text-xs font-medium inline-flex items-center gap-1"
          >
            <Compass className="h-3 w-3" />
            Use my location
          </button>
        </div>
        {searchTerm.length > 0 && searchTerm.length < 3 && (
          <p className="text-[11px] text-gray-500">Type at least 3 characters to search.</p>
        )}
        {searching && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Searching places...
          </div>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
        {status && !error && (
          <p className="text-[11px] text-gray-500 flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />
            {status}
          </p>
        )}
        {searchResults.length > 0 && (
          <div className="border border-gray-200 rounded-lg divide-y max-h-48 overflow-y-auto shadow-sm">
            {searchResults.map((result) => (
              <button
                key={`${result.lat}-${result.lng}`}
                type="button"
                onClick={() => handleResultSelect(result)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
              >
                <p className="font-medium text-gray-800 truncate">{result.displayName}</p>
                <p className="text-[11px] text-gray-500 truncate">
                  {formatAddressParts(result.address) || "No street details"}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="relative">
          <MapContainer
            center={displayPosition || mapCenter}
            zoom={initialZoom}
            scrollWheelZoom={false}
            className="h-72 w-full"
            whenCreated={(mapInstance) => {
              mapRef.current = mapInstance;
            }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {displayPosition && (
              <Marker
                position={displayPosition}
                draggable
                eventHandlers={{ dragend: handleMarkerDrag }}
              />
            )}
            <MapClickHandler onClick={handleMapClick} />
            <MapFlyTo position={displayPosition} />
          </MapContainer>

          <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
            <button
              type="button"
              onClick={handleDropAtCenter}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-800 shadow-sm backdrop-blur hover:bg-white"
            >
              <MapPin className="h-3.5 w-3.5" />
              Drop pin here
            </button>
            {displayPosition && (
              <button
                type="button"
                onClick={handleClearLocation}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm backdrop-blur hover:bg-white"
              >
                <X className="h-3.5 w-3.5" />
                Clear pin
              </button>
            )}
          </div>
        </div>
        <div className="p-3 bg-gray-50 text-[11px] text-gray-600 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-gray-500" />
            {displayPosition ? (
              <>
                <span>Pin saved at</span>
                <code className="px-2 py-0.5 bg-white border border-gray-200 rounded-md text-gray-800">
                  {displayPosition[0].toFixed(5)}, {displayPosition[1].toFixed(5)}
                </code>
              </>
            ) : (
              <span>Tap the map or use the buttons above to place your delivery pin.</span>
            )}
          </div>
          <span className="text-[10px] text-gray-500">
            Tip: After dropping the pin, we’ll try to auto-fill the address. You can still edit it manually if needed.
          </span>
        </div>
      </div>
    </div>
  );
}
