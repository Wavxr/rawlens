import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log("delete-user function initializing.")

Deno.serve(async (req) => {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    if (!userId) {
      throw new Error("User ID is required.");
    }

    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Get user data to find storage keys
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('government_id_key, selfie_id_key, verification_video_key')
      .eq('id', userId)
      .single();

    if (userError && userError.code !== 'PGRST116') { // Ignore 'not found' errors
      throw new Error(`Failed to fetch user profile: ${userError.message}`);
    }

    // 2. Delete all associated storage files
    if (user) {
      const filesToDelete = [
        { bucket: 'government-ids', key: user.government_id_key },
        { bucket: 'selfie-ids', key: user.selfie_id_key },
        { bucket: 'verification-videos', key: user.verification_video_key },
      ].filter(f => f.key); // Filter out any null/empty keys

      for (const file of filesToDelete) {
        const { error: deleteError } = await supabaseAdmin.storage
          .from(file.bucket)
          .remove([file.key]);
        if (deleteError) {
          console.warn(`Could not delete file ${file.key} from ${file.bucket}: ${deleteError.message}`);
        }
      }
    }

    // 3. Delete from dependent database tables
    const tablesToDeleteFrom = ['user_fcm_tokens', 'user_settings'];
    for (const table of tablesToDeleteFrom) {
      const { error: deleteError } = await supabaseAdmin
        .from(table)
        .delete()
        .eq('user_id', userId);
      if (deleteError) {
        console.warn(`Could not delete from ${table} for user ${userId}: ${deleteError.message}`);
      }
    }

    // 4. Delete from the public 'users' table
    const { error: publicUserError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);
    if (publicUserError) {
      console.warn(`Could not delete from public.users for user ${userId}: ${publicUserError.message}`);
    }

    // 5. Delete the user from auth.users (this must be last)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) {
      throw new Error(`Failed to delete user from auth: ${authError.message}`);
    }

    return new Response(JSON.stringify({ message: `User ${userId} deleted successfully.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (e) {
    const error = e as Error;
    console.error('Critical error during user deletion:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
