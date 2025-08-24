// supabase/functions/send-fcm-notification/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("🚀 Edge function 'send-fcm-notification' started");

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info, x-client-version",
};

// Handle preflight OPTIONS requests
function handleOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

// Initialize Supabase client with service role key
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

// Firebase configuration
const FIREBASE_PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID")!;
const FIREBASE_CLIENT_EMAIL = Deno.env.get("FIREBASE_CLIENT_EMAIL")!;
const FIREBASE_PRIVATE_KEY = Deno.env.get("FIREBASE_PRIVATE_KEY")!;

interface FCMNotificationRequest {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  image?: string;
  click_action?: string;
}

interface FCMToken {
  id: string;
  fcm_token: string;
  platform: string;
  device_info?: Record<string, unknown>;
}

interface FCMError {
  error?: {
    code?: string;
    message?: string;
  };
}

interface FCMMessage {
  message: {
    token: string;
    notification: {
      title: string;
      body: string;
      image?: string;
    };
    webpush?: {
      headers?: {
        Urgency: string;
      };
      notification?: {
        title: string;
        body: string;
        icon: string;
        badge: string;
        requireInteraction: boolean;
        silent: boolean;
        image?: string;
      };
      fcm_options?: {
        link: string;
      };
    };
    data?: Record<string, string>;
  };
}

interface NotificationError {
  token_id: string;
  platform: string;
  error: FCMError;
}

/**
 * Generate JWT token for Firebase Admin authentication
 */
async function generateFirebaseJWT(): Promise<string> {
  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: FIREBASE_CLIENT_EMAIL,
    sub: FIREBASE_CLIENT_EMAIL,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600, // 1 hour
    scope: "https://www.googleapis.com/auth/cloud-platform",
  };

  // Encode header and payload
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));

  // Create signature
  const textToSign = `${encodedHeader}.${encodedPayload}`;
  const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");
  
  // Import the private key
  const keyData = await crypto.subtle.importKey(
    "pkcs8",
    new TextEncoder().encode(privateKey),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  // Sign the JWT
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    keyData,
    new TextEncoder().encode(textToSign)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return `${textToSign}.${encodedSignature}`;
}

/**
 * Get Firebase access token using JWT
 */
async function getFirebaseAccessToken(): Promise<string> {
  const jwt = await generateFirebaseJWT();
  
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Firebase access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Send FCM notification to a single token
 */
async function sendFCMToToken(
  accessToken: string,
  fcmToken: string,
  notification: { title: string; body: string; image?: string },
  data?: Record<string, string>,
  clickAction?: string
): Promise<{ success: boolean; error?: FCMError }> {
  try {
    const message: FCMMessage = {
      message: {
        token: fcmToken,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        webpush: {
          headers: {
            Urgency: "high",
          },
          notification: {
            title: notification.title,
            body: notification.body,
            icon: "/logo.png", // Your app icon
            badge: "/logo.png",
            requireInteraction: false,
            silent: false,
          },
        },
      },
    };

    // Add image if provided
    if (notification.image) {
      message.message.notification.image = notification.image;
      if (message.message.webpush?.notification) {
        message.message.webpush.notification.image = notification.image;
      }
    }

    // Add click action if provided
    if (clickAction && message.message.webpush) {
      message.message.webpush.fcm_options = {
        link: clickAction,
      };
    }

    // Add custom data if provided
    if (data && Object.keys(data).length > 0) {
      message.message.data = data;
    }

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ FCM send failed:", errorData);
      return { success: false, error: errorData as FCMError };
    }

    const result = await response.json();
    console.log("✅ FCM sent successfully:", result);
    return { success: true };

  } catch (error) {
    console.error("❌ FCM send error:", error);
    return { success: false, error: error as FCMError };
  }
}

/**
 * Mark FCM token as inactive in database
 */
async function markTokenInactive(tokenId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("user_fcm_tokens")
      .update({ 
        is_active: false, 
        updated_at: new Date().toISOString() 
      })
      .eq("id", tokenId);

    if (error) {
      console.error("❌ Failed to mark token as inactive:", error);
    } else {
      console.log(`✅ Marked token ${tokenId} as inactive`);
    }
  } catch (error) {
    console.error("❌ Error marking token inactive:", error);
  }
}

