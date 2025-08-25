import React, { useState, useEffect } from 'react';
import useAuthStore from '../stores/useAuthStore';
import useSettingsStore from '../stores/settingsStore';
import { getUserDevices, toggleDeviceNotifications, updateDeviceActivity } from '../services/pushService';
import { updatePushNotificationSetting, isPushNotificationEnabled } from '../utils/tokenLifecycle';

export default function NotificationSettings({ userRole = 'user' }) {
  const { user, role: authRole } = useAuthStore();
  const { settings, loading: settingsLoading } = useSettingsStore();
  const userId = user?.id;
  const currentRole = userRole || authRole || 'user';

  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [globalEnabled, setGlobalEnabled] = useState(false);
  const [togglingGlobal, setTogglingGlobal] = useState(false);
  const [togglingDevice, setTogglingDevice] = useState(new Set());

  // Load initial data
  useEffect(() => {
    if (userId) {
      loadNotificationSettings();
      loadUserDevices();
      updateDeviceActivity(userId, currentRole); // Update current device activity
    }
  }, [userId, currentRole]);

  // Update global setting when settings change
  useEffect(() => {
    if (settings) {
      setGlobalEnabled(!!settings.push_notifications);
    }
  }, [settings]);

  const loadNotificationSettings = async () => {
    if (!userId) return;
    
    try {
      const enabled = await isPushNotificationEnabled(userId, currentRole);
      setGlobalEnabled(enabled);
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const loadUserDevices = async () => {
    if (!userId) return;
    
    setLoadingDevices(true);
    try {
      const userDevices = await getUserDevices(userId, currentRole);
      setDevices(userDevices);
    } catch (error) {
      console.error('Error loading user devices:', error);
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleGlobalToggle = async (enabled) => {
    if (!userId) return;
    
    setTogglingGlobal(true);
    try {
      const success = await updatePushNotificationSetting(userId, enabled, currentRole);
      if (success) {
        setGlobalEnabled(enabled);
        // Reload devices to see updated status
        await loadUserDevices();
      }
    } catch (error) {
      console.error('Error updating global notifications:', error);
    } finally {
      setTogglingGlobal(false);
    }
  };

  const handleDeviceToggle = async (device, enabled) => {
    if (!userId) return;
    
    setTogglingDevice(prev => new Set([...prev, device.fcm_token]));
    try {
      const success = await toggleDeviceNotifications(userId, device.fcm_token, enabled, currentRole);
      if (success) {
        // Update local state
        setDevices(prev => prev.map(d => 
          d.fcm_token === device.fcm_token 
            ? { ...d, is_active: enabled }
            : d
        ));
      }
    } catch (error) {
      console.error('Error updating device notifications:', error);
    } finally {
      setTogglingDevice(prev => {
        const newSet = new Set(prev);
        newSet.delete(device.fcm_token);
        return newSet;
      });
    }
  };

  const handleToggle = async (key, value) => {
    if (!userId) return;
    
    try {
      // Handle email notifications and other settings
      if (key === 'email_notifications') {
        // Use settings store for email notifications
        const settingsStore = useSettingsStore.getState();
        await settingsStore.update(userId, { [key]: value }, currentRole);
      }
    } catch (error) {
      console.error(`Error updating ${key}:`, error);
    }
  };

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'android': return '🤖';
      case 'ios': return '📱';
      case 'mobile_web': return '📱';
      case 'web': return '💻';
      default: return '🔗';
    }
  };

  if (settingsLoading || loadingDevices) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          ⚡ Notifications
        </h3>
      </div>

      <div className="p-6 space-y-6">
        {/* Global Notifications */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex-1">
            <h4 className="text-sm font-medium text-gray-900">🔘 Global Notifications</h4>
            <p className="text-sm text-gray-500 mt-1">
              Turn on/off all push notifications for this account
            </p>
          </div>
          <button
            onClick={() => handleGlobalToggle(!globalEnabled)}
            disabled={togglingGlobal}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
              globalEnabled ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                globalEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Email Notifications */}
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div className="flex-1">
            <h4 className="text-sm font-medium text-gray-900">📧 Email Notifications</h4>
            <p className="text-sm text-gray-500 mt-1">
              Receive emails about your rentals and account activity
            </p>
          </div>
          <button
            onClick={() => handleToggle('email_notifications', !settings?.email_notifications)}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              settings?.email_notifications ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                settings?.email_notifications ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Current Device */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">📱 This Device</h4>
          {devices.filter(device => device.is_current_device).map(device => (
            <div key={device.fcm_token} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-blue-50">
              <div className="flex items-center space-x-3">
                <span className="text-xl">{getPlatformIcon(device.platform)}</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {device.device_name} <span className="text-blue-600">(current)</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Last active: {device.relative_time}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDeviceToggle(device, !device.is_active)}
                disabled={!globalEnabled || togglingDevice.has(device.fcm_token)}
                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                  device.is_active && globalEnabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                    device.is_active && globalEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>

        {/* Other Devices */}
        {devices.filter(device => !device.is_current_device).length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">💻 Other Devices</h4>
            <div className="space-y-2">
              {devices.filter(device => !device.is_current_device).map(device => (
                <div key={device.fcm_token} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{getPlatformIcon(device.platform)}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {device.device_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Last active: {device.relative_time}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeviceToggle(device, !device.is_active)}
                    disabled={!globalEnabled || togglingDevice.has(device.fcm_token)}
                    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                      device.is_active && globalEnabled ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                        device.is_active && globalEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Help Text */}
        {!globalEnabled && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              💡 Enable global notifications to manage devices individually.
            </p>
          </div>
        )}

        {devices.length === 0 && (
          <div className="text-center py-6 text-gray-500">
            <p className="text-sm">No devices found with push notification support.</p>
          </div>
        )}
      </div>
    </div>
  );
}
