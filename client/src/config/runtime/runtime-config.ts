import { DEV_HOST_IP } from './dev-host';

const RUNTIME_CONFIG_STORAGE_KEY = 'my-make.runtime-config.override';

const BASE_RUNTIME_CONFIG = {
  APP_ENV: 'development',
  DEV_HOST_IP,
  CLIENT_LOCAL_PORT: '8080',
  CLIENT_DOCKER_PORT: '18080',
  CLIENT_HEALTH_PATH: '/health',
  CLIENT_ACCOUNT_LOGIN_PATH: '/api/accounts/login',
  CLIENT_ACCOUNT_PROFILE_PATH: '/api/accounts/profile',
  CLIENT_ACCOUNT_PROFILE_UPDATE_PATH: '/api/accounts/profile/update',
  CLIENT_ACCOUNT_LOGOUT_PATH: '/api/accounts/logout',
  CLIENT_ACCOUNT_MEMBER_REGISTER_PATH: '/api/accounts/member-register',
  CLIENT_ACCOUNT_ROOT_REGISTER_PATH: '/api/accounts/root-register',
  CLIENT_INVENTORY_LIST_PATH: '/api/inventory/list',
  CLIENT_INVENTORY_CREATE_PATH: '/api/inventory/create',
  CLIENT_INVENTORY_UPDATE_PATH: '/api/inventory/update',
  CLIENT_INVENTORY_DELETE_PATH: '/api/inventory/delete',
  CLIENT_INVENTORY_SELL_PATH: '/api/inventory/sell',
  CLIENT_INVENTORY_SEARCH_PATH: '/api/inventory/search',
  CLIENT_STUDENT_RESERVATION_AVAILABILITY_PATH:
    '/api/reservations/student/availability',
  CLIENT_STUDENT_RESERVATION_LIST_PATH: '/api/reservations/student/list',
  CLIENT_STUDENT_RESERVATION_CREATE_PATH: '/api/reservations/student/create',
  CLIENT_STUDENT_RESERVATION_CANCEL_PATH: '/api/reservations/student/cancel',
  CLIENT_TEACHER_RESERVATION_LIST_PATH: '/api/reservations/teacher/list',
  CLIENT_TEACHER_RESERVATION_APPROVE_PATH: '/api/reservations/teacher/approve',
  CLIENT_TEACHER_RESERVATION_CANCEL_PATH: '/api/reservations/teacher/cancel',
  CLIENT_DEV_INIT_TABLES_PATH: '/api/dev-tools/tables/init',
  CLIENT_DEV_INIT_AND_SEED_PATH: '/api/dev-tools/tables/init-and-inject',
  CLIENT_DEV_CREATE_LICENSE_PATH: '/api/dev-tools/licenses',
  CLIENT_DEV_SERVER_LOG_PATH: '/api/dev-tools/server-log',
  CLIENT_LICENSE_RENEW_PATH: '/api/licenses/renew',
  CLIENT_RENDER_BASE_URL: 'https://your-render-service.onrender.com',
} as const;

export type RuntimeConfig = Record<keyof typeof BASE_RUNTIME_CONFIG, string>;

export type RuntimeConfigOverride = Partial<
  Pick<
    RuntimeConfig,
    | 'DEV_HOST_IP'
    | 'CLIENT_LOCAL_PORT'
    | 'CLIENT_DOCKER_PORT'
    | 'CLIENT_RENDER_BASE_URL'
  >
>;

const runtimeConfigListeners = new Set<() => void>();

type BrowserStorage = {
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
};

function getBrowserLocalStorage(): BrowserStorage | null {
  const candidate = (globalThis as {localStorage?: BrowserStorage}).localStorage;

  if (!candidate) {
    return null;
  }

  return candidate;
}

function canUseLocalStorage() {
  return getBrowserLocalStorage() !== null;
}

function sanitizeRuntimeConfigOverride(
  override: RuntimeConfigOverride | null | undefined,
): RuntimeConfigOverride {
  if (!override) {
    return {};
  }

  const nextOverride: RuntimeConfigOverride = {};
  const devHostIp = override.DEV_HOST_IP?.trim();
  const localPort = override.CLIENT_LOCAL_PORT?.trim();
  const dockerPort = override.CLIENT_DOCKER_PORT?.trim();
  const renderBaseUrl = override.CLIENT_RENDER_BASE_URL?.trim();

  if (devHostIp) {
    nextOverride.DEV_HOST_IP = devHostIp;
  }

  if (localPort) {
    nextOverride.CLIENT_LOCAL_PORT = localPort;
  }

  if (dockerPort) {
    nextOverride.CLIENT_DOCKER_PORT = dockerPort;
  }

  if (renderBaseUrl) {
    nextOverride.CLIENT_RENDER_BASE_URL = renderBaseUrl.replace(/\/+$/, '');
  }

  return nextOverride;
}

