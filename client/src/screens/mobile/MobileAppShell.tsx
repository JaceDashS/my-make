import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { windowsPressableFocusProps } from '../../shared/ui/windowsFocusProps';
import { AcademyMembersSection } from '../../domains/members/AcademyMembersSection';
import { InventoryHomeScreen } from '../../domains/inventory/InventoryHomeScreen';
import { MembersHomeScreen } from '../../domains/members/MembersHomeScreen';
import { useManagedAppShell } from '../shared/useManagedAppShell';
import { getMobileShellLabels } from './mobile-shell/config/labels';
import { MenuPanel } from './mobile-shell/components/MenuPanel';
import { AccountFeatureSection as AccountSection } from './mobile-shell/pages/account/AccountFeatureSection';
import { DevHealthSection } from './mobile-shell/pages/settings/DevHealthSection';
import { GeneralSection } from './mobile-shell/pages/settings/GeneralSection';
import { mobileShellStyles as styles } from './mobile-shell/config/styles';
import { getMobileShellPalette } from './mobile-shell/config/theme';
import type { MobileMenuSection } from './mobile-shell/model/types';

export function MobileAppShell() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [studentOptionsDirty, setStudentOptionsDirty] = useState(false);
  const [showStudentSkinPreview, setShowStudentSkinPreview] = useState(false);
  const toggleAnimation = useRef(new Animated.Value(0)).current;

  const [language, setLanguage] = useState<'ja' | 'en'>('en');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const t = getMobileShellLabels(language);
  const p = getMobileShellPalette(theme);
  const {
    academyName,
    authAction,
    authError,
    authNotice,
    canAccessMembersPage,
    canShowInventoryPage,
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
    showStudentReservationItem,
    showTeacherReservationItem,
    targetStates,
  } = useManagedAppShell<MobileMenuSection>({
    closeMenu: () => setIsMenuOpen(false),
    initialSection: 'general',
    labels: t,
    loginSection: 'login',
    profileLoadLogLabel: 'loaded mobile profile',
  });

  useEffect(() => {
    // 上部バーは固定し、トグルアイコンだけを自然に切り替える。
    Animated.timing(toggleAnimation, {
      duration: 180,
      toValue: isMenuOpen ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [isMenuOpen, toggleAnimation]);

  const confirmStudentOptionsDiscard = () => {
    if (!(page === 'account' && accountSection === 'student-options' && studentOptionsDirty)) {
      return true;
    }

    const confirmDialog =
      typeof globalThis === 'object' && 'confirm' in globalThis
        ? (((globalThis as Record<string, unknown>).confirm as
            | ((message?: string) => boolean)
            | undefined))
        : undefined;

    if (typeof confirmDialog === 'function') {
      return confirmDialog(
        'Student options has unsaved changes. Leave without saving?',
      );
    }

    Alert.alert(
      'Unsaved changes',
      'Student options has unsaved changes. Save Student Skin before leaving this section.',
    );
    return false;
  };

  const choosePage = (
    nextPage: 'settings' | 'account' | 'members' | 'inventory',
    nextSection?: MobileMenuSection,
  ) => {
    if (!confirmStudentOptionsDiscard()) {
      return;
    }

    const shouldCloseMenu =
      page !== nextPage || (nextSection != null && section !== nextSection);

    selectPage(nextPage, {
      closeMenuOnSelect: shouldCloseMenu,
      nextSection,
    });
  };

  useEffect(() => {
    const globalDocument =
      typeof globalThis === 'object' && 'document' in globalThis
        ? ((globalThis as Record<string, unknown>).document as {
            documentElement?: {lang?: string};
          })
        : undefined;

    if (!globalDocument?.documentElement) {
      return;
    }
    globalDocument.documentElement.lang = language === 'ja' ? 'ja' : 'en';
  }, [language]);

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
              : page === 'account' &&
                  (section === 'login' ||
                    section === 'register' ||
                    section === 'student-options')
                ? (t.myInfo ?? t.account)
                : page === 'account'
                  ? (t.classroom ?? t.account)
                  : (t.adminMenu ?? t.members)}
          </Text>
        </View>

        <View style={styles.body}>
          {isMenuOpen ? (
            <MenuPanel
              isAuthenticated={isAuthenticated}
              showInventoryPage={canShowInventoryPage}
              showMembersPage={canShowMembersPage}
              showStudentReservationItem={showStudentReservationItem}
              showTeacherAccountItems={showTeacherAccountItems}
              showTeacherReservationItem={showTeacherReservationItem}
              showStudentAccountItems={showStudentAccountItems}
              currentPage={page}
              currentSection={section}
              labels={t}
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
              onToggleShowStudentSkinPreview={() =>
                setShowStudentSkinPreview(value => !value)
              }
              palette={p}
              showStudentSkinPreview={showStudentSkinPreview}
              targetStates={targetStates}
            />
          ) : null}

          {!isMenuOpen && page === 'account' ? (
            <AccountSection
              authError={authError}
              authNotice={authNotice}
              academyCode={session?.academyCode ?? ''}
              academyName={session?.academyName ?? academyName}
              authPolicy={session?.authPolicy ?? ''}
              canEditAuthPolicy={canEditAuthPolicy}
              canEditStatus={canEditStatus}
              confirmPassword={confirmPassword}
              currentSection={accountSection}
              displayName={session?.displayName ?? displayName}
              email={session?.email ?? email}
              isAuthenticated={isAuthenticated}
              language={language}
              profileDetails={session?.profileDetails ?? []}
              isSubmitting={authAction !== null}
              licenseCode={session?.licenseCode ?? licenseCode}
              loginId={session?.loginId ?? loginId}
              note={session?.note ?? ''}
              onAcademyNameChange={setAcademyName}
              onAuthPolicyChange={() => {}}
              onConfirmPasswordChange={setConfirmPassword}
              onDisplayNameChange={setDisplayName}
              onEmailChange={setEmail}
              onLicenseCodeChange={setLicenseCode}
              onLogin={handleLogin}
              onLoginIdChange={setLoginId}
              onNoteChange={() => {}}
              onOpenRegister={() => selectSection('register')}
              onLogout={handleLogout}
              onPasswordChange={setPassword}
              onProfilePasswordChange={() => {}}
              onPhoneChange={setPhone}
              onRegister={handleRegister}
              onRegisterTypeChange={handleRegisterTypeChange}
              onRequestedRoleCodeChange={setRequestedRoleCode}
              onSaveProfile={handleSaveProfile}
              onStudentOptionsDirtyChange={setStudentOptionsDirty}
              showStudentSkinPreview={showStudentSkinPreview}
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

          {!isMenuOpen &&
          page === 'members' &&
          canShowMembersPage &&
          section === 'pending-approval' ? (
            <MembersHomeScreen
              academyCode={session?.academyCode ?? ''}
              academyName={session?.academyName ?? ''}
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
          canShowMembersPage &&
          section === 'academy-members' ? (
            <AcademyMembersSection
              academyCode={session?.academyCode ?? ''}
              isAuthenticated={isAuthenticated}
              language={language}
              palette={p}
              roleCode={session?.roleCode ?? ''}
            />
          ) : null}

          {!isMenuOpen && page === 'inventory' && canShowInventoryPage ? (
            <InventoryHomeScreen
              language={language}
              palette={p}
              texts={t}
            />
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}










