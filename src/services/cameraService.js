import { supabase } from '../lib/supabaseClient'

const generateFileName = (cameraName) => {
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '')
  return `${cameraName.replace(/\s+/g, '-')}-${timestamp}.jpg`
}

const uploadCameraImage = async (file, cameraName) => {
  if (!file) return null

  const fileName = generateFileName(cameraName)
  const { error: uploadError } = await supabase.storage.from("cameras").upload(fileName, file)
  if (uploadError) throw uploadError

  const { data, error: urlError } = supabase.storage.from("cameras").getPublicUrl(fileName)
  if (urlError) throw urlError

  return data.publicUrl
}

export const insertCamera = async (cameraData, imageFile) => {
  try {
    const imageUrl = await uploadCameraImage(imageFile, cameraData.name)

    const { error: dbError } = await supabase.from("cameras").insert({
      name: cameraData.name,
      description: cameraData.description,
      price_per_day: parseFloat(cameraData.pricePerDay),
      image_url: imageUrl,
      available: true, // default to available
    })

    if (dbError) throw dbError
    return { success: true }
  } catch (error) {
    return { error }
  }
}
