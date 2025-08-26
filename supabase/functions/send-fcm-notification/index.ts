// supabase/functions/send-fcm-notification/index.ts
//
// Edge Function to send Firebase Cloud Messaging (FCM) notifications
// securely from Supabase. It validates a secret header to ensure that
// only your trusted backend (like Vercel webhook) can trigger it.
//

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ================== CONFIGURATION ==================

// CORS headers (so browser clients or webhooks can call it safely)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "content-type, apikey, authorization, x-client-info, x-client-version, x-function-secret",
};

// Supabase setup (using service role key for DB writes/updates)
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

// Firebase service account credentials (from GCP)
const FIREBASE_PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID")!;
const FIREBASE_CLIENT_EMAIL = Deno.env.get("FIREBASE_CLIENT_EMAIL")!;
const FIREBASE_PRIVATE_KEY = Deno.env.get("FIREBASE_PRIVATE_KEY")!;

// Secret used to protect this Edge Function
const FUNCTION_SECRET = Deno.env.get("FCM_FUNCTION_SECRET")!;

console.log("🚀 Edge function 'send-fcm-notification' started");

// ================== HELPERS ==================

// Handle OPTIONS requests (CORS preflight)
function handleOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

// Generate a Firebase JWT (needed to request an OAuth2 token)
async function generateFirebaseJWT(): Promise<string> {
  try {
    const header = {
      alg: "RS256",
      typ: "JWT",
    };

    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 3600;

    const payload = {
      iss: FIREBASE_CLIENT_EMAIL,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      exp,
      iat,
    };

    // Base64URL encode
    const base64UrlEncode = (obj: any) => {
      const str = JSON.stringify(obj);
      return btoa(str)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    };

    const encodedHeader = base64UrlEncode(header);
    const encodedPayload = base64UrlEncode(payload);
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    // Get and process the private key
    const privateKeyPem = FIREBASE_PRIVATE_KEY;
    const keyBuffer = decodeBase64PEM(privateKeyPem);
    
    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      keyBuffer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      new TextEncoder().encode(unsignedToken)
    );

    const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return `${unsignedToken}.${base64Signature}`;

  } catch (error) {
    throw new Error(`Failed to generate Firebase JWT: ${error.message}`);
  }
}

// Decode PEM private key → ArrayBuffer
function decodeBase64PEM(pem: string): ArrayBuffer {
  try {
    // Handle the private key - replace \\n with actual newlines
    let cleaned = pem;
    if (cleaned.includes('\\n')) {
      cleaned = cleaned.replace(/\\n/g, '\n');
    }

    // Remove PEM headers and clean base64
    const base64Content = cleaned
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/-----BEGIN RSA PRIVATE KEY-----/, '')
      .replace(/-----END RSA PRIVATE KEY-----/, '')
      .replace(/\n/g, '')
      .replace(/\r/g, '')
      .replace(/\s/g, '');

    // Decode base64 to binary
    const binary = atob(base64Content);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    return bytes.buffer;
    
  } catch (error) {
    throw new Error(`Failed to decode private key: ${error.message}`);
  }
}

