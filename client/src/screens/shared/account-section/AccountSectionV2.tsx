import React, {useState} from 'react';
import {ScrollView} from 'react-native';

import type {ProfileDetail} from '../account-section-model';
import type {AccountSection as AccountSectionType} from '../shell-model';
import {StudentSkinSection} from '../../../domains/student-options/StudentSkinSection';
import {
  AccountSection as LegacyAccountSection,
  type AccountSectionPalette,
  type AccountTexts,
} from './AccountSection';

type UiComponents = {
  BodyStrong: React.ComponentType<any>;
  BodyText: React.ComponentType<any>;
  Card: React.ComponentType<any>;
  FieldLabel: React.ComponentType<any>;
  OptionChip: React.ComponentType<any>;
};

type Props = {
  academyCode: string;
  academyName: string;
  authError: string | null;
  authNotice: string | null;
  authPolicy: string;
  canEditAuthPolicy: boolean;
  canEditStatus: boolean;
  confirmPassword: string;
  currentSection: AccountSectionType;
  displayName: string;
  email: string;
  isAuthenticated: boolean;
  isSubmitting: boolean;
  licenseCode: string;
  loginId: string;
  note: string;
  onStudentOptionsDirtyChange?: (isDirty: boolean) => void;
  showStudentSkinPreview?: boolean;
  onAcademyNameChange: (value: string) => void;
  onAuthPolicyChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onLicenseCodeChange: (value: string) => void;
  onLogin: () => void;
  onLoginIdChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onLogout: () => void;
  onPasswordChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onProfilePasswordChange: (value: string) => void;
  onRegister: () => void;
  onRegisterTypeChange: (value: 'user' | 'root') => void;
  onRequestedRoleCodeChange: (value: 'STUDENT' | 'TEACHER' | 'ADMIN') => void;
  onSaveProfile: (overrides?: {
    authPolicy?: string;
    email?: string;
    note?: string;
    password?: string;
    phone?: string;
    preferenceRanges?: string;
    skinCValue?: string;
    skinHValue?: string;
    skinLValue?: string;
    skinTraits?: string;
    statusCode?: string;
  }) => Promise<void> | void;
  onStatusCodeChange: (value: string) => void;
  palette: AccountSectionPalette;
  password: string;
  phone: string;
  profileDetails: ProfileDetail[];
  registerError: string | null;
  registerSuccess: string | null;
  registerType: 'user' | 'root';
  requestedRoleCode: 'STUDENT' | 'TEACHER' | 'ADMIN';
  statusCode: string;
  styles: any;
  texts: AccountTexts;
  ui: UiComponents;
};

export type {AccountTexts, AccountSectionPalette};

function logStudentOptionsScroll(event: string, payload: Record<string, unknown>) {
  console.log(`[student-options-scroll] ${event}`, payload);
}

export function AccountSectionV2(props: Props) {
  const [isStudentOptionsScrollLocked, setIsStudentOptionsScrollLocked] = useState(false);

  if (props.currentSection === 'student-options' && props.isAuthenticated) {
    return (
      <ScrollView
        contentContainerStyle={props.styles.stack}
        onScroll={event => {
          const offsetY = event.nativeEvent?.contentOffset?.y ?? null;
          const offsetX = event.nativeEvent?.contentOffset?.x ?? null;
          logStudentOptionsScroll('outer-scroll', {offsetX, offsetY});
        }}
        scrollEnabled={!isStudentOptionsScrollLocked}
        scrollEventThrottle={16}>
        <StudentSkinSection
          isSubmitting={props.isSubmitting}
          onDirtyChange={props.onStudentOptionsDirtyChange}
          onOuterScrollLockChange={setIsStudentOptionsScrollLocked}
          onSaveProfile={props.onSaveProfile}
          palette={props.palette}
          profileDetails={props.profileDetails}
          showDevPreview={props.showStudentSkinPreview ?? false}
          styles={props.styles}
          title={props.texts.studentOptions}
          ui={props.ui}
        />
      </ScrollView>
    );
  }

  return <LegacyAccountSection {...(props as any)} />;
}
