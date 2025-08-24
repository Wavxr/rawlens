import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, // frontend/backend both can use this
  process.env.SUPABASE_SERVICE_ROLE_KEY // only safe here on server
);

// Webhook secret (set in Vercel env vars)
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate webhook secret
    const providedSecret = req.headers['x-webhook-secret'];
    if (!providedSecret || providedSecret !== WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Invalid webhook secret' });
    }

    const { user_id, title, body, data, click_action } = req.body;

    console.log('📨 Webhook received notification request:', { user_id, title });

    // Call Supabase Edge Function
    const { data: result, error } = await supabase.functions.invoke('send-fcm-notification', {
      body: { user_id, title, body, data, click_action }
    });

    if (error) {
      console.error('❌ FCM Error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ FCM notification sent successfully');
    return res.status(200).json(result);
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
