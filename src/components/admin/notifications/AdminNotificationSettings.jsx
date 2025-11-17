import { useState, useEffect, useCallback } from 'react';
import useAuthStore from '@stores/useAuthStore';
import useSettingsStore from '@stores/settingsStore';
import { getAdminDevices, toggleAdminDeviceNotifications, updateAdminDeviceActivity, deduplicateAdminTokens, registerAdminPushNotifications, requestNotificationPermission } from '@services/pushService';
import { updateAdminPushNotificationSetting, isAdminPushNotificationEnabled } from '@utils/tokenLifecycle';
import PushPermissionModal from '@components/shared/notifications/PushPermissionModal';

export default function AdminNotificationSettings() {
  const { user } = useAuthStore();
  const { settings, loading: settingsLoading } = useSettingsStore();
  const userId = user?.id;

  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [globalEnabled, setGlobalEnabled] = useState(false);
  const [togglingGlobal, setTogglingGlobal] = useState(false);
  const [togglingDevice, setTogglingDevice] = useState(new Set());
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionState, setPermissionState] = useState('default');

  const loadNotificationSettings = useCallback(async () => {
    if (!userId) return;
    
    try {
      const dbEnabled = await isAdminPushNotificationEnabled(userId);
      
      // Sync with browser permission state
      const browserPermission = Notification.permission;
      setPermissionState(browserPermission);
      
      // If database says enabled but browser permission is denied/default, show as disabled
      if (dbEnabled && browserPermission !== 'granted') {
        setGlobalEnabled(false);
        // Optionally update database to match reality
        // await updateAdminPushNotificationSetting(userId, false);
      } else {
        setGlobalEnabled(dbEnabled);
      }
    } catch (error) {
      console.error('Error loading admin notification settings:', error);
    }
  }, [userId]);

  const loadAdminDevices = useCallback(async () => {
    if (!userId) return;
    
    setLoadingDevices(true);
    try {
      const adminDevices = await getAdminDevices(userId);
      setDevices(adminDevices);
    } catch (error) {
      console.error('Error loading admin devices:', error);
    } finally {
      setLoadingDevices(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadNotificationSettings();
      loadAdminDevices();
      updateAdminDeviceActivity(userId);
      
      // Clean up any duplicate devices on component mount
      deduplicateAdminTokens(userId);
    }
  }, [userId, loadNotificationSettings, loadAdminDevices]);

  const handleGlobalToggle = async (enabled) => {
    if (!userId) return;
    
    setTogglingGlobal(true);
    try {
      if (enabled) {
        // Admin wants to ENABLE notifications
        const currentPermission = Notification.permission;
        setPermissionState(currentPermission);
        
        if (currentPermission === 'default') {
          // Need to request permission first
          const granted = await requestNotificationPermission();
          setPermissionState(Notification.permission);
          
          if (granted) {
            // Register FCM token
            const registered = await registerAdminPushNotifications(userId);
            if (registered) {
              // Update settings
              const success = await updateAdminPushNotificationSetting(userId, true);
              if (success) {
                setGlobalEnabled(true);
                await loadAdminDevices();
              }
            }
          } else {
            // Permission denied, show instructions modal
            setShowPermissionModal(true);
          }
        } else if (currentPermission === 'granted') {
          // Permission already granted, just register/update
          const registered = await registerAdminPushNotifications(userId);
          if (registered) {
            const success = await updateAdminPushNotificationSetting(userId, true);
            if (success) {
              setGlobalEnabled(true);
              await loadAdminDevices();
            }
          }
        } else {
          // Permission denied, show instructions
          setShowPermissionModal(true);
        }
      } else {
        // Admin wants to DISABLE notifications
        const success = await updateAdminPushNotificationSetting(userId, false);
        if (success) {
          setGlobalEnabled(false);
          await loadAdminDevices();
        }
      }
    } catch (error) {
      console.error('Error updating admin global notifications:', error);
    } finally {
      setTogglingGlobal(false);
    }
  };

  const handleDeviceToggle = async (device, enabled) => {
    if (!userId) return;
    
    setTogglingDevice(prev => new Set([...prev, device.fcm_token]));
    try {
      const success = await toggleAdminDeviceNotifications(userId, device.fcm_token, enabled);
      if (success) {
        setDevices(prev => prev.map(d => 
          d.fcm_token === device.fcm_token 
            ? { ...d, enabled: enabled } 
            : d
        ));
      }
    } catch (error) {
      console.error('Error updating admin device notifications:', error);
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
      if (key === 'email_notifications') {
        const settingsStore = useSettingsStore.getState();
        await settingsStore.updateAdminSettings(userId, { [key]: value });
      }
    } catch (error) {
      console.error(`Error updating admin ${key}:`, error);
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

  const handleRetryPermission = async () => {
    setShowPermissionModal(false);
    // Wait for modal to close, then retry
    setTimeout(async () => {
      await handleGlobalToggle(true);
    }, 300);
  };

  if (settingsLoading || loadingDevices) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg">
      <div className="px-6 py-4 border-b border-gray-700">
        <h3 className="text-lg font-medium text-blue-300 flex items-center">
          Admin Notifications
        </h3>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between p-4 bg-gray-750 rounded-lg">
          <div className="flex-1">
            <h4 className="text-sm font-medium text-blue-200">Global Admin Notifications</h4>
            <p className="text-sm text-gray-400 mt-1">
              Turn on/off all push notifications for admin functions
            </p>
          </div>
          <button
            onClick={() => handleGlobalToggle(!globalEnabled)}
            disabled={togglingGlobal}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
              globalEnabled ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                globalEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Warning when browser permission is revoked */}
        {permissionState === 'denied' && (
          <div className="p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-yellow-300">Browser Permissions Disabled</h4>
                <p className="text-sm text-yellow-200 mt-1">
                  Notifications are blocked in your browser settings. To receive push notifications, you need to enable them in your browser first.
                </p>
                <button
                  onClick={() => setShowPermissionModal(true)}
                  className="mt-2 text-sm font-medium text-yellow-300 hover:text-yellow-100 underline"
                >
                  Show instructions
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between p-4 border border-gray-700 rounded-lg">
          <div className="flex-1">
            <h4 className="text-sm font-medium text-blue-200">Admin Email Notifications</h4>
            <p className="text-sm text-gray-400 mt-1">
              Receive emails about system events and admin activities
            </p>
          </div>
          <button
            onClick={() => handleToggle('email_notifications', !settings?.email_notifications)}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              settings?.email_notifications ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                settings?.email_notifications ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div>
          <h4 className="text-sm font-medium text-blue-200 mb-3">This Device</h4>
          {devices.filter(device => device.is_current_device).map(device => (
            <div key={device.fcm_token} className="flex items-center justify-between p-3 border border-gray-700 rounded-lg bg-blue-900/30">
              <div className="flex items-center space-x-3">
                <span className="text-xl">{getPlatformIcon(device.platform)}</span>
                <div>
                  <p className="text-sm font-medium text-blue-100">
                    {device.device_name} <span className="text-blue-400">(current)</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    Last active: {device.relative_time}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDeviceToggle(device, !device.enabled)}  
                disabled={!globalEnabled || togglingDevice.has(device.fcm_token)}
                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                  device.enabled && globalEnabled ? 'bg-blue-600' : 'bg-gray-600'  
                }`}
              >
                <span
                  className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                    device.enabled && globalEnabled ? 'translate-x-6' : 'translate-x-1'  
                  }`}
                />
              </button>
            </div>
          ))}
        </div>

        {/* {devices.filter(device => !device.is_current_device).length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-blue-200 mb-3">Other Devices</h4>
            <div className="space-y-2">
              {devices.filter(device => !device.is_current_device).map(device => (
                <div key={device.fcm_token} className="flex items-center justify-between p-3 border border-gray-700 rounded-lg hover:bg-gray-750 transition-colors">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{getPlatformIcon(device.platform)}</span>
                    <div>
                      <p className="text-sm font-medium text-blue-100">
                        {device.device_name}
                      </p>
                      <p className="text-xs text-gray-400">
                        Last active: {device.relative_time}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeviceToggle(device, !device.enabled)} 
                    disabled={!globalEnabled || togglingDevice.has(device.fcm_token)}
                    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                      device.enabled && globalEnabled ? 'bg-blue-600' : 'bg-gray-600' 
                    }`}
                  >
                    <span
                      className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                        device.enabled && globalEnabled ? 'translate-x-6' : 'translate-x-1'  
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )} */}

        {!globalEnabled && (
          <div className="p-3 bg-yellow-900/30 border border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-200">
              Enable global admin notifications to manage devices individually.
            </p>
          </div>
        )}

        {devices.length === 0 && (
          <div className="text-center py-6 text-gray-400">
            <p className="text-sm">No admin devices found with push notification support.</p>
          </div>
        )}
      </div>

      <PushPermissionModal
        isOpen={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        permissionState={permissionState}
        onRetry={handleRetryPermission}
      />
    </div>
  );
}