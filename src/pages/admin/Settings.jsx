import { useEffect } from 'react';
import useAuthStore from '@stores/useAuthStore';
import useSettingsStore from '@stores/settingsStore';
import AdminNotificationSettings from '@components/admin/notifications/AdminNotificationSettings';
import { updateDeviceActivity } from '@services/pushService';

const Settings = () => {
  const { user } = useAuthStore();
  const { settings, init: initSettings, update: updateSettings, loading, currentRole } = useSettingsStore();

  // First effect: Initialize settings when user is available
  useEffect(() => {
    async function initializeSettings() {
      if (user?.id) {
        try {
          // Always initialize admin settings for admin pages
          await initSettings(user.id, 'admin');
        } catch (error) {
          console.error('Failed to initialize admin settings:', error);
        }
      }
    }

    initializeSettings();
  }, [user?.id, initSettings]);
  
  // Second effect: Update device activity when user is available
  useEffect(() => {
    if (user?.id) {
      // Update current device activity for admin role
      updateDeviceActivity(user.id, 'admin');
    }
  }, [user?.id]);

  const handleToggle = async (key, value) => {
    if (user?.id) {
      try {
        // Update admin settings
        await updateSettings(user.id, { [key]: value }, 'admin');
      } catch (error) {
        console.error(`Failed to toggle ${key}:`, error);
      }
    }
  };

  // Show loading while settings aren't loaded yet
  if (loading || !settings) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-gray-200 rounded-lg h-64"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Settings</h1>
      
      <div className="space-y-6">
        {/* Basic Settings */}
        <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">General Settings</h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              {currentRole !== 'admin' && (
                <>
                  <span className="flex-grow flex flex-col">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Email Notifications
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Receive important admin updates via email.
                    </span>
                  </span>
                  <button
                    onClick={() => handleToggle('email_notifications', !settings?.email_notifications)}
                    className={`${
                      settings?.email_notifications ? 'bg-indigo-600' : 'bg-gray-200'
                    } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                  >
                    <span
                      className={`${
                        settings?.email_notifications ? 'translate-x-6' : 'translate-x-1'
                      } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
                    />
                  </button>
                </>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <span className="flex-grow flex flex-col">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Dark Mode
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Use dark theme for the admin interface.
                </span>
              </span>
              <button
                onClick={() => handleToggle('dark_mode', !settings?.dark_mode)}
                className={`${
                  settings?.dark_mode ? 'bg-indigo-600' : 'bg-gray-200'
                } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
              >
                <span
                  className={`${
                    settings?.dark_mode ? 'translate-x-6' : 'translate-x-1'
                  } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Admin Notification Settings */}
        <AdminNotificationSettings />
      </div>
    </div>
  );
};

export default Settings;
