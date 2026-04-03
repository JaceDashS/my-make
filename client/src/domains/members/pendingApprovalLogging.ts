import { Platform } from 'react-native';

function isLoggingEnabled() {
  if (typeof __DEV__ !== 'undefined') {
    return __DEV__;
  }

  const runtimeProcess =
    typeof globalThis === 'object' && 'process' in globalThis
      ? (globalThis as {process?: {env?: {NODE_ENV?: string}}}).process
      : undefined;

  return runtimeProcess?.env?.NODE_ENV !== 'production';
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

