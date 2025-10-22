// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Resend } from 'https://esm.sh/resend@1.1.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

function corsHeaders(req: Request) {
  const reqHeaders = req.headers.get('Access-Control-Request-Headers') || '';
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers':
      reqHeaders ||
      'content-type, authorization, apikey, x-client-info, x-client-version',
  };
}

function returnReminderTemplate(userData: any, rentalData: any) {
  // Construct full name from user data
  const fullName =
    `${userData.first_name || ''} ${userData.last_name || ''}`.trim();

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Return Reminder - Rawlens</title>
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
        .reminder { 
            color: #1e3c72; 
            font-weight: bold; 
            font-size: 18px;
        }
        .section {
            margin: 20px 0;
        }
        .section h3 {
            color: #1e3c72;
            border-bottom: 2px solid #4dabf7;
            padding-bottom: 5px;
        }
        ul {
            color: #555;
        }
        .contact-info {
            background-color: #e3f2fd;
            padding: 15px;
            border-radius: 5px;
        }
        .title {
            color: #1e3c72;
            text-align: center;
        }
        .customer-name {
            color: #1e3c72;
            font-weight: bold;
            font-size: 20px;
            text-align: center;
            background-color: #e3f2fd;
            padding: 10px;
            border-radius: 5px;
            margin: 15px 0;
        }
        .helpful-note {
            background-color: #e8f4fc;
            border-left: 4px solid #4dabf7;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="content">
        <h1 class="title">Return Reminder</h1>
        
        <div class="customer-name">
            Hello, ${fullName || 'Valued Customer'}!
        </div>
        
        <p class="reminder">We're writing to let you know that your rental period is coming to an end soon.</p>
        
        <div class="details">
            <h3>Rental Details:</h3>
            <div class="detail-item">
                <span class="label">Item:</span> ${rentalData.item_name}
            </div>
            <div class="detail-item">
                <span class="label">End Date:</span> ${new Date(rentalData.end_date).toLocaleDateString()}
            </div>
            <div class="detail-item">
                <span class="label">Booking Reference:</span> ${rentalData.id.substring(0, 8).toUpperCase()}
            </div>
        </div>
        
        <div class="helpful-note">
            <strong>Helpful Tip:</strong> When preparing your item for return, please ensure all accessories are included and the item is packaged securely.
        </div>
        
        <div class="section">
            <h3>Return Process</h3>
            <ul>
                <li>Package the item securely in its original packaging if possible</li>
                <li>Include all accessories and components that came with the item</li>
                <li>Our team will contact you to arrange pickup or drop-off</li>
                <li>Keep this email for your reference until the return is complete</li>
            </ul>
        </div>
        
        <div class="section">
            <h3>Questions or Assistance?</h3>
            <div class="contact-info">
                <p>If you have any questions about your return or need assistance, please don't hesitate to contact us:</p>
                <p><strong>Contact Number:</strong> 09613986032</p>
            </div>
        </div>
        
        <p>Thank you for choosing Rawlens. We hope you've enjoyed your rental experience!</p>
        <p>Warm regards,<br>The Rawlens Team</p>
    </div>
    
    <div class="footer">
        <p>© 2025 Rawlens. All rights reserved.</p>
        <p>Espana, Manila</p>
    </div>
</body>
</html>
`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req) });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(req) },
    });
  }

  try {
    const { rental_data, user_data } = await req.json();

    // Create a Supabase client with the service_role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Check user email preferences
    const { data: settings, error: settingsErr } = await supabaseAdmin
      .from('user_settings')
      .select('email_notifications')
      .eq('user_id', user_data.id)
      .maybeSingle();

    if (settingsErr) {
      console.error(
        `Error fetching settings for user ${user_data.id}:`,
        settingsErr,
      );
      // proceed to avoid losing critical emails if settings query fails
    } else if (settings && settings.email_notifications === false) {
      console.log(`User ${user_data.id} has opted out of email notifications.`);
      return new Response(
        JSON.stringify({ message: 'User opted out of email notifications' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(req) },
        },
      );
    }

    // Generate email HTML
    const html = returnReminderTemplate(user_data, rental_data);

    // Send email
    const { data, error } = await resend.emails.send({
      from: 'RawLens PH <noreply@rawlensph.cam>',
      to: user_data.email,
      subject: 'Return Reminder - Rental Ending Soon',
      html,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(req) },
    });
  } catch (error) {
    console.error('Error sending return reminder email:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(req) },
    });
  }
});