/**
 * Check if FCM error indicates invalid/expired token
 */
function isInvalidTokenError(error: FCMError): boolean {
  if (!error || !error.error) return false;
  
  const errorCode = error.error.code;
  const errorMessage = error.error.message;

  // Common FCM error codes for invalid tokens
  const invalidTokenCodes = [
    "UNREGISTERED",
    "INVALID_ARGUMENT", 
    "NOT_FOUND",
    "SENDER_ID_MISMATCH"
  ];

  return (errorCode && invalidTokenCodes.includes(errorCode)) || 
         (errorMessage?.includes("not a valid FCM registration token") ?? false) ||
         (errorMessage?.includes("Requested entity was not found") ?? false);
}

serve(async (req: Request) => {
  // Handle preflight CORS requests
  if (req.method === "OPTIONS") {
    return handleOptions();
  }

  try {
    // Parse request body
    const requestData: FCMNotificationRequest = await req.json();
    const { user_id, title, body, data, image, click_action } = requestData;

    // Validate required fields
    if (!user_id || !title || !body) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields", 
          required: ["user_id", "title", "body"] 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`📨 Processing FCM notification for user: ${user_id}`);

    // Step 1: Check user settings - only send if push_notification = true
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("push_notifications")
      .eq("user_id", user_id)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error("❌ Error fetching user settings:", settingsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch user settings" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If no settings found or push notifications disabled, skip sending
    if (!settings || !settings.push_notifications) {
      console.log(`⏭️ Skipping notification - push disabled for user: ${user_id}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          sent: 0, 
          skipped: true,
          reason: "Push notifications disabled for user" 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 2: Fetch all active FCM tokens for the user
    const { data: tokens, error: tokensError } = await supabase
      .from("user_fcm_tokens")
      .select("id, fcm_token, platform, device_info")
      .eq("user_id", user_id)
      .eq("is_active", true);

    if (tokensError) {
      console.error("❌ Error fetching FCM tokens:", tokensError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch FCM tokens" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!tokens || tokens.length === 0) {
      console.log(`📱 No active FCM tokens found for user: ${user_id}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          sent: 0, 
          failed: 0,
          reason: "No active tokens found" 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`🎯 Found ${tokens.length} active tokens for user: ${user_id}`);

    // Step 3: Get Firebase access token
    const accessToken = await getFirebaseAccessToken();

    // Step 4: Send notifications to all tokens (batching)
    let sent = 0;
    let failed = 0;
    const errors: NotificationError[] = [];

    const notification = { title, body, image };

    // Process tokens in batches (FCM supports up to 500 messages per batch)
    const batchSize = 100; // Conservative batch size
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      
      // Send to each token in the batch concurrently
      const batchPromises = batch.map(async (token: FCMToken) => {
        const result = await sendFCMToToken(
          accessToken,
          token.fcm_token,
          notification,
          data,
          click_action
        );

        if (result.success) {
          sent++;
          console.log(`✅ Sent to token: ${token.id} (${token.platform})`);
        } else {
          failed++;
          console.log(`❌ Failed to send to token: ${token.id} (${token.platform})`);
          
          // Check if this is an invalid token error
          if (result.error && isInvalidTokenError(result.error)) {
            console.log(`🗑️ Marking invalid token as inactive: ${token.id}`);
            await markTokenInactive(token.id);
          }
          
          errors.push({
            token_id: token.id,
            platform: token.platform,
            error: result.error || { error: { message: "Unknown error" } }
          });
        }
      });

      // Wait for batch to complete
      await Promise.all(batchPromises);
    }

    // Step 5: Return results
    const response = {
      success: true,
      sent,
      failed,
      total_tokens: tokens.length,
      user_id,
      notification: { title, body },
      ...(errors.length > 0 && { errors: errors.slice(0, 5) }) // Limit error details
    };

    console.log(`📊 FCM notification complete:`, response);

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("❌ Error in send-fcm-notification:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: String(error),
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
