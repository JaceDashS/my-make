import { Platform } from 'react-native';

import { sendClientRuntimeLog } from '../../shared/lib/clientLogs';

export function logPendingApprovalEvent(
  event: string,
  payload: Record<string, unknown> = {},
) {
  const channel = `client/${Platform.OS}/members`;
  console.log(`[${channel}] ${event}`, payload);
  void sendClientRuntimeLog({
    channel,
    event,
    payload,
  }).catch(error => {
    console.log(`[${channel}] log:failed`, {
      error: error instanceof Error ? error.message : String(error),
      sourceEvent: event,
    });
  });
}

