import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { windowsPressableFocusProps } from '../../shared/ui/windowsFocusProps';
import { AcademyMembersSection } from '../../domains/members/AcademyMembersSection';
import { MembersHomeScreen } from '../../domains/members/MembersHomeScreen';
import { useManagedAppShell } from '../shared/useManagedAppShell';
import { SidebarMenu } from './desktop-shell/components/SidebarMenu';
import { getDesktopShellLabels } from './desktop-shell/config/labels';
import { AccountSection } from './desktop-shell/pages/account/AccountSection';
import { DevHealthSection } from './desktop-shell/pages/settings/DevHealthSection';
import { GeneralSection } from './desktop-shell/pages/settings/GeneralSection';
import { desktopShellStyles as styles } from './desktop-shell/config/styles';
import { getDesktopShellPalette } from './desktop-shell/config/theme';
import type { DesktopMenuSection } from './desktop-shell/model/types';

export function WindowsDesktopShell() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [disableConditionalVisibility, setDisableConditionalVisibility] =
    useState(false);
  const [unmountLoginContainer, setUnmountLoginContainer] = useState(false);
  const [unmountProfileContainer, setUnmountProfileContainer] = useState(false);
  const sidebarAnimation = useRef(new Animated.Value(1)).current;

  const [language, setLanguage] = useState<'ja' | 'en'>('ja');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const t = getDesktopShellLabels(language);
  const p = getDesktopShellPalette(theme);
  const {
    academyName,
    authAction,
    authError,
    authNotice,
    canAccessMembersPage,
    canEditAuthPolicy,
    canEditStatus,
    confirmPassword,
    displayName,
    email,
    handleLogin,
    handleLogout,
    handleRegister,
    handleRegisterTypeChange,
    handleSaveProfile,
    isAuthenticated,
    licenseCode,
    loginId,
    password,
    phone,
    registerError,
    registerSuccess,
    registerType,
    requestedRoleCode,
    resetAccountUi,
    session,
    setAcademyName,
    setConfirmPassword,
    setDisplayName,
    setEmail,
    setLicenseCode,
    setLoginId,
    setPassword,
    setPhone,
    setRequestedRoleCode,
    showStudentAccountItems,
    showTeacherAccountItems,
    accountSection,
    canShowMembersPage,
    handleHealthCheck,
    loadingTarget,
    page,
    runAllHealthChecks,
    section,
    selectPage,
    selectSection,
    targetStates,
  } = useManagedAppShell<DesktopMenuSection>({
    allowMembersOverride: disableConditionalVisibility,
    initialSection: 'general',
    labels: t,
    loginSection: 'login',
    profileLoadLogLabel: 'loaded desktop profile',
  });

  useEffect(() => {
    // サイドバー本体だけを畳み、メインパネルは動かさない。
    Animated.timing(sidebarAnimation, {
      duration: 220,
      toValue: isSidebarOpen ? 1 : 0,
      useNativeDriver: false,
    }).start();
  }, [isSidebarOpen, sidebarAnimation]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: p.appBg }]}>
      <View style={[styles.shell, { backgroundColor: p.appBg }]}>
        <SidebarMenu
          animation={sidebarAnimation}
          disableConditionalVisibility={disableConditionalVisibility}
          isOpen={isSidebarOpen}
          isAuthenticated={isAuthenticated}
          showMembersPage={canShowMembersPage}
          showTeacherAccountItems={showTeacherAccountItems}
          showStudentAccountItems={showStudentAccountItems}
          labels={t}
          onPageChange={nextPage => selectPage(nextPage)}
          onSectionChange={selectSection}
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
                  academyCode={session?.academyCode ?? ''}
                  academyName={session?.academyName ?? academyName}
                  authError={authError}
                  authNotice={authNotice}
                  authPolicy={session?.authPolicy ?? ''}
                  canEditAuthPolicy={canEditAuthPolicy}
                  canEditStatus={canEditStatus}
                  confirmPassword={confirmPassword}
                  currentSection={accountSection}
                  displayName={session?.displayName ?? displayName}
                  email={session?.email ?? email}
                  isAuthenticated={isAuthenticated}
                  profileDetails={session?.profileDetails ?? []}
                  isSubmitting={authAction !== null}
                  licenseCode={session?.licenseCode ?? licenseCode}
                  loginId={session?.loginId ?? loginId}
                  note={session?.note ?? ''}
                  onAcademyNameChange={setAcademyName}
                  onConfirmPasswordChange={setConfirmPassword}
                  onDisplayNameChange={setDisplayName}
                  onEmailChange={setEmail}
                  onLicenseCodeChange={setLicenseCode}
                  onLogin={handleLogin}
                  onLoginIdChange={setLoginId}
                  onNoteChange={() => {}}
                  onLogout={handleLogout}
                  onPasswordChange={setPassword}
                  onProfilePasswordChange={() => {}}
                  onPhoneChange={setPhone}
                  onRegister={handleRegister}
                  onRegisterTypeChange={handleRegisterTypeChange}
                  onRequestedRoleCodeChange={setRequestedRoleCode}
                  onAuthPolicyChange={() => {}}
                  onSaveProfile={handleSaveProfile}
                  onStatusCodeChange={() => {}}
                  palette={p}
                  password={password}
                  phone={session?.phone ?? phone}
                  registerError={registerError}
                  registerSuccess={registerSuccess}
                  registerType={registerType}
                  requestedRoleCode={requestedRoleCode}
                  statusCode={session?.statusCode ?? ''}
                  texts={t}
                />
              ) : null}

              {page === 'members' &&
              canShowMembersPage &&
              section === 'pending-approval' ? (
                <MembersHomeScreen
                  academyCode={session?.academyCode ?? ''}
                  academyName={session?.academyName ?? ''}
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
              canShowMembersPage &&
              section === 'academy-members' ? (
                <AcademyMembersSection
                  academyCode={session?.academyCode ?? ''}
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




















