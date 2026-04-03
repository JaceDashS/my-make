import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import {AcademyMembersDesktopTable} from '../src/domains/members/AcademyMembersDesktopTable';
import {ACADEMY_MEMBERS_LABELS} from '../src/domains/members/academyMembersLabels';

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

describe('academy members profile action button', () => {
  test('renders edit profile without status action buttons for active non-root members', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <AcademyMembersDesktopTable
          actorRoleCode="ROOT"
          onEditProfile={() => {}}
          palette={
            {
              border: '#333333',
              card: '#111111',
              muted: '#222222',
              primary: '#3366ff',
              primaryText: '#ffffff',
              text: '#ffffff',
              textMuted: '#cccccc',
            } as any
          }
          slots={[
            {
              academyCode: 'ACD',
              academyName: 'Academy',
              createdAtLabel: '',
              displayName: 'Member One',
              email: 'member@example.com',
              hasMember: true,
              loginId: 'member-one',
              mode: 'member',
              phone: '010-1111-2222',
              roleCode: 'ADMIN',
              statusCode: 'ACTIVE',
            },
          ]}
          ui={ACADEMY_MEMBERS_LABELS.en}
        />,
      );
    });

    const textContent = collectText(renderer!.toJSON()).join(' ');

    expect(textContent).toContain('Edit');
    expect(textContent).not.toContain('Hold');
    expect(textContent).not.toContain('Deactivate');
  });

  test('renders only edit profile for root members', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <AcademyMembersDesktopTable
          actorRoleCode="ROOT"
          onEditProfile={() => {}}
          palette={
            {
              border: '#333333',
              card: '#111111',
              muted: '#222222',
              primary: '#3366ff',
              primaryText: '#ffffff',
              text: '#ffffff',
              textMuted: '#cccccc',
            } as any
          }
          slots={[
            {
              academyCode: 'ACD',
              academyName: 'Academy',
              createdAtLabel: '',
              displayName: 'Root One',
              email: 'root@example.com',
              hasMember: true,
              loginId: 'root-one',
              mode: 'member',
              phone: '010-3333-4444',
              roleCode: 'ROOT',
              statusCode: 'ACTIVE',
            },
          ]}
          ui={ACADEMY_MEMBERS_LABELS.en}
        />,
      );
    });

    const textContent = collectText(renderer!.toJSON()).join(' ');

    expect(textContent).toContain('Edit');
    expect(textContent).not.toContain('Hold');
    expect(textContent).not.toContain('Deactivate');
  });

  test('hides edit profile when admin targets another admin', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <AcademyMembersDesktopTable
          actorRoleCode="ADMIN"
          onEditProfile={() => {}}
          palette={
            {
              border: '#333333',
              card: '#111111',
              muted: '#222222',
              primary: '#3366ff',
              primaryText: '#ffffff',
              text: '#ffffff',
              textMuted: '#cccccc',
            } as any
          }
          slots={[
            {
              academyCode: 'ACD',
              academyName: 'Academy',
              createdAtLabel: '',
              displayName: 'Admin One',
              email: 'admin@example.com',
              hasMember: true,
              loginId: 'admin-one',
              mode: 'member',
              phone: '010-5555-6666',
              roleCode: 'ADMIN',
              statusCode: 'ACTIVE',
            },
          ]}
          ui={ACADEMY_MEMBERS_LABELS.en}
        />,
      );
    });

    const textContent = collectText(renderer!.toJSON()).join(' ');

    expect(textContent).not.toContain('Edit');
    expect(textContent).not.toContain('Hold');
    expect(textContent).not.toContain('Deactivate');
  });

  test('shows edit profile when admin targets teacher', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <AcademyMembersDesktopTable
          actorRoleCode="ADMIN"
          onEditProfile={() => {}}
          palette={
            {
              border: '#333333',
              card: '#111111',
              muted: '#222222',
              primary: '#3366ff',
              primaryText: '#ffffff',
              text: '#ffffff',
              textMuted: '#cccccc',
            } as any
          }
          slots={[
            {
              academyCode: 'ACD',
              academyName: 'Academy',
              createdAtLabel: '',
              displayName: 'Teacher One',
              email: 'teacher@example.com',
              hasMember: true,
              loginId: 'teacher-one',
              mode: 'member',
              phone: '010-7777-8888',
              roleCode: 'TEACHER',
              statusCode: 'ACTIVE',
            },
          ]}
          ui={ACADEMY_MEMBERS_LABELS.en}
        />,
      );
    });

    const textContent = collectText(renderer!.toJSON()).join(' ');

    expect(textContent).toContain('Edit');
    expect(textContent).not.toContain('Hold');
    expect(textContent).not.toContain('Deactivate');
  });
});
