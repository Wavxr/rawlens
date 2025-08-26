/**
 * Device fingerprinting utility for stable device identification
 * Ensures same device gets same ID regardless of localhost/production or browser tabs
 */

/**
 * Generate stable device identifier
 * Same physical device + browser = same ID
 */
export function generateDeviceId() {
  const screen = `${window.screen.width}x${window.screen.height}`;
  const timezone = new Date().getTimezoneOffset();
  const platform = navigator.platform;
  const language = navigator.language;
  const cores = navigator.hardwareConcurrency || 'unknown';
  
  // Browser type without version numbers for consistency
  const browserType = getBrowserType();
  
  // Create stable fingerprint (same device = same fingerprint)
  const fingerprint = `${platform}-${screen}-${timezone}-${language}-${browserType}-${cores}`;
  
  // Generate consistent 16-character hash
  return btoa(fingerprint).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
}

/**
 * Detect browser type for device identification
 */
export function getBrowserType() {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome') && !ua.includes('Edge')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  if (ua.includes('Opera')) return 'Opera';
  return 'Unknown';
}

/**
 * Generate human-readable device name
 */
export function getDeviceName() {
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const deviceType = isMobile ? 'Mobile' : 'Desktop';
  const browser = getBrowserType();
  return `${deviceType} - ${browser}`;
}

/**
 * Check if current environment is mobile
 */
export function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
