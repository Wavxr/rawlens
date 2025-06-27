// src/services/authService.js
import { supabase } from '../lib/supabaseClient';

// Helper: Generate unique filenames
const generateFileName = (userId, type) => {
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '');
  return `${userId}-${type}-${timestamp}.jpg`;
};

// Helper: Upload file to Supabase Storage
const uploadFile = async (file, userId, folder) => {
  if (!file) return null;
  const fileName = generateFileName(userId, folder);
  const { data, error } = await supabase.storage
    .from(folder)
    .upload(fileName, file);
  if (error) throw error;
  const { publicUrl } = supabase.storage
    .from(folder)
    .getPublicUrl(fileName);
  return publicUrl;
};

// Sign Up
export const signUp = async (email, password, userData, nationalID, selfieID) => {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });
  if (authError) return { error: authError };

  const userId = authData.user.id;

  try {
    const nationalIDUrl = await uploadFile(nationalID, userId, 'national-ids');
    const selfieIDUrl = await uploadFile(selfieID, userId, 'selfie-ids');

    const { error: dbError } = await supabase.from('users').insert({
      id: userId,
      first_name: userData.firstName,
      last_name: userData.lastName,
      middle_initial: userData.middleInitial,
      email,
      address: userData.address,
      contact_number: userData.contactNumber,
      national_id_url: nationalIDUrl,
      selfie_id_url: selfieIDUrl,
    });

    if (dbError) throw dbError;

    return { success: true };
  } catch (error) {
    await supabase.auth.admin.deleteUser(userId);
    return { error };
  }
};

// Login
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

// Get Current User
export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  return { user: data?.user, error };
};