// Get Firebase access token (valid for ~1 hour)
async function getFirebaseAccessToken(): Promise<string> {
  const jwt = await generateFirebaseJWT();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get Firebase access token: ${await response.text()}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Send FCM notification to one device token
async function sendFCMToToken(
  accessToken: string,
  fcmToken: string,
  title: string,
  body: string,
  data?: any,
  image?: string,
  click_action?: string,
): Promise<Response> {
  // Create data-only message to avoid duplicate notifications
  const message = {
    token: fcmToken,
    // Send everything as data payload - service worker will handle display
    data: {
      title: title,
      body: body,
      image: image || "",
      click_action: click_action || "",
      type: data?.type || "general",
      timestamp: Date.now().toString(),
      // Convert all data values to strings (FCM requirement)
      ...Object.fromEntries(
        Object.entries(data || {}).map(([key, value]) => [key, String(value)])
      ),
    },
  };

  return await fetch(
    `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    },
  );
}

// Mark token inactive in DB (table-specific)
async function markUserTokenInactive(token: string) {
  await supabase
    .from("user_fcm_tokens")
    .update({ is_active: false })
    .eq("fcm_token", token);
}

async function markAdminTokenInactive(token: string) {
  await supabase
    .from("admin_fcm_tokens")
    .update({ is_active: false })
    .eq("fcm_token", token);
}

// Detect invalid token error
function isInvalidTokenError(error: { error?: { status?: string } }): boolean {
  if (!error?.error?.status) return false;
  return (
    error.error.status === "UNREGISTERED" ||
    error.error.status === "INVALID_ARGUMENT" ||
    error.error.status === "NOT_FOUND"
  );
}

// ================== MAIN HANDLER ==================
serve(async (req: Request) => {
  // Handle preflight CORS requests
  if (req.method === "OPTIONS") {
    return handleOptions();
  }

  try {
    // Check for function secret OR authorization header
    const functionSecret = req.headers.get("x-function-secret");
    const authHeader = req.headers.get("authorization");
    const expectedSecret = Deno.env.get("FCM_FUNCTION_SECRET");

    // Allow if either:
    // 1. Function secret matches (from webhook)
    // 2. Has valid authorization header (from client)
    // 3. No auth required for internal calls
    if (expectedSecret && functionSecret !== expectedSecret && !authHeader) {
      return new Response(
        JSON.stringify({ 
          error: "Unauthorized",
          code: 401,
          message: "Missing or invalid authentication"
        }), 
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If auth header is provided, validate it
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user: _user }, error: userError } = await supabase.auth.getUser(token);
      if (userError && !functionSecret) {
        return new Response(
          JSON.stringify({ error: "Invalid authorization token" }), 
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Parse request body
    const requestData = await req.json();
    const { user_id, role, title, body, data } = requestData;

    // Validate required fields
    if (!role || !title || !body) {
      throw new Error('Missing required fields: role, title, body');
    }

    // user_id is only required for user notifications
    if (role === "user" && !user_id) {
      throw new Error('user_id is required for user notifications');
    }

    interface TokenData {
      id: string;
      fcm_token: string;
      platform: string;
      device_info: string;
      user_id?: string;
    }

    let tokens: TokenData[];
    let recipientInfo = "";
    
    if (role === "admin") {
      console.log("🔍 Starting admin token lookup...");
      
      // Get all admin tokens from admin_fcm_tokens table
      const { data: adminTokens, error: tokensError } = await supabase
        .from("admin_fcm_tokens")
        .select("id, fcm_token, platform, device_info, user_id")
        .eq("is_active", true);

      if (tokensError) {
        console.error("❌ Error fetching admin FCM tokens:", tokensError);
        throw tokensError;
      }

      console.log(`🔍 Raw admin tokens found: ${adminTokens?.length || 0}`);
      console.log(`🔍 Admin token user_ids:`, adminTokens?.map(t => t.user_id));

      if (!adminTokens || adminTokens.length === 0) {
        tokens = [];
      } else {
        // Get admin settings with push enabled from admin_settings table
        const adminUserIds = adminTokens.map(t => t.user_id);
        console.log(`🔍 Looking for settings for user_ids:`, adminUserIds);
        
        const { data: enabledAdmins, error: settingsError } = await supabase
          .from("admin_settings")
          .select("user_id, push_notifications")
          .eq("push_notifications", true)
          .in("user_id", adminUserIds);

        if (settingsError) {
          console.error("❌ Error fetching admin settings:", settingsError);
          throw settingsError;
        }

        console.log(`🔍 Enabled admin settings found: ${enabledAdmins?.length || 0}`);
        console.log(`🔍 Enabled admin user_ids:`, enabledAdmins?.map(s => s.user_id));
        console.log(`🔍 Full enabled admin settings:`, enabledAdmins);

        // Filter tokens for admins with push enabled
        const enabledUserIds = new Set(enabledAdmins?.map(s => s.user_id) || []);
        console.log(`🔍 Enabled user IDs set:`, Array.from(enabledUserIds));
        
        tokens = adminTokens.filter(token => {
          const isEnabled = enabledUserIds.has(token.user_id);
          console.log(`🔍 Token for user ${token.user_id}: enabled=${isEnabled}`);
          return isEnabled;
        });
        
        console.log(`🔍 Final filtered tokens: ${tokens?.length || 0}`);
      }
      
      recipientInfo = `ALL ADMINS (${tokens?.length || 0} devices)`;
      
    } else {
      // Get user info for logging
      const { data: userInfo } = await supabase
        .from("users")
        .select("first_name, last_name, email")
        .eq("id", user_id)
        .single();

      recipientInfo = userInfo 
        ? `USER: ${userInfo.first_name} ${userInfo.last_name} (${userInfo.email})`
        : `USER: ${user_id}`;

      // For user notifications: check user_settings table
      const { data: settings, error: settingsError } = await supabase
        .from("user_settings")
        .select("push_notifications")
        .eq("user_id", user_id)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error("❌ Error fetching user settings:", settingsError);
        throw settingsError;
      }

      if (!settings || !settings.push_notifications) {
        console.log(`⏭️ NOTIFICATION SKIPPED → ${recipientInfo} (push notifications disabled)`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            sent: 0, 
            skipped: true,
            reason: "Push notifications disabled" 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get user tokens from user_fcm_tokens table
      const { data: userTokens, error: tokensError } = await supabase
        .from("user_fcm_tokens")
        .select("id, fcm_token, platform, device_info")
        .eq("user_id", user_id)
        .eq("is_active", true);

      if (tokensError) {
        console.error("❌ Error fetching user FCM tokens:", tokensError);
        throw tokensError;
      }
      
      tokens = userTokens || [];
    }

    if (!tokens || tokens.length === 0) {
      console.log(`📱 NO TOKENS FOUND → ${recipientInfo}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          sent: 0, 
          failed: 0,
          reason: "No active tokens found" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Firebase access token
    const accessToken = await getFirebaseAccessToken();

    // Send notification to all tokens
    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const { fcm_token } of tokens) {
      try {
        const response = await sendFCMToToken(
          accessToken,
          fcm_token,
          title,
          body,
          data,
          undefined, // image
          data?.click_action, // click_action
        );

        const result = await response.json();
        if (response.ok) {
          successCount++;
        } else {
          failCount++;
          if (isInvalidTokenError(result)) {
            // Mark token inactive in appropriate table based on role
            if (role === "admin") {
              await markAdminTokenInactive(fcm_token);
            } else {
              await markUserTokenInactive(fcm_token);
            }
          }
        }
        results.push({ token: fcm_token, success: response.ok, result });
      } catch (err) {
        failCount++;
        results.push({ token: fcm_token, success: false, error: String(err) });
      }
    }

    // Log notification outcome
    console.log(`📨 NOTIFICATION SENT → ${recipientInfo} | Success: ${successCount}/${tokens.length} | Title: "${title}"`);

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("❌ FCM Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
