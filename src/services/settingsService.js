import { supabase } from "../lib/supabaseClient";

/**
 * Get user settings with role awareness
 * @param {string} userId - User ID
 * @param {string} role - User role ('user' or 'admin')
 * @returns {Promise<Object|null>} Settings object or null if not found
 */
export const getUserSettings = async (userId, role = 'user') => {
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("user_id", userId)
    .eq("role", role)
    .single();

  if (error && error.code !== 'PGRST116') { // Ignore 'not found' error, will be handled as null
    console.error("Error fetching user settings:", error);
    throw error;
  }
  return data;
};

/**
 * Update user settings with role awareness
 * @param {string} userId - User ID
 * @param {Object} updates - Settings to update
 * @param {string} role - User role ('user' or 'admin')
 * @returns {Promise<Object>} Updated settings object
 */
export const updateUserSettings = async (userId, updates, role = 'user') => {
  // First check if settings exist
  const existing = await getUserSettings(userId, role);
  
  if (existing) {
    // Update existing settings
    const { data, error } = await supabase
      .from("settings")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("role", role)
      .select()
      .single();

    if (error) {
      console.error("Error updating user settings:", error);
      throw error;
    }
    return data;
  } else {
    // Create new settings if they don't exist
    return await createUserSettings(userId, role, updates);
  }
};

/**
 * Create new user settings with role awareness
 * @param {string} userId - User ID
 * @param {string} role - User role ('user' or 'admin')
 * @param {Object} initialSettings - Initial settings to set
 * @returns {Promise<Object>} Created settings object
 */
export const createUserSettings = async (userId, role = 'user', initialSettings = {}) => {
    const { data, error } = await supabase
        .from('settings')
        .insert({ 
          user_id: userId, 
          role: role,
          ...initialSettings
        })
        .select()
        .single();
    
    if (error) {
        console.error("Error creating user settings:", error);
        throw error;
    }
    return data;
}

/**
 * Get settings for both user and admin roles
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Object with user and admin settings
 */
export const getAllUserSettings = async (userId) => {
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching all user settings:", error);
    throw error;
  }

  const userSettings = data?.find(s => s.role === 'user') || null;
  const adminSettings = data?.find(s => s.role === 'admin') || null;

  return {
    user: userSettings,
    admin: adminSettings
  };
}