import { Platform } from 'react-native';

function isLoggingEnabled() {
  if (typeof __DEV__ !== 'undefined') {
    return __DEV__;
  }

  return typeof process !== 'undefined'
    ? process.env.NODE_ENV !== 'production'
    : true;
}

export function logPendingApprovalEvent(
  event: string,
  payload: Record<string, unknown> = {},
) {
  if (!isLoggingEnabled()) {
    return;
  }

  const channel = `client/${Platform.OS}/members`;
  console.log(`[${channel}] ${event}`, payload);
}

