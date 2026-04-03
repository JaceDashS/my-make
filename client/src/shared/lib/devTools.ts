import {
  LOCALHOST_HOST,
  requestLocalJson,
  type LocalUrlStrategy,
} from './httpClient';
import {RUNTIME_CONFIG} from '../../config/runtime/runtime-config';

const REQUEST_TIMEOUT_MS = 180000;
const DEVTOOLS_API_URL_STRATEGY: LocalUrlStrategy = {
  androidHosts: () => [RUNTIME_CONFIG.DEV_HOST_IP],
  defaultHosts: [LOCALHOST_HOST],
  windowsHosts: [LOCALHOST_HOST],
};

export type DevToolsResult = {
  academyName?: string;
  message: string;
  migrations?: string[];
  pendingAdmins?: number;
  pendingStudents?: number;
  pendingTeachers?: number;
  rootLoginId?: string;
  seedPasswordHint?: string;
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
    urlStrategy: DEVTOOLS_API_URL_STRATEGY,
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
