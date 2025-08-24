// src/components/PushNotificationTest.jsx
// This is a test component to help verify push notification functionality
// Remove this file after testing is complete

import React, { useState } from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import useSettingsStore from '../stores/settingsStore';
import useAuthStore from '../stores/useAuthStore';

const PushNotificationTest = () => {
  const { user } = useAuthStore();
  const { settings, update: updateSettings } = useSettingsStore();
  const { 
    isSupported, 
    permission, 
    isProcessing, 
    enablePushNotifications, 
    disablePushNotifications 
  } = usePushNotifications(user?.id);
  
  const [testResults, setTestResults] = useState([]);

  const addTestResult = (test, result, details) => {
    setTestResults(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString(),
      test,
      result,
      details
    }]);
  };

  const runTests = async () => {
    setTestResults([]);
    
    // Test 1: Check browser support
    addTestResult(
      'Browser Support Check',
      isSupported ? 'PASS' : 'FAIL',
      `Push notifications ${isSupported ? 'are' : 'are not'} supported`
    );

    // Test 2: Check permission state
    addTestResult(
      'Permission State Check',
      'INFO',
      `Current permission: ${permission}`
    );

    // Test 3: Check current settings
    addTestResult(
      'Settings Check',
      'INFO',
      `Current push_notifications setting: ${settings?.push_notifications}`
    );

    if (isSupported) {
      // Test 4: Try enabling push notifications
      try {
        const result = await enablePushNotifications();
        addTestResult(
          'Enable Push Test',
          result.success ? 'PASS' : 'FAIL',
          `Result: ${JSON.stringify(result)}`
        );
      } catch (error) {
        addTestResult(
          'Enable Push Test',
          'ERROR',
          `Error: ${error.message}`
        );
      }
    }
  };

  if (!user) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">Please log in to test push notifications</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Push Notification Test Console</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div className="p-3 bg-gray-50 rounded">
          <strong>User ID:</strong> {user.id}
        </div>
        <div className="p-3 bg-gray-50 rounded">
          <strong>Browser Support:</strong> {isSupported ? '✅ Yes' : '❌ No'}
        </div>
        <div className="p-3 bg-gray-50 rounded">
          <strong>Permission:</strong> {permission}
        </div>
        <div className="p-3 bg-gray-50 rounded">
          <strong>Settings:</strong> {String(settings?.push_notifications)}
        </div>
      </div>

      <div className="flex space-x-3 mb-6">
        <button
          onClick={runTests}
          disabled={isProcessing}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400"
        >
          {isProcessing ? 'Testing...' : 'Run Tests'}
        </button>
        
        <button
          onClick={() => setTestResults([])}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Clear Results
        </button>
        
        <button
          onClick={() => updateSettings(user.id, { push_notifications: null })}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
        >
          Reset Settings (Test Prompt)
        </button>
      </div>

      {testResults.length > 0 && (
        <div className="border rounded-lg">
          <div className="bg-gray-50 px-4 py-2 border-b">
            <h3 className="font-semibold">Test Results</h3>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {testResults.map((result, index) => (
              <div key={index} className="px-4 py-2 border-b last:border-b-0 text-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500">{result.timestamp}</span>
                  <span className="font-medium">{result.test}</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    result.result === 'PASS' ? 'bg-green-100 text-green-800' :
                    result.result === 'FAIL' ? 'bg-red-100 text-red-800' :
                    result.result === 'ERROR' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {result.result}
                  </span>
                </div>
                <div className="text-gray-600 mt-1">{result.details}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
        <h4 className="font-semibold text-yellow-800 mb-2">Testing Instructions:</h4>
        <ol className="text-yellow-700 space-y-1 list-decimal list-inside">
          <li>Click "Run Tests" to check current state</li>
          <li>Try toggling push notifications in Profile settings</li>
          <li>Click "Reset Settings" to test the post-migration prompt</li>
          <li>Test in different browsers and permission states</li>
          <li>Check browser console for detailed logs</li>
        </ol>
      </div>
    </div>
  );
};

export default PushNotificationTest;
