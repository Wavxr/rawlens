const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
const CONTACT_EMAIL = "contact@rawlens.ph";
const USER_AGENT = "RawLensApp/1.0 (contact@rawlens.ph)";
const MIN_REQUEST_INTERVAL_MS = 1100;
let lastRequestTs = 0;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function honorRateLimit() {
  const elapsed = Date.now() - lastRequestTs;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await wait(MIN_REQUEST_INTERVAL_MS - elapsed);
  }
  lastRequestTs = Date.now();
}

async function fetchFromNominatim(endpoint, params) {
  await honorRateLimit();

  const url = new URL(`${NOMINATIM_BASE_URL}/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.append(key, value);
    }
  });

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept-Language": "en-US,fil;q=0.9",
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Nominatim request failed (${response.status})`);
  }

  return response.json();
}

export async function searchAddress(query, { limit = 5 } = {}) {
  if (!query || query.trim().length === 0) return [];

  try {
    const results = await fetchFromNominatim("search", {
      q: query.trim(),
      format: "json",
      addressdetails: 1,
      countrycodes: "ph",
      limit,
      email: CONTACT_EMAIL,
    });

    return results.map((result) => ({
      lat: Number(result.lat),
      lng: Number(result.lon),
      displayName: result.display_name,
      address: result.address,
    }));
  } catch (error) {
    console.error("Nominatim search failed", error);
    throw error;
  }
}

export async function reverseGeocode(lat, lng) {
  if (typeof lat !== "number" || typeof lng !== "number") {
    throw new Error("reverseGeocode requires numeric latitude and longitude");
  }

  try {
    const data = await fetchFromNominatim("reverse", {
      lat,
      lon: lng,
      format: "json",
      addressdetails: 1,
      email: CONTACT_EMAIL,
    });

    return {
      displayName: data.display_name,
      address: data.address,
    };
  } catch (error) {
    console.error("Nominatim reverse geocode failed", error);
    throw error;
  }
}

export function formatAddressParts(addressObj) {
  if (!addressObj) return "";
  const { road, neighbourhood, village, suburb, city, town, province, state, county, postcode } = addressObj;
  const segments = [
    road,
    neighbourhood || village || suburb,
    city || town || county,
    province || state,
    postcode,
  ].filter(Boolean);
  return segments.join(", ");
}

export const MapService = {
  searchAddress,
  reverseGeocode,
  formatAddressParts,
};
