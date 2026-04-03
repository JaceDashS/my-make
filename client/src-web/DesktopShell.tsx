import React, { useState } from 'react';

import { useManagedAppShell } from '../src/screens/shared/useManagedAppShell';
import { SidebarMenu } from './components/SidebarMenu';
import { getDesktopShellLabels } from '../src/screens/desktop/desktop-shell/config/labels';
import AccountSection from './pages/account/AccountFeatureSection';
import { DevHealthSection } from './pages/settings/DevHealthSection';
import { GeneralSection } from './pages/settings/GeneralSection';
import { MembersHomeScreen } from '../src/domains/members/MembersHomeScreen';
import { AcademyMembersSection } from '../src/domains/members/AcademyMembersSection';
import { InventoryHomeScreen } from '../src/domains/inventory/InventoryHomeScreen';
import { desktopShellStyles as styles } from '../src/screens/desktop/desktop-shell/config/styles';
import { getDesktopShellPalette } from '../src/screens/desktop/desktop-shell/config/theme';
import type { DesktopMenuSection } from '../src/screens/desktop/desktop-shell/model/types';

export function DesktopShell() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [disableConditionalVisibility, setDisableConditionalVisibility] =
    useState(false);
  const [unmountLoginContainer, setUnmountLoginContainer] = useState(false);
  const [unmountProfileContainer, setUnmountProfileContainer] = useState(false);
  const [studentOptionsDirty, setStudentOptionsDirty] = useState(false);
  const [showStudentSkinPreview, setShowStudentSkinPreview] = useState(false);

  const [language, setLanguage] = useState<'ja' | 'en'>('en');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const t = getDesktopShellLabels(language);
  const p = getDesktopShellPalette(theme);

  const {
    academyName,
    authAction,
    authError,
    authNotice,
    canShowInventoryPage,
    canShowMembersPage,
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
  } = useManagedAppShell<DesktopMenuSection>({
    allowMembersOverride: disableConditionalVisibility,
    initialSection: 'general',
    labels: t,
    loginSection: 'login',
    profileLoadLogLabel: 'loaded desktop profile',
  });

  const confirmStudentOptionsDiscard = () => {
    if (!(page === 'account' && accountSection === 'student-options' && studentOptionsDirty)) {
      return true;
    }
    if (typeof globalThis.confirm === 'function') {
      return globalThis.confirm(
        'Student options has unsaved changes. Leave without saving?',
      );
    }
    window.alert('Student options has unsaved changes. Save Student Skin before leaving this section.');
    return false;
  };

  const shellStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    height: '100vh',
    width: '100vw',
    backgroundColor: p.appBg,
    overflow: 'hidden',
  };

  const mainPanelStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: p.card,
    minWidth: 0,
  };

  const topBarStyle: React.CSSProperties = {
    ...(styles.topBar as React.CSSProperties),
    borderBottomColor: p.border,
    borderBottomStyle: 'solid',
    display: 'flex',
  };

  const menuButtonStyle: React.CSSProperties = {
    ...(styles.menuButton as React.CSSProperties),
    backgroundColor: p.soft,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const contentRowStyle: React.CSSProperties = {
    ...(styles.contentRow as React.CSSProperties),
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  };

  const bodyStyle: React.CSSProperties = {
    ...(styles.body as React.CSSProperties),
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const pageTitle =
    page === 'settings'
      ? t.settings
      : page === 'account' &&
          (section === 'login' ||
            section === 'register' ||
            section === 'student-options')
        ? (t.myInfo ?? t.account)
        : page === 'account'
          ? (t.classroom ?? t.account)
          : (t.adminMenu ?? t.members);

  return (
    <div style={shellStyle}>
      <SidebarMenu
        isOpen={isSidebarOpen}
        disableConditionalVisibility={disableConditionalVisibility}
        isAuthenticated={isAuthenticated}
        showInventoryPage={canShowInventoryPage}
        showMembersPage={canShowMembersPage}
        showStudentReservationItem={showStudentReservationItem}
        showTeacherAccountItems={showTeacherAccountItems}
        showTeacherReservationItem={showTeacherReservationItem}
        showStudentAccountItems={showStudentAccountItems}
        labels={t}
        onNavigate={(nextPage, nextSection) => {
          if (!confirmStudentOptionsDiscard()) return;
          selectPage(nextPage, { nextSection });
        }}
        page={page}
        palette={p}
        section={section}
      />

      <div style={mainPanelStyle}>
        <div style={topBarStyle}>
          <button
            onClick={() => setIsSidebarOpen(v => !v)}
            style={menuButtonStyle}
          >
            <span style={{ ...(styles.menuButtonLabel as React.CSSProperties), color: p.text }}>
              ☰
            </span>
          </button>
          <span style={{ ...(styles.topBarTitle as React.CSSProperties), color: p.text }}>
            {pageTitle}
          </span>
        </div>

        <div style={contentRowStyle}>
          <div style={bodyStyle}>
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
                onOpenRegister={() => selectSection('register')}
                onProfilePasswordChange={() => {}}
                onLogout={handleLogout}
                onPasswordChange={setPassword}
                onPhoneChange={setPhone}
                onRegister={handleRegister}
                onRegisterTypeChange={handleRegisterTypeChange}
                onRequestedRoleCodeChange={setRequestedRoleCode}
                onAuthPolicyChange={() => {}}
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

            {page === 'members' && canShowMembersPage && section === 'pending-approval' ? (
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

            {page === 'members' && canShowMembersPage && section === 'academy-members' ? (
              <AcademyMembersSection
                academyCode={session?.academyCode ?? ''}
                compact
                isAuthenticated={isAuthenticated}
                language={language}
                palette={p}
                roleCode={session?.roleCode ?? ''}
              />
            ) : null}

            {page === 'inventory' && canShowInventoryPage ? (
              <InventoryHomeScreen
                language={language}
                palette={p}
                texts={t}
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
                onToggleShowStudentSkinPreview={() =>
                  setShowStudentSkinPreview(value => !value)
                }
                showStudentSkinPreview={showStudentSkinPreview}
                palette={p}
                targetStates={targetStates}
                unmountLoginContainer={unmountLoginContainer}
                unmountProfileContainer={unmountProfileContainer}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
