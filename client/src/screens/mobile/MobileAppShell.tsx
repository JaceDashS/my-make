import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getHealthCheckCandidates,
  getHealthCheckLabel,
  runHealthCheck,
  type HealthCheckTarget,
} from '../../shared/lib/healthCheck';
import {
  fetchAccountProfile,
  registerMemberAccount,
  registerRootAccount,
  updateAccountProfile,
  type AccountApiResult,
} from '../../shared/lib/accountApi';
import {
  applyAccountProfileState,
  clearAccountProfileState,
  runAccountLoginFlow,
  runAccountLogoutFlow,
  type AccountSession,
} from '../../shared/lib/accountSession';
import { windowsPressableFocusProps } from '../../shared/ui/windowsFocusProps';
import { AcademyMembersSection } from '../../domains/members/AcademyMembersSection';
import { MembersHomeScreen } from '../../domains/members/MembersHomeScreen';
import {
  INITIAL_TARGET_STATE,
  type AppPage,
  type AccountSection as AccountSectionType,
  type LanguageMode,
  type ThemeMode,
} from '../shared/shell-model';
import { getMobileShellLabels } from './mobile-shell/config/labels';
import { MenuPanel } from './mobile-shell/components/MenuPanel';
import { AccountSection } from './mobile-shell/pages/account/AccountSection';
import { DevHealthSection } from './mobile-shell/pages/settings/DevHealthSection';
import { GeneralSection } from './mobile-shell/pages/settings/GeneralSection';
import { mobileShellStyles as styles } from './mobile-shell/config/styles';
import { getMobileShellPalette } from './mobile-shell/config/theme';
import type { MobileMenuSection } from './mobile-shell/model/types';

function nowLabel() {
  return `${Date.now()}`;
}

function getDefaultSection(nextPage: AppPage): MobileMenuSection | undefined {
  if (nextPage === 'settings') {
    return 'general';
  }

  if (nextPage === 'account') {
    return 'login';
  }

  if (nextPage === 'members') {
    return 'pending-approval';
  }

  return undefined;
}

