// api/webhooks/send-notification.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ✅ 1. Validate webhook secret (from Supabase trigger → webhook)
    const providedSecret = req.headers['x-webhook-secret'];
    if (!providedSecret || providedSecret !== process.env.WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Invalid webhook secret' });
    }

    // ✅ 2. Extract notification payload from request
    const { user_id, title, body, data, click_action } = req.body;

    console.log('📨 Webhook received notification request:', {
      user_id,
      title,
    });

    // ✅ 3. Forward to Supabase Edge Function with function secret
    const response = await fetch(
      `${process.env.SUPABASE_URL}/functions/v1/send-fcm-notification`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-function-secret': process.env.FCM_FUNCTION_SECRET,
        },
        body: JSON.stringify({ user_id, title, body, data, click_action }),
      }
    );

    const result = await response.json();

    // ✅ 4. Handle errors from Edge Function
    if (!response.ok) {
      console.error('❌ Edge Function error:', result);
      return res.status(response.status).json(result);
    }

    console.log('✅ FCM notification sent successfully');
    return res.status(200).json(result);
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
