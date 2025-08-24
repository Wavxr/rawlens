// src/utils/testFCM.js
// Test utility for FCM functionality - Remove after testing

import { sendPushNotification, NotificationTemplates } from '../services/fcmService';
import { supabase } from '../lib/supabaseClient';

/**
 * Test FCM notification sending
 * Run this in browser console or create a test page
 */
export async function testFCMNotification(userId) {
  console.log('🧪 Testing FCM notification...');
  
  try {
    // Test 1: Basic notification
    console.log('Test 1: Basic notification');
    const result1 = await sendPushNotification(
      userId,
      'FCM Test',
      'This is a test notification from the new FCM system!'
    );
    console.log('✅ Basic test result:', result1);

    // Test 2: Notification with data and click action
    console.log('Test 2: Advanced notification');
    const result2 = await sendPushNotification(
      userId,
      'Advanced FCM Test',
      'This notification has custom data and click action',
      {
        data: {
          type: 'test',
          test_id: '123',
          timestamp: new Date().toISOString()
        },
        clickAction: '/user/profile'
      }
    );
    console.log('✅ Advanced test result:', result2);

    // Test 3: Template notification
    console.log('Test 3: Template notification');
    const result3 = await NotificationTemplates.general(
      userId,
      '🎉 Template Test',
      'This uses the notification template system',
      { template: 'test' }
    );
    console.log('✅ Template test result:', result3);

    return {
      success: true,
      tests: [result1, result2, result3]
    };

  } catch (error) {
    console.error('❌ FCM test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test user settings and tokens
 */
export async function testUserFCMSetup(userId) {
  console.log('🔍 Checking user FCM setup...');
  
  try {
    // Check user settings
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('push_notifications')
      .eq('user_id', userId)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      throw new Error(`Settings error: ${settingsError.message}`);
    }

    console.log('📱 User push settings:', settings?.push_notifications);

    // Check FCM tokens
    const { data: tokens, error: tokensError } = await supabase
      .from('user_fcm_tokens')
      .select('id, platform, is_active, created_at')
      .eq('user_id', userId);

    if (tokensError) {
      throw new Error(`Tokens error: ${tokensError.message}`);
    }

    console.log('🎯 User FCM tokens:', tokens);

    const activeTokens = tokens?.filter(t => t.is_active) || [];
    
    return {
      success: true,
      pushEnabled: settings?.push_notifications === true,
      totalTokens: tokens?.length || 0,
      activeTokens: activeTokens.length,
      tokens: tokens || []
    };

  } catch (error) {
    console.error('❌ Setup check failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Run comprehensive FCM tests
 */
export async function runFCMTests(userId) {
  console.log('🚀 Starting comprehensive FCM tests...');
  
  const setupResult = await testUserFCMSetup(userId);
  console.log('Setup check:', setupResult);
  
  if (!setupResult.success) {
    console.error('❌ Setup check failed, skipping notification tests');
    return setupResult;
  }
  
  if (!setupResult.pushEnabled) {
    console.warn('⚠️ Push notifications disabled for user, but testing anyway...');
  }
  
  if (setupResult.activeTokens === 0) {
    console.warn('⚠️ No active tokens found, notifications will not be delivered');
  }
  
  const notificationResult = await testFCMNotification(userId);
  console.log('Notification test:', notificationResult);
  
  return {
    setup: setupResult,
    notifications: notificationResult,
    overall: setupResult.success && notificationResult.success
  };
}

// Browser console helper
if (typeof window !== 'undefined') {
  window.testFCM = {
    test: testFCMNotification,
    setup: testUserFCMSetup,
    all: runFCMTests
  };
  
  console.log('🧪 FCM Test utilities loaded!');
  console.log('Usage:');
  console.log('  testFCM.test("user-id") - Test notifications');
  console.log('  testFCM.setup("user-id") - Check setup');
  console.log('  testFCM.all("user-id") - Run all tests');
}
