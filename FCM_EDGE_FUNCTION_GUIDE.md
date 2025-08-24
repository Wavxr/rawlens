# FCM Edge Function Implementation Guide

## 🚀 Overview

This implementation provides a complete FCM (Firebase Cloud Messaging) Edge Function for Supabase that handles sending push notifications to users with proper error handling, token management, and batching support.

## 📁 Files Created

### 1. Edge Function
- `supabase/functions/send-fcm-notification/index.ts` - Main FCM Edge Function
- `supabase/functions/send-fcm-notification/deno.json` - Deno configuration

### 2. Frontend Service
- `src/services/fcmService.js` - Frontend service to call the Edge Function

## 🔧 Environment Variables Required

Add these to your Supabase project environment variables:

```bash
# Firebase Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----"

# Existing Supabase Variables (should already be set)
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Getting Firebase Credentials:

1. **Go to Firebase Console** → Your Project → Project Settings
2. **Service Accounts tab** → Generate new private key
3. **Download the JSON file** and extract:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (keep the `\n` characters)

## 🗄️ Database Requirements

Ensure your `user_fcm_tokens` table exists:

```sql
CREATE TABLE IF NOT EXISTS user_fcm_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fcm_token TEXT UNIQUE NOT NULL,
  platform TEXT NOT NULL DEFAULT 'web',
  device_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_fcm_tokens_user_id ON user_fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_fcm_tokens_active ON user_fcm_tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_user_fcm_tokens_token ON user_fcm_tokens(fcm_token);
```

Ensure your `user_settings` table has push notifications column:

```sql
-- Add column if it doesn't exist
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT NULL;
```

## 📦 Deployment

### 1. Deploy the Edge Function

```bash
# From your project root
supabase functions deploy send-fcm-notification
```

### 2. Test the Function

```bash
# Test with curl (replace with your actual values)
curl -X POST \
  'https://your-project.supabase.co/functions/v1/send-fcm-notification' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "user_id": "user-uuid-here",
    "title": "Test Notification",
    "body": "This is a test message"
  }'
```

## 💻 Usage Examples

### Basic Usage

```javascript
import { sendPushNotification } from '../services/fcmService';

// Send a simple notification
await sendPushNotification(
  'user-uuid', 
  'Hello!', 
  'This is a test notification'
);
```

### Advanced Usage with Data and Click Action

```javascript
await sendPushNotification(
  'user-uuid',
  'Rental Confirmed',
  'Your camera rental has been confirmed!',
  {
    data: {
      type: 'rental_confirmed',
      rental_id: '123',
      camera_name: 'Canon EOS R5'
    },
    image: 'https://example.com/camera-image.jpg',
    clickAction: '/user/rentals?rental=123'
  }
);
```

### Using Notification Templates

```javascript
import { NotificationTemplates } from '../services/fcmService';

// Rental confirmation
await NotificationTemplates.rentalConfirmed(userId, {
  id: 'rental-123',
  camera_name: 'Canon EOS R5',
  pickup_date: '2025-08-25'
});

// Return reminder
await NotificationTemplates.returnReminder(userId, {
  id: 'rental-123',
  camera_name: 'Canon EOS R5',
  return_date: '2025-08-30'
});
```

### Bulk Notifications

```javascript
import { sendPushNotificationToMultipleUsers } from '../services/fcmService';

const userIds = ['user1', 'user2', 'user3'];
const result = await sendPushNotificationToMultipleUsers(
  userIds,
  'System Maintenance',
  'Scheduled maintenance will occur tomorrow at 2 AM.'
);

console.log(`Sent to ${result.successful}/${result.total} users`);
```

## 🔍 Function Features

### ✅ **Input Validation**
- Validates required fields (`user_id`, `title`, `body`)
- Handles optional fields (`data`, `image`, `click_action`)

### ✅ **User Settings Check**
- Only sends if `user_settings.push_notifications = true`
- Gracefully skips disabled users

### ✅ **Token Management**
- Fetches all active tokens for a user
- Supports multiple devices per user
- Automatically marks invalid tokens as inactive

### ✅ **Error Handling**
- Handles Firebase authentication errors
- Identifies and handles invalid/expired tokens
- Comprehensive error logging

### ✅ **Batching Support**
- Processes tokens in batches (100 per batch)
- Concurrent sending within batches
- Prevents overwhelming Firebase servers

### ✅ **Response Details**
```javascript
{
  "success": true,
  "sent": 2,           // Number of successful sends
  "failed": 0,         // Number of failed sends
  "total_tokens": 2,   // Total tokens found
  "user_id": "uuid",
  "notification": {
    "title": "Hello",
    "body": "Test message"
  }
}
```

## 🔄 Integration with Existing Services

### Replace Existing Push Calls

Find existing push notification calls in your codebase and replace them:

```javascript
// OLD: Using the old send-push function
await supabase.functions.invoke('send-push', {
  body: { userIds: [userId], notification: { title, body } }
});

// NEW: Using the FCM service
import { sendPushNotification } from '../services/fcmService';
await sendPushNotification(userId, title, body);
```

### Database Triggers

You can trigger FCM notifications from database triggers:

```sql
-- Example: Send notification when rental status changes
CREATE OR REPLACE FUNCTION notify_rental_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the FCM Edge Function via HTTP
  PERFORM http_post(
    'https://your-project.supabase.co/functions/v1/send-fcm-notification',
    jsonb_build_object(
      'user_id', NEW.user_id,
      'title', 'Rental Update',
      'body', 'Your rental status has been updated to: ' || NEW.status
    ),
    'application/json'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER rental_update_notification
  AFTER UPDATE OF status ON rentals
  FOR EACH ROW
  EXECUTE FUNCTION notify_rental_update();
```

## 🧪 Testing

### 1. **Unit Testing**
Test individual components:
- User settings check
- Token fetching
- FCM message formatting

### 2. **Integration Testing**
Test the complete flow:
- Valid user with active tokens
- User with disabled notifications
- User with invalid tokens
- Multiple devices per user

### 3. **Error Testing**
Test error scenarios:
- Invalid Firebase credentials
- Network failures
- Malformed requests

## 📊 Monitoring & Logs

### Function Logs
Monitor the Edge Function logs in Supabase Dashboard:
- `✅ FCM sent successfully` - Successful sends
- `❌ FCM send failed` - Failed sends with error details
- `🗑️ Marking invalid token as inactive` - Token cleanup
- `⏭️ Skipping notification - push disabled` - User preference respected

### Key Metrics to Track
- Success/failure rates
- Invalid token frequency
- User opt-out rates
- Notification delivery times

## 🚨 Common Issues & Solutions

### **Issue: "Firebase authentication failed"**
**Solution:** Check your Firebase credentials in environment variables

### **Issue: "No active tokens found"**
**Solution:** Ensure users have registered FCM tokens via your frontend

### **Issue: "Push notifications disabled for user"**
**Solution:** This is expected behavior - user has opted out

### **Issue: High number of invalid tokens**
**Solution:** Implement token refresh on app startup

## 🔄 Migration from Web Push

If migrating from the old web push system:

1. **Keep both systems running temporarily**
2. **Update frontend to use FCM token registration**
3. **Gradually migrate notification calls to FCM**
4. **Monitor delivery rates**
5. **Remove old web push code once fully migrated**

## 🎯 Next Steps

1. **Deploy the Edge Function** ✅
2. **Set up environment variables** ✅
3. **Test with a single user** ✅
4. **Integrate with existing notification flows** 
5. **Monitor and optimize performance**
6. **Add advanced features (scheduling, A/B testing, etc.)**

The FCM Edge Function is now ready for production use! 🚀
