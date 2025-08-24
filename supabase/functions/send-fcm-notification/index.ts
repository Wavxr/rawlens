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
  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600; // 1 hour expiry

  const payload = {
    iss: FIREBASE_CLIENT_EMAIL,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp,
    iat,
  };

  // Encode base64url
  const encodeBase64Url = (obj: any) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const encodedHeader = encodeBase64Url(header);
  const encodedPayload = encodeBase64Url(payload);
  const token = `${encodedHeader}.${encodedPayload}`;

  // Sign with Firebase private key
  const key = await crypto.subtle.importKey(
    "pkcs8",
    decodeBase64PEM(FIREBASE_PRIVATE_KEY),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(token),
  );

  const base64Signature = btoa(
    String.fromCharCode(...new Uint8Array(signature)),
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${token}.${base64Signature}`;
}

// Decode PEM private key → ArrayBuffer
function decodeBase64PEM(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----.*-----/g, "").replace(/\s+/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
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
  return await fetch(
    `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: fcmToken,
          notification: { title, body, image },
          data: { ...data, click_action },
          webpush: { fcm_options: { link: click_action } },
        },
      }),
    },
  );
}

// Mark token inactive in DB
async function markTokenInactive(token: string) {
  await supabase
    .from("user_push_subscriptions")
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
  if (req.method === "OPTIONS") return handleOptions();

  // 🔒 Validate function secret
  const providedSecret = req.headers.get("x-function-secret");
  if (!providedSecret || providedSecret !== FUNCTION_SECRET) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const requestData = await req.json();
    const { user_id, title, body, data, image, click_action } = requestData;

    if (!user_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields", required: ["user_id", "title", "body"] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`📨 Processing FCM notification for user: ${user_id}`);

    // 1. Check if user has notifications enabled
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("notifications_enabled")
      .eq("id", user_id)
      .single();

    if (userError || !user?.notifications_enabled) {
      return new Response(
        JSON.stringify({ success: false, reason: "Notifications disabled for this user" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Get active FCM tokens for user
    const { data: tokens, error: tokensError } = await supabase
      .from("user_push_subscriptions")
      .select("fcm_token")
      .eq("user_id", user_id)
      .eq("is_active", true);

    if (tokensError) throw tokensError;
    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ success: false, reason: "No active tokens for user" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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
