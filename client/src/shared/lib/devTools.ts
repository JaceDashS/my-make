import { Platform } from 'react-native';

import { RUNTIME_CONFIG } from '../../config/runtime/runtime-config';
import { unique } from './unique';

const EMULATOR_HOST = '10.0.2.2';
const LOCALHOST_HOST = 'localhost';
const LOOPBACK_HOST = '127.0.0.1';
const REQUEST_TIMEOUT_MS = 60000;

export type DevToolsResult = {
  academyName?: string;
  message: string;
  migrations?: string[];
  pendingAdmins?: number;
  pendingStudents?: number;
  pendingTeachers?: number;
  rootLoginId?: string;
  status: string;
  error?: string;
  licenseCode?: string;
  expiresAt?: string;
};

type RequestResult = {
  body: string;
  status: number;
};

function createTimeoutError() {
  return new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`);
}

function buildCandidates(path: string, port: string) {
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

async function requestWithXhr(url: string) {
  return new Promise<RequestResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('POST', url, true);
    xhr.timeout = REQUEST_TIMEOUT_MS;

    xhr.onload = () => {
      resolve({
        body: xhr.responseText ?? '',
        status: xhr.status,
      });
    };

    xhr.onerror = () => reject(new Error('XMLHttpRequest failed'));
    xhr.ontimeout = () => reject(createTimeoutError());
    xhr.onabort = () => reject(new Error('XMLHttpRequest aborted'));

    xhr.send();
  });
}

async function postJson(url: string) {
  if (Platform.OS === 'windows') {
    return requestWithXhr(url);
  }

  const response = await Promise.race([
    fetch(url, { method: 'POST' }),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(createTimeoutError()), REQUEST_TIMEOUT_MS);
    }),
  ]);

  return {
    body: await response.text(),
    status: response.status,
  };
}

async function runDevToolsAction(path: string): Promise<DevToolsResult> {
  const candidates = buildCandidates(path, RUNTIME_CONFIG.CLIENT_LOCAL_PORT);
  let lastError = 'Unknown error';

  for (const url of candidates) {
    try {
      const response = await postJson(url);
      const payload = JSON.parse(response.body) as DevToolsResult;

      if (response.status >= 200 && response.status < 300) {
        return payload;
      }

      lastError = payload.error ?? payload.message ?? `HTTP ${response.status}`;
      return payload;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  return {
    status: 'error',
    message: 'Developer option request failed.',
    error: lastError,
  };
}

export function initializeTables() {
  return runDevToolsAction(RUNTIME_CONFIG.CLIENT_DEV_INIT_TABLES_PATH);
}

export function initializeAndInjectTestData() {
  return runDevToolsAction(RUNTIME_CONFIG.CLIENT_DEV_INIT_AND_SEED_PATH);
}

export function createLicense() {
  return runDevToolsAction(RUNTIME_CONFIG.CLIENT_DEV_CREATE_LICENSE_PATH);
}
