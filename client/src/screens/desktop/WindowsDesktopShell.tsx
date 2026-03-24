import React, {useEffect, useRef, useState} from 'react';
import {Animated, Pressable, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {
  getHealthCheckCandidates,
  getHealthCheckLabel,
  runHealthCheck,
  type HealthCheckTarget,
} from '../../shared/lib/healthCheck';
import {loginAccount, registerRootAccount} from '../../shared/lib/accountApi';
import {windowsPressableFocusProps} from '../../shared/ui/windowsFocusProps';
import {
  INITIAL_TARGET_STATE,
  type AppPage,
  type AccountSection as AccountSectionType,
  type LanguageMode,
  type ThemeMode,
} from '../shared/shell-model';
import {SidebarMenu} from './desktop-shell/components/SidebarMenu';
import {getDesktopShellLabels} from './desktop-shell/config/labels';
import {AccountSection} from './desktop-shell/pages/account/AccountSection';
import {DevHealthSection} from './desktop-shell/pages/settings/DevHealthSection';
import {GeneralSection} from './desktop-shell/pages/settings/GeneralSection';
import {desktopShellStyles as styles} from './desktop-shell/config/styles';
import {getDesktopShellPalette} from './desktop-shell/config/theme';
import type {DesktopMenuSection} from './desktop-shell/model/types';

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

  return undefined;
}

