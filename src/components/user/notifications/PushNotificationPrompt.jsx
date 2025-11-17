import { useState, useEffect } from 'react';
import { usePushNotifications } from '@hooks/usePushNotifications';
import useSettingsStore from '@stores/settingsStore';
import PushPermissionModal from '@components/shared/notifications/PushPermissionModal';

const PushNotificationPrompt = ({ userId, onDismiss }) => {
  const { settings, update: updateSettings } = useSettingsStore();
  const { 
    isSupported, 
    permission, 
    isProcessing, 
    enablePushNotifications 
  } = usePushNotifications(userId);
  
  const [showModal, setShowModal] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  // Check if we should show the prompt
  useEffect(() => {
    if (settings && isSupported) {
      // Show prompt only if push_notifications is null/undefined (not explicitly set)
      // and user hasn't dismissed this prompt before
      const hasSetPreference = settings.push_notifications !== null && settings.push_notifications !== undefined;
      const hasBeenDismissed = localStorage.getItem(`push_prompt_dismissed_${userId}`) === 'true';
      
      setShouldShow(!hasSetPreference && !hasBeenDismissed);
    }
  }, [settings, isSupported, userId]);

  /**
   * Handle enabling push notifications from the prompt
   */
  const handleEnableNotifications = async () => {
    const result = await enablePushNotifications();
    
    if (result.success) {
      // Update user settings to true
      await updateSettings(userId, { push_notifications: true });
      // Mark prompt as handled
      localStorage.setItem(`push_prompt_dismissed_${userId}`, 'true');
      setShouldShow(false);
      onDismiss?.();
    } else if (result.reason === 'permission_denied') {
      // Show modal with instructions
      setShowModal(true);
    } else {
      // Handle other errors
      console.error('Failed to enable push notifications:', result);
      alert('Failed to enable notifications. Please try again later.');
    }
  };

  /**
   * Handle dismissing the prompt (maybe later)
   */
  const handleDismiss = async () => {
    // Set preference to false (user explicitly chose not to enable)
    await updateSettings(userId, { push_notifications: false });
    // Mark prompt as dismissed
    localStorage.setItem(`push_prompt_dismissed_${userId}`, 'true');
    setShouldShow(false);
    onDismiss?.();
  };

  /**
   * Handle retry from permission modal
   */
  const handleRetryFromModal = async () => {
    setShowModal(false);
    // Wait a bit for modal to close, then try again
    setTimeout(() => {
      handleEnableNotifications();
    }, 300);
  };

  // Don't render if we shouldn't show the prompt
  if (!shouldShow || !isSupported) {
    return null;
  }

  return (
    <>
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-6 shadow-sm">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6l6 6-6 6" />
              </svg>
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              📱 Stay Updated with Push Notifications
            </h3>
            <p className="text-gray-600 mb-4 text-sm leading-relaxed">
              Get instant notifications about your camera rentals, including pickup reminders, 
              return notifications, and important updates. Never miss a rental deadline again!
            </p>
            
            <div className="bg-white rounded-lg p-4 mb-4 border border-blue-100">
              <h4 className="font-medium text-gray-900 mb-2 text-sm">You'll receive notifications for:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Rental confirmations and status updates
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Pickup and return reminders
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Important account and security updates
                </li>
              </ul>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleEnableNotifications}
                disabled={isProcessing}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center space-x-2 text-sm"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Enabling...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                    </svg>
                    <span>Enable Notifications</span>
                  </>
                )}
              </button>
              
              <button
                onClick={handleDismiss}
                disabled={isProcessing}
                className="px-6 py-2 text-gray-600 border border-gray-300 hover:bg-gray-50 disabled:bg-gray-100 rounded-lg transition-colors text-sm"
              >
                Maybe Later
              </button>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Dismiss notification prompt"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <PushPermissionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        permissionState={permission}
        onRetry={handleRetryFromModal}
      />
    </>
  );
};

export default PushNotificationPrompt;
