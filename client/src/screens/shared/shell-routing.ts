import type {
  AccountSection,
  AppPage,
  InventorySection,
  MembersSection,
  SettingsSection,
} from './shell-model';

type ShellSection = SettingsSection | AccountSection | MembersSection | InventorySection;

type ResolvePageOptions<TSection extends ShellSection> = {
  canAccessMembersPage: boolean;
  canAccessInventoryPage: boolean;
  closeMenu?: () => void;
  nextPage: AppPage;
  nextSection?: TSection;
  resetAccountUi?: () => void;
};

type ResolveGuardedRouteOptions<TSection extends ShellSection> = {
  canAccessMembersPage: boolean;
  canAccessInventoryPage: boolean;
  closeMenu?: () => void;
  currentPage: AppPage;
  fallbackSection: TSection;
};

type ResolveAccountSectionOptions<TSection extends ShellSection> = {
  allowRegisterWhenUnauthenticated: boolean;
  currentSection: TSection;
  isAuthenticated: boolean;
  showStudentReservationItem: boolean;
  showStudentAccountItems: boolean;
  showTeacherReservationItem: boolean;
  showTeacherAccountItems: boolean;
};

export function getDefaultSectionForPage(page: AppPage): ShellSection {
  if (page === 'settings') {
    return 'general';
  }

  if (page === 'account') {
    return 'login';
  }

  if (page === 'inventory') {
    return 'inventory-list';
  }

  return 'pending-approval';
}

export function canAccessMembersShellPage(
  isAuthenticated: boolean,
  roleCode: string,
  statusCode?: string,
) {
  return (
    isAuthenticated &&
    (roleCode === 'ROOT' || roleCode === 'ADMIN') &&
    (statusCode ?? '') === 'ACTIVE'
  );
}

export function canAccessInventoryShellPage(
  isAuthenticated: boolean,
  roleCode: string,
  statusCode?: string,
) {
  return (
    isAuthenticated &&
    (roleCode === 'ROOT' || roleCode === 'ADMIN') &&
    (statusCode ?? '') === 'ACTIVE'
  );
}

export function resolvePageSelection<TSection extends ShellSection>({
  canAccessMembersPage,
  canAccessInventoryPage,
  closeMenu,
  nextPage,
  nextSection,
  resetAccountUi,
}: ResolvePageOptions<TSection>) {
  if (nextPage === 'members' && !canAccessMembersPage) {
    closeMenu?.();
    return {
      page: 'account' as const,
      section: 'login' as TSection,
    };
  }

  if (nextPage === 'inventory' && !canAccessInventoryPage) {
    closeMenu?.();
    return {
      page: 'account' as const,
      section: 'login' as TSection,
    };
  }

  if (nextPage === 'account') {
    resetAccountUi?.();
  }

  return {
    page: nextPage,
    section: (nextSection ?? getDefaultSectionForPage(nextPage)) as TSection,
  };
}

export function resolveGuardedMembersRoute<TSection extends ShellSection>({
  canAccessMembersPage,
  canAccessInventoryPage,
  closeMenu,
  currentPage,
  fallbackSection,
}: ResolveGuardedRouteOptions<TSection>) {
  if (currentPage === 'members' && !canAccessMembersPage) {
    closeMenu?.();
    return {
      page: 'account' as const,
      section: fallbackSection,
    };
  }

  if (currentPage === 'inventory' && !canAccessInventoryPage) {
    closeMenu?.();
    return {
      page: 'account' as const,
      section: fallbackSection,
    };
  }

  return null;
}

export function resolveAccountSection<TSection extends ShellSection>({
  allowRegisterWhenUnauthenticated,
  currentSection,
  isAuthenticated,
  showStudentReservationItem,
  showStudentAccountItems,
  showTeacherReservationItem,
  showTeacherAccountItems,
}: ResolveAccountSectionOptions<TSection>): AccountSection {
  if (allowRegisterWhenUnauthenticated && currentSection === 'register') {
    return 'register';
  }

  if (
    showTeacherAccountItems &&
    (currentSection === 'preset' || currentSection === 'available-schedule')
  ) {
    return currentSection;
  }

  if (showTeacherReservationItem && currentSection === 'reservation-view') {
    return currentSection;
  }

  if (showStudentAccountItems && currentSection === 'student-options') {
    return currentSection;
  }

  if (showStudentReservationItem && currentSection === 'reservation') {
    return currentSection;
  }

  return isAuthenticated ? 'login' : 'login';
}
