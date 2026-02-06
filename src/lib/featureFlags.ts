export interface FeatureFlags {
  ENABLE_BOOKING_ENGINE: boolean
}

const DEFAULT_FLAGS: FeatureFlags = {
  ENABLE_BOOKING_ENGINE: false,
}

export const featureFlags: FeatureFlags = {
  ...DEFAULT_FLAGS,
  ENABLE_BOOKING_ENGINE: import.meta.env.VITE_ENABLE_BOOKING_ENGINE === 'true',
}
