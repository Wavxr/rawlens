import { useEffect } from 'react';
import useAuthStore from '../../stores/useAuthStore';
import useSettingsStore from '../../stores/settingsStore';

const Settings = () => {
  const { user, role } = useAuthStore();
  const { settings, init: initSettings, update: updateSettings, loading } = useSettingsStore();

  useEffect(() => {
    if (user?.id && !settings) {
      // Admin settings page should manage admin role settings
      initSettings(user.id, 'admin');
    }
  }, [user, settings, initSettings]);

  const handleToggle = async (key, value) => {
    if (user?.id) {
      // Update admin settings
      await updateSettings(user.id, { [key]: value }, 'admin');
    }
  };

  if (loading && !settings) {
    return <div>Loading settings...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Settings</h1>
      <div className="max-w-2xl bg-white dark:bg-gray-800 shadow sm:rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Notifications</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Configure your personal notification preferences.
        </p>
        <div className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <span className="flex-grow flex flex-col">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Email Notifications
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Receive important updates via email.
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
          </div>
          <div className="flex items-center justify-between">
            <span className="flex-grow flex flex-col">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Push Notifications
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Get real-time alerts on your devices.
              </span>
            </span>
            <button
              onClick={() => handleToggle('push_notifications', !settings?.push_notifications)}
              className={`${
                settings?.push_notifications ? 'bg-indigo-600' : 'bg-gray-200'
              } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              <span
                className={`${
                  settings?.push_notifications ? 'translate-x-6' : 'translate-x-1'
                } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
