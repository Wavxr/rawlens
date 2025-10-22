import { supabase } from "../lib/supabaseClient"

const TABLE_NAME = "public_cameras"

export function calculateRentalQuote({ days, price_1to3, price_4plus }) {
  if (!days || days < 1) return 0
  const shortTermRate = Number(price_1to3 || 0)
  const longTermRate = Number(price_4plus || shortTermRate || 0)
  if (days <= 3) { return days * shortTermRate }

  return days * longTermRate
}

export async function getPublicCameras({ search = "", limit = 24 } = {}) {
  try {
    let query = supabase
      .from(TABLE_NAME)
      .select("name, description, image_url, price_1to3, price_4plus, inclusions")
      .order("name", { ascending: true })

    if (search) { query = query.ilike("name", `%${search}%`) }
    if (limit) { query = query.limit(limit) }
    const { data, error } = await query

    if (error) {
      console.error("Error fetching cameras:", error)
      return { data: [], error }
    }

    return { data: data || [], error: null }
    
  } catch (error) {
    console.error("Error in getPublicCameras:", error)
    return { data: [], error }
  }
}

export async function getPublicCameraNames() {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("name")
      .order("name", { ascending: true })
    const names = [...new Set(data?.map((row) => row.name).filter(Boolean) || [])]

    if (error) {
      console.error("Error fetching camera names:", error)
      return { data: [], error }
    }

    return { data: names, error: null }

  } catch (error) {
    console.error("Error in getPublicCameraNames:", error)
    return { data: [], error }
  }
}

export async function getPublicCameraByName(cameraName) {
  if (!cameraName) { return { data: null, error: new Error("Camera name is required") } }

  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("name, description, image_url, price_1to3, price_4plus, inclusions")
      .eq("name", cameraName)
      .single()

    if (error) {
      console.error("Error fetching camera by name:", error)
      return { data: null, error }
    }

    return { data, error: null }

  } catch (error) {
    console.error("Error in getPublicCameraByName:", error)
    return { data: null, error }
  }
}