import { useEffect, useState } from 'react';

import type { AccountSection, AppPage, MembersSection, SettingsSection } from './shell-model';
import {
  resolveAccountSection,
  resolveGuardedMembersRoute,
  resolvePageSelection,
} from './shell-routing';

type ShellSection = SettingsSection | AccountSection | MembersSection;

type UseShellNavigationParams<TSection extends ShellSection> = {
  allowMembersOverride?: boolean;
  canAccessMembersPage: boolean;
  closeMenu?: () => void;
  initialPage?: AppPage;
  initialSection: TSection;
  isAuthenticated: boolean;
  resetAccountUi: () => void;
  showStudentAccountItems: boolean;
  showTeacherAccountItems: boolean;
};

export function useShellNavigation<TSection extends ShellSection>({
  allowMembersOverride = false,
  canAccessMembersPage,
  closeMenu,
  initialPage = 'settings',
  initialSection,
  isAuthenticated,
  resetAccountUi,
  showStudentAccountItems,
  showTeacherAccountItems,
}: UseShellNavigationParams<TSection>) {
  const [page, setPage] = useState<AppPage>(initialPage);
  const [section, setSection] = useState<TSection>(initialSection);

  useEffect(() => {
    setPage(initialPage);
  }, [initialPage]);

  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  const canShowMembersPage = allowMembersOverride || canAccessMembersPage;

  const selectPage = (
    nextPage: AppPage,
    options?: {
      closeMenuOnSelect?: boolean;
      nextSection?: TSection;
    },
  ) => {
    const nextRoute = resolvePageSelection<TSection>({
      canAccessMembersPage: canShowMembersPage,
      closeMenu: options?.closeMenuOnSelect ? closeMenu : undefined,
      nextPage,
      nextSection: options?.nextSection,
      resetAccountUi: nextPage === 'account' ? resetAccountUi : undefined,
    });

    setPage(nextRoute.page);
    setSection(nextRoute.section);

    if (options?.closeMenuOnSelect) {
      closeMenu?.();
    }
  };

  const selectSection = (nextSection: TSection) => {
    if (nextSection === 'login' || nextSection === 'register') {
      resetAccountUi();
    }

    setSection(nextSection);
  };

  useEffect(() => {
    const guardedRoute = resolveGuardedMembersRoute<TSection>({
      canAccessMembersPage: canShowMembersPage,
      closeMenu,
      currentPage: page,
      fallbackSection: 'login' as TSection,
    });

    if (guardedRoute) {
      setPage(guardedRoute.page);
      setSection(guardedRoute.section);
    }
  }, [canShowMembersPage, closeMenu, page]);

  const accountSection = resolveAccountSection<TSection>({
    allowRegisterWhenUnauthenticated: allowMembersOverride || !isAuthenticated,
    currentSection: section,
    isAuthenticated,
    showStudentAccountItems,
    showTeacherAccountItems,
  });

  return {
    accountSection,
    canShowMembersPage,
    page,
    section,
    selectPage,
    selectSection,
    setPage,
    setSection,
  };
}
