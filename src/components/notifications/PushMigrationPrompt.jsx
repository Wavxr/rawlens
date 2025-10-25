import { useState, useEffect, useCallback } from 'react';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import useAuthStore from '../../stores/useAuthStore';
import { supabase } from '../../lib/supabaseClient';

const PushMigrationPrompt = () => {
  const { session, role } = useAuthStore();
  const userId = session?.user?.id;
  const userRole = role || 'user';
  
  const {
    isSupported,
    isProcessing,
    enablePushNotifications,
  } = usePushNotifications(userId, userRole);

  const [showPrompt, setShowPrompt] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [hasCheckedMigration, setHasCheckedMigration] = useState(false);

  const checkMigrationStatus = useCallback(async () => {
    try {
      setHasCheckedMigration(true);
      
      // Check current permission status
      const currentPermission = Notification.permission;
      
      // Check if user already has FCM tokens in database
      const tableName = userRole === 'admin' ? 'admin_fcm_tokens' : 'user_fcm_tokens';
      const { data: tokens } = await supabase
        .from(tableName)
        .select('id')
        .eq('user_id', userId)
        .eq('enabled', true)  // ✅ Change from 'is_active' to 'enabled'
        .limit(1);

      // If user has permission granted but no FCM tokens, show migration prompt
      if (currentPermission === 'granted' && (!tokens || tokens.length === 0)) {
        setShowPrompt(true);
      }
      // If permission is default and no tokens, show friendly prompt (not auto-request)
      else if (currentPermission === 'default' && (!tokens || tokens.length === 0)) {
        setShowPrompt(true);
      }
      // If permission is denied, show instructions
      else if (currentPermission === 'denied') {
        setShowInstructions(true);
      }
    } catch (error) {
      console.error('Error checking migration status:', error);
    }
  }, [userId, userRole]);

  useEffect(() => {
    // Only show migration prompt once per session
    if (!userId || !isSupported || hasCheckedMigration) return;

    // Don't show if migration already dismissed this session
    if (sessionStorage.getItem('push_migration_dismissed')) return;

    // Check if user has already been migrated (has FCM tokens)
    checkMigrationStatus();
  }, [userId, isSupported, hasCheckedMigration, checkMigrationStatus]);

  const handleEnableNotifications = async () => {
    try {
      const result = await enablePushNotifications();
      console.log('Push notification result:', result); // Debug log
      
      if (result.success) {
        setShowPrompt(false);
        setShowInstructions(false);
        // Mark as handled to prevent showing again
        sessionStorage.setItem('push_migration_dismissed', 'true');
      } else if (result.reason === 'permission_denied') {
        setShowPrompt(false);
        setShowInstructions(true);
      } else {
        console.error('Failed to enable push notifications:', result);
        // Still dismiss the prompt if there's an error to avoid infinite loop
        setShowPrompt(false);
        sessionStorage.setItem('push_migration_dismissed', 'true');
      }
    } catch (error) {
      console.error('Error in handleEnableNotifications:', error);
      setShowPrompt(false);
      sessionStorage.setItem('push_migration_dismissed', 'true');
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowInstructions(false);
    // Store dismissal to prevent showing again this session
    sessionStorage.setItem('push_migration_dismissed', 'true');
  };

  const handleBrowserInstructions = () => {
    // Open browser-specific instructions based on user agent
    const userAgent = navigator.userAgent.toLowerCase();
    let instructionUrl = '/help/notifications'; // Default help page
    
    if (userAgent.includes('chrome')) {
      instructionUrl = 'https://support.google.com/chrome/answer/3220216?hl=en';
    } else if (userAgent.includes('firefox')) {
      instructionUrl = 'https://support.mozilla.org/en-US/kb/push-notifications-firefox';
    } else if (userAgent.includes('safari')) {
      instructionUrl = 'https://support.apple.com/guide/safari/manage-website-notifications-sfri40734/mac';
    }
    
    window.open(instructionUrl, '_blank');
  };

  // Don't show if migration already dismissed this session
  if (sessionStorage.getItem('push_migration_dismissed')) {
    return null;
  }

  if (showInstructions) {
    return (
      <div className="fixed top-4 right-4 max-w-sm bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg z-50">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-lg">🔔</span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 mb-1">
              Enable Notifications
            </h3>
            <p className="text-xs text-blue-700 mb-3">
              Notifications are currently blocked. To receive updates about your rentals, you'll need to enable them in your browser settings.
            </p>
            <div className="flex space-x-2">
              <button
                onClick={handleBrowserInstructions}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition-colors"
              >
                Show Instructions
              </button>
              <button
                onClick={handleDismiss}
                className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1.5"
              >
                Not Now
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-blue-400 hover:text-blue-600"
          >
            <span className="sr-only">Close</span>
            ✕
          </button>
        </div>
      </div>
    );
  }

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 max-w-sm bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg z-50">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-green-600 text-lg">🎉</span>
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-green-900 mb-1">
            Stay Updated with Push Notifications
          </h3>
          <p className="text-xs text-green-700 mb-3">
            Get instant updates about your camera rentals - confirmations, shipping status, and return reminders.
          </p>
          <div className="flex space-x-2">
            <button
              onClick={handleEnableNotifications}
              disabled={isProcessing}
              className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? 'Enabling...' : 'Enable Notifications'}
            </button>
            <button
              onClick={handleDismiss}
              className="text-xs text-green-600 hover:text-green-800 px-2 py-1.5"
            >
              Maybe Later
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-green-400 hover:text-green-600"
        >
          <span className="sr-only">Close</span>
          ✕
        </button>
      </div>
    </div>
  );
};

export default PushMigrationPrompt;
