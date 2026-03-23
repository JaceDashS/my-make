import React, {useEffect, useRef, useState} from 'react';
import {Animated, Pressable, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {
  getHealthCheckCandidates,
  getHealthCheckLabel,
  runHealthCheck,
  type HealthCheckTarget,
} from '../../shared/lib/healthCheck';
import {windowsPressableFocusProps} from '../../shared/ui/windowsFocusProps';
import {
  INITIAL_TARGET_STATE,
  type AppPage,
  type LanguageMode,
  type ThemeMode,
} from '../shared/shell-model';
import {SidebarMenu} from './desktop-shell/components/SidebarMenu';
import {getDesktopShellLabels} from './desktop-shell/config/labels';
import {LoginSection} from './desktop-shell/pages/login/LoginSection';
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

  if (nextPage === 'login') {
    return 'sign-in';
  }

  return undefined;
}

export function WindowsDesktopShell() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [page, setPage] = useState<AppPage>('settings');
  const [section, setSection] = useState<DesktopMenuSection>('general');
  const [language, setLanguage] = useState<LanguageMode>('ja');
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
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

  const handleLogin = () => {
    if (loginId === 'admin' && password === '1111') {
      setIsAuthenticated(true);
      setAuthError(null);
      return;
    }

    setIsAuthenticated(false);
    setAuthError(t.invalid);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAuthError(null);
    setPassword('');
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

  return (
    <SafeAreaView style={[styles.safeArea, {backgroundColor: p.appBg}]}>
      <View style={[styles.shell, {backgroundColor: p.appBg}]}>
        <SidebarMenu
          animation={sidebarAnimation}
          isOpen={isSidebarOpen}
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
              {page === 'settings' ? t.settings : t.login}
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

              {page === 'login' && section === 'sign-in' ? (
                <LoginSection
                  authError={authError}
                  isAuthenticated={isAuthenticated}
                  loginId={loginId}
                  onLogin={handleLogin}
                  onLoginIdChange={setLoginId}
                  onLogout={handleLogout}
                  onPasswordChange={setPassword}
                  palette={p}
                  password={password}
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