function readRuntimeConfigOverride(): RuntimeConfigOverride {
  if (!canUseLocalStorage()) {
    return {};
  }

  try {
    const storage = getBrowserLocalStorage();
    if (!storage) {
      return {};
    }

    const rawValue = storage.getItem(RUNTIME_CONFIG_STORAGE_KEY);
    if (!rawValue) {
      return {};
    }

    return sanitizeRuntimeConfigOverride(
      JSON.parse(rawValue) as RuntimeConfigOverride,
    );
  } catch {
    return {};
  }
}

function writeRuntimeConfigOverride(override: RuntimeConfigOverride) {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    const storage = getBrowserLocalStorage();
    if (!storage) {
      return;
    }

    if (Object.keys(override).length === 0) {
      storage.removeItem(RUNTIME_CONFIG_STORAGE_KEY);
      return;
    }

    storage.setItem(RUNTIME_CONFIG_STORAGE_KEY, JSON.stringify(override));
  } catch {
    // Ignore storage failures and keep the in-memory runtime config usable.
  }
}

const runtimeConfigOverride = readRuntimeConfigOverride();

export const RUNTIME_CONFIG: RuntimeConfig = {
  ...BASE_RUNTIME_CONFIG,
  ...runtimeConfigOverride,
};

function emitRuntimeConfigChange() {
  runtimeConfigListeners.forEach(listener => {
    listener();
  });
}

export function getRuntimeConfigBase() {
  return BASE_RUNTIME_CONFIG;
}

export function getRuntimeConfigOverride() {
  return runtimeConfigOverride;
}

export function getRuntimeConfigSnapshot() {
  return RUNTIME_CONFIG;
}

export function subscribeRuntimeConfig(listener: () => void) {
  runtimeConfigListeners.add(listener);

  return () => {
    runtimeConfigListeners.delete(listener);
  };
}

export function setRuntimeConfigOverride(override: RuntimeConfigOverride) {
  const nextOverride = sanitizeRuntimeConfigOverride(override);

  runtimeConfigOverride.DEV_HOST_IP = nextOverride.DEV_HOST_IP;
  runtimeConfigOverride.CLIENT_LOCAL_PORT = nextOverride.CLIENT_LOCAL_PORT;
  runtimeConfigOverride.CLIENT_DOCKER_PORT = nextOverride.CLIENT_DOCKER_PORT;
  runtimeConfigOverride.CLIENT_RENDER_BASE_URL =
    nextOverride.CLIENT_RENDER_BASE_URL;

  RUNTIME_CONFIG.DEV_HOST_IP =
    nextOverride.DEV_HOST_IP || BASE_RUNTIME_CONFIG.DEV_HOST_IP;
  RUNTIME_CONFIG.CLIENT_LOCAL_PORT =
    nextOverride.CLIENT_LOCAL_PORT || BASE_RUNTIME_CONFIG.CLIENT_LOCAL_PORT;
  RUNTIME_CONFIG.CLIENT_DOCKER_PORT =
    nextOverride.CLIENT_DOCKER_PORT || BASE_RUNTIME_CONFIG.CLIENT_DOCKER_PORT;
  RUNTIME_CONFIG.CLIENT_RENDER_BASE_URL =
    nextOverride.CLIENT_RENDER_BASE_URL ||
    BASE_RUNTIME_CONFIG.CLIENT_RENDER_BASE_URL;

  writeRuntimeConfigOverride(nextOverride);
  emitRuntimeConfigChange();
}

export function resetRuntimeConfigOverride() {
  delete runtimeConfigOverride.DEV_HOST_IP;
  delete runtimeConfigOverride.CLIENT_LOCAL_PORT;
  delete runtimeConfigOverride.CLIENT_DOCKER_PORT;
  delete runtimeConfigOverride.CLIENT_RENDER_BASE_URL;
  RUNTIME_CONFIG.DEV_HOST_IP = BASE_RUNTIME_CONFIG.DEV_HOST_IP;
  RUNTIME_CONFIG.CLIENT_LOCAL_PORT = BASE_RUNTIME_CONFIG.CLIENT_LOCAL_PORT;
  RUNTIME_CONFIG.CLIENT_DOCKER_PORT = BASE_RUNTIME_CONFIG.CLIENT_DOCKER_PORT;
  RUNTIME_CONFIG.CLIENT_RENDER_BASE_URL =
    BASE_RUNTIME_CONFIG.CLIENT_RENDER_BASE_URL;
  writeRuntimeConfigOverride({});
  emitRuntimeConfigChange();
}
