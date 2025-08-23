// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@1.1.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0'

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

function corsHeaders(req: Request) {
  const reqHeaders = req.headers.get("Access-Control-Request-Headers") || "";
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": reqHeaders || "content-type, authorization, apikey, x-client-info, x-client-version",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders(req) },
    });
  }

  try {
    const { to, subject, html, userId } = await req.json();

    // Create a Supabase client with the service_role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check user's notification settings
    if (userId) {
      const { data: settings, error } = await supabaseAdmin
        .from("user_settings")
        .select("email_notifications")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== 'PGRST116') { // pgrst116 is "Not Found"
          console.error(`Error fetching settings for user ${userId}:`, error);
          // We can decide to proceed or not. Let's proceed but log the error.
      }

      if (settings && !settings.email_notifications) {
        console.log(`User ${userId} has opted out of email notifications.`);
        return new Response(JSON.stringify({ message: "User opted out of email notifications" }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders(req) },
        });
      }
    }


    const { data, error } = await resend.emails.send({
      from: "RawLens PH <noreply@rawlensph.cam>",
      to,
      subject,
      html,
    });
    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders(req) },
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders(req) },
    });
  }
});
