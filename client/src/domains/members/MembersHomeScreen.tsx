import React from 'react';

import {PendingApprovalSection} from './PendingApprovalSection';
import type {LanguageMode} from '../../screens/shared/shell-model';

type ShellPaletteLike = {
  border: string;
  card: string;
  muted: string;
  primary: string;
  primaryText: string;
  text: string;
  textMuted: string;
};

export function MembersHomeScreen({
  academyCode,
  academyName,
  compact = false,
  displayName,
  isAuthenticated,
  language,
  loginId,
  palette,
  roleCode,
}: {
  academyCode: string;
  academyName: string;
  compact?: boolean;
  displayName: string;
  isAuthenticated: boolean;
  language: LanguageMode;
  loginId: string;
  palette: ShellPaletteLike;
  roleCode: string;
}) {
  return (
    <PendingApprovalSection
      academyCode={academyCode}
      academyName={academyName}
      compact={compact}
      displayName={displayName}
      isAuthenticated={isAuthenticated}
      language={language}
      loginId={loginId}
      palette={palette}
      roleCode={roleCode}
    />
  );
}
