import React from 'react';

import {BodyStrong, BodyText, Card, FieldLabel, OptionChip} from '../../components/ui';
import {mobileShellStyles as styles} from '../../config/styles';
import type {MobileShellPalette} from '../../model/types';
import {
  AccountSection as SharedAccountSection,
  type AccountTexts,
  type AccountSectionPalette,
} from '../../../../shared/account-section/AccountSection';
import type {ProfileDetail} from '../../../../shared/account-section-model';
import type {AccountSection as AccountSectionType} from '../../../../shared/shell-model';

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
    statusCode?: string;
  }) => Promise<void> | void;
  onStatusCodeChange: (value: string) => void;
  palette: MobileShellPalette;
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

export function AccountSection({palette, ...props}: Props) {
  return (
    <SharedAccountSection
      {...props}
      palette={palette as AccountSectionPalette}
      styles={styles}
      ui={{BodyStrong, BodyText, Card, FieldLabel, OptionChip}}
    />
  );
}
