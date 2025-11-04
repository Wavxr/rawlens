import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("Cleanup-orphaned-files function initializing.");

// The main Deno function that will be executed when the edge function is invoked.
Deno.serve(async (req) => {
  // This function is scheduled, so we don't need to check for a specific HTTP method.
  // However, for ad-hoc invocations, we can handle preflight OPTIONS requests.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the service role key to bypass RLS.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const bucketsToClean = ['government-ids', 'selfie-ids', 'verification-videos'];
    const allOrphanedFiles = [];

    // 1. Get all existing user IDs from the `users` table.
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id');

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    const existingUserIds = new Set(users.map(u => u.id));
    console.log(`Found ${existingUserIds.size} existing user profiles.`);

    // 2. Iterate over each bucket and find orphaned files.
    for (const bucket of bucketsToClean) {
      const { data: files, error: listError } = await supabaseAdmin
        .storage
        .from(bucket)
        .list('', { limit: 1000 }); // Adjust limit as needed

      if (listError) {
        console.error(`Error listing files in bucket ${bucket}:`, listError.message);
        continue; // Skip to the next bucket on error
      }

      if (!files || files.length === 0) {
        console.log(`Bucket ${bucket} is empty. Nothing to clean.`);
        continue;
      }

      const orphanedFilesInBucket = [];
      for (const file of files) {
        // Our file paths are structured as `{userId}/{filename}`.
        // The user ID is the name of the top-level folder in the bucket.
        const userId = file.name;

        // If the user ID from the file path does not exist in our set of users, it's an orphan.
        if (!existingUserIds.has(userId)) {
          // To delete a folder, we need to list its contents and delete them.
          const { data: filesInFolder, error: folderListError } = await supabaseAdmin
            .storage
            .from(bucket)
            .list(userId);
          
          if (folderListError) {
            console.error(`Could not list files in orphaned folder ${userId} from bucket ${bucket}.`);
            continue;
          }

          const filePathsToDelete = filesInFolder.map(f => `${userId}/${f.name}`);
          orphanedFilesInBucket.push(...filePathsToDelete);
        }
      }

      if (orphanedFilesInBucket.length > 0) {
        console.log(`Found ${orphanedFilesInBucket.length} orphaned file(s) in bucket ${bucket}.`);
        allOrphanedFiles.push({ bucket, paths: orphanedFilesInBucket });
      } else {
        console.log(`No orphaned files found in bucket ${bucket}.`);
      }
    }

    // 3. Delete all identified orphaned files.
    if (allOrphanedFiles.length > 0) {
      console.log("Starting deletion of orphaned files...");
      for (const group of allOrphanedFiles) {
        const { bucket, paths } = group;
        const { error: deleteError } = await supabaseAdmin
          .storage
          .from(bucket)
          .remove(paths);

        if (deleteError) {
          console.error(`Failed to delete files from ${bucket}:`, deleteError.message);
        } else {
          console.log(`Successfully deleted ${paths.length} files from ${bucket}.`);
        }
      }
    } else {
      console.log("No orphaned files to delete across all buckets.");
    }

    return new Response(JSON.stringify({ message: 'Cleanup process completed successfully.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Critical error during cleanup:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
