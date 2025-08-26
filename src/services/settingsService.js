import { supabase } from "../lib/supabaseClient";

/**
 * Get user settings from user_settings table
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Settings object or null if not found
 */
export const getUserSettings = async (userId) => {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error("Error fetching user settings:", error);
    throw error;
  }
  return data;
};

/**
 * Get admin settings from admin_settings table
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Settings object or null if not found
 */
export const getAdminSettings = async (userId) => {
  const { data, error } = await supabase
    .from("admin_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error("Error fetching admin settings:", error);
    throw error;
  }
  return data;
};

/**
 * Update user settings in user_settings table
 * @param {string} userId - User ID
 * @param {Object} updates - Settings to update
 * @returns {Promise<Object>} Updated settings object
 */
export const updateUserSettings = async (userId, updates) => {
  const existing = await getUserSettings(userId);
  
  if (existing) {
    const { data, error } = await supabase
      .from("user_settings")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error updating user settings:", error);
      throw error;
    }
    return data;
  } else {
    return await createUserSettings(userId, updates);
  }
};

/**
 * Update admin settings in admin_settings table
 * @param {string} userId - User ID
 * @param {Object} updates - Settings to update
 * @returns {Promise<Object>} Updated settings object
 */
export const updateAdminSettings = async (userId, updates) => {
  const existing = await getAdminSettings(userId);
  
  if (existing) {
    const { data, error } = await supabase
      .from("admin_settings")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error updating admin settings:", error);
      throw error;
    }
    return data;
  } else {
    return await createAdminSettings(userId, updates);
  }
};

/**
 * Create new user settings in user_settings table
 * @param {string} userId - User ID
 * @param {Object} initialSettings - Initial settings to set
 * @returns {Promise<Object>} Created settings object
 */
export const createUserSettings = async (userId, initialSettings = {}) => {
  const { data, error } = await supabase
    .from('user_settings')
    .insert({ 
      user_id: userId, 
      ...initialSettings
    })
    .select()
    .single();
  
  if (error) {
    console.error("Error creating user settings:", error);
    throw error;
  }
  return data;
};

/**
 * Create new admin settings in admin_settings table
 * @param {string} userId - User ID
 * @param {Object} initialSettings - Initial settings to set
 * @returns {Promise<Object>} Created settings object
 */
export const createAdminSettings = async (userId, initialSettings = {}) => {
  const { data, error } = await supabase
    .from('admin_settings')
    .insert({ 
      user_id: userId, 
      ...initialSettings
    })
    .select()
    .single();
  
  if (error) {
    console.error("Error creating admin settings:", error);
    throw error;
  }
  return data;
};

/**
 * Context-aware saving based on current user role
 * @param {string} userId - User ID
 * @param {Object} updates - Settings to update
 * @param {string} userRole - User role ('user' or 'admin')
 * @returns {Promise<Object>} Updated settings object
 */
export const saveSettingsForCurrentContext = async (userId, updates, userRole) => {
  if (userRole === 'admin') {
    return await updateAdminSettings(userId, updates);
  } else {
    return await updateUserSettings(userId, updates);
  }
};