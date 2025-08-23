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
    const { to, subject, html, userId: rawUserId } = await req.json();

    // Create a Supabase client with the service_role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Resolve and enforce user's email preference
    let userId = rawUserId;

    // Fallback: if userId not provided but "to" exists, try to resolve by email
    if (!userId && to) {
      const { data: userByEmail, error: findUserErr } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', to)
        .maybeSingle();
      if (findUserErr) {
        console.error('Error resolving user by email:', findUserErr);
      }
      if (userByEmail?.id) {
        userId = userByEmail.id;
      }
    }

                            // If we have a userId, enforce settings
    if (userId) {
      const { data: settings, error: settingsErr } = await supabaseAdmin
        .from('user_settings')
        .select('email_notifications')
        .eq('user_id', userId)
        .maybeSingle();

      if (settingsErr) {
        console.error(`Error fetching settings for user ${userId}:`, settingsErr);
        // proceed to avoid losing critical emails if settings query fails
      } else if (settings && settings.email_notifications === false) {
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
