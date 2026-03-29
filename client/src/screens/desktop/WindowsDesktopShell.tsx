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
import { sendClientRuntimeLog } from '../../shared/lib/clientLogs';
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
import { SidebarMenu } from './desktop-shell/components/SidebarMenu';
import { getDesktopShellLabels } from './desktop-shell/config/labels';
import { AccountSection } from './desktop-shell/pages/account/AccountSection';
import { DevHealthSection } from './desktop-shell/pages/settings/DevHealthSection';
import { GeneralSection } from './desktop-shell/pages/settings/GeneralSection';
import { desktopShellStyles as styles } from './desktop-shell/config/styles';
import { getDesktopShellPalette } from './desktop-shell/config/theme';
import type { DesktopMenuSection } from './desktop-shell/model/types';

function nowLabel() {
  return `${Date.now()}`;
}

function getDefaultSection(nextPage: AppPage): DesktopMenuSection | undefined {
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

export function WindowsDesktopShell() {
  const [session, setSession] = useState<AccountSession | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [page, setPage] = useState<AppPage>('settings');
  const [section, setSection] = useState<DesktopMenuSection>('general');
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
  const [disableConditionalVisibility, setDisableConditionalVisibility] =
    useState(false);
  const [unmountLoginContainer, setUnmountLoginContainer] = useState(false);
  const [unmountProfileContainer, setUnmountProfileContainer] = useState(false);
  const [authAction, setAuthAction] = useState<
    'login' | 'logout' | 'profile' | 'register' | null
  >(null);
  const [loadingTarget, setLoadingTarget] = useState<HealthCheckTarget | null>(
    null,
  );
  const [targetStates, setTargetStates] = useState(INITIAL_TARGET_STATE);
  const sidebarAnimation = useRef(new Animated.Value(1)).current;

  const t = getDesktopShellLabels(language);
  const p = getDesktopShellPalette(theme);

  const appendAuthDebugLog = (
    event: string,
    message?: string,
    payload: Record<string, unknown> = {},
  ) => {
    sendClientRuntimeLog({
      channel: 'accounts',
      event,
      payload: {
        message: message ?? '',
        ...payload,
      },
    }).catch(() => undefined);
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

    appendAuthDebugLog('profile:load', 'loaded desktop profile', {
      detailsCount: (result as AccountApiResult & {details?: unknown[]}).details?.length ?? 0,
      loginId: result.loginId ?? '',
      roleCode: result.roleCode ?? '',
    });
    applyProfile(result);
    return result;
  };

  useEffect(() => {
    // サイドバー本体だけを畳み、メインパネルは動かさない。
    Animated.timing(sidebarAnimation, {
      duration: 220,
      toValue: isSidebarOpen ? 1 : 0,
      useNativeDriver: false,
    }).start();
  }, [isSidebarOpen, sidebarAnimation]);

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

      if (overrides?.authPolicy !== undefined && session?.roleCode === 'ROOT') {
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

  const handlePageChange = (nextPage: AppPage) => {
    if (nextPage === 'members' && !canAccessMembersPage && !disableConditionalVisibility) {
      setPage('account');
      setSection('login');
      return;
    }

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

  const canEditAuthPolicy = (session?.roleCode ?? '') === 'ROOT';
  const canAccessMembersPage =
    isAuthenticated &&
    ((session?.roleCode ?? '') === 'ROOT' || (session?.roleCode ?? '') === 'ADMIN');
  const canEditStatus =
    false;
  const showTeacherAccountItems =
    isAuthenticated && (session?.roleCode ?? '') === 'TEACHER';
  const showStudentAccountItems =
    isAuthenticated && (session?.roleCode ?? '') === 'STUDENT';

  useEffect(() => {
    if (page === 'members' && !canAccessMembersPage && !disableConditionalVisibility) {
      setPage('account');
      setSection('login');
    }
  }, [canAccessMembersPage, disableConditionalVisibility, page]);

  const handleAccountSectionChange = (nextSection: DesktopMenuSection) => {
    if (nextSection === 'login' || nextSection === 'register') {
      clearRegistrationFields();
      setAuthError(null);
      setAuthNotice(null);
      setRegisterError(null);
      setRegisterSuccess(null);
    }

    setSection(nextSection);
  };

  const handleRegisterTypeChange = (nextRegisterType: 'user' | 'root') => {
    clearRegistrationFields();
    setRegisterType(nextRegisterType);
    setAuthError(null);
    setAuthNotice(null);
    setRegisterError(null);
    setRegisterSuccess(null);
  };

  const accountSection: AccountSectionType =
    (disableConditionalVisibility || !isAuthenticated) && section === 'register'
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
      <View style={[styles.shell, { backgroundColor: p.appBg }]}>
        <SidebarMenu
          animation={sidebarAnimation}
          disableConditionalVisibility={disableConditionalVisibility}
          isOpen={isSidebarOpen}
          isAuthenticated={isAuthenticated}
          showMembersPage={disableConditionalVisibility || canAccessMembersPage}
          showTeacherAccountItems={showTeacherAccountItems}
          showStudentAccountItems={showStudentAccountItems}
          labels={t}
          onPageChange={handlePageChange}
          onSectionChange={handleAccountSectionChange}
          page={page}
          palette={p}
          section={section}
        />

        <View style={[styles.mainPanel, { backgroundColor: p.card }]}>
          <View style={[styles.topBar, { borderBottomColor: p.border }]}>
            <Pressable
              {...windowsPressableFocusProps}
              onPress={() => setIsSidebarOpen(v => !v)}
              style={[styles.menuButton, { backgroundColor: p.soft }]}
            >
              <Text style={[styles.menuButtonLabel, { color: p.text }]}>☰</Text>
            </Pressable>
            <Text style={[styles.topBarTitle, { color: p.text }]}>
              {page === 'settings'
                ? t.settings
                : page === 'members'
                ? t.members
                : t.account}
            </Text>
          </View>

          <View style={styles.contentRow}>
            <View style={styles.body}>
              {page === 'settings' && section === 'general' ? (
                <GeneralSection
                  labels={t}
                  language={language}
                  onLanguageChange={setLanguage}
                  onThemeChange={setTheme}
                  palette={p}
                  theme={theme}
                />
              ) : null}

              {page === 'account' ? (
                <AccountSection
                  academyCode={session?.academyCode ?? academyCode}
                  academyName={session?.academyName ?? academyName}
                  authError={authError}
                  authNotice={authNotice}
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
                  onAuthPolicyChange={setAuthPolicy}
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

              {page === 'members' &&
              (disableConditionalVisibility || canAccessMembersPage) &&
              section === 'pending-approval' ? (
                <MembersHomeScreen
                  academyCode={session?.academyCode ?? academyCode}
                  academyName={session?.academyName ?? academyName}
                  compact
                  displayName={session?.displayName ?? displayName}
                  isAuthenticated={isAuthenticated}
                  language={language}
                  loginId={session?.loginId ?? loginId}
                  palette={p}
                  roleCode={session?.roleCode ?? ''}
                />
              ) : null}

              {page === 'members' &&
              (disableConditionalVisibility || canAccessMembersPage) &&
              section === 'academy-members' ? (
                <AcademyMembersSection
                  academyCode={session?.academyCode ?? academyCode}
                  compact
                  isAuthenticated={isAuthenticated}
                  language={language}
                  palette={p}
                  roleCode={session?.roleCode ?? ''}
                />
              ) : null}

              {page === 'settings' && section === 'dev-health' ? (
                <DevHealthSection
                  disableConditionalVisibility={disableConditionalVisibility}
                  labels={t}
                  loadingTarget={loadingTarget}
                  onRunAll={runAllHealthChecks}
                  onRunTarget={handleHealthCheck}
                  onToggleDisableConditionalVisibility={() =>
                    setDisableConditionalVisibility(value => !value)
                  }
                  onToggleUnmountLoginContainer={() =>
                    setUnmountLoginContainer(value => !value)
                  }
                  onToggleUnmountProfileContainer={() =>
                    setUnmountProfileContainer(value => !value)
                  }
                  palette={p}
                  targetStates={targetStates}
                  unmountLoginContainer={unmountLoginContainer}
                  unmountProfileContainer={unmountProfileContainer}
                />
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}




















