import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push";

console.log("Edge function 'send-push' started");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "content-type, apikey, authorization, x-client-info, x-client-version",
};

function handleOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_EMAIL = Deno.env.get("VAPID_EMAIL")!; // <-- Add this line

webpush.setVapidDetails(
  `mailto:${VAPID_EMAIL}`, // <-- Use the variable here
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleOptions();

  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    // Verify user with Supabase Auth
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only allow admins to send to others
    const isAdmin = user.user_metadata?.role === "admin";
    
    const { userIds, notification } = await req.json();

    if (!userIds || !notification) {
      return new Response(
        JSON.stringify({ error: "Missing userIds or notification" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 🔒 Non-admins can only send to themselves
    if (!isAdmin && (!Array.isArray(userIds) || userIds.length !== 1 || userIds[0] !== user.id)) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch subscriptions from DB
    const { data: subs, error } = await supabase
      .from("user_push_subscriptions")
      .select("subscription")
      .in("user_id", userIds)
      .eq("is_active", true);

    if (error) throw error;

    let sent = 0;
    for (const sub of subs || []) {
      try {
        await webpush.sendNotification(
          sub.subscription,
          JSON.stringify(notification)
        );
        sent++;
      } catch (pushErr) {
        console.error("Push failed:", pushErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (err) {
    console.error("❌ Error in send-push:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
