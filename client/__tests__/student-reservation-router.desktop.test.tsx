import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import {AccountFeatureSection} from '../src/screens/desktop/desktop-shell/pages/account/AccountFeatureSection';
import {SHELL_LABELS} from '../src/screens/shared/shell-labels';

jest.mock('../src/domains/student-reservation/StudentReservationSection', () => ({
  StudentReservationSection: ({teacherName, title}: {teacherName: string; title: string}) => (
    <>
      {title}
      {teacherName}
    </>
  ),
}));

function collectText(node: any): string[] {
  if (node == null) {
    return [];
  }

  if (typeof node === 'string' || typeof node === 'number') {
    return [String(node)];
  }

  if (Array.isArray(node)) {
    return node.flatMap(collectText);
  }

  return collectText(node.children ?? []);
}

function createTexts() {
  return SHELL_LABELS.en;
}

describe('student reservation router', () => {
  test('uses primaryTeacherName from profile details', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <AccountFeatureSection
          academyCode="ACD001"
          academyName="My Academy"
          authError={null}
          authNotice={null}
          authPolicy="ROOT_ONLY"
          canEditAuthPolicy={false}
          canEditStatus={false}
          confirmPassword=""
          currentSection="reservation"
          displayName="Student One"
          email="student@example.com"
          language="en"
          isAuthenticated
          isSubmitting={false}
          licenseCode=""
          loginId="student01"
          note=""
          onAcademyNameChange={() => undefined}
          onAuthPolicyChange={() => undefined}
          onConfirmPasswordChange={() => undefined}
          onDisplayNameChange={() => undefined}
          onEmailChange={() => undefined}
          onLicenseCodeChange={() => undefined}
          onLogin={() => undefined}
          onLoginIdChange={() => undefined}
          onNoteChange={() => undefined}
          onOpenRegister={() => undefined}
          onLogout={() => undefined}
          onPasswordChange={() => undefined}
          onPhoneChange={() => undefined}
          onProfilePasswordChange={() => undefined}
          onRegister={() => undefined}
          onRegisterTypeChange={() => undefined}
          onRequestedRoleCodeChange={() => undefined}
          onSaveProfile={() => undefined}
          onStatusCodeChange={() => undefined}
          palette={{
            border: '#333333',
            card: '#111111',
            muted: '#222222',
            primary: '#3366ff',
            primaryText: '#ffffff',
            soft: '#dddddd',
            text: '#ffffff',
            textMuted: '#cccccc',
          } as any}
          password=""
          phone="010-1234-5678"
          profileDetails={[
            {key: 'primaryTeacherName', label: 'Primary Teacher', value: 'Teacher Kim'},
            {key: 'passRemainingCount', label: 'Pass Remaining Count', value: '10'},
          ]}
          registerError={null}
          registerSuccess={null}
          registerType="user"
          requestedRoleCode="STUDENT"
          statusCode="ACTIVE"
          texts={createTexts()}
        />,
      );
    });

    const textContent = collectText(renderer!.toJSON()).join(' ');

    expect(textContent).toContain('Teacher Kim');
  });
});
