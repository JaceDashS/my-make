import type {
  AccountSection,
  AppPage,
  MembersSection,
  SettingsSection,
} from './shell-model';

type ShellSection = SettingsSection | AccountSection | MembersSection;

type ResolvePageOptions<TSection extends ShellSection> = {
  canAccessMembersPage: boolean;
  closeMenu?: () => void;
  nextPage: AppPage;
  nextSection?: TSection;
  resetAccountUi?: () => void;
};

type ResolveGuardedRouteOptions<TSection extends ShellSection> = {
  canAccessMembersPage: boolean;
  closeMenu?: () => void;
  currentPage: AppPage;
  fallbackSection: TSection;
};

type ResolveAccountSectionOptions<TSection extends ShellSection> = {
  allowRegisterWhenUnauthenticated: boolean;
  currentSection: TSection;
  isAuthenticated: boolean;
  showStudentAccountItems: boolean;
  showTeacherAccountItems: boolean;
};

export function getDefaultSectionForPage(page: AppPage): ShellSection {
  if (page === 'settings') {
    return 'general';
  }

  if (page === 'account') {
    return 'login';
  }

  return 'pending-approval';
}

export function canAccessMembersShellPage(
  isAuthenticated: boolean,
  roleCode: string,
) {
  return isAuthenticated && (roleCode === 'ROOT' || roleCode === 'ADMIN');
}

export function resolvePageSelection<TSection extends ShellSection>({
  canAccessMembersPage,
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

  return null;
}

export function resolveAccountSection<TSection extends ShellSection>({
  allowRegisterWhenUnauthenticated,
  currentSection,
  isAuthenticated,
  showStudentAccountItems,
  showTeacherAccountItems,
}: ResolveAccountSectionOptions<TSection>): AccountSection {
  if (allowRegisterWhenUnauthenticated && currentSection === 'register') {
    return 'register';
  }

  if (
    showTeacherAccountItems &&
    (currentSection === 'preset' ||
      currentSection === 'available-schedule' ||
      currentSection === 'reservation-view')
  ) {
    return currentSection;
  }

  if (
    showStudentAccountItems &&
    (currentSection === 'student-options' || currentSection === 'reservation')
  ) {
    return currentSection;
  }

  return isAuthenticated ? 'login' : 'login';
}
