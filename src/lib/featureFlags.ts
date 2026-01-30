// src/lib/featureFlags.ts
// FIXED: Feature flag system for gradual rollout

export interface FeatureFlags {
  ENABLE_NEW_BOOKING_FLOW: boolean
  ENABLE_BOOKING_SYSTEM_GUARD: boolean
  ENABLE_SERVER_LOCK_VERIFICATION: boolean
  ENABLE_ENHANCED_ERROR_HANDLING: boolean
}

/**
 * Get feature flags from environment variables
 * Allows per-environment and per-deployment configuration
 */
function getFeatureFlagsFromEnv(): Partial<FeatureFlags> {
  return {
    ENABLE_NEW_BOOKING_FLOW: 
      import.meta.env.VITE_ENABLE_NEW_BOOKING_FLOW === 'true',
    ENABLE_BOOKING_SYSTEM_GUARD: 
      import.meta.env.VITE_ENABLE_BOOKING_SYSTEM_GUARD === 'true',
    ENABLE_SERVER_LOCK_VERIFICATION: 
      import.meta.env.VITE_ENABLE_SERVER_LOCK_VERIFICATION === 'true',
    ENABLE_ENHANCED_ERROR_HANDLING: 
      import.meta.env.VITE_ENABLE_ENHANCED_ERROR_HANDLING === 'true',
  }
}

/**
 * Default feature flags - safe defaults for production
 */
const DEFAULT_FLAGS: FeatureFlags = {
  // FIXED: Start with new booking flow disabled for safe rollout
  ENABLE_NEW_BOOKING_FLOW: false,
  // Guards and verification enabled by default for safety
  ENABLE_BOOKING_SYSTEM_GUARD: true,
  ENABLE_SERVER_LOCK_VERIFICATION: true,
  ENABLE_ENHANCED_ERROR_HANDLING: true,
}

/**
 * Merge environment flags with defaults
 */
const envFlags = getFeatureFlagsFromEnv()
export const featureFlags: FeatureFlags = {
  ...DEFAULT_FLAGS,
  ...envFlags,
}

/**
 * Helper to check if a feature is enabled
 */
export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  return featureFlags[flag]
}

/**
 * Log feature flag status on app start (development only)
 */
if (process.env.NODE_ENV === 'development') {
  console.group('🚩 Feature Flags')
  Object.entries(featureFlags).forEach(([key, value]) => {
    const emoji = value ? '✅' : '❌'
    console.log(`${emoji} ${key}: ${value}`)
  })
  console.groupEnd()
}

/**
 * Advanced: User-based feature flags (for A/B testing)
 * This can be extended to check user properties, percentages, etc.
 */
export function isFeatureEnabledForUser(
  flag: keyof FeatureFlags,
  userId?: string
): boolean {
  // Start with base flag value
  const baseEnabled = featureFlags[flag]
  
  if (!baseEnabled) {
    return false
  }
  
  // Add user-specific logic here
  // Example: Enable for specific user IDs
  const alphaUsers = import.meta.env.VITE_ALPHA_USER_IDS?.split(',') || []
  if (alphaUsers.includes(userId || '')) {
    return true
  }
  
  // Example: Enable for percentage of users
  if (import.meta.env.VITE_NEW_BOOKING_FLOW_PERCENTAGE) {
    const percentage = parseInt(import.meta.env.VITE_NEW_BOOKING_FLOW_PERCENTAGE)
    if (userId) {
      // Consistent hashing based on user ID
      const hash = userId.split('').reduce((acc, char) => 
        ((acc << 5) - acc) + char.charCodeAt(0), 0
      )
      const userPercentage = Math.abs(hash % 100)
      return userPercentage < percentage
    }
  }
  
  return baseEnabled
}

/**
 * Runtime flag override for testing
 * ONLY available in development
 */
export function setFeatureFlag(flag: keyof FeatureFlags, value: boolean): void {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('Feature flag overrides only available in development')
    return
  }
  
  featureFlags[flag] = value
  console.log(`🚩 Feature flag ${flag} set to ${value}`)
}