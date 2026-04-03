import { useEffect, useState } from 'react';

import type { AccountSection, AppPage, InventorySection, MembersSection, SettingsSection } from './shell-model';
import {
  resolveAccountSection,
  resolveGuardedMembersRoute,
  resolvePageSelection,
} from './shell-routing';

type ShellSection = SettingsSection | AccountSection | MembersSection | InventorySection;

type UseShellNavigationParams<TSection extends ShellSection> = {
  allowMembersOverride?: boolean;
  canAccessInventoryPage: boolean;
  canAccessMembersPage: boolean;
  closeMenu?: () => void;
  initialPage?: AppPage;
  initialSection: TSection;
  isAuthenticated: boolean;
  resetAccountUi: () => void;
  showStudentReservationItem: boolean;
  showStudentAccountItems: boolean;
  showTeacherReservationItem: boolean;
  showTeacherAccountItems: boolean;
};

export function useShellNavigation<TSection extends ShellSection>({
  allowMembersOverride = false,
  canAccessInventoryPage,
  canAccessMembersPage,
  closeMenu,
  initialPage = 'settings',
  initialSection,
  isAuthenticated,
  resetAccountUi,
  showStudentReservationItem,
  showStudentAccountItems,
  showTeacherReservationItem,
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
  const canShowInventoryPage = allowMembersOverride || canAccessInventoryPage;

  const selectPage = (
    nextPage: AppPage,
    options?: {
      closeMenuOnSelect?: boolean;
      nextSection?: TSection;
    },
  ) => {
    const nextRoute = resolvePageSelection<TSection>({
      canAccessInventoryPage: canShowInventoryPage,
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
      canAccessInventoryPage: canShowInventoryPage,
      canAccessMembersPage: canShowMembersPage,
      closeMenu,
      currentPage: page,
      fallbackSection: 'login' as TSection,
    });

    if (guardedRoute) {
      setPage(guardedRoute.page);
      setSection(guardedRoute.section);
    }
  }, [canShowInventoryPage, canShowMembersPage, closeMenu, page]);

  const accountSection = resolveAccountSection<TSection>({
    allowRegisterWhenUnauthenticated: allowMembersOverride || !isAuthenticated,
    currentSection: section,
    isAuthenticated,
    showStudentReservationItem,
    showStudentAccountItems,
    showTeacherReservationItem,
    showTeacherAccountItems,
  });

  return {
    accountSection,
    canShowInventoryPage,
    canShowMembersPage,
    page,
    section,
    selectPage,
    selectSection,
    setPage,
    setSection,
  };
}
