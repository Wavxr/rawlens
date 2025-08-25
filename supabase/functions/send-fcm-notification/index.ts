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
    console.log("🔑 Starting JWT generation...");
    
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

    console.log("🔑 JWT payload:", { iss: payload.iss, exp, iat });

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

    console.log("🔑 Unsigned token ready, length:", unsignedToken.length);

    // Get and process the private key
    const privateKeyPem = FIREBASE_PRIVATE_KEY;
    console.log("🔑 Private key source length:", privateKeyPem.length);
    
    const keyBuffer = decodeBase64PEM(privateKeyPem);
    
    console.log("🔑 Importing crypto key...");
    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      keyBuffer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );

    console.log("🔑 Signing token...");
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      new TextEncoder().encode(unsignedToken)
    );

    const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    console.log("✅ JWT generated successfully");
    return `${unsignedToken}.${base64Signature}`;

  } catch (error) {
    console.error("❌ JWT generation failed:", error);
    throw new Error(`Failed to generate Firebase JWT: ${error.message}`);
  }
}

// Decode PEM private key → ArrayBuffer
function decodeBase64PEM(pem: string): ArrayBuffer {
  try {
    console.log("🔑 Processing private key...");
    
    // Handle the private key - replace \\n with actual newlines
    let cleaned = pem;
    if (cleaned.includes('\\n')) {
      cleaned = cleaned.replace(/\\n/g, '\n');
    }
    
    console.log("🔑 Key format check:", {
      hasBegin: cleaned.includes('-----BEGIN'),
      hasEnd: cleaned.includes('-----END'),
      hasNewlines: cleaned.includes('\n'),
      length: cleaned.length
    });

    // Remove PEM headers and clean base64
    const base64Content = cleaned
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/-----BEGIN RSA PRIVATE KEY-----/, '')
      .replace(/-----END RSA PRIVATE KEY-----/, '')
      .replace(/\n/g, '')
      .replace(/\r/g, '')
      .replace(/\s/g, '');

    console.log("🔑 Base64 content length:", base64Content.length);

    // Decode base64 to binary
    const binary = atob(base64Content);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    console.log("✅ Private key decoded successfully, bytes:", bytes.length);
    return bytes.buffer;
    
  } catch (error) {
    console.error("❌ Error decoding private key:", error);
    console.error("Private key preview:", pem.substring(0, 100) + "...");
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
// Replace the sendFCMToToken function with this simpler version:
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
    // Remove notification payload completely
    // notification: { title, body, image },
    
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

  console.log("📤 Sending data-only FCM message:", {
    token: fcmToken.substring(0, 20) + "...",
    dataKeys: Object.keys(message.data),
  });

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

// Mark token inactive in DB
async function markTokenInactive(token: string) {
  await supabase
    .from("fcm_tokens")
    .update({ is_active: false })
    .eq("fcm_token", token);
}

// Detect invalid token error
function isInvalidTokenError(error: any): boolean {
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
    
    console.log("🔐 Auth check:", {
      hasFunctionSecret: !!functionSecret,
      hasAuthHeader: !!authHeader,
      expectedSecret: expectedSecret,
      userAgent: req.headers.get("user-agent")
    });

    // Allow if either:
    // 1. Function secret matches (from webhook)
    // 2. Has valid authorization header (from client)
    // 3. No auth required for internal calls
    if (expectedSecret && functionSecret !== expectedSecret && !authHeader) {
      console.log("❌ Authentication failed");
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
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError && !functionSecret) {
        console.log("❌ Invalid auth token and no function secret");
        return new Response(
          JSON.stringify({ error: "Invalid authorization token" }), 
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    console.log("✅ Authentication passed");

    // Parse request body
    const requestData = await req.json();
    const { user_id, title, body, data, image, click_action, role = 'user' } = requestData;

    if (!user_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields", required: ["user_id", "title", "body"] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`📨 Processing FCM notification for user: ${user_id}, role: ${role}`);

    // 1. Check if user has notifications enabled for their role
    const { data: settings, error: settingsError } = await supabase
      .from("settings")
      .select("push_notifications")
      .eq("user_id", user_id)
      .eq("role", role)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error("❌ Error fetching user settings:", settingsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch user settings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!settings || !settings.push_notifications) {
      console.log(`⏭️ Skipping notification - push disabled for user: ${user_id}, role: ${role}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          sent: 0, 
          skipped: true,
          reason: "Push notifications disabled for user" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Get active FCM tokens for user with role filtering
    const { data: tokens, error: tokensError } = await supabase
      .from("fcm_tokens")
      .select("id, fcm_token, platform, device_info")
      .eq("user_id", user_id)
      .eq("role", role)
      .eq("is_active", true);

    if (tokensError) {
      console.error("❌ Error fetching FCM tokens:", tokensError);
      throw tokensError;
    }
    
    if (!tokens || tokens.length === 0) {
      console.log(`📱 No active FCM tokens found for user: ${user_id}, role: ${role}`);
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

    console.log(`🎯 Found ${tokens.length} active tokens for user: ${user_id}, role: ${role}`);

    // 3. Get Firebase access token
    const accessToken = await getFirebaseAccessToken();

    // 4. Send notification to all tokens
    const results = [];
    for (const { fcm_token } of tokens) {
      try {
        const response = await sendFCMToToken(
          accessToken,
          fcm_token,
          title,
          body,
          data,
          image,
          click_action,
        );

        const result = await response.json();
        if (!response.ok && isInvalidTokenError(result)) {
          await markTokenInactive(fcm_token);
          console.log(`⚠️ Marked invalid FCM token inactive: ${fcm_token}`);
        }
        results.push({ token: fcm_token, success: response.ok, result });
      } catch (err) {
        console.error(`❌ Error sending to token ${fcm_token}:`, err);
        results.push({ token: fcm_token, success: false, error: String(err) });
      }
    }

    // 5. Return results
    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("❌ Error in send-fcm-notification:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
