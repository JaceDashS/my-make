import { useState } from 'react';

import {
  getHealthCheckCandidates,
  getHealthCheckLabel,
  runHealthCheck,
  type HealthCheckTarget,
} from '../../shared/lib/healthCheck';
import {
  INITIAL_TARGET_STATE,
  type AppPage,
  type LanguageMode,
  type TargetState,
  type ThemeMode,
} from './shell-model';
import {
  useAccountShellController,
  type AccountErrorLabels,
} from './useAccountShellController';
import { useShellNavigation } from './useShellNavigation';

type ShellSection =
  | import('./shell-model').SettingsSection
  | import('./shell-model').AccountSection
  | import('./shell-model').MembersSection
  | import('./shell-model').InventorySection;

type UseManagedAppShellParams<TSection extends ShellSection> = {
  allowMembersOverride?: boolean;
  closeMenu?: () => void;
  initialPage?: AppPage;
  initialSection: TSection;
  labels: AccountErrorLabels;
  loginSection: TSection;
  profileLoadLogLabel: string;
};

function nowLabel() {
  return `${Date.now()}`;
}

export function useManagedAppShell<TSection extends ShellSection>({
  allowMembersOverride = false,
  closeMenu,
  initialPage = 'settings',
  initialSection,
  labels,
  loginSection,
  profileLoadLogLabel,
}: UseManagedAppShellParams<TSection>) {
  const [language, setLanguage] = useState<LanguageMode>('en');
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [controllerPage, setControllerPage] = useState<AppPage>(initialPage);
  const [controllerSection, setControllerSection] =
    useState<TSection>(initialSection);
  const [loadingTarget, setLoadingTarget] = useState<HealthCheckTarget | null>(
    null,
  );
  const [targetStates, setTargetStates] =
    useState<Record<HealthCheckTarget, TargetState>>(INITIAL_TARGET_STATE);

  const accountController = useAccountShellController<TSection>({
    labels,
    loginSection,
    profileLoadLogLabel,
    setPage: setControllerPage,
    setSection: setControllerSection,
  });

  const navigation = useShellNavigation<TSection>({
    allowMembersOverride,
    canAccessInventoryPage: accountController.canAccessInventoryPage,
    canAccessMembersPage: accountController.canAccessMembersPage,
    closeMenu,
    initialPage: controllerPage,
    initialSection: controllerSection,
    isAuthenticated: accountController.isAuthenticated,
    resetAccountUi: accountController.resetAccountUi,
    showStudentReservationItem: accountController.showStudentReservationItem,
    showStudentAccountItems: accountController.showStudentAccountItems,
    showTeacherReservationItem: accountController.showTeacherReservationItem,
    showTeacherAccountItems: accountController.showTeacherAccountItems,
  });

  const handleHealthCheck = async (target: HealthCheckTarget) => {
    const label = getHealthCheckLabel(target);
    const candidates = getHealthCheckCandidates(target);

    setLoadingTarget(target);
    setTargetStates(current => ({
      ...current,
      [target]: {
        checkedAt: current[target].checkedAt,
        message: `${label}...`,
        result: null,
      },
    }));

    try {
      const result = await runHealthCheck(target);
      setTargetStates(current => ({
        ...current,
        [target]: {
          checkedAt: nowLabel(),
          message: result.ok ? `${label} OK` : `${label} failed`,
          result,
        },
      }));
    } catch (error) {
      setTargetStates(current => ({
        ...current,
        [target]: {
          checkedAt: nowLabel(),
          message: `${label} failed`,
          result: {
            ok: false,
            candidates,
            error: error instanceof Error ? error.message : String(error),
            label,
          },
        },
      }));
    } finally {
      setLoadingTarget(null);
    }
  };

  const runAllHealthChecks = async () => {
    for (const target of ['local', 'docker', 'render'] as const) {
      await handleHealthCheck(target);
    }
  };

  return {
    ...accountController,
    ...navigation,
    handleHealthCheck,
    language,
    loadingTarget,
    runAllHealthChecks,
    setLanguage,
    setTheme,
    targetStates,
    theme,
  };
}
