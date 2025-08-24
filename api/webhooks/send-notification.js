// api/webhooks/send-notification.js

export default async function handler(req, res) {
  console.log('🔔 Webhook called:', {
    method: req.method,
    query: req.query,
    headers: {
      'x-webhook-secret': req.headers['x-webhook-secret'],
      'content-type': req.headers['content-type'],
    },
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ✅ 1. Validate webhook secret (check both headers and query params)
    const providedSecret =
      req.headers['x-webhook-secret'] || req.query['x-webhook-secret'];
    const expectedSecret = process.env.WEBHOOK_SECRET?.trim();

    console.log('🔐 Secret validation:', {
      provided: providedSecret,
      expected: expectedSecret,
      match: providedSecret === expectedSecret,
    });

    if (!providedSecret || providedSecret !== expectedSecret) {
      console.log('❌ Invalid webhook secret');
      return res.status(401).json({
        error: 'Invalid webhook secret',
        provided: providedSecret,
        expected: expectedSecret,
      });
    }

    // ✅ 2. Extract notification payload from request
    const { user_id, title, body, data, click_action } = req.body;

    console.log('📨 Processing notification:', {
      user_id,
      title,
      bodyLength: body?.length,
      hasData: !!data,
      hasClickAction: !!click_action,
    });

    // ✅ 3. Forward to Supabase Edge Function
    const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-fcm-notification`;
    const functionSecret = process.env.FCM_FUNCTION_SECRET?.trim();

    console.log('🔗 Calling Edge Function:', {
      url: edgeFunctionUrl,
      hasFunctionSecret: !!functionSecret,
    });

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-function-secret': functionSecret,
      },
      body: JSON.stringify({ user_id, title, body, data, click_action }),
    });

    const result = await response.json();

    console.log('📊 Edge Function response:', {
      status: response.status,
      ok: response.ok,
      result: result,
    });

    // ✅ 4. Handle errors from Edge Function
    if (!response.ok) {
      console.error('❌ Edge Function error:', result);
      return res.status(response.status).json(result);
    }

    console.log('✅ FCM notification sent successfully');
    return res.status(200).json(result);
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
      stack: error.stack,
    });
  }
}