export function MobileAppShell() {
  const [session, setSession] = useState<AccountSession | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [page, setPage] = useState<AppPage>('settings');
  const [section, setSection] = useState<MobileMenuSection>('general');
  const [language, setLanguage] = useState<LanguageMode>('ja');
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [academyCode, setAcademyCode] = useState('');
  const [academyName, setAcademyName] = useState('');
  const [accountCode, setAccountCode] = useState('');
  const [licenseCode, setLicenseCode] = useState('');
  const [loginId, setLoginId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [phone, setPhone] = useState('');
  const [authPolicy, setAuthPolicy] = useState('');
  const [statusCode, setStatusCode] = useState('');
  const [password, setPassword] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [requestedRoleCode, setRequestedRoleCode] = useState<
    'STUDENT' | 'TEACHER' | 'ADMIN'
  >('STUDENT');
  const [registerType, setRegisterType] = useState<'user' | 'root'>('user');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);
  const [authAction, setAuthAction] = useState<
    'login' | 'logout' | 'profile' | 'register' | null
  >(null);
  const [loadingTarget, setLoadingTarget] = useState<HealthCheckTarget | null>(
    null,
  );
  const [targetStates, setTargetStates] = useState(INITIAL_TARGET_STATE);
  const toggleAnimation = useRef(new Animated.Value(0)).current;

  const t = getMobileShellLabels(language);
  const p = getMobileShellPalette(theme);

  const appendAuthDebugLog = (
    event: string,
    message?: string,
    payload: Record<string, unknown> = {},
  ) => {
    console.log(`[accounts] ${event}`, {
      message: message ?? '',
      ...payload,
    });
  };

  const localizeAccountError = (message?: string | null) => {
    switch (message) {
      case 'Please enter your login ID and password.':
        return t.requiredField;
      case 'Please enter a login ID.':
        return t.requiredField;
      case 'Please enter a display name.':
        return t.requiredField;
      case 'Please enter a password.':
        return t.requiredField;
      case 'Please enter a phone number.':
        return t.requiredField;
      case 'Please choose a member role.':
      case 'Please choose a valid member role.':
        return t.memberRoleInvalid;
      case 'That login ID is already in use. Please choose another one.':
      case 'That email address is already in use. Please choose another one.':
        return t.duplicateLoginId;
      case 'This academy already has a root account.':
        return t.rootAlreadyExists;
      case 'This license has already been assigned to an academy.':
        return t.licenseAssigned;
      case 'This license is not available for registration.':
        return t.licenseUnavailable;
      case 'This license has expired.':
        return t.licenseExpired;
      case 'That license code could not be found.':
        return t.licenseNotFound;
      case 'This license can only be renewed before it expires.':
        return t.licenseRenewUnavailable;
      case 'account approval is pending':
      case 'Your account is waiting for approval.':
        return t.accountPending;
      case 'account is on hold':
      case 'Your account is currently on hold.':
        return t.accountOnHold;
      case 'account is inactive':
      case 'Your account is inactive.':
        return t.accountInactive;
      case 'academy is inactive':
      case 'Your academy is currently inactive.':
        return t.academyInactive;
      case 'We could not create the academy right now. Please try again.':
        return t.academyCreateFailed;
      case 'We could not prepare your password right now. Please try again.':
        return t.passwordSetupFailed;
      case 'Only root accounts can update auth policy.':
        return t.profileAuthPolicyDenied;
      case 'You do not have permission to update this status.':
        return t.profileStatusDenied;
      case 'Please choose a valid status.':
        return t.profileStatusInvalid;
      case 'We could not update your profile right now. Please try again.':
        return t.profileUpdateFailed;
      case 'We could not sign you in right now. Please try again.':
      case "We couldn't complete sign-in right now. Please try again.":
        return t.signInFailed;
      case 'We could not complete registration right now. Please try again.':
      case "We couldn't create your member account right now. Please try again.":
      case "We couldn't create your member registration right now. Please try again.":
      case "We couldn't create the root account right now. Please try again.":
      case "We couldn't complete root registration right now. Please try again.":
      case "We couldn't finish registration right now. Please try again.":
      case "We couldn't assign the license right now. Please try again.":
      case "We couldn't confirm the license assignment right now. Please try again.":
      case "We couldn't assign that license. Please check the license and try again.":
      case "We couldn't start registration right now. Please try again.":
        return t.registrationBusy;
      default:
        return message ?? t.invalid;
    }
  };

  const applyProfile = (profile: AccountApiResult) => {
    applyAccountProfileState(
      profile,
      {
        setSession,
        setIsAuthenticated,
        setAccountCode,
        setAcademyCode,
        setAcademyName,
        setAuthPolicy,
        setDisplayName,
        setEmail,
        setLicenseCode,
        setLoginId,
        setNote,
        setPhone,
        setStatusCode,
      },
      appendAuthDebugLog,
    );
  };

  const clearProfile = () => {
    clearAccountProfileState(
      session,
      {
        setSession,
        setIsAuthenticated,
        setAccountCode,
        setAcademyCode,
        setAcademyName,
        setAuthPolicy,
        setDisplayName,
        setEmail,
        setLicenseCode,
        setLoginId,
        setNote,
        setPhone,
        setStatusCode,
      },
      appendAuthDebugLog,
    );
  };

  const loadProfile = async () => {
    const result = await fetchAccountProfile();
    if (result.status !== 'ok') {
      throw new Error(
        result.error ?? result.message ?? 'No active session was found.',
      );
    }

    appendAuthDebugLog('profile:load', 'loaded mobile profile', {
      detailsCount: (result as AccountApiResult & {details?: unknown[]}).details?.length ?? 0,
      loginId: result.loginId ?? '',
      roleCode: result.roleCode ?? '',
    });
    applyProfile(result);
    return result;
  };

  useEffect(() => {
    // 上部バーは固定し、トグルアイコンだけを自然に切り替える。
    Animated.timing(toggleAnimation, {
      duration: 180,
      toValue: isMenuOpen ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [isMenuOpen, toggleAnimation]);

  const choosePage = (nextPage: AppPage, nextSection?: MobileMenuSection) => {
    if (nextPage === 'members' && !canAccessMembersPage) {
      setPage('account');
      setSection('login');
      setIsMenuOpen(false);
      return;
    }

    // モバイルは項目選択後にメニューを閉じて本文へ戻す。
    if (nextPage === 'account') {
      clearRegistrationFields();
      setAuthError(null);
      setAuthNotice(null);
      setRegisterError(null);
      setRegisterSuccess(null);
    }

    setPage(nextPage);
    const resolvedSection = nextSection ?? getDefaultSection(nextPage);
    if (resolvedSection) {
      setSection(resolvedSection);
    }
    setIsMenuOpen(false);
  };

  const choosePageGroup = (nextPage: AppPage) => {
    if (nextPage === 'members' && !canAccessMembersPage) {
      setPage('account');
      setSection('login');
      return;
    }

    // 上位ページ選択時はメニューを閉じず、配下セクションの展開だけ切り替える。
    if (nextPage === 'account') {
      clearRegistrationFields();
      setAuthError(null);
      setAuthNotice(null);
      setRegisterError(null);
      setRegisterSuccess(null);
    }

    setPage(nextPage);
    const resolvedSection = getDefaultSection(nextPage);
    if (resolvedSection) {
      setSection(resolvedSection);
    }
  };

  const clearRegistrationFields = () => {
    setAcademyName('');
    setLicenseCode('');
    setLoginId('');
    setNote('');
    setDisplayName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setConfirmPassword('');
    setRequestedRoleCode('STUDENT');
  };

  const handleRegisterTypeChange = (nextRegisterType: 'user' | 'root') => {
    clearRegistrationFields();
    setRegisterType(nextRegisterType);
    setAuthError(null);
    setAuthNotice(null);
    setRegisterError(null);
    setRegisterSuccess(null);
  };

  const handleLogin = async () => {
    await runAccountLoginFlow({
      appendAuthDebugLog,
      applyProfile,
      localizeAccountError,
      loginId,
      password,
      setAuthAction,
      setAuthError,
      setAuthNotice,
      setIsAuthenticated,
      setPage,
      setRegisterSuccess,
    });
  };

  const handleRegister = async () => {
    if (registerType === 'user') {
      if (!loginId || !displayName || !phone || !password || !confirmPassword) {
        setRegisterError(t.requiredField);
        setRegisterSuccess(null);
        return;
      }

      if (password !== confirmPassword) {
        setRegisterError(t.passwordMismatch);
        setRegisterSuccess(null);
        return;
      }

      setAuthAction('register');

      try {
        const result = await registerMemberAccount({
          displayName,
          email,
          loginId,
          phone,
          password,
          requestedRoleCode,
        });

        if (result.status !== 'ok') {
          setRegisterError(
            localizeAccountError(result.error) ?? t.memberRegisterBody,
          );
          setRegisterSuccess(null);
          return;
        }

        setAuthError(null);
        setAuthNotice(t.memberRegisterSuccess);
        setRegisterError(null);
        setRegisterSuccess(t.memberRegisterSuccess);
        setPage('account');
        setSection('login');
        clearRegistrationFields();
        return;
      } finally {
        setAuthAction(null);
      }
    }

    if (
      !licenseCode ||
      !academyName ||
      !loginId ||
      !displayName ||
      !phone ||
      !password ||
      !confirmPassword
    ) {
      setRegisterError(t.requiredField);
      setRegisterSuccess(null);
      return;
    }

    if (password !== confirmPassword) {
      setRegisterError(t.passwordMismatch);
      setRegisterSuccess(null);
      return;
    }

    setAuthAction('register');

    try {
      const result = await registerRootAccount({
        academyName,
        email,
        licenseCode,
        phone,
        password,
        rootDisplayName: displayName,
        rootLoginId: loginId,
      });

      if (result.status !== 'ok') {
        setRegisterError(
          localizeAccountError(result.error) ?? t.registrationBusy,
        );
        setRegisterSuccess(null);
        return;
      }
      await loadProfile();
      setAuthError(null);
      setAuthNotice(null);
      setRegisterError(null);
      setRegisterSuccess(
        `${t.registerSuccess}${
          result.academyCode ? ` (${result.academyCode})` : ''
        }`,
      );
      setPage('account');
      setSection('login');
      clearRegistrationFields();
    } finally {
      setAuthAction(null);
    }
  };

  const handleLogout = async () => {
    await runAccountLogoutFlow({
      appendAuthDebugLog,
      clearProfile,
      currentLoginId: session?.loginId ?? '',
      currentRoleCode: session?.roleCode ?? '',
      setAuthAction,
      setAuthError,
      setAuthNotice,
      setPage,
    });
  };

  const canEditAuthPolicy = (session?.roleCode ?? '') === 'ROOT';
  const canAccessMembersPage =
    isAuthenticated &&
    ((session?.roleCode ?? '') === 'ROOT' || (session?.roleCode ?? '') === 'ADMIN');
  const canEditStatus =
    false;

  useEffect(() => {
    if (page === 'members' && !canAccessMembersPage) {
      setPage('account');
      setSection('login');
      setIsMenuOpen(false);
    }
  }, [canAccessMembersPage, page]);

  const handleSaveProfile = async (overrides?: {
    authPolicy?: string;
    email?: string;
    note?: string;
    password?: string;
    phone?: string;
    statusCode?: string;
  }) => {
    setAuthAction('profile');
    setAuthError(null);
    setAuthNotice(null);

    try {
      const payload: {
        authPolicy?: string;
        email?: string;
        note?: string;
        password?: string;
        phone?: string;
        statusCode?: string;
      } = {};

      if (overrides?.authPolicy !== undefined && canEditAuthPolicy) {
        payload.authPolicy = overrides.authPolicy;
      }
      if (overrides?.email !== undefined) {
        payload.email = overrides.email;
      }
      if (overrides?.note !== undefined) {
        payload.note = overrides.note;
      }
      if (overrides?.password !== undefined) {
        payload.password = overrides.password;
      }
      if (overrides?.phone !== undefined) {
        payload.phone = overrides.phone;
      }
      if (overrides?.statusCode !== undefined && canEditStatus) {
        payload.statusCode = overrides.statusCode;
      }

      const result = await updateAccountProfile(payload);

      if (result.status !== 'ok') {
        setAuthError(localizeAccountError(result.error ?? result.message));
        return;
      }

      if (overrides?.email !== undefined) {
        setEmail(overrides.email);
      }
      if (overrides?.note !== undefined) {
        setNote(overrides.note);
      }
      if (overrides?.phone !== undefined) {
        setPhone(overrides.phone);
      }
      if (overrides?.authPolicy !== undefined) {
        setAuthPolicy(overrides.authPolicy);
      }
      if (overrides?.statusCode !== undefined) {
        setStatusCode(overrides.statusCode);
      }
      applyProfile(result);
      setProfilePassword('');
      setAuthNotice(t.profileSaveSuccess);
    } finally {
      setAuthAction(null);
    }
  };

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
  const showTeacherAccountItems =
    isAuthenticated && (session?.roleCode ?? '') === 'TEACHER';
  const showStudentAccountItems =
    isAuthenticated && (session?.roleCode ?? '') === 'STUDENT';

  const accountSection: AccountSectionType =
    section === 'register' && !isAuthenticated
      ? 'register'
      : showTeacherAccountItems &&
        (section === 'preset' ||
          section === 'available-schedule' ||
          section === 'reservation-view')
      ? section
      : showStudentAccountItems &&
        (section === 'student-options' || section === 'reservation')
      ? section
      : 'login';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: p.appBg }]}>
      <View style={[styles.screen, { backgroundColor: p.appBg }]}>
        <View style={[styles.topBar, { borderBottomColor: p.border }]}>
          <Pressable
            {...windowsPressableFocusProps}
            onPress={() => setIsMenuOpen(v => !v)}
            style={[styles.menuButton, { backgroundColor: p.soft }]}
          >
            <View style={styles.menuIconFrame}>
              <Animated.Text
                style={[
                  styles.menuButtonLabel,
                  styles.menuIconLayer,
                  {
                    color: p.text,
                    opacity: toggleAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 0],
                    }),
                    transform: [
                      {
                        rotate: toggleAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '-90deg'],
                        }),
                      },
                      {
                        scale: toggleAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 0.82],
                        }),
                      },
                    ],
                  },
                ]}
              >
                ☰
              </Animated.Text>
              <Animated.Text
                style={[
                  styles.menuCloseLabel,
                  styles.menuIconLayer,
                  {
                    color: p.text,
                    opacity: toggleAnimation,
                    transform: [
                      {
                        rotate: toggleAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['90deg', '0deg'],
                        }),
                      },
                      {
                        scale: toggleAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.82, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                ×
              </Animated.Text>
            </View>
          </Pressable>
          <Text style={[styles.topBarTitle, { color: p.text }]}>
            {page === 'settings'
              ? t.settings
              : page === 'members'
              ? t.members
              : t.account}
          </Text>
        </View>

        <View style={styles.body}>
          {isMenuOpen ? (
            <MenuPanel
              isAuthenticated={isAuthenticated}
              showMembersPage={canAccessMembersPage}
              showTeacherAccountItems={showTeacherAccountItems}
              showStudentAccountItems={showStudentAccountItems}
              currentPage={page}
              currentSection={section}
              labels={t}
              onSelectGroup={choosePageGroup}
              onSelectSection={choosePage}
              palette={p}
            />
          ) : null}

          {!isMenuOpen && page === 'settings' && section === 'general' ? (
            <GeneralSection
              labels={t}
              language={language}
              onLanguageChange={setLanguage}
              onThemeChange={setTheme}
              palette={p}
              theme={theme}
            />
          ) : null}

          {!isMenuOpen && page === 'settings' && section === 'dev-health' ? (
            <DevHealthSection
              labels={t}
              loadingTarget={loadingTarget}
              onRunAll={runAllHealthChecks}
              onRunTarget={handleHealthCheck}
              palette={p}
              targetStates={targetStates}
            />
          ) : null}

          {!isMenuOpen && page === 'account' ? (
            <AccountSection
              authError={authError}
              authNotice={authNotice}
              academyCode={session?.academyCode ?? academyCode}
              academyName={session?.academyName ?? academyName}
              authPolicy={authPolicy}
              canEditAuthPolicy={canEditAuthPolicy}
              canEditStatus={canEditStatus}
              confirmPassword={confirmPassword}
              currentSection={accountSection}
              displayName={session?.displayName ?? displayName}
              email={email}
              isAuthenticated={isAuthenticated}
              profileDetails={session?.profileDetails ?? []}
              isSubmitting={authAction !== null}
              licenseCode={session?.licenseCode ?? licenseCode}
              loginId={session?.loginId ?? loginId}
              note={note}
              onAcademyNameChange={setAcademyName}
              onAuthPolicyChange={setAuthPolicy}
              onConfirmPasswordChange={setConfirmPassword}
              onDisplayNameChange={setDisplayName}
              onEmailChange={setEmail}
              onLicenseCodeChange={setLicenseCode}
              onLogin={handleLogin}
              onLoginIdChange={setLoginId}
              onNoteChange={setNote}
              onLogout={handleLogout}
              onPasswordChange={setPassword}
              onProfilePasswordChange={setProfilePassword}
              onPhoneChange={setPhone}
              onRegister={handleRegister}
              onRegisterTypeChange={handleRegisterTypeChange}
              onRequestedRoleCodeChange={setRequestedRoleCode}
              onSaveProfile={handleSaveProfile}
              onStatusCodeChange={setStatusCode}
              palette={p}
              password={password}
              phone={phone}
              registerError={registerError}
              registerSuccess={registerSuccess}
              registerType={registerType}
              requestedRoleCode={requestedRoleCode}
              statusCode={statusCode}
              texts={t}
            />
          ) : null}

          {!isMenuOpen &&
          page === 'members' &&
          canAccessMembersPage &&
          section === 'pending-approval' ? (
            <MembersHomeScreen
              academyCode={session?.academyCode ?? academyCode}
              academyName={session?.academyName ?? academyName}
              displayName={session?.displayName ?? displayName}
              isAuthenticated={isAuthenticated}
              language={language}
              loginId={session?.loginId ?? loginId}
              palette={p}
              roleCode={session?.roleCode ?? ''}
            />
          ) : null}

          {!isMenuOpen &&
          page === 'members' &&
          canAccessMembersPage &&
          section === 'academy-members' ? (
            <AcademyMembersSection
              academyCode={session?.academyCode ?? academyCode}
              isAuthenticated={isAuthenticated}
              language={language}
              palette={p}
              roleCode={session?.roleCode ?? ''}
            />
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}



















