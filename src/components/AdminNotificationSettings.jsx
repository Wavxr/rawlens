import { useState, useEffect } from 'react';
import { Bell, Smartphone, Monitor, Tablet, RefreshCw } from 'lucide-react';
import { getUserDevices, toggleDeviceNotifications, updateDeviceActivity } from '../services/pushService';
import useAuthStore from '../stores/useAuthStore';
import useSettingsStore from '../stores/settingsStore';
import { usePushNotifications } from '../hooks/usePushNotifications';

const AdminNotificationSettings = () => {
  const { user } = useAuthStore();
  const { settings, update: updateSettings, currentRole } = useSettingsStore();
  // ✅ Force admin role for this component
  const { enablePushNotifications, disablePushNotifications } = usePushNotifications(user?.id, 'admin');

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  // single load function (no stale closure)
  async function loadDevices() {
    console.log('loadDevices called', { userId: user?.id, role: 'admin', settingsLoaded: !!settings });
    if (!user?.id) {
      console.log('Skipping loadDevices - missing user ID');
      setDevices([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Always use admin role for this component
      const adminDevices = await getUserDevices(user.id, 'admin');
      console.log('getUserDevices returned', adminDevices?.length);
      setDevices(adminDevices || []);
    } catch (error) {
      console.error('Failed to load admin devices:', error);
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }

  // First effect: Update device activity when component mounts
  useEffect(() => {
    let cancelled = false;
    async function initActivityThenLoad() {
      if (!user?.id) return;
      try {
        // Update current device activity for admin role first
        await updateDeviceActivity(user.id, 'admin');
        if (!cancelled) {
          // Then fetch devices so latest activity/token is reflected
          await loadDevices();
        }
      } catch (e) {
        console.warn('updateDeviceActivity failed (admin); proceeding to load devices anyway');
        if (!cancelled) await loadDevices();
      }
    }
    initActivityThenLoad();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Second effect: Reload devices when push setting flips (e.g., enabling registers token)
  useEffect(() => {
    if (!user?.id) return;
    loadDevices();
  }, [user?.id, settings?.push_notifications]);

  // handlers stay simple and reuse loadDevices
  const handleGlobalToggle = async (enabled) => {
    if (!user?.id) return;
    try {
      if (enabled) await enablePushNotifications();
      else await disablePushNotifications();
      await updateSettings(user.id, { push_notifications: enabled }, 'admin');
      // refresh after a short delay to give token/save time
      setTimeout(loadDevices, 800);
    } catch (error) {
      console.error('Failed to toggle admin notifications:', error);
    }
  };

  const handleDeviceToggle = async (device, enabled) => {
    if (!user?.id) return;
    try {
      await toggleDeviceNotifications(user.id, device.fcm_token, enabled, 'admin');
      await loadDevices();
    } catch (error) {
      console.error('Failed to toggle device notifications:', error);
    }
  };

  const getDeviceIcon = (platform) => {
    switch ((platform || '').toLowerCase()) {
      case 'android':
      case 'ios':
        return <Smartphone className="h-5 w-5" />;
      case 'web':
        return <Monitor className="h-5 w-5" />;
      default:
        return <Tablet className="h-5 w-5" />;
    }
  };

  const getPlatformLabel = (platform) => {
    switch ((platform || '').toLowerCase()) {
      case 'android': return 'Android';
      case 'ios': return 'iOS';
      case 'web': return 'Web Browser';
      default: return 'Unknown Device';
    }
  };

  if (!user?.id || currentRole !== 'admin') {
    return (
      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global Admin Notifications Toggle */}
      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Bell className="h-5 w-5 text-indigo-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Admin Push Notifications
            </h3>
          </div>
          <button
            onClick={() => handleGlobalToggle(!settings?.push_notifications)}
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
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Receive push notifications for rental events, user verifications, and other admin activities.
        </p>
      </div>

      {/* Device Management */}
      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Admin Devices
          </h3>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Manage push notifications for each of your admin devices. You can enable or disable notifications per device.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading devices...</span>
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">No admin devices found</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
              {!settings?.push_notifications 
                ? "Enable admin push notifications above to register this device."
                : "Enable notifications on this device to see it listed here."
              }
            </p>
            {!settings?.push_notifications && (
              <button
                onClick={() => handleGlobalToggle(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Bell className="h-4 w-4 mr-2" />
                Enable Admin Notifications
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {devices.map((device) => (
              <div
                key={device.id}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 text-gray-400">
                    {getDeviceIcon(device.platform)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {device.device_name}
                      {device.is_current_device && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                          Current Device
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {getPlatformLabel(device.platform)} • Last active {device.relative_time}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {device.is_active ? 'Enabled' : 'Disabled'}
                  </span>
                  <button
                    onClick={() => handleDeviceToggle(device, !device.is_active)}
                    className={`${
                      device.is_active ? 'bg-indigo-600' : 'bg-gray-200'
                    } relative inline-flex items-center h-5 rounded-full w-9 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                  >
                    <span
                      className={`${
                        device.is_active ? 'translate-x-5' : 'translate-x-1'
                      } inline-block w-3 h-3 transform bg-white rounded-full transition-transform`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notification Types */}
      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Admin Notification Types
        </h3>
        <div className="space-y-3">
          {[
            { title: 'New Rental Requests', description: 'When users submit new rental requests' },
            { title: 'Rental Status Changes', description: 'When rentals become active or overdue' },
            { title: 'Delivery Updates', description: 'When items are delivered or returned' },
            { title: 'User Verification Appeals', description: 'When users appeal verification decisions' },
            { title: 'Return Reminders', description: 'When users need to return equipment' },
          ].map((type, index) => (
            <div key={index} className="flex items-start space-x-3 text-sm">
              <div className="flex-shrink-0 w-2 h-2 bg-indigo-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">{type.title}</p>
                <p className="text-gray-600 dark:text-gray-400">{type.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminNotificationSettings;
