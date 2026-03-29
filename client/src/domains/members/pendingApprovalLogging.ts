import { Platform } from 'react-native';

export function logPendingApprovalEvent(
  event: string,
  payload: Record<string, unknown> = {},
) {
  const channel = `client/${Platform.OS}/members`;
  console.log(`[${channel}] ${event}`, payload);
}

