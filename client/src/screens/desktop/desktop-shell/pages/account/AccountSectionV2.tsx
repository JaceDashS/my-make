import React from 'react';

import {BodyStrong, BodyText, Card, FieldLabel, OptionChip} from '../../components/ui';
import {desktopShellStyles as styles} from '../../config/styles';
import type {DesktopShellPalette} from '../../model/types';
import type {ProfileDetail} from '../../../../shared/account-section-model';
import type {AccountSection as AccountSectionType} from '../../../../shared/shell-model';
import {
  AccountSectionV2 as SharedAccountSectionV2,
  type AccountSectionPalette,
  type AccountTexts,
} from '../../../../shared/account-section/AccountSectionV2';

export type {AccountTexts};

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
  palette: DesktopShellPalette;
  password: string;
  phone: string;
  profileDetails: ProfileDetail[];
  registerError: string | null;
  registerSuccess: string | null;
  registerType: 'user' | 'root';
  requestedRoleCode: 'STUDENT' | 'TEACHER' | 'ADMIN';
  statusCode: string;
  texts: AccountTexts;
};

export function AccountSectionV2({palette, ...props}: Props) {
  return (
    <SharedAccountSectionV2
      {...props}
      palette={palette as AccountSectionPalette}
      styles={styles}
      ui={{BodyStrong, BodyText, Card, FieldLabel, OptionChip}}
    />
  );
}
