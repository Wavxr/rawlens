// =========================
// Imports
// =========================
import { supabase } from "../lib/supabaseClient";

// =========================
// Constants
// =========================
const TABLE = "public_cameras"; // materialized public-safe catalog

// =========================
// Helper Functions
// =========================
function normalizeCameraRow(row) {
  if (!row) return null;
  return {
    name: row.name,
    description: row.description ?? "",
    image_url: row.image_url ?? "",
    price_1to3: row.price_1to3 ?? null,
    price_4plus: row.price_4plus ?? null,
    inclusions: Array.isArray(row.inclusions) ? row.inclusions : [],
  };
}

export function calculateRentalQuote({ days, price_1to3, price_4plus }) {
  // Contract: days >= 1; if price_4plus is null, fallback to price_1to3
  if (!days || days < 1) return 0;
  const p13 = Number(price_1to3 || 0);
  const p4 = Number(price_4plus || p13 || 0);
  if (days <= 3) return days * p13;
  // 1-3 days at price_1to3, remaining at price_4plus
  return 3 * p13 + (days - 3) * p4;
}

// =========================
// Public Functions
// =========================
export async function getPublicCameras({ search = "", limit = 24, order = { by: "name", asc: true } } = {}) {
  let query = supabase
    .from(TABLE)
    .select("name, description, image_url, price_1to3, price_4plus, inclusions");

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  if (order?.by) {
    query = query.order(order.by, { ascending: !!order.asc, nullsFirst: false });
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) return { data: [], error };
  return { data: (data || []).map(normalizeCameraRow), error: null };
}

export async function getPublicCameraByName(name) {
  if (!name) return { data: null, error: new Error("Name is required") };
  const { data, error } = await supabase
    .from(TABLE)
    .select("name, description, image_url, price_1to3, price_4plus, inclusions")
    .eq("name", name)
    .maybeSingle();
  if (error) return { data: null, error };
  return { data: normalizeCameraRow(data), error: null };
}

export async function getPublicCameraNames() {
  const { data, error } = await supabase.from(TABLE).select("name").order("name", { ascending: true });
  if (error) return { data: [], error };
  // dedup defensively
  const seen = new Set();
  const names = [];
  for (const row of data || []) {
    if (row?.name && !seen.has(row.name)) {
      seen.add(row.name);
      names.push(row.name);
    }
  }
  return { data: names, error: null };
}

export async function getFeaturedCameras(limit = 8) {
  // Simple featured selection by name order for now
  const { data, error } = await getPublicCameras({ limit, order: { by: "name", asc: true } });
  return { data, error };
}
