// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@1.1.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

function corsHeaders(req: Request) {
  const reqHeaders = req.headers.get("Access-Control-Request-Headers") || "";
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": reqHeaders || "content-type, authorization, apikey, x-client-info, x-client-version",
  };
}

function inquiryEmailTemplate(formData: any) {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Camera Rental Inquiry - Rawlens</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0;
            background-color: #f5f7fa;
        }
        .content { 
            padding: 20px; 
            max-width: 600px; 
            margin: 0 auto;
            background-color: white;
        }
        .details { 
            background-color: #f0f8ff; 
            padding: 15px; 
            border-radius: 5px; 
            margin: 20px 0; 
            border-left: 4px solid #1e3c72;
        }
        .detail-item { 
            margin: 10px 0; 
        }
        .label { 
            font-weight: bold; 
            color: #1e3c72; 
        }
        .footer { 
            background-color: #e3f2fd; 
            padding: 15px; 
            text-align: center; 
            font-size: 12px; 
            color: #1e3c72;
            margin-top: 20px;
        }
        .title {
            color: #1e3c72;
            text-align: center;
        }
        .section {
            margin: 20px 0;
        }
        .section h3 {
            color: #1e3c72;
            border-bottom: 2px solid #4dabf7;
            padding-bottom: 5px;
        }
        .additional-details {
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            white-space: pre-wrap;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="content">
        <h1 class="title">New Camera Rental Inquiry</h1>
        
        <div class="section">
            <h3>Customer Information:</h3>
            <div class="details">
                <div class="detail-item">
                    <span class="label">Name:</span> ${formData.name}
                </div>
                <div class="detail-item">
                    <span class="label">Email:</span> ${formData.email}
                </div>
                <div class="detail-item">
                    <span class="label">Phone:</span> ${formData.phone}
                </div>
            </div>
        </div>
        
        <div class="section">
            <h3>Rental Request Details:</h3>
            <div class="details">
                <div class="detail-item">
                    <span class="label">Equipment Needed:</span> ${formData.equipment}
                </div>
                <div class="detail-item">
                    <span class="label">Start Date:</span> ${formData.startDate ? new Date(formData.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Not specified'}
                </div>
                <div class="detail-item">
                    <span class="label">End Date:</span> ${formData.endDate ? new Date(formData.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Not specified'}
                </div>
                ${formData.rentalDuration ? `
                <div class="detail-item">
                    <span class="label">Rental Duration:</span> ${formData.rentalDuration} day(s)
                </div>
                ` : ''}
            </div>
        </div>
        
        ${formData.additionalDetails ? `
        <div class="section">
            <h3>Additional Details:</h3>
            <div class="additional-details">
                ${formData.additionalDetails}
            </div>
        </div>
        ` : ''}
        
        <div class="section">
            <p><strong>Action Required:</strong> Please respond to this inquiry within 24 hours.</p>
            <p>Reply directly to <strong>${formData.email}</strong> or call <strong>${formData.phone}</strong>.</p>
        </div>
    </div>
    
    <div class="footer">
        <p>This is an automated inquiry from the Rawlens website</p>
        <p>© 2025 Rawlens. All rights reserved.</p>
    </div>
</body>
</html>
`;
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
    const formData = await req.json();

    // Validate required fields
    if (!formData.name || !formData.email || !formData.phone || !formData.equipment) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }), 
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders(req) },
        }
      );
    }

    // Generate email HTML
    const html = inquiryEmailTemplate(formData);

    // Send email to admin
    const { data, error } = await resend.emails.send({
      from: "RawLens Inquiries <noreply@rawlensph.cam>",
      to: "business@rawlensph.cam",
      replyTo: formData.email,
      subject: `New Rental Inquiry from ${formData.name}`,
      html,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders(req) },
    });
  } catch (error) {
    console.error("Error sending inquiry email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders(req) },
    });
  }
});
