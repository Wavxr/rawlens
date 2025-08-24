# Push Notifications Implementation Guide

## Overview
This implementation adds comprehensive push notification support to the RawLens app with intelligent toggles and user-friendly permission handling.

## Files Created/Modified

### New Files Created:
1. `src/hooks/usePushNotifications.js` - Custom hook for push notification logic
2. `src/components/PushPermissionModal.jsx` - Modal for permission instructions
3. `src/components/PushNotificationPrompt.jsx` - Post-migration prompt for existing users

### Modified Files:
1. `src/pages/user/Profile.jsx` - Enhanced with push notification toggles and prompt

## Features Implemented

### 1. Smart Push Notification Toggle (Profile.jsx)
- **Browser Support Detection**: Automatically detects if push notifications are supported
- **Permission State Awareness**: Shows different UI based on permission status:
  - ✅ Granted: Normal toggle behavior
  - ⏳ Default: Triggers permission request
  - 🚫 Denied: Shows modal with browser-specific instructions
- **Visual Indicators**: Shows permission status and loading states
- **Error Handling**: Graceful handling of all edge cases

#### Toggle Behavior:
- **Turning ON**:
  - If permission is "granted" → Updates `user_settings.push_notifications = true` and calls `registerPushForUser()`
  - If permission is "default" → Requests permission, then registers if granted
  - If permission is "denied" → Shows instruction modal
- **Turning OFF**:
  - Updates `user_settings.push_notifications = false`
  - Deactivates all user FCM tokens (`is_active = false`)

### 2. Post-Migration Prompt (PushNotificationPrompt.jsx)
- **Smart Display Logic**: Only shows to users who haven't set a push preference
- **Dismissal Tracking**: Uses localStorage to avoid re-showing dismissed prompts
- **Benefits Communication**: Clearly explains value proposition
- **Permission Flow Integration**: Handles the full permission request flow

#### Display Conditions:
- User has `push_notifications = null/undefined` in settings
- User hasn't dismissed the prompt before
- Browser supports push notifications

### 3. Permission Modal (PushPermissionModal.jsx)
- **Browser-Specific Instructions**: Provides targeted help for Chrome, Firefox, Safari
- **Visual Guide**: Step-by-step instructions for enabling notifications
- **Retry Mechanism**: Allows users to try again after following instructions

### 4. Custom Hook (usePushNotifications.js)
- **Centralized Logic**: All push notification logic in one reusable hook
- **Permission Management**: Handles permission requests and status tracking
- **Token Management**: Manages FCM token registration and deactivation
- **Error Handling**: Comprehensive error handling with detailed feedback

## Usage Instructions

### Integration Steps:
1. Import the hook and components in your Profile component ✅ (Already done)
2. Add the push notification state management ✅ (Already done)
3. Enhance the toggle handler for push notifications ✅ (Already done)
4. Add the post-migration prompt to the profile page ✅ (Already done)
5. Include the permission modal ✅ (Already done)

### User Experience Flow:

#### First-Time Users:
1. User sees post-migration prompt explaining benefits
2. User clicks "Enable Notifications"
3. Browser requests permission
4. If granted: Token saved, settings updated
5. If denied: Modal shows instructions

#### Existing Users with Permission Denied:
1. User toggles push notifications ON
2. Modal appears with browser-specific instructions
3. User follows instructions and clicks "Try Again"
4. System re-checks permission and proceeds accordingly

#### Settings Management:
- Toggle reflects current `user_settings.push_notifications` value
- Visual indicators show browser support and permission status
- Loading states provide feedback during async operations

## Technical Details

### State Management:
- Uses existing `useSettingsStore` for persistence
- Local state for UI interactions and modals
- Permission state tracked in real-time

### Error Handling:
- Network errors handled gracefully
- Permission denials guided with instructions
- Unsupported browsers handled with clear messaging

### Performance:
- Lazy loading of permission checks
- Efficient re-renders with proper dependency arrays
- Cleanup of event listeners and timeouts

### Browser Support:
- Chrome: Full support with specific instructions
- Firefox: Full support with specific instructions  
- Safari: Full support with specific instructions
- Edge: Full support with generic instructions
- Others: Graceful degradation with generic instructions

## Database Schema Requirements

Ensure your Supabase tables have the following structure:

### user_settings table:
```sql
- user_id (uuid, foreign key)
- push_notifications (boolean, nullable)
- email_notifications (boolean)
- created_at (timestamp)
- updated_at (timestamp)
```

### user_fcm_tokens table:
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key)
- fcm_token (text, unique)
- platform (text) -- 'web', 'ios', 'android'
- device_info (jsonb)
- is_active (boolean)
- created_at (timestamp)
- updated_at (timestamp)
```

## Environment Variables Required

Ensure these are set in your `.env` file:
```
VITE_FIREBASE_VAPID_PUBLIC_KEY=your_vapid_public_key
```

## Testing Checklist

### Manual Testing:
- [ ] Toggle ON with granted permission
- [ ] Toggle ON with default permission (first time)
- [ ] Toggle ON with denied permission
- [ ] Toggle OFF
- [ ] Post-migration prompt shows for new users
- [ ] Post-migration prompt doesn't show after dismissal
- [ ] Permission modal shows correct browser instructions
- [ ] Error handling for network issues
- [ ] Unsupported browser handling

### Browser Testing:
- [ ] Chrome desktop
- [ ] Firefox desktop  
- [ ] Safari desktop
- [ ] Edge desktop
- [ ] Mobile browsers (if applicable)

## Troubleshooting

### Common Issues:

1. **"Push notifications not supported"**
   - Check if running on HTTPS (required for push notifications)
   - Verify browser compatibility

2. **Permission modal doesn't show**
   - Check if `pushPermission` state is properly tracked
   - Verify modal trigger conditions

3. **FCM token not saving**
   - Check Supabase connection
   - Verify `user_fcm_tokens` table structure
   - Check Firebase configuration

4. **Prompt shows repeatedly**
   - Check localStorage key uniqueness
   - Verify dismissal logic

### Debug Logs:
The implementation includes comprehensive console logging:
- `✅` Success operations
- `❌` Error operations  
- `⚠️` Warning conditions

Look for these in the browser console for debugging.
