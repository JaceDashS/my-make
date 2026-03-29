import {requestLocalJson, FALLBACK_API_URL_STRATEGY} from './httpClient';
import {RUNTIME_CONFIG} from '../../config/runtime/runtime-config';

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

function runDevToolsAction(path: string): Promise<DevToolsResult> {
  return requestLocalJson<DevToolsResult>({
    method: 'POST',
    path,
    timeoutMs: REQUEST_TIMEOUT_MS,
    urlStrategy: FALLBACK_API_URL_STRATEGY,
  });
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

export function emitServerLog() {
  return runDevToolsAction(RUNTIME_CONFIG.CLIENT_DEV_SERVER_LOG_PATH);
}
