import { supabase } from "../lib/supabaseClient";

export const getUserSettings = async (userId) => {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== 'PGRST116') { // Ignore 'not found' error, will be handled as null
    console.error("Error fetching user settings:", error);
    throw error;
  }
  return data;
};

export const updateUserSettings = async (userId, updates) => {
  const { data, error } = await supabase
    .from("user_settings")
    .update(updates)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating user settings:", error);
    throw error;
  }
  return data;
};

export const createUserSettings = async (userId) => {
    const { data, error } = await supabase
        .from('user_settings')
        .insert({ user_id: userId })
        .select()
        .single();
    
    if (error) {
        console.error("Error creating user settings:", error);
        throw error;
    }
    return data;
}