export function WindowsDesktopShell() {
  const [session, setSession] = useState<{
    academyCode: string;
    academyName: string;
    displayName: string;
    loginId: string;
    roleCode: string;
  } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [page, setPage] = useState<AppPage>('settings');
  const [section, setSection] = useState<DesktopMenuSection>('general');
  const [language, setLanguage] = useState<LanguageMode>('ja');
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [academyCode, setAcademyCode] = useState('');
  const [academyName, setAcademyName] = useState('');
  const [licenseCode, setLicenseCode] = useState('');
  const [loginId, setLoginId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registerType, setRegisterType] = useState<'user' | 'root'>('user');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);
  const [authAction, setAuthAction] = useState<'login' | 'logout' | 'register' | null>(
    null,
  );
  const [loadingTarget, setLoadingTarget] = useState<HealthCheckTarget | null>(
    null,
  );
  const [targetStates, setTargetStates] = useState(INITIAL_TARGET_STATE);
  const sidebarAnimation = useRef(new Animated.Value(1)).current;

  const t = getDesktopShellLabels(language);
  const p = getDesktopShellPalette(theme);

  useEffect(() => {
    // サイドバー本体だけを畳み、メインパネルは動かさない。
    Animated.timing(sidebarAnimation, {
      duration: 220,
      toValue: isSidebarOpen ? 1 : 0,
      useNativeDriver: false,
    }).start();
  }, [isSidebarOpen, sidebarAnimation]);

  useEffect(() => {
    if (isAuthenticated && page === 'account' && section !== 'profile') {
      setSection('profile');
      return;
    }

    if (!isAuthenticated && page === 'account' && section === 'profile') {
      setSection('login');
    }
  }, [isAuthenticated, page, section]);

  const handleLogin = async () => {
    setAuthAction('login');

    try {
      const result = await loginAccount({
        loginId,
        password,
      });

      if (result.status !== 'ok') {
        setIsAuthenticated(false);
        setAuthError(result.error ?? t.invalid);
        return;
      }

      setSession({
        academyCode: result.academyCode ?? academyCode,
        academyName: result.academyName ?? '',
        displayName: result.displayName ?? '',
        loginId: result.loginId ?? loginId,
        roleCode: result.roleCode ?? 'ROOT',
      });
      setIsAuthenticated(true);
      setAuthError(null);
      setRegisterSuccess(null);
      setPage('account');
      setSection('profile');
    } finally {
      setAuthAction(null);
    }
  };

  const handleRegister = async () => {
    if (registerType === 'user') {
      setRegisterError(t.userRegisterPending);
      setRegisterSuccess(null);
      return;
    }

    if (
      !licenseCode ||
      !academyName ||
      !loginId ||
      !displayName ||
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
        licenseCode,
        password,
        rootDisplayName: displayName,
        rootLoginId: loginId,
      });

      if (result.status !== 'ok') {
        setRegisterError(result.error ?? t.registerSuccess);
        setRegisterSuccess(null);
        return;
      }

      setSession({
        academyCode: result.academyCode ?? '',
        academyName: result.academyName ?? academyName,
        displayName: result.displayName ?? displayName,
        loginId: result.loginId ?? loginId,
        roleCode: result.roleCode ?? 'ROOT',
      });
      setAcademyCode(result.academyCode ?? '');
      setIsAuthenticated(true);
      setAuthError(null);
      setRegisterError(null);
      setRegisterSuccess(
        `${t.registerSuccess}${result.academyCode ? ` (${result.academyCode})` : ''}`,
      );
      setPage('account');
      setSection('profile');
      setConfirmPassword('');
    } finally {
      setAuthAction(null);
    }
  };

  const handleLogout = () => {
    setAuthAction('logout');
    setIsAuthenticated(false);
    setAuthError(null);
    setSession(null);
    setPage('account');
    setSection('login');
    setAuthAction(null);
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
    setPage(nextPage);
    const resolvedSection = getDefaultSection(nextPage);
    if (resolvedSection) {
      setSection(resolvedSection);
    }
  };

  const accountSection: AccountSectionType = isAuthenticated
    ? 'profile'
    : section === 'register'
      ? 'register'
      : 'login';

  return (
    <SafeAreaView style={[styles.safeArea, {backgroundColor: p.appBg}]}>
      <View style={[styles.shell, {backgroundColor: p.appBg}]}>
        <SidebarMenu
          animation={sidebarAnimation}
          isOpen={isSidebarOpen}
          isAuthenticated={isAuthenticated}
          labels={t}
          onPageChange={handlePageChange}
          onSectionChange={setSection}
          page={page}
          palette={p}
          section={section}
        />

        <View style={[styles.mainPanel, {backgroundColor: p.card}]}>
          <View style={[styles.topBar, {borderBottomColor: p.border}]}>
            <Pressable
              {...windowsPressableFocusProps}
              onPress={() => setIsSidebarOpen(v => !v)}
              style={[styles.menuButton, {backgroundColor: p.soft}]}>
              <Text style={[styles.menuButtonLabel, {color: p.text}]}>☰</Text>
            </Pressable>
            <Text style={[styles.topBarTitle, {color: p.text}]}>
              {page === 'settings' ? t.settings : t.account}
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
                  confirmPassword={confirmPassword}
                  currentSection={accountSection}
                  displayName={session?.displayName ?? displayName}
                  isAuthenticated={isAuthenticated}
                  isSubmitting={authAction !== null}
                  licenseCode={licenseCode}
                  loginId={loginId}
                  onAcademyNameChange={setAcademyName}
                  onConfirmPasswordChange={setConfirmPassword}
                  onDisplayNameChange={setDisplayName}
                  onLicenseCodeChange={setLicenseCode}
                  onLogin={handleLogin}
                  onLoginIdChange={setLoginId}
                  onLogout={handleLogout}
                  onPasswordChange={setPassword}
                  onRegister={handleRegister}
                  onRegisterTypeChange={setRegisterType}
                  palette={p}
                  password={password}
                  registerError={registerError}
                  registerSuccess={registerSuccess}
                  registerType={registerType}
                  roleCode={session?.roleCode ?? 'ROOT'}
                  texts={t}
                />
              ) : null}

              {page === 'settings' && section === 'dev-health' ? (
                <DevHealthSection
                  labels={t}
                  loadingTarget={loadingTarget}
                  onRunAll={runAllHealthChecks}
                  onRunTarget={handleHealthCheck}
                  palette={p}
                  targetStates={targetStates}
                />
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
