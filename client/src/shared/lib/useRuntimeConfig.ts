import {useSyncExternalStore} from 'react';

import {
  getRuntimeConfigBase,
  getRuntimeConfigOverride,
  getRuntimeConfigSnapshot,
  subscribeRuntimeConfig,
} from '../../config/runtime/runtime-config';

export function useRuntimeConfig() {
  const runtimeConfig = useSyncExternalStore(
    subscribeRuntimeConfig,
    getRuntimeConfigSnapshot,
    getRuntimeConfigSnapshot,
  );

  return {
    runtimeConfig,
    runtimeConfigBase: getRuntimeConfigBase(),
    runtimeConfigOverride: getRuntimeConfigOverride(),
  };
}
