import {Platform} from 'react-native';

import {RUNTIME_CONFIG} from '../../config/runtime/runtime-config';
import {unique} from './unique';

const EMULATOR_HOST = '10.0.2.2';
const LOCALHOST_HOST = 'localhost';
const LOOPBACK_HOST = '127.0.0.1';
const DEFAULT_TIMEOUT_MS = 3000;
const CLIENT_LOGS_PATH = '/api/dev-tools/client-logs';

export type ClientRuntimeLogInput = {
  channel: string;
  event: string;
  payload?: Record<string, unknown>;
};

type ClientLogEntry = {
  channel: string;
  event: string;
  payload: Record<string, unknown>;
  platform: string;
  timestamp: string;
};

function buildCandidates(path: string) {
  const port = RUNTIME_CONFIG.CLIENT_LOCAL_PORT;
  const devHostUrl = `http://${RUNTIME_CONFIG.DEV_HOST_IP}:${port}${path}`;
  const emulatorUrl = `http://${EMULATOR_HOST}:${port}${path}`;
  const localhostUrl = `http://${LOCALHOST_HOST}:${port}${path}`;
  const loopbackUrl = `http://${LOOPBACK_HOST}:${port}${path}`;

  if (Platform.OS === 'windows') {
    return unique([localhostUrl, loopbackUrl, devHostUrl]);
  }

  if (Platform.OS === 'android') {
    return unique([devHostUrl, emulatorUrl, localhostUrl, loopbackUrl]);
  }

  return unique([devHostUrl, localhostUrl, loopbackUrl]);
}

function createEntry(input: ClientRuntimeLogInput): ClientLogEntry {
  return {
    channel: input.channel,
    event: input.event,
    payload: input.payload ?? {},
    platform: Platform.OS,
    timestamp: new Date().toISOString(),
  };
}

async function postJson(url: string, body: string) {
  const response = await Promise.race([
    fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body,
    }),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Client log request timed out')), DEFAULT_TIMEOUT_MS);
    }),
  ]);

  if (!response.ok) {
    throw new Error(`Client log request failed with HTTP ${response.status}`);
  }
}

export async function sendClientRuntimeLog(input: ClientRuntimeLogInput) {
  const entry = createEntry(input);
  const body = JSON.stringify(entry);
  let lastError: Error | null = null;

  for (const url of buildCandidates(CLIENT_LOGS_PATH)) {
    try {
      await postJson(url, body);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  if (lastError) {
    throw lastError;
  }
